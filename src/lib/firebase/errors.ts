import type { Auth } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type QuoteServiceErrorCode =
  | 'unconfigured'
  | 'validation'
  | 'permission-denied'
  | 'not-found'
  | 'index-required'
  | 'network'
  | 'quota-exceeded'
  | 'unknown';

export class QuoteServiceError extends Error {
  readonly code: QuoteServiceErrorCode;
  readonly retryable: boolean;

  constructor(code: QuoteServiceErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'QuoteServiceError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Formats and throws structured FirestoreErrorInfo diagnostics for permission/write failures.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authInstance?: Auth | null
): never {
  const currentUser = authInstance?.currentUser ?? null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Maps raw Firebase/Firestore SDK errors to safe, actionable user-facing errors.
 */
export function classifyQuoteSubmissionError(error: unknown): QuoteServiceError {
  if (error instanceof QuoteServiceError) {
    return error;
  }

  const firebaseCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);
  const normalized = `${firebaseCode} ${message}`.toLowerCase();

  if (
    normalized.includes('unavailable') ||
    normalized.includes('offline') ||
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('deadline-exceeded')
  ) {
    return new QuoteServiceError(
      'network',
      'Unable to reach the quotation server right now. Your form details are still saved on screen—please check your internet connection and try submitting again.',
      true
    );
  }

  if (normalized.includes('resource-exhausted') || normalized.includes('quota')) {
    return new QuoteServiceError(
      'quota-exceeded',
      'The online quotation service has temporarily reached its daily capacity. Please try again shortly or call our direct sales desk.',
      false
    );
  }

  if (normalized.includes('permission-denied') || normalized.includes('insufficient permissions')) {
    return new QuoteServiceError(
      'permission-denied',
      'Your quotation request could not be accepted by the server. Please verify all fields (valid email, phone number, quantities) or contact our direct sales desk.',
      false
    );
  }

  return new QuoteServiceError(
    'unknown',
    'We could not save your quotation request due to an unexpected error. Your form entries have been preserved—please retry or call our sales desk directly.',
    true
  );
}

/**
 * Maps raw Firestore read/query errors on `/quotationRequests` to safe, actionable customer messages.
 */
export function classifyQuotationReadError(error: unknown): QuoteServiceError {
  if (error instanceof QuoteServiceError) {
    return error;
  }

  const firebaseCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);
  const normalized = `${firebaseCode} ${message}`.toLowerCase();

  if (normalized.includes('failed-precondition') || normalized.includes('requires an index')) {
    return new QuoteServiceError(
      'index-required',
      'Your quotation history index is still initializing in Firestore. Please try again shortly.',
      true
    );
  }

  if (
    normalized.includes('unavailable') ||
    normalized.includes('offline') ||
    normalized.includes('network') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('deadline-exceeded')
  ) {
    return new QuoteServiceError(
      'network',
      'Unable to reach the quotation server right now. Please check your internet connection and try again.',
      true
    );
  }

  if (normalized.includes('resource-exhausted') || normalized.includes('quota')) {
    return new QuoteServiceError(
      'quota-exceeded',
      'The quotation service has temporarily reached its daily quota. Please try again later.',
      false
    );
  }

  if (normalized.includes('permission-denied') || normalized.includes('insufficient permissions')) {
    return new QuoteServiceError(
      'permission-denied',
      'This quotation record is unavailable or belongs to a different account.',
      false
    );
  }

  if (normalized.includes('not-found')) {
    return new QuoteServiceError(
      'not-found',
      'We could not locate this quotation request in your account.',
      false
    );
  }

  return new QuoteServiceError(
    'unknown',
    'We could not load your quotation requests right now. Please try again in a moment.',
    true
  );
}

export type AuthServiceErrorCode =
  | 'unconfigured'
  | 'validation'
  | 'invalid-credentials'
  | 'email-in-use'
  | 'weak-password'
  | 'popup-closed'
  | 'popup-blocked'
  | 'rate-limited'
  | 'user-disabled'
  | 'network'
  | 'permission-denied'
  | 'operation-not-allowed'
  | 'unauthorized-domain'
  | 'account-exists-different-credential'
  | 'unknown';

export class AuthServiceError extends Error {
  readonly code: AuthServiceErrorCode;

  constructor(code: AuthServiceErrorCode, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

/**
 * Maps raw Firebase Auth & Firestore profile SDK errors to safe, clear, user-facing messages
 * without leaking internal stack traces or enumerating private account details.
 */
export function classifyAuthError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code).toLowerCase()
      : '';
  const message = error instanceof Error ? error.message : String(error);
  const combined = `${rawCode} ${message}`.toLowerCase();

  if (
    rawCode === 'auth/invalid-credential' ||
    rawCode === 'auth/wrong-password' ||
    rawCode === 'auth/user-not-found' ||
    rawCode === 'auth/invalid-login-credentials'
  ) {
    return new AuthServiceError(
      'invalid-credentials',
      'Invalid email address or password. Please check your credentials and try again.'
    );
  }

  if (rawCode === 'auth/email-already-in-use') {
    return new AuthServiceError(
      'email-in-use',
      'An account with this email address already exists. Please sign in or reset your password.'
    );
  }

  if (rawCode === 'auth/invalid-email') {
    return new AuthServiceError(
      'validation',
      'Please enter a valid email address.'
    );
  }

  if (rawCode === 'auth/weak-password') {
    return new AuthServiceError(
      'weak-password',
      'Please choose a stronger password with at least 8 characters.'
    );
  }

  if (
    rawCode === 'auth/popup-closed-by-user' ||
    rawCode === 'auth/cancelled-popup-request'
  ) {
    return new AuthServiceError(
      'popup-closed',
      'Google sign-in was cancelled before completion. Please try again whenever you are ready.'
    );
  }

  if (rawCode === 'auth/popup-blocked') {
    return new AuthServiceError(
      'popup-blocked',
      'Your browser blocked the Google sign-in window. Please allow popups for this site and try again.'
    );
  }

  if (rawCode === 'auth/account-exists-with-different-credential') {
    return new AuthServiceError(
      'account-exists-different-credential',
      'An account already exists with this email using a different sign-in method. Please sign in with your original method.'
    );
  }

  if (rawCode === 'auth/user-disabled') {
    return new AuthServiceError(
      'user-disabled',
      'This account has been disabled. Please contact Priya Furniture support for assistance.'
    );
  }

  if (rawCode === 'auth/too-many-requests') {
    return new AuthServiceError(
      'rate-limited',
      'Too many attempts in a short period. Please wait a few minutes before trying again.'
    );
  }

  if (rawCode === 'auth/operation-not-allowed') {
    return new AuthServiceError(
      'operation-not-allowed',
      'This sign-in method is currently unavailable. Please try another method or contact support.'
    );
  }

  if (rawCode === 'auth/unauthorized-domain') {
    return new AuthServiceError(
      'unauthorized-domain',
      'This domain is not authorized for sign-in in Firebase Authentication settings.'
    );
  }

  if (
    rawCode === 'auth/network-request-failed' ||
    combined.includes('unavailable') ||
    combined.includes('offline') ||
    combined.includes('network') ||
    combined.includes('failed to fetch')
  ) {
    return new AuthServiceError(
      'network',
      'Unable to reach the authentication service. Please check your internet connection and try again.'
    );
  }

  if (
    combined.includes('permission-denied') ||
    combined.includes('insufficient permissions')
  ) {
    return new AuthServiceError(
      'permission-denied',
      'Your account profile could not be accessed due to permission restrictions. Please try signing in again.'
    );
  }

  return new AuthServiceError(
    'unknown',
    'We could not complete your request right now. Please try again in a moment.'
  );
}

