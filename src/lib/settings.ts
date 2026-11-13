// Small persisted settings: camera torch default, the Home Pro Tip
// dismissal, and whether coach-mark tips are enabled at all.

import AsyncStorage from '@react-native-async-storage/async-storage';

const TORCH_KEY = 'scanrisk:torch-default:v1';
const PROTIP_KEY = 'scanrisk:protip-dismissed:v1';
const TIPS_ENABLED_KEY = 'scanrisk:tips-enabled:v1';

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
