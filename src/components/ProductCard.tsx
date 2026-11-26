import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CatalogueProduct } from '../types/catalogue';
import { formatIndicativeRate } from '../data/catalogue';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: CatalogueProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images[0];
  const hasColorCustomisation = product.customisationOptions?.some((opt) =>
    opt.toLowerCase().includes('color')
  );

  return (
    <article className="group flex flex-col h-full bg-white border border-[#D9CBB8]/75 rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[#202735]/25 hover:shadow-[0_20px_42px_-16px_rgba(32,39,53,0.16)]">
      <Link
        to={`/product/${product.slug}`}
        className="block relative aspect-[4/3] overflow-hidden bg-white border-b border-[#EAE1D3]/70 p-4 sm:p-5"
        aria-label={`View specifications for ${product.name}`}
      >
        <SafeImage
          src={primaryImage?.url ?? ''}
          alt={primaryImage?.alt ?? product.name}
          fallbackTitle={product.name}
          containerClassName="bg-white"
          className="w-full h-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
      </Link>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center justify-between gap-2 text-xs text-[#586070] mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{product.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-medium tabular-nums text-[#202735] shrink-0">
              {product.productCode}
            </span>
          </div>
          {hasColorCustomisation && (
            <span className="text-[11px] text-[#9B4D17] whitespace-nowrap shrink-0">
              Custom Colors
            </span>
          )}
        </div>

        <h3 className="font-display text-lg sm:text-xl font-medium text-[#202735] leading-snug mb-2.5">
          <Link
            to={`/product/${product.slug}`}
            className="hover:text-[#9B4D17] transition-colors duration-200"
          >
            {product.name}
          </Link>
        </h3>

        <p className="text-sm text-[#586070] leading-relaxed line-clamp-2 mb-5 flex-1">
          {product.description}
        </p>

        {typeof product.baseReferenceRate === 'number' && (
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-[#586070]">Starting from</span>
              <span className="font-mono text-base font-medium tabular-nums text-[#202735]">
                {formatIndicativeRate(product.baseReferenceRate)}
              </span>
            </div>
            <span className="text-[11px] text-[#586070]/85 whitespace-nowrap">
              Indicative rate
            </span>
          </div>
        )}

        <div className="pt-4 border-t border-[#EAE1D3] flex items-center justify-between gap-3">
          <Link
            to={`/product/${product.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#202735] hover:text-[#9B4D17] transition-colors whitespace-nowrap py-1"
          >
            <span>View Details</span>
            <ArrowUpRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>

          <Link
            to={`/quote?product=${encodeURIComponent(product.slug)}`}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-full bg-[#F5F0E8] text-[#202735] hover:bg-[#9B4D17] hover:text-white transition-all duration-200 whitespace-nowrap shrink-0"
          >
            {product.pricingLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
