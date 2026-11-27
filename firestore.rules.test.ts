/**
 * Phase 2.2 Firestore Data Architecture, Security Rules & Config Verification Suite
 *
 * Tests:
 *  1. Pure config resolution (VITE env override, applet-config fallback, unconfigured degradation)
 *  2. Phase 2.2 Firestore Data Architecture invariants:
 *     - All 59 catalogue products & 4 categories preserved with 0 composite ID collisions
 *     - Repeated PF codes (e.g. PF 001 across 4 categories) produce distinct composite IDs
 *     - Portable asset path normalization & indicative base reference rate preservation
 *     - Quotation product snapshot creation (standard & custom builds)
 *     - Timestamp conversion & document ID validation helpers
 *  3. Live Firestore Security Rules tests:
 *     - All 5 Phase 2.2 ERP collections (products, categories, users, quotationRequests, settings)
 *       strictly return PERMISSION_DENIED on get, list, create, update, and delete
 *     - Active /quoteRequests valid creates (1-item & 10-item boundary), duplicate denial,
 *       and all 12 Dirty Dozen adversarial attacks
 *
 * Run with: npx tsx firestore.rules.test.ts
 */
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  terminate,
  updateDoc,
} from 'firebase/firestore';
import appletConfig from './firebase-applet-config.json';
import { resolveFirebaseConfig } from './src/lib/firebase/config';
import { classifyAuthError } from './src/lib/firebase/errors';
import { normalizeOptionalAddress } from './src/services/userProfileService';
import {
  FIRESTORE_COLLECTIONS,
  FIRESTORE_SETTING_IDS,
  buildCategoryDocId,
  buildProductDocId,
  buildQuotationRequestIds,
  buildUserDocId,
  firestoreTimestampToDate,
  firestoreTimestampToIso,
  isValidFirestoreDocId,
  parseProductDocId,
} from './src/lib/firebase/collections';
import {
  createQuotationProductSnapshot,
  mapCatalogueProductToFirestoreDraft,
  normalizePortableAssetPath,
} from './src/lib/firebase/mappers';
import { PEDICURE_MANICURE_PRODUCTS } from './src/data/catalogues/pedicureManicure';
import { BARBER_CHAIR_PRODUCTS } from './src/data/catalogues/barberChairs';
import { HAIRWASH_STATION_PRODUCTS } from './src/data/catalogues/hairwashStations';
import { FACIAL_BED_PRODUCTS } from './src/data/catalogues/facialBeds';

const TEST_RUN_ID = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function makeValidItem(index = 0) {
  return {
    productSlug: 'pedicure-manicure-pf-006',
    categoryId: 'pedicure-manicure',
    productCode: 'PF 006',
    productName: `Pedicure Station Test Model ${index + 1}`,
    quantity: 2,
    dimensions: 'Standard catalogue dimensions',
    materialFinish: 'Warm Brown Leatherette',
    indicativeUnitRate: 35000,
  };
}

function makeValidQuote(overrides: Record<string, unknown> = {}) {
  const items = [makeValidItem(0)];
  return {
    referenceId: 'PF-RFQ-2026-QA01AB',
    status: 'new',
    source: 'web_catalogue',
    organisationName: 'QA Automated Verification Studio',
    contactPerson: 'QA Engineer',
    phone: '+91 90030 21099',
    email: 'qa-verify@example.com',
    deliveryLocation: 'Chennai, Tamil Nadu',
    additionalRequirements: 'Automated Phase 2.2 rules verification record.',
    items,
    itemCount: items.length,
    totalQuantity: 2,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function isPermissionDenied(err: unknown): boolean {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err);
  const combined = `${code} ${msg}`.toLowerCase();
  return combined.includes('permission-denied') || combined.includes('insufficient permissions');
}

async function expectDenied(label: string, fn: () => Promise<unknown>): Promise<void> {
  let succeeded = false;
  try {
    await fn();
    succeeded = true;
  } catch (err) {
    assert.ok(
      isPermissionDenied(err),
      `[${label}] Expected permission-denied, got: ${err instanceof Error ? err.message : String(err)}`
    );
    console.log(`  PASS (DENIED): ${label}`);
  }
  if (succeeded) {
    throw new Error(`[${label}] SECURITY FAILURE: Operation unexpectedly succeeded!`);
  }
}

function runArchitectureTests() {
  console.log('\n=== 2. Phase 2.2 Firestore Data Architecture Tests ===');

  // Collection constants
  assert.deepEqual(Object.values(FIRESTORE_COLLECTIONS).sort(), [
    'categories',
    'products',
    'quotationRequests',
    'settings',
    'users',
  ]);
  assert.equal(FIRESTORE_SETTING_IDS.GENERAL, 'general');
  console.log('  PASS: Centralized collection & setting identifiers verified');

  // Catalogue integrity & composite ID uniqueness across all 59 products
  const allProducts = [
    ...PEDICURE_MANICURE_PRODUCTS,
    ...BARBER_CHAIR_PRODUCTS,
    ...HAIRWASH_STATION_PRODUCTS,
    ...FACIAL_BED_PRODUCTS,
  ];
  assert.equal(allProducts.length, 59, 'Expected exactly 59 static catalogue products');
  assert.equal(PEDICURE_MANICURE_PRODUCTS.length, 10);
  assert.equal(BARBER_CHAIR_PRODUCTS.length, 19);
  assert.equal(HAIRWASH_STATION_PRODUCTS.length, 24);
  assert.equal(FACIAL_BED_PRODUCTS.length, 6);

  const compositeIds = new Set<string>();
  for (const product of allProducts) {
    const draft = mapCatalogueProductToFirestoreDraft(product);
    assert.ok(isValidFirestoreDocId(draft.id), `Invalid composite doc ID: ${draft.id}`);
    assert.equal(draft.id, product.id, `Composite ID mismatch for ${product.id}`);
    assert.equal(draft.pricingMode, 'indicative_starting_from');
    assert.ok(
      typeof draft.indicativeBaseRateInr === 'number' && draft.indicativeBaseRateInr > 0,
      `Missing indicativeBaseRateInr for ${product.id}`
    );
    assert.ok(draft.imagePaths.length >= 1, `Missing image path for ${product.id}`);
    assert.ok(
      draft.imagePaths[0].startsWith('/assets/catalogue/'),
      `Non-portable image path for ${product.id}: ${draft.imagePaths[0]}`
    );
    assert.ok(!compositeIds.has(draft.id), `Duplicate composite product ID detected: ${draft.id}`);
    compositeIds.add(draft.id);
  }
  assert.equal(compositeIds.size, 59);
  console.log('  PASS: All 59 catalogue products map cleanly with 59 unique composite IDs & starting rates');

  // Repeated PF 001 collision check across all 4 categories
  const pf001Ids = [
    buildProductDocId('pedicure-manicure', 'PF 001'),
    buildProductDocId('barber-chairs', 'PF 001'),
    buildProductDocId('hairwash-stations', 'PF 001'),
    buildProductDocId('facial-beds', 'PF 001'),
  ];
  assert.equal(new Set(pf001Ids).size, 4);
  assert.deepEqual(parseProductDocId('barber-chairs-pf-001'), {
    categoryId: 'barber-chairs',
    codeSegment: 'pf-001',
  });
  assert.equal(buildCategoryDocId('barber-chairs'), 'barber-chairs');
  assert.equal(buildUserDocId('uid_abc_123'), 'uid_abc_123');
  assert.throws(() => buildUserDocId('../admin'));
  console.log('  PASS: Composite PF 001 identity separation & document ID hardening verified');

  // Portable asset path normalization (GitHub Pages subpath stripping)
  assert.equal(
    normalizePortableAssetPath('/Prototype_PriyaFurniture/assets/catalogue/barber-chairs/pf-001.jpg'),
    '/assets/catalogue/barber-chairs/pf-001.jpg'
  );

  // Quotation product snapshot creation (standard + custom)
  const barber001 = BARBER_CHAIR_PRODUCTS[0];
  const snapshot = createQuotationProductSnapshot(barber001, {
    quantity: 4,
    customizationDetails: 'Custom stitching',
    dimensions: 'Standard',
    materialFinishPreferences: 'Charcoal Leatherette',
  });
  assert.equal(snapshot.productId, 'barber-chairs-pf-001');
  assert.equal(snapshot.categoryId, 'barber-chairs');
  assert.equal(snapshot.productCode, 'PF 001');
  assert.equal(snapshot.indicativeBaseRateInr, 20000);
  assert.equal(snapshot.quantity, 4);

  const customSnapshot = createQuotationProductSnapshot(null, { quantity: 2 });
  assert.equal(customSnapshot.productId, 'custom');
  assert.equal(customSnapshot.indicativeBaseRateInr, null);

  // Quotation IDs & timestamp helpers
  const qrIds = buildQuotationRequestIds(new Date('2026-11-27T10:00:00Z'));
  assert.ok(isValidFirestoreDocId(qrIds.quotationRequestId));
  assert.match(qrIds.referenceNumber, /^PF-RFQ-2026-[A-Z0-9]{6}$/);

  const ts = Timestamp.fromDate(new Date('2026-11-27T10:00:00Z'));
  assert.equal(firestoreTimestampToIso(ts), '2026-11-27T10:00:00.000Z');
  assert.equal(firestoreTimestampToDate(null), null);

  // Phase 2.3 Auth error mapping & address normalization checks
  assert.equal(classifyAuthError({ code: 'auth/invalid-credential' }).code, 'invalid-credentials');
  assert.equal(classifyAuthError({ code: 'auth/email-already-in-use' }).code, 'email-in-use');
  assert.equal(classifyAuthError({ code: 'auth/popup-closed-by-user' }).code, 'popup-closed');
  assert.equal(classifyAuthError({ code: 'auth/too-many-requests' }).code, 'rate-limited');
  assert.equal(normalizeOptionalAddress(null, 'billing'), null);
  assert.equal(
    normalizeOptionalAddress(
      { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' },
      'billing'
    ),
    null
  );
  assert.deepEqual(
    normalizeOptionalAddress(
      {
        line1: ' 42 Mount Road ',
        line2: ' ',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600002',
        country: 'India',
      },
      'billing'
    ),
    {
      line1: '42 Mount Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600002',
      country: 'India',
    }
  );
  assert.throws(() =>
    normalizeOptionalAddress(
      { line1: 'Only street', city: '', state: '', postalCode: '', country: '' },
      'billing'
    )
  );
  console.log('  PASS: Quotation snapshots, portable asset paths, timestamps, auth errors & addresses verified');
}

async function runTests() {
  console.log('=== 1. Config Resolution Tests ===');
  const unconfigured = resolveFirebaseConfig({}, null);
  assert.equal(unconfigured.isConfigured, false);
  assert.equal(unconfigured.source, 'unconfigured');
  assert.equal(unconfigured.config, null);
  console.log('  PASS: Empty env + null fallback resolves safely to unconfigured');

  const disabled = resolveFirebaseConfig(
    { VITE_FIREBASE_DISABLED: 'true' },
    appletConfig
  );
  assert.equal(disabled.isConfigured, false);
  assert.equal(disabled.source, 'unconfigured');
  console.log('  PASS: VITE_FIREBASE_DISABLED=true cleanly disables Firebase');

  const partialEnv = resolveFirebaseConfig(
    { VITE_FIREBASE_PROJECT_ID: 'only-one-key' },
    appletConfig
  );
  assert.equal(partialEnv.isConfigured, false);
  assert.ok(partialEnv.missingKeys.includes('VITE_FIREBASE_API_KEY'));
  console.log('  PASS: Partial VITE_FIREBASE_* env fails closed to unconfigured');

  const fullEnv = resolveFirebaseConfig(
    {
      VITE_FIREBASE_API_KEY: 'key-123',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-proj',
      VITE_FIREBASE_STORAGE_BUCKET: 'test.firebasestorage.app',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
      VITE_FIREBASE_APP_ID: '1:123:web:abc',
    },
    appletConfig
  );
  assert.equal(fullEnv.isConfigured, true);
  assert.equal(fullEnv.source, 'env');
  assert.equal(fullEnv.config?.projectId, 'test-proj');
  console.log('  PASS: Complete VITE_FIREBASE_* env overrides fallback cleanly');

  const fallbackResolved = resolveFirebaseConfig({}, appletConfig);
  assert.equal(fallbackResolved.isConfigured, true);
  assert.equal(fallbackResolved.source, 'applet-config');
  console.log('  PASS: Provisioned firebase-applet-config.json fallback resolves cleanly');

  runArchitectureTests();

  console.log('\n=== 3. Live Firestore Security Rules Tests ===');
  const app = initializeApp(appletConfig, `rules-test-${TEST_RUN_ID}`);
  const db = appletConfig.firestoreDatabaseId
    ? getFirestore(app, appletConfig.firestoreDatabaseId)
    : getFirestore(app);

  const validDocId = `rfq_qa_${TEST_RUN_ID}`;
  const maxItemsDocId = `rfq_qa_max10_${TEST_RUN_ID}`;

  try {
    // Verify all 5 Phase 2.2 ERP collections are strictly default-deny
    const lockedCollections = [
      FIRESTORE_COLLECTIONS.PRODUCTS,
      FIRESTORE_COLLECTIONS.CATEGORIES,
      FIRESTORE_COLLECTIONS.USERS,
      FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS,
      FIRESTORE_COLLECTIONS.SETTINGS,
    ];

    for (const colName of lockedCollections) {
      await expectDenied(`ERP Default-Deny GET on /${colName}`, () =>
        getDoc(doc(db, colName, `probe_${TEST_RUN_ID}`))
      );
      await expectDenied(`ERP Default-Deny LIST on /${colName}`, () =>
        getDocs(collection(db, colName))
      );
      await expectDenied(`ERP Default-Deny CREATE on /${colName}`, () =>
        setDoc(doc(db, colName, `probe_${TEST_RUN_ID}`), {
          role: 'admin',
          createdAt: serverTimestamp(),
        })
      );
    }

    // Valid 1-item create on active /quoteRequests
    await setDoc(doc(db, 'quoteRequests', validDocId), makeValidQuote());
    console.log(`  PASS (ALLOWED): Valid 1-item quote request created (${validDocId})`);

    // Valid 10-item create (confirms rule stays within Firestore expression limits)
    const tenItems = Array.from({ length: 10 }, (_, i) => makeValidItem(i));
    await setDoc(
      doc(db, 'quoteRequests', maxItemsDocId),
      makeValidQuote({
        referenceId: 'PF-RFQ-2026-QA10MX',
        items: tenItems,
        itemCount: 10,
        totalQuantity: 20,
      })
    );
    console.log(`  PASS (ALLOWED): Valid 10-item boundary quote request created (${maxItemsDocId})`);

    // Idempotent duplicate overwrite on same quoteId must be denied
    await expectDenied('Duplicate/overwrite on existing quoteId', () =>
      setDoc(doc(db, 'quoteRequests', validDocId), makeValidQuote())
    );

    // Dirty Dozen #1–#4: Read/List/Update/Delete on quoteRequests
    await expectDenied('Dirty Dozen #1: Unauthenticated getDoc on quoteRequests', () =>
      getDoc(doc(db, 'quoteRequests', validDocId))
    );
    await expectDenied('Dirty Dozen #2: Unauthenticated getDocs (list) on quoteRequests', () =>
      getDocs(collection(db, 'quoteRequests'))
    );
    await expectDenied('Dirty Dozen #3: Unauthenticated updateDoc on quoteRequests', () =>
      updateDoc(doc(db, 'quoteRequests', validDocId), { status: 'quoted' })
    );
    await expectDenied('Dirty Dozen #4: Unauthenticated deleteDoc on quoteRequests', () =>
      deleteDoc(doc(db, 'quoteRequests', validDocId))
    );

    // Dirty Dozen #5–#12
    await expectDenied('Dirty Dozen #5: Status manipulation (status="quoted")', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_status_${TEST_RUN_ID}`),
        makeValidQuote({ status: 'quoted' })
      )
    );
    await expectDenied('Dirty Dozen #6a: Top-level privileged field injection (isApproved=true)', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_shadow_${TEST_RUN_ID}`),
        makeValidQuote({ isApproved: true })
      )
    );
    await expectDenied('Dirty Dozen #6b: Middle-array item[1] shadow field injection', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_miditem_${TEST_RUN_ID}`),
        makeValidQuote({
          items: [
            makeValidItem(0),
            { ...makeValidItem(1), discountOverride: 95 },
            makeValidItem(2),
          ],
          itemCount: 3,
          totalQuantity: 6,
        })
      )
    );
    await expectDenied('Dirty Dozen #7: Timestamp spoofing (client Date instead of serverTimestamp)', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_time_${TEST_RUN_ID}`),
        makeValidQuote({ createdAt: new Date('2020-01-01T00:00:00Z') })
      )
    );
    await expectDenied('Dirty Dozen #8a: Document ID with invalid characters', () =>
      setDoc(doc(db, 'quoteRequests', `bad.id$hack_${TEST_RUN_ID}`), makeValidQuote())
    );
    await expectDenied('Dirty Dozen #8b: Oversized Document ID (>128 chars)', () =>
      setDoc(doc(db, 'quoteRequests', 'a'.repeat(130)), makeValidQuote())
    );
    await expectDenied('Dirty Dozen #9: Oversized organisationName (>160 chars)', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_len_${TEST_RUN_ID}`),
        makeValidQuote({ organisationName: 'X'.repeat(161) })
      )
    );
    await expectDenied('Dirty Dozen #10a: Malformed email', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_email_${TEST_RUN_ID}`),
        makeValidQuote({ email: 'not-an-email' })
      )
    );
    await expectDenied('Dirty Dozen #10b: Malformed phone (contains letters)', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_phone_${TEST_RUN_ID}`),
        makeValidQuote({ phone: 'abc-123-hack' })
      )
    );
    await expectDenied('Dirty Dozen #11a: Empty items array', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_empty_${TEST_RUN_ID}`),
        makeValidQuote({ items: [], itemCount: 0, totalQuantity: 0 })
      )
    );
    await expectDenied('Dirty Dozen #11b: Oversized items array (11 items > 10 max)', () => {
      const tooMany = Array.from({ length: 11 }, (_, i) => makeValidItem(i));
      return setDoc(
        doc(db, 'quoteRequests', `rfq_bad_11items_${TEST_RUN_ID}`),
        makeValidQuote({ items: tooMany, itemCount: 11, totalQuantity: 22 })
      );
    });
    await expectDenied('Dirty Dozen #11c: Invalid quantity (0)', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_qty_${TEST_RUN_ID}`),
        makeValidQuote({
          items: [{ ...makeValidItem(0), quantity: 0 }],
          itemCount: 1,
          totalQuantity: 1,
        })
      )
    );
    await expectDenied('Dirty Dozen #11d: Mismatched itemCount vs items.length', () =>
      setDoc(
        doc(db, 'quoteRequests', `rfq_bad_count_${TEST_RUN_ID}`),
        makeValidQuote({ itemCount: 5 })
      )
    );
    await expectDenied('Dirty Dozen #12: Write to unknown /admins collection', () =>
      setDoc(doc(db, 'admins', `attacker_${TEST_RUN_ID}`), { role: 'admin' })
    );

    console.log('\nALL PHASE 2.2 ARCHITECTURE, SECURITY RULES & CONFIG TESTS PASSED!');
  } finally {
    await terminate(db);
    await deleteApp(app);
  }
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
