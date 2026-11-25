import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Minus,
  Plus,
} from 'lucide-react';
import { getProductBySlug, getRelatedProducts } from '../data/catalogue';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { EDITORIAL_EASE, Reveal } from '../components/MotionPrimitives';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const product = slug ? getProductBySlug(slug) : undefined;
  const prefersReducedMotion = useReducedMotion();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [colorPreference, setColorPreference] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setColorPreference('');
      setQuantity(1);
    }
  }, [product]);

  if (!product) {
    return (
      <main className="bg-white pt-32 pb-24">
        <div className="max-w-xl mx-auto px-5 text-center">
          <p className="text-sm font-medium text-[#9B4D17] mb-2">Model Not Found</p>
          <h1 className="font-display text-3xl font-medium text-[#202735] mb-4">
            This product could not be located in our catalogue.
          </h1>
          <p className="text-sm text-[#586070] mb-8">
            It may have been updated or moved. Browse our current published catalogues or
            submit your requirements directly for a quotation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/catalogue"
              className="px-6 py-3 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors"
            >
              Return to Catalogue
            </Link>
            <Link
              to="/quote"
              className="px-6 py-3 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const relatedProducts = getRelatedProducts(product, 3);
  const activeImage = product.images[activeImageIndex] ?? product.images[0];

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const quoteSearch = new URLSearchParams({
    product: product.slug,
    qty: String(quantity),
    ...(colorPreference.trim() ? { finish: colorPreference.trim() } : {}),
  }).toString();

  const presetQuantities = [1, 5, 10, 25];

  return (
    <main className="bg-white">
      {/* Breadcrumb Bar */}
      <div className="bg-[#F5F0E8] border-b border-[#D9CBB8]/70 pt-24 sm:pt-28 pb-4">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#586070]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
            <Link to="/" className="hover:text-[#202735] transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/catalogue" className="hover:text-[#202735] transition-colors">
              Catalogue
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/catalogue?category=${product.categoryId}`}
              className="hover:text-[#202735] transition-colors"
            >
              {product.categoryLabel}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#202735] font-medium font-mono">{product.productCode}</span>
          </nav>

          <Link
            to={`/catalogue?category=${product.categoryId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to {product.categoryLabel}</span>
          </Link>
        </div>
      </div>

      {/* Primary Product Image Stage + Sticky Quote Specification Module */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left: Real Product Image Gallery */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[4/3] rounded-2xl bg-white border border-[#D9CBB8]/75 overflow-hidden p-6 sm:p-10 shadow-[0_14px_36px_-22px_rgba(32,39,53,0.12)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${product.slug}-${activeImageIndex}`}
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
                    className="w-full h-full"
                  >
                    <SafeImage
                      src={activeImage?.url ?? ''}
                      alt={activeImage?.alt ?? product.name}
                      fallbackTitle={product.name}
                      loading="eager"
                      containerClassName="bg-white"
                      className="w-full h-full object-contain"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Gallery navigation arrows (shown when multiple photos exist) */}
                {product.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      aria-label="Previous product photograph"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full liquid-glass-light text-[#202735] hover:scale-105 flex items-center justify-center transition-transform cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      aria-label="Next product photograph"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full liquid-glass-light text-[#202735] hover:scale-105 flex items-center justify-center transition-transform cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                {activeImage?.caption ? (
                  <p className="text-xs sm:text-sm text-[#586070]">{activeImage.caption}</p>
                ) : (
                  <span />
                )}

                {product.sourcePdfUrl && (
                  <a
                    href={product.sourcePdfUrl}
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#9B4D17]" aria-hidden="true" />
                    <span>
                      Catalogue PDF
                      {product.sourcePdfPage ? ` · Page ${product.sourcePdfPage}` : ''}
                    </span>
                  </a>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={`${img.url}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`View image ${idx + 1}: ${img.alt}`}
                      aria-pressed={idx === activeImageIndex}
                      className={`aspect-[4/3] rounded-xl overflow-hidden bg-white p-2 border transition-all duration-200 cursor-pointer ${
                        idx === activeImageIndex
                          ? 'border-[#9B4D17] ring-2 ring-[#9B4D17]/30'
                          : 'border-[#D9CBB8]/70 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <SafeImage
                        src={img.url}
                        alt={img.alt}
                        fallbackTitle={product.name}
                        containerClassName="bg-white"
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Contiguous Quote Specification Module */}
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#586070] mb-2">
                  <span>{product.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-medium tabular-nums text-[#202735]">
                    {product.productCode}
                  </span>
                  {product.availabilityStatus && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{product.availabilityStatus}</span>
                    </>
                  )}
                </div>

                <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight mb-4">
                  {product.name}
                </h1>
                <p className="text-sm sm:text-base text-[#586070] leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="border-t border-[#EAE1D3] pt-6 space-y-6">
                {/* Color / Finish Customisation Note */}
                {product.customisationOptions && product.customisationOptions.length > 0 && (
                  <div>
                    <label
                      htmlFor="detail-color-pref"
                      className="block text-xs font-medium text-[#202735] mb-1.5"
                    >
                      Preferred Upholstery Color / Finish (Optional)
                    </label>
                    <p className="text-xs text-[#586070] mb-2.5">
                      {product.customisationOptions[0]}
                    </p>
                    <input
                      id="detail-color-pref"
                      type="text"
                      value={colorPreference}
                      onChange={(e) => setColorPreference(e.target.value)}
                      placeholder="e.g., As shown in catalogue, Espresso Brown, Charcoal Black..."
                      className="w-full px-4 py-2.5 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735]"
                    />
                  </div>
                )}

                {/* Quantity Requirement */}
                <div>
                  <label
                    htmlFor="detail-quantity"
                    className="block text-xs font-medium text-[#202735] mb-2.5"
                  >
                    Quantity Requirement (Units)
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-[#D9CBB8] bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => adjustQuantity(-1)}
                        aria-label="Decrease quantity by 1"
                        className="w-10 h-11 flex items-center justify-center text-[#202735] hover:bg-[#F5F0E8] transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        id="detail-quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          setQuantity(Number.isNaN(parsed) || parsed < 1 ? 1 : parsed);
                        }}
                        className="w-20 h-11 text-center text-sm font-mono tabular-nums text-[#202735] border-x border-[#D9CBB8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQuantity(1)}
                        aria-label="Increase quantity by 1"
                        className="w-10 h-11 flex items-center justify-center text-[#202735] hover:bg-[#F5F0E8] transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {presetQuantities.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`px-3 py-2 text-xs font-mono tabular-nums rounded-full border transition-colors cursor-pointer ${
                            quantity === preset
                              ? 'bg-[#F5F0E8] border-[#202735] text-[#202735]'
                              : 'border-[#EAE1D3] text-[#586070] hover:border-[#202735] hover:text-[#202735]'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quotation Notice & Primary CTA */}
                <div className="rounded-2xl bg-[#F5F0E8] border border-[#D9CBB8]/80 p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs text-[#586070]">
                    <span>Pricing</span>
                    <span className="font-medium text-[#202735]">{product.pricingLabel}</span>
                  </div>

                  <Link
                    to={`/quote?${quoteSearch}`}
                    className="group w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_8px_22px_-6px_rgba(155,77,23,0.45)]"
                  >
                    <span>
                      Request a Quote — {product.productCode} ({quantity}{' '}
                      {quantity === 1 ? 'Unit' : 'Units'})
                    </span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>

                  <p className="text-xs text-[#586070] leading-relaxed">
                    Your selected model code, quantity, and colour preference will pre-fill in
                    our multi-item quotation form.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalogue Features, Specifications & Customisation */}
      <section className="bg-[#F5F0E8] border-y border-[#D9CBB8]/80 py-18 lg:py-22">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Catalogue Features */}
            <Reveal className="lg:col-span-7">
              <p className="text-sm font-medium text-[#9B4D17] mb-2">Catalogue Features</p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#202735] mb-6">
                Design Highlights & Key Features
              </h2>

              <ul className="divide-y divide-[#D9CBB8] border-y border-[#D9CBB8]">
                {product.features.map((feature, index) => (
                  <li
                    key={feature}
                    className="py-4 flex items-start gap-4 text-sm sm:text-base text-[#202735] leading-relaxed"
                  >
                    <span className="font-mono text-xs text-[#9B4D17] tabular-nums mt-1 shrink-0">
                      0{index + 1}.
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Specifications & Customisation (only what is explicitly provided) */}
            <Reveal delay={0.08} className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-sm font-medium text-[#9B4D17] mb-2">Catalogue Details</p>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#202735] mb-5">
                  Specifications & Customisation
                </h2>

                <dl className="divide-y divide-[#D9CBB8] border-y border-[#D9CBB8]">
                  <div className="py-3.5 grid grid-cols-3 gap-2">
                    <dt className="text-xs font-medium text-[#586070]">Product Code</dt>
                    <dd className="col-span-2 text-sm font-mono font-medium tabular-nums text-[#202735]">
                      {product.productCode}
                    </dd>
                  </div>
                  <div className="py-3.5 grid grid-cols-3 gap-2">
                    <dt className="text-xs font-medium text-[#586070]">Category</dt>
                    <dd className="col-span-2 text-sm text-[#202735]">{product.categoryLabel}</dd>
                  </div>
                  {product.specifications?.map((spec) => (
                    <div key={spec.label} className="py-3.5 grid grid-cols-3 gap-2">
                      <dt className="text-xs font-medium text-[#586070]">{spec.label}</dt>
                      <dd className="col-span-2 text-sm text-[#202735] tabular-nums">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                  {product.customisationOptions && product.customisationOptions.length > 0 && (
                    <div className="py-3.5 grid grid-cols-3 gap-2">
                      <dt className="text-xs font-medium text-[#586070]">Customisation</dt>
                      <dd className="col-span-2 text-sm text-[#202735]">
                        {product.customisationOptions.join(' · ')}
                      </dd>
                    </div>
                  )}
                  <div className="py-3.5 grid grid-cols-3 gap-2">
                    <dt className="text-xs font-medium text-[#586070]">Pricing</dt>
                    <dd className="col-span-2 text-sm font-medium text-[#9B4D17]">
                      {product.pricingLabel}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs text-[#586070] leading-relaxed">
                  Exact dimensions, bulk pricing tiers, and delivery schedules not listed in
                  the catalogue sheet are confirmed directly in your project quotation.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-18 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-sm font-medium text-[#9B4D17] mb-1.5">
                  More in {product.categoryLabel}
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#202735]">
                  Related Catalogue Models
                </h2>
              </div>
              <Link
                to={`/catalogue?category=${product.categoryId}`}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap"
              >
                <span>View All {product.categoryLabel}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {relatedProducts.map((related, idx) => (
                <Reveal key={related.id} delay={idx * 0.07}>
                  <ProductCard product={related} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
