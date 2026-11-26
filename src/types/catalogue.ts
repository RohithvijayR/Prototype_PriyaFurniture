export type CategoryId =
  | 'pedicure-manicure'
  | 'barber-chairs'
  | 'hairwash-stations'
  | 'facial-beds';

export interface ProductImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface CatalogueCategory {
  id: CategoryId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  cataloguePdfUrl?: string;
  cataloguePdfLabel?: string;
}

export interface CatalogueProduct {
  id: string;
  slug: string;
  productCode: string;
  name: string;
  categoryId: CategoryId;
  categoryLabel: string;
  featured?: boolean;
  description: string;
  images: ProductImage[];
  features: string[];
  specifications?: ProductSpecification[];
  customisationOptions?: string[];
  availabilityStatus?: string;
  pricingLabel: string;
  /**
   * Indicative preliminary base reference rate in INR ("Starting from").
   * Not a fixed selling price; final quotation depends on customisation, quantity, and delivery.
   */
  baseReferenceRate?: number;
  sourcePdfUrl?: string;
  sourcePdfPage?: number;
}
