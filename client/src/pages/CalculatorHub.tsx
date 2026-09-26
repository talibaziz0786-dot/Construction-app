import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calculator,
  CircleDashed,
  Layers,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { fetchCalculatorHub, findMissingRequiredCalculators } from '../services/calculatorService.js';
import type { CalculatorHubCategory, CalculatorHubEntry } from '../types/calculator-types.js';
import { AdSlot } from '../components/monetization/AdSlot.js';
import { useAuth } from '../contexts/AuthContext.js';
import { useLanguage } from '../contexts/LanguageContext.js';
import type { TranslationKey } from '../i18n/translations.js';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  area: <Layers className="w-5 h-5 text-amber-400" />,
  masonry: <Building2 className="w-5 h-5 text-amber-400" />,
  concrete: <Calculator className="w-5 h-5 text-amber-400" />,
  finishing: <Sparkles className="w-5 h-5 text-amber-400" />,
};

/**
 * Translation key shown under each calculator card, keyed by server calculator id.
 */
const RESULT_HINTS: Record<string, TranslationKey> = {
  'room.floor-area': 'hintRoomFloorArea',
  'wall.net-area': 'hintWallNetArea',
  'masonry.brick-quantity': 'hintBrickQuantity',
  'concrete.volume': 'hintConcreteVolume',
  'plaster.quantity': 'hintPlasterQuantity',
  'tile.quantity': 'hintTileQuantity',
};

/**
 * Calculator Hub — the calculator-first entry point of the product.
 * Available and coming-soon calculators come from the server catalog.
 */
export const CalculatorHub: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<CalculatorHubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const loadHub = () => {
    setIsLoading(true);
    setError(null);
    fetchCalculatorHub()
      .then((result) => {
        // Never render a blank hub: malformed payloads fall through to the
        // visible retryable error state below instead of an empty page.
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('Invalid calculator listing received');
        }
        setCategories(result);
        setIsLoading(false);
      })
      .catch((fetchError: unknown) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load calculators');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadHub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matchingEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return null;
    }
    return (entry: CalculatorHubEntry) =>
      entry.name.toLowerCase().includes(term) ||
      entry.summary.toLowerCase().includes(term) ||
      entry.calculatorId.toLowerCase().includes(term);
  }, [query]);

  const visibleCategories = useMemo(
    () =>
      activeCategory === 'all'
        ? categories
        : categories.filter((category) => category.id === activeCategory),
    [categories, activeCategory]
  );

  // Live-region announcement for screen readers: result count after search/filter.

  const availableCount = categories.reduce((total, category) => {
    const calculators = Array.isArray(category.calculators) ? category.calculators : [];
    return total + calculators.filter((calculator) => calculator.status === 'available').length;
  }, 0);
  const missingRequired = useMemo(
    () => findMissingRequiredCalculators(categories),
    [categories]
  );
  const hasVisibleResults =
    !matchingEntries ||
    visibleCategories.some((category) =>
      (Array.isArray(category.calculators) ? category.calculators : []).some(matchingEntries)
    );

  // Screen-reader announcement: visible available count after search/filter.
  const visibleAvailableCount = visibleCategories.reduce((total, category) => {
    const calculators = Array.isArray(category.calculators) ? category.calculators : [];
    const visible = matchingEntries ? calculators.filter(matchingEntries) : calculators;
    return total + visible.filter((calculator) => calculator.status === 'available').length;
  }, 0);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <section className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <Calculator className="h-3.5 w-3.5" />
            {availableCount} {t('hubAvailable')}
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
            {t('hubTitle')}
          </h1>
          <p className="mt-3 opacity-70">
            {t('hubSubtitle')}
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 min-h-[48px]">
            <Search className="h-4 w-4 opacity-50" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('hubSearchPlaceholder')}
              aria-label={t('hubSearchPlaceholder')}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('hubSearchClear')}
                className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold opacity-80 transition hover:opacity-100 min-h-[44px]"
              >
                {t('hubSearchClear')}
              </button>
            )}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {visibleAvailableCount} {t('hubResultsCount')}
          </p>

          {!isLoading && !error && categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('hubFilterLabel')}>
              {[{ id: 'all', name: t('hubFilterAll') }, ...categories.map((c) => ({ id: c.id, name: c.name }))].map(
                (option) => {
                  const isActive = activeCategory === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActiveCategory(option.id)}
                      aria-pressed={isActive}
                      className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition min-h-[44px] ${
                        isActive
                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {option.name}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        {isLoading && (
          <div className="mt-14 flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('hubLoading')}
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-300" role="alert">
            <p className="font-semibold">{t('errorLoadCalculators')}</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={loadHub}
              className="mt-3 rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
            >
              {t('hubRetry')}
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {missingRequired.length > 0 && (
              <div
                className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-200"
                role="status"
              >
                <p className="font-semibold">{t('hubPartialListingTitle')}</p>
                <p className="mt-1">{missingRequired.join(', ')}</p>
                <button
                  type="button"
                  onClick={loadHub}
                  className="mt-3 rounded-xl border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/10"
                >
                  {t('hubRetry')}
                </button>
              </div>
            )}
            {!hasVisibleResults && (
              <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm" role="status">
                <p className="font-semibold text-slate-200">{t('hubNoResults')}</p>
                <p className="mt-1 text-slate-400">{t('hubNoResultsHint')}</p>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setActiveCategory('all'); }}
                  className="mt-3 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400 min-h-[44px]"
                >
                  {t('hubSearchClear')}
                </button>
              </div>
            )}
          <div className="mt-12 space-y-12">
            {visibleCategories.map((category) => {
              const categoryCalculators = Array.isArray(category.calculators) ? category.calculators : [];
              const visible = matchingEntries
                ? categoryCalculators.filter(matchingEntries)
                : categoryCalculators;

              if (visible.length === 0) {
                return null;
              }

              return (
                <section key={category.id}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5">
                      {CATEGORY_ICONS[category.id] ?? (
                        <Calculator className="h-5 w-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{category.name}</h2>
                      <p className="text-sm text-slate-400">{category.summary}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((entry) =>
                      entry.status === 'available' ? (
                        <Link
                          key={entry.calculatorId}
                          to={`/calculators/${entry.calculatorId}`}
                          aria-label={`${entry.name} — ${t('hubCalculate')}`}
                          className="group flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-amber-500/40 hover:bg-slate-900 focus-visible:outline-none"
                        >
                          <div>
                            <h3 className="text-base font-semibold text-slate-100">{entry.name}</h3>
                            <p className="mt-1.5 text-sm text-slate-400">{entry.summary}</p>
                            {RESULT_HINTS[entry.calculatorId] && (
                              <p className="mt-1.5 text-xs font-medium text-amber-400/90">
                                {t(RESULT_HINTS[entry.calculatorId])}
                              </p>
                            )}
                          </div>
                          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500 min-h-[44px]">
                            {t('hubCalculate')}
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      ) : (
                        <div
                          key={entry.calculatorId}
                          className="flex h-full flex-col justify-between rounded-2xl border border-slate-800/70 bg-slate-900/25 p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-base font-semibold text-slate-300">
                                {entry.name}
                              </h3>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                                <CircleDashed className="h-3 w-3" />
                                {t('hubComingSoon')}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-slate-500">{entry.summary}</p>
                          </div>
                          <span className="mt-5 text-xs opacity-60">
                            {t('hubComingSoonNote')}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          </>
        )}

        <section className="mt-14 rounded-2xl border p-5 sm:p-6">
          <h2 className="text-base font-semibold">
            {t('hubWorkspaceCta')}
          </h2>
          <Link
            to="/workspace"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold min-h-[48px]"
          >
            {t('hubOpenWorkspace')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="mt-10">
          <AdSlot format="banner" slotId="calculator-hub-footer" />
        </div>
      </main>
    </div>
  );
};

export default CalculatorHub;
