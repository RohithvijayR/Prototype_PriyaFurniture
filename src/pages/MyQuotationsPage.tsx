import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CATALOGUE_CONTACT } from '../data/catalogue';
import { firestoreTimestampToDate } from '../lib/firebase/collections';
import { QuoteServiceError } from '../lib/firebase/errors';
import { listCustomerQuotations } from '../services/quoteService';
import type { FirestoreQuotationRequest } from '../types/firestore';
import { resolvePublicAsset } from '../utils/assetPath';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';
import { SafeImage } from '../components/SafeImage';

const PAGE_SIZE = 10;

function formatQuotationDate(
  value: FirestoreQuotationRequest['createdAt'] | null | undefined
): string {
  const date = firestoreTimestampToDate(value);
  if (!date) return 'Pending timestamp';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getSafeCatalogueImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || !imagePath.startsWith('/assets/catalogue/')) {
    return null;
  }
  return resolvePublicAsset(imagePath);
}

export function MyQuotationsPage() {
  const { user, profile } = useAuth();
  const [quotations, setQuotations] = useState<FirestoreQuotationRequest[]>([]);
  const [nextCursor, setNextCursor] =
    useState<QueryDocumentSnapshot<FirestoreQuotationRequest> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestVersionRef = useRef(0);

  const loadInitialQuotations = useCallback(async () => {
    if (!user) return;
    const version = requestVersionRef.current + 1;
    requestVersionRef.current = version;

    setLoading(true);
    setError(null);

    try {
      const page = await listCustomerQuotations(user.uid, { pageSize: PAGE_SIZE });
      if (requestVersionRef.current !== version) return;
      setQuotations(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      if (requestVersionRef.current !== version) return;
      setError(
        err instanceof QuoteServiceError
          ? err.message
          : 'We could not load your quotation requests right now. Please try again.'
      );
    } finally {
      if (requestVersionRef.current === version) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    void loadInitialQuotations();
  }, [loadInitialQuotations]);

  const handleLoadMore = async () => {
    if (!user || !nextCursor || loadingMore) return;
    const version = requestVersionRef.current;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await listCustomerQuotations(user.uid, {
        pageSize: PAGE_SIZE,
        cursor: nextCursor,
      });
      if (requestVersionRef.current !== version) return;
      setQuotations((prev) => {
        const seen = new Set(prev.map((q) => q.id));
        const appended = page.items.filter((q) => !seen.has(q.id));
        return [...prev, ...appended];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      if (requestVersionRef.current !== version) return;
      setError(
        err instanceof QuoteServiceError
          ? err.message
          : 'We could not load additional quotation requests right now. Please try again.'
      );
    } finally {
      if (requestVersionRef.current === version) {
        setLoadingMore(false);
      }
    }
  };

  return (
    <main className="bg-white min-h-[82vh]">
      {/* Header Band */}
      <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-12 lg:pb-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-sm font-medium text-[#9B4D17]">Customer Quotations</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#202735] leading-tight">
              My Quotations
            </h1>
            <p className="text-sm sm:text-base text-[#586070] leading-relaxed">
              Track your submitted Priya Furniture project quotation inquiries, requested models,
              and current review status for{' '}
              <span className="font-medium text-[#202735]">
                {profile?.organizationName || profile?.displayName || user?.email}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <Link
              to="/quote"
              className="group min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors shadow-[0_8px_20px_-6px_rgba(155,77,23,0.45)] whitespace-nowrap"
            >
              <span>Request a New Quote</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/account"
              className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors whitespace-nowrap"
            >
              Account Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {loading ? (
            <div role="status" aria-label="Loading your quotation requests" className="space-y-4">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#EAE1D3] bg-[#FAF8F4] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="h-5 w-44 rounded-md skeleton-shimmer" />
                    <div className="h-6 w-28 rounded-md skeleton-shimmer" />
                  </div>
                  <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
                  <div className="h-4 w-1/2 rounded-md skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : error && quotations.length === 0 ? (
            <div
              role="alert"
              className="max-w-2xl rounded-3xl bg-[#FDF4F0] border border-[#9B4D17]/50 p-7 space-y-5 text-sm text-[#7E3D10]"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1.5">
                  <h2 className="font-display text-xl font-medium text-[#202735]">
                    Unable to load your quotation requests
                  </h2>
                  <p className="text-sm leading-relaxed text-[#7E3D10]">{error}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadInitialQuotations()}
                  className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>Retry</span>
                </button>
                <a
                  href={CATALOGUE_CONTACT.mobileHref}
                  className="min-h-[42px] inline-flex items-center px-5 py-2 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors"
                >
                  Sales Desk: <span className="font-mono ml-1.5">{CATALOGUE_CONTACT.mobile}</span>
                </a>
              </div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="max-w-2xl mx-auto rounded-3xl bg-[#FAF8F4] border border-[#D9CBB8]/90 p-8 sm:p-12 text-center space-y-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F5F0E8] border border-[#D9CBB8] flex items-center justify-center text-[#9B4D17]">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#202735]">
                  No quotation requests yet
                </h2>
                <p className="text-sm sm:text-base text-[#586070] leading-relaxed max-w-lg mx-auto">
                  Any project quotation inquiry you submit while signed in will be saved here with
                  its reference number, requested catalogue models, and live review status.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to="/quote"
                  className="group min-h-[46px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors whitespace-nowrap"
                >
                  <span>Request a Quote</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  to="/catalogue"
                  className="min-h-[46px] inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors whitespace-nowrap"
                >
                  Browse Catalogue
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE1D3]">
                <p className="text-sm text-[#586070]">
                  Showing{' '}
                  <span className="font-mono font-medium text-[#202735] tabular-nums">
                    {quotations.length}
                  </span>{' '}
                  {quotations.length === 1 ? 'quotation request' : 'quotation requests'}
                  {hasMore ? ' (more available)' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => void loadInitialQuotations()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#586070] hover:text-[#202735] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Refresh</span>
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/50 p-4 flex items-center justify-between gap-4 text-xs sm:text-sm text-[#7E3D10]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    className="shrink-0 font-medium underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {quotations.map((quotation) => {
                  const products = Array.isArray(quotation.requestedProducts)
                    ? quotation.requestedProducts
                    : [];
                  const previewItems = products.slice(0, 3);
                  const remainingCount = Math.max(0, products.length - previewItems.length);
                  const firstImageUrl = products
                    .map((item) => getSafeCatalogueImageUrl(item.imagePath))
                    .find((url): url is string => Boolean(url));

                  return (
                    <article
                      key={quotation.id}
                      className="rounded-2xl border border-[#D9CBB8]/90 bg-white hover:border-[#202735]/40 transition-colors p-5 sm:p-6 shadow-[0_8px_28px_-20px_rgba(32,39,53,0.18)]"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Left: Thumbnail + Reference + Products */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          <div className="hidden sm:flex w-16 h-16 rounded-xl bg-[#FAF8F4] border border-[#EAE1D3] overflow-hidden shrink-0 items-center justify-center">
                            {firstImageUrl ? (
                              <SafeImage
                                src={firstImageUrl}
                                alt={products[0]?.productName || quotation.referenceNumber}
                                className="w-full h-full object-contain p-1.5"
                              />
                            ) : (
                              <Package
                                className="w-5 h-5 text-[#586070]"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-2.5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <Link
                                to={`/quotations/${quotation.id}`}
                                className="font-mono text-sm sm:text-base font-medium text-[#202735] hover:text-[#9B4D17] transition-colors tabular-nums"
                              >
                                {quotation.referenceNumber}
                              </Link>
                              <QuotationStatusBadge status={quotation.status} />
                            </div>

                            {/* Requested Products Preview */}
                            <ul className="space-y-1 text-sm text-[#202735]">
                              {previewItems.map((item, idx) => (
                                <li
                                  key={`${quotation.id}-${item.productId}-${idx}`}
                                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                                >
                                  <span className="font-mono text-xs font-medium text-[#9B4D17]">
                                    {item.productCode}
                                  </span>
                                  <span className="truncate max-w-md">{item.productName}</span>
                                  <span className="font-mono text-xs text-[#586070] tabular-nums">
                                    × {item.quantity}
                                  </span>
                                </li>
                              ))}
                              {remainingCount > 0 && (
                                <li className="text-xs text-[#586070]">
                                  +{remainingCount} more{' '}
                                  {remainingCount === 1 ? 'catalogue item' : 'catalogue items'}
                                </li>
                              )}
                            </ul>

                            {/* Compact Meta Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-[#586070]">
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>Submitted {formatQuotationDate(quotation.createdAt)}</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  {quotation.itemCount}{' '}
                                  {quotation.itemCount === 1 ? 'item' : 'items'} ·{' '}
                                  {quotation.totalQuantity}{' '}
                                  {quotation.totalQuantity === 1 ? 'unit' : 'units'}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span className="truncate max-w-[220px]">
                                  {quotation.deliveryLocation}
                                </span>
                              </span>
                              <span className="tabular-nums">
                                Updated {formatQuotationDate(quotation.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: View Details CTA */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#EAE1D3] shrink-0">
                          <Link
                            to={`/quotations/${quotation.id}`}
                            className="group min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors whitespace-nowrap"
                          >
                            <span>View Details</span>
                            <ArrowRight
                              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasMore && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="min-h-[46px] inline-flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-medium rounded-full bg-[#F5F0E8] text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors cursor-pointer disabled:opacity-65"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Loading More Quotations...</span>
                      </>
                    ) : (
                      <span>Load More Quotations</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
