import type { CategoryId } from './catalogue';

/**
 * Validation bounds and patterns synchronized verbatim with
 * firebase-blueprint.json and firestore.rules.
 */
export const QUOTE_LIMITS = {
  MAX_ITEMS: 10,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10000,
  MAX_TOTAL_QUANTITY: 100000,
  MAX_INDICATIVE_RATE: 10000000,
  ORGANISATION_MAX: 160,
  CONTACT_PERSON_MAX: 120,
  PHONE_MIN: 7,
  PHONE_MAX: 32,
  EMAIL_MIN: 5,
  EMAIL_MAX: 254,
  DELIVERY_LOCATION_MIN: 2,
  DELIVERY_LOCATION_MAX: 200,
  ADDITIONAL_NOTES_MAX: 2000,
  PRODUCT_SLUG_MAX: 100,
  PRODUCT_CODE_MAX: 32,
  PRODUCT_NAME_MAX: 180,
  DIMENSIONS_MAX: 200,
  MATERIAL_FINISH_MAX: 200,
  DOCUMENT_ID_MAX: 128,
} as const;

export const QUOTE_PATTERNS = {
  DOCUMENT_ID: /^[a-zA-Z0-9_-]+$/,
  REFERENCE_ID: /^PF-RFQ-[0-9]{4}-[A-Z0-9]{4,8}$/,
  PRODUCT_SLUG: /^[a-z0-9-]+$/,
  PRODUCT_CODE: /^[A-Z0-9\s-]+$/,
  PHONE: /^[+0-9()\s.-]{7,32}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export type QuoteStatus = 'new' | 'reviewed' | 'quoted' | 'converted' | 'archived';

export type QuoteSource = 'web_catalogue';

export type QuoteCategoryId = CategoryId | 'custom';

export interface QuoteRequestItem {
  productSlug: string;
  categoryId: QuoteCategoryId;
  productCode: string;
  productName: string;
  quantity: number;
  dimensions: string;
  materialFinish: string;
  /** Indicative INR starting rate snapshot at inquiry time (0 for custom builds). */
  indicativeUnitRate: number;
}

export interface QuoteRequestPayload {
  referenceId: string;
  status: 'new';
  source: QuoteSource;
  organisationName: string;
  contactPerson: string;
  phone: string;
  email: string;
  deliveryLocation: string;
  additionalRequirements: string;
  items: QuoteRequestItem[];
  itemCount: number;
  totalQuantity: number;
}

export interface QuoteItemDraftInput {
  id: string;
  productSlug: string;
  quantity: string;
  dimensions: string;
  materialFinish: string;
}

export interface QuoteFormDraftInput {
  organisationName: string;
  contactPerson: string;
  phone: string;
  email: string;
  deliveryLocation: string;
  additionalRequirements: string;
  items: QuoteItemDraftInput[];
}

export interface QuoteSubmissionMeta {
  quoteId: string;
  referenceId: string;
}

export interface QuoteSubmissionResult {
  quoteId: string;
  referenceId: string;
  submittedAt: string;
  payload: QuoteRequestPayload;
}
