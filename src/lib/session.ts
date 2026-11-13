// First-run flags: onboarding completion and guest mode (used when no
// Supabase project is configured yet, so the scanner stays usable).

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDED_KEY = 'scanrisk:onboarded:v1';
const GUEST_KEY = 'scanrisk:guest:v1';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Ignore — the layout guard re-checks and will show onboarding again.
  }
}

export async function clearOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDED_KEY);
  } catch {
    // Ignore.
  }
}

export async function isGuest(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(GUEST_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setGuest(): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_KEY, '1');
  } catch {
    // Ignore.
  }
}

export async function clearGuest(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_KEY);
  } catch {
    // Ignore.
  }
}
