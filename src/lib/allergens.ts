// Allergen alerts: the user picks the allergens they care about (stored
// on-device); the Result screen warns when a picked allergen appears in a
// product's Open Food Facts allergen tags.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Allergen {
  id: string;
  label: string;
  /** Lowercase substrings matched against the product's OFF allergen labels. */
  tags: string[];
}

export const ALLERGENS: Allergen[] = [
  { id: 'gluten', label: 'Gluten', tags: ['gluten', 'wheat', 'barley', 'rye'] },
  { id: 'dairy', label: 'Dairy', tags: ['milk', 'dairy', 'lactose', 'whey', 'casein', 'butter', 'cream', 'cheese'] },
  { id: 'nuts', label: 'Nuts', tags: ['nuts', 'hazelnut', 'almond', 'walnut', 'cashew', 'pistachio'] },
  { id: 'peanuts', label: 'Peanuts', tags: ['peanut'] },
  { id: 'soy', label: 'Soy', tags: ['soy', 'soya'] },
  { id: 'egg', label: 'Egg', tags: ['egg'] },
  { id: 'fish', label: 'Fish', tags: ['fish'] },
  { id: 'sesame', label: 'Sesame', tags: ['sesame'] },
  { id: 'mustard', label: 'Mustard', tags: ['mustard'] },
  { id: 'celery', label: 'Celery', tags: ['celery'] },
];

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
