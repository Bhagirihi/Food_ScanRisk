// Supabase Auth (email + password). Config comes from the environment:
//   EXPO_PUBLIC_SUPABASE_URL
//   EXPO_PUBLIC_SUPABASE_ANON_KEY
// Until both are set, `isSupabaseConfigured` is false and every function
// below is a safe no-op — the app runs in guest mode instead (see
// session.ts). Keys are never pasted into code; use a .env file or EAS
// secrets. Never commit a service-role key.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

import { clearGuest } from './session';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  client = createClient(url as string, anonKey as string, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = client;

export async function getSession(): Promise<Session | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data.session;
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  if (!client) {
    return { data: { subscription: { unsubscribe() {} } } };
  }
  return client.auth.onAuthStateChange((_event, session) => cb(session));
}

export async function signOut(): Promise<void> {
  if (client) await client.auth.signOut();
  await clearGuest();
}
