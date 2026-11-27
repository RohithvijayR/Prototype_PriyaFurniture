import { useState, useRef, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthShell, GoogleSignInButton } from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { AuthServiceError } from '../lib/firebase/errors';
import { FIRESTORE_SCHEMA_LIMITS } from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle, firebaseConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const routeState = location.state as { from?: string; notice?: string } | null;
  const redirectTarget =
    typeof routeState?.from === 'string' &&
    routeState.from.startsWith('/') &&
    !routeState.from.startsWith('//') &&
    routeState.from !== '/login' &&
    routeState.from !== '/register'
      ? routeState.from
      : '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submittingRef = useRef(false);

  const validate = (): LoginErrors => {
    const next: LoginErrors = {};
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      next.email = 'Please enter your email address.';
    } else if (!QUOTE_PATTERNS.EMAIL.test(cleanEmail)) {
      next.email = 'Please enter a valid email address.';
    }

    if (!password) {
      next.password = 'Please enter your password.';
    }

    return next;
  };

  const handleEmailLogin = async (e: FormEvent<HTMLFormElement>) => {
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
      await signInWithEmail(email, password);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthServiceError
          ? error.message
          : 'Unable to sign in right now. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      eyebrow="Client & Trade Account"
      title="Sign in to your account"
      subtitle="Access your saved Priya Furniture contact profile, billing details, and shipping address."
    >
      {!firebaseConfigured && (
        <div
          role="status"
          className="mb-6 rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-4 flex items-start gap-3 text-sm text-[#202735]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9B4D17]" aria-hidden="true" />
          <div>
            <p className="font-medium">Account sign-in is unavailable in this environment</p>
            <p className="text-xs mt-0.5 text-[#586070]">
              Firebase configuration is not active. You can still explore the catalogue and
              contact our sales desk directly.
            </p>
          </div>
        </div>
      )}

      {routeState?.notice && !formError && (
        <div
          role="status"
          className="mb-6 rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-4 flex items-start gap-3 text-sm text-[#202735]"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#9B4D17]" aria-hidden="true" />
          <span>{routeState.notice}</span>
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
          onClick={handleGoogleLogin}
          disabled={!firebaseConfigured || submitting}
          loading={googleLoading}
          label="Sign in with Google"
        />

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#EAE1D3]" />
          <span className="px-3 text-xs text-[#586070] bg-white">or sign in with email</span>
          <div className="flex-grow border-t border-[#EAE1D3]" />
        </div>

        <form onSubmit={handleEmailLogin} noValidate className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-[#202735] mb-2">
              Email Address <span className="text-[#9B4D17]">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              maxLength={FIRESTORE_SCHEMA_LIMITS.USER_EMAIL_MAX}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                if (formError) setFormError(null);
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

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="login-password" className="block text-xs font-medium text-[#202735]">
                Password <span className="text-[#9B4D17]">*</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[#9B4D17] hover:text-[#7E3D10] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                  if (formError) setFormError(null);
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                placeholder="Enter your password"
                className={`w-full pl-4 pr-12 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
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

          <button
            type="submit"
            disabled={!firebaseConfigured || submitting || googleLoading}
            className="w-full min-h-[48px] group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_10px_24px_-6px_rgba(155,77,23,0.45)] cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </form>

        <p className="pt-4 border-t border-[#EAE1D3] text-sm text-[#586070] text-center">
          New to Priya Furniture?{' '}
          <Link
            to="/register"
            state={routeState?.from ? { from: routeState.from } : undefined}
            className="font-medium text-[#202735] hover:text-[#9B4D17] underline underline-offset-4 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
