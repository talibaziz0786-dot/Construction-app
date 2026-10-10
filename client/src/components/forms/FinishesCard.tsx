import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RoomGeometry } from '../../types/project.js';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';

interface Props {
  geometry: RoomGeometry;
  onChange: (updates: Partial<RoomGeometry>) => void;
}

/**
 * Optional finishing specifications (slab, plaster, tiles).
 *
 * Progressive disclosure: collapsed by default so the room form stays short.
 * All values are stored canonically in metres and only sent to the server when
 * the user actually edits them — the server keeps the documented defaults.
 * No construction formula lives in this component.
 */
export const FinishesCard: React.FC<Props> = ({ geometry, onChange }) => {
  const { smallLengthUnit, fromCanonicalLength, toCanonicalLength } = useUnit();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const fields: Array<{
    labelKey: 'finishesSlab' | 'finishesPlaster' | 'finishesTileLength' | 'finishesTileWidth';
    value: number | undefined;
    fallback: number;
    set: (nextMeters: number) => void;
  }> = [
    {
      labelKey: 'finishesSlab',
      value: geometry.slabDepthMeters,
      fallback: 0.15,
      set: (nextMeters) => onChange({ slabDepthMeters: nextMeters }),
    },
    {
      labelKey: 'finishesPlaster',
      value: geometry.plasterThicknessMeters,
      fallback: 0.012,
      set: (nextMeters) => onChange({ plasterThicknessMeters: nextMeters }),
    },
    {
      labelKey: 'finishesTileLength',
      value: geometry.tileLengthMeters,
      fallback: 0.5,
      set: (nextMeters) => onChange({ tileLengthMeters: nextMeters }),
    },
    {
      labelKey: 'finishesTileWidth',
      value: geometry.tileWidthMeters,
      fallback: 0.5,
      set: (nextMeters) => onChange({ tileWidthMeters: nextMeters }),
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <span className="text-base font-semibold text-slate-100">{t('finishesTitle')}</span>
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500">{t('finishesHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map((field) => (
              <div key={field.labelKey}>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t(field.labelKey)} ({smallLengthUnit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  value={fromCanonicalLength(field.value ?? field.fallback, true, 2)}
                  onChange={(e) =>
                    field.set(toCanonicalLength(Number.parseFloat(e.target.value) || 0, true))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
