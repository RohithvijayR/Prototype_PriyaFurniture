import appletConfig from '../../../firebase-applet-config.json';

export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export type FirebaseConfigSource = 'env' | 'applet-config' | 'unconfigured';

export interface ResolvedFirebaseConfig {
  isConfigured: boolean;
  source: FirebaseConfigSource;
  config: FirebaseRuntimeConfig | null;
  missingKeys: string[];
}

interface RawFirebaseEnv {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_DATABASE_ID?: string;
  VITE_FIREBASE_DISABLED?: string;
}

interface RawAppletConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

const PLACEHOLDER_MARKERS = new Set([
  'remixed-project-id',
  'your_firebase_api_key',
  'your_firebase_project_id',
  'your_firebase_app_id',
  'placeholder',
]);

function normalizeValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value
    .trim()
    .replace(/,+$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim();
  if (!trimmed || PLACEHOLDER_MARKERS.has(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
}

function validateCandidate(candidate: RawAppletConfig): {
  valid: boolean;
  missingKeys: string[];
  config: FirebaseRuntimeConfig | null;
} {
  const apiKey = normalizeValue(candidate.apiKey);
  const authDomain = normalizeValue(candidate.authDomain);
  const projectId = normalizeValue(candidate.projectId);
  const storageBucket = normalizeValue(candidate.storageBucket);
  const messagingSenderId = normalizeValue(candidate.messagingSenderId);
  const appId = normalizeValue(candidate.appId);
  const firestoreDatabaseId = normalizeValue(candidate.firestoreDatabaseId);

  const missingKeys: string[] = [];
  if (!apiKey) missingKeys.push('VITE_FIREBASE_API_KEY');
  if (!authDomain) missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  if (!storageBucket) missingKeys.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!messagingSenderId) missingKeys.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId) missingKeys.push('VITE_FIREBASE_APP_ID');

  if (missingKeys.length > 0) {
    return { valid: false, missingKeys, config: null };
  }

  return {
    valid: true,
    missingKeys: [],
    config: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      firestoreDatabaseId:
        firestoreDatabaseId && firestoreDatabaseId !== '(default)'
          ? firestoreDatabaseId
          : undefined,
    },
  };
}

/**
 * Pure config resolver: prefers explicit VITE_FIREBASE_* environment variables
 * (used in .env.local and GitHub Actions deployments) and falls back to the
 * provisioned firebase-applet-config.json when env vars are not provided.
 */
export function resolveFirebaseConfig(
  env: RawFirebaseEnv,
  fallbackConfig?: RawAppletConfig | null
): ResolvedFirebaseConfig {
  if (normalizeValue(env.VITE_FIREBASE_DISABLED).toLowerCase() === 'true') {
    return {
      isConfigured: false,
      source: 'unconfigured',
      config: null,
      missingKeys: ['VITE_FIREBASE_DISABLED=true'],
    };
  }

  const envCandidate: RawAppletConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID,
  };

  const hasAnyEnvValue = Object.values(envCandidate).some((v) => normalizeValue(v).length > 0);
  if (hasAnyEnvValue) {
    const envCheck = validateCandidate(envCandidate);
    if (envCheck.valid && envCheck.config) {
      return {
        isConfigured: true,
        source: 'env',
        config: envCheck.config,
        missingKeys: [],
      };
    }
    return {
      isConfigured: false,
      source: 'unconfigured',
      config: null,
      missingKeys: envCheck.missingKeys,
    };
  }

  if (fallbackConfig) {
    const fallbackCheck = validateCandidate(fallbackConfig);
    if (fallbackCheck.valid && fallbackCheck.config) {
      return {
        isConfigured: true,
        source: 'applet-config',
        config: fallbackCheck.config,
        missingKeys: [],
      };
    }
    return {
      isConfigured: false,
      source: 'unconfigured',
      config: null,
      missingKeys: fallbackCheck.missingKeys,
    };
  }

  return {
    isConfigured: false,
    source: 'unconfigured',
    config: null,
    missingKeys: [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ],
  };
}

const runtimeEnv: RawFirebaseEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? {
        VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
        VITE_FIREBASE_DATABASE_ID: import.meta.env.VITE_FIREBASE_DATABASE_ID,
        VITE_FIREBASE_DISABLED: import.meta.env.VITE_FIREBASE_DISABLED,
      }
    : {};

export const resolvedFirebaseConfig: ResolvedFirebaseConfig = resolveFirebaseConfig(
  runtimeEnv,
  appletConfig as RawAppletConfig
);

export function isFirebaseConfigured(): boolean {
  return resolvedFirebaseConfig.isConfigured;
}
