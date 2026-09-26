import React, { useEffect, useState } from 'react';
import type { RoomGeometry } from '../../types/project.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatBilingualForLang } from '../../constants/terminology.js';
import { ftInToMeters, metersToFtIn } from '../../utils/friendlyUnits.js';

interface Props {
  geometry: RoomGeometry;
  onChange: (updates: Partial<RoomGeometry>) => void;
}

/** Common wall thickness presets (half brick / full brick / one-and-half brick). */
const THICKNESS_PRESETS_INCH = [4.5, 9, 13.5];

/**
 * Feet + inches input pair.
 * Display state is local so typing stays natural; the canonical value handed
 * back to the app is always meters (server contract unchanged).
 */
const FtInField: React.FC<{
  label: string;
  meters: number;
  minMeters: number;
  maxMeters: number;
  onChangeMeters: (meters: number) => void;
}> = ({ label, meters, minMeters, maxMeters, onChangeMeters }) => {
  const initial = metersToFtIn(meters);
  const [ftValue, setFtValue] = useState(() => String(initial.ft));
  const [inValue, setInValue] = useState(() => String(initial.inch));
  // While the user clears a box to retype, keep the last committed canonical
  // value instead of committing a transient 0 m — otherwise the outer room
  // state (and localStorage) records wallHeightMeters = 0 and the next
  // "Calculate All" fails server validation with "< 0.1".
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const localMeters = ftInToMeters(Number.parseFloat(ftValue) || 0, Number.parseFloat(inValue) || 0);
    if (Math.abs(localMeters - meters) > 0.001) {
      // Only resync when the canonical value changed elsewhere; never clobber
      // a box the user is actively clearing.
      const editing = ftValue === '' || inValue === '';
      if (!editing) {
        const { ft, inch } = metersToFtIn(meters);
        setFtValue(String(ft));
        setInValue(String(inch));
      }
    }
  }, [meters, ftValue, inValue]);

  const commit = (nextFt: string, nextIn: string) => {
    setFtValue(nextFt);
    setInValue(nextIn);
    // Empty box = mid-edit, not zero. Wait for a real number.
    if (nextFt.trim() === '' || nextIn.trim() === '') {
      setInvalid(true);
      return;
    }
    const nextMeters = ftInToMeters(Number.parseFloat(nextFt) || 0, Number.parseFloat(nextIn) || 0);
    if (!Number.isFinite(nextMeters) || nextMeters < minMeters || nextMeters > maxMeters) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChangeMeters(nextMeters);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          max={Math.floor(maxMeters / 0.3048)}
          value={ftValue}
          onChange={(e) => commit(e.target.value, inValue)}
          aria-label={`${label} — feet`}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
        />
        <span className="text-xs text-slate-500 shrink-0">ft</span>
        <input
          type="number"
          inputMode="decimal"
          step="1"
          min="0"
          max="11"
          value={inValue}
          onChange={(e) => commit(ftValue, e.target.value)}
          aria-label={`${label} — inches`}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
        />
        <span className="text-xs text-slate-500 shrink-0">in</span>
      </div>
      <span className={`text-[10px] mt-0.5 block ${invalid ? 'text-rose-400 font-medium' : 'text-slate-500'}`}>
        {invalid ? `Enter ${minMeters}–${maxMeters} m equivalent` : `${minMeters} m minimum allowed`}
      </span>
    </div>
  );
};

export const RoomDimensionsCard: React.FC<Props> = ({ geometry, onChange }) => {
  const { lengthUnit, smallLengthUnit, fromCanonicalLength, toCanonicalLength } = useUnit();
  const { lang } = useLanguage();

  const isImperial = lengthUnit === 'ft' || lengthUnit === 'in';
  const label = (key: 'length' | 'width' | 'wallHeight' | 'wallThickness' | 'roomDimensions') =>
    formatBilingualForLang(key, lang);
  const thicknessMeters = geometry.wallThicknessMeters;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
        <span>{label('roomDimensions')}</span>
        <span className="text-xs font-normal text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          {isImperial ? 'ft + in' : lengthUnit}
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {isImperial ? (
          <>
            <FtInField label={label('length')} meters={geometry.lengthMeters} minMeters={0.1} maxMeters={150}
              onChangeMeters={(value) => onChange({ lengthMeters: value })} />
            <FtInField label={label('width')} meters={geometry.widthMeters} minMeters={0.1} maxMeters={150}
              onChangeMeters={(value) => onChange({ widthMeters: value })} />
            <FtInField label={label('wallHeight')} meters={geometry.wallHeightMeters} minMeters={0.1} maxMeters={30}
              onChangeMeters={(value) => onChange({ wallHeightMeters: value })} />
          </>
        ) : (
          <>
            {([
              { key: 'length' as const, value: geometry.lengthMeters, max: 500, set: (v: number) => onChange({ lengthMeters: v }) },
              { key: 'width' as const, value: geometry.widthMeters, max: 500, set: (v: number) => onChange({ widthMeters: v }) },
              { key: 'wallHeight' as const, value: geometry.wallHeightMeters, max: 100, set: (v: number) => onChange({ wallHeightMeters: v }) },
            ]).map((dim) => (
              <div key={dim.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {label(dim.key)} ({lengthUnit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={dim.max}
                  value={fromCanonicalLength(dim.value, false, 2)}
                  onChange={(e) => dim.set(toCanonicalLength(Number.parseFloat(e.target.value) || 0, false))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </>
        )}

        {/* Wall thickness — inch presets in imperial, cm in metric */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            {label('wallThickness')} ({isImperial ? 'in' : smallLengthUnit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            value={fromCanonicalLength(thicknessMeters, true, 2)}
            onChange={(e) => onChange({ wallThicknessMeters: toCanonicalLength(Number.parseFloat(e.target.value) || 0, true) })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
          />
          {isImperial && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {THICKNESS_PRESETS_INCH.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ wallThicknessMeters: preset * 0.0254 })}
                  className="px-2 py-1 text-[10px] rounded-md border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 transition"
                >
                  {preset} in
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

