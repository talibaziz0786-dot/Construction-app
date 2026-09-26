import React from 'react';
import type { CalculationResultSummary } from '../types/calculation-types.js';
import { Calculator, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { useUnit } from '../contexts/UnitContext.js';
import { formatBilingual } from '../constants/terminology.js';
import { formatCount } from '../utils/unitConversion.js';

interface CalculationSummaryProps {
  summary: CalculationResultSummary;
  isCalculating?: boolean;
}

export const CalculationSummary: React.FC<CalculationSummaryProps> = ({ summary, isCalculating }) => {
  const { formatArea, formatVolume } = useUnit();

  return (
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {isCalculating && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs text-amber-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating calculation...</span>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Methodology v{summary.methodologyVersion} (VERIFIED SERVER)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Construction Estimate & BOQ Summary</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-right">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            {formatBilingual('procurementQuantity')}
          </span>
          <span className="text-2xl font-extrabold text-amber-400">
            {formatCount(summary.procurementQuantityBricks)}{' '}
            <span className="text-xs font-normal text-slate-300">
              {formatBilingual('bricks')}
            </span>
          </span>
        </div>
      </div>

      {/* Warnings if any */}
      {summary.warnings.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Geometry Warnings</span>
            <ul className="list-disc list-inside space-y-1">
              {summary.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Floor Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('floorArea')}</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Calculated</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{formatArea(summary.floorAreaSqM)}</div>
        </div>

        {/* Net Wall Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('netWallArea')}</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Calculated</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{formatArea(summary.netWallAreaSqM)}</div>
        </div>

        {/* Masonry Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('netMasonryVolume')}</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Calculated</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{formatVolume(summary.netMasonryVolumeCuM)}</div>
        </div>

        {/* Theoretical Brick Quantity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('theoreticalBricks')}</span>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">Estimated</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{formatCount(summary.theoreticalBrickQuantity)}</div>
        </div>

        {/* Procurement Allowance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('wastage')}</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">User Assumption</span>
          </div>
          <div className="text-xl font-bold text-slate-100">+{formatCount(summary.procurementAllowanceBricks ?? 0)} {formatBilingual('bricks', '')}</div>
        </div>

        {/* Procurement Quantity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow border-amber-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{formatBilingual('procurementQuantity')}</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">Rounded Up</span>
          </div>
          <div className="text-xl font-bold text-amber-400">{formatCount(summary.procurementQuantityBricks)} Units</div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Calculation Assumptions
        </h3>
        <ul className="space-y-2">
          {(summary.assumptions ?? []).map((item, idx) => (
            <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
              <span className="text-amber-400 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

