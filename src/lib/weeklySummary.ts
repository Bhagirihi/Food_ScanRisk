// Local weekly scan summary notification (Sundays ~09:00). The content is
// built from the user's REAL last-7-days history — scan count, average
// score, low-risk share — and nothing is scheduled when there are no scans
// in the last 7 days. Local only: no server, no push token.
// Notifications are not supported on web, so every entry point here is a
// silent no-op there.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getHistory, type ScanRecord } from './history';

const ENABLED_KEY = 'scanrisk:weekly-summary-enabled:v1';
const ASKED_KEY = 'scanrisk:notif-prompt-asked:v1';
const SCHEDULED_ID_KEY = 'scanrisk:weekly-summary-id:v1';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isWeb = Platform.OS === 'web';

/** "3 scans · avg 18/50 · 67% low-risk" — null when no scans in 7 days. */
export function buildWeeklySummaryBody(records: ScanRecord[], now = Date.now()): string | null {
  const recent = records.filter((r) => now - r.scannedAt < SEVEN_DAYS_MS);
  if (recent.length === 0) return null;
  const avg = Math.round(recent.reduce((s, r) => s + r.score, 0) / recent.length);
  const low = recent.filter((r) => r.band === 'low').length;
  const lowPct = Math.round((low / recent.length) * 100);
  const scans = recent.length === 1 ? '1 scan' : `${recent.length} scans`;
  return `${scans} this week · average score ${avg}/50 · ${lowPct}% low-risk`;
}

export async function getWeeklySummaryEnabled(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setWeeklySummaryEnabled(value: boolean): Promise<void> {
  if (isWeb) return;
  try {
    await AsyncStorage.setItem(ENABLED_KEY, value ? '1' : '0');
  } catch {
    // Ignore.
  }
}

/** True once the first-Home explainer card has been answered or dismissed. */
export async function wasNotificationPromptAsked(): Promise<boolean> {
  if (isWeb) return true;
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markNotificationPromptAsked(): Promise<void> {
  if (isWeb) return;
  try {
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch {
    // Ignore.
  }
}

export async function getNotificationPermissionGranted(): Promise<boolean> {
  if (isWeb) return false;
  try {
    const perms = await Notifications.getPermissionsAsync();
    return perms.granted;
  } catch {
    return false;
  }
}

/** Triggers the system permission sheet. Returns true when granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  try {
    const perms = await Notifications.requestPermissionsAsync();
    return perms.granted;
  } catch {
    return false;
  }
}

async function cancelStoredScheduled(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(SCHEDULED_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(SCHEDULED_ID_KEY);
    }
  } catch {
    // Ignore — a stale id is harmless; the next schedule replaces it.
  }
}

export async function cancelWeeklySummary(): Promise<void> {
  if (isWeb) return;
  await cancelStoredScheduled();
}

/**
 * Recompute the summary from current history and (re)schedule it for
 * Sunday 09:00. Silent no-op when the toggle is off, permission is not
 * granted, or there are no scans in the last 7 days. Safe to call on every
 * Home entry — the old notification is cancelled first so the content never
 * goes stale.
 */
export async function refreshWeeklySummary(): Promise<void> {
  if (isWeb) return;
  try {
    const enabled = await getWeeklySummaryEnabled();
    if (!enabled) {
      await cancelStoredScheduled();
      return;
    }
    if (!(await getNotificationPermissionGranted())) {
      await cancelStoredScheduled();
      return;
    }
    const body = buildWeeklySummaryBody(await getHistory());
    if (!body) {
      await cancelStoredScheduled();
      return;
    }
    await cancelStoredScheduled();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your ScanRisk week',
        body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday
        hour: 9,
        minute: 0,
      },
    });
    await AsyncStorage.setItem(SCHEDULED_ID_KEY, id);
  } catch {
    // Notifications are best-effort; a failure must not break Home.
  }
}
