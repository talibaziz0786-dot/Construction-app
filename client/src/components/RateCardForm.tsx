import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, AlertTriangle, DollarSign } from 'lucide-react';
import type { IRateCardEntrySchema, MaterialCategory } from '../types/project.js';

export type RateCardEntry = IRateCardEntrySchema & { id: string };

interface RateCardFormProps {
  entries: RateCardEntry[];
  currency: string;
  onUpdate: (entries: RateCardEntry[], currency: string) => void;
  hasMissingRates: boolean;
}

const CATEGORIES: Array<{ value: MaterialCategory; label: string }> = [
  { value: 'brick', label: 'Bricks' },
  { value: 'cement', label: 'Cement' },
  { value: 'sand', label: 'Sand' },
  { value: 'aggregate', label: 'Aggregate' },
  { value: 'block', label: 'Concrete Block' },
  { value: 'steel', label: 'Steel' },
  { value: 'tile', label: 'Tiles' },
  { value: 'adhesive', label: 'Tile Adhesive' },
  { value: 'grout', label: 'Tile Grout' },
  { value: 'paint', label: 'Paint' },
  { value: 'primer', label: 'Primer' },
  { value: 'putty', label: 'Wall Putty' },
  { value: 'waterproofing', label: 'Waterproofing' },
  { value: 'pipe', label: 'Pipes' },
  { value: 'fitting', label: 'Fittings' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'door', label: 'Doors' },
  { value: 'window', label: 'Windows' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'other', label: 'Other' },
];

const UNITS: Array<{ value: string; label: string }> = [
  { value: 'nos', label: 'nos (numbers)' },
  { value: 'bags', label: 'bags' },
  { value: 'kg', label: 'kg' },
  { value: 'cu.m', label: 'cubic meters' },
  { value: 'sq.m', label: 'square meters' },
  { value: 'running.m', label: 'running meters' },
  { value: 'liters', label: 'liters' },
  { value: 'sets', label: 'sets' },
];

function genId() {
  return Math.random().toString(36).slice(2, 11);
}

function makeEntry(partial?: Partial<RateCardEntry>): RateCardEntry {
  return {
    id: genId(),
    category: 'brick',
    rate: null,
    unit: 'nos',
    currency: 'USD',
    source: '',
    location: '',
    ...partial,
  };
}

function emptyEntry(): RateCardEntry {
  return makeEntry();
}

export function RateCardForm({ entries, currency, onUpdate, hasMissingRates }: RateCardFormProps) {
  const [editEntries, setEditEntries] = useState<RateCardEntry[]>(() =>
    entries.length > 0 ? entries : [emptyEntry()]
  );
  const [editCurrency, setEditCurrency] = useState(currency);

  const updateEntry = useCallback((id: string, patch: Partial<RateCardEntry>) => {
    setEditEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  const addEntry = useCallback(() => {
    setEditEntries(prev => [...prev, emptyEntry()]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEditEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    onUpdate(editEntries, editCurrency);
  }, [editEntries, editCurrency, onUpdate]);

  const missingCount = editEntries.filter(e => e.rate === null || e.rate === undefined).length;
  const totalRate = editEntries.reduce((sum, e) => sum + (e.rate ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">Material Rate Card</h2>
            <p className="text-xs text-slate-400">{editEntries.length} material{editEntries.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="rc-currency" className="text-xs text-slate-400 font-medium">Currency</label>
          <select
            id="rc-currency"
            value={editCurrency}
            onChange={(e) => setEditCurrency(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>
      {/* Missing Rates Alert */}
      {hasMissingRates && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-sm">Missing Rates Detected</h3>
            <p className="text-xs">Some materials do not have rates defined. Costs will not be calculated for these items.</p>
          </div>
        </div>
      )}

      {/* Rate Entries */}
      <div className="space-y-4">
        {editEntries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-12 gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
            {/* Category */}
            <div className="col-span-3">
              <label htmlFor={`category-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select
                id={`category-${entry.id}`}
                value={entry.category}
                onChange={(e) => updateEntry(entry.id, { category: e.target.value as MaterialCategory })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            {/* Rate */}
            <div className="col-span-2">
              <label htmlFor={`rate-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Rate</label>
              <input
                id={`rate-${entry.id}`}
                type="number"
                step="0.01"
                value={entry.rate ?? ''}
                onChange={(e) => updateEntry(entry.id, { rate: e.target.value === '' ? null : parseFloat(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
              />
            </div>
            {/* Unit */}
            <div className="col-span-2">
              <label htmlFor={`unit-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
              <select
                id={`unit-${entry.id}`}
                value={entry.unit}
                onChange={(e) => updateEntry(entry.id, { unit: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
            {/* Item / material label */}
            <div className="col-span-6">
              <label htmlFor={`item-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Material / Item (Optional)</label>
              <input
                id={`item-${entry.id}`}
                type="text"
                value={entry.item ?? ''}
                maxLength={120}
                onChange={(e) => updateEntry(entry.id, { item: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Red clay brick 9×4×3"
              />
            </div>
            {/* Notes */}
            <div className="col-span-6">
              <label htmlFor={`notes-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Notes (Optional)</label>
              <input
                id={`notes-${entry.id}`}
                type="text"
                value={entry.notes ?? ''}
                maxLength={300}
                onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Vendor A, Jan 2026 price"
              />
            </div>
            {/* Source */}
            <div className="col-span-2">
              <label htmlFor={`source-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Source (Optional)</label>
              <input
                id={`source-${entry.id}`}
                type="text"
                value={entry.source ?? ''}
                onChange={(e) => updateEntry(entry.id, { source: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Local Vendor A"
              />
            </div>
            {/* Location */}
            <div className="col-span-2">
              <label htmlFor={`location-${entry.id}`} className="block text-xs font-medium text-slate-400 mb-1">Location (Optional)</label>
              <input
                id={`location-${entry.id}`}
                type="text"
                value={entry.location ?? ''}
                onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., City X"
              />
            </div>
            {/* Remove Button */}
            <div className="col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="w-full p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Remove entry"
              >
                <Trash2 className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Entry Button */}
      <button
        type="button"
        onClick={addEntry}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Plus className="w-4 h-4" />
        Add Material
      </button>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 text-emerald-400 font-semibold rounded-lg hover:bg-emerald-600/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={missingCount > 0}
        >
          <Save className="w-5 h-5" />
          Save Rate Card
        </button>
      </div>
    </div>
  );
}
