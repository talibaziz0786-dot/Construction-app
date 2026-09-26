import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, Info, ShieldCheck, Sparkles } from 'lucide-react';
import type { CalculatorResultRow, CalculatorRunResponse } from '../../types/calculator-types.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatCuFt, formatLengthFriendly, formatSqFt } from '../../utils/friendlyUnits.js';

interface CalculatorResultViewProps {
  result: CalculatorRunResponse;
}

/** Formats a server result row without re-deriving any quantity. Presentation only. */
function useRowFormatter() {
  return (row: CalculatorResultRow): string => {
    if (row.unit === 'sq.m') return formatSqFt(row.value);
    if (row.unit === 'cu.m') return formatCuFt(row.value);
    if (row.unit === 'sq.ft') return `${Math.round(row.value).toLocaleString()} sq ft`;
    if (row.unit === 'cu.ft') return `${Math.round(row.value).toLocaleString()} cu ft`;
    if (row.unit === 'm') return formatLengthFriendly(row.value);
    if (row.unit === 'ft') return formatLengthFriendly(row.value * 0.3048);
    if (row.unit === 'bags') return `${row.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} bags`;
    if (row.unit === 'kg') return `${row.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
    if (row.unit === 'bricks') return `${Math.ceil(row.value).toLocaleString()} bricks`;
    if (row.unit === '%') return `${row.value}%`;
    return `${Math.ceil(row.value).toLocaleString()} ${row.unit}`;
  };
}

/**
 * Result presentation for a calculator run.
 * Values, assumptions and warnings come from the server response unchanged.
 */
export const CalculatorResultView: React.FC<CalculatorResultViewProps> = ({ result }) => {
  const [showDetails, setShowDetails] = useState(false);
  const formatRow = useRowFormatter();
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('resultVerifiedMethod')} v{result.calculator.methodologyVersion}
          </span>
          {result.isEstimate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              {t('resultPreliminary')}
            </span>
          )}
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {result.resultLabel}
        </p>
        <p className="mt-1 break-words text-3xl font-extrabold text-amber-400 sm:text-4xl" role="status" aria-live="polite">
          {formatRow(result.primary)}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-400">
          {t('resultWhatMeans')}: {result.resultLabel} · {t('resultInputsUsed')}: {result.rows.length + 1}
        </p>

        {result.rows.length > 0 && (
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
            {result.rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-slate-400">{row.label}</dt>
                <dd className="text-sm font-semibold text-slate-100">{formatRow(row)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4" role="alert">
          <AlertTriangle className="mt-0.5 w-5 h-5 shrink-0 text-amber-400" aria-hidden="true" />
          <ul className="space-y-1 text-sm text-amber-200/90">
            {result.warnings.map((warning) => (
              <li key={warning.code}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40">
        <button
          type="button"
          onClick={() => setShowDetails((previous) => !previous)}
          aria-expanded={showDetails}
          className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:text-slate-100 min-h-[48px]"
        >
          <span className="inline-flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            {t('resultHowCalculated')}
          </span>
          <ChevronDown className={`w-4 h-4 transition ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {showDetails && (
          <div className="space-y-4 border-t border-slate-800 p-4">
            <ul className="space-y-2">
              {result.assumptions.map((assumption) => (
                <li key={assumption.id} className="text-xs text-slate-400">
                  <span className="text-amber-400">•</span> {assumption.description}
                  <span className="ml-1 text-slate-500">
                    ({assumption.source}
                    {assumption.verified ? ', verified' : ''})
                  </span>
                </li>
              ))}
            </ul>

            <div className="text-xs text-slate-500">
              <p className="font-medium text-slate-400">Assumptions</p>
              <p className="mt-1">
                Verified calculation method. Full engineering references are available from the
                project team on request.
              </p>
            </div>

            <p className="border-t pt-3 text-[11px] leading-relaxed opacity-70">
              {t('explainWastageTitle')}: {t('explainWastageBody')} {t('explainCostTitle')}: {t('explainCostBody')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
