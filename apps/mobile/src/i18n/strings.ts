/**
 * Minimal English/Hindi strings for the mobile MVP chrome.
 *
 * Only UI chrome is translated here. Calculator field labels, result labels
 * and BOQ content come from the server (single source of truth) and are
 * rendered as returned.
 */
export type Language = 'en' | 'hi';

const en = {
  appName: 'Cunstruction',
  tagline: 'Construction estimates you can trust — before you build.',
  start: 'Start Calculating',
  back: 'Back',
  language: 'Language',
  calculators: 'Calculators',
  searchPlaceholder: 'Search calculators…',
  clearSearch: 'Clear search',
  resultsCount: (n: number) => `${n} calculator${n === 1 ? '' : 's'}`,
  noResults: 'No calculators match your search.',
  retry: 'Retry',
  loading: 'Loading calculators…',
  comingSoon: 'Coming soon',
  guestNote: 'Guest mode — no sign-in needed to calculate.',
  calculate: 'Calculate',
  reset: 'Reset',
  formSection: 'Inputs',
  resultSection: 'Result',
  verifiedMethod: 'Verified method',
  breakdownSection: 'Material breakdown',
  assumptionsSection: 'Assumptions',
  warningsSection: 'Warnings',
  boqSection: 'BOQ / Quantity summary',
  theoretical: 'Theoretical',
  procurement: 'With wastage',
  wastage: 'Wastage',
  quantity: 'Quantity',
  unit: 'Unit',
  item: 'Item',
  ratesNote: 'Material rates are not configured yet — quantities are shown without priced amounts.',
  noBoq: 'This calculator reports a result only (no material breakdown).',
  calculating: 'Calculating…',
  offlineResult: 'Offline result — will verify with server when online',
  serverVerified: 'Server verified',
  online: 'Online',
  offline: 'Offline',
  checking: 'Checking…',
  syncing: 'Syncing',
  syncPending: 'Sync pending',
  syncFailed: 'Sync failed — will retry',
  history: 'History',
  historyEmpty: 'No saved calculations yet. Results you calculate are kept here.',
  synced: 'Synced',
  pendingSync: 'Pending sync',
  cachedCatalog: 'Showing saved calculator list (offline)',
  cachedRatesNote: 'Cached rates may be stale — connect for current live rates.',
  errorNetwork: 'Could not reach the server. Showing offline result where supported.',
  errorServer: 'The server could not complete this calculation.',
  errorRequired: 'Required',
  errorNumber: 'Enter a valid number',
  errorRange: (min: number | string, max: number | string) => `Enter a value between ${min} and ${max}`,
  openingsTitle: 'Doors / windows',
  openingsHelp: 'Deducted from the gross wall area.',
  addOpening: 'Add opening',
  remove: 'Remove',
  type: 'Type',
  width: 'Width (m)',
  height: 'Height (m)',
  qty: 'Qty',
  disclaimer:
    'Preliminary estimate for planning only. Not a substitute for a structural engineer, architect, approved drawings or site-specific engineering design.',
} as const;

export type StringKey = keyof typeof en;
/**
 * Bundle shape: plain strings stay strings, formatter functions keep a broad
 * callable signature so the Hindi bundle satisfies it without literal-type
 * coupling to the English text.
 */
export type StringBundle = {
  [K in StringKey]: (typeof en)[K] extends (...args: infer A) => unknown
    ? (...args: A) => string
    : string;
};

const hi: StringBundle = {
  appName: 'कंस्ट्रक्शन ऐप',
  tagline: 'निर्माण से पहले भरोसेमंद अनुमान।',
  start: 'गणना शुरू करें',
  back: 'वापस',
  language: 'भाषा',
  calculators: 'कैलकुलेटर',
  searchPlaceholder: 'कैलकुलेटर खोजें…',
  clearSearch: 'खोज हटाएँ',
  resultsCount: (n: number) => `${n} कैलकुलेटर`,
  noResults: 'आपकी खोज से मेल खाता कैलकुलेटर नहीं मिला।',
  retry: 'पुनः प्रयास करें',
  loading: 'कैलकुलेटर लोड हो रहे हैं…',
  comingSoon: 'जल्द आ रहा है',
  guestNote: 'गेस्ट मोड — गणना के लिए साइन-इन आवश्यक नहीं है।',
  calculate: 'गणना करें',
  reset: 'रीसेट',
  formSection: 'इनपुट',
  resultSection: 'परिणाम',
  verifiedMethod: 'सत्यापित विधि',
  breakdownSection: 'सामग्री विवरण',
  assumptionsSection: 'मान्यताएँ',
  warningsSection: 'चेतावनियाँ',
  boqSection: 'बीओक्यू / मात्रा सारांश',
  theoretical: 'सैद्धांतिक',
  procurement: 'वेस्टेज सहित',
  wastage: 'वेस्टेज',
  quantity: 'मात्रा',
  unit: 'इकाई',
  item: 'आइटम',
  ratesNote: 'सामग्री दरें अभी तय नहीं हैं — मात्राएँ बिना मूल्य के दिखाई गई हैं।',
  noBoq: 'यह कैलकुलेटर केवल परिणाम देता है (कोई सामग्री विवरण नहीं)।',
  calculating: 'गणना हो रही है…',
  offlineResult: 'ऑफ़लाइन परिणाम — ऑनलाइन होने पर सर्वर से सत्यापित होगा',
  serverVerified: 'सर्वर सत्यापित',
  online: 'ऑनलाइन',
  offline: 'ऑफ़लाइन',
  checking: 'जाँच हो रही है…',
  syncing: 'सिंक हो रहा है',
  syncPending: 'सिंक बाकी है',
  syncFailed: 'सिंक विफल — पुनः प्रयास होगा',
  history: 'इतिहास',
  historyEmpty: 'अभी कोई सहेजी गई गणना नहीं है।',
  synced: 'सिंक हो गया',
  pendingSync: 'सिंक बाकी',
  cachedCatalog: 'सहेजी गई कैलकुलेटर सूची (ऑफ़लाइन)',
  cachedRatesNote: 'सहेजी गई दरें पुरानी हो सकती हैं — ताज़ा दरों के लिए ऑनलाइन जाएँ।',
  errorNetwork: 'सर्वर तक नहीं पहुँच सके। जहाँ संभव हो ऑफ़लाइन परिणाम दिखाया गया है।',
  errorServer: 'सर्वर यह गणना पूरी नहीं कर सका।',
  errorRequired: 'आवश्यक',
  errorNumber: 'एक वैध संख्या दर्ज करें',
  errorRange: (min: number | string, max: number | string) => `${min} और ${max} के बीच मान दर्ज करें`,
  openingsTitle: 'दरवाज़े / खिड़कियाँ',
  openingsHelp: 'सकल दीवार क्षेत्र से घटाया जाता है।',
  addOpening: 'ओपनिंग जोड़ें',
  remove: 'हटाएँ',
  type: 'प्रकार',
  width: 'चौड़ाई (m)',
  height: 'ऊँचाई (m)',
  qty: 'संख्या',
  disclaimer:
    'यह केवल प्रारंभिक अनुमान है। संरचनात्मक इंजीनियर, आर्किटेक्ट, स्वीकृत ड्राइंग या साइट-विशिष्ट इंजीनियरिंग डिज़ाइन का विकल्प नहीं है।',
};

const bundles: Record<Language, StringBundle> = { en, hi };

/**
 * Returns a translation function for the given language.
 * Formatter keys keep their function type: `t('resultsCount')(n)`.
 */
export function translator(language: Language): <K extends StringKey>(key: K) => StringBundle[K] {
  const bundle = bundles[language];
  return <K extends StringKey>(key: K): StringBundle[K] => bundle[key];
}
