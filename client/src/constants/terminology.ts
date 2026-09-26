/**
 * Bilingual construction terminology dictionary (English + Hindi)
 * Provides professional Hindi and English labels for domain concepts.
 */

export interface TermEntry {
  en: string;
  hi: string;
  description?: string;
}

export const CONSTRUCTION_TERMS = {
  // Dimensions & Geometry
  roomDimensions: {
    en: 'Room Geometry',
    hi: 'कमरे का माप',
    description: 'Length, width, and height of the room',
  },
  length: {
    en: 'Length',
    hi: 'लंबाई',
  },
  width: {
    en: 'Width',
    hi: 'चौड़ाई',
  },
  wallHeight: {
    en: 'Wall Height',
    hi: 'दीवार की ऊंचाई',
  },
  wallThickness: {
    en: 'Wall Thickness',
    hi: 'दीवार की मोटाई',
  },

  // Openings
  openings: {
    en: 'Openings (Doors & Windows)',
    hi: 'दरवाजे और खिड़कियां',
  },
  door: {
    en: 'Door',
    hi: 'दरवाजा',
  },
  window: {
    en: 'Window',
    hi: 'खिड़की',
  },
  quantity: {
    en: 'Quantity',
    hi: 'मात्रा',
  },

  // Brick & Mortar Specs
  brickSpecs: {
    en: 'Brick & Mortar Specs',
    hi: 'ईंट और मसाला विवरण',
  },
  brickLength: {
    en: 'Brick Length',
    hi: 'ईंट की लंबाई',
  },
  brickWidth: {
    en: 'Brick Width',
    hi: 'ईंट की चौड़ाई',
  },
  brickHeight: {
    en: 'Brick Height',
    hi: 'ईंट की ऊंचाई',
  },
  mortarJoint: {
    en: 'Mortar Joint Thickness',
    hi: 'मसाला जोड़ मोटाई',
  },
  wastage: {
    en: 'Wastage Allowance',
    hi: 'अपव्यय / बर्बादी',
  },

  // Estimates & Metrics
  floorArea: {
    en: 'Floor Area',
    hi: 'फर्श का क्षेत्रफल',
  },
  netWallArea: {
    en: 'Net Wall Area',
    hi: 'दीवार का शुद्ध क्षेत्रफल',
  },
  netMasonryVolume: {
    en: 'Net Masonry Volume',
    hi: 'चिनाई का आयतन',
  },
  theoreticalBricks: {
    en: 'Theoretical Bricks',
    hi: 'सैद्धांतिक ईंटें',
  },
  bricksNeeded: {
    en: 'Bricks Needed',
    hi: 'आवश्यक ईंटें',
  },
  procurementQuantity: {
    en: 'Procurement Quantity',
    hi: 'खरीद मात्रा',
  },
  bricks: {
    en: 'Bricks',
    hi: 'ईंटें',
  },
  units: {
    en: 'Units',
    hi: 'नग',
  },

  // Systems & UI
  unitSystem: {
    en: 'Unit System',
    hi: 'इकाई प्रणाली',
  },
  metric: {
    en: 'Metric',
    hi: 'मीट्रिक',
  },
  imperial: {
    en: 'Imperial',
    hi: 'इंपीरियल',
  },
} as const satisfies Record<string, TermEntry>;

export type TermKey = keyof typeof CONSTRUCTION_TERMS;

/**
 * Returns bilingual display string, e.g. "Length / लंबाई"
 */
export function formatBilingual(key: TermKey, separator = ' / '): string {
  const term = CONSTRUCTION_TERMS[key];
  if (!term) return key;
  return `${term.en}${separator}${term.hi}`;
}

/**
 * Bilingual label ordered for the active UI language.
 * Hindi users read "लंबाई / Length" (Hindi primary); English users read "Length / लंबाई".
 */
export function formatBilingualForLang(key: TermKey, lang: 'en' | 'hi'): string {
  const term = CONSTRUCTION_TERMS[key];
  if (!term) return key;
  return lang === 'hi' ? `${term.hi} / ${term.en}` : `${term.en} / ${term.hi}`;
}

/**
 * Returns single language or bilingual format
 */
export function getTerm(key: TermKey, lang: 'en' | 'hi' | 'both' = 'both'): string {
  const term = CONSTRUCTION_TERMS[key];
  if (!term) return key;
  if (lang === 'en') return term.en;
  if (lang === 'hi') return term.hi;
  return `${term.en} / ${term.hi}`;
}
