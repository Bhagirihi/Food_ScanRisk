// Scan history, stored on-device. Newest first, capped at 50 entries.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RiskBand } from './risk';

export interface ScanRecord {
  barcode: string;
  name: string;
  brand?: string;
  score: number;
  band: RiskBand;
  scannedAt: number;
}

const HISTORY_KEY = 'scanrisk:history:v1';
const MAX_ENTRIES = 50;

export async function saveScan(record: Omit<ScanRecord, 'scannedAt'>): Promise<void> {
  try {
    const existing = await getHistory();
    const entry: ScanRecord = { ...record, scannedAt: Date.now() };
    const next = [entry, ...existing.filter((r) => r.barcode !== record.barcode)].slice(
      0,
      MAX_ENTRIES,
    );
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // History is best-effort; a failure must not break the result screen.
  }
}

export async function getHistory(): Promise<ScanRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore.
  }
}
