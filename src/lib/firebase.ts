// Firebase Auth (email + password) for ScanRisk.
//
// The project is the Firebase console project "scanrisk" (web app
// "ScanRisk Web"). The apiKey below is a client identifier, not a secret —
// Firebase client SDKs ship it inside the app (it is also in
// google-services.json). Access is governed by Firebase Auth rules, not by
// this key.
//
// Uses the Firebase JS SDK, which runs in Expo Go. The native
// @react-native-firebase SDK would need a dev build (it has no native
// module in Expo Go). Session persistence is AsyncStorage, so a signed-in
// user stays signed in across restarts — sign-out happens only from
// Profile. Email/password only: no Google or Apple sign-in (his call,
// 15 Nov 2026). Supabase was the previous auth provider; it is fully
// removed — see the git history for src/lib/supabase.ts.
//
// NOTE: auth is imported from '@firebase/auth', not 'firebase/auth'.
// The umbrella package (v13) does not forward the react-native export
// condition for the auth subpath, so 'firebase/auth' always resolves to
// the web build, which has no getReactNativePersistence (and would keep
// the session only in memory). '@firebase/auth' is the same SDK — it is
// the package 'firebase/auth' re-exports — and its react-native build
// (picked by Metro and by tsc via the expo base's customConditions)
// provides the AsyncStorage persistence. Do not "fix" this import back
// to 'firebase/auth' without checking the session still survives a
// restart.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from '@firebase/auth';

import { clearGuest } from './session';

const firebaseConfig = {
  apiKey: 'AIzaSyDqIsnpNC7pMEmtoO_n36lE9DvReq7E6Aw',
  authDomain: 'scanrisk.firebaseapp.com',
  projectId: 'scanrisk',
  storageBucket: 'scanrisk.firebasestorage.app',
  messagingSenderId: '656974847687',
  appId: '1:656974847687:web:0cf0bda358766f1f8be8e2',
  measurementId: 'G-899Y65PFDC',
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

let auth: Auth;
try {
  // AsyncStorage persistence: the session survives app restarts. (getAuth
  // alone would keep it only in memory, so sign-in would not stick.)
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  // Already initialized (e.g. Fast Refresh re-ran this module) — reuse it.
  auth = getAuth(app);
}

export { auth };
export type { User };

/** The currently signed-in user, or null. Restored from storage on boot. */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to auth state. Fires immediately with the restored user (or
 * null), then on every sign-in / sign-out. Returns the unsubscribe fn.
 */
export function onAuthStateChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  await clearGuest();
}

/** Friendly message for a Firebase Auth error, or the raw message. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Wrong email or password. Try again.';
    case 'auth/user-not-found':
      return 'No account found for this email.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'No network connection. Check your internet and try again.';
    default:
      return (error as { message?: string } | null)?.message ?? fallback;
  }
}
