import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { CATALOGUE_CONTACT, CATEGORIES, PRODUCTS } from '../data/catalogue';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared editorial two-column shell for Login, Register, and Forgot Password pages,
 * matching Priya Furniture's warm ivory / deep slate / burnt amber visual language.
 */
export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="bg-[#F5F0E8] min-h-[85vh] pt-28 sm:pt-32 lg:pt-36 pb-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Editorial Context Panel */}
          <aside className="lg:col-span-5 order-2 lg:order-1 rounded-3xl bg-[#202735] text-[#F5F0E8] p-7 sm:p-9 lg:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#D9CBB8]/80">Priya Furniture Account</p>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-white leading-snug">
                  Direct manufacturer access for salons, studios & commercial buyers.
                </h2>
              </div>

              <p className="text-sm text-[#D9CBB8] leading-relaxed">
                Keep your business contact details, billing address, and delivery address ready
                in one place as Priya Furniture expands its client account services.
              </p>

              <div className="pt-4 border-t border-white/12 space-y-3 text-sm text-[#F5F0E8]/90">
                <p className="text-xs font-medium text-[#D9CBB8]/75">
                  No account required to browse or enquire
                </p>
                <p className="text-xs text-[#D9CBB8]/85 leading-relaxed">
                  All {PRODUCTS.length} furniture models across {CATEGORIES.length} published
                  collections, downloadable PDF catalogues, indicative starting rates, and the
                  Request a Quote desk remain open to every visitor.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/12 space-y-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-1.5 font-medium text-white hover:text-[#D9CBB8] transition-colors"
                >
                  <span>Browse Catalogue</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                <Link
                  to="/quote"
                  className="inline-flex items-center gap-1.5 font-medium text-[#D9CBB8] hover:text-white transition-colors"
                >
                  <span>Request a Quote</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              <p className="text-xs text-[#D9CBB8]/75">
                Direct sales desk:{' '}
                <a
                  href={CATALOGUE_CONTACT.mobileHref}
                  className="font-mono text-white hover:text-[#D9CBB8] tabular-nums underline underline-offset-2"
                >
                  {CATALOGUE_CONTACT.mobile}
                </a>
              </p>
            </div>
          </aside>

          {/* Right Form Surface */}
          <section className="lg:col-span-7 order-1 lg:order-2 bg-white border border-[#D9CBB8] rounded-3xl p-6 sm:p-10 shadow-[0_20px_48px_-24px_rgba(32,39,53,0.14)]">
            <div className="mb-7 space-y-2">
              <p className="text-sm font-medium text-[#9B4D17]">{eyebrow}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight">
                {title}
              </h1>
              <p className="text-sm text-[#586070] leading-relaxed">{subtitle}</p>
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  onClick,
  disabled = false,
  loading = false,
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full min-h-[46px] inline-flex items-center justify-center gap-3 px-5 py-3 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] hover:bg-[#FAF8F4] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#9B4D17]" aria-hidden="true" />
      ) : (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
      )}
      <span>{loading ? 'Connecting to Google...' : label}</span>
    </button>
  );
}
