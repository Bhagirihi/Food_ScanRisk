// Allergen alerts: the user picks the allergens they care about (stored
// on-device); the Result screen warns when a picked allergen appears in a
// product's Open Food Facts allergen tags.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ALLERGENS, type Allergen } from './allergenData';

export { ALLERGENS, allergensForRegion } from './allergenData';
export type { Allergen } from './allergenData';

const KEY = 'scanrisk:allergens:v1';

export async function getSelectedAllergens(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => ALLERGENS.some((a) => a.id === id)) : [];
  } catch {
    return [];
  }
}

export async function setSelectedAllergens(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Ignore.
  }
}

/** Selected allergens whose tags appear in the product's OFF allergen labels. */
export function matchedAllergens(selectedIds: string[], productAllergens: string[]): Allergen[] {
  const labels = productAllergens.map((a) => a.toLowerCase());
  return ALLERGENS.filter(
    (a) => selectedIds.includes(a.id) && a.tags.some((t) => labels.some((l) => l.includes(t))),
  );
}
