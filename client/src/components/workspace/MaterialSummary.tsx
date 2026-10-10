import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import type { MaterialSummaryLine, ProjectCostSummary } from '../../types/calculation-types.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { useUnit } from '../../contexts/UnitContext.js';

interface MaterialSummaryProps {
  lines: MaterialSummaryLine[];
  costSummary?: ProjectCostSummary;
}

/** Server-computed material summary: renders aggregated quantities only. */
export function MaterialSummary({ lines, costSummary }: MaterialSummaryProps) {
  const { t } = useLanguage();
  const { formatVolume } = useUnit();

  if (lines.length === 0) {
    return <p className="text-sm text-slate-500 py-4">{t('materialSummaryEmpty')}</p>;
  }

  const formatQuantity = (line: MaterialSummaryLine, value: number): string => {
    if (line.unit === 'cu.m') return formatVolume(value, 3);
    if (line.unit === 'piece') return Math.ceil(value).toLocaleString();
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${line.unit}`;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{t('materialSummaryHint')}</p>

      <div className="space-y-2" data-testid="material-summary">
        {lines.map((line) => (
          <div
            key={line.id}
            className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{line.description}</p>
                <p className="text-[11px] text-slate-500">
                  {t('materialSummaryRooms')}: {line.contexts.join(', ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-100">
                  {formatQuantity(line, line.procurementQuantity)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('materialSummaryTheoretical')} {formatQuantity(line, line.theoreticalQuantity)} ·{' '}
                  {t('materialSummaryProcurement')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {costSummary?.hasMissingRates && (
        <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {t('materialSummaryMissingHint')}
        </p>
      )}
    </div>
  );
}

/** Small header icon block used by the parent summary. */
export function MaterialSummaryHeading() {
  const { t } = useLanguage();
  return (
    <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
      <Package className="w-4 h-4 text-amber-400" />
      {t('materialSummaryTitle')}
    </h3>
  );
}
