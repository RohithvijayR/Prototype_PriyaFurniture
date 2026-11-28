# Priya Furniture — Phase 2.4 Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Perimeter:** All unmatched Firestore paths are explicitly denied (`allow read, write: if false`).
2. **Locked Unpopulated ERP Collections:** The following collections remain unconditionally locked (`allow read, write: if false`) for all client SDK calls in Phase 2.4:
   - `/products/{productId}`
   - `/categories/{categoryId}`
   - `/settings/{settingId}`
3. **Retired Legacy Quotation Intake (`/quoteRequests/{quoteId}`):**
   - Retired from client writes in Phase 2.4 upon consolidation onto `/quotationRequests`.
   - Locked as strict default-deny (`allow read, write: if false`) to preserve any historical Phase 2.1 records non-destructively without public or customer exposure.
4. **Owner-Scoped User Profile Security (`/users/{userId}`):**
   - Unchanged from Phase 2.3: owner-only `get`, `create`, and allowlisted `update`; zero `list` or `delete`; `role` locked to `'customer'` on create and immutable on update; `accountStatus` locked to `'active'` on create and immutable on update; suspended accounts cannot mutate profile fields.
5. **Consolidated Customer & Public Quotation Requests (`/quotationRequests/{quotationRequestId}`):**
   - **Single Authoritative Collection:** Both anonymous public visitors and signed-in customers submit inquiries to `/quotationRequests/{quotationRequestId}`.
   - **Strict Creation Schema (Exact 20-Key Allowlist):**
     - Exact keys: `id`, `referenceNumber`, `userId`, `source`, `customerName`, `organizationName`, `email`, `phone`, `requestedProducts`, `itemCount`, `totalQuantity`, `deliveryLocation`, `additionalRequirements`, `status`, `revisionNumber`, `parentQuotationRequestId`, `activeQuotationVersionId`, `convertedOrderId`, `createdAt`, `updatedAt`.
     - `id == quotationRequestId` (valid ID regex `^[a-zA-Z0-9_-]{1,128}$`).
     - Ownership binding: anonymous visitors MUST send `userId == null`; signed-in customers MUST send `userId == request.auth.uid` (no UID spoofing, no anonymous writes by authenticated sessions or vice versa).
     - Workflow lock: `status == 'submitted'`, `source == 'web_catalogue'`, `revisionNumber == 1`, `parentQuotationRequestId == null`, `activeQuotationVersionId == null`, `convertedOrderId == null`.
     - Authoritative timestamps: `createdAt == request.time && updatedAt == request.time`.
     - Bounded product snapshots: `requestedProducts` is a list of `1..10` valid 11-key `QuotationProductSnapshot` maps (`productId`, `categoryId`, `categoryName`, `productCode`, `productName`, `quantity`, `customizationDetails`, `dimensions`, `materialFinishPreferences`, `indicativeBaseRateInr`, `imagePath`).
   - **Owner-Only Customer Reads (`get` & `list`):**
     - `allow get`: `isValidId(quotationRequestId) && isSignedIn() && existing().userId == request.auth.uid`.
     - `allow list`: `isSignedIn() && resource.data.userId == request.auth.uid` (Query-as-Permission compatible with `where('userId', '==', uid)`, no `get()` calls inside `list`).
     - Anonymous guest records (`userId == null`) are strictly unreadable by any client SDK caller.
   - **Zero Client Mutation / Deletion:** `allow update, delete: if false;` — customers can never modify quotation status, product snapshots, contact data, or delete quotation history.
6. **Physical Isolation of Internal Staff Notes (`/quotationRequests/{quotationRequestId}/internalNotes/{noteId}`):**
   - `internalNotes` is NOT permitted on customer-readable `/quotationRequests/{id}` documents (rejected by `hasOnly`).
   - Isolated in a dedicated subcollection `/quotationRequests/{quotationRequestId}/internalNotes/{noteId}` locked unconditionally (`allow read, write: if false`) for all client SDK access.

## 2. Adversarial Security Tests (Must All Return PERMISSION_DENIED)
1. **Unauthenticated `get` / `list` / `update` / `delete` on `/quotationRequests/{id}`**: All rejected (PII & guest inquiry protection).
2. **Cross-Customer Quotation Read (`get` & `list`)**: Authenticated Customer A attempting `get` on Customer B's quotation or `get` on an anonymous (`userId: null`) quotation, or running an unfiltered `list` query on `/quotationRequests`.
3. **UID Spoofing on Create**: Unauthenticated visitor passing a non-null `userId`, or authenticated Customer A creating a quotation with `userId: 'customer_b'` or `userId: null`.
4. **Status & Workflow Manipulation on Create**: Submitting `status: 'approved'`, `'quotation_prepared'`, `'converted_to_order'`, `'new'`, `revisionNumber: 2`, or non-null `convertedOrderId`.
5. **Customer Update / Delete Denial**: Even the authenticated owner attempting `updateDoc` (e.g., changing `status` to `'approved'` or modifying `requestedProducts`) or `deleteDoc` on their own quotation.
6. **Internal Notes / Shadow Field Injection**: Attempting to include `internalNotes`, `isAdmin`, or any unlisted field on `/quotationRequests/{id}` or inside `requestedProducts[i]`, or reading/writing `/quotationRequests/{id}/internalNotes/{noteId}`.
7. **Timestamp Spoofing & Duplicate Overwrite**: Supplying a client `Date` for `createdAt`/`updatedAt`, or calling `setDoc` on an existing `/quotationRequests/{id}` (which triggers `update`, denied).
8. **Payload & Snapshot Abuse**: `requestedProducts` empty or > 10 items, invalid `categoryId`, `quantity <= 0` or `> 10000`, oversized `additionalRequirements > 2000`, malformed email/phone, or poisoned document ID (`../bad`).
9. **Retired Legacy `/quoteRequests/{quoteId}`**: All `get`, `list`, `create`, `update`, and `delete` operations rejected.
10. **User Profile & Locked ERP Collections**: All Phase 2.3 `/users/{userId}` privilege escalation, cross-user PII, list, and delete attacks, plus all reads/writes on `/products`, `/categories`, `/settings`, and `/admins` remain denied.
