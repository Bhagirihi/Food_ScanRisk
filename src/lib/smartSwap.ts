// Smart Swap: find a lower-scoring alternative in the same category.
// Pure + fetch only — no React Native imports, so it can be unit-tested
// with plain node (see scripts/test-smart-swap.mjs). Data: Open Food
// Facts, free, no API key. A missing or failing search returns null and
// the UI simply omits the swap card — never a fake alternative.

import { parseOffProduct, type OffProduct } from './offParse';
import { scoreProduct, type RiskBand } from './risk';

export interface SmartSwap {
  product: OffProduct;
  score: number;
  band: RiskBand;
  /** Original score minus the alternative's score (always > 0). */
  boost: number;
}

const USER_AGENT = 'ScanRisk/1.0 (Android; +https://dhruvdave.in)';
const FIELDS =
  'code,product_name,brands,quantity,nutriscore_grade,nova_group,nutriments,ingredients_text,additives_tags,allergens_tags,traces_tags,image_url,categories_tags';
const PAGE_SIZE = 24;
const TIMEOUT_MS = 12000;

/** Same-category candidates, best (lowest) score first. */
async function searchSameCategory(slug: string): Promise<OffProduct[]> {
  const urls = [
    `https://world.openfoodfacts.org/api/v2/search?categories_tags_en=${encodeURIComponent(slug)}&page_size=${PAGE_SIZE}&fields=${FIELDS}`,
    `https://world.openfoodfacts.org/facets/categories/${encodeURIComponent(slug)}.json?page_size=${PAGE_SIZE}&fields=${FIELDS}`,
  ];
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!res.ok) continue;
      const json = await res.json();
      const items: unknown[] = Array.isArray(json?.products) ? json.products : [];
      const products: OffProduct[] = [];
      for (const item of items) {
        const code =
          typeof (item as { code?: unknown })?.code === 'string'
            ? (item as { code: string }).code
            : '';
        if (!code) continue;
        const parsed = parseOffProduct(code, { status: 1, product: item });
        if (parsed.status === 'found') products.push(parsed.product);
      }
      if (products.length > 0) return products;
    } catch {
      // Try the next endpoint; a failed search is not an error for the caller.
    } finally {
      clearTimeout(timer);
    }
  }
  return [];
}

/**
 * Find the best lower-scoring alternatives to `product` in its own
 * category, best (lowest) score first, up to `limit` entries. Returns []
 * when there is no category to search, the search fails, or no candidate
 * scores lower with real label data behind it. A product with almost no
 * label data (dataQuality 'minimal') is never recommended — a 0-point
 * score from missing data is not a better product.
 */
export async function findSmartSwaps(product: OffProduct, limit = 3): Promise<SmartSwap[]> {
  const slug = product.categoryTag;
  if (!slug) return [];
  const original = scoreProduct(product);
  const candidates = await searchSameCategory(slug);
  const scored: SmartSwap[] = [];
  for (const alt of candidates) {
    if (alt.barcode === product.barcode) continue;
    if (!alt.name || alt.name.startsWith('Product ')) continue;
    const r = scoreProduct(alt);
    if (r.dataQuality === 'minimal') continue;
    if (r.score >= original.score) continue;
    scored.push({ product: alt, score: r.score, band: r.band, boost: original.score - r.score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, Math.max(1, limit));
}

/**
 * Find the best lower-scoring alternative to `product` in its own category.
 * Returns null when there is no category to search, the search fails, or no
 * candidate scores lower with real label data behind it.
 */
export async function findSmartSwap(product: OffProduct): Promise<SmartSwap | null> {
  const swaps = await findSmartSwaps(product, 1);
  return swaps[0] ?? null;
}
