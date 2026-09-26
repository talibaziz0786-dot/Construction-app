import React from 'react';
import type { RoomGeometry } from '../../types/project.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatBilingualForLang } from '../../constants/terminology.js';

interface Props {
  geometry: RoomGeometry;
  onChange: (updates: Partial<RoomGeometry>) => void;
}

export const BrickSpecsCard: React.FC<Props> = ({ geometry, onChange }) => {
  const { smallLengthUnit, fromCanonicalLength, toCanonicalLength } = useUnit();
  const { lang } = useLanguage();
  const label = (key: 'brickSpecs' | 'brickLength' | 'brickWidth' | 'brickHeight' | 'mortarJoint' | 'wastage') =>
    formatBilingualForLang(key, lang);

  const bLength = fromCanonicalLength(geometry.brickLengthMeters, true, 2);
  const bWidth = fromCanonicalLength(geometry.brickWidthMeters, true, 2);
  const bHeight = fromCanonicalLength(geometry.brickHeightMeters, true, 2);
  const mortarThickness = fromCanonicalLength(geometry.mortarJointThicknessMeters, true, 2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
        <span>{label('brickSpecs')}</span>
        <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          {smallLengthUnit}
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('brickLength')} ({smallLengthUnit})
          </label>
          <input
            type="number"
            step="0.1"
            value={bLength}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onChange({ brickLengthMeters: toCanonicalLength(val, true) });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Default IS 1077: 19cm (0.19m / 7.48in)
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('brickWidth')} ({smallLengthUnit})
          </label>
          <input
            type="number"
            step="0.1"
            value={bWidth}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onChange({ brickWidthMeters: toCanonicalLength(val, true) });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Default IS 1077: 9cm (0.09m / 3.54in)
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('brickHeight')} ({smallLengthUnit})
          </label>
          <input
            type="number"
            step="0.1"
            value={bHeight}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onChange({ brickHeightMeters: toCanonicalLength(val, true) });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Default IS 1077: 9cm (0.09m / 3.54in)
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('mortarJoint')} ({smallLengthUnit})
          </label>
          <input
            type="number"
            step="0.1"
            value={mortarThickness}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              onChange({ mortarJointThicknessMeters: toCanonicalLength(val, true) });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Configurable joint: 1cm (0.01m / 0.39in)
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('wastage')} (%)
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={geometry.wastagePercentage}
            onChange={(e) => onChange({ wastagePercentage: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[10px] text-slate-500 mt-0.5 block">Optional allowance</span>
        </div>
      </div>
    </div>
  );
};

