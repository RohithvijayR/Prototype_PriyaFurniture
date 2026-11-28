# Priya Furniture — Firestore Data Architecture (Phase 2.4)

This document defines the typed Firestore data architecture for the Priya Furniture ERP. It sits cleanly alongside the verified Phase 1 static storefront (`src/data/catalogue.ts` and `src/data/catalogues/*`), which remains the active source of truth for all 59 public catalogue products, starting reference rates, images, and PDFs.

---

## 1. Collection Overview

Centralized collection identifiers live in `src/lib/firebase/collections.ts` (`FIRESTORE_COLLECTIONS` and `FIRESTORE_SUBCOLLECTIONS`), and all TypeScript schemas live in `src/types/firestore.ts`.

| Collection Path | Document ID Convention | Purpose | Phase 2.4 Access Posture |
| :--- | :--- | :--- | :--- |
| `products/{productId}` | Composite: `${categoryId}-${normalizedCode}` (e.g. `barber-chairs-pf-001`) | ERP product master compatible with all 59 static catalogue models | **Default-deny** (`allow read, write: if false`) |
| `categories/{categoryId}` | Category slug (e.g. `pedicure-manicure`, `barber-chairs`, `hairwash-stations`, `facial-beds`) | Ordered catalogue collection definitions | **Default-deny** (`allow read, write: if false`) |
| `users/{userId}` | Firebase Auth UID (`uid`) | Customer, partner, and future internal profiles & addresses (`displayName`, `role`, `accountStatus`) | **Owner-only** `get`/`create`/`update` (`role` locked to `'customer'` on create & immutable; zero `list`/`delete`) |
| `quotationRequests/{quotationRequestId}` | `qr_YYYYMMDD_<6-char>_<4-char>` | **Single authoritative quotation request collection** with point-in-time product snapshots, controlled status lifecycle, and future revision/order linkage | **Public & Auth `create`** (`status == 'submitted'`, `userId == null` or `auth.uid`); **Owner-only `get`/`list`** (`userId == auth.uid`); zero client `update`/`delete` |
| `quotationRequests/{quotationRequestId}/internalNotes/{noteId}` | Auto/ID (`^[a-zA-Z0-9_-]{1,128}$`) | Physically isolated internal staff review notes (never exposed to customers) | **Default-deny** (`allow read, write: if false`) |
| `settings/{settingId}` | Singleton key (`general`, `quotation`, `catalogue`) | Unpopulated structural documents for future application configuration | **Default-deny** (`allow read, write: if false`) |
| `quoteRequests/{quoteId}` *(Legacy Retired)* | `rfq_YYYYMMDD_...` | Legacy Phase 2.1 public quotation intake collection retired in Phase 2.4 | **Default-deny** (`allow read, write: if false`); preserved non-destructively |

---

## 2. Phase 2.4 Quotation Collection Consolidation

### Authoritative Collection Decision
In Phase 2.4, all public and authenticated customer quotation requests are consolidated onto **`quotationRequests`** (`FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS`):
- **Single source of truth:** `src/services/quoteService.ts` writes exclusively to `quotationRequests/{quotationRequestId}` and reads customer-owned quotations from `quotationRequests` via bounded cursor-paginated queries (`where('userId', '==', uid)`, `orderBy('createdAt', 'desc')`, `limit(pageSize + 1)`).
- **Controlled Customer-Visible Statuses:** `submitted`, `under_review`, `quotation_prepared`, `awaiting_customer_approval`, `approved`, `declined`, `converted_to_order`. Client creation is strictly locked to `'submitted'` in `firestore.rules`.
- **Internal Notes Isolation:** Firestore reads return full documents, so `internalNotes` is physically separated from customer-readable `quotationRequests/{id}` documents into the locked subcollection `quotationRequests/{quotationRequestId}/internalNotes/{noteId}`.

### Safe Non-Destructive Legacy `quoteRequests` Migration Plan
No documents in the legacy Phase 2.1 `quoteRequests` collection are deleted or modified automatically during Phase 2.4:
1. **Immediate Lock:** `firestore.rules` locks `/quoteRequests/{quoteId}` to `allow read, write: if false` so legacy records remain intact in Firestore while preventing new client writes or unauthorized access.
2. **Optional Admin Migration (Future Server-Side Script via Firebase Admin SDK):**
   - Read each document from `quoteRequests/{quoteId}` in batches.
   - Transform into the `FirestoreQuotationRequest` shape:
     - `id`: preserve `quoteId` (valid ID) or generate `qr_...`
     - `referenceNumber`: `legacy.referenceId`
     - `userId`: `null` (legacy submissions were unauthenticated)
     - `source`: `'web_catalogue'`
     - `customerName`: `legacy.contactPerson`, `organizationName`: `legacy.organisationName`
     - `requestedProducts`: map each `legacy.items[i]` to `FirestoreQuotationProductSnapshot` (deriving `categoryName` and `imagePath` from the static catalogue when matched by `productSlug`, setting `indicativeBaseRateInr` to `item.indicativeUnitRate > 0 ? item.indicativeUnitRate : null`, and `customizationDetails: ''`)
     - `status`: map `'new' -> 'submitted'`, `'reviewed' -> 'under_review'`, `'quoted' -> 'quotation_prepared'`, `'converted' -> 'converted_to_order'`, `'archived' -> 'declined'`
     - `revisionNumber`: `1`, nullable linkage fields `null`, preserve original `createdAt`/`updatedAt`
   - Write idempotently into `quotationRequests/{id}` using Admin SDK (`create()` so duplicates are skipped).
   - Verify record counts before archiving or exporting legacy `quoteRequests` in a controlled maintenance window.

---

## 3. Composite Product Identity & Pricing Guardrails

- **No global uniqueness on `productCode`:** Official Priya Furniture codes (`PF 001`–`PF 024`) legitimately repeat across categories (for example, `PF 001` exists in `barber-chairs`, `pedicure-manicure`, `facial-beds`, and `hairwash-stations`).
- **Composite Document ID:** `buildProductDocId(categoryId, productCode)` deterministically generates `${categoryId}-${normalizedCode}` (matching existing `CatalogueProduct.id` / `slug`). Product lookups and references never rely on `productCode` alone.
- **Indicative Pricing Semantics:** `indicativeBaseRateInr` is paired with `pricingMode: 'indicative_starting_from' | 'quote_only'` so preliminary starting reference rates are never conflated with fixed selling prices. Actual quotations depend on customization, materials, quantity, accessories, transportation, and installation.
- **Portable Asset Paths:** `normalizePortableAssetPath()` strips deployment subpaths (such as `/Prototype_PriyaFurniture`) so Firestore documents store deployment-independent paths (`/assets/catalogue/...`) compatible with GitHub Pages, custom domains, or future Firebase Storage migration.

---

## 4. Entity Relationships

```text
categories/{categoryId} (1) ──────────< (N) products/{productId}
                                              │
                                              │ point-in-time snapshot copied into
                                              ▼
users/{userId} (0..1) ────────────────< (N) quotationRequests/{quotationRequestId}
                                              ├─ requestedProducts[] (11-field snapshots)
                                              ├─ revisionNumber / parentQuotationRequestId
                                              ├─ activeQuotationVersionId (future)
                                              ├─ convertedOrderId (future orders/{orderId})
                                              └─ internalNotes/{noteId} (locked staff subcollection)

settings/{general | quotation | catalogue}  (standalone singleton configuration docs)
```

---

## 5. Required Firestore Composite Indexes

Defined in `firestore.indexes.json`:
- **`quotationRequests`:** `userId ASC, createdAt DESC` *(required for Phase 2.4 paginated customer quotation history)*
- **`quotationRequests`:** `status ASC, createdAt DESC` *(prepared for future admin review queues)*
- **`products`:** `categoryId ASC, isActive ASC, productCode ASC`
- **`categories`:** `isActive ASC, displayOrder ASC`

---

## 6. Security Model (Zero-Trust Default-Deny)

- The frontend is treated as untrusted.
- `firestore.rules` starts with a global default-deny catch-all (`match /{document=**} { allow read, write: if false; }`).
- **Customer Quotation Isolation:** Signed-in customers can only `get` or `list` documents in `quotationRequests` where `resource.data.userId == request.auth.uid`. Guest inquiries (`userId == null`) cannot be read or listed from client SDKs.
- **Immutable Customer Submissions:** Customers have zero `update` or `delete` permissions on `quotationRequests`—status transitions, formal pricing, and order conversions are reserved for future server/admin workflows.
- **No Client-Side Role Assignment:** `users/{userId}` locks `role` to `'customer'` and `accountStatus` to `'active'` on create and forbids client mutation thereafter.
