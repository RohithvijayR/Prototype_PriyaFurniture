# Priya Furniture — Phase 2.3 Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Perimeter:** All unmatched Firestore paths are explicitly denied (`allow read, write: if false`).
2. **Unchanged Default-Deny ERP Collections:** The following collections remain unconditionally locked (`allow read, write: if false`) for all client SDK calls in Phase 2.3:
   - `/products/{productId}`
   - `/categories/{categoryId}`
   - `/quotationRequests/{quotationRequestId}`
   - `/settings/{settingId}`
3. **Owner-Scoped User Profile Security (`/users/{userId}`):**
   - **PII Isolation (Pillar 6):** Only the authenticated owner (`request.auth != null && request.auth.uid == userId`) may `get` their own document. `list` and `delete` are unconditionally `false` to prevent user directory scraping or audit-trail deletion.
   - **Zero Privilege Escalation:**
     - On `create`: `uid == request.auth.uid`, `role == 'customer'`, `accountStatus == 'active'`, `accountType in ['individual', 'business']`, `email` matches `request.auth.token.email` (case-insensitive), `createdAt == request.time`, `updatedAt == request.time`, and exact 12-key `hasAll`/`hasOnly` allowlist.
     - On `update`: Must pass `isValidUserProfile(incoming(), userId)` first, `existing().accountStatus != 'suspended'`, `affectedKeys().hasOnly(['displayName', 'phoneNumber', 'accountType', 'organizationName', 'billingAddress', 'shippingAddress', 'updatedAt'])`, `uid`/`email`/`role`/`accountStatus`/`createdAt` remain strictly immutable, `updatedAt == request.time`, and `accountType` cannot escalate to `'partner'` or `'internal'` unless already equal to `existing().accountType`.
   - **Nested Address Validation:** `billingAddress` and `shippingAddress` must be `null` or a strict map with required keys `['line1', 'city', 'state', 'postalCode', 'country']`, allowed keys adding optional `'line2'`, and explicit string size limits on every field.
4. **Strict PII Isolation & Create-Only Intake on Active `/quoteRequests/{quoteId}`:** Unchanged from Phase 2.2 (create-only with strict schema, status='new', server timestamps; zero public get/list/update/delete).

## 2. Adversarial Security Tests (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read/List/Create/Update/Delete on `/users/{userId}`**: All rejected.
2. **Cross-User PII Read/Write**: Authenticated User A attempting `get`, `create`, or `update` on `/users/{userB}`.
3. **User Directory Scrape (`list`)**: Authenticated user attempting `getDocs(collection(db, 'users'))`.
4. **Client Self-Assigned Admin Role on Create**: Authenticated user creating `/users/{ownUid}` with `role: 'admin'`, `'staff'`, `'sales'`, or `'partner'`.
5. **Client Privilege Escalation on Update**: Authenticated user updating own profile to set `role: 'admin'` or `accountStatus: 'inactive'` or `accountType: 'internal'`.
6. **Shadow Field Injection on `/users/{uid}`**: Adding extra keys (`isAdmin: true`, `discountTier: 50`) on create or inside `billingAddress`.
7. **Timestamp & Identity Spoofing on `/users/{uid}`**: Supplying a client `Date` for `createdAt`/`updatedAt`, mutating `createdAt` on update, or setting `uid` / `email` to another value.
8. **Self-Deletion Denial**: Authenticated user attempting `deleteDoc(doc(db, 'users', ownUid))`.
9. **Locked ERP Collections Remain Default-Deny**: Unauthenticated AND authenticated attempts to `get`, `list`, or `create` on `/products`, `/categories`, `/quotationRequests`, `/settings`, and `/admins`.
10. **Active `/quoteRequests/{quoteId}` Dirty Dozen**: All existing PII read/list/update/delete, status manipulation, shadow fields, timestamp spoofing, ID poisoning, oversized payloads, invalid email/phone, and invalid items remain denied.
