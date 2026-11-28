import { CatalogueCategory, CatalogueProduct } from '../types/catalogue';
import { QUOTE_LIMITS, QuoteItemDraftInput } from '../types/quote';

export const CUSTOM_PRODUCT_KEY = 'custom';

export interface QuotePrefillQuery {
  product?: string | null;
  category?: string | null;
  qty?: string | null;
  finish?: string | null;
}

export function extractExplicitDimensions(product: CatalogueProduct | undefined): string {
  if (!product?.specifications) return '';
  const dimEntries = product.specifications.filter((spec) =>
    /height|length|width|depth|dimension/i.test(spec.label)
  );
  if (dimEntries.length === 0) return '';
  return dimEntries.map((entry) => `${entry.label}: ${entry.value}`).join(' · ');
}

export function normalizeCategorySlug(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

export function normalizeProductCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!collapsed) return null;

  // Accept single-hyphen variants such as "PF-003" as "PF 003"
  if (/^[A-Z]+-\d+[A-Z0-9]*$/.test(collapsed)) {
    return collapsed.replace('-', ' ');
  }

  // Accept compact variants without space such as "PF003" as "PF 003"
  if (/^[A-Z]+\d+[A-Z0-9]*$/.test(collapsed)) {
    return collapsed.replace(/^([A-Z]+)(\d+[A-Z0-9]*)$/, '$1 $2');
  }

  return collapsed;
}

function findCategoryByQuery(
  rawCategory: string,
  categories: readonly Pick<CatalogueCategory, 'id'>[]
): Pick<CatalogueCategory, 'id'> | undefined {
  const normalized = normalizeCategorySlug(rawCategory);
  if (!normalized) return undefined;
  return categories.find((category) => category.id.toLowerCase() === normalized);
}

function findProductInPool(
  rawProduct: string,
  products: readonly CatalogueProduct[]
): CatalogueProduct | undefined {
  const trimmed = rawProduct.trim();
  if (!trimmed) return undefined;

  const normalizedSlugOrId = trimmed.toLowerCase();
  const bySlugOrId = products.find(
    (product) =>
      product.slug.toLowerCase() === normalizedSlugOrId ||
      product.id.toLowerCase() === normalizedSlugOrId
  );
  if (bySlugOrId) return bySlugOrId;

  const normalizedCode = normalizeProductCode(trimmed);
  if (!normalizedCode) return undefined;

  return products.find(
    (product) =>
      product.productCode.trim().toUpperCase().replace(/\s+/g, ' ') === normalizedCode
  );
}

function sanitizeQuantityParam(qtyParam: string | null | undefined): string {
  if (!qtyParam) return '1';
  const trimmed = qtyParam.trim();
  if (!/^\d+$/.test(trimmed)) return '1';
  const parsed = Number.parseInt(trimmed, 10);
  if (
    Number.isNaN(parsed) ||
    parsed < QUOTE_LIMITS.MIN_QUANTITY ||
    parsed > QUOTE_LIMITS.MAX_QUANTITY
  ) {
    return '1';
  }
  return String(parsed);
}

function sanitizeFinishParam(finishParam: string | null | undefined): string {
  if (!finishParam) return '';
  return finishParam.trim().slice(0, QUOTE_LIMITS.MATERIAL_FINISH_MAX);
}

/**
 * Resolves initial first-row quotation item state from URL query parameters
 * (`product`, `category`, `qty`, `finish`) against the real catalogue dataset.
 *
 * Resolution rules:
 * - Both `category` and `product`: validate `category` first, then resolve `product`
 *   strictly within that category (supporting slug, id, and normalized productCode).
 *   Invalid or mismatched combinations are safely ignored (unselected row).
 * - Only `category`: validate `category` and preselect the first model in that category.
 * - Only `product`: support `custom`, exact/case-insensitive slug/id, or normalized
 *   productCode (resolving deterministically in catalogue order when codes repeat).
 * - Invalid, unknown, or empty parameters safely return an unselected default row.
 */
export function createInitialQuoteItem(
  query: QuotePrefillQuery,
  products: readonly CatalogueProduct[],
  categories: readonly Pick<CatalogueCategory, 'id'>[]
): QuoteItemDraftInput {
  const emptyItem: QuoteItemDraftInput = {
    id: 'item-1',
    productSlug: '',
    quantity: '1',
    dimensions: '',
    materialFinish: '',
  };

  const rawProduct = query.product?.trim() ?? '';
  const rawCategory = query.category?.trim() ?? '';
  const hasProduct = rawProduct.length > 0;
  const hasCategory = rawCategory.length > 0;

  if (!hasProduct && !hasCategory) {
    return emptyItem;
  }

  const quantity = sanitizeQuantityParam(query.qty);
  const materialFinish = sanitizeFinishParam(query.finish);

  if (hasCategory) {
    const matchedCategory = findCategoryByQuery(rawCategory, categories);
    if (!matchedCategory) {
      return emptyItem;
    }

    const categoryProducts = products.filter(
      (product) => product.categoryId === matchedCategory.id
    );
    if (categoryProducts.length === 0) {
      return emptyItem;
    }

    if (hasProduct) {
      if (rawProduct.toLowerCase() === CUSTOM_PRODUCT_KEY) {
        return emptyItem;
      }

      const matchedInCategory = findProductInPool(rawProduct, categoryProducts);
      if (!matchedInCategory) {
        return emptyItem;
      }

      return {
        id: 'item-1',
        productSlug: matchedInCategory.slug,
        quantity,
        dimensions: extractExplicitDimensions(matchedInCategory),
        materialFinish,
      };
    }

    const firstCategoryProduct = categoryProducts[0];
    return {
      id: 'item-1',
      productSlug: firstCategoryProduct.slug,
      quantity,
      dimensions: extractExplicitDimensions(firstCategoryProduct),
      materialFinish,
    };
  }

  if (rawProduct.toLowerCase() === CUSTOM_PRODUCT_KEY) {
    return {
      id: 'item-1',
      productSlug: CUSTOM_PRODUCT_KEY,
      quantity,
      dimensions: '',
      materialFinish,
    };
  }

  const matchedProduct = findProductInPool(rawProduct, products);
  if (!matchedProduct) {
    return emptyItem;
  }

  return {
    id: 'item-1',
    productSlug: matchedProduct.slug,
    quantity,
    dimensions: extractExplicitDimensions(matchedProduct),
    materialFinish,
  };
}
