import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { PartnerLoginModal } from './PartnerLoginModal';
import { EDITORIAL_EASE } from './MotionPrimitives';

type NavKey = 'home' | 'catalogue' | 'categories' | 'about' | 'contact';

interface NavItem {
  key: NavKey;
  label: string;
  to?: string;
  sectionId?: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', to: '/' },
  { key: 'categories', label: 'Categories', sectionId: 'categories' },
  { key: 'catalogue', label: 'Catalogue', to: '/catalogue' },
  { key: 'about', label: 'About', sectionId: 'about' },
  { key: 'contact', label: 'Contact', sectionId: 'contact' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [activeHomeSection, setActiveHomeSection] = useState<NavKey>('home');

  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const isHomePage = location.pathname === '/';
  const useDarkGlass = isHomePage && !isPastHero;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (isHomePage) {
        const heroEl = document.getElementById('hero-section');
        const heroCutoff = heroEl ? Math.max(heroEl.offsetHeight - 110, 260) : 520;
        setIsPastHero(y > heroCutoff);

        const sections: Array<{ key: NavKey; id: string }> = [
          { key: 'contact', id: 'contact' },
          { key: 'about', id: 'about' },
          { key: 'categories', id: 'categories' },
        ];

        let matched: NavKey = 'home';
        const viewportPivot = y + 220;
        for (const sec of sections) {
          const el = document.getElementById(sec.id);
          if (el && viewportPivot >= el.offsetTop) {
            matched = sec.key;
            break;
          }
        }
        setActiveHomeSection(matched);
      } else {
        setIsPastHero(true);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isHomePage]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleSectionLink = useCallback(
    (sectionId: string) => {
      setMobileOpen(false);
      if (location.pathname === '/') {
        setActiveHomeSection(sectionId as NavKey);
      }
      navigate(`/#${sectionId}`, {
        replace: location.pathname === '/',
        state: { scrollTo: sectionId, scrollTrigger: Date.now() },
      });
    },
    [location.pathname, navigate]
  );

  const getActiveNavKey = (): NavKey | null => {
    if (location.pathname === '/catalogue' || location.pathname.startsWith('/product/')) {
      return 'catalogue';
    }
    if (location.pathname === '/quote') {
      return null;
    }
    if (isHomePage) {
      return activeHomeSection;
    }
    return null;
  };

  const activeKey = getActiveNavKey();

  return (
    <>
      <header className="fixed top-3.5 sm:top-5 inset-x-0 z-50 px-3.5 sm:px-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto relative">
          {/* Floating Liquid Glass Pill Capsule */}
          <div
            className={`relative rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              useDarkGlass ? 'liquid-glass-dark text-white' : 'liquid-glass-light text-[#202735]'
            }`}
          >
            {/* Subtle top specular edge refraction highlight */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-8 top-0 h-px rounded-full transition-opacity duration-500 ${
                useDarkGlass
                  ? 'bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-100'
                  : 'bg-gradient-to-r from-transparent via-white to-transparent opacity-95'
              }`}
            />

            <div className="h-[58px] lg:h-[64px] px-4 sm:px-5 lg:px-6 flex items-center justify-between gap-4 lg:gap-8">
              {/* Left: Brand Wordmark */}
              <Link
                to="/"
                onClick={() => {
                  if (isHomePage) window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`font-display text-lg sm:text-xl font-medium tracking-tight whitespace-nowrap shrink-0 pl-1.5 transition-colors duration-300 ${
                  useDarkGlass ? 'text-white' : 'text-[#202735]'
                }`}
              >
                Priya Furniture
              </Link>

              {/* Center: Single-line Navigation Links */}
              <nav
                aria-label="Primary navigation"
                className="hidden lg:flex items-center gap-1"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = activeKey === item.key;
                  const baseLinkClass = `relative px-3.5 py-2 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    useDarkGlass
                      ? isActive
                        ? 'text-white'
                        : 'text-white/80 hover:text-white'
                      : isActive
                        ? 'text-[#202735]'
                        : 'text-[#202735]/72 hover:text-[#202735]'
                  }`;

                  const indicator = isActive ? (
                    <motion.span
                      layoutId="liquid-nav-active-pill"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.01 }
                          : { type: 'spring', stiffness: 380, damping: 32 }
                      }
                      className={`absolute inset-0 rounded-full -z-10 ${
                        useDarkGlass
                          ? 'bg-white/18 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
                          : 'bg-[#202735]/[0.075] border border-[#202735]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                      }`}
                    />
                  ) : null;

                  if (item.to) {
                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        onClick={() => {
                          if (item.to === '/' && isHomePage) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={baseLinkClass}
                      >
                        {indicator}
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSectionLink(item.sectionId!)}
                      className={baseLinkClass}
                    >
                      {indicator}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Right: Login & Prominent Request a Quote CTA */}
              <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    useDarkGlass
                      ? 'text-white/85 hover:text-white hover:bg-white/10'
                      : 'text-[#586070] hover:text-[#202735] hover:bg-[#202735]/[0.05]'
                  }`}
                >
                  Login
                </button>
                <Link
                  to="/quote"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_6px_18px_-4px_rgba(155,77,23,0.48)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_-4px_rgba(155,77,23,0.58)] whitespace-nowrap shrink-0"
                >
                  <span>Request a Quote</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              {/* Mobile Compact Controls */}
              <div className="flex lg:hidden items-center gap-2 shrink-0">
                <Link
                  to="/quote"
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] whitespace-nowrap shrink-0"
                >
                  Request Quote
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    useDarkGlass
                      ? 'bg-white/12 text-white border border-white/20 hover:bg-white/20'
                      : 'bg-[#202735]/[0.06] text-[#202735] border border-[#202735]/10 hover:bg-[#202735]/12'
                  }`}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Floating Liquid Glass Drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.nav
                key="mobile-glass-menu"
                aria-label="Mobile navigation"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
                className="lg:hidden mt-3 rounded-3xl liquid-glass-light text-[#202735] p-4 sm:p-5 overflow-hidden"
              >
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = activeKey === item.key;
                    const itemClass = `flex items-center justify-between w-full text-left px-4 py-3 rounded-2xl text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-[#202735]/[0.08] text-[#202735]'
                        : 'text-[#202735]/80 hover:bg-[#202735]/[0.04] hover:text-[#202735]'
                    }`;

                    if (item.to) {
                      return (
                        <Link
                          key={item.key}
                          to={item.to}
                          onClick={() => {
                            setMobileOpen(false);
                            if (item.to === '/' && isHomePage) {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className={itemClass}
                        >
                          <span>{item.label}</span>
                          {isActive && (
                            <span className="text-xs text-[#9B4D17] font-medium">Current</span>
                          )}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSectionLink(item.sectionId!)}
                        className={`${itemClass} cursor-pointer`}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-[#202735]/10 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      setLoginModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-5 py-3 text-sm font-medium rounded-full text-[#202735] bg-white/70 border border-[#202735]/15 hover:border-[#202735] transition-colors cursor-pointer"
                  >
                    Partner Login
                  </button>
                  <Link
                    to="/quote"
                    onClick={() => setMobileOpen(false)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors"
                  >
                    <span>Request a Quote</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      <PartnerLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}
