import type { CatalogueCategory, CatalogueProduct } from '../../types/catalogue';
import type {
  FirestoreCategoryDraft,
  FirestoreProductDraft,
  FirestoreQuotationProductSnapshot,
} from '../../types/firestore';
import { buildCategoryDocId, buildProductDocId } from './collections';

/**
 * Strips any deployment subpath prefix (e.g. `/Prototype_PriyaFurniture`) from
 * resolved static asset URLs so Firestore documents always store portable,
 * deployment-independent paths (e.g. `/assets/catalogue/barber-chairs/pf-001.jpg`).
 */
export function normalizePortableAssetPath(assetUrl: string): string {
  const trimmed = assetUrl.trim();
  if (!trimmed) return '';
  if (/^(?:https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const assetsIdx = trimmed.indexOf('/assets/');
  if (assetsIdx !== -1) {
    return trimmed.slice(assetsIdx);
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Pure adapter: maps an existing static `CatalogueProduct` into the typed
 * `FirestoreProductDraft` structure without mutating or migrating catalogue data.
 *
 * - Enforces composite identity (`categoryId + productCode`).
 * - Preserves `indicativeBaseRateInr` explicitly as an indicative starting reference,
 *   never as a fixed selling price.
 */
export function mapCatalogueProductToFirestoreDraft(
  product: CatalogueProduct
): FirestoreProductDraft {
  const compositeId = buildProductDocId(product.categoryId, product.productCode);
  const normalizedImages = product.images.map((image) => ({
    ...image,
    url: normalizePortableAssetPath(image.url),
  }));

  const primaryPaths = normalizedImages.length > 0 ? [normalizedImages[0].url] : [];
  const additionalPaths = normalizedImages.slice(1).map((image) => image.url);

  const indicativeBaseRateInr =
    typeof product.baseReferenceRate === 'number' &&
    Number.isFinite(product.baseReferenceRate) &&
    product.baseReferenceRate >= 0
      ? Math.round(product.baseReferenceRate)
      : null;

  const customizationOptions = product.customisationOptions ?? [];

  return {
    id: compositeId,
    slug: product.slug,
    productCode: product.productCode.trim().toUpperCase(),
    categoryId: product.categoryId,
    categoryLabel: product.categoryLabel,
    name: product.name,
    description: product.description,
    features: [...product.features],
    specifications: (product.specifications ?? []).map((spec) => ({ ...spec })),
    imagePaths: primaryPaths,
    additionalImagePaths: additionalPaths,
    imageMetadata: normalizedImages,
    indicativeBaseRateInr,
    pricingMode: indicativeBaseRateInr !== null ? 'indicative_starting_from' : 'quote_only',
    isCustomizable: customizationOptions.length > 0,
    customizationOptions: [...customizationOptions],
    isActive: product.availabilityStatus?.toLowerCase() !== 'inactive',
    featured: Boolean(product.featured),
    ...(product.sourcePdfUrl
      ? { sourcePdfPath: normalizePortableAssetPath(product.sourcePdfUrl) }
      : {}),
    ...(typeof product.sourcePdfPage === 'number'
      ? { sourcePdfPage: product.sourcePdfPage }
      : {}),
  };
}

/**
 * Pure adapter: maps an existing static `CatalogueCategory` into the typed
 * `FirestoreCategoryDraft` structure without mutating or migrating catalogue data.
 */
export function mapCatalogueCategoryToFirestoreDraft(
  category: CatalogueCategory,
  displayOrder: number
): FirestoreCategoryDraft {
  const docId = buildCategoryDocId(category.id);

  return {
    id: docId,
    name: category.name,
    slug: docId,
    description: category.description,
    displayOrder,
    isActive: true,
    shortName: category.shortName,
    tagline: category.tagline,
    coverImagePath: normalizePortableAssetPath(category.image),
    ...(category.cataloguePdfUrl
      ? { cataloguePdfPath: normalizePortableAssetPath(category.cataloguePdfUrl) }
      : {}),
    ...(category.cataloguePdfLabel ? { cataloguePdfLabel: category.cataloguePdfLabel } : {}),
  };
}

export interface QuotationSnapshotOptions {
  quantity: number;
  customizationDetails?: string;
  dimensions?: string;
  materialFinishPreferences?: string;
}

/**
 * Pure adapter: constructs a point-in-time `FirestoreQuotationProductSnapshot`
 * from a catalogue product (or a custom furniture build when `product` is `null`).
 * Preserves product code, category, name, image path, and indicative starting rate
 * at submission time so historical quotations remain accurate if the catalogue changes.
 */
export function createQuotationProductSnapshot(
  product: CatalogueProduct | null,
  options: QuotationSnapshotOptions
): FirestoreQuotationProductSnapshot {
  const quantity = Math.max(1, Math.floor(options.quantity));
  const customizationDetails = (options.customizationDetails ?? '').trim();
  const dimensions = (options.dimensions ?? '').trim();
  const materialFinishPreferences = (options.materialFinishPreferences ?? '').trim();

  if (!product) {
    return {
      productId: 'custom',
      categoryId: 'custom',
      categoryName: 'Custom / Other Category',
      productCode: 'CUSTOM',
      productName: 'Custom / Other Category Furniture Requirement',
      quantity,
      customizationDetails,
      dimensions,
      materialFinishPreferences,
      indicativeBaseRateInr: null,
      imagePath: null,
    };
  }

  const primaryImagePath = product.images[0]?.url
    ? normalizePortableAssetPath(product.images[0].url)
    : null;

  return {
    productId: buildProductDocId(product.categoryId, product.productCode),
    categoryId: product.categoryId,
    categoryName: product.categoryLabel,
    productCode: product.productCode.trim().toUpperCase(),
    productName: product.name,
    quantity,
    customizationDetails,
    dimensions,
    materialFinishPreferences,
    indicativeBaseRateInr:
      typeof product.baseReferenceRate === 'number' &&
      Number.isFinite(product.baseReferenceRate) &&
      product.baseReferenceRate >= 0
        ? Math.round(product.baseReferenceRate)
        : null,
    imagePath: primaryImagePath,
  };
}
