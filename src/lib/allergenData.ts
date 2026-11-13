// Allergen catalogue, pure (no React Native imports) so it can be
// unit-tested with plain node. IDs are stable — stored user selections are
// matched by id, so relabelling an entry never breaks an existing selection.

import type { RegionCode } from './regionInfer';

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
  {
    id: 'shellfish',
    label: 'Shellfish',
    tags: ['shellfish', 'shrimp', 'crab', 'lobster', 'prawn'],
  },
];

// The FDA's 9 major food allergens, in FDA order. US/CA users see exactly
// these; the gluten entry is labelled "Wheat" and the nuts entry "Tree nuts"
// (the underlying tags — and therefore matching — are unchanged).
const FDA9_IDS = ['dairy', 'egg', 'fish', 'shellfish', 'nuts', 'peanuts', 'gluten', 'soy', 'sesame'];

const US_LABEL_OVERRIDES: Record<string, string> = {
  gluten: 'Wheat',
  nuts: 'Tree nuts',
  peanuts: 'Peanut',
};

/**
 * The allergen set shown in the picker for a region. US/CA get the FDA 9;
 * every other region gets the full list (the previous 10 plus Shellfish).
 */
export function allergensForRegion(region: RegionCode): Allergen[] {
  if (region === 'US' || region === 'CA') {
    return FDA9_IDS.map((id) => {
      const a = ALLERGENS.find((x) => x.id === id);
      if (!a) throw new Error(`Missing allergen: ${id}`);
      const label = US_LABEL_OVERRIDES[id];
      return label ? { ...a, label } : a;
    });
  }
  return ALLERGENS;
}
