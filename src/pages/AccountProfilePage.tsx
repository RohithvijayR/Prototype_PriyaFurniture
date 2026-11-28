import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CATALOGUE_CONTACT } from '../data/catalogue';
import { firestoreTimestampToDate } from '../lib/firebase/collections';
import { AuthServiceError } from '../lib/firebase/errors';
import {
  FIRESTORE_SCHEMA_LIMITS,
  type FirestoreAddress,
  type UserAccountType,
} from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';

interface AddressDraft {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EMPTY_ADDRESS: AddressDraft = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

function toAddressDraft(addr: FirestoreAddress | null | undefined): AddressDraft {
  if (!addr) return { ...EMPTY_ADDRESS };
  return {
    line1: addr.line1 ?? '',
    line2: addr.line2 ?? '',
    city: addr.city ?? '',
    state: addr.state ?? '',
    postalCode: addr.postalCode ?? '',
    country: addr.country ?? '',
  };
}

function addressDraftToPayload(draft: AddressDraft): FirestoreAddress | null {
  const line1 = draft.line1.trim();
  const line2 = draft.line2.trim();
  const city = draft.city.trim();
  const state = draft.state.trim();
  const postalCode = draft.postalCode.trim();
  const country = draft.country.trim();
  if (!line1 && !line2 && !city && !state && !postalCode && !country) {
    return null;
  }
  return line2
    ? { line1, line2, city, state, postalCode, country }
    : { line1, city, state, postalCode, country };
}

function formatDateDisplay(value: Date | null): string {
  if (!value) return 'Just now';
  return value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
    .join(' ');
}

export function AccountProfilePage() {
  const { user, profile, profileLoading, profileError, refreshProfile, saveProfile, logout } =
    useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountType, setAccountType] = useState<UserAccountType>('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [billingAddress, setBillingAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [shippingAddress, setShippingAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    phoneNumber?: string;
    billingAddress?: string;
    shippingAddress?: string;
  }>({});

  const savingRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setPhoneNumber(profile.phoneNumber);
    setAccountType(profile.accountType);
    setOrganizationName(profile.organizationName);
    setBillingAddress(toAddressDraft(profile.billingAddress));
    setShippingAddress(toAddressDraft(profile.shippingAddress));
    setSameAsBilling(false);
  }, [profile]);

  const validateAddressDraft = (draft: AddressDraft, label: string): string | undefined => {
    const values = [
      draft.line1.trim(),
      draft.line2.trim(),
      draft.city.trim(),
      draft.state.trim(),
      draft.postalCode.trim(),
      draft.country.trim(),
    ];
    const hasAny = values.some(Boolean);
    if (!hasAny) return undefined;

    if (
      !draft.line1.trim() ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      draft.postalCode.trim().length < 3 ||
      draft.country.trim().length < 2
    ) {
      return `Please complete line 1, city, state, postal code, and country for your ${label}, or clear all fields.`;
    }
    return undefined;
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (savingRef.current || !profile) return;

    const effectiveShipping = sameAsBilling ? billingAddress : shippingAddress;
    const nextErrors: typeof fieldErrors = {};

    if (!displayName.trim()) {
      nextErrors.displayName = 'Full name is required.';
    }
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      if (
        digits.length < 7 ||
        cleanPhone.length > FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX ||
        !QUOTE_PATTERNS.PHONE.test(cleanPhone)
      ) {
        nextErrors.phoneNumber =
          'Enter at least 7 digits (numbers, +, spaces, hyphens, or parentheses only).';
      }
    }

    const billingErr = validateAddressDraft(billingAddress, 'billing address');
    if (billingErr) nextErrors.billingAddress = billingErr;

    const shippingErr = validateAddressDraft(effectiveShipping, 'shipping address');
    if (shippingErr) nextErrors.shippingAddress = shippingErr;

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSaveError(null);
      setSaveSuccess(null);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setFieldErrors({});

    try {
      await saveProfile({
        displayName,
        phoneNumber,
        accountType,
        organizationName,
        billingAddress: addressDraftToPayload(billingAddress),
        shippingAddress: addressDraftToPayload(effectiveShipping),
      });
      if (sameAsBilling) {
        setShippingAddress({ ...billingAddress });
      }
      setSaveSuccess('Your account profile has been saved.');
    } catch (error) {
      setSaveError(
        error instanceof AuthServiceError
          ? error.message
          : 'Could not save your profile changes right now. Please try again.'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', {
        replace: true,
        state: { notice: 'You have been signed out of your Priya Furniture account.' },
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const createdDate = firestoreTimestampToDate(profile?.createdAt);
  const updatedDate = firestoreTimestampToDate(profile?.updatedAt);
  const providerLabel = user?.providerData?.some((p) => p.providerId === 'google.com')
    ? 'Google Sign-In'
    : 'Email & Password';
  const canEditAccountType =
    !profile || profile.accountType === 'individual' || profile.accountType === 'business';
  const isSuspended = profile?.accountStatus === 'suspended';

  return (
    <main className="bg-white">
      {/* Header Band */}
      <section className="bg-[#F5F0E8] border-b border-[#D9CBB8]/80 pt-28 sm:pt-32 lg:pt-36 pb-12 lg:pb-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-sm font-medium text-[#9B4D17]">Account Profile</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#202735] leading-tight">
              {profile?.displayName || user?.displayName || 'My Account'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#586070]">
              <span>{profile?.email || user?.email}</span>
              {profile?.accountType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatEnumLabel(profile.accountType)} Account</span>
                </>
              )}
              {createdDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Member since {formatDateDisplay(createdDate)}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="self-start md:self-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-white text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Editable Profile Form */}
            <div className="lg:col-span-8">
              {profileLoading && !profile ? (
                <div
                  role="status"
                  className="rounded-3xl bg-[#FAF8F4] border border-[#D9CBB8]/80 p-8 flex items-center gap-3 text-sm text-[#202735]"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-[#9B4D17]" aria-hidden="true" />
                  <span>Loading your saved account profile...</span>
                </div>
              ) : profileError && !profile ? (
                <div
                  role="alert"
                  className="rounded-3xl bg-[#FDF4F0] border border-[#9B4D17]/55 p-6 space-y-4 text-sm text-[#7E3D10]"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="font-medium">Unable to load your profile record</p>
                      <p className="text-xs leading-relaxed">{profileError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshProfile()}
                    className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2 text-xs font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retry Loading Profile</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSave} noValidate className="space-y-10">
                  {isSuspended && (
                    <div
                      role="alert"
                      className="rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/55 p-4 flex items-start gap-3 text-sm text-[#7E3D10]"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        This account is currently suspended. Profile edits are disabled until the
                        account is reactivated.
                      </span>
                    </div>
                  )}

                  {saveSuccess && (
                    <div
                      role="status"
                      className="rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-4 flex items-start gap-3 text-sm text-[#202735]"
                    >
                      <CheckCircle2
                        className="w-5 h-5 shrink-0 mt-0.5 text-[#9B4D17]"
                        aria-hidden="true"
                      />
                      <span>{saveSuccess}</span>
                    </div>
                  )}

                  {saveError && (
                    <div
                      role="alert"
                      className="rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/55 p-4 flex items-start gap-3 text-sm text-[#7E3D10]"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Section 01: Contact & Organization */}
                  <div className="space-y-6">
                    <div className="border-b border-[#EAE1D3] pb-3">
                      <h2 className="font-display text-2xl font-medium text-[#202735]">
                        01. Personal & Business Details
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="profile-name"
                          className="block text-xs font-medium text-[#202735] mb-2"
                        >
                          Full Name <span className="text-[#9B4D17]">*</span>
                        </label>
                        <input
                          id="profile-name"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX}
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value);
                            setSaveSuccess(null);
                            if (fieldErrors.displayName) {
                              setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                            }
                          }}
                          aria-invalid={Boolean(fieldErrors.displayName)}
                          className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] transition-colors disabled:bg-[#FAF8F4] ${
                            fieldErrors.displayName
                              ? 'border-[#9B4D17]'
                              : 'border-[#D9CBB8] focus:border-[#202735]'
                          }`}
                        />
                        {fieldErrors.displayName && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{fieldErrors.displayName}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="profile-email"
                          className="block text-xs font-medium text-[#202735] mb-2"
                        >
                          Email Address <span className="text-[#586070] font-normal">(Account ID)</span>
                        </label>
                        <input
                          id="profile-email"
                          type="email"
                          value={profile?.email || user?.email || ''}
                          readOnly
                          disabled
                          className="w-full px-4 py-3 text-sm rounded-xl bg-[#FAF8F4] border border-[#E9E0D3] text-[#586070] cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="profile-phone"
                          className="block text-xs font-medium text-[#202735] mb-2"
                        >
                          Phone Number <span className="text-[#586070] font-normal">(Optional)</span>
                        </label>
                        <input
                          id="profile-phone"
                          type="tel"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX}
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(e.target.value);
                            setSaveSuccess(null);
                            if (fieldErrors.phoneNumber) {
                              setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                            }
                          }}
                          aria-invalid={Boolean(fieldErrors.phoneNumber)}
                          placeholder="+91 90000 00000"
                          className={`w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border text-[#202735] placeholder:font-sans placeholder:text-[#586070]/60 transition-colors disabled:bg-[#FAF8F4] ${
                            fieldErrors.phoneNumber
                              ? 'border-[#9B4D17]'
                              : 'border-[#D9CBB8] focus:border-[#202735]'
                          }`}
                        />
                        {fieldErrors.phoneNumber && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{fieldErrors.phoneNumber}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="profile-account-type"
                          className="block text-xs font-medium text-[#202735] mb-2"
                        >
                          Account Type
                        </label>
                        {canEditAccountType ? (
                          <select
                            id="profile-account-type"
                            disabled={isSuspended || saving}
                            value={accountType}
                            onChange={(e) => {
                              setAccountType(e.target.value as UserAccountType);
                              setSaveSuccess(null);
                            }}
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          >
                            <option value="business">Business / Salon / Commercial</option>
                            <option value="individual">Individual</option>
                          </select>
                        ) : (
                          <input
                            id="profile-account-type"
                            type="text"
                            value={formatEnumLabel(accountType)}
                            readOnly
                            disabled
                            className="w-full px-4 py-3 text-sm rounded-xl bg-[#FAF8F4] border border-[#E9E0D3] text-[#586070] cursor-not-allowed"
                          />
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="profile-org"
                          className="block text-xs font-medium text-[#202735] mb-2"
                        >
                          Organization / Business Name{' '}
                          <span className="text-[#586070] font-normal">(Optional)</span>
                        </label>
                        <input
                          id="profile-org"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX}
                          value={organizationName}
                          onChange={(e) => {
                            setOrganizationName(e.target.value);
                            setSaveSuccess(null);
                          }}
                          placeholder="Salon, Spa, Studio, Clinic, or Company Name"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 02: Billing Address */}
                  <div className="space-y-5">
                    <div className="border-b border-[#EAE1D3] pb-3">
                      <h2 className="font-display text-2xl font-medium text-[#202735]">
                        02. Billing Address{' '}
                        <span className="font-sans text-sm font-normal text-[#586070]">
                          (Optional)
                        </span>
                      </h2>
                    </div>

                    {fieldErrors.billingAddress && (
                      <p className="flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{fieldErrors.billingAddress}</span>
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="billing-line1"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          Street Address / Building
                        </label>
                        <input
                          id="billing-line1"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX}
                          value={billingAddress.line1}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, line1: e.target.value }));
                            setSaveSuccess(null);
                            if (fieldErrors.billingAddress) {
                              setFieldErrors((prev) => ({ ...prev, billingAddress: undefined }));
                            }
                          }}
                          placeholder="Street, building name, or plot number"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="billing-line2"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          Floor, Suite, or Landmark{' '}
                          <span className="text-[#586070] font-normal">(Optional)</span>
                        </label>
                        <input
                          id="billing-line2"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX}
                          value={billingAddress.line2}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, line2: e.target.value }));
                            setSaveSuccess(null);
                          }}
                          placeholder="Floor, unit, or nearby landmark"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="billing-city"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          City
                        </label>
                        <input
                          id="billing-city"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_CITY_MAX}
                          value={billingAddress.city}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, city: e.target.value }));
                            setSaveSuccess(null);
                          }}
                          placeholder="e.g., Chennai"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="billing-state"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          State
                        </label>
                        <input
                          id="billing-state"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_STATE_MAX}
                          value={billingAddress.state}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, state: e.target.value }));
                            setSaveSuccess(null);
                          }}
                          placeholder="e.g., Tamil Nadu"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="billing-postal"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          PIN / Postal Code
                        </label>
                        <input
                          id="billing-postal"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_POSTAL_MAX}
                          value={billingAddress.postalCode}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, postalCode: e.target.value }));
                            setSaveSuccess(null);
                          }}
                          placeholder="e.g., 600001"
                          className="w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:font-sans placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="billing-country"
                          className="block text-xs font-medium text-[#202735] mb-1.5"
                        >
                          Country
                        </label>
                        <input
                          id="billing-country"
                          type="text"
                          disabled={isSuspended || saving}
                          maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_COUNTRY_MAX}
                          value={billingAddress.country}
                          onChange={(e) => {
                            setBillingAddress((prev) => ({ ...prev, country: e.target.value }));
                            setSaveSuccess(null);
                          }}
                          placeholder="e.g., India"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 03: Shipping Address */}
                  <div className="space-y-5">
                    <div className="border-b border-[#EAE1D3] pb-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-2xl font-medium text-[#202735]">
                        03. Shipping Address{' '}
                        <span className="font-sans text-sm font-normal text-[#586070]">
                          (Optional)
                        </span>
                      </h2>

                      <label className="inline-flex items-center gap-2 text-xs font-medium text-[#202735] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={isSuspended || saving}
                          checked={sameAsBilling}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSameAsBilling(checked);
                            if (checked) {
                              setShippingAddress({ ...billingAddress });
                              if (fieldErrors.shippingAddress) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  shippingAddress: undefined,
                                }));
                              }
                            }
                            setSaveSuccess(null);
                          }}
                          className="w-4 h-4 rounded accent-[#9B4D17]"
                        />
                        <span>Same as billing address</span>
                      </label>
                    </div>

                    {fieldErrors.shippingAddress && (
                      <p className="flex items-center gap-1.5 text-xs text-[#9B4D17]">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{fieldErrors.shippingAddress}</span>
                      </p>
                    )}

                    {!sameAsBilling && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="shipping-line1"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            Street Address / Site Location
                          </label>
                          <input
                            id="shipping-line1"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX}
                            value={shippingAddress.line1}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({ ...prev, line1: e.target.value }));
                              setSaveSuccess(null);
                              if (fieldErrors.shippingAddress) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  shippingAddress: undefined,
                                }));
                              }
                            }}
                            placeholder="Delivery street, building, or site address"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="shipping-line2"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            Floor, Suite, or Landmark{' '}
                            <span className="text-[#586070] font-normal">(Optional)</span>
                          </label>
                          <input
                            id="shipping-line2"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_LINE_MAX}
                            value={shippingAddress.line2}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({ ...prev, line2: e.target.value }));
                              setSaveSuccess(null);
                            }}
                            placeholder="Floor, unit, or nearby landmark"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="shipping-city"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            City
                          </label>
                          <input
                            id="shipping-city"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_CITY_MAX}
                            value={shippingAddress.city}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({ ...prev, city: e.target.value }));
                              setSaveSuccess(null);
                            }}
                            placeholder="e.g., Bengaluru"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="shipping-state"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            State
                          </label>
                          <input
                            id="shipping-state"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_STATE_MAX}
                            value={shippingAddress.state}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({ ...prev, state: e.target.value }));
                              setSaveSuccess(null);
                            }}
                            placeholder="e.g., Karnataka"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="shipping-postal"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            PIN / Postal Code
                          </label>
                          <input
                            id="shipping-postal"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_POSTAL_MAX}
                            value={shippingAddress.postalCode}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({
                                ...prev,
                                postalCode: e.target.value,
                              }));
                              setSaveSuccess(null);
                            }}
                            placeholder="e.g., 560001"
                            className="w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:font-sans placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="shipping-country"
                            className="block text-xs font-medium text-[#202735] mb-1.5"
                          >
                            Country
                          </label>
                          <input
                            id="shipping-country"
                            type="text"
                            disabled={isSuspended || saving}
                            maxLength={FIRESTORE_SCHEMA_LIMITS.ADDRESS_COUNTRY_MAX}
                            value={shippingAddress.country}
                            onChange={(e) => {
                              setShippingAddress((prev) => ({ ...prev, country: e.target.value }));
                              setSaveSuccess(null);
                            }}
                            placeholder="e.g., India"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] disabled:bg-[#FAF8F4]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#EAE1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-xs text-[#586070]">
                      Account role and status are managed securely by Priya Furniture.
                    </p>
                    <button
                      type="submit"
                      disabled={isSuspended || saving || !profile}
                      className="min-h-[48px] group inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_10px_24px_-6px_rgba(155,77,23,0.45)] cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <span>Save Profile Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Sidebar: Read-Only Account Metadata & Quick Links */}
            <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              <div className="rounded-3xl bg-[#F5F0E8] border border-[#D9CBB8] p-7 space-y-5">
                <h2 className="font-display text-xl font-medium text-[#202735]">
                  Account Details
                </h2>

                <dl className="divide-y divide-[#D9CBB8]/70 text-sm">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Role</dt>
                    <dd className="font-medium text-[#202735]">
                      {profile ? formatEnumLabel(profile.role) : '—'}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Account Status</dt>
                    <dd className="font-medium text-[#202735]">
                      {profile ? formatEnumLabel(profile.accountStatus) : '—'}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Sign-In Method</dt>
                    <dd className="text-[#202735]">{providerLabel}</dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Created</dt>
                    <dd className="font-mono text-xs text-[#202735] tabular-nums">
                      {formatDateDisplay(createdDate)}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-xs text-[#586070]">Last Updated</dt>
                    <dd className="font-mono text-xs text-[#202735] tabular-nums">
                      {formatDateDisplay(updatedDate)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl bg-[#202735] text-[#F5F0E8] p-7 space-y-5">
                <div className="space-y-2">
                  <h3 className="font-display text-xl font-medium text-white">
                    Ready for a project quote?
                  </h3>
                  <p className="text-xs text-[#D9CBB8] leading-relaxed">
                    Browse all 59 Priya Furniture models across our four collections or submit a
                    multi-item B2B quotation inquiry directly to our sales desk.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Link
                    to="/quotations"
                    className="min-h-[44px] group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-white text-[#202735] hover:bg-[#F5F0E8] transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    <span>My Quotations</span>
                  </Link>
                  <Link
                    to="/quote"
                    className="min-h-[44px] group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-colors whitespace-nowrap"
                  >
                    <span>Request a Quote</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    to="/catalogue"
                    className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-full text-white border border-white/25 hover:border-white transition-colors whitespace-nowrap"
                  >
                    Browse Catalogue
                  </Link>
                </div>

                <p className="pt-3 border-t border-white/12 text-xs text-[#D9CBB8]/80">
                  Direct sales:{' '}
                  <a
                    href={CATALOGUE_CONTACT.mobileHref}
                    className="font-mono text-white tabular-nums underline underline-offset-2"
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
