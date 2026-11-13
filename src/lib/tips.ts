// Per-screen coach-mark flags. A tip shows once, then never again until
// the user resets tips from Profile & Settings.

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIP_KEY_PREFIX = 'scanrisk:tips:v1:';

export async function hasSeenTip(screen: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TIP_KEY_PREFIX + screen)) === '1';
  } catch {
    return false;
  }
}

export async function markTipSeen(screen: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TIP_KEY_PREFIX + screen, '1');
  } catch {
    // Ignore.
  }
}

export async function resetTips(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tipKeys = keys.filter((k) => k.startsWith(TIP_KEY_PREFIX));
    if (tipKeys.length > 0) await AsyncStorage.multiRemove(tipKeys);
  } catch {
    // Ignore.
  }
}
