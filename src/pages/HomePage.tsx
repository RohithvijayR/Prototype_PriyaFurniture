import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, ArrowDown } from 'lucide-react';
import {
  BRAND_MEDIA,
  CATALOGUE_CONTACT,
  CATEGORIES,
  PRODUCTS,
  getProductsByCategory,
} from '../data/catalogue';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { EDITORIAL_EASE, Reveal } from '../components/MotionPrimitives';

const CAPABILITY_HIGHLIGHTS = [
  {
    title: 'Direct Factory Supply',
    detail: 'Manufactured in-house with consistent build quality for single outlets and multi-site rollouts.',
  },
  {
    title: 'Color & Finish Customisation',
    detail: 'Upholstery colors, finishes, and layout configurations tailored to client preference.',
  },
  {
    title: 'Multi-Sector Capability',
    detail: 'Supplying salons, wellness studios, offices, hospitals, schools, and commercial institutions.',
  },
  {
    title: 'Quotation-Based Fulfilment',
    detail: 'Transparent factory pricing prepared per model code, quantity requirement, and project brief.',
  },
];

const CUSTOM_PROCESS = [
  {
    step: '01',
    title: 'Select Model Codes or Share Brief',
    description:
      'Choose directly from our official product codes (such as PF 001 – PF 024) or submit bespoke spatial specifications for your site.',
  },
  {
    step: '02',
    title: 'Color & Upholstery Personalisation',
    description:
      'Specify leatherette tones, quilted finishes, basin styles, and frame treatments to align seamlessly with your interior palette.',
  },
  {
    step: '03',
    title: 'Itemized Factory Quotation',
    description:
      'Our commercial desk prepares a detailed quotation tailored to your unit quantities, customisation notes, and delivery location.',
  },
  {
    step: '04',
    title: 'Production & Delivery Coordination',
    description:
      'Units are manufactured to order, quality-checked prior to dispatch, and scheduled cleanly around your project opening timeline.',
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    title: 'Built for Commercial Durability',
    description:
      'From hydraulic swivel bases and MS/stainless steel frames to solid-wood cabinet structures, our pieces are engineered for daily commercial use.',
  },
  {
    title: 'Client-Customized Colors',
    description:
      'Nearly every seating station, chair, and bed in our catalogues can be upholstered in colors matched to your brand and interior design.',
  },
  {
    title: 'Transparent Direct Quotations',
    description:
      'No inflated retail markups—receive itemized manufacturer quotations whether ordering a single unit or outfitting an entire facility.',
  },
  {
    title: 'Expanding Institutional Range',
    description:
      'Alongside our published salon and wellness catalogues, Priya Furniture manufactures commercial, office, healthcare, and educational furniture on inquiry.',
  },
];

const FEATURED_SLUGS = [
  'pedicure-manicure-pf-001',
  'pedicure-manicure-pf-006',
  'pedicure-manicure-pf-008',
  'barber-chairs-pf-008',
  'hairwash-stations-pf-005',
  'facial-beds-pf-005',
];

export function HomePage() {
  const featuredProducts = FEATURED_SLUGS.map((slug) =>
    PRODUCTS.find((p) => p.slug === slug)
  ).filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroImageY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const heroImageScale = useTransform(scrollYProgress, [0, 1], [1.03, 1.1]);
  const heroContentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.35]);

  return (
    <main>
      {/* 1. Cinematic Full-Bleed Hero */}
      <section
        id="hero-section"
        ref={heroRef}
        className="relative min-h-[88vh] lg:min-h-[94vh] flex items-end bg-[#202735] overflow-hidden"
      >
        {/* Parallax Editorial Photography */}
        <motion.div
          style={
            prefersReducedMotion
              ? undefined
              : { y: heroImageY, scale: heroImageScale }
          }
          initial={prefersReducedMotion ? false : { scale: 1.09, opacity: 0.85 }}
          animate={{ scale: 1.03, opacity: 1 }}
          transition={{ duration: 1.25, ease: EDITORIAL_EASE }}
          className="absolute inset-0 will-change-transform"
        >
          <SafeImage
            src={BRAND_MEDIA.heroEditorial}
            alt="Architectural interior showcasing Priya Furniture craftsmanship"
            fallbackTitle="Priya Furniture"
            loading="eager"
            className="w-full h-full object-cover object-center"
          />
        </motion.div>

        {/* Layered Architectural Scrims for Nav & Headline Legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#202735]/88 via-[#202735]/54 to-[#202735]/18"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#202735]/62 via-[#202735]/24 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#202735]/72 to-transparent"
        />

        {/* Hero Foreground Content */}
        <motion.div
          style={prefersReducedMotion ? undefined : { opacity: heroContentOpacity }}
          className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-36 pb-16 sm:pb-20 lg:pb-24"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="max-w-2xl">
              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08, ease: EDITORIAL_EASE }}
                className="text-sm text-[#D9CBB8] font-medium mb-4"
              >
                Commercial, Salon & Institutional Furniture Manufacturer
              </motion.p>

              <motion.h1
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.72, delay: 0.16, ease: EDITORIAL_EASE }}
                className="font-display text-4xl sm:text-5xl lg:text-[64px] font-medium text-white leading-[1.06] tracking-tight mb-6"
              >
                Furniture Designed for Spaces That Matter.
              </motion.h1>

              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.28, ease: EDITORIAL_EASE }}
                className="text-base sm:text-lg text-[#F5F0E8]/90 leading-relaxed max-w-xl mb-10"
              >
                Direct-from-factory furniture solutions for commercial spaces, salons,
                offices, hospitals, and institutions—manufactured with customizable finishes
                for bulk orders and tailored specifications.
              </motion.p>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.38, ease: EDITORIAL_EASE }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/quote"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_28px_-6px_rgba(155,77,23,0.55)] whitespace-nowrap"
                >
                  <span>Request a Quote</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium rounded-full text-white liquid-glass-dark hover:bg-white/20 transition-all duration-200 whitespace-nowrap"
                >
                  <span>Explore Catalogue</span>
                </Link>
              </motion.div>
            </div>

            <motion.a
              href="#categories"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EDITORIAL_EASE }}
              className="hidden lg:inline-flex items-center gap-2.5 text-xs font-medium text-[#D9CBB8] hover:text-white transition-colors pb-1"
            >
              <span>Explore Catalogues</span>
              <span className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* Capability Strip Below Hero */}
      <section aria-label="Manufacturing capabilities" className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {CAPABILITY_HIGHLIGHTS.map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.06} y={14}>
                <div className="space-y-1.5">
                  <h2 className="font-sans text-sm font-semibold text-[#202735]">{item.title}</h2>
                  <p className="text-sm text-[#586070] leading-relaxed">{item.detail}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Featured Product Categories (Real Uploaded Catalogues) */}
      <section id="categories" className="bg-white py-22 lg:py-30 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-[#9B4D17] mb-2">Product Catalogues</p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight">
                Published Collections Ready for Quotation
              </h2>
            </div>
            <Link
              to="/catalogue"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap shrink-0 pb-1 border-b border-[#202735]/30 hover:border-[#9B4D17]"
            >
              <span>View All {PRODUCTS.length} Products</span>
              <ArrowUpRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {CATEGORIES.map((category, idx) => {
              const count = getProductsByCategory(category.id).length;
              return (
                <Reveal key={category.id} delay={idx * 0.08}>
                  <Link
                    to={`/catalogue?category=${category.id}`}
                    className="group block h-full bg-white border border-[#D9CBB8]/75 rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[#202735]/30 hover:shadow-[0_22px_46px_-18px_rgba(32,39,53,0.16)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-white border-b border-[#EAE1D3]/70 p-6 sm:p-8">
                      <SafeImage
                        src={category.image}
                        alt={category.imageAlt}
                        fallbackTitle={category.name}
                        containerClassName="bg-white"
                        className="w-full h-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                      />
                    </div>
                    <div className="p-6 sm:p-8">
                      <div className="flex items-center gap-2 text-xs text-[#586070] mb-2">
                        <span className="font-mono tabular-nums text-[#9B4D17]">
                          {count} Catalogue Models
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{category.tagline}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 mb-2.5">
                        <h3 className="font-display text-2xl font-medium text-[#202735] group-hover:text-[#9B4D17] transition-colors">
                          {category.name}
                        </h3>
                        <ArrowUpRight
                          className="w-5 h-5 text-[#9B4D17] shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm text-[#586070] leading-relaxed">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.12} className="mt-10 pt-7 border-t border-[#EAE1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-[#586070]">
            <p>
              Also manufacturing bespoke and institutional furniture for offices, hospitals,
              schools, and commercial spaces—additional category catalogues available on inquiry.
            </p>
            <Link
              to="/quote?product=custom"
              className="inline-flex items-center gap-1.5 font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Inquire for Other Categories</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 3. Featured Products (Authentic Catalogue Products) */}
      <section className="bg-[#F5F0E8] py-22 lg:py-30 border-y border-[#D9CBB8]/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-[#9B4D17] mb-2">Featured Catalogue Models</p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight">
                Crafted Stations, Chairs & Treatment Beds
              </h2>
            </div>
            <Link
              to="/catalogue"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap shrink-0 pb-1 border-b border-[#202735]/30 hover:border-[#9B4D17]"
            >
              <span>Browse Full Catalogue</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {featuredProducts.map((product, idx) => (
              <Reveal key={product.id} delay={(idx % 3) * 0.07}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. About Priya Furniture */}
      <section id="about" className="bg-white py-22 lg:py-30 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
            <Reveal className="lg:col-span-6">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-[#F5F0E8] border border-[#D9CBB8]/70">
                <SafeImage
                  src={BRAND_MEDIA.studioWorkshop}
                  alt="Priya Furniture manufacturing studio workbench with timber finishes, steel frames, and upholstery textiles"
                  fallbackTitle="Priya Furniture Manufacturing Studio"
                  className="w-full h-full object-cover"
                />
                <div className="absolute left-4 right-4 sm:right-auto bottom-4 rounded-2xl liquid-glass-dark px-4 py-3 text-white max-w-sm">
                  <p className="text-xs font-medium text-[#F5F0E8]">
                    Material & Upholstery Workshop
                  </p>
                  <p className="text-[11px] text-[#D9CBB8] mt-0.5">
                    Custom leatherette colors, solid wood joinery & metal frame fabrication
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-sm font-medium text-[#9B4D17] mb-3">About Priya Furniture</p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight mb-6">
                Precision Craftsmanship Meets Commercial Scale
              </h2>
              <div className="space-y-4 text-base text-[#586070] leading-relaxed mb-10">
                <p>
                  Priya Furniture manufactures and supplies dependable furniture for commercial
                  establishments, salons, wellness studios, corporate offices, hospitals,
                  schools, and institutions.
                </p>
                <p>
                  Every model in our published catalogues—from hydraulic reclining barber chairs
                  and diamond-quilted manicure-pedicure stations to solid-wood facial beds and
                  all-in-one hairwash units—is built for daily heavy use with upholstery colors
                  tailored to client preference.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#D9CBB8]">
                <div>
                  <p className="font-display text-2xl sm:text-3xl font-medium text-[#202735] tabular-nums">
                    {PRODUCTS.length} Models
                  </p>
                  <p className="text-xs sm:text-sm text-[#586070] mt-1">
                    Live across 4 published catalogues
                  </p>
                </div>
                <div>
                  <p className="font-display text-2xl sm:text-3xl font-medium text-[#202735] tabular-nums">
                    100% B2B
                  </p>
                  <p className="text-xs sm:text-sm text-[#586070] mt-1">
                    Direct manufacturer quotations
                  </p>
                </div>
                <div>
                  <p className="font-display text-2xl sm:text-3xl font-medium text-[#202735] tabular-nums">
                    Custom Fit
                  </p>
                  <p className="text-xs sm:text-sm text-[#586070] mt-1">
                    Colors & project specifications
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. Custom Furniture Solutions */}
      <section className="bg-[#F5F0E8] py-22 lg:py-30 border-y border-[#D9CBB8]/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-14">
            <div className="lg:col-span-5">
              <p className="text-sm font-medium text-[#9B4D17] mb-2">Custom Furniture Solutions</p>
              <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight">
                Manufactured Around Your Interior Palette & Floor Plan
              </h2>
            </div>
            <div className="lg:col-span-7 flex flex-col justify-end">
              <p className="text-base text-[#586070] leading-relaxed max-w-2xl">
                Whether matching upholstery colors across a multi-station salon or ordering
                custom-built workstations, hospital suites, or educational furniture, our team
                quotes and manufactures directly to your project requirements.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {CUSTOM_PROCESS.map((item, idx) => (
              <Reveal key={item.step} delay={idx * 0.07}>
                <div className="pt-6 border-t border-[#202735]/20 flex flex-col h-full">
                  <span className="font-mono text-xs text-[#9B4D17] tabular-nums mb-3">
                    {item.step}.
                  </span>
                  <h3 className="font-display text-xl font-medium text-[#202735] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#586070] leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12} className="mt-12 pt-8 border-t border-[#D9CBB8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-[#202735]">
              Have a bulk order, custom upholstery shade, or institutional requirement?
            </p>
            <Link
              to="/quote?product=custom"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[#9B4D17] hover:text-[#7E3D10] transition-colors whitespace-nowrap"
            >
              <span>Submit Custom Specifications</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 6. Why Choose Us */}
      <section className="bg-white py-22 lg:py-30">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <Reveal className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-[#9B4D17] mb-2">Why Choose Priya Furniture</p>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight">
              Accountable Manufacturing From Catalogue Selection to Delivery
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY_CHOOSE_ITEMS.map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.07}>
                <div className="pt-6 border-t border-[#D9CBB8] space-y-3 h-full">
                  <h3 className="font-display text-xl font-medium text-[#202735] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#586070] leading-relaxed">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Quote CTA & Contact Desk */}
      <section id="contact" className="relative bg-[#202735] text-white py-22 lg:py-28 scroll-mt-24 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 82% 28%, rgba(155, 77, 23, 0.14) 0%, transparent 48%), radial-gradient(circle at 18% 85%, rgba(217, 203, 184, 0.08) 0%, transparent 45%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-7">
              <p className="text-sm font-medium text-[#D9CBB8] mb-3">Project Quotations</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-white leading-tight mb-5">
                Ready to Request a Quotation for Your Space?
              </h2>
              <p className="text-base text-[#D9CBB8] leading-relaxed max-w-xl mb-9">
                Select model codes directly from our catalogue or describe your custom project
                needs. Our sales desk provides direct factory quotations tailored to your
                quantities and color preferences.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/quote"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_28px_-6px_rgba(155,77,23,0.5)] whitespace-nowrap"
                >
                  <span>Request a Quote</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium rounded-full text-[#F5F0E8] border border-white/25 hover:border-white hover:bg-white/8 transition-all duration-200 whitespace-nowrap"
                >
                  <span>Explore Catalogue</span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-5">
              <div className="rounded-3xl liquid-glass-dark p-8 space-y-6">
                <div>
                  <h3 className="font-display text-xl font-medium text-white mb-1">
                    Commercial & Sales Desk
                  </h3>
                  <p className="text-xs text-[#D9CBB8]/85">
                    Direct manufacturer quotations & upholstery colour guidance
                  </p>
                </div>

                <dl className="space-y-4 text-sm border-t border-white/12 pt-5">
                  <div>
                    <dt className="text-xs text-[#D9CBB8]/75 mb-0.5">Catalogue Sales Mobile</dt>
                    <dd className="font-mono text-sm text-white tabular-nums">
                      {CATALOGUE_CONTACT.mobile}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#D9CBB8]/75 mb-0.5">Email Enquiries</dt>
                    <dd className="font-mono text-sm text-white">
                      {CATALOGUE_CONTACT.emailPlaceholder}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#D9CBB8]/75 mb-0.5">Factory & Showroom</dt>
                    <dd className="text-sm text-[#F5F0E8]">{CATALOGUE_CONTACT.addressLine1}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
