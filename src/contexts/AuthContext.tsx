import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase/client';
import { isFirebaseConfigured } from '../lib/firebase/config';
import { AuthServiceError, classifyAuthError } from '../lib/firebase/errors';
import {
  sendPasswordReset as sendPasswordResetService,
  signInWithEmail as signInWithEmailService,
  signInWithGoogle as signInWithGoogleService,
  signOutUser as signOutUserService,
  signUpWithEmail as signUpWithEmailService,
  type AuthSessionResult,
  type SignUpWithEmailInput,
} from '../services/authService';
import {
  ensureUserProfileDocument,
  getUserProfile,
  updateUserProfile,
} from '../services/userProfileService';
import type { FirestoreUser, UserProfileUpdateInput } from '../types/firestore';

interface AuthContextValue {
  user: User | null;
  profile: FirestoreUser | null;
  authLoading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  firebaseConfigured: boolean;
  signUpWithEmail: (input: SignUpWithEmailInput) => Promise<AuthSessionResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthSessionResult>;
  signInWithGoogle: () => Promise<AuthSessionResult>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (input: UserProfileUpdateInput) => Promise<FirestoreUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(firebaseConfigured);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const activeUidRef = useRef<string | null>(null);

  const syncProfileForUser = useCallback(async (firebaseUser: User) => {
    const uid = firebaseUser.uid;
    setProfileLoading(true);
    setProfileError(null);

    try {
      const existing = await getUserProfile(uid);
      if (activeUidRef.current !== uid) return;

      if (existing) {
        setProfile(existing);
      } else {
        const ensured = await ensureUserProfileDocument(firebaseUser);
        if (activeUidRef.current !== uid) return;
        setProfile(ensured.profile);
      }
    } catch (error) {
      if (activeUidRef.current !== uid) return;
      const classified = classifyAuthError(error);
      setProfileError(classified.message);
    } finally {
      if (activeUidRef.current === uid) {
        setProfileLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      activeUidRef.current = nextUser?.uid ?? null;
      setUser(nextUser);
      setAuthLoading(false);

      if (!nextUser) {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        return;
      }

      void syncProfileForUser(nextUser);
    });

    return () => unsubscribe();
  }, [syncProfileForUser]);

  const signUpWithEmail = useCallback(async (input: SignUpWithEmailInput) => {
    const result = await signUpWithEmailService(input);
    activeUidRef.current = result.user.uid;
    setUser(result.user);
    setProfile(result.profile);
    setProfileError(null);
    return result;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailService(email, password);
    activeUidRef.current = result.user.uid;
    setUser(result.user);
    setProfile(result.profile);
    setProfileError(null);
    return result;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithGoogleService();
    activeUidRef.current = result.user.uid;
    setUser(result.user);
    setProfile(result.profile);
    setProfileError(null);
    return result;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetService(email);
  }, []);

  const logout = useCallback(async () => {
    await signOutUserService();
    activeUidRef.current = null;
    setUser(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await syncProfileForUser(user);
  }, [syncProfileForUser, user]);

  const saveProfile = useCallback(
    async (input: UserProfileUpdateInput): Promise<FirestoreUser> => {
      if (!user || !profile) {
        throw new AuthServiceError(
          'permission-denied',
          'You must be signed in to update your profile.'
        );
      }
      const updated = await updateUserProfile(user.uid, input, profile);
      setProfile(updated);
      setProfileError(null);
      return updated;
    },
    [profile, user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      profileError,
      firebaseConfigured,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      logout,
      refreshProfile,
      saveProfile,
    }),
    [
      user,
      profile,
      authLoading,
      profileLoading,
      profileError,
      firebaseConfigured,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      logout,
      refreshProfile,
      saveProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
