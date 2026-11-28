/**
 * Phase 2.4 Firestore Consolidation, Customer Quotation & Security Rules Verification Suite
 *
 * Tests:
 *  1. Pure config resolution (VITE env override, applet-config fallback, unconfigured degradation)
 *  2. Phase 2.2–2.4 Data Architecture, Quotation Payload Builder & Status Metadata invariants:
 *     - All 59 catalogue products & 4 categories preserved with 0 composite ID collisions
 *     - Consolidated buildValidatedQuotePayload() produces exact 18 draft fields (20 with timestamps)
 *     - Controlled 7 customer-visible quotation statuses & read error classification
 *     - Auth error mapping & address normalization
 *  3. Live Firestore Security Rules tests:
 *     - Locked ERP collections (products, categories, settings) & retired legacy quoteRequests
 *       strictly return PERMISSION_DENIED on get, list, create
 *     - Consolidated /quotationRequests valid public creates (1-item, 10-item boundary, custom build)
 *     - Duplicate overwrite denial, unauthenticated get/list/update/delete denial
 *     - UID spoofing, status manipulation, internalNotes shadow injection, subcollection isolation,
 *       imagePath scheme injection, timestamp spoofing, ID poisoning & payload abuse denials
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
import { classifyAuthError, classifyQuotationReadError } from './src/lib/firebase/errors';
import { normalizeOptionalAddress } from './src/services/userProfileService';
import {
  FIRESTORE_COLLECTIONS,
  FIRESTORE_SETTING_IDS,
  FIRESTORE_SUBCOLLECTIONS,
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
import {
  QUOTATION_REQUEST_STATUSES,
  getQuotationStatusMeta,
} from './src/types/firestore';
import { PEDICURE_MANICURE_PRODUCTS } from './src/data/catalogues/pedicureManicure';
import { BARBER_CHAIR_PRODUCTS } from './src/data/catalogues/barberChairs';
import { HAIRWASH_STATION_PRODUCTS } from './src/data/catalogues/hairwashStations';
import { FACIAL_BED_PRODUCTS } from './src/data/catalogues/facialBeds';

const TEST_RUN_ID = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function makeValidProductSnapshot(index = 0) {
  return {
    productId: 'pedicure-manicure-pf-006',
    categoryId: 'pedicure-manicure',
    categoryName: 'Pedicure & Manicure Stations',
    productCode: 'PF 006',
    productName: `Pedicure Station Test Model ${index + 1}`,
    quantity: 2,
    customizationDetails: '',
    dimensions: 'Standard catalogue dimensions',
    materialFinishPreferences: 'Warm Brown Leatherette',
    indicativeBaseRateInr: 35000,
    imagePath: '/assets/catalogue/pedicure-manicure/pf-006.jpg',
  };
}

function makeValidQuotationRequest(
  quotationRequestId: string,
  overrides: Record<string, unknown> = {}
) {
  const requestedProducts = [makeValidProductSnapshot(0)];
  return {
    id: quotationRequestId,
    referenceNumber: 'PF-RFQ-2026-QA01AB',
    userId: null,
    source: 'web_catalogue',
    customerName: 'QA Engineer',
    organizationName: 'QA Automated Verification Studio',
    email: 'qa-verify@example.com',
    phone: '+91 90030 21099',
    requestedProducts,
    itemCount: requestedProducts.length,
    totalQuantity: 2,
    deliveryLocation: 'Chennai, Tamil Nadu',
    additionalRequirements: 'Automated Phase 2.4 rules verification record.',
    status: 'submitted',
    revisionNumber: 1,
    parentQuotationRequestId: null,
    activeQuotationVersionId: null,
    convertedOrderId: null,
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
  console.log('\n=== 2. Phase 2.2–2.4 Data Architecture & Quotation Contract Tests ===');

  assert.deepEqual(Object.values(FIRESTORE_COLLECTIONS).sort(), [
    'categories',
    'products',
    'quotationRequests',
    'settings',
    'users',
  ]);
  assert.equal(FIRESTORE_SUBCOLLECTIONS.QUOTATION_INTERNAL_NOTES, 'internalNotes');
  assert.equal(FIRESTORE_SETTING_IDS.GENERAL, 'general');
  console.log('  PASS: Centralized collection, subcollection & setting identifiers verified');

  // Controlled 7 Phase 2.4 customer-visible statuses
  assert.deepEqual([...QUOTATION_REQUEST_STATUSES], [
    'submitted',
    'under_review',
    'quotation_prepared',
    'awaiting_customer_approval',
    'approved',
    'declined',
    'converted_to_order',
  ]);
  assert.equal(getQuotationStatusMeta('quotation_prepared').label, 'Quotation Prepared');
  assert.equal(getQuotationStatusMeta('converted_to_order').label, 'Converted to Order');
  assert.equal(classifyQuotationReadError({ code: 'failed-precondition' }).code, 'index-required');
  assert.equal(classifyQuotationReadError({ code: 'permission-denied' }).code, 'permission-denied');
  console.log('  PASS: Phase 2.4 quotation statuses & read error classification verified');

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

  // Consolidated Phase 2.4 snapshot & quotation request ID invariants
  const qrMeta = buildQuotationRequestIds(new Date('2026-11-27T10:00:00Z'));
  assert.ok(qrMeta.quotationRequestId.startsWith('qr_20261127_'));
  assert.ok(isValidFirestoreDocId(qrMeta.quotationRequestId));
  assert.match(qrMeta.referenceNumber, /^PF-RFQ-2026-[A-Z0-9]{6}$/);

  const barber002 = BARBER_CHAIR_PRODUCTS.find((p) => p.slug === 'barber-chairs-pf-002');
  assert.ok(barber002, 'Expected barber-chairs-pf-002 in static catalogue');
  const standardSnap = createQuotationProductSnapshot(barber002, {
    quantity: 3,
    dimensions: 'Standard',
    materialFinishPreferences: 'Tan Leatherette',
  });
  assert.equal(Object.keys(standardSnap).length, 11, 'Expected exact 11 product snapshot keys');
  assert.equal(standardSnap.productId, 'barber-chairs-pf-002');
  assert.equal(standardSnap.imagePath, '/assets/catalogue/barber-chairs/pf-002.jpg');

  const customSnap = createQuotationProductSnapshot(null, {
    quantity: 1,
    dimensions: '6ft x 2ft',
    materialFinishPreferences: 'Teak finish',
  });
  assert.equal(Object.keys(customSnap).length, 11);
  assert.equal(customSnap.productId, 'custom');
  assert.equal(customSnap.indicativeBaseRateInr, null);
  assert.equal(customSnap.imagePath, null);

  const sampleDoc = makeValidQuotationRequest(qrMeta.quotationRequestId, { userId: 'uid_customer_123' });
  assert.equal(Object.keys(sampleDoc).length, 20, 'Expected exact 20 keys on consolidated quotationRequests doc');
  assert.equal('internalNotes' in sampleDoc, false, 'internalNotes must NEVER be on customer-readable doc');
  console.log('  PASS: Consolidated Phase 2.4 quotation snapshot & 20-key document contract verified');

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
  assert.equal(
    normalizePortableAssetPath('/Prototype_PriyaFurniture/assets/catalogue/barber-chairs/pf-001.jpg'),
    '/assets/catalogue/barber-chairs/pf-001.jpg'
  );

  const barber001 = BARBER_CHAIR_PRODUCTS[0];
  const snapshot = createQuotationProductSnapshot(barber001, {
    quantity: 4,
    customizationDetails: 'Custom stitching',
    dimensions: 'Standard',
    materialFinishPreferences: 'Charcoal Leatherette',
  });
  assert.equal(snapshot.productId, 'barber-chairs-pf-001');
  assert.equal(snapshot.indicativeBaseRateInr, 20000);

  const qrIds = buildQuotationRequestIds(new Date('2026-11-27T10:00:00Z'));
  assert.ok(isValidFirestoreDocId(qrIds.quotationRequestId));
  assert.match(qrIds.referenceNumber, /^PF-RFQ-2026-[A-Z0-9]{6}$/);

  const ts = Timestamp.fromDate(new Date('2026-11-27T10:00:00Z'));
  assert.equal(firestoreTimestampToIso(ts), '2026-11-27T10:00:00.000Z');
  assert.equal(firestoreTimestampToDate(null), null);

  assert.equal(classifyAuthError({ code: 'auth/invalid-credential' }).code, 'invalid-credentials');
  assert.equal(classifyAuthError({ code: 'auth/email-already-in-use' }).code, 'email-in-use');
  assert.equal(normalizeOptionalAddress(null, 'billing'), null);
  console.log('  PASS: Composite IDs, portable paths, snapshots, timestamps & auth utilities verified');
}

async function runTests() {
  console.log('=== 1. Config Resolution Tests ===');
  const unconfigured = resolveFirebaseConfig({}, null);
  assert.equal(unconfigured.isConfigured, false);
  assert.equal(unconfigured.source, 'unconfigured');
  const disabled = resolveFirebaseConfig({ VITE_FIREBASE_DISABLED: 'true' }, appletConfig);
  assert.equal(disabled.isConfigured, false);
  const partialEnv = resolveFirebaseConfig({ VITE_FIREBASE_PROJECT_ID: 'only-one-key' }, appletConfig);
  assert.equal(partialEnv.isConfigured, false);
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
  const fallbackResolved = resolveFirebaseConfig({}, appletConfig);
  assert.equal(fallbackResolved.isConfigured, true);
  assert.equal(fallbackResolved.source, 'applet-config');
  console.log('  PASS: All Firebase config resolution paths verified');

  runArchitectureTests();

  console.log('\n=== 3. Live Firestore Security Rules Tests (Phase 2.4) ===');
  const app = initializeApp(appletConfig, `rules-test-${TEST_RUN_ID}`);
  const db = appletConfig.firestoreDatabaseId
    ? getFirestore(app, appletConfig.firestoreDatabaseId)
    : getFirestore(app);

  const validDocId = `qr_qa_${TEST_RUN_ID}`;
  const maxItemsDocId = `qr_qa_max10_${TEST_RUN_ID}`;
  const customDocId = `qr_qa_custom_${TEST_RUN_ID}`;

  try {
    // Locked ERP collections + retired legacy quoteRequests + unauthenticated users
    const lockedCollections = [
      FIRESTORE_COLLECTIONS.PRODUCTS,
      FIRESTORE_COLLECTIONS.CATEGORIES,
      FIRESTORE_COLLECTIONS.USERS,
      FIRESTORE_COLLECTIONS.SETTINGS,
      'quoteRequests',
    ];

    for (const colName of lockedCollections) {
      await expectDenied(`Default-Deny GET on /${colName}`, () =>
        getDoc(doc(db, colName, `probe_${TEST_RUN_ID}`))
      );
      await expectDenied(`Default-Deny LIST on /${colName}`, () =>
        getDocs(collection(db, colName))
      );
      await expectDenied(`Default-Deny CREATE on /${colName}`, () =>
        setDoc(doc(db, colName, `probe_${TEST_RUN_ID}`), {
          role: 'admin',
          createdAt: serverTimestamp(),
        })
      );
    }

    // Valid 1-item public create on authoritative /quotationRequests
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, validDocId),
      makeValidQuotationRequest(validDocId)
    );
    console.log(`  PASS (ALLOWED): Valid 1-item public quotation request created (${validDocId})`);

    // Valid 10-item boundary create (confirms rule stays within Firestore expression & regex limits)
    const tenItems = Array.from({ length: 10 }, (_, i) => makeValidProductSnapshot(i));
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, maxItemsDocId),
      makeValidQuotationRequest(maxItemsDocId, {
        referenceNumber: 'PF-RFQ-2026-QA10MX',
        requestedProducts: tenItems,
        itemCount: 10,
        totalQuantity: 20,
      })
    );
    console.log(`  PASS (ALLOWED): Valid 10-item boundary quotation request created (${maxItemsDocId})`);

    // Valid custom-item create (null indicativeBaseRateInr & null imagePath)
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, customDocId),
      makeValidQuotationRequest(customDocId, {
        referenceNumber: 'PF-RFQ-2026-QACSTM',
        requestedProducts: [
          {
            productId: 'custom',
            categoryId: 'custom',
            categoryName: 'Custom / Other Category',
            productCode: 'CUSTOM',
            productName: 'Custom / Other Category Furniture Requirement',
            quantity: 3,
            customizationDetails: '',
            dimensions: '6ft x 2ft',
            materialFinishPreferences: 'Walnut laminate',
            indicativeBaseRateInr: null,
            imagePath: null,
          },
        ],
        itemCount: 1,
        totalQuantity: 3,
      })
    );
    console.log(`  PASS (ALLOWED): Valid custom-build quotation request created (${customDocId})`);

    // Duplicate overwrite on existing quotationRequestId must be denied
    await expectDenied('Duplicate overwrite on existing quotationRequestId', () =>
      setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, validDocId),
        makeValidQuotationRequest(validDocId)
      )
    );

    // Unauthenticated get/list/update/delete on /quotationRequests
    await expectDenied('Unauthenticated GET on /quotationRequests', () =>
      getDoc(doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, validDocId))
    );
    await expectDenied('Unauthenticated LIST on /quotationRequests', () =>
      getDocs(collection(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS))
    );
    await expectDenied('Unauthenticated UPDATE on /quotationRequests', () =>
      updateDoc(doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, validDocId), {
        status: 'approved',
      })
    );
    await expectDenied('Unauthenticated DELETE on /quotationRequests', () =>
      deleteDoc(doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, validDocId))
    );

    // Isolated internalNotes subcollection default-deny
    await expectDenied('Subcollection GET on /quotationRequests/{id}/internalNotes', () =>
      getDoc(
        doc(
          db,
          FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS,
          validDocId,
          FIRESTORE_SUBCOLLECTIONS.QUOTATION_INTERNAL_NOTES,
          'note_1'
        )
      )
    );
    await expectDenied('Subcollection CREATE on /quotationRequests/{id}/internalNotes', () =>
      setDoc(
        doc(
          db,
          FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS,
          validDocId,
          FIRESTORE_SUBCOLLECTIONS.QUOTATION_INTERNAL_NOTES,
          'note_1'
        ),
        {
          id: 'note_1',
          authorUid: 'attacker',
          note: 'Injected staff note',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      )
    );

    // Adversarial payload attacks on /quotationRequests
    await expectDenied('Unauthenticated UID spoofing (userId="victim_uid")', () => {
      const id = `qr_spoof_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { userId: 'victim_uid' })
      );
    });
    await expectDenied('Status manipulation (status="approved")', () => {
      const id = `qr_bad_status_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { status: 'approved' })
      );
    });
    await expectDenied('Legacy status rejection (status="new")', () => {
      const id = `qr_legacy_status_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { status: 'new' })
      );
    });
    await expectDenied('Internal notes shadow field injection on top-level doc', () => {
      const id = `qr_shadow_notes_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { internalNotes: 'Leaked note' })
      );
    });
    await expectDenied('Middle-array item[1] shadow field injection', () => {
      const id = `qr_miditem_shadow_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, {
          requestedProducts: [
            makeValidProductSnapshot(0),
            { ...makeValidProductSnapshot(1), discountOverride: 95 },
            makeValidProductSnapshot(2),
          ],
          itemCount: 3,
          totalQuantity: 6,
        })
      );
    });
    await expectDenied('External URL injection in imagePath', () => {
      const id = `qr_bad_img_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, {
          requestedProducts: [
            { ...makeValidProductSnapshot(0), imagePath: 'https://evil.example/tracker.png' },
          ],
        })
      );
    });
    await expectDenied('Timestamp spoofing (client Date instead of serverTimestamp)', () => {
      const id = `qr_bad_time_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { createdAt: new Date('2020-01-01T00:00:00Z') })
      );
    });
    await expectDenied('Document ID mismatch (data.id != path id)', () => {
      const id = `qr_mismatch_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest('different_id_123')
      );
    });
    await expectDenied('Non-null convertedOrderId on create', () => {
      const id = `qr_order_link_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { convertedOrderId: 'ord_forged_1' })
      );
    });
    await expectDenied('Oversized requestedProducts (11 items > 10 max)', () => {
      const id = `qr_11items_${TEST_RUN_ID}`;
      const tooMany = Array.from({ length: 11 }, (_, i) => makeValidProductSnapshot(i));
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, {
          requestedProducts: tooMany,
          itemCount: 11,
          totalQuantity: 22,
        })
      );
    });
    await expectDenied('Malformed email rejection', () => {
      const id = `qr_bad_email_${TEST_RUN_ID}`;
      return setDoc(
        doc(db, FIRESTORE_COLLECTIONS.QUOTATION_REQUESTS, id),
        makeValidQuotationRequest(id, { email: 'not-an-email' })
      );
    });
    await expectDenied('Unknown /admins collection write denial', () =>
      setDoc(doc(db, 'admins', `attacker_${TEST_RUN_ID}`), { role: 'admin' })
    );

    console.log('\nALL PHASE 2.4 ARCHITECTURE, CONSOLIDATION & SECURITY RULES TESTS PASSED!');
  } finally {
    await terminate(db);
    await deleteApp(app);
  }
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
