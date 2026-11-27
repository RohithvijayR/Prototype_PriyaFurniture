# Priya Furniture — Firestore Data Architecture (Phase 2.2)

This document defines the typed Firestore data architecture established for the future Priya Furniture ERP. It sits cleanly alongside the verified Phase 1 static storefront (`src/data/catalogue.ts` and `src/data/catalogues/*`), which remains the active source of truth for all 59 public catalogue products, starting reference rates, images, and PDFs.

---

## 1. Collection Overview

Centralized collection identifiers live in `src/lib/firebase/collections.ts` (`FIRESTORE_COLLECTIONS`), and all TypeScript schemas live in `src/types/firestore.ts`.

| Collection Path | Document ID Convention | Purpose | Phase 2.2 Access Posture |
| :--- | :--- | :--- | :--- |
| `products/{productId}` | Composite: `${categoryId}-${normalizedCode}` (e.g. `barber-chairs-pf-001`) | ERP product master compatible with all 59 static catalogue models | **Default-deny** (`allow read, write: if false`) |
| `categories/{categoryId}` | Category slug (e.g. `pedicure-manicure`, `barber-chairs`, `hairwash-stations`, `facial-beds`) | Ordered catalogue collection definitions | **Default-deny** (`allow read, write: if false`) |
| `users/{userId}` | Firebase Auth UID (`uid`) | Customer, partner, and future internal profiles & addresses (`displayName`, `role`, `accountStatus`) | **Owner-only** `get`/`create`/`update` (`role` locked to `'customer'` on create & immutable; zero `list`/`delete`) |
| `quotationRequests/{quotationRequestId}` | `qr_YYYYMMDD_<6-char>_<4-char>` | ERP quotation inquiries with point-in-time product snapshots, revision & order linkage | **Default-deny** (`allow read, write: if false`) |
| `settings/{settingId}` | Singleton key (`general`, `quotation`, `catalogue`) | Unpopulated structural documents for future application configuration | **Default-deny** (`allow read, write: if false`) |

> **Active Public Form Note (`quoteRequests` vs `quotationRequests`):**
> The existing verified Request a Quote form (`src/pages/QuoteRequestPage.tsx` → `src/services/quoteService.ts`) currently persists public inquiries to `quoteRequests/{quoteId}` under a hardened create-only rule. That working path is intentionally preserved untouched in Phase 2.2 until a consolidation decision (`quoteRequests` vs `quotationRequests`) is approved before Phase 2.3.

---

## 2. Composite Product Identity & Pricing Guardrails

- **No global uniqueness on `productCode`:** Official Priya Furniture codes (`PF 001`–`PF 024`) legitimately repeat across categories (for example, `PF 001` exists in `barber-chairs`, `pedicure-manicure`, `facial-beds`, and `hairwash-stations`).
- **Composite Document ID:** `buildProductDocId(categoryId, productCode)` deterministically generates `${categoryId}-${normalizedCode}` (matching existing `CatalogueProduct.id` / `slug`). Product lookups and references never rely on `productCode` alone.
- **Indicative Pricing Semantics:** `indicativeBaseRateInr` is paired with `pricingMode: 'indicative_starting_from' | 'quote_only'` so preliminary starting reference rates are never conflated with fixed selling prices. Actual quotations depend on customization, materials, quantity, accessories, transportation, and installation.
- **Portable Asset Paths:** `normalizePortableAssetPath()` strips deployment subpaths (such as `/Prototype_PriyaFurniture`) so Firestore documents store deployment-independent paths (`/assets/catalogue/...`) compatible with GitHub Pages, custom domains, or future Firebase Storage migration.

---

## 3. Entity Relationships

```text
categories/{categoryId} (1) ──────────< (N) products/{productId}
                                              │
                                              │ point-in-time snapshot copied into
                                              ▼
users/{userId} (0..1) ────────────────< (N) quotationRequests/{quotationRequestId}
                                              │  ├─ requestedProducts[] (snapshots)
                                              │  ├─ revisionNumber / parentQuotationRequestId
                                              │  ├─ activeQuotationVersionId (future)
                                              │  └─ convertedOrderId (future orders/{orderId})

settings/{general | quotation | catalogue}  (standalone singleton configuration docs)
```

- **Categories → Products:** Each `products/{productId}` references `categoryId` matching `categories/{categoryId}`.
- **Users → Quotation Requests:** `quotationRequests.userId` is nullable (`string | null`) to support both guest public inquiries and future authenticated customer/partner inquiries.
- **Products → Quotation Requests (Snapshot Pattern):** Each entry in `requestedProducts` (`FirestoreQuotationProductSnapshot`) stores `productId`, `categoryId`, `categoryName`, `productCode`, `productName`, `quantity`, `customizationDetails`, `dimensions`, `materialFinishPreferences`, `indicativeBaseRateInr`, and `imagePath` as captured at submission time. Future catalogue edits will never corrupt historical quotations.
- **Future Revision & Order Conversion Readiness:** `revisionNumber`, `parentQuotationRequestId`, `activeQuotationVersionId`, and `convertedOrderId` reserve clean relational pointers for formal quotations and sales orders without implementing those workflows yet.

---

## 4. Separation of Static Catalogue vs Firestore Layer

| Layer | Files | Responsibility |
| :--- | :--- | :--- |
| **Static Storefront Source of Truth** | `src/types/catalogue.ts`, `src/data/catalogue.ts`, `src/data/catalogues/*` | Drives Home, Catalogue, Product Details, starting rates, images, and PDFs. Unchanged in Phase 2.2. |
| **Firestore Schema Contracts** | `src/types/firestore.ts`, `firebase-blueprint.json` | Defines strict ERP Firestore document types, bounds, and JSON Schema IR. |
| **Firestore Access & Mapping Layer** | `src/lib/firebase/collections.ts`, `src/lib/firebase/mappers.ts` | Centralized collection IDs, composite ID builders, timestamp utilities, typed ref factories, and pure read-only adapters (`mapCatalogueProductToFirestoreDraft`, `mapCatalogueCategoryToFirestoreDraft`, `createQuotationProductSnapshot`). Executes zero writes in Phase 2.2. |

---

## 5. Timestamp & Document ID Conventions

- **Authoritative Server Timestamps:** Every document implements `FirestoreAuditFields` (`createdAt`, `updatedAt`). Writes must use `createAuditTimestamps()` (`serverTimestamp()`) on create and `createUpdateTimestamp()` on update. Security rules verify `request.time` and enforce `createdAt` immutability.
- **Safe Reads:** `firestoreTimestampToDate()` and `firestoreTimestampToIso()` handle Firestore `Timestamp`, JS `Date`, and serialized `{ seconds, nanoseconds }` payloads defensively.
- **Document ID Hardening:** All document IDs are validated against `^[a-zA-Z0-9_-]{1,128}$` (`isValidFirestoreDocId()`), matching `isValidId()` in `firestore.rules`.

---

## 6. Security Preparation (Zero-Trust Default-Deny)

- The frontend is treated as untrusted.
- `firestore.rules` starts with a global default-deny catch-all (`match /{document=**} { allow read, write: if false; }`) and explicitly declares default-deny blocks for `products`, `categories`, `users`, `quotationRequests`, and `settings`.
- **No client-side role assignment:** `users/{userId}` contains PII and RBAC fields (`role`, `accountStatus`). No authentication flow or admin role system is created in Phase 2.2; when Phase 2.3+ introduces Firebase Auth, `role` and `accountStatus` will remain strictly locked from client mutation and `users/{userId}` reads will be restricted to owner or verified server-authorized staff.
- **No invented data:** No collections are seeded with mock customers, products, quotations, or settings in this phase.
