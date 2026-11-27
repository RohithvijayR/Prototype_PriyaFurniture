import { useState, useRef, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell, GoogleSignInButton } from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { AuthServiceError } from '../lib/firebase/errors';
import {
  FIRESTORE_SCHEMA_LIMITS,
  type ClientSelectableAccountType,
} from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';

interface RegisterErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  organizationName?: string;
}

export function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle, firebaseConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const routeState = location.state as { from?: string } | null;
  const redirectTarget =
    typeof routeState?.from === 'string' &&
    routeState.from.startsWith('/') &&
    !routeState.from.startsWith('//') &&
    routeState.from !== '/login' &&
    routeState.from !== '/register'
      ? routeState.from
      : '/account';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<ClientSelectableAccountType>('business');
  const [organizationName, setOrganizationName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submittingRef = useRef(false);

  const clearFieldError = (field: keyof RegisterErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formError) setFormError(null);
  };

  const validate = (): RegisterErrors => {
    const next: RegisterErrors = {};

    const cleanName = displayName.trim();
    if (!cleanName) {
      next.displayName = 'Please enter your full name.';
    } else if (cleanName.length > FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX) {
      next.displayName = `Name must be ${FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX} characters or fewer.`;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      next.email = 'Please enter your email address.';
    } else if (!QUOTE_PATTERNS.EMAIL.test(cleanEmail)) {
      next.email = 'Please enter a valid email address.';
    }

    if (!password) {
      next.password = 'Please create a password.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.';
    }

    const cleanPhone = phoneNumber.trim();
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      if (
        digits.length < 7 ||
        cleanPhone.length > FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX ||
        !QUOTE_PATTERNS.PHONE.test(cleanPhone)
      ) {
        next.phoneNumber =
          'Enter at least 7 digits (numbers, +, spaces, hyphens, or parentheses only).';
      }
    }

    if (organizationName.trim().length > FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX) {
      next.organizationName = `Organization name must be ${FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX} characters or fewer.`;
    }

    return next;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await signUpWithEmail({
        displayName,
        email,
        password,
        accountType,
        organizationName,
        phoneNumber,
      });
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthServiceError
          ? error.message
          : 'We could not create your account right now. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setGoogleLoading(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await signInWithGoogle();
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthServiceError
          ? error.message
          : 'Unable to complete Google sign-in. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New Account Registration"
      title="Create your account"
      subtitle="Set up a Priya Furniture client account to maintain your contact details and delivery addresses."
    >
      {!firebaseConfigured && (
        <div
          role="status"
          className="mb-6 rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-4 flex items-start gap-3 text-sm text-[#202735]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9B4D17]" aria-hidden="true" />
          <div>
            <p className="font-medium">Account registration is unavailable in this environment</p>
            <p className="text-xs mt-0.5 text-[#586070]">
              Firebase configuration is not active. Public catalogue browsing remains available.
            </p>
          </div>
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-6 rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/55 p-4 flex items-start gap-3 text-sm text-[#7E3D10]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-6">
        <GoogleSignInButton
          onClick={handleGoogleRegister}
          disabled={!firebaseConfigured || submitting}
          loading={googleLoading}
          label="Continue with Google"
        />

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#EAE1D3]" />
          <span className="px-3 text-xs text-[#586070] bg-white">or register with email</span>
          <div className="flex-grow border-t border-[#EAE1D3]" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Account Type Segmented Control */}
          <div>
            <span className="block text-xs font-medium text-[#202735] mb-2">
              Account Type <span className="text-[#9B4D17]">*</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Account type"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F5F0E8] border border-[#D9CBB8]/80"
            >
              <button
                type="button"
                role="radio"
                aria-checked={accountType === 'business'}
                onClick={() => setAccountType('business')}
                className={`min-h-[40px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  accountType === 'business'
                    ? 'bg-white text-[#202735] shadow-sm'
                    : 'text-[#586070] hover:text-[#202735]'
                }`}
              >
                Business / Salon
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={accountType === 'individual'}
                onClick={() => setAccountType('individual')}
                className={`min-h-[40px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  accountType === 'individual'
                    ? 'bg-white text-[#202735] shadow-sm'
                    : 'text-[#586070] hover:text-[#202735]'
                }`}
              >
                Individual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Full Name <span className="text-[#9B4D17]">*</span>
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                maxLength={FIRESTORE_SCHEMA_LIMITS.USER_NAME_MAX}
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  clearFieldError('displayName');
                }}
                aria-invalid={Boolean(fieldErrors.displayName)}
                placeholder="Your full name"
                className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
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
                htmlFor="register-email"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Email Address <span className="text-[#9B4D17]">*</span>
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                maxLength={FIRESTORE_SCHEMA_LIMITS.USER_EMAIL_MAX}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                placeholder="name@company.com"
                className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                  fieldErrors.email
                    ? 'border-[#9B4D17]'
                    : 'border-[#D9CBB8] focus:border-[#202735]'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-org"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Business / Organization Name{' '}
                <span className="text-[#586070] font-normal">(Optional)</span>
              </label>
              <input
                id="register-org"
                type="text"
                autoComplete="organization"
                maxLength={FIRESTORE_SCHEMA_LIMITS.ORGANIZATION_NAME_MAX}
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value);
                  clearFieldError('organizationName');
                }}
                aria-invalid={Boolean(fieldErrors.organizationName)}
                placeholder="Salon, Spa, Studio, or Company"
                className="w-full px-4 py-3 text-sm rounded-xl bg-white border border-[#D9CBB8] text-[#202735] placeholder:text-[#586070]/60 focus:border-[#202735] transition-colors"
              />
              {fieldErrors.organizationName && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.organizationName}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Phone Number <span className="text-[#586070] font-normal">(Optional)</span>
              </label>
              <input
                id="register-phone"
                type="tel"
                autoComplete="tel"
                maxLength={FIRESTORE_SCHEMA_LIMITS.USER_PHONE_MAX}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  clearFieldError('phoneNumber');
                }}
                aria-invalid={Boolean(fieldErrors.phoneNumber)}
                placeholder="+91 90000 00000"
                className={`w-full px-4 py-3 text-sm font-mono tabular-nums rounded-xl bg-white border text-[#202735] placeholder:font-sans placeholder:text-[#586070]/60 transition-colors ${
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Password <span className="text-[#9B4D17]">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  placeholder="At least 8 characters"
                  className={`w-full pl-4 pr-11 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                    fieldErrors.password
                      ? 'border-[#9B4D17]'
                      : 'border-[#D9CBB8] focus:border-[#202735]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-1.5 my-auto w-9 h-9 rounded-lg flex items-center justify-center text-[#586070] hover:text-[#202735] transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Confirm Password <span className="text-[#9B4D17]">*</span>
              </label>
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError('confirmPassword');
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                placeholder="Re-enter password"
                className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                  fieldErrors.confirmPassword
                    ? 'border-[#9B4D17]'
                    : 'border-[#D9CBB8] focus:border-[#202735]'
                }`}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!firebaseConfigured || submitting || googleLoading}
            className="w-full min-h-[48px] group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_10px_24px_-6px_rgba(155,77,23,0.45)] cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </form>

        <p className="pt-4 border-t border-[#EAE1D3] text-sm text-[#586070] text-center">
          Already have an account?{' '}
          <Link
            to="/login"
            state={routeState?.from ? { from: routeState.from } : undefined}
            className="font-medium text-[#202735] hover:text-[#9B4D17] underline underline-offset-4 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
