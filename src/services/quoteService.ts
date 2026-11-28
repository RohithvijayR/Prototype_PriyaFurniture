import {
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getProductBySlug } from '../data/catalogue';
import { getFirebaseAuth, getFirestoreDb } from '../lib/firebase/client';
import {
  FIRESTORE_COLLECTIONS,
  buildQuotationRequestIds,
  createAuditTimestamps,
  getQuotationRequestDocRef,
  getQuotationRequestsCollection,
  isValidFirestoreDocId,
} from '../lib/firebase/collections';
import {
  OperationType,
  QuoteServiceError,
  classifyQuotationReadError,
  classifyQuoteSubmissionError,
  handleFirestoreError,
} from '../lib/firebase/errors';
import { createQuotationProductSnapshot } from '../lib/firebase/mappers';
import type {
  FirestoreQuotationProductSnapshot,
  FirestoreQuotationRequest,
  FirestoreQuotationRequestWrite,
} from '../types/firestore';
import {
  QUOTE_LIMITS,
  QUOTE_PATTERNS,
  type QuoteFormDraftInput,
  type QuoteRequestPayload,
  type QuoteSubmissionMeta,
  type QuoteSubmissionResult,
} from '../types/quote';

const CUSTOM_PRODUCT_KEY = 'custom';
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;
const FIRESTORE_TIMEOUT_MS = 12000;

export interface CustomerQuotationsPage {
  items: FirestoreQuotationRequest[];
  nextCursor: QueryDocumentSnapshot<FirestoreQuotationRequest> | null;
  hasMore: boolean;
}

export interface ListCustomerQuotationsOptions {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<FirestoreQuotationRequest> | null;
}

/**
 * Generates an idempotent Firestore document ID (`qr_YYYYMMDD_...`)
 * and a customer-facing reference number (`PF-RFQ-YYYY-...`).
 */
export function createQuoteSubmissionMeta(): QuoteSubmissionMeta {
  const { quotationRequestId, referenceNumber } = buildQuotationRequestIds();
  return {
    quoteId: quotationRequestId,
    referenceId: referenceNumber,
  };
}

function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`deadline-exceeded: network timeout ${label}`));
    }, FIRESTORE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Sanitizes and validates raw form state into the exact consolidated Firestore schema
 * for `/quotationRequests/{quotationRequestId}` declared in `firebase-blueprint.json`
 * and enforced by `firestore.rules`.
 */
export function buildValidatedQuotePayload(
  input: QuoteFormDraftInput,
  submissionMeta: QuoteSubmissionMeta,
  userId: string | null = null
): QuoteRequestPayload {
  const cleanId = submissionMeta.quoteId.trim();
  if (
    !cleanId ||
    cleanId.length > QUOTE_LIMITS.DOCUMENT_ID_MAX ||
    !QUOTE_PATTERNS.DOCUMENT_ID.test(cleanId)
  ) {
    throw new QuoteServiceError('validation', 'Invalid quotation submission identifier.');
  }

  const cleanReferenceNumber = submissionMeta.referenceId.trim();
  if (!QUOTE_PATTERNS.REFERENCE_ID.test(cleanReferenceNumber)) {
    throw new QuoteServiceError('validation', 'Invalid quotation reference identifier.');
  }

  const cleanUserId = userId ? userId.trim() : null;
  if (cleanUserId !== null && !isValidFirestoreDocId(cleanUserId)) {
    throw new QuoteServiceError('validation', 'Invalid authenticated user identifier.');
  }

  const organizationName = clampText(input.organisationName, QUOTE_LIMITS.ORGANISATION_MAX);
  if (!organizationName) {
    throw new QuoteServiceError('validation', 'Organisation name is required.');
  }

  const customerName = clampText(input.contactPerson, QUOTE_LIMITS.CONTACT_PERSON_MAX);
  if (!customerName) {
    throw new QuoteServiceError('validation', 'Contact person name is required.');
  }

  const phone = clampText(input.phone, QUOTE_LIMITS.PHONE_MAX);
  const digitsOnly = phone.replace(/\D/g, '');
  if (
    !phone ||
    digitsOnly.length < QUOTE_LIMITS.PHONE_MIN ||
    !QUOTE_PATTERNS.PHONE.test(phone)
  ) {
    throw new QuoteServiceError(
      'validation',
      'Please enter a valid contact telephone number (digits, +, spaces, hyphens, or parentheses only).'
    );
  }

  const email = clampText(input.email, QUOTE_LIMITS.EMAIL_MAX).toLowerCase();
  if (email.length < QUOTE_LIMITS.EMAIL_MIN || !QUOTE_PATTERNS.EMAIL.test(email)) {
    throw new QuoteServiceError('validation', 'Please enter a valid email address.');
  }

  const deliveryLocation = clampText(input.deliveryLocation, QUOTE_LIMITS.DELIVERY_LOCATION_MAX);
  if (deliveryLocation.length < QUOTE_LIMITS.DELIVERY_LOCATION_MIN) {
    throw new QuoteServiceError('validation', 'Please enter a valid delivery location.');
  }

  const additionalRequirements = clampText(
    input.additionalRequirements,
    QUOTE_LIMITS.ADDITIONAL_NOTES_MAX
  );

  if (!Array.isArray(input.items) || input.items.length < 1) {
    throw new QuoteServiceError('validation', 'At least one product item is required.');
  }
  if (input.items.length > QUOTE_LIMITS.MAX_ITEMS) {
    throw new QuoteServiceError(
      'validation',
      `A single quotation inquiry can include up to ${QUOTE_LIMITS.MAX_ITEMS} line items.`
    );
  }

  const requestedProducts: FirestoreQuotationProductSnapshot[] = input.items.map((draft, index) => {
    const slug = draft.productSlug.trim().toLowerCase();
    if (!slug || !QUOTE_PATTERNS.PRODUCT_SLUG.test(slug)) {
      throw new QuoteServiceError(
        'validation',
        `Line item ${index + 1} is missing a valid product selection.`
      );
    }

    const quantity = Number.parseInt(draft.quantity, 10);
    if (
      Number.isNaN(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < QUOTE_LIMITS.MIN_QUANTITY ||
      quantity > QUOTE_LIMITS.MAX_QUANTITY
    ) {
      throw new QuoteServiceError(
        'validation',
        `Line item ${index + 1} must have a whole-number quantity between ${QUOTE_LIMITS.MIN_QUANTITY} and ${QUOTE_LIMITS.MAX_QUANTITY}.`
      );
    }

    const dimensions = clampText(draft.dimensions, QUOTE_LIMITS.DIMENSIONS_MAX);
    const materialFinishPreferences = clampText(
      draft.materialFinish,
      QUOTE_LIMITS.MATERIAL_FINISH_MAX
    );

    const matchedProduct = slug === CUSTOM_PRODUCT_KEY ? null : getProductBySlug(slug);
    if (slug !== CUSTOM_PRODUCT_KEY && !matchedProduct) {
      throw new QuoteServiceError(
        'validation',
        `Line item ${index + 1} references an unrecognized catalogue model.`
      );
    }

    const rawSnapshot = createQuotationProductSnapshot(matchedProduct ?? null, {
      quantity,
      dimensions,
      materialFinishPreferences,
      customizationDetails: '',
    });

    const boundedRate =
      typeof rawSnapshot.indicativeBaseRateInr === 'number' &&
      Number.isInteger(rawSnapshot.indicativeBaseRateInr) &&
      rawSnapshot.indicativeBaseRateInr >= 0
        ? Math.min(rawSnapshot.indicativeBaseRateInr, QUOTE_LIMITS.MAX_INDICATIVE_RATE)
        : null;

    return {
      productId: clampText(rawSnapshot.productId, QUOTE_LIMITS.PRODUCT_SLUG_MAX),
      categoryId: rawSnapshot.categoryId,
      categoryName: clampText(rawSnapshot.categoryName, QUOTE_LIMITS.CATEGORY_NAME_MAX),
      productCode: clampText(rawSnapshot.productCode, QUOTE_LIMITS.PRODUCT_CODE_MAX),
      productName: clampText(rawSnapshot.productName, QUOTE_LIMITS.PRODUCT_NAME_MAX),
      quantity: rawSnapshot.quantity,
      customizationDetails: clampText(
        rawSnapshot.customizationDetails,
        QUOTE_LIMITS.CUSTOMIZATION_MAX
      ),
      dimensions: clampText(rawSnapshot.dimensions, QUOTE_LIMITS.DIMENSIONS_MAX),
      materialFinishPreferences: clampText(
        rawSnapshot.materialFinishPreferences,
        QUOTE_LIMITS.MATERIAL_FINISH_MAX
      ),
      indicativeBaseRateInr: boundedRate,
      imagePath: rawSnapshot.imagePath
        ? clampText(rawSnapshot.imagePath, QUOTE_LIMITS.IMAGE_PATH_MAX)
        : null,
    };
  });

  const totalQuantity = requestedProducts.reduce((sum, item) => sum + item.quantity, 0);
  if (
    totalQuantity < requestedProducts.length ||
    totalQuantity > QUOTE_LIMITS.MAX_TOTAL_QUANTITY
  ) {
    throw new QuoteServiceError(
      'validation',
      'Total requested quantity exceeds the online form limit. Please contact our sales desk directly for bulk tenders.'
    );
  }

  return {
    id: cleanId,
    referenceNumber: cleanReferenceNumber,
    userId: cleanUserId,
    source: 'web_catalogue',
    customerName,
    organizationName,
    email,
    phone,
    requestedProducts,
    itemCount: requestedProducts.length,
    totalQuantity,
    deliveryLocation,
    additionalRequirements,
    status: 'submitted',
    revisionNumber: 1,
    parentQuotationRequestId: null,
    activeQuotationVersionId: null,
    convertedOrderId: null,
  };
}

/**
 * Persists a validated quotation request to the authoritative collection
 * `/quotationRequests/{quotationRequestId}`.
 *
 * - Anonymous visitors submit with `userId: null`.
 * - Signed-in customers automatically attach `userId: auth.currentUser.uid` so the
 *   inquiry appears immediately under "My Quotations".
 * - Uses caller-supplied idempotent IDs so accidental double-clicks or retries never
 *   create duplicate documents.
 */
export async function submitQuoteRequest(
  input: QuoteFormDraftInput,
  submissionMeta: QuoteSubmissionMeta
): Promise<QuoteSubmissionResult> {
  const auth = getFirebaseAuth();
  const currentUserId = auth?.currentUser?.uid ?? null;
  const payload = buildValidatedQuotePayload(input, submissionMeta, currentUserId);

  const db = getFirestoreDb();
  if (!db) {
    throw new QuoteServiceError(
      'unconfigured',
      'Online quotation storage is currently unavailable because Firebase is not configured for this environment. Your entered details are still on screen—please contact our direct sales desk to place this inquiry.',
      false
    );
  }

  const documentPath = `${FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS}/${payload.id}`;
  const writeDocument: FirestoreQuotationRequestWrite = {
    ...payload,
    ...createAuditTimestamps(),
  };

  try {
    await withTimeout(
      setDoc(getQuotationRequestDocRef(db, payload.id), writeDocument),
      'reaching Firestore'
    );
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, documentPath, auth);
    } catch {
      // handleFirestoreError always throws after structured diagnostic logging.
    }
    throw classifyQuoteSubmissionError(error);
  }

  return {
    quoteId: payload.id,
    referenceId: payload.referenceNumber,
    submittedAt: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    userId: payload.userId,
    payload,
  };
}

/**
 * Fetches a bounded, cursor-paginated page of quotation requests owned by the signed-in user
 * (`where('userId', '==', uid)` ordered newest-first by `createdAt`).
 *
 * Requires the composite index `(userId ASC, createdAt DESC)` on `quotationRequests`.
 */
export async function listCustomerQuotations(
  uid: string,
  options: ListCustomerQuotationsOptions = {}
): Promise<CustomerQuotationsPage> {
  const cleanUid = uid.trim();
  if (!isValidFirestoreDocId(cleanUid)) {
    throw new QuoteServiceError('validation', 'Invalid user account identifier.');
  }

  const db = getFirestoreDb();
  if (!db) {
    throw new QuoteServiceError(
      'unconfigured',
      'Quotation history is unavailable because Firebase is not configured for this environment.',
      false
    );
  }

  const requestedPageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const safePageSize = Math.min(Math.max(1, Math.floor(requestedPageSize)), MAX_PAGE_SIZE);

  const constraints: QueryConstraint[] = [
    where('userId', '==', cleanUid),
    orderBy('createdAt', 'desc'),
  ];
  if (options.cursor) {
    constraints.push(startAfter(options.cursor));
  }
  constraints.push(limit(safePageSize + 1));

  const q = query(getQuotationRequestsCollection(db), ...constraints);

  try {
    const snapshot = await withTimeout(getDocs(q), 'loading customer quotations');
    const hasMore = snapshot.docs.length > safePageSize;
    const pageDocs = hasMore ? snapshot.docs.slice(0, safePageSize) : snapshot.docs;

    const items: FirestoreQuotationRequest[] = pageDocs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: data.id || docSnap.id,
      };
    });

    return {
      items,
      nextCursor: hasMore && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
      hasMore,
    };
  } catch (error) {
    try {
      handleFirestoreError(
        error,
        OperationType.LIST,
        FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS,
        getFirebaseAuth()
      );
    } catch {
      // Structured diagnostics logged; classify cleanly for UI.
    }
    throw classifyQuotationReadError(error);
  }
}

/**
 * Fetches a single quotation request document owned by the signed-in user.
 * Enforces owner-only access both via Firestore Security Rules and defense-in-depth client checks.
 */
export async function getCustomerQuotationById(
  uid: string,
  quotationRequestId: string
): Promise<FirestoreQuotationRequest | null> {
  const cleanUid = uid.trim();
  const cleanId = quotationRequestId.trim();
  if (!isValidFirestoreDocId(cleanUid) || !isValidFirestoreDocId(cleanId)) {
    return null;
  }

  const db = getFirestoreDb();
  if (!db) {
    throw new QuoteServiceError(
      'unconfigured',
      'Quotation details are unavailable because Firebase is not configured for this environment.',
      false
    );
  }

  const documentPath = `${FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS}/${cleanId}`;

  try {
    const snap = await withTimeout(
      getDoc(getQuotationRequestDocRef(db, cleanId)),
      'loading quotation details'
    );

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    if (data.userId !== cleanUid) {
      throw new QuoteServiceError(
        'permission-denied',
        'This quotation record is unavailable or belongs to a different account.',
        false
      );
    }

    return {
      ...data,
      id: data.id || snap.id,
    };
  } catch (error) {
    if (error instanceof QuoteServiceError) {
      throw error;
    }
    try {
      handleFirestoreError(error, OperationType.GET, documentPath, getFirebaseAuth());
    } catch {
      // Structured diagnostics logged; classify cleanly for UI.
    }
    throw classifyQuotationReadError(error);
  }
}
