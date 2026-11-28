import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CATALOGUE_CONTACT, formatIndicativeRate } from '../data/catalogue';
import { firestoreTimestampToDate } from '../lib/firebase/collections';
import { QuoteServiceError } from '../lib/firebase/errors';
import { getCustomerQuotationById } from '../services/quoteService';
import {
  getQuotationStatusMeta,
  type FirestoreQuotationRequest,
} from '../types/firestore';
import { resolvePublicAsset } from '../utils/assetPath';
import { QuotationStatusBadge } from '../components/QuotationStatusBadge';
import { SafeImage } from '../components/SafeImage';

function formatDateTime(
  value: FirestoreQuotationRequest['createdAt'] | null | undefined
): string {
  const date = firestoreTimestampToDate(value);
  if (!date) return 'Pending timestamp';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSafeCatalogueImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || !imagePath.startsWith('/assets/catalogue/')) {
    return null;
  }
  return resolvePublicAsset(imagePath);
}

export function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const { user } = useAuth();

  const [quotation, setQuotation] = useState<FirestoreQuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const loadQuotation = useCallback(async () => {
    if (!user || !quotationId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const version = requestVersionRef.current + 1;
    requestVersionRef.current = version;

    setLoading(true);
    setNotFound(false);
    setError(null);

    try {
      const record = await getCustomerQuotationById(user.uid, quotationId);
      if (requestVersionRef.current !== version) return;
      if (!record) {
        setQuotation(null);
        setNotFound(true);
      } else {
        setQuotation(record);
      }
    } catch (err) {
      if (requestVersionRef.current !== version) return;
      if (
        err instanceof QuoteServiceError &&
        (err.code === 'permission-denied' || err.code === 'not-found')
      ) {
        setQuotation(null);
        setNotFound(true);
      } else {
        setError(
          err instanceof QuoteServiceError
            ? err.message
            : 'We could not load this quotation request right now. Please try again.'
        );
      }
    } finally {
      if (requestVersionRef.current === version) {
        setLoading(false);
      }
    }
  }, [quotationId, user]);

  useEffect(() => {
    void loadQuotation();
  }, [loadQuotation]);

  if (loading) {
    return (
      <main className="bg-white min-h-[82vh]">
        <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-12">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-4" role="status">
            <div className="h-4 w-36 rounded-md skeleton-shimmer" />
            <div className="h-9 w-72 rounded-md skeleton-shimmer" />
            <div className="h-4 w-96 max-w-full rounded-md skeleton-shimmer" />
          </div>
        </section>
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-36 rounded-2xl skeleton-shimmer" />
              <div className="h-36 rounded-2xl skeleton-shimmer" />
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="h-56 rounded-3xl skeleton-shimmer" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="bg-[#F5F0E8] min-h-[82vh] pt-28 sm:pt-32 lg:pt-36 pb-20">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <div className="rounded-3xl bg-white border border-[#D9CBB8] p-8 sm:p-12 text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FDF4F0] border border-[#E4C2A6] flex items-center justify-center text-[#9B4D17]">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#202735]">
                Quotation request not found
              </h1>
              <p className="text-sm text-[#586070] leading-relaxed">
                This quotation record does not exist or is not linked to your signed-in Priya
                Furniture account.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/quotations"
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to My Quotations</span>
              </Link>
              <Link
                to="/quote"
                className="min-h-[44px] inline-flex items-center px-6 py-2.5 text-sm font-medium rounded-full text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors"
              >
                Request a New Quote
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !quotation) {
    return (
      <main className="bg-[#F5F0E8] min-h-[82vh] pt-28 sm:pt-32 lg:pt-36 pb-20">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <div
            role="alert"
            className="rounded-3xl bg-white border border-[#9B4D17]/50 p-8 space-y-5"
          >
            <div className="flex items-start gap-3 text-[#7E3D10]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-medium text-[#202735]">
                  Unable to load quotation details
                </h1>
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void loadQuotation()}
                className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <Link
                to="/quotations"
                className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to My Quotations</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const statusMeta = getQuotationStatusMeta(quotation.status);
  const products = Array.isArray(quotation.requestedProducts) ? quotation.requestedProducts : [];

  return (
    <main className="bg-white min-h-[82vh]">
      {/* Header Band */}
      <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-12 lg:pb-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-5">
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-[#586070]">
            <Link
              to="/quotations"
              className="inline-flex items-center gap-1.5 text-[#586070] hover:text-[#202735] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>My Quotations</span>
            </Link>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-[#9B4D17]">Quotation Request</span>
                <QuotationStatusBadge status={quotation.status} size="md" />
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl lg:text-4xl font-medium text-[#202735] tracking-tight tabular-nums">
                {quotation.referenceNumber}
              </h1>
              <p className="text-sm sm:text-base text-[#586070] leading-relaxed">
                {statusMeta.shortDescription}
              </p>
            </div>

            <div className="text-xs sm:text-sm text-[#586070] space-y-1 md:text-right shrink-0">
              <p className="tabular-nums">
                Submitted:{' '}
                <span className="font-mono text-[#202735]">
                  {formatDateTime(quotation.createdAt)}
                </span>
              </p>
              <p className="tabular-nums">
                Last Updated:{' '}
                <span className="font-mono text-[#202735]">
                  {formatDateTime(quotation.updatedAt)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Column: Requested Products Schedule + Customer Notes */}
            <div className="lg:col-span-8 space-y-10">
              <div className="space-y-5">
                <div className="border-b border-[#EAE1D3] pb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl font-medium text-[#202735]">
                    Requested Products Schedule
                  </h2>
                  <p className="font-mono text-xs text-[#586070] tabular-nums">
                    {quotation.itemCount} {quotation.itemCount === 1 ? 'Item' : 'Items'} ·{' '}
                    {quotation.totalQuantity} {quotation.totalQuantity === 1 ? 'Unit' : 'Units'}
                  </p>
                </div>

                <div className="space-y-4">
                  {products.map((item, idx) => {
                    const imageUrl = getSafeCatalogueImageUrl(item.imagePath);
                    const isCatalogueModel = item.productId && item.productId !== 'custom';

                    return (
                      <div
                        key={`${item.productId}-${idx}`}
                        className="rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8]/80 p-5 sm:p-6 flex flex-col sm:flex-row gap-5"
                      >
                        {/* Thumbnail */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-[#EAE1D3] overflow-hidden shrink-0 flex items-center justify-center">
                          {imageUrl ? (
                            <SafeImage
                              src={imageUrl}
                              alt={`${item.productCode} — ${item.productName}`}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Package className="w-7 h-7 text-[#586070]" aria-hidden="true" />
                          )}
                        </div>

                        {/* Snapshot Details */}
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <p className="text-xs text-[#586070]">
                                {item.categoryName} ·{' '}
                                <span className="font-mono font-medium text-[#9B4D17]">
                                  {item.productCode}
                                </span>
                              </p>
                              <h3 className="font-display text-lg sm:text-xl font-medium text-[#202735] leading-snug">
                                {item.productName}
                              </h3>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <p className="font-mono text-sm font-medium text-[#202735] tabular-nums">
                                Qty: {item.quantity}
                              </p>
                              {typeof item.indicativeBaseRateInr === 'number' &&
                              item.indicativeBaseRateInr > 0 ? (
                                <p className="font-mono text-xs text-[#586070] tabular-nums mt-0.5">
                                  Starting from {formatIndicativeRate(item.indicativeBaseRateInr)}
                                </p>
                              ) : (
                                <p className="text-xs text-[#586070] mt-0.5">Quote on request</p>
                              )}
                            </div>
                          </div>

                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EAE1D3] text-xs">
                            <div>
                              <dt className="text-[#586070] mb-0.5">Dimensions</dt>
                              <dd className="text-[#202735]">
                                {item.dimensions || 'Standard / Confirm on quotation'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[#586070] mb-0.5">
                                Color / Upholstery / Finish
                              </dt>
                              <dd className="text-[#202735]">
                                {item.materialFinishPreferences ||
                                  'As shown / Confirm on quotation'}
                              </dd>
                            </div>
                            {item.customizationDetails && (
                              <div className="sm:col-span-2">
                                <dt className="text-[#586070] mb-0.5">Customization Notes</dt>
                                <dd className="text-[#202735] leading-relaxed">
                                  {item.customizationDetails}
                                </dd>
                              </div>
                            )}
                          </dl>

                          {isCatalogueModel && (
                            <div className="pt-1">
                              <Link
                                to={`/product/${item.productId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B4D17] hover:text-[#7E3D10] transition-colors"
                              >
                                <span>View Catalogue Model</span>
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-[#586070] leading-relaxed">
                  Product details and any indicative starting rates above reflect the snapshot
                  recorded at submission time. Final direct-from-factory pricing depends on
                  upholstery selection, customisation, order quantity, delivery, and installation.
                </p>
              </div>

              {/* Customer Notes */}
              <div className="space-y-4">
                <div className="border-b border-[#EAE1D3] pb-3">
                  <h2 className="font-display text-2xl font-medium text-[#202735]">
                    Delivery & Project Notes
                  </h2>
                </div>

                <div className="rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8]/80 p-6 space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-[#586070] mb-1">Delivery Location</p>
                    <p className="text-[#202735] font-medium">{quotation.deliveryLocation}</p>
                  </div>
                  <div className="pt-3 border-t border-[#EAE1D3]">
                    <p className="text-xs text-[#586070] mb-1">Additional Requirements</p>
                    <p className="text-[#202735] leading-relaxed whitespace-pre-line">
                      {quotation.additionalRequirements.trim() ||
                        'No additional project notes were provided with this inquiry.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Inquiry Summary, Contact & Actions */}
            <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              <div className="rounded-3xl bg-[#F5F0E8] border border-[#D9CBB8] p-7 space-y-5">
                <h2 className="font-display text-xl font-medium text-[#202735]">
                  Inquiry Summary
                </h2>

                <dl className="divide-y divide-[#D9CBB8]/70 text-sm">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Reference</dt>
                    <dd className="font-mono text-xs font-medium text-[#202735] tabular-nums">
                      {quotation.referenceNumber}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Status</dt>
                    <dd>
                      <QuotationStatusBadge status={quotation.status} />
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Organisation</dt>
                    <dd className="text-[#202735] text-right font-medium">
                      {quotation.organizationName}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Contact Person</dt>
                    <dd className="text-[#202735] text-right">{quotation.customerName}</dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Email</dt>
                    <dd className="text-xs text-[#202735] text-right break-all">
                      {quotation.email}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Telephone</dt>
                    <dd className="font-mono text-xs text-[#202735] tabular-nums">
                      {quotation.phone}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Revision</dt>
                    <dd className="font-mono text-xs text-[#202735] tabular-nums">
                      Rev {quotation.revisionNumber}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl bg-[#202735] text-[#F5F0E8] p-7 space-y-5">
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-medium text-white">
                    Questions about this inquiry?
                  </h3>
                  <p className="text-xs text-[#D9CBB8] leading-relaxed">
                    Share your reference number{' '}
                    <span className="font-mono text-white">{quotation.referenceNumber}</span> when
                    speaking with our direct sales desk.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Link
                    to="/quotations"
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full text-white border border-white/25 hover:border-white transition-colors whitespace-nowrap"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Back to My Quotations</span>
                  </Link>
                  <Link
                    to="/quote"
                    className="min-h-[44px] group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors whitespace-nowrap"
                  >
                    <span>Request Another Quote</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>

                <p className="pt-3 border-t border-white/15 text-xs text-[#D9CBB8]">
                  Direct sales:{' '}
                  <a
                    href={CATALOGUE_CONTACT.mobileHref}
                    className="font-mono text-white underline"
                  >
                    {CATALOGUE_CONTACT.mobile}
                  </a>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
