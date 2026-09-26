import React from 'react';
import type { RoomGeometry, OpeningItem } from '../../types/project.js';
import { Plus, Trash2, DoorOpen, AppWindow } from 'lucide-react';
import { useUnit } from '../../contexts/UnitContext.js';
import { useLanguage } from '../../contexts/LanguageContext.js';
import { formatBilingualForLang, getTerm } from '../../constants/terminology.js';

interface Props {
  geometry: RoomGeometry;
  onChange: (updates: Partial<RoomGeometry>) => void;
}

/** Values an opening field can accept from the form controls. */
export type OpeningFieldValue = number | string;

const WALL_SIDES = [
  { value: 'north', en: 'North', hi: 'उत्तर' },
  { value: 'south', en: 'South', hi: 'दक्षिण' },
  { value: 'east', en: 'East', hi: 'पूर्व' },
  { value: 'west', en: 'West', hi: 'पश्चिम' },
];

export const OpeningsCard: React.FC<Props> = ({ geometry, onChange }) => {
  const { lengthUnit, smallLengthUnit, fromCanonicalLength, toCanonicalLength } = useUnit();
  const { lang } = useLanguage();

  const isImperial = lengthUnit === 'ft' || lengthUnit === 'in';
  // Imperial openings are displayed in the active length unit (ft or in);
  // metric openings are displayed in the small unit (cm). The parse direction
  // must mirror the display direction — otherwise an ft entry would be read
  // back as inches and silently shrink every door/window deduction.
  const openingDisplayIsSmall = !isImperial;
  const openingUnit = isImperial ? lengthUnit : smallLengthUnit;
  const unitLabel = openingUnit;

  const handleOpeningChange = (index: number, field: keyof OpeningItem, value: OpeningFieldValue) => {
    const updated = [...geometry.openings];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ openings: updated });
  };

  const addOpening = (type: 'door' | 'window') => {
    const newOpening: OpeningItem = {
      id: `op-${Date.now()}`,
      type,
      widthMeters: type === 'door' ? 1.0 : 1.2,
      heightMeters: type === 'door' ? 2.1 : 1.2,
      quantity: 1,
    };
    onChange({ openings: [...geometry.openings, newOpening] });
  };

  const removeOpening = (id: string) => {
    onChange({ openings: geometry.openings.filter((o) => o.id !== id) });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
          <span>{formatBilingualForLang('openings', lang)}</span>
          <span className="text-xs font-normal text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
            {unitLabel}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addOpening('door')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>{getTerm('door', lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => addOpening('window')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>{getTerm('window', lang)}</span>
          </button>
        </div>
      </div>

      {geometry.openings.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-4 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
          {lang === 'hi'
            ? 'कोई दरवाज़ा/खिड़की नहीं जोड़ी गई — पूरी दीवार की गणना होगी।'
            : 'No openings added. Add doors or windows to calculate deductions.'}
        </p>
      ) : (
        <div className="space-y-3">
          {geometry.openings.map((op, index) => {
            const displayWidth = fromCanonicalLength(op.widthMeters, openingDisplayIsSmall, 1);
            const displayHeight = fromCanonicalLength(op.heightMeters, openingDisplayIsSmall, 1);

            return (
              <div
                key={op.id}
                className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-3 rounded-lg border border-slate-800"
              >
                <div className="col-span-12 sm:col-span-2 flex items-center gap-2 text-xs font-medium text-slate-300">
                  {op.type === 'door' ? (
                    <DoorOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AppWindow className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                  <span>{getTerm(op.type as 'door' | 'window', lang)}</span>
                </div>

                <div className="col-span-4 sm:col-span-3">
                  <label className="block text-[10px] text-slate-500">
                    {formatBilingualForLang('width', lang)} ({openingUnit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={displayWidth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleOpeningChange(index, 'widthMeters', toCanonicalLength(val, openingDisplayIsSmall));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-slate-500">
                    {formatBilingualForLang('wallHeight', lang)} ({openingUnit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={displayHeight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleOpeningChange(index, 'heightMeters', toCanonicalLength(val, openingDisplayIsSmall));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-[10px] text-slate-500">
                    {lang === 'hi' ? 'दीवार (Wall Side)' : 'Wall Side'}
                  </label>
                  <select
                    value={op.wallSide || 'north'}
                    onChange={(e) => handleOpeningChange(index, 'wallSide', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100"
                  >
                    {WALL_SIDES.map((side) => (
                      <option key={side.value} value={side.value}>
                        {lang === 'hi' ? `${side.hi} / ${side.en}` : `${side.en} / ${side.hi}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-[10px] text-slate-500">
                    {formatBilingualForLang('quantity', lang)}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={op.quantity}
                    onChange={(e) =>
                      handleOpeningChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 text-center"
                  />
                </div>

                <div className="col-span-6 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeOpening(op.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded"
                    title={lang === 'hi' ? 'दरवाज़ा/खिड़की हटाएं' : 'Remove opening'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
