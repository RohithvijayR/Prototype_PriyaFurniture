import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CATALOGUE_CONTACT, CATEGORIES } from '../data/catalogue';

export function Footer() {
  return (
    <footer className="bg-[#202735] text-[#F5F0E8] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-22">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link
              to="/"
              className="inline-block font-display text-2xl sm:text-[26px] font-medium tracking-tight text-white"
            >
              Priya Furniture
            </Link>
            <p className="text-sm text-[#D9CBB8] leading-relaxed max-w-sm">
              B2B furniture manufacturer supplying salon and wellness stations alongside
              commercial, office, healthcare, educational, and institutional furnishings built
              to quotation and client specification.
            </p>
            <div className="pt-1">
              <Link
                to="/quote"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-[#D9CBB8] transition-colors pb-0.5 border-b border-white/30 hover:border-[#D9CBB8]"
              >
                <span>Start a Project Quotation</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Navigation Column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-sans text-xs font-medium tracking-wide text-[#D9CBB8]/70">
              Navigation
            </h3>
            <ul className="space-y-3 text-sm text-[#F5F0E8]/85">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/catalogue" className="hover:text-white transition-colors">
                  Product Catalogue
                </Link>
              </li>
              <li>
                <Link to="/#about" className="hover:text-white transition-colors">
                  About Priya Furniture
                </Link>
              </li>
              <li>
                <Link to="/quote" className="hover:text-white transition-colors">
                  Request a Quote
                </Link>
              </li>
            </ul>
          </div>

          {/* Active Product Catalogues Column */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-sans text-xs font-medium tracking-wide text-[#D9CBB8]/70">
              Product Catalogues
            </h3>
            <ul className="space-y-3 text-sm text-[#F5F0E8]/85">
              {CATEGORIES.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/catalogue?category=${category.id}`}
                    className="hover:text-white transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-sans text-xs font-medium tracking-wide text-[#D9CBB8]/70">
              Commercial & Sales Desk
            </h3>
            <address className="not-italic space-y-2.5 text-sm text-[#D9CBB8]">
              <p className="text-[#F5F0E8]/90">{CATALOGUE_CONTACT.addressLine1}</p>
              <p>{CATALOGUE_CONTACT.addressLine2}</p>
              <p className="pt-1 font-mono text-xs text-white tabular-nums">
                Mob: {CATALOGUE_CONTACT.mobile}
              </p>
              <p className="font-mono text-xs text-white">
                Email: {CATALOGUE_CONTACT.emailPlaceholder}
              </p>
              <p className="text-xs text-[#D9CBB8]/70 pt-1">
                Showroom Hours: {CATALOGUE_CONTACT.hours}
              </p>
            </address>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#D9CBB8]/70">
          <p>© {new Date().getFullYear()} Priya Furniture. All rights reserved.</p>
          <p>Quotation-based manufacturing · Bulk & custom commercial supply</p>
        </div>
      </div>
    </footer>
  );
}
