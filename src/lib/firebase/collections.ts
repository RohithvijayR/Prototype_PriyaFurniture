import {
  CollectionReference,
  DocumentReference,
  Firestore,
  Timestamp,
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import type { CategoryId } from '../../types/catalogue';
import {
  FIRESTORE_ID_PATTERNS,
  FIRESTORE_SCHEMA_LIMITS,
  type FirestoreCategory,
  type FirestoreProduct,
  type FirestoreQuotationRequest,
  type FirestoreSettingDocumentId,
  type FirestoreSettingsDocument,
  type FirestoreUser,
  type FirestoreWriteTimestamp,
} from '../../types/firestore';

/**
 * Centralized Authoritative Firestore Collection Identifiers.
 *
 * Phase 2.4 Consolidation:
 * - `quotationRequests` is the single authoritative collection for both public and
 *   authenticated customer quotation requests.
 * - The legacy Phase 2.1 `quoteRequests` collection is retired from client writes and
 *   retained as default-deny in `firestore.rules` (no destructive migration or deletion).
 */
export const FIRESTORE_COLLECTIONS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  USERS: 'users',
  QUOTATION_REQUESTS: 'quotationRequests',
  SETTINGS: 'settings',
} as const;

export const FIRESTORE_SUBCOLLECTIONS = {
  QUOTATION_INTERNAL_NOTES: 'internalNotes',
} as const;

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS];

export const FIRESTORE_SETTING_IDS = {
  GENERAL: 'general',
  QUOTATION: 'quotation',
  CATALOGUE: 'catalogue',
} as const satisfies Record<string, FirestoreSettingDocumentId>;

// ---------------------------------------------------------------------------
// Document ID Conventions & Composite Identity Builders
// ---------------------------------------------------------------------------

/**
 * Validates that a candidate Firestore document ID complies with the
 * security rule ID hardening guard (`^[a-zA-Z0-9_-]{1,128}$`).
 */
export function isValidFirestoreDocId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= FIRESTORE_SCHEMA_LIMITS.DOCUMENT_ID_MAX &&
    FIRESTORE_ID_PATTERNS.DOCUMENT_ID.test(id)
  );
}

/**
 * Normalizes a Priya Furniture model code (`PF 001` -> `pf-001`) for composite ID construction.
 */
export function normalizeProductCodeSegment(productCode: string): string {
  return productCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the canonical composite Firestore document ID for a product:
 * `${categoryId}-${normalizedProductCode}` (e.g. `barber-chairs-pf-001`).
 *
 * Because PF codes legitimately repeat across categories, product identity
 * must ALWAYS combine `categoryId` and `productCode`.
 */
export function buildProductDocId(categoryId: CategoryId, productCode: string): string {
  const codeSegment = normalizeProductCodeSegment(productCode);
  if (!categoryId || !codeSegment) {
    throw new Error(
      `Cannot build composite product document ID from categoryId="${categoryId}" and productCode="${productCode}".`
    );
  }
  const docId = `${categoryId}-${codeSegment}`;
  if (!isValidFirestoreDocId(docId)) {
    throw new Error(`Constructed product document ID "${docId}" failed ID validation.`);
  }
  return docId;
}

/**
 * Extracts `{ categoryId, codeSegment }` from a canonical composite product document ID.
 * Returns `null` if the document ID does not match a known category prefix.
 */
export function parseProductDocId(
  productId: string
): { categoryId: CategoryId; codeSegment: string } | null {
  const knownCategories: CategoryId[] = [
    'pedicure-manicure',
    'barber-chairs',
    'hairwash-stations',
    'facial-beds',
  ];

  const normalized = productId.trim().toLowerCase();
  for (const categoryId of knownCategories) {
    const prefix = `${categoryId}-`;
    if (normalized.startsWith(prefix) && normalized.length > prefix.length) {
      return {
        categoryId,
        codeSegment: normalized.slice(prefix.length),
      };
    }
  }
  return null;
}

/**
 * Builds a validated document ID for `categories/{categoryId}` using the category slug.
 */
export function buildCategoryDocId(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!isValidFirestoreDocId(normalized) || !FIRESTORE_ID_PATTERNS.SLUG.test(normalized)) {
    throw new Error(`Invalid category document ID: "${slug}".`);
  }
  return normalized;
}

/**
 * Validates and returns a Firebase Auth UID for use as `users/{userId}` document ID.
 */
export function buildUserDocId(uid: string): string {
  const normalized = uid.trim();
  if (!isValidFirestoreDocId(normalized)) {
    throw new Error('Invalid Firebase Auth UID for users collection document ID.');
  }
  return normalized;
}

function generateRandomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Generates a deterministic-format document ID and customer reference number
 * for future `quotationRequests/{quotationRequestId}` documents.
 */
export function buildQuotationRequestIds(now: Date = new Date()): {
  quotationRequestId: string;
  referenceNumber: string;
} {
  const year = now.getFullYear();
  const stamp = `${year}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const refSuffix = generateRandomCode(6);
  const entropy = generateRandomCode(4).toLowerCase();

  return {
    quotationRequestId: `qr_${stamp}_${refSuffix.toLowerCase()}_${entropy}`,
    referenceNumber: `PF-RFQ-${year}-${refSuffix}`,
  };
}

// ---------------------------------------------------------------------------
// Timestamp Handling Conventions
// ---------------------------------------------------------------------------

/**
 * Produces server-authoritative `createdAt` and `updatedAt` sentinel values
 * for Firestore `create` operations. Matches `request.time` in security rules.
 */
export function createAuditTimestamps(): {
  createdAt: FirestoreWriteTimestamp;
  updatedAt: FirestoreWriteTimestamp;
} {
  return {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Produces a server-authoritative `updatedAt` sentinel value for Firestore
 * `update` operations while keeping `createdAt` immutable.
 */
export function createUpdateTimestamp(): { updatedAt: FirestoreWriteTimestamp } {
  return {
    updatedAt: serverTimestamp(),
  };
}

/**
 * Safely converts a Firestore `Timestamp` (or serialized timestamp-like object) to a JS `Date`.
 */
export function firestoreTimestampToDate(
  value: Timestamp | Date | { seconds: number; nanoseconds?: number } | null | undefined
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const millis = value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
    return new Date(millis);
  }
  return null;
}

/**
 * Safely formats a Firestore `Timestamp` into an ISO-8601 string for UI display or exports.
 */
export function firestoreTimestampToIso(
  value: Timestamp | Date | { seconds: number; nanoseconds?: number } | null | undefined
): string | null {
  const date = firestoreTimestampToDate(value);
  return date ? date.toISOString() : null;
}

// ---------------------------------------------------------------------------
// Reusable Typed Firestore Collection & Document Reference Factories
// (No reads or writes are executed by these helpers.)
// ---------------------------------------------------------------------------

export function getProductsCollection(db: Firestore): CollectionReference<FirestoreProduct> {
  return collection(db, FIRESTORE_COLLECTIONS.PRODUCTS) as CollectionReference<FirestoreProduct>;
}

export function getProductDocRef(
  db: Firestore,
  productId: string
): DocumentReference<FirestoreProduct> {
  if (!isValidFirestoreDocId(productId)) {
    throw new Error(`Invalid product document ID: "${productId}".`);
  }
  return doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, productId) as DocumentReference<FirestoreProduct>;
}

export function getCategoriesCollection(db: Firestore): CollectionReference<FirestoreCategory> {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.CATEGORIES
  ) as CollectionReference<FirestoreCategory>;
}

export function getCategoryDocRef(
  db: Firestore,
  categoryId: string
): DocumentReference<FirestoreCategory> {
  if (!isValidFirestoreDocId(categoryId)) {
    throw new Error(`Invalid category document ID: "${categoryId}".`);
  }
  return doc(
    db,
    FIRESTORE_COLLECTIONS.CATEGORIES,
    categoryId
  ) as DocumentReference<FirestoreCategory>;
}

export function getUsersCollection(db: Firestore): CollectionReference<FirestoreUser> {
  return collection(db, FIRESTORE_COLLECTIONS.USERS) as CollectionReference<FirestoreUser>;
}

export function getUserDocRef(db: Firestore, userId: string): DocumentReference<FirestoreUser> {
  return doc(
    db,
    FIRESTORE_COLLECTIONS.USERS,
    buildUserDocId(userId)
  ) as DocumentReference<FirestoreUser>;
}

export function getQuotationRequestsCollection(
  db: Firestore
): CollectionReference<FirestoreQuotationRequest> {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS
  ) as CollectionReference<FirestoreQuotationRequest>;
}

export function getQuotationRequestDocRef(
  db: Firestore,
  quotationRequestId: string
): DocumentReference<FirestoreQuotationRequest> {
  if (!isValidFirestoreDocId(quotationRequestId)) {
    throw new Error(`Invalid quotation request document ID: "${quotationRequestId}".`);
  }
  return doc(
    db,
    FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS,
    quotationRequestId
  ) as DocumentReference<FirestoreQuotationRequest>;
}

export function getSettingsCollection(
  db: Firestore
): CollectionReference<FirestoreSettingsDocument> {
  return collection(
    db,
    FIRESTORE_COLLECTIONS.SETTINGS
  ) as CollectionReference<FirestoreSettingsDocument>;
}

export function getSettingsDocRef<T extends FirestoreSettingsDocument = FirestoreSettingsDocument>(
  db: Firestore,
  settingId: FirestoreSettingDocumentId
): DocumentReference<T> {
  return doc(db, FIRESTORE_COLLECTIONS.SETTINGS, settingId) as DocumentReference<T>;
}
