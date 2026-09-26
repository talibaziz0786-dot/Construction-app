import React, { useEffect } from 'react';
import { Download, FileText, Printer, CheckCircle2, AlertTriangle, Building2, Layers, DollarSign, X } from 'lucide-react';
import type { CalculationResultSummary, Boq, BoqSection } from '../../types/calculation-types.js';
import { useLanguage } from '../../contexts/LanguageContext.js';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  summary: CalculationResultSummary;
}

/**
 * Professional Construction Estimate & Bill of Quantities (BOQ) Report Export Modal
 * Consumes server-authoritative results directly.
 * Designed with a print-first stylesheet (A4 friendly, clean pagination).
 */
export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  summary,
}) => {
  const { t } = useLanguage();
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Bill of quantities is always returned as a canonical Boq object by the server.
  let boqSections: BoqSection[] = [];
  let grandTotalCost: number | null = null;
  const currency = summary.currency || summary.costSummary?.currency || 'USD';

  if (summary.boq) {
    boqSections = summary.boq.sections;
    grandTotalCost = summary.boq.grandTotal;
  }

  if (grandTotalCost === null && summary.costSummary) {
    grandTotalCost = summary.costSummary.grandTotal ?? summary.costSummary.totalCost ?? summary.costSummary.totalProjectCost ?? null;
  }

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm print:p-0 print:bg-white print:static print:block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, nav, main, footer, button, .print\\:hidden {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 5px 8px !important;
            text-align: left !important;
            color: #0f172a !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            font-weight: 700 !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print-area print:max-h-none print:w-full print:border-none print:shadow-none print:bg-white print:text-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/80 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-lg font-bold text-slate-100">
                {t('reportModalTitle')}
              </h2>
              <p className="text-xs text-slate-400">{t('reportModalSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-md hover:shadow-amber-500/20"
              aria-label={t('reportPrintAria')}
            >
              <Printer className="w-4 h-4" />
              <span>{t('reportPrint')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              aria-label={t('reportCloseAria')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm print:overflow-visible print:p-0 print:text-slate-900 print:space-y-6">
          
          {/* Header Banner */}
          <div className="border-b border-slate-800 pb-5 print:border-slate-300">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-amber-500 print:text-amber-700 block mb-1">
                  {t('reportOfficialHeading')}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-100 print:text-slate-900">
                  {projectName || summary.projectName || t('reportProjectFallback')}
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  {t('reportOfficialSubtitle')}
                </p>
              </div>
              <div className="text-right text-xs space-y-1 text-slate-400 print:text-slate-700">
                <p><span className="font-semibold text-slate-200 print:text-slate-900">{t('reportDate')}</span> {generatedDate}</p>
                <p><span className="font-semibold text-slate-200 print:text-slate-900">{t('reportEngineVersion')}</span> v{summary.methodologyVersion ?? '1.0.0'}</p>
                <p><span className="font-semibold text-slate-200 print:text-slate-900">{t('reportStatus')}</span> {t('reportStatusVerified')}</p>
              </div>
            </div>
          </div>

          {/* Key Executive Summary Metrics */}
          <div className="print-break-inside-avoid">
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider mb-3">
              {t('reportExecSummary')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
              <div className="p-3 rounded-xl border">
                <span className="text-xs block">{t('reportTotalFloorArea')}</span>
                <span className="text-lg font-bold block">{(summary.floorAreaSqM * 10.7639).toFixed(0)} sq ft</span>
              </div>
              <div className="p-3 rounded-xl border">
                <span className="text-xs block">{t('reportNetWallArea')}</span>
                <span className="text-lg font-bold block">{(summary.netWallAreaSqM * 10.7639).toFixed(0)} sq ft</span>
                <span className="text-[10px] block opacity-60">{t('reportExclOpenings')}</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl print:bg-slate-50 print:border-slate-300">
                <span className="text-xs text-slate-400 print:text-slate-600 block">{t('reportProcurementBricks')}</span>
                <span className="text-lg font-bold text-amber-400 print:text-amber-800">{Math.ceil(summary.procurementQuantityBricks).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 print:text-slate-500 block">{t('reportInclWastage')}</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl print:bg-slate-50 print:border-slate-300">
                <span className="text-xs text-slate-400 print:text-slate-600 block">{t('reportTotalCost')}</span>
                <span className="text-lg font-bold text-emerald-400 print:text-emerald-800">
                  {grandTotalCost !== null
                    ? `${currency} ${grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : t('reportRatesPending')}
                </span>
                <span className="text-[10px] text-slate-500 print:text-slate-500 block">{currency} {t('reportCurrencySuffix')}</span>
              </div>
            </div>
          </div>

          {/* Per-Room Geometry */}
          {summary.roomSummaries && summary.roomSummaries.length > 0 && (
            <div className="space-y-3 print-break-inside-avoid">
              <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400 print:hidden" />
                {t('reportRoomGeometry')}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-slate-300">
                <table className="w-full text-left border-collapse print-table">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-300 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                      <th className="p-3">{t('reportRoomName')}</th>
                      <th className="p-3 text-right">{t('reportFloorArea')}</th>
                      <th className="p-3 text-right">{t('reportNetWallArea')}</th>
                      <th className="p-3 text-right">{t('reportProcurementBricks')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-300 text-xs">
                    {summary.roomSummaries.map((room) => (
                      <tr key={room.roomId} className="hover:bg-slate-800/20">
                        <td className="p-3 font-medium text-slate-200 print:text-slate-900">{room.roomName}</td>
                        <td className="p-3 text-right">{(room.floorAreaSqM * 10.7639).toFixed(0)} sq ft</td>
                        <td className="p-3 text-right">{(room.netWallAreaSqM * 10.7639).toFixed(0)} sq ft</td>
                        <td className="p-3 text-right font-semibold text-amber-400 print:text-slate-900">
                          {Math.ceil(room.procurementQuantityBricks).toLocaleString()} {t('reportUnitsLabel')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bill of Quantities (BOQ) */}
          {boqSections.length > 0 && (
            <div className="space-y-4 print-break-inside-avoid">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400 print:hidden" />
                  {t('reportBoqHeading')}
                </h3>
              </div>

              <div className="space-y-4">
                {boqSections.map((sec) => (
                  <div key={sec.id} className="border border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
                    <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-300">
                      <span className="font-semibold text-xs text-slate-200 print:text-slate-900">{sec.name}</span>
                      <span className="text-xs font-bold text-emerald-400 print:text-emerald-800">
                        {t('reportSubtotal')} {currency} {sec.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse print-table text-xs">
                        <thead>
                          <tr className="bg-slate-900/50 border-b border-slate-800 text-slate-400 print:bg-slate-50 print:text-slate-700 print:border-slate-300">
                            <th className="p-2.5">{t('reportItemDescription')}</th>
                            <th className="p-2.5 text-right">{t('reportQuantity')}</th>
                            <th className="p-2.5 text-center">{t('reportUnit')}</th>
                            <th className="p-2.5 text-right">{t('reportRate')} ({currency})</th>
                            <th className="p-2.5 text-right">{t('reportAmount')} ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 print:divide-slate-300">
                          {sec.items.map((item, idx) => (
                            <tr key={item.id || `item-${idx}`}>
                              <td className="p-2.5 text-slate-200 print:text-slate-900">{item.description}</td>
                              <td className="p-2.5 text-right font-medium text-slate-300 print:text-slate-800">
                                {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2.5 text-center text-slate-400 print:text-slate-700">{item.unit}</td>
                              <td className="p-2.5 text-right text-slate-300 print:text-slate-800">
                                {item.rate !== null && item.rate > 0 ? item.rate.toFixed(2) : t('boqRateUnavailable')}
                              </td>
                              <td className="p-2.5 text-right font-semibold text-slate-100 print:text-slate-900">
                                {item.amount !== null ? item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions & Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print-break-inside-avoid pt-2">
            {summary.assumptions && summary.assumptions.length > 0 && (
              <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 print:bg-slate-50 print:border-slate-300">
                <span className="text-xs font-semibold text-slate-300 print:text-slate-800 block">
                  {t('reportAssumptionsHeading')}
                </span>
                <ul className="text-xs text-slate-400 print:text-slate-600 space-y-1 list-disc list-inside">
                  {summary.assumptions.map((ass, i) => (
                    <li key={i}>{ass}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.warnings && summary.warnings.length > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 print:bg-amber-50/50 print:border-amber-300">
                <span className="text-xs font-semibold text-amber-300 print:text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 print:hidden" /> {t('reportWarningsHeading')}
                </span>
                <ul className="text-xs text-amber-400/90 print:text-amber-800 space-y-1 list-disc list-inside">
                  {summary.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Statutory Disclaimer */}
          <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500 print:border-slate-300 print:text-slate-500 space-y-1 print-break-inside-avoid">
            <p className="font-semibold text-slate-400 print:text-slate-600">{t('reportDisclaimerTitle')}</p>
            <p>
              {t('reportDisclaimerBody')}
            </p>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-900/90 shrink-0 print:hidden">
          <span className="text-xs text-slate-400">
            {t('reportPrintNote')}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm rounded-xl transition"
            >
              {t('reportClose')}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-amber-500/10"
            >
              <Printer className="w-4 h-4" />
              <span>{t('reportPrint')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
