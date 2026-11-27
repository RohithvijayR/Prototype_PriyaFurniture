import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getProductBySlug } from '../data/catalogue';
import { getFirebaseAuth, getFirestoreDb } from '../lib/firebase/client';
import {
  OperationType,
  QuoteServiceError,
  classifyQuoteSubmissionError,
  handleFirestoreError,
} from '../lib/firebase/errors';
import {
  QUOTE_LIMITS,
  QUOTE_PATTERNS,
  QuoteFormDraftInput,
  QuoteRequestItem,
  QuoteRequestPayload,
  QuoteSubmissionMeta,
  QuoteSubmissionResult,
} from '../types/quote';

const CUSTOM_PRODUCT_KEY = 'custom';
const QUOTE_REQUESTS_COLLECTION = 'quoteRequests';

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/**
 * Generates an idempotent Firestore document ID matching ^[a-zA-Z0-9_-]+$
 * and a customer-facing reference ID matching ^PF-RFQ-[0-9]{4}-[A-Z0-9]{4,8}$.
 */
export function createQuoteSubmissionMeta(): QuoteSubmissionMeta {
  const now = new Date();
  const year = now.getFullYear();
  const suffix = randomAlphanumeric(6);
  const stamp = `${year}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;

  return {
    quoteId: `rfq_${stamp}_${suffix.toLowerCase()}_${randomAlphanumeric(4).toLowerCase()}`,
    referenceId: `PF-RFQ-${year}-${suffix}`,
  };
}

function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Sanitizes and validates raw form state into the exact Firestore schema declared in
 * firebase-blueprint.json and enforced by firestore.rules.
 */
export function buildValidatedQuotePayload(
  input: QuoteFormDraftInput,
  referenceId: string
): QuoteRequestPayload {
  const cleanReferenceId = referenceId.trim();
  if (!QUOTE_PATTERNS.REFERENCE_ID.test(cleanReferenceId)) {
    throw new QuoteServiceError('validation', 'Invalid quotation reference identifier.');
  }

  const organisationName = clampText(input.organisationName, QUOTE_LIMITS.ORGANISATION_MAX);
  if (!organisationName) {
    throw new QuoteServiceError('validation', 'Organisation name is required.');
  }

  const contactPerson = clampText(input.contactPerson, QUOTE_LIMITS.CONTACT_PERSON_MAX);
  if (!contactPerson) {
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
  if (
    email.length < QUOTE_LIMITS.EMAIL_MIN ||
    !QUOTE_PATTERNS.EMAIL.test(email)
  ) {
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

  const normalizedItems: QuoteRequestItem[] = input.items.map((draft, index) => {
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
    const materialFinish = clampText(draft.materialFinish, QUOTE_LIMITS.MATERIAL_FINISH_MAX);

    if (slug === CUSTOM_PRODUCT_KEY) {
      return {
        productSlug: CUSTOM_PRODUCT_KEY,
        categoryId: 'custom',
        productCode: 'CUSTOM',
        productName: 'Custom / Other Category Furniture Requirement',
        quantity,
        dimensions,
        materialFinish,
        indicativeUnitRate: 0,
      };
    }

    const matchedProduct = getProductBySlug(slug);
    if (!matchedProduct) {
      throw new QuoteServiceError(
        'validation',
        `Line item ${index + 1} references an unrecognized catalogue model.`
      );
    }

    const indicativeRate =
      typeof matchedProduct.baseReferenceRate === 'number' &&
      Number.isInteger(matchedProduct.baseReferenceRate) &&
      matchedProduct.baseReferenceRate >= 0
        ? Math.min(matchedProduct.baseReferenceRate, QUOTE_LIMITS.MAX_INDICATIVE_RATE)
        : 0;

    return {
      productSlug: clampText(matchedProduct.slug, QUOTE_LIMITS.PRODUCT_SLUG_MAX),
      categoryId: matchedProduct.categoryId,
      productCode: clampText(matchedProduct.productCode.toUpperCase(), QUOTE_LIMITS.PRODUCT_CODE_MAX),
      productName: clampText(matchedProduct.name, QUOTE_LIMITS.PRODUCT_NAME_MAX),
      quantity,
      dimensions,
      materialFinish,
      indicativeUnitRate: indicativeRate,
    };
  });

  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity < normalizedItems.length || totalQuantity > QUOTE_LIMITS.MAX_TOTAL_QUANTITY) {
    throw new QuoteServiceError(
      'validation',
      'Total requested quantity exceeds the online form limit. Please contact our sales desk directly for bulk tenders.'
    );
  }

  return {
    referenceId: cleanReferenceId,
    status: 'new',
    source: 'web_catalogue',
    organisationName,
    contactPerson,
    phone,
    email,
    deliveryLocation,
    additionalRequirements,
    items: normalizedItems,
    itemCount: normalizedItems.length,
    totalQuantity,
  };
}

/**
 * Persists a validated public B2B quotation inquiry to Firestore under
 * /quoteRequests/{quoteId}. Uses a caller-supplied idempotent quoteId so
 * accidental double-clicks or network retries cannot create duplicate records.
 */
export async function submitQuoteRequest(
  input: QuoteFormDraftInput,
  submissionMeta: QuoteSubmissionMeta
): Promise<QuoteSubmissionResult> {
  const quoteId = submissionMeta.quoteId.trim();
  if (
    !quoteId ||
    quoteId.length > QUOTE_LIMITS.DOCUMENT_ID_MAX ||
    !QUOTE_PATTERNS.DOCUMENT_ID.test(quoteId)
  ) {
    throw new QuoteServiceError('validation', 'Invalid quotation submission identifier.');
  }

  const payload = buildValidatedQuotePayload(input, submissionMeta.referenceId);

  const db = getFirestoreDb();
  if (!db) {
    throw new QuoteServiceError(
      'unconfigured',
      'Online quotation storage is currently unavailable because Firebase is not configured for this environment. Your entered details are still on screen—please contact our direct sales desk to place this inquiry.',
      false
    );
  }

  const documentPath = `${QUOTE_REQUESTS_COLLECTION}/${quoteId}`;
  const SUBMIT_TIMEOUT_MS = 12000;

  try {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('deadline-exceeded: network timeout reaching Firestore'));
      }, SUBMIT_TIMEOUT_MS);
    });

    try {
      await Promise.race([
        setDoc(doc(db, QUOTE_REQUESTS_COLLECTION, quoteId), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  } catch (error) {
    // Log structured FirestoreErrorInfo diagnostics for permission/write failures
    // without exposing raw internal stack traces to end users.
    try {
      handleFirestoreError(error, OperationType.CREATE, documentPath, getFirebaseAuth());
    } catch {
      // handleFirestoreError always throws after logging structured JSON; classify cleanly below.
    }
    throw classifyQuoteSubmissionError(error);
  }

  return {
    quoteId,
    referenceId: payload.referenceId,
    submittedAt: new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    payload,
  };
}
