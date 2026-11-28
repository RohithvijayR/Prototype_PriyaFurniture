import type { FieldValue, Timestamp } from 'firebase/firestore';
import type { CategoryId, ProductImage, ProductSpecification } from './catalogue';
import type { QuoteCategoryId } from './quote';

/**
 * Shared Timestamp Handling Conventions
 *
 * - Read models (`FirestoreTimestampValue`): `Timestamp` when read from Firestore.
 * - Write payloads (`FirestoreWriteTimestamp`): `FieldValue` (`serverTimestamp()`) on create/update.
 * - Client-supplied dates are never trusted as authoritative audit timestamps; Firestore Security
 *   Rules enforce `request.time` for `createdAt` and `updatedAt`.
 */
export type FirestoreTimestampValue = Timestamp;
export type FirestoreWriteTimestamp = FieldValue;
export type FirestoreAnyTimestamp = Timestamp | FieldValue;

export interface FirestoreAuditFields<TTimestamp = FirestoreTimestampValue> {
  createdAt: TTimestamp;
  updatedAt: TTimestamp;
}

/**
 * Shared validation bounds for Phase 2.2 ERP Firestore documents.
 * Kept synchronized with firebase-blueprint.json and future firestore.rules.
 */
export const FIRESTORE_SCHEMA_LIMITS = {
  DOCUMENT_ID_MAX: 128,
  PRODUCT_CODE_MAX: 32,
  PRODUCT_NAME_MAX: 180,
  PRODUCT_DESCRIPTION_MAX: 2000,
  PRODUCT_FEATURES_MAX: 20,
  PRODUCT_SPECS_MAX: 20,
  PRODUCT_IMAGES_MAX: 12,
  INDICATIVE_RATE_MAX: 10_000_000,
  CATEGORY_NAME_MAX: 120,
  CATEGORY_DESCRIPTION_MAX: 1000,
  USER_NAME_MAX: 120,
  USER_EMAIL_MAX: 254,
  USER_PHONE_MAX: 32,
  ORGANIZATION_NAME_MAX: 160,
  ADDRESS_LINE_MAX: 200,
  ADDRESS_CITY_MAX: 100,
  ADDRESS_STATE_MAX: 100,
  ADDRESS_POSTAL_MAX: 20,
  ADDRESS_COUNTRY_MAX: 80,
  QUOTATION_MAX_PRODUCTS: 10,
  QUOTATION_MAX_QUANTITY_PER_ITEM: 10_000,
  QUOTATION_MAX_TOTAL_QUANTITY: 100_000,
  QUOTATION_CUSTOMIZATION_MAX: 500,
  QUOTATION_DIMENSIONS_MAX: 200,
  QUOTATION_FINISH_MAX: 200,
  QUOTATION_DELIVERY_LOCATION_MAX: 200,
  QUOTATION_ADDITIONAL_REQ_MAX: 2000,
  QUOTATION_INTERNAL_NOTES_MAX: 4000,
} as const;

export const FIRESTORE_ID_PATTERNS = {
  DOCUMENT_ID: /^[a-zA-Z0-9_-]{1,128}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PRODUCT_CODE: /^PF\s?[0-9]{3}[A-Z0-9-]*$/,
  QUOTATION_REFERENCE: /^PF-RFQ-[0-9]{4}-[A-Z0-9]{4,8}$/,
} as const;

// ---------------------------------------------------------------------------
// 1. Products Collection (`products/{productId}`)
// ---------------------------------------------------------------------------

/**
 * Explicit pricing mode guard: Priya Furniture base reference rates are
 * preliminary starting indicators, never fixed e-commerce selling prices.
 */
export type ProductPricingMode = 'indicative_starting_from' | 'quote_only';

/**
 * Firestore document schema for `products/{productId}`.
 *
 * Identity rule:
 * - Product codes (`PF 001`, `PF 002`, etc.) repeat legitimately across categories.
 * - Document ID MUST always be composite (`${categoryId}-${normalizedCode}`, e.g.
 *   `barber-chairs-pf-001`), never `productCode` alone.
 *
 * Source of truth in Phase 2.2:
 * - Static catalogue modules under `src/data/catalogues/*` remain the active source of truth.
 * - This schema prepares future ERP catalogue management without migrating static data yet.
 */
export interface FirestoreProduct<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  /** Composite unique document ID (e.g. `barber-chairs-pf-001`). */
  id: string;
  /** URL-safe unique slug aligned with `id`. */
  slug: string;
  /** Official Priya Furniture code within its category (e.g. `PF 001`). NOT globally unique. */
  productCode: string;
  /** Parent category reference matching `categories/{categoryId}`. */
  categoryId: CategoryId;
  /** Denormalized display label for quick list rendering. */
  categoryLabel: string;
  name: string;
  description: string;
  features: string[];
  specifications: ProductSpecification[];
  /** Deployment-independent primary product image path(s) (e.g. `/assets/catalogue/...`). */
  imagePaths: string[];
  /** Optional supplementary angles, finish swatches, or detail image paths. */
  additionalImagePaths: string[];
  /** Optional rich alt/caption metadata synchronized with `imagePaths` & `additionalImagePaths`. */
  imageMetadata?: ProductImage[];
  /**
   * Preliminary base reference rate in INR ("Starting from").
   * Strictly indicative—actual quotations vary by customisation, materials, quantity, and delivery.
   * `null` when rate is quote-only.
   */
  indicativeBaseRateInr: number | null;
  pricingMode: ProductPricingMode;
  /** Whether upholstery, colour, sizing, or accessory customisation is supported. */
  isCustomizable: boolean;
  customizationOptions: string[];
  /** Controls catalogue visibility without deleting historical references. */
  isActive: boolean;
  featured: boolean;
  sourcePdfPath?: string;
  sourcePdfPage?: number;
}

/** Pure data draft (without server timestamps) used by mappers and future admin forms. */
export type FirestoreProductDraft = Omit<
  FirestoreProduct<never>,
  'createdAt' | 'updatedAt'
>;

export type FirestoreProductWrite = FirestoreProduct<FirestoreWriteTimestamp>;

// ---------------------------------------------------------------------------
// 2. Categories Collection (`categories/{categoryId}`)
// ---------------------------------------------------------------------------

/**
 * Firestore document schema for `categories/{categoryId}`.
 * Preserves the four existing Priya Furniture collections (`pedicure-manicure`,
 * `barber-chairs`, `hairwash-stations`, `facial-beds`) while allowing future categories.
 */
export interface FirestoreCategory<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  /** Unique category document ID (e.g. `barber-chairs`). */
  id: CategoryId | string;
  name: string;
  slug: string;
  description: string;
  /** Deterministic ascending sort position in storefront & ERP listings. */
  displayOrder: number;
  isActive: boolean;
  shortName?: string;
  tagline?: string;
  coverImagePath?: string;
  cataloguePdfPath?: string;
  cataloguePdfLabel?: string;
}

export type FirestoreCategoryDraft = Omit<
  FirestoreCategory<never>,
  'createdAt' | 'updatedAt'
>;

export type FirestoreCategoryWrite = FirestoreCategory<FirestoreWriteTimestamp>;

// ---------------------------------------------------------------------------
// 3. Users Collection (`users/{userId}`)
// ---------------------------------------------------------------------------

export type UserAccountType = 'individual' | 'business' | 'partner' | 'internal';

/** Account types a customer may select during self-registration or profile editing. */
export type ClientSelectableAccountType = 'individual' | 'business';

/**
 * Future ERP role taxonomy.
 *
 * SECURITY CONSTRAINT:
 * Roles are NEVER client-assignable. Client-side account creation is strictly locked
 * to `'customer'` by Firestore Security Rules, and `role` / `accountStatus` are
 * immutable to client updates. Privileged roles are managed solely server-side.
 */
export type UserRole = 'customer' | 'partner' | 'sales' | 'staff' | 'admin';

export type UserAccountStatus = 'active' | 'pending_verification' | 'suspended' | 'inactive';

export interface FirestoreAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Firestore document schema for `users/{userId}`.
 * Document ID maps 1-to-1 to the Firebase Authentication UID.
 * Contains PII and server-controlled RBAC metadata—owner-only read/create/update;
 * zero list/delete access and zero client role escalation.
 */
export interface FirestoreUser<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  /** Firebase Auth UID matching the document ID. */
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  accountType: UserAccountType;
  organizationName: string;
  billingAddress: FirestoreAddress | null;
  shippingAddress: FirestoreAddress | null;
  /** Server/admin-controlled access role. Locked to 'customer' on client create; immutable on client update. */
  role: UserRole;
  /** Server/admin-controlled account status. Locked to 'active' on client create; immutable on client update. */
  accountStatus: UserAccountStatus;
}

export type FirestoreUserDraft = Omit<FirestoreUser<never>, 'createdAt' | 'updatedAt'>;
export type FirestoreUserWrite = FirestoreUser<FirestoreWriteTimestamp>;

/** Initial profile seed captured during email/password registration or first Google sign-in. */
export interface UserProfileSeedInput {
  displayName?: string;
  phoneNumber?: string;
  accountType?: ClientSelectableAccountType;
  organizationName?: string;
}

/** Strict allowlist of user-editable profile fields for `users/{uid}` updates. */
export interface UserProfileUpdateInput {
  displayName: string;
  phoneNumber: string;
  accountType: UserAccountType;
  organizationName: string;
  billingAddress: FirestoreAddress | null;
  shippingAddress: FirestoreAddress | null;
}

// ---------------------------------------------------------------------------
// 4. Quotation Requests Collection (`quotationRequests/{quotationRequestId}`)
// ---------------------------------------------------------------------------

/**
 * Controlled customer-visible quotation lifecycle statuses.
 *
 * SECURITY CONSTRAINT:
 * - Public and customer creation is strictly forced to `'submitted'` by `firestore.rules`.
 * - Customers have zero update/delete permissions on `quotationRequests` and can never
 *   change statuses or write administrative fields.
 */
export type QuotationRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'quotation_prepared'
  | 'awaiting_customer_approval'
  | 'approved'
  | 'declined'
  | 'converted_to_order';

export const QUOTATION_REQUEST_STATUSES: readonly QuotationRequestStatus[] = [
  'submitted',
  'under_review',
  'quotation_prepared',
  'awaiting_customer_approval',
  'approved',
  'declined',
  'converted_to_order',
] as const;

export interface QuotationStatusDisplayMeta {
  status: QuotationRequestStatus;
  label: string;
  shortDescription: string;
  stepIndex: number;
  tone: 'neutral' | 'amber' | 'slate' | 'positive' | 'muted';
}

export const QUOTATION_STATUS_META: Record<QuotationRequestStatus, QuotationStatusDisplayMeta> = {
  submitted: {
    status: 'submitted',
    label: 'Submitted',
    shortDescription: 'Your quotation request has been received by the Priya Furniture sales desk.',
    stepIndex: 0,
    tone: 'neutral',
  },
  under_review: {
    status: 'under_review',
    label: 'Under Review',
    shortDescription: 'Our team is reviewing your requested models, quantities, and finish preferences.',
    stepIndex: 1,
    tone: 'slate',
  },
  quotation_prepared: {
    status: 'quotation_prepared',
    label: 'Quotation Prepared',
    shortDescription: 'An itemized factory quotation has been prepared for your inquiry.',
    stepIndex: 2,
    tone: 'amber',
  },
  awaiting_customer_approval: {
    status: 'awaiting_customer_approval',
    label: 'Awaiting Customer Approval',
    shortDescription: 'Your quotation is ready and awaiting your review and confirmation.',
    stepIndex: 3,
    tone: 'amber',
  },
  approved: {
    status: 'approved',
    label: 'Approved',
    shortDescription: 'Your quotation has been approved and confirmed for next steps.',
    stepIndex: 4,
    tone: 'positive',
  },
  declined: {
    status: 'declined',
    label: 'Declined',
    shortDescription: 'This quotation request was closed or declined.',
    stepIndex: 4,
    tone: 'muted',
  },
  converted_to_order: {
    status: 'converted_to_order',
    label: 'Converted to Order',
    shortDescription: 'This quotation has been converted into a confirmed Priya Furniture order.',
    stepIndex: 5,
    tone: 'positive',
  },
};

export function getQuotationStatusMeta(status: string): QuotationStatusDisplayMeta {
  if (status in QUOTATION_STATUS_META) {
    return QUOTATION_STATUS_META[status as QuotationRequestStatus];
  }
  return {
    status: 'submitted',
    label: status
      .split('_')
      .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
      .join(' '),
    shortDescription: 'Status updated by Priya Furniture.',
    stepIndex: 0,
    tone: 'neutral',
  };
}

/**
 * Immutable product snapshot captured at the time a quotation request is submitted.
 * Decouples historical inquiries from future catalogue edits, price updates, or archival.
 */
export interface FirestoreQuotationProductSnapshot {
  /** Composite product document ID (e.g. `barber-chairs-pf-001`) or `'custom'`. */
  productId: string;
  /** Category identifier paired with `productCode` to prevent cross-category PF collisions. */
  categoryId: QuoteCategoryId;
  categoryName: string;
  /** Official model code at inquiry time (e.g. `PF 001`) or `'CUSTOM'`. */
  productCode: string;
  productName: string;
  quantity: number;
  customizationDetails: string;
  dimensions: string;
  materialFinishPreferences: string;
  /**
   * Snapshot of the indicative INR starting reference rate at inquiry time (`null` for custom builds).
   * Strictly preliminary—never treated as a fixed selling price.
   */
  indicativeBaseRateInr: number | null;
  /** Optional snapshot of portable primary product image path at submission time. */
  imagePath: string | null;
}

/**
 * Authoritative ERP quotation request document schema (`quotationRequests/{quotationRequestId}`).
 *
 * Security & PII Isolation:
 * - `userId` is `null` for anonymous public inquiries and `request.auth.uid` for signed-in customers.
 * - Authenticated customers may only `get` or `list` documents where `userId == request.auth.uid`.
 * - Internal administrative notes are physically isolated in the locked subcollection
 *   `quotationRequests/{quotationRequestId}/internalNotes/{noteId}` and NEVER stored on this
 *   customer-readable document.
 */
export interface FirestoreQuotationRequest<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  /** Unique Firestore document ID (`qr_YYYYMMDD_<6-char>_<4-char>`). */
  id: string;
  /** Human-readable reference identifier (e.g. `PF-RFQ-2026-AB12CD`). */
  referenceNumber: string;
  /** Firebase Auth UID when submitted by a signed-in customer, or `null` for guest inquiries. */
  userId: string | null;
  /** Submission channel identifier. */
  source: 'web_catalogue';
  customerName: string;
  organizationName: string;
  email: string;
  phone: string;
  /** Bounded array (1..10) of point-in-time product snapshots. */
  requestedProducts: FirestoreQuotationProductSnapshot[];
  itemCount: number;
  totalQuantity: number;
  deliveryLocation: string;
  additionalRequirements: string;
  status: QuotationRequestStatus;
  /** Monotonic revision counter starting at 1 for future quotation revision workflows. */
  revisionNumber: number;
  /** Optional reference to an earlier `quotationRequests/{id}` if branched as a revision. */
  parentQuotationRequestId: string | null;
  /** Optional reference to a future formal quotation version document. */
  activeQuotationVersionId: string | null;
  /** Optional reference to a future `orders/{orderId}` document upon conversion. */
  convertedOrderId: string | null;
}

/**
 * Isolated internal staff note document (`quotationRequests/{quotationRequestId}/internalNotes/{noteId}`).
 * Strictly default-deny for all public and customer SDK access.
 */
export interface FirestoreQuotationInternalNote<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  id: string;
  authorUid: string;
  note: string;
}

export type FirestoreQuotationRequestDraft = Omit<
  FirestoreQuotationRequest<never>,
  'createdAt' | 'updatedAt'
>;

export type FirestoreQuotationRequestWrite =
  FirestoreQuotationRequest<FirestoreWriteTimestamp>;

// ---------------------------------------------------------------------------
// 5. Settings Collection (`settings/{settingId}`)
// ---------------------------------------------------------------------------

/**
 * Well-known singleton setting document keys.
 * Documents remain unpopulated in Phase 2.2; do not seed invented business values.
 */
export type FirestoreSettingDocumentId = 'general' | 'quotation' | 'catalogue';

export interface FirestoreSettingsBase<TTimestamp = FirestoreTimestampValue>
  extends FirestoreAuditFields<TTimestamp> {
  id: FirestoreSettingDocumentId | string;
  schemaVersion: number;
  /** Future internal user UID of the last administrator who updated this configuration. */
  updatedBy: string | null;
}

export interface FirestoreGeneralSettings<TTimestamp = FirestoreTimestampValue>
  extends FirestoreSettingsBase<TTimestamp> {
  id: 'general';
  companyDisplayName?: string;
  currencyCode?: 'INR';
  timezone?: string;
  maintenanceMode?: boolean;
}

export interface FirestoreQuotationSettings<TTimestamp = FirestoreTimestampValue>
  extends FirestoreSettingsBase<TTimestamp> {
  id: 'quotation';
  referencePrefix?: string;
  defaultValidityDays?: number;
  pricingDisclaimerText?: string;
  maxItemsPerRequest?: number;
}

export interface FirestoreCatalogueSettings<TTimestamp = FirestoreTimestampValue>
  extends FirestoreSettingsBase<TTimestamp> {
  id: 'catalogue';
  catalogueSource?: 'static' | 'firestore';
  showIndicativeStartingRates?: boolean;
}

export type FirestoreSettingsDocument<TTimestamp = FirestoreTimestampValue> =
  | FirestoreGeneralSettings<TTimestamp>
  | FirestoreQuotationSettings<TTimestamp>
  | FirestoreCatalogueSettings<TTimestamp>;
