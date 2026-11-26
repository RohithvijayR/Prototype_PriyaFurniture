import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, Plus, Trash2, ArrowRight } from 'lucide-react';
import {
  CATALOGUE_CONTACT,
  CATEGORIES,
  PRODUCTS,
  getProductBySlug,
} from '../data/catalogue';
import { CatalogueProduct } from '../types/catalogue';
import { EDITORIAL_EASE } from '../components/MotionPrimitives';

interface QuoteItemDraft {
  id: string;
  productSlug: string;
  quantity: string;
  dimensions: string;
  materialFinish: string;
}

interface QuoteFormState {
  organisationName: string;
  contactPerson: string;
  phone: string;
  email: string;
  deliveryLocation: string;
  additionalRequirements: string;
  items: QuoteItemDraft[];
}

interface FormErrors {
  organisationName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  deliveryLocation?: string;
  items?: Record<string, { productSlug?: string; quantity?: string }>;
}

interface SubmittedQuote {
  referenceId: string;
  submittedAt: string;
  data: QuoteFormState;
}

const CUSTOM_PRODUCT_KEY = 'custom';

function extractExplicitDimensions(product: CatalogueProduct | undefined): string {
  if (!product?.specifications) return '';
  const dimEntries = product.specifications.filter((spec) =>
    /height|length|width|depth|dimension/i.test(spec.label)
  );
  if (dimEntries.length === 0) return '';
  return dimEntries.map((entry) => `${entry.label}: ${entry.value}`).join(' · ');
}

function createInitialItem(
  slugParam: string | null,
  qtyParam: string | null,
  finishParam: string | null
): QuoteItemDraft {
  if (slugParam === CUSTOM_PRODUCT_KEY) {
    return {
      id: 'item-1',
      productSlug: CUSTOM_PRODUCT_KEY,
      quantity: qtyParam && parseInt(qtyParam, 10) > 0 ? qtyParam : '1',
      dimensions: '',
      materialFinish: finishParam ?? '',
    };
  }

  const matched = slugParam ? getProductBySlug(slugParam) : undefined;
  if (matched) {
    return {
      id: 'item-1',
      productSlug: matched.slug,
      quantity: qtyParam && parseInt(qtyParam, 10) > 0 ? qtyParam : '1',
      dimensions: extractExplicitDimensions(matched),
      materialFinish: finishParam ?? '',
    };
  }

  return {
    id: 'item-1',
    productSlug: '',
    quantity: '1',
    dimensions: '',
    materialFinish: '',
  };
}

function getProductDisplayName(slug: string): string {
  if (slug === CUSTOM_PRODUCT_KEY) {
    return 'Custom / Other Category Furniture Requirement';
  }
  const found = getProductBySlug(slug);
  return found ? `${found.categoryLabel} · ${found.productCode} — ${found.name}` : 'Unspecified Item';
}

export function QuoteRequestPage() {
  const [searchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const [form, setForm] = useState<QuoteFormState>(() => ({
    organisationName: '',
    contactPerson: '',
    phone: '',
    email: '',
    deliveryLocation: '',
    additionalRequirements: '',
    items: [
      createInitialItem(
        searchParams.get('product'),
        searchParams.get('qty'),
        searchParams.get('finish')
      ),
    ],
  }));

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<SubmittedQuote | null>(null);

  const updateField = <K extends keyof Omit<QuoteFormState, 'items'>>(
    field: K,
    value: QuoteFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const updateItem = (itemId: string, patch: Partial<QuoteItemDraft>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...patch };
        if (patch.productSlug !== undefined) {
          const matched = getProductBySlug(patch.productSlug);
          if (matched) {
            next.dimensions = extractExplicitDimensions(matched);
            if (!next.quantity || parseInt(next.quantity, 10) < 1) {
              next.quantity = '1';
            }
          } else {
            next.dimensions = '';
          }
        }
        return next;
      }),
    }));

    if (errors.items?.[itemId]) {
      setErrors((prev) => {
        if (!prev.items) return prev;
        const copy = { ...prev.items };
        delete copy[itemId];
        return { ...prev, items: copy };
      });
    }
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${prev.items.length + 1}`,
          productSlug: '',
          quantity: '1',
          dimensions: '',
          materialFinish: '',
        },
      ],
    }));
  };

  const removeItem = (itemId: string) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
    });
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.organisationName.trim()) {
      nextErrors.organisationName = 'Please enter your organisation, salon, or company name.';
    }
    if (!form.contactPerson.trim()) {
      nextErrors.contactPerson = 'Please enter the primary contact person.';
    }
    const digitsOnly = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) {
      nextErrors.phone = 'Please provide a contact telephone number.';
    } else if (digitsOnly.length < 7) {
      nextErrors.phone = 'Please enter a valid telephone number (at least 7 digits).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim()) {
      nextErrors.email = 'Please enter an email address.';
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!form.deliveryLocation.trim()) {
      nextErrors.deliveryLocation = 'Please enter the project delivery city or site location.';
    }

    const itemErrors: Record<string, { productSlug?: string; quantity?: string }> = {};
    form.items.forEach((item) => {
      const entryErr: { productSlug?: string; quantity?: string } = {};
      if (!item.productSlug) {
        entryErr.productSlug = 'Please select a catalogue model or custom specification.';
      }
      const qtyNum = parseInt(item.quantity, 10);
      if (!item.quantity.trim() || Number.isNaN(qtyNum) || qtyNum < 1) {
        entryErr.quantity = 'Enter a quantity of at least 1 unit.';
      }
      if (entryErr.productSlug || entryErr.quantity) {
        itemErrors[item.id] = entryErr;
      }
    });

    if (Object.keys(itemErrors).length > 0) {
      nextErrors.items = itemErrors;
    }

    return nextErrors;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setSubmitted({
      referenceId: `PF-RFQ-${new Date().getFullYear()}-${randomSuffix}`,
      submittedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      data: form,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewRequest = () => {
    setSubmitted(null);
    setErrors({});
    setForm({
      organisationName: '',
      contactPerson: '',
      phone: '',
      email: '',
      deliveryLocation: '',
      additionalRequirements: '',
      items: [createInitialItem(null, null, null)],
    });
  };

  if (submitted) {
    return (
      <main className="bg-[#F5F0E8] min-h-[82vh] pt-28 sm:pt-32 lg:pt-36 pb-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
            className="bg-white border border-[#D9CBB8] rounded-3xl p-8 sm:p-12 shadow-[0_20px_48px_-24px_rgba(32,39,53,0.14)]"
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-[#9B4D17] mb-4">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Quotation Request Confirmed</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#202735] leading-tight mb-4">
              Thank you, {submitted.data.contactPerson}.
            </h1>
            <p className="text-base text-[#586070] leading-relaxed mb-8">
              Your quotation inquiry for{' '}
              <span className="font-medium text-[#202735]">
                {submitted.data.organisationName}
              </span>{' '}
              has been recorded. Our sales desk will review your selected catalogue models,
              color preferences, and quantities and respond with an itemized factory quotation.
            </p>

            {/* Reference Summary */}
            <div className="rounded-2xl bg-[#F5F0E8] border border-[#D9CBB8]/80 p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#586070] mb-0.5">Reference Number</p>
                <p className="font-mono font-medium text-[#202735] tabular-nums">
                  {submitted.referenceId}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#586070] mb-0.5">Date Logged</p>
                <p className="font-mono text-[#202735] tabular-nums">{submitted.submittedAt}</p>
              </div>
              <div>
                <p className="text-xs text-[#586070] mb-0.5">Delivery Location</p>
                <p className="text-[#202735]">{submitted.data.deliveryLocation}</p>
              </div>
            </div>

            {/* Itemized Schedule */}
            <div className="mb-8">
              <h2 className="font-display text-xl font-medium text-[#202735] mb-4">
                Requested Furniture Schedule
              </h2>
              <div className="divide-y divide-[#EAE1D3] border-y border-[#EAE1D3]">
                {submitted.data.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-[#202735]">
                        {idx + 1}. {getProductDisplayName(item.productSlug)}
                      </p>
                      <p className="text-xs text-[#586070]">
                        Dimensions: {item.dimensions || 'Standard / Confirm on quote'} · Color /
                        Finish: {item.materialFinish || 'As shown / Confirm on quote'}
                      </p>
                    </div>
                    <span className="font-mono text-sm text-[#202735] tabular-nums shrink-0">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Summary */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pb-8 border-b border-[#EAE1D3] mb-8">
              <div>
                <dt className="text-xs text-[#586070] mb-0.5">Email Address</dt>
                <dd className="text-[#202735]">{submitted.data.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#586070] mb-0.5">Telephone</dt>
                <dd className="font-mono text-[#202735] tabular-nums">{submitted.data.phone}</dd>
              </div>
              {submitted.data.additionalRequirements.trim() && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#586070] mb-0.5">Additional Notes</dt>
                  <dd className="text-[#202735] leading-relaxed">
                    {submitted.data.additionalRequirements}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/catalogue"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors"
              >
                <span>Return to Catalogue</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <button
                type="button"
                onClick={handleNewRequest}
                className="px-6 py-3 text-sm font-medium rounded-full text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors cursor-pointer"
              >
                Submit Another Request
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-white">
      {/* Header */}
      <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-14 lg:pb-18">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-sm font-medium text-[#9B4D17] mb-2">B2B Quotation Desk</p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#202735] leading-tight mb-4 max-w-3xl">
            Request a Project Quotation
          </h1>
          <p className="text-base text-[#586070] leading-relaxed max-w-2xl">
            Select from {PRODUCTS.length} models across our {CATEGORIES.length} published
            collections—or specify custom furniture requirements. You can include multiple
            product items, colour preferences, and delivery details in one inquiry.
          </p>
        </div>
      </section>

      {/* Main Form + Sticky Guide */}
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Form Column */}
            <form onSubmit={handleSubmit} noValidate className="lg:col-span-8 space-y-12">
              {Object.keys(errors).length > 0 && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/45 p-4 flex items-start gap-3 text-sm text-[#7E3D10]"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Please review the highlighted fields below.</p>
                    <p className="text-xs mt-0.5 text-[#7E3D10]/90">
                      Ensure all required organisation, contact, and product item fields are
                      completed before submitting your quotation request.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 1: Organisation & Contact Details */}
              <div className="space-y-6">
                <div className="border-b border-[#EAE1D3] pb-3">
                  <h2 className="font-display text-2xl font-medium text-[#202735]">
                    01. Organisation & Contact Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="organisationName"
                      className="block text-xs font-medium text-[#202735] mb-2"
                    >
                      Customer / Organisation Name <span className="text-[#9B4D17]">*</span>
                    </label>
                    <input
                      id="organisationName"
                      type="text"
                      value={form.organisationName}
                      onChange={(e) => updateField('organisationName', e.target.value)}
                      aria-invalid={Boolean(errors.organisationName)}
                      placeholder="Salon, Spa, Studio, Clinic, or Company Name"
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                        errors.organisationName
                          ? 'border-[#9B4D17]'
                          : 'border-[#D9CBB8] focus:border-[#202735]'
                      }`}
                    />
                    {errors.organisationName && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.organisationName}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contactPerson"
                      className="block text-xs font-medium text-[#202735] mb-2"
                    >
                      Contact Person <span className="text-[#9B4D17]">*</span>
                    </label>
                    <input
                      id="contactPerson"
                      type="text"
                      value={form.contactPerson}
                      onChange={(e) => updateField('contactPerson', e.target.value)}
                      aria-invalid={Boolean(errors.contactPerson)}
                      placeholder="Full name & role"
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                        errors.contactPerson
                          ? 'border-[#9B4D17]'
                          : 'border-[#D9CBB8] focus:border-[#202735]'
                      }`}
                    />
                    {errors.contactPerson && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.contactPerson}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-medium text-[#202735] mb-2"
                    >
                      Phone Number <span className="text-[#9B4D17]">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      aria-invalid={Boolean(errors.phone)}
                      placeholder="+91 90000 00000"
                      className={`w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border text-[#202735] placeholder:font-sans placeholder:text-[#586070]/60 transition-colors ${
                        errors.phone
                          ? 'border-[#9B4D17]'
                          : 'border-[#D9CBB8] focus:border-[#202735]'
                      }`}
                    />
                    {errors.phone && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-[#202735] mb-2"
                    >
                      Email Address <span className="text-[#9B4D17]">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      placeholder="Enter your business email"
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                        errors.email
                          ? 'border-[#9B4D17]'
                          : 'border-[#D9CBB8] focus:border-[#202735]'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Product Items Schedule */}
              <div className="space-y-6">
                <div className="border-b border-[#EAE1D3] pb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-medium text-[#202735]">
                    02. Catalogue Models & Quantities ({form.items.length}{' '}
                    {form.items.length === 1 ? 'Item' : 'Items'})
                  </h2>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full bg-[#F5F0E8] text-[#202735] hover:bg-[#202735] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Another Product</span>
                  </button>
                </div>

                <div className="space-y-5">
                  <AnimatePresence initial={false}>
                    {form.items.map((item, idx) => {
                      const itemError = errors.items?.[item.id];

                      return (
                        <motion.div
                          key={item.id}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                          transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
                          className="rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8]/80 p-5 sm:p-6 space-y-5"
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-[#EAE1D3] pb-3">
                            <span className="font-mono text-xs text-[#586070] tabular-nums">
                              Line Item 0{idx + 1}
                            </span>
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#586070] hover:text-[#9B4D17] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                            <div className="sm:col-span-8">
                              <label
                                htmlFor={`product-${item.id}`}
                                className="block text-xs font-medium text-[#202735] mb-2"
                              >
                                Product Selection <span className="text-[#9B4D17]">*</span>
                              </label>
                              <select
                                id={`product-${item.id}`}
                                value={item.productSlug}
                                onChange={(e) =>
                                  updateItem(item.id, { productSlug: e.target.value })
                                }
                                aria-invalid={Boolean(itemError?.productSlug)}
                                className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] ${
                                  itemError?.productSlug
                                    ? 'border-[#9B4D17]'
                                    : 'border-[#D9CBB8] focus:border-[#202735]'
                                }`}
                              >
                                <option value="">
                                  Select a Priya Furniture catalogue model or custom build...
                                </option>
                                <option value={CUSTOM_PRODUCT_KEY}>
                                  Custom / Other Category Requirement (Office, Hospital, School, etc.)
                                </option>
                                {CATEGORIES.map((category) => (
                                  <optgroup key={category.id} label={category.name}>
                                    {PRODUCTS.filter((p) => p.categoryId === category.id).map(
                                      (prod) => (
                                        <option key={prod.slug} value={prod.slug}>
                                          {prod.productCode} — {prod.name}
                                        </option>
                                      )
                                    )}
                                  </optgroup>
                                ))}
                              </select>
                              {itemError?.productSlug && (
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                                  <AlertCircle
                                    className="w-3.5 h-3.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{itemError.productSlug}</span>
                                </p>
                              )}
                            </div>

                            <div className="sm:col-span-4">
                              <label
                                htmlFor={`qty-${item.id}`}
                                className="block text-xs font-medium text-[#202735] mb-2"
                              >
                                Quantity (Units) <span className="text-[#9B4D17]">*</span>
                              </label>
                              <input
                                id={`qty-${item.id}`}
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.id, { quantity: e.target.value })
                                }
                                aria-invalid={Boolean(itemError?.quantity)}
                                placeholder="e.g. 5"
                                className={`w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border text-[#202735] ${
                                  itemError?.quantity
                                    ? 'border-[#9B4D17]'
                                    : 'border-[#D9CBB8] focus:border-[#202735]'
                                }`}
                              />
                              {itemError?.quantity && (
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                                  <AlertCircle
                                    className="w-3.5 h-3.5 shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span>{itemError.quantity}</span>
                                </p>
                              )}
                            </div>

                            <div className="sm:col-span-6">
                              <label
                                htmlFor={`dimensions-${item.id}`}
                                className="block text-xs font-medium text-[#202735] mb-2"
                              >
                                Dimensions (Optional)
                              </label>
                              <input
                                id={`dimensions-${item.id}`}
                                type="text"
                                value={item.dimensions}
                                onChange={(e) =>
                                  updateItem(item.id, { dimensions: e.target.value })
                                }
                                placeholder="Leave blank for standard or enter custom size"
                                className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735]"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <label
                                htmlFor={`finish-${item.id}`}
                                className="block text-xs font-medium text-[#202735] mb-2"
                              >
                                Color / Upholstery / Finish Preference
                              </label>
                              <input
                                id={`finish-${item.id}`}
                                type="text"
                                value={item.materialFinish}
                                onChange={(e) =>
                                  updateItem(item.id, { materialFinish: e.target.value })
                                }
                                placeholder="e.g., Warm Brown Leatherette, Olive Green, Black"
                                className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735]"
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Section 3: Delivery & Additional Requirements */}
              <div className="space-y-6">
                <div className="border-b border-[#EAE1D3] pb-3">
                  <h2 className="font-display text-2xl font-medium text-[#202735]">
                    03. Delivery & Project Notes
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="deliveryLocation"
                    className="block text-xs font-medium text-[#202735] mb-2"
                  >
                    Delivery Location (City, State, or Project Site){' '}
                    <span className="text-[#9B4D17]">*</span>
                  </label>
                  <input
                    id="deliveryLocation"
                    type="text"
                    value={form.deliveryLocation}
                    onChange={(e) => updateField('deliveryLocation', e.target.value)}
                    aria-invalid={Boolean(errors.deliveryLocation)}
                    placeholder="e.g., Chennai, Tamil Nadu / Site Address"
                    className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                      errors.deliveryLocation
                        ? 'border-[#9B4D17]'
                        : 'border-[#D9CBB8] focus:border-[#202735]'
                    }`}
                  />
                  {errors.deliveryLocation && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{errors.deliveryLocation}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="additionalRequirements"
                    className="block text-xs font-medium text-[#202735] mb-2"
                  >
                    Additional Requirements, Timeline, or Customisation Notes
                  </label>
                  <textarea
                    id="additionalRequirements"
                    rows={4}
                    value={form.additionalRequirements}
                    onChange={(e) => updateField('additionalRequirements', e.target.value)}
                    placeholder="Share target delivery dates, custom upholstery shades, plumbing or room layout notes, or additional furniture categories..."
                    className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] resize-y"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[#586070]">
                  Submitting a quotation request carries no purchase obligation.
                </p>
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_10px_24px_-6px_rgba(155,77,23,0.45)] whitespace-nowrap cursor-pointer"
                >
                  <span>Submit Quotation Request</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </form>

            {/* Right Sidebar: Process & Contact Desk */}
            <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              <div className="rounded-3xl bg-[#F5F0E8] border border-[#D9CBB8] p-7 space-y-5">
                <h2 className="font-display text-xl font-medium text-[#202735]">
                  How Quotations Work
                </h2>
                <ol className="space-y-4 text-sm text-[#586070]">
                  <li className="flex items-start gap-3">
                    <span className="font-mono text-xs text-[#9B4D17] tabular-nums mt-0.5">
                      01.
                    </span>
                    <span>
                      Select from {PRODUCTS.length} models across our {CATEGORIES.length} published
                      collections—each organised under its category PF code—or describe custom
                      items.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-mono text-xs text-[#9B4D17] tabular-nums mt-0.5">
                      02.
                    </span>
                    <span>
                      Specify quantities, delivery location, and any custom upholstery color or
                      sizing preferences.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-mono text-xs text-[#9B4D17] tabular-nums mt-0.5">
                      03.
                    </span>
                    <span>
                      Our sales team responds with itemized direct-from-factory pricing and
                      delivery timelines.
                    </span>
                  </li>
                </ol>
              </div>

              <div className="rounded-3xl bg-[#202735] text-[#F5F0E8] p-7 space-y-4">
                <h3 className="font-display text-xl font-medium text-white">
                  Direct Sales Desk
                </h3>
                <p className="text-xs text-[#D9CBB8] leading-relaxed">
                  Speak directly with Priya Furniture for bulk orders, upholstery swatch
                  guidance, or additional product catalogues.
                </p>
                <dl className="space-y-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <dt className="text-[#D9CBB8]/75 mb-0.5">Catalogue Sales Mobile</dt>
                    <dd className="font-mono text-white tabular-nums">
                      <a
                        href={CATALOGUE_CONTACT.mobileHref}
                        className="hover:text-[#D9CBB8] transition-colors"
                      >
                        {CATALOGUE_CONTACT.mobile}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#D9CBB8]/75 mb-0.5">Published Catalogue Scope</dt>
                    <dd className="text-[#F5F0E8] tabular-nums">
                      {PRODUCTS.length} models across {CATEGORIES.length} collections
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#D9CBB8]/75 mb-0.5">Quotation Support</dt>
                    <dd className="text-[#F5F0E8]">{CATALOGUE_CONTACT.quotationNote}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
