import { CatalogueCategory, CatalogueProduct, CategoryId } from '../types/catalogue';
import { PEDICURE_MANICURE_PRODUCTS } from './catalogues/pedicureManicure';
import { BARBER_CHAIR_PRODUCTS } from './catalogues/barberChairs';
import { HAIRWASH_STATION_PRODUCTS } from './catalogues/hairwashStations';
import { FACIAL_BED_PRODUCTS } from './catalogues/facialBeds';

export type { CategoryId, CatalogueCategory, CatalogueProduct } from '../types/catalogue';

export const BRAND_MEDIA = {
  heroEditorial: '/src/assets/images/hero_architectural_office_1795610773375.jpg',
  studioWorkshop: '/src/assets/images/craft_custom_workshop_1795610786970.jpg',
} as const;

export const CATALOGUE_CONTACT = {
  mobile: '+91 90030 21099',
  emailPlaceholder: 'quotes@priyafurniture.example',
  addressLine1: '[Manufacturing Facility & Showroom Address Placeholder]',
  addressLine2: '[Industrial Estate, City, State — Postal Code]',
  hours: 'Mon – Sat, 9:00 AM – 6:00 PM (By Appointment)',
} as const;

/**
 * Modular Category Registry.
 * Add new category entries and product modules here as additional
 * Priya Furniture PDF catalogues (offices, hospitals, schools, etc.) are supplied.
 */
export const CATEGORIES: CatalogueCategory[] = [
  {
    id: 'pedicure-manicure',
    name: 'Pedicure & Manicure Stations',
    shortName: 'Pedicure & Manicure',
    tagline: 'Integrated bowls, retractable tubs & quilted spa seating',
    description:
      'Space-saving salon chairs and complete manicure-pedicure stations with diamond-quilted cushioning, built-in soaking bowls, and retractable foot tubs.',
    image: '/assets/catalogue/pedicure-manicure/pf-008.jpg',
    imageAlt: 'Priya Furniture PF 008 diamond-stitched pedicure and manicure station with slide-out foot tub',
    cataloguePdfUrl: '/assets/aistudio/print_pedicure_and_manicure_2e9fbfcc.pdf',
    cataloguePdfLabel: 'Pedicure & Manicure Catalogue (PDF)',
  },
  {
    id: 'barber-chairs',
    name: 'Barber Chairs',
    shortName: 'Barber Chairs',
    tagline: 'Reclining hydraulic styling & heavy-duty barber chairs',
    description:
      'Multipurpose unisex styling chairs and heavy-duty barber chairs featuring hydraulic pumps, stainless steel or MS footrests, and 45–55 degree recline mechanisms.',
    image: '/assets/catalogue/barber-chairs/pf-008.jpg',
    imageAlt: 'Priya Furniture PF 008 classic barber chair with chrome accents and reversible padded footrest',
    cataloguePdfUrl: '/assets/aistudio/bbarber_chairss_8ab8461c.pdf',
    cataloguePdfLabel: 'Barber Chairs Catalogue (PDF)',
  },
  {
    id: 'hairwash-stations',
    name: 'Hairwash Stations',
    shortName: 'Hairwash Stations',
    tagline: 'Shampoo lounges, ceramic basins & 3-in-1 salon stations',
    description:
      'Cushioned hairwash chairs, full lie-down shampoo beds, and multi-service 3-in-1 stations fitted with ceramic basins, neck rests, and matching footrests.',
    image: '/assets/catalogue/hairwash-stations/pf-005.jpg',
    imageAlt: 'Priya Furniture PF 005 two-tone button-tufted hairwash station with ceramic basin and footrest',
    cataloguePdfUrl: '/assets/aistudio/print_hairwash_941de146.pdf',
    cataloguePdfLabel: 'Hairwash Station Catalogue (PDF)',
  },
  {
    id: 'facial-beds',
    name: 'Facial Beds',
    shortName: 'Facial Beds',
    tagline: 'Wood-cabinet, solid-wood, chrome-leg & foldable treatment beds',
    description:
      'Fixed-leg, reclining, foldable, and enclosed wood-cabinet facial treatment beds engineered for stability, organized storage, and client relaxation.',
    image: '/assets/catalogue/facial-beds/pf-005.jpg',
    imageAlt: 'Priya Furniture PF 005 solid wood facial bed with reclining backrest and under-bed cabinet storage',
    cataloguePdfUrl: '/assets/aistudio/print_facial_bed_069f3eb0.pdf',
    cataloguePdfLabel: 'Facial Bed Catalogue (PDF)',
  },
];

export const PRODUCTS: CatalogueProduct[] = [
  ...PEDICURE_MANICURE_PRODUCTS,
  ...BARBER_CHAIR_PRODUCTS,
  ...HAIRWASH_STATION_PRODUCTS,
  ...FACIAL_BED_PRODUCTS,
];

export function getCategoryById(id: string): CatalogueCategory | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function getProductsByCategory(categoryId: CategoryId): CatalogueProduct[] {
  return PRODUCTS.filter((product) => product.categoryId === categoryId);
}

export function getProductBySlug(slug: string): CatalogueProduct | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function getRelatedProducts(product: CatalogueProduct, limit = 3): CatalogueProduct[] {
  const sameCategory = PRODUCTS.filter(
    (candidate) => candidate.categoryId === product.categoryId && candidate.id !== product.id
  );
  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }
  const others = PRODUCTS.filter(
    (candidate) => candidate.categoryId !== product.categoryId && candidate.id !== product.id
  );
  return [...sameCategory, ...others].slice(0, limit);
}
