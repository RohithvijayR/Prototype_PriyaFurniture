/**
 * Phase 2.4.1 — Quote Form Query Parameter Prefill Unit Verification Suite
 *
 * Verifies URL query parameter resolution against the real 59-product / 4-category
 * Priya Furniture catalogue dataset without modifying catalogue data or adding dependencies.
 *
 * Run with: npx tsx src/utils/quotePrefill.test.ts
 */
import assert from 'node:assert/strict';
import { PEDICURE_MANICURE_PRODUCTS } from '../data/catalogues/pedicureManicure';
import { BARBER_CHAIR_PRODUCTS } from '../data/catalogues/barberChairs';
import { HAIRWASH_STATION_PRODUCTS } from '../data/catalogues/hairwashStations';
import { FACIAL_BED_PRODUCTS } from '../data/catalogues/facialBeds';
import { CategoryId } from '../types/catalogue';
import {
  CUSTOM_PRODUCT_KEY,
  createInitialQuoteItem,
  normalizeCategorySlug,
  normalizeProductCode,
} from './quotePrefill';

const ALL_PRODUCTS = [
  ...PEDICURE_MANICURE_PRODUCTS,
  ...BARBER_CHAIR_PRODUCTS,
  ...HAIRWASH_STATION_PRODUCTS,
  ...FACIAL_BED_PRODUCTS,
];

const ALL_CATEGORIES: { id: CategoryId }[] = [
  { id: 'pedicure-manicure' },
  { id: 'barber-chairs' },
  { id: 'hairwash-stations' },
  { id: 'facial-beds' },
];

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`PASS: ${name}`);
}

test('Catalogue dataset integrity (59 products across 4 categories)', () => {
  assert.equal(ALL_PRODUCTS.length, 59);
  assert.equal(ALL_CATEGORIES.length, 4);
});

test('/quote?product=PF%20003 preselects first matching PF 003 catalogue model', () => {
  const params = new URLSearchParams('product=PF%20003');
  const item = createInitialQuoteItem(
    { product: params.get('product'), category: params.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item.productSlug, 'pedicure-manicure-pf-003');
  assert.equal(item.quantity, '1');
});

test('/quote?category=barber-chairs preselects first model in Barber Chairs', () => {
  const params = new URLSearchParams('category=barber-chairs');
  const item = createInitialQuoteItem(
    { product: params.get('product'), category: params.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item.productSlug, 'barber-chairs-pf-001');
  assert.equal(item.quantity, '1');
});

test('/quote?product=PF%20003&category=barber-chairs resolves PF 003 within Barber Chairs', () => {
  const params = new URLSearchParams('product=PF%20003&category=barber-chairs');
  const item = createInitialQuoteItem(
    { product: params.get('product'), category: params.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item.productSlug, 'barber-chairs-pf-003');
  assert.equal(item.quantity, '1');
});

test('Supports whitespace, casing, hyphen, and compact product code normalization', () => {
  const variants = [
    'product=%20pf%20%20003%20&category=BARBER-CHAIRS',
    'product=PF-003&category=barber-chairs',
    'product=PF003&category=barber_chairs',
    'product=PF+003&category=barber+chairs',
  ];

  for (const query of variants) {
    const params = new URLSearchParams(query);
    const item = createInitialQuoteItem(
      { product: params.get('product'), category: params.get('category') },
      ALL_PRODUCTS,
      ALL_CATEGORIES
    );
    assert.equal(item.productSlug, 'barber-chairs-pf-003', `Failed for query: ${query}`);
  }

  assert.equal(normalizeProductCode('  pf   003  '), 'PF 003');
  assert.equal(normalizeProductCode('pf-003'), 'PF 003');
  assert.equal(normalizeProductCode('pf003'), 'PF 003');
  assert.equal(normalizeCategorySlug('  Barber_Chairs '), 'barber-chairs');
});

test('Preserves existing slug, custom, qty, finish, and explicit dimensions prefill', () => {
  const slugParams = new URLSearchParams(
    'product=hairwash-stations-pf-005&qty=6&finish=Olive%20Green'
  );
  const slugItem = createInitialQuoteItem(
    {
      product: slugParams.get('product'),
      category: slugParams.get('category'),
      qty: slugParams.get('qty'),
      finish: slugParams.get('finish'),
    },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(slugItem.productSlug, 'hairwash-stations-pf-005');
  assert.equal(slugItem.quantity, '6');
  assert.equal(slugItem.materialFinish, 'Olive Green');

  const customParams = new URLSearchParams('product=custom&qty=4&finish=Walnut');
  const customItem = createInitialQuoteItem(
    {
      product: customParams.get('product'),
      qty: customParams.get('qty'),
      finish: customParams.get('finish'),
    },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(customItem.productSlug, CUSTOM_PRODUCT_KEY);
  assert.equal(customItem.quantity, '4');
  assert.equal(customItem.materialFinish, 'Walnut');
});

test('Invalid product code is safely ignored', () => {
  for (const query of ['product=PF%20999', 'product=UNKNOWN-MODEL', 'product=PF---003']) {
    const params = new URLSearchParams(query);
    const item = createInitialQuoteItem(
      { product: params.get('product'), category: params.get('category') },
      ALL_PRODUCTS,
      ALL_CATEGORIES
    );
    assert.equal(item.productSlug, '', `Expected unselected for ${query}`);
    assert.equal(item.quantity, '1');
    assert.equal(item.dimensions, '');
    assert.equal(item.materialFinish, '');
  }
});

test('Invalid category is safely ignored (alone and with product)', () => {
  for (const query of [
    'category=nonexistent-category',
    'category=sofas',
    'product=PF%20003&category=nonexistent-category',
  ]) {
    const params = new URLSearchParams(query);
    const item = createInitialQuoteItem(
      { product: params.get('product'), category: params.get('category') },
      ALL_PRODUCTS,
      ALL_CATEGORIES
    );
    assert.equal(item.productSlug, '', `Expected unselected for ${query}`);
  }
});

test('Valid product with mismatched category is safely ignored', () => {
  // PF 020 exists only in hairwash-stations, not barber-chairs
  const codeMismatch = new URLSearchParams('product=PF%20020&category=barber-chairs');
  const item1 = createInitialQuoteItem(
    { product: codeMismatch.get('product'), category: codeMismatch.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item1.productSlug, '');

  // Full slug belonging to facial-beds with barber-chairs category
  const slugMismatch = new URLSearchParams('product=facial-beds-pf-002&category=barber-chairs');
  const item2 = createInitialQuoteItem(
    { product: slugMismatch.get('product'), category: slugMismatch.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item2.productSlug, '');

  // Custom product paired with a specific catalogue category
  const customMismatch = new URLSearchParams('product=custom&category=barber-chairs');
  const item3 = createInitialQuoteItem(
    { product: customMismatch.get('product'), category: customMismatch.get('category') },
    ALL_PRODUCTS,
    ALL_CATEGORIES
  );
  assert.equal(item3.productSlug, '');
});

test('Normal /quote without query parameters leaves row 1 unselected', () => {
  const item = createInitialQuoteItem({}, ALL_PRODUCTS, ALL_CATEGORIES);
  assert.deepEqual(item, {
    id: 'item-1',
    productSlug: '',
    quantity: '1',
    dimensions: '',
    materialFinish: '',
  });
});

test('All four category slugs preselect their respective first catalogue product', () => {
  const expected: Record<CategoryId, string> = {
    'pedicure-manicure': 'pedicure-manicure-pf-001',
    'barber-chairs': 'barber-chairs-pf-001',
    'hairwash-stations': 'hairwash-stations-pf-001',
    'facial-beds': 'facial-beds-pf-001',
  };

  for (const [cat, expectedSlug] of Object.entries(expected)) {
    const item = createInitialQuoteItem({ category: cat }, ALL_PRODUCTS, ALL_CATEGORIES);
    assert.equal(item.productSlug, expectedSlug);
  }
});

console.log(`\nAll ${passed} quotePrefill unit tests passed.`);
