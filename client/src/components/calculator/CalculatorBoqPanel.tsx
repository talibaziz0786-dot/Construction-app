import React, { useState } from 'react';
import { Loader2, Printer, Receipt, RefreshCw } from 'lucide-react';
import type { CalculatorRateEntryInput } from '../../types/calculator-types.js';
import type { Boq, BoqItem } from '../../types/calculation-types.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { fromCuMeters, fromSqMeters } from '../../utils/unitConversion.js';

interface CalculatorBoqPanelProps {
  boq: Boq;
  isBusy: boolean;
  onApplyRates: (rates: CalculatorRateEntryInput[], currency: string) => void;
}

const COMMON_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'PKR', 'BDT', 'NGN', 'ZAR', 'AUD'];

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQuantity(item: BoqItem): string {
  // Server quantities are canonical SI (cu.m / sq.m); the BOQ panel presents
  // them in familiar Indian site units. The numeric value is converted — never
  // just relabelled — so the BOQ always agrees with the calculation result.
  if (item.unit === 'cu.m') {
    const cuFt = fromCuMeters(item.quantity, 'cu.ft');
    const display = cuFt < 10
      ? cuFt.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : Math.round(cuFt).toLocaleString();
    return `${display} cu ft`;
  }
  if (item.unit === 'sq.m') {
    const sqFt = fromSqMeters(item.quantity, 'sq.ft');
    return `${Math.round(sqFt).toLocaleString()} sq ft`;
  }
  if (item.unit === 'piece') {
    return `${Math.ceil(item.quantity).toLocaleString()} ${item.category === 'cement' ? 'bags' : item.category === 'brick' ? 'bricks' : 'pcs'}`;
  }
  const value = Number.isInteger(item.quantity)
    ? item.quantity.toLocaleString()
    : item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${value} ${item.unit}`;
}

function formatBoqUnit(unit: string, category: string): string {
  if (unit === 'cu.m') return 'cu ft';
  if (unit === 'sq.m') return 'sq ft';
  if (unit === 'piece') {
    if (category === 'cement') return 'bags';
    if (category === 'brick') return 'bricks';
    return 'pcs';
  }
  return unit;
}

/**
 * BOQ presentation with optional user-entered rates.
 *
 * Amounts and totals always come from the server. When no usable rate exists the
 * line is shown as "Rate unavailable" instead of a fabricated price.
 */
export const CalculatorBoqPanel: React.FC<CalculatorBoqPanelProps> = ({
  boq,
  isBusy,
  onApplyRates,
}) => {
  const [currency, setCurrency] = useState(boq.currency || 'INR');
  const { t } = useLanguage();
  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      boq.sections
        .flatMap((section) => section.items)
        .map((item) => [item.id, item.rate !== null ? String(item.rate) : ''])
    )
  );

  const items = boq.sections.flatMap((section) => section.items);
  const pricedItems = items.filter((item) => item.amount !== null);
  const unpricedCount = items.length - pricedItems.length;
  const hasRateEntry = items.some((item) => !item.rateUnavailable);

  const applyRates = () => {
    const entries: CalculatorRateEntryInput[] = items.map((item) => ({
      category: item.category,
      rate: rates[item.id] ? Number.parseFloat(rates[item.id]) : null,
      unit: item.unit,
      currency,
    }));
    onApplyRates(entries, currency);
  };

  const renderRateInput = (item: BoqItem, placeholder: string, className: string) => (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      value={rates[item.id] ?? ''}
      onChange={(event) =>
        setRates((previous) => ({ ...previous, [item.id]: event.target.value }))
      }
      aria-label={`Rate for ${item.description}`}
      placeholder={placeholder}
      className={className}
    />
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <p className="text-sm text-slate-400">
          {t('boqEmpty')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-base font-semibold text-slate-100">
          <Receipt className="w-4 h-4 text-amber-400" />
          {t('boqTitle')}
        </h3>
        <div className="flex items-center gap-2">
          <label htmlFor="boq-currency" className="text-xs opacity-70">
            {t('currencyLabel')}
          </label>
          <input
            id="boq-currency"
            list="boq-currency-options"
            value={currency}
            maxLength={10}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <datalist id="boq-currency-options">
            {COMMON_CURRENCIES.map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
              <th className="p-2.5 font-medium">Item</th>
              <th className="p-2.5 text-right font-medium">Quantity</th>
              <th className="p-2.5 text-right font-medium">Rate ({currency})</th>
              <th className="p-2.5 text-right font-medium">Amount ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-2.5">
                  <span className="block text-slate-200">{item.description}</span>
                  {item.rateUnavailable && (
                    <span className="mt-0.5 block text-xs text-amber-400/90">
                      {t('boqRateUnavailable')}
                    </span>
                  )}
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {t('boqTheoretical')} {item.theoreticalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {formatBoqUnit(item.unit, item.category)} · {t('boqWastage')} {item.wastagePercentage}%
                  </span>
                </td>
                <td className="p-2.5 text-right text-slate-300">{formatQuantity(item)}</td>
                <td className="p-2.5 text-right">
                  {renderRateInput(
                    item,
                    t('boqRatePer'),
                    'min-h-[44px] w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50'
                  )}
                </td>
                <td className="p-2.5 text-right font-semibold">
                  {item.amount !== null ? formatAmount(item.amount, item.currency) : t('boqRateUnavailable')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked lines */}
      <div className="space-y-3 sm:hidden">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">{item.description}</span>
              <span className="whitespace-nowrap text-sm text-slate-300">
                {formatQuantity(item)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {renderRateInput(
                item,
                `${t('boqRatePer')} ${formatBoqUnit(item.unit, item.category)}`,
                'min-h-[44px] w-32 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50'
              )}
              <span className="text-sm font-semibold text-slate-100" aria-live="polite">
                {item.amount !== null
                  ? formatAmount(item.amount, item.currency)
                  : t('boqRateUnavailable')}
              </span>
            </div>
            <p className="mt-2 text-xs opacity-70">
              {t('boqTheoretical')}{' '}
              {item.theoreticalQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              {formatBoqUnit(item.unit, item.category)} · {t('boqWastage')} {item.wastagePercentage}%
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70">{t('boqEstimatedTotal')}</p>
          {pricedItems.length > 0 ? (
            <p className="text-xl font-bold text-emerald-400">
              {formatAmount(boq.grandTotal, boq.currency)}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-200">
              {t('boqEnterRateHint')}
            </p>
          )}
          {unpricedCount > 0 && pricedItems.length > 0 && (
            <p className="mt-1 text-xs text-amber-400/90" role="note">
              {t('boqEstimatedTotal')} · {t('boqRateUnavailable')} ({unpricedCount})
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyRates}
            disabled={isBusy}
            aria-label={t('boqUpdateCost')}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t('boqUpdateCost')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label={t('boqPrint')}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
          >
            <Printer className="w-4 h-4" />
            {t('boqPrint')}
          </button>
        </div>
      </div>

      {!hasRateEntry && (
        <p className="text-xs text-slate-500">
          {t('boqEnterRateHint')} {t('boqNoAmounts')} {t('boqRateHint')}
        </p>
      )}
    </div>
  );
};
