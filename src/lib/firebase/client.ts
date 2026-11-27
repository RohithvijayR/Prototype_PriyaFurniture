import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import {
  Firestore,
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { resolvedFirebaseConfig } from './config';

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let connectionTested = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!resolvedFirebaseConfig.isConfigured || !resolvedFirebaseConfig.config) {
    return null;
  }

  if (!cachedApp) {
    cachedApp =
      getApps().length > 0 ? getApp() : initializeApp(resolvedFirebaseConfig.config);
  }

  return cachedApp;
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app || !resolvedFirebaseConfig.config) {
    return null;
  }

  if (!cachedDb) {
    const databaseId = resolvedFirebaseConfig.config.firestoreDatabaseId;
    try {
      // Auto-detect long polling improves reliability inside preview iframes,
      // strict corporate networks, and mobile proxies where raw WebChannel streams abort.
      cachedDb = databaseId
        ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, databaseId)
        : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch {
      cachedDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    }
  }

  return cachedDb;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (!cachedAuth) {
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
}

export function isFirebaseReady(): boolean {
  return getFirestoreDb() !== null;
}

/**
 * Lightweight startup check verifying Firestore reachability when Firebase is configured.
 * A permission-denied response on /test/connection confirms the client reached Firestore
 * online; retries once on transient iframe/transport hiccups before reporting an offline
 * configuration error.
 */
export async function verifyFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  const db = getFirestoreDb();
  if (!db) return;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return;
    } catch (error) {
      const isOfflineErr =
        error instanceof Error && error.message.includes('the client is offline');
      if (!isOfflineErr) {
        // Permission-denied or not-found confirms Firestore backend is reachable.
        return;
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      console.error('Please check your Firebase configuration.');
    }
  }
}
