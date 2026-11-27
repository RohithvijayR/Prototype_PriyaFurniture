import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase/client';
import { AuthServiceError, classifyAuthError } from '../lib/firebase/errors';
import {
  FIRESTORE_SCHEMA_LIMITS,
  type ClientSelectableAccountType,
  type FirestoreUser,
} from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';
import { ensureUserProfileDocument } from './userProfileService';

let persistenceInitialized = false;

export interface SignUpWithEmailInput {
  displayName: string;
  email: string;
  password: string;
  accountType: ClientSelectableAccountType;
  organizationName?: string;
  phoneNumber?: string;
}

export interface AuthSessionResult {
  user: User;
  profile: FirestoreUser;
  profileCreated: boolean;
}

async function getReadyAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new AuthServiceError(
      'unconfigured',
      'Authentication is currently unavailable because Firebase is not configured for this environment.'
    );
  }

  if (!persistenceInitialized) {
    persistenceInitialized = true;
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // Fallback to Firebase Auth's default in-memory/session persistence if storage is blocked.
    }
  }

  return auth;
}

function validateEmailInput(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (
    !email ||
    email.length < 5 ||
    email.length > FIRESTORE_SCHEMA_LIMITS.USER_EMAIL_MAX ||
    !QUOTE_PATTERNS.EMAIL.test(email)
  ) {
    throw new AuthServiceError('validation', 'Please enter a valid email address.');
  }
  return email;
}

/**
 * Registers a new user with Email/Password and atomically creates their
 * initial Firestore profile at `users/{uid}` with `role: 'customer'`.
 */
export async function signUpWithEmail(input: SignUpWithEmailInput): Promise<AuthSessionResult> {
  const displayName = input.displayName.trim().slice(0, FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX);
  if (!displayName) {
    throw new AuthServiceError('validation', 'Please enter your full name.');
  }

  const email = validateEmailInput(input.email);

  if (!input.password || input.password.length < 8) {
    throw new AuthServiceError(
      'weak-password',
      'Password must be at least 8 characters long.'
    );
  }

  const phone = (input.phoneNumber ?? '').trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (
      digits.length < 7 ||
      phone.length > FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX ||
      !QUOTE_PATTERNS.PHONE.test(phone)
    ) {
      throw new AuthServiceError(
        'validation',
        'Please enter a valid phone number (at least 7 digits).'
      );
    }
  }

  const auth = await getReadyAuth();

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, input.password);
    try {
      await updateProfile(credential.user, { displayName });
    } catch {
      // Non-fatal: Firestore profile stores canonical displayName below.
    }

    const { profile, created } = await ensureUserProfileDocument(credential.user, {
      displayName,
      phoneNumber: phone,
      accountType: input.accountType,
      organizationName: (input.organizationName ?? '').trim(),
    });

    return {
      user: credential.user,
      profile,
      profileCreated: created,
    };
  } catch (error) {
    throw classifyAuthError(error);
  }
}

/**
 * Signs in an existing user with Email/Password and loads (or initializes if missing)
 * their Firestore profile without creating duplicates.
 */
export async function signInWithEmail(
  rawEmail: string,
  password: string
): Promise<AuthSessionResult> {
  const email = validateEmailInput(rawEmail);
  if (!password) {
    throw new AuthServiceError('validation', 'Please enter your password.');
  }

  const auth = await getReadyAuth();

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const { profile, created } = await ensureUserProfileDocument(credential.user);
    return {
      user: credential.user,
      profile,
      profileCreated: created,
    };
  } catch (error) {
    throw classifyAuthError(error);
  }
}

/**
 * Signs in or registers a user via Google Sign-In popup (`signInWithPopup`)
 * and atomically ensures their `users/{uid}` document exists without duplicates.
 */
export async function signInWithGoogle(): Promise<AuthSessionResult> {
  const auth = await getReadyAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const credential = await signInWithPopup(auth, provider);
    const { profile, created } = await ensureUserProfileDocument(credential.user, {
      displayName: credential.user.displayName ?? undefined,
      phoneNumber: credential.user.phoneNumber ?? undefined,
      accountType: 'individual',
    });

    return {
      user: credential.user,
      profile,
      profileCreated: created,
    };
  } catch (error) {
    throw classifyAuthError(error);
  }
}

/**
 * Sends a Firebase password reset email.
 * Treats `auth/user-not-found` as a neutral completion to avoid leaking
 * whether an email address is registered.
 */
export async function sendPasswordReset(rawEmail: string): Promise<void> {
  const email = validateEmailInput(rawEmail);
  const auth = await getReadyAuth();

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const rawCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code).toLowerCase()
        : '';
    if (rawCode === 'auth/user-not-found') {
      return;
    }
    throw classifyAuthError(error);
  }
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;

  try {
    await signOut(auth);
  } catch (error) {
    throw classifyAuthError(error);
  }
}
