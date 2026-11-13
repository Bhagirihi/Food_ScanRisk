// Risk score 0-50 for a food product. Rule-based and explainable: every
// point comes from one visible factor with a plain-language reason.
// This is guidance from label data, not medical advice.
//
// Weights (max possible 49, hard-capped at 50):
//   Nutri-Score E +12 / D +9 / C +5 / B +2 / A 0
//   NOVA group 4 +10 / 3 +5 / 2 +2 / 1 0
//   Sugar >22.5g/100g +6, >12.5g +3
//   Salt >1.5g/100g +5, >0.6g +2
//   Saturated fat >5g/100g +5, >1.5g +2
//   Trans fat >0 +5
//   Additives of concern +2 each, max 3 counted (+6)
// Sugar/salt/fat thresholds follow the high-content cut-offs used on
// nutrition labels (sugar 22.5g, salt 1.5g, saturated fat 5g per 100g).

import type { OffProduct } from './offParse';

export interface RiskFactor {
  id: string;
  label: string;
  detail: string;
  points: number;
}

export type RiskBand = 'low' | 'moderate' | 'high' | 'very-high';
export type DataQuality = 'full' | 'partial' | 'minimal';

export interface RiskResult {
  score: number;
  band: RiskBand;
  bandLabel: string;
  bandColor: string;
  factors: RiskFactor[];
  dataQuality: DataQuality;
  notes: string[];
}

export const BANDS: Record<RiskBand, { label: string; color: string; range: string }> = {
  low: { label: 'Low risk', color: '#1E8E3E', range: '0–10' },
  moderate: { label: 'Moderate risk', color: '#B77900', range: '11–25' },
  high: { label: 'High risk', color: '#E8710A', range: '26–40' },
  'very-high': { label: 'Very high risk', color: '#D93025', range: '41–50' },
};

export function bandForScore(score: number): RiskBand {
  if (score <= 10) return 'low';
  if (score <= 25) return 'moderate';
  if (score <= 40) return 'high';
  return 'very-high';
}

export interface ConcernAdditive {
  name: string;
  reason: string;
}

/** Small curated list — only additives with a documented concern. */
export const CONCERN_ADDITIVES: Record<string, ConcernAdditive> = {
  E250: {
    name: 'Sodium nitrite',
    reason: 'Preservative in processed meat; can form nitrosamines, some of which are carcinogenic.',
  },
  E251: {
    name: 'Sodium nitrate',
    reason: 'Preservative in processed meat; can convert to nitrite and form nitrosamines.',
  },
  E951: {
    name: 'Aspartame',
    reason: 'Artificial sweetener; IARC lists it as possibly carcinogenic (Group 2B).',
  },
  E950: {
    name: 'Acesulfame K',
    reason: 'Artificial sweetener; long-term effects are still debated.',
  },
  E954: {
    name: 'Saccharin',
    reason: 'Artificial sweetener; older animal studies raised questions.',
  },
  E320: {
    name: 'BHA',
    reason: 'Antioxidant preservative; IARC Group 2B (possibly carcinogenic).',
  },
  E321: {
    name: 'BHT',
    reason: 'Antioxidant preservative; high doses linked to liver effects in animal studies.',
  },
  E171: {
    name: 'Titanium dioxide',
    reason: 'White colouring; banned in EU food since 2022 over genotoxicity concerns.',
  },
};

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function scoreProduct(p: OffProduct): RiskResult {
  const factors: RiskFactor[] = [];
  const notes: string[] = [];
  const n = p.nutriments;

  // Nutri-Score: overall nutritional quality, A best / E worst.
  const nutriPoints: Record<string, number> = { a: 0, b: 2, c: 5, d: 9, e: 12 };
  const grade = p.nutriscoreGrade;
  if (grade && grade in nutriPoints) {
    const pts = nutriPoints[grade];
    if (pts > 0) {
      factors.push({
        id: 'nutriscore',
        label: `Nutri-Score ${grade.toUpperCase()}`,
        detail: 'Overall nutritional quality rated by the Nutri-Score system (A is best, E is worst).',
        points: pts,
      });
    }
  } else {
    notes.push('No Nutri-Score available for this product, so overall quality could not be scored.');
  }

  // NOVA processing level.
  if (p.novaGroup === 4) {
    factors.push({
      id: 'nova',
      label: 'Ultra-processed',
      detail: 'NOVA group 4: made mostly from industrial ingredients with little whole food.',
      points: 10,
    });
  } else if (p.novaGroup === 3) {
    factors.push({
      id: 'nova',
      label: 'Processed food',
      detail: 'NOVA group 3: processed, with added salt, sugar or fat.',
      points: 5,
    });
  } else if (p.novaGroup === 2) {
    factors.push({
      id: 'nova',
      label: 'Processed ingredient',
      detail: 'NOVA group 2: a processed culinary ingredient such as oil, sugar or salt.',
      points: 2,
    });
  } else if (p.novaGroup == null) {
    notes.push('Processing level (NOVA group) is unknown for this product.');
  }

  // Sugar per 100g.
  if (n.sugars100 != null) {
    if (n.sugars100 > 22.5) {
      factors.push({
        id: 'sugar',
        label: `Very high sugar: ${fmt(n.sugars100)}g per 100g`,
        detail: `That's about ${Math.round(n.sugars100 / 4)} teaspoons of sugar in every 100g.`,
        points: 6,
      });
    } else if (n.sugars100 > 12.5) {
      factors.push({
        id: 'sugar',
        label: `High sugar: ${fmt(n.sugars100)}g per 100g`,
        detail: 'Above the high-sugar cut-off used on nutrition labels.',
        points: 3,
      });
    }
  } else {
    notes.push('Sugar content is not listed, so it could not be scored.');
  }

  // Salt per 100g.
  if (n.salt100 != null) {
    if (n.salt100 > 1.5) {
      factors.push({
        id: 'salt',
        label: `Very high salt: ${fmt(n.salt100)}g per 100g`,
        detail: 'Well above the high-salt cut-off used on nutrition labels.',
        points: 5,
      });
    } else if (n.salt100 > 0.6) {
      factors.push({
        id: 'salt',
        label: `High salt: ${fmt(n.salt100)}g per 100g`,
        detail: 'Above the high-salt cut-off used on nutrition labels.',
        points: 2,
      });
    }
  } else {
    notes.push('Salt content is not listed, so it could not be scored.');
  }

  // Saturated fat per 100g.
  if (n.saturatedFat100 != null) {
    if (n.saturatedFat100 > 5) {
      factors.push({
        id: 'satfat',
        label: `Very high saturated fat: ${fmt(n.saturatedFat100)}g per 100g`,
        detail: 'Well above the high-saturated-fat cut-off used on nutrition labels.',
        points: 5,
      });
    } else if (n.saturatedFat100 > 1.5) {
      factors.push({
        id: 'satfat',
        label: `High saturated fat: ${fmt(n.saturatedFat100)}g per 100g`,
        detail: 'Above the high-saturated-fat cut-off used on nutrition labels.',
        points: 2,
      });
    }
  } else {
    notes.push('Saturated fat is not listed, so it could not be scored.');
  }

  // Trans fat — any amount counts.
  if (n.transFat100 != null && n.transFat100 > 0) {
    factors.push({
      id: 'transfat',
      label: `Contains trans fat: ${fmt(n.transFat100)}g per 100g`,
      detail: 'Trans fat raises bad cholesterol and lowers good cholesterol.',
      points: 5,
    });
  }

  // Additives of concern, max 3 counted (6 points).
  const flagged = p.additives.filter((a) => a in CONCERN_ADDITIVES);
  for (const code of flagged.slice(0, 3)) {
    const info = CONCERN_ADDITIVES[code];
    factors.push({
      id: `additive-${code}`,
      label: `${info.name} (${code})`,
      detail: info.reason,
      points: 2,
    });
  }
  if (flagged.length > 3) {
    notes.push(`Plus ${flagged.length - 3} more additives of concern not counted in the score.`);
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.min(50, raw);
  const band = bandForScore(score);
  const info = BANDS[band];

  // Data quality: how much of the score rests on real label data.
  const hasNutri = !!grade && grade in nutriPoints;
  const hasNova = p.novaGroup != null;
  const hasNutriments = n.sugars100 != null || n.salt100 != null || n.saturatedFat100 != null;
  const dataQuality: DataQuality =
    hasNutri && hasNova && hasNutriments
      ? 'full'
      : !hasNutri && !hasNova && !hasNutriments
        ? 'minimal'
        : 'partial';
  if (dataQuality === 'minimal') {
    notes.push('Very little label data is available — treat this score as a rough guide only.');
  } else if (dataQuality === 'partial') {
    notes.push('Some label data is missing, so this score is based on partial information.');
  }

  return { score, band, bandLabel: info.label, bandColor: info.color, factors, dataQuality, notes };
}
