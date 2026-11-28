import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Search, X, ArrowRight, FileText } from 'lucide-react';
import {
  CATEGORIES,
  CategoryId,
  PRODUCTS,
  getProductsByCategory,
} from '../data/catalogue';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { EDITORIAL_EASE, Reveal } from '../components/MotionPrimitives';

type FilterValue = 'all' | CategoryId;

const VALID_CATEGORIES: FilterValue[] = ['all', ...CATEGORIES.map((c) => c.id)];

export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const initialCategoryParam = searchParams.get('category') as FilterValue | null;
  const initialCategory: FilterValue =
    initialCategoryParam && VALID_CATEGORIES.includes(initialCategoryParam)
      ? initialCategoryParam
      : 'all';

  const [selectedCategory, setSelectedCategory] = useState<FilterValue>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const param = searchParams.get('category') as FilterValue | null;
    if (param && VALID_CATEGORIES.includes(param)) {
      setSelectedCategory(param);
    } else if (!param) {
      setSelectedCategory('all');
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const triggerFilterSkeleton = () => {
    if (prefersReducedMotion) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsTransitioning(true);
    timerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 200);
  };

  const handleCategoryChange = (cat: FilterValue) => {
    if (cat === selectedCategory) return;
    triggerFilterSkeleton();
    setSelectedCategory(cat);
    if (cat === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category: cat }, { replace: true });
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' || product.categoryId === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const inFeatures = product.features.some((f) => f.toLowerCase().includes(q));
      const inSpecs =
        product.specifications?.some(
          (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
        ) ?? false;
      return (
        product.productCode.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        product.categoryLabel.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        inFeatures ||
        inSpecs
      );
    });
  }, [selectedCategory, searchQuery]);

  const activeCategoryMeta =
    selectedCategory === 'all'
      ? null
      : CATEGORIES.find((c) => c.id === selectedCategory) ?? null;

  const resetFilters = () => {
    setSearchQuery('');
    handleCategoryChange('all');
  };

  const filterTabs: Array<{ id: FilterValue; label: string; count: number }> = [
    { id: 'all', label: 'All Collections', count: PRODUCTS.length },
    ...CATEGORIES.map((c) => ({
      id: c.id,
      label: c.shortName,
      count: getProductsByCategory(c.id).length,
    })),
  ];

  return (
    <main className="bg-white min-h-[80vh]">
      {/* Editorial Page Header with space for Floating Liquid Glass Navbar */}
      <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-14 lg:pb-18">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-medium text-[#9B4D17] mb-2">Official Product Catalogue</p>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#202735] leading-tight mb-4">
                {activeCategoryMeta
                  ? activeCategoryMeta.name
                  : 'Priya Furniture Product Catalogue'}
              </h1>
              <p className="text-base text-[#586070] leading-relaxed">
                {activeCategoryMeta
                  ? activeCategoryMeta.description
                  : 'Browse our published product catalogues with official model codes, photographs, and specifications. All models are available via direct quotation with color customisation.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto shrink-0">
              {activeCategoryMeta?.cataloguePdfUrl && (
                <a
                  href={activeCategoryMeta.cataloguePdfUrl}
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-[#9B4D17]" aria-hidden="true" />
                  <span>Download PDF</span>
                </a>
              )}
              <Link
                to="/quote"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_8px_22px_-6px_rgba(155,77,23,0.45)] whitespace-nowrap"
              >
                <span>Request a Quote</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Category Filter Controls */}
      <section className="border-b border-[#EAE1D3] bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Interactive Category Filter Segmented Controls */}
            <div
              role="group"
              aria-label="Filter catalogue by product category"
              className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-[#F5F0E8] border border-[#D9CBB8]/60 self-start"
            >
              {filterTabs.map((tab) => {
                const isActive = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleCategoryChange(tab.id)}
                    aria-pressed={isActive}
                    className={`relative px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                      isActive ? 'text-white' : 'text-[#202735]/80 hover:text-[#202735]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="catalogue-active-filter"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0.01 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                        className="absolute inset-0 rounded-full bg-[#202735] shadow-sm"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <span>{tab.label}</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-[#D9CBB8]' : 'text-[#586070]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-80 shrink-0">
              <Search
                className="w-4 h-4 text-[#586070] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PF code, model, or feature..."
                aria-label="Search furniture catalogue"
                className="w-full pl-11 pr-10 py-2.5 text-sm rounded-full bg-[#FAF8F4] border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/70 focus:bg-white focus:border-[#202735] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#586070] hover:text-[#202735] hover:bg-[#EAE1D3]/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#586070]">
            <p className="tabular-nums">
              Showing {filteredProducts.length} of {PRODUCTS.length} catalogue models
              {activeCategoryMeta ? ` in ${activeCategoryMeta.name}` : ''}
              {searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}
            </p>
            <p>Indicative starting rates shown · Final pricing confirmed via quotation</p>
          </div>
        </div>
      </section>

      {/* Product Grid with Subtle Skeleton Loading State */}
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {isTransitioning ? (
            <div
              aria-busy="true"
              aria-label="Loading filtered catalogue products"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.34,
                    delay: Math.min(idx * 0.03, 0.22),
                    ease: EDITORIAL_EASE,
                  }}
                >
                  <ProductCard product={product} imageLoading={idx < 6 ? 'eager' : 'lazy'} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Reveal className="max-w-lg mx-auto text-center py-16 px-8 bg-[#F5F0E8] border border-[#D9CBB8] rounded-3xl">
              <h2 className="font-display text-2xl font-medium text-[#202735] mb-2">
                No matching catalogue models found
              </h2>
              <p className="text-sm text-[#586070] leading-relaxed mb-7">
                Try searching by a product code such as PF 001, adjusting the category filter,
                or requesting a custom furniture quotation directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-6 py-2.5 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
                <Link
                  to="/quote?product=custom"
                  className="px-6 py-2.5 text-sm font-medium rounded-full border border-[#202735] text-[#202735] hover:bg-[#202735] hover:text-white transition-colors"
                >
                  Request Custom Build
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Bottom Bespoke Strip */}
      <section className="bg-[#F5F0E8] border-t border-[#D9CBB8]/80 py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#202735] mb-2">
              Looking for Office, Hospital, School, or Custom Furniture?
            </h2>
            <p className="text-sm text-[#586070] leading-relaxed">
              Additional category catalogues are added continuously. Share your project brief,
              quantities, or custom colour preferences and our team will prepare a tailored
              factory quotation.
            </p>
          </div>
          <Link
            to="/quote"
            className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors whitespace-nowrap shrink-0"
          >
            <span>Start Project Quote</span>
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </main>
  );
}
