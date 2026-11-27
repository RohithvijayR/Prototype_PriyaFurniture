import { useState, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { AuthServiceError } from '../lib/firebase/errors';
import { FIRESTORE_SCHEMA_LIMITS } from '../types/firestore';
import { QUOTE_PATTERNS } from '../types/quote';

export function ForgotPasswordPage() {
  const { sendPasswordReset, firebaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const submittingRef = useRef(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldError('Please enter the email address associated with your account.');
      setFormError(null);
      return;
    }
    if (!QUOTE_PATTERNS.EMAIL.test(cleanEmail)) {
      setFieldError('Please enter a valid email address.');
      setFormError(null);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFieldError(null);
    setFormError(null);

    try {
      await sendPasswordReset(cleanEmail);
      setSentToEmail(cleanEmail);
    } catch (error) {
      setFormError(
        error instanceof AuthServiceError
          ? error.message
          : 'Unable to send a password reset email right now. Please try again.'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Reset your password"
      subtitle="Enter the email address registered with your Priya Furniture account and we will send you a secure reset link."
    >
      {!firebaseConfigured && (
        <div
          role="status"
          className="mb-6 rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-4 flex items-start gap-3 text-sm text-[#202735]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9B4D17]" aria-hidden="true" />
          <div>
            <p className="font-medium">Password reset is unavailable in this environment</p>
            <p className="text-xs mt-0.5 text-[#586070]">
              Firebase configuration is not active.
            </p>
          </div>
        </div>
      )}

      {sentToEmail ? (
        <div className="space-y-6">
          <div
            role="status"
            className="rounded-2xl bg-[#FAF8F4] border border-[#D9CBB8] p-6 space-y-3"
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-[#9B4D17]">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Reset Instructions Sent</span>
            </div>
            <p className="text-sm text-[#202735] leading-relaxed">
              If an account is registered for{' '}
              <span className="font-medium break-all">{sentToEmail}</span>, a password reset link
              has been sent. Please check your inbox and spam folder.
            </p>
            <p className="text-xs text-[#586070] leading-relaxed">
              Note: If you originally signed up with Google Sign-In, return to the login page and
              choose &ldquo;Sign in with Google&rdquo;.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full bg-[#202735] text-white hover:bg-[#2E3647] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Return to Sign In</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSentToEmail(null);
                setEmail('');
                setFormError(null);
              }}
              className="min-h-[44px] px-5 py-2.5 text-sm font-medium rounded-full text-[#202735] border border-[#D9CBB8] hover:border-[#202735] transition-colors cursor-pointer whitespace-nowrap"
            >
              Use Another Email
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {formError && (
            <div
              role="alert"
              className="rounded-2xl bg-[#FDF4F0] border border-[#9B4D17]/55 p-4 flex items-start gap-3 text-sm text-[#7E3D10]"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-medium text-[#202735] mb-2"
              >
                Email Address <span className="text-[#9B4D17]">*</span>
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                maxLength={FIRESTORE_SCHEMA_LIMITS.USER_EMAIL_MAX}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                  if (formError) setFormError(null);
                }}
                aria-invalid={Boolean(fieldError)}
                placeholder="name@company.com"
                className={`w-full px-4 py-3 text-sm rounded-xl bg-white border text-[#202735] placeholder:text-[#586070]/60 transition-colors ${
                  fieldError
                    ? 'border-[#9B4D17]'
                    : 'border-[#D9CBB8] focus:border-[#202735]'
                }`}
              />
              {fieldError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9B4D17]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!firebaseConfigured || submitting}
              className="w-full min-h-[48px] group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-full bg-[#9B4D17] text-white hover:bg-[#7E3D10] transition-all duration-200 shadow-[0_10px_24px_-6px_rgba(155,77,23,0.45)] cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </form>

          <p className="pt-4 border-t border-[#EAE1D3] text-sm text-[#586070] text-center">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="font-medium text-[#202735] hover:text-[#9B4D17] underline underline-offset-4 transition-colors"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
