// Small persisted settings: camera torch default, the Home Pro Tip
// dismissal, whether coach-mark tips are enabled at all, and the last
// barcode entered manually (shown as a prefix on the scanner's manual card).

import AsyncStorage from '@react-native-async-storage/async-storage';

const TORCH_KEY = 'scanrisk:torch-default:v1';
const PROTIP_KEY = 'scanrisk:protip-dismissed:v1';
const TIPS_ENABLED_KEY = 'scanrisk:tips-enabled:v1';
const LAST_MANUAL_KEY = 'scanrisk:last-manual-barcode:v1';

export async function getTorchDefault(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TORCH_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setTorchDefault(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TORCH_KEY, value ? '1' : '0');
  } catch {
    // Ignore.
  }
}

export async function getProTipDismissed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROTIP_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setProTipDismissed(): Promise<void> {
  try {
    await AsyncStorage.setItem(PROTIP_KEY, '1');
  } catch {
    // Ignore.
  }
}

/** Tips are enabled by default; turning them off suppresses coach marks. */
export async function getTipsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TIPS_ENABLED_KEY)) !== '0';
  } catch {
    return true;
  }
}

export async function setTipsEnabled(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TIPS_ENABLED_KEY, value ? '1' : '0');
  } catch {
    // Ignore.
  }
}

/** Last barcode typed in by hand (digits only) — the scanner's manual card
 * shows its first 7 digits as a prefix when one exists, nothing otherwise. */
export async function getLastManualBarcode(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_MANUAL_KEY);
    return v && /^\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export async function setLastManualBarcode(value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_MANUAL_KEY, value);
  } catch {
    // Ignore.
  }
}
