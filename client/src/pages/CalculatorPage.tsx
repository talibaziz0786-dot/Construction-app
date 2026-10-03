import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CircleDashed, Loader2 } from 'lucide-react';
import { fetchCalculatorHub, runCalculator } from '../services/calculatorService.js';
import { useLanguage } from '../contexts/LanguageContext.js';
import type {
  CalculatorHubEntry,
  CalculatorRateEntryInput,
  CalculatorRunResponse,
} from '../types/calculator-types.js';
import { CalculatorInputForm } from '../components/calculator/CalculatorInputForm.js';
import { CalculatorResultView } from '../components/calculator/CalculatorResultView.js';
import { CalculatorBoqPanel } from '../components/calculator/CalculatorBoqPanel.js';

function toDetails(error: unknown): string[] {
  if (typeof error === 'object' && error !== null && 'details' in error) {
    const details = (error as { details?: unknown }).details;
    if (Array.isArray(details)) {
      return details.filter((d): d is string => typeof d === 'string');
    }
  }
  return [];
}

/** Calculator flow: inputs → calculate → clear result → optional cost → export. */
export const CalculatorPage: React.FC = () => {
  const { calculatorId = '' } = useParams<{ calculatorId: string }>();
  const { t } = useLanguage();
  const [entry, setEntry] = useState<CalculatorHubEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [result, setResult] = useState<CalculatorRunResponse | null>(null);
  const [lastValues, setLastValues] = useState<Record<string, unknown> | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setResult(null);
    setLastValues(null);
    fetchCalculatorHub()
      .then((categories) => {
        if (cancelled) return;
        const found = categories
          .flatMap((c) => c.calculators)
          .find((c) => c.calculatorId === calculatorId);
        setEntry(found ?? null);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : t('calcLoadFailed'));
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [calculatorId]);

  const resultSectionRef = React.useRef<HTMLElement | null>(null);

  const execute = useCallback(
    async (values: Record<string, unknown>, rates?: CalculatorRateEntryInput[], currency?: string) => {
      setIsRunning(true);
      setErrorMessage(null);
      setErrorDetails([]);
      try {
        const usedCurrency = currency ?? rates?.[0]?.currency ?? 'USD';
        const response = await runCalculator(calculatorId, {
          values,
          rateCard: rates && rates.length > 0 ? { currency: usedCurrency, entries: rates } : undefined,
        });
        setResult(response);
        // Move keyboard focus to the result heading so screen-reader and
        // keyboard users land on the new estimate without manual scrolling.
        requestAnimationFrame(() => {
          resultSectionRef.current?.scrollIntoView({ block: 'start' });
        });
      } catch (error) {
        const friendly =
          error instanceof TypeError
            ? t('errorNetwork')
            : error instanceof Error
              ? error.message
              : t('calcFailedMessage');
        setErrorMessage(friendly);
        setErrorDetails(toDetails(error));
      } finally {
        setIsRunning(false);
      }
    },
    [calculatorId]
  );

  const handleSubmit = useCallback(
    (values: Record<string, unknown>) => {
      setLastValues(values);
      void execute(values);
    },
    [execute]
  );

  const handleApplyRates = useCallback(
    (rates: CalculatorRateEntryInput[], currency: string) => {
      if (lastValues) void execute(lastValues, rates, currency);
    },
    [execute, lastValues]
  );

  const handleNewCalculation = useCallback(() => {
    setResult(null);
    setLastValues(null);
    setErrorMessage(null);
    setErrorDetails([]);
    setFormKey((k) => k + 1);
    // Return keyboard focus to the form heading region for screen-reader users.
    requestAnimationFrame(() => {
      document.getElementById(`calc-form-${calculatorId}`)?.scrollIntoView({ block: 'start' });
    });
  }, [calculatorId]);

  const isComingSoon = entry !== null && entry.status === 'coming-soon';

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="print-only hidden">
          <h1 className="text-xl font-bold">{t('printTitle')}</h1>
          <p className="text-sm">
            {entry ? entry.name : calculatorId}
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('calcLoadCalculator')}
          </div>
        )}
        {!isLoading && loadError && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-300" role="alert">
            <p className="font-semibold">{t('calcLoadErrorTitle')}</p>
            <p className="mt-1">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10 min-h-[44px]"
            >
              {t('errorTryAgain')}
            </button>
          </div>
        )}
        {!isLoading && !loadError && !entry && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h1 className="text-lg font-semibold">{t('calcNotFoundTitle')}</h1>
            <p className="mt-2 text-sm text-slate-400">
              <span className="text-slate-200">{calculatorId}</span> {t('calcNotAvailable')}
            </p>
            <Link
              to="/calculators"
              className="mt-4 inline-flex rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
            >
              {t('errorBrowseCalculators')}
            </Link>
          </div>
        )}
        {!isLoading && entry && isComingSoon && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-400">
              <CircleDashed className="h-3.5 w-3.5" />
              {t('comingSoonTitle')}
            </span>
            <h1 className="mt-4 text-xl font-semibold">{entry.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{entry.summary}</p>
          </div>
        )}
        {!isLoading && entry && !isComingSoon && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section id={`calc-form-${calculatorId}`} className="no-print h-fit rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6 lg:sticky lg:top-24" aria-label={entry.name}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                {t('formLastUsed')}: {lastValues ? t('resultCalculated') : t('formEmptyLastUsed')}
              </p>
              <CalculatorInputForm
                key={formKey}
                calculatorName={entry.name}
                fields={entry.fields}
                isBusy={isRunning}
                onSubmit={handleSubmit}
              />
            </section>
            <section ref={resultSectionRef} className="print-area space-y-6 min-w-0" aria-live="polite" aria-label={t('resultYourEstimate')} tabIndex={-1}>
              <PlaceholderView result={result} isRunning={isRunning} />
              {errorMessage && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300" role="alert" tabIndex={-1}>
                  <p className="font-semibold">{errorMessage}</p>
                  {errorDetails.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {errorDetails.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {result && (
                <>
                  <CalculatorResultView result={result} />
                  <CalculatorBoqPanel boq={result.boq} isBusy={isRunning} onApplyRates={handleApplyRates} />
                  <div className="no-print flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleNewCalculation}
                      aria-label={t('formNewCalculation')}
                      className="min-h-[48px] rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-amber-500/40 hover:text-amber-400"
                    >
                      {t('formNewCalculation')}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

function PlaceholderView({ result, isRunning }: { result: CalculatorRunResponse | null; isRunning: boolean }) {
  const { t } = useLanguage();
  if (result) return null;
  if (isRunning) {
    return (
      <div className="rounded-2xl border p-6 text-center text-sm" role="status">
        {t('calcLoading')}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center">
      <p className="text-sm font-semibold">{t('calcPlaceholderTitle')}</p>
      <p className="mt-1 text-xs opacity-60">{t('calcPlaceholderHint')}</p>
    </div>
  );
}

export default CalculatorPage;
