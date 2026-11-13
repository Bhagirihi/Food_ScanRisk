// Pure parsing for Open Food Facts API responses. No React Native imports,
// so this module can be unit-tested with plain node. See openfoodfacts.ts
// for the network + cache layer.

export interface OffNutriments {
  energyKcal100?: number;
  sugars100?: number;
  salt100?: number;
  saturatedFat100?: number;
  fat100?: number;
  carbs100?: number;
  proteins100?: number;
  sodium100?: number;
  transFat100?: number;
}

export interface OffProduct {
  barcode: string;
  name: string;
  brands?: string;
  quantity?: string;
  /** Short food category, e.g. 'Spreads' — first non-generic en: categories tag. */
  category?: string;
  /** Raw category slug, e.g. 'spreads' — used for same-category search. */
  categoryTag?: string;
  /** Nutri-Score grade 'a'..'e', lowercase. Undefined when not available. */
  nutriscoreGrade?: string;
  /** NOVA processing group 1..4. Null when unknown. */
  novaGroup?: number | null;
  nutriments: OffNutriments;
  ingredientsText?: string;
  /** Additive codes, e.g. ['E250', 'E951']. */
  additives: string[];
  /** Allergen labels, e.g. ['nuts', 'milk']. */
  allergens: string[];
  traces: string[];
  imageUrl?: string;
  /** Serving size as printed on the label, e.g. '30 g'. */
  servingSize?: string;
  /** Serving size in grams, parsed from serving_quantity / serving_size. */
  servingQuantityG?: number;
}

export type LookupResult =
  | { status: 'found'; product: OffProduct }
  | { status: 'not-found' };

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Tags look like 'en:e250' / 'en:nuts' — take the part after the colon. */
function tagLabel(tag: unknown): string | undefined {
  if (typeof tag !== 'string') return undefined;
  const parts = tag.split(':');
  return parts.length > 1 ? parts[1] : parts[0];
}

function tagList(v: unknown, upper: boolean): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(tagLabel)
    .filter((x): x is string => !!x)
    .map((x) => (upper ? x.toUpperCase() : x));
}

/** Meal-type tags are not a food category ('breakfasts' is when you eat it). */
const GENERIC_CATEGORY_TAGS = new Set([
  'breakfasts',
  'snacks',
  'foods',
  'beverages',
  'meals',
  'desserts',
  'dishes',
  'groceries',
]);

/** First usable 'en:' categories tag: prettified label + raw slug. */
function categoryFromTags(v: unknown): { label: string; tag: string } | undefined {
  if (!Array.isArray(v)) return undefined;
  for (const raw of v) {
    if (typeof raw !== 'string' || !raw.startsWith('en:')) continue;
    const label = raw.slice(3);
    if (!label || GENERIC_CATEGORY_TAGS.has(label.toLowerCase())) continue;
    return {
      tag: label,
      label: label
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' '),
    };
  }
  return undefined;
}

/** Per-serving nutrient from its per-100g value and the serving size. */
export function perServing(value100: number | undefined, servingQuantityG: number | undefined): number | undefined {
  if (value100 == null || servingQuantityG == null) return undefined;
  return (value100 * servingQuantityG) / 100;
}

/**
 * Serving size in grams. Prefers the numeric `serving_quantity` field;
 * falls back to parsing the printed `serving_size` string ("30 g", "2.5 kg",
 * "15g"). Undefined when the product reports no usable serving size.
 */
function servingQuantityGrams(p: any): number | undefined {
  const q = num(p.serving_quantity);
  if (q != null && q > 0) return q;
  if (typeof p.serving_size !== 'string') return undefined;
  const m = p.serving_size.match(/([\d.,]+)\s*(kg|g)\b/i);
  if (!m) return undefined;
  const v = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(v) || v <= 0) return undefined;
  return m[2].toLowerCase() === 'kg' ? v * 1000 : v;
}

/**
 * Parse one Open Food Facts /api/v2/product/<barcode>.json response.
 * A missing product is HTTP 200 with `status: 0` — never a 404.
 */
export function parseOffProduct(code: string, json: any): LookupResult {
  if (!json || json.status !== 1 || !json.product) return { status: 'not-found' };
  const p = json.product;
  const nutriments = p.nutriments ?? {};
  const sodium = num(nutriments['sodium_100g']);
  const category = categoryFromTags(p.categories_tags);
  const product: OffProduct = {
    barcode: code,
    name:
      typeof p.product_name === 'string' && p.product_name.trim()
        ? p.product_name.trim()
        : `Product ${code}`,
    brands: typeof p.brands === 'string' ? p.brands : undefined,
    quantity: typeof p.quantity === 'string' ? p.quantity : undefined,
    category: category?.label,
    categoryTag: category?.tag,
    nutriscoreGrade:
      typeof p.nutriscore_grade === 'string' ? p.nutriscore_grade.toLowerCase() : undefined,
    novaGroup: typeof p.nova_group === 'number' ? p.nova_group : null,
    nutriments: {
      energyKcal100: num(nutriments['energy-kcal_100g']),
      sugars100: num(nutriments['sugars_100g']),
      salt100: num(nutriments['salt_100g']) ?? (sodium != null ? sodium * 2.5 : undefined),
      saturatedFat100: num(nutriments['saturated-fat_100g']),
      fat100: num(nutriments['fat_100g']),
      carbs100: num(nutriments['carbohydrates_100g']),
      proteins100: num(nutriments['proteins_100g']),
      sodium100: sodium,
      transFat100: num(nutriments['trans-fat_100g']),
    },
    ingredientsText: typeof p.ingredients_text === 'string' ? p.ingredients_text : undefined,
    additives: tagList(p.additives_tags, true),
    allergens: tagList(p.allergens_tags, false),
    traces: tagList(p.traces_tags, false),
    imageUrl: typeof p.image_url === 'string' ? p.image_url : undefined,
    servingSize: typeof p.serving_size === 'string' ? p.serving_size : undefined,
    servingQuantityG: servingQuantityGrams(p),
  };
  return { status: 'found', product };
}
