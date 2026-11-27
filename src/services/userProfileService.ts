import type { User } from 'firebase/auth';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from '../lib/firebase/client';
import {
  FIRESTORE_COLLECTIONS,
  createAuditTimestamps,
  createUpdateTimestamp,
  getUserDocRef,
} from '../lib/firebase/collections';
import {
  AuthServiceError,
  OperationType,
  classifyAuthError,
  handleFirestoreError,
} from '../lib/firebase/errors';
import {
  FIRESTORE_SCHEMA_LIMITS,
  type ClientSelectableAccountType,
  type FirestoreAddress,
  type FirestoreUser,
  type FirestoreUserWrite,
  type UserProfileSeedInput,
  type UserProfileUpdateInput,
} from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';

const inflightEnsureByUid = new Map<string, Promise<EnsureUserProfileResult>>();

export interface EnsureUserProfileResult {
  profile: FirestoreUser;
  created: boolean;
}

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function sanitizeOptionalPhone(raw: string | null | undefined): string {
  const cleaned = clamp(raw ?? '', FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX);
  if (!cleaned) return '';
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || !QUOTE_PATTERNS.PHONE.test(cleaned)) {
    throw new AuthServiceError(
      'validation',
      'Please enter a valid phone number (at least 7 digits; numbers, +, spaces, hyphens, or parentheses only).'
    );
  }
  return cleaned;
}

function deriveSafeDisplayName(
  preferredName: string | null | undefined,
  email: string
): string {
  const cleaned = clamp(preferredName ?? '', FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX);
  if (cleaned.length >= 1) {
    return cleaned;
  }
  const emailPrefix = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Priya Client';
  return clamp(emailPrefix, FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX);
}

function normalizeClientAccountType(
  value: string | undefined
): ClientSelectableAccountType {
  return value === 'business' ? 'business' : 'individual';
}

/**
 * Validates and normalizes an optional structured address.
 * Returns `null` when all address fields are blank; throws a validation error if partially filled.
 */
export function normalizeOptionalAddress(
  address: FirestoreAddress | null | undefined,
  label: string
): FirestoreAddress | null {
  if (!address) return null;

  const line1 = clamp(address.line1 ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX);
  const line2 = clamp(address.line2 ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX);
  const city = clamp(address.city ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_CITY_MAX);
  const state = clamp(address.state ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_STATE_MAX);
  const postalCode = clamp(address.postalCode ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_POSTAL_MAX);
  const country = clamp(address.country ?? '', FIRESTORE_SCHEMA_LIMITS.ADDRESS_COUNTRY_MAX);

  const hasAny = Boolean(line1 || line2 || city || state || postalCode || country);
  if (!hasAny) {
    return null;
  }

  if (!line1 || !city || !state || postalCode.length < 3 || country.length < 2) {
    throw new AuthServiceError(
      'validation',
      `Please complete all required ${label} fields (address line 1, city, state, postal code, and country), or leave the address blank.`
    );
  }

  return line2
    ? { line1, line2, city, state, postalCode, country }
    : { line1, city, state, postalCode, country };
}

/**
 * Reads the authenticated user's profile from `users/{uid}`.
 * Returns `null` if the document does not yet exist.
 */
export async function getUserProfile(uid: string): Promise<FirestoreUser | null> {
  const db = getFirestoreDb();
  if (!db) {
    throw new AuthServiceError(
      'unconfigured',
      'Firebase is not configured for this environment.'
    );
  }

  const ref = getUserDocRef(db, uid);
  const path = `${FIRESTORE_COLLECTIONS.USERS}/${uid}`;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return snap.data();
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, path, getFirebaseAuth());
    } catch {
      // Structured JSON logged; surface safe AuthServiceError below.
    }
    throw classifyAuthError(error);
  }
}

/**
 * Atomically ensures a Firestore user profile exists at `users/{uid}` without
 * ever creating duplicates or overwriting an existing profile.
 *
 * Security invariants enforced both client-side and in `firestore.rules`:
 * - `role` is ALWAYS `'customer'` on initial creation (never admin/staff/partner).
 * - `accountStatus` is ALWAYS `'active'` on initial creation.
 * - `accountType` is restricted to `'individual' | 'business'`.
 * - Concurrent calls for the same UID share a single in-flight transaction.
 */
export async function ensureUserProfileDocument(
  firebaseUser: User,
  seed?: UserProfileSeedInput
): Promise<EnsureUserProfileResult> {
  const uid = firebaseUser.uid;
  const existingInflight = inflightEnsureByUid.get(uid);
  if (existingInflight) {
    return existingInflight;
  }

  const run = (async (): Promise<EnsureUserProfileResult> => {
    const db = getFirestoreDb();
    if (!db) {
      throw new AuthServiceError(
        'unconfigured',
        'Firebase is not configured for this environment.'
      );
    }

    const email = clamp(firebaseUser.email ?? '', FIRESTORE_SCHEMA_LIMITS.USER_EMAIL_MAX).toLowerCase();
    if (!email || !QUOTE_PATTERNS.EMAIL.test(email)) {
      throw new AuthServiceError(
        'validation',
        'Your account does not have a valid email address associated with it.'
      );
    }

    const ref = getUserDocRef(db, uid);
    const path = `${FIRESTORE_COLLECTIONS.USERS}/${uid}`;

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists()) {
          return { profile: snapshot.data(), created: false };
        }

        const displayName = deriveSafeDisplayName(
          seed?.displayName ?? firebaseUser.displayName,
          email
        );

        let phoneNumber = '';
        const rawPhone = seed?.phoneNumber ?? firebaseUser.phoneNumber ?? '';
        if (rawPhone.trim()) {
          const digits = rawPhone.replace(/\D/g, '');
          if (digits.length >= 7 && QUOTE_PATTERNS.PHONE.test(rawPhone.trim())) {
            phoneNumber = clamp(rawPhone, FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX);
          }
        }

        const organizationName = clamp(
          seed?.organizationName ?? '',
          FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX
        );
        const accountType = normalizeClientAccountType(seed?.accountType);

        const initialDoc: FirestoreUserWrite = {
          uid,
          displayName,
          email,
          phoneNumber,
          accountType,
          organizationName,
          billingAddress: null,
          shippingAddress: null,
          role: 'customer',
          accountStatus: 'active',
          ...createAuditTimestamps(),
        };

        transaction.set(ref, initialDoc as unknown as FirestoreUser);
        return { profile: null, created: true };
      });

      if (!txResult.created && txResult.profile) {
        return { profile: txResult.profile, created: false };
      }

      const freshSnap = await getDoc(ref);
      if (!freshSnap.exists()) {
        throw new AuthServiceError(
          'unknown',
          'Profile creation completed, but the saved profile could not be read back.'
        );
      }

      return { profile: freshSnap.data(), created: true };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      try {
        handleFirestoreError(error, OperationType.WRITE, path, getFirebaseAuth());
      } catch {
        // Structured diagnostic logged; throw classified user-facing error below.
      }
      throw classifyAuthError(error);
    }
  })();

  inflightEnsureByUid.set(uid, run);
  try {
    return await run;
  } finally {
    inflightEnsureByUid.delete(uid);
  }
}

/**
 * Updates only the allowlisted user-editable profile fields in `users/{uid}`.
 * Privileged fields (`uid`, `email`, `role`, `accountStatus`, `createdAt`) are
 * never sent by the client and are blocked as immutable by `firestore.rules`.
 */
export async function updateUserProfile(
  uid: string,
  input: UserProfileUpdateInput,
  currentProfile: FirestoreUser
): Promise<FirestoreUser> {
  const db = getFirestoreDb();
  if (!db) {
    throw new AuthServiceError(
      'unconfigured',
      'Firebase is not configured for this environment.'
    );
  }

  const displayName = clamp(input.displayName, FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX);
  if (!displayName) {
    throw new AuthServiceError('validation', 'Full name is required.');
  }

  const phoneNumber = sanitizeOptionalPhone(input.phoneNumber);
  const organizationName = clamp(
    input.organizationName,
    FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX
  );

  // Clients may switch between 'individual' and 'business', or retain an existing
  // server-assigned accountType ('partner' / 'internal'), never escalate to them.
  const accountType =
    input.accountType === 'individual' || input.accountType === 'business'
      ? input.accountType
      : currentProfile.accountType;

  const billingAddress = normalizeOptionalAddress(input.billingAddress, 'billing address');
  const shippingAddress = normalizeOptionalAddress(input.shippingAddress, 'shipping address');

  const ref = getUserDocRef(db, uid);
  const path = `${FIRESTORE_COLLECTIONS.USERS}/${uid}`;

  try {
    await updateDoc(ref, {
      displayName,
      phoneNumber,
      accountType,
      organizationName,
      billingAddress,
      shippingAddress,
      ...createUpdateTimestamp(),
    });

    const auth = getFirebaseAuth();
    if (auth?.currentUser && auth.currentUser.uid === uid && auth.currentUser.displayName !== displayName) {
      try {
        await updateAuthProfile(auth.currentUser, { displayName });
      } catch {
        // Firestore profile is already persisted; Auth displayName sync is best-effort.
      }
    }

    const updatedSnap = await getDoc(ref);
    if (!updatedSnap.exists()) {
      throw new AuthServiceError('unknown', 'Updated profile could not be retrieved.');
    }
    return updatedSnap.data();
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }
    try {
      handleFirestoreError(error, OperationType.UPDATE, path, getFirebaseAuth());
    } catch {
      // Structured diagnostic logged; throw classified user-facing error below.
    }
    throw classifyAuthError(error);
  }
}
