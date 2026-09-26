import React, { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, Home, Layers, FileText } from 'lucide-react';
import type { ProjectEstimateState } from '../../hooks/useMultiRoomProject.js';
import { ExportReportModal } from '../reports/ExportReportModal.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatBilingual } from '../../constants/terminology.js';
import { formatCount } from '../../utils/unitConversion.js';
import { formatLengthFriendly } from '../../utils/friendlyUnits.js';

interface HouseSummaryProps {
  totalRooms: number;
  projectName: string;
  estimate: ProjectEstimateState;
  onCalculate: () => void;
  roomsNeedingCalc: string[];
}

export function HouseSummary({ totalRooms, projectName, estimate, onCalculate, roomsNeedingCalc }: HouseSummaryProps) {
  const { result, isCalculating, error } = estimate;
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { formatArea } = useUnit();
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Home className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">{projectName}</h2>
            <p className="text-xs text-slate-400">
              {totalRooms} {lang === 'hi' ? 'कमरे (rooms)' : `room${totalRooms !== 1 ? 's' : ''}`}
              {lang === 'hi' ? ' — परियोजना में' : ' in project'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition"
            >
              <FileText className="w-4 h-4" />
              <span>{t('reportExport')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onCalculate()}
            disabled={isCalculating || totalRooms === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs sm:text-sm rounded-lg transition"
          >
            <Calculator className="w-4 h-4" />
            {isCalculating ? t('formCalculating') : t('workspaceCalculateAll')}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">{t('errorCalculationFailed')}</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: formatBilingual('floorArea'),
                value: formatArea(result.floorAreaSqM),
                sub: lang === 'hi' ? 'कुल फर्श क्षेत्रफल (Total floor area)' : 'Total floor area',
              },
              {
                label: formatBilingual('netWallArea'),
                value: formatArea(result.netWallAreaSqM),
                sub: lang === 'hi' ? 'ओपनिंग घटाकर (after opening deduction)' : 'after opening deduction',
              },
              {
                label: formatBilingual('bricksNeeded'),
                value: `${formatCount(result.procurementQuantityBricks)} ${lang === 'hi' ? 'ईंटें (bricks)' : 'bricks'}`,
                sub: lang === 'hi' ? 'बर्बादी सहित (incl. wastage)' : 'incl. wastage',
              },
              {
                label: formatBilingual('theoreticalBricks'),
                value: `${formatCount(result.theoreticalBrickQuantity)} ${lang === 'hi' ? 'ईंटें (bricks)' : 'bricks'}`,
                sub: lang === 'hi' ? 'बर्बादी से पहले (before wastage)' : 'before wastage',
              },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-xs text-slate-400">{m.label}</p>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{m.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Per-room breakdown */}
          {result.roomSummaries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                {lang === 'hi' ? 'कमरेवार विवरण (Per-Room Breakdown)' : 'Per-Room Breakdown'}
              </h3>
              <div className="space-y-2">
                {result.roomSummaries.map((r) => (
                  <div key={r.roomId} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-slate-200">{r.roomName}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>{formatArea(r.floorAreaSqM)}</span>
                      <span>{formatCount(r.procurementQuantityBricks)} {lang === 'hi' ? 'ईंटें (Bricks)' : 'Bricks'}</span>
                      <span className="hidden sm:inline opacity-70">{formatLengthFriendly(Math.sqrt(Math.max(0, r.floorAreaSqM)))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {t('explainWastageTitle')}
              </p>
              <ul className="space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-400/80">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Rooms needing recalc */}
          {roomsNeedingCalc.length > 0 && (
            <p className="text-xs text-slate-500 text-center">
              {roomsNeedingCalc.length}{' '}
              {lang === 'hi'
                ? 'कमरों की पुनर्गणना बाकी है (rooms pending recalculation)'
                : `room${roomsNeedingCalc.length !== 1 ? 's' : ''} pending recalculation`}
            </p>
          )}

          {/* Report Modal */}
          <ExportReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            projectName={projectName}
            summary={result}
          />
        </div>
      )}

      {/* Empty state */}
      {!result && !error && !isCalculating && totalRooms === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-slate-800/60 border border-slate-700/60 mb-4">
            <Home className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-300 font-medium">{t('workspaceNoRooms')}</p>
          <p className="text-slate-500 text-sm mt-1">{t('workspaceNoRoomsHint')}</p>
        </div>
      )}
      {!result && !error && !isCalculating && totalRooms === 0 && (
        <p className="sr-only">{t('errorEmpty')}</p>
      )}
    </div>
  );
}