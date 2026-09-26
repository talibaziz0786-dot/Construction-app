import type {
  CalculatorHubCategory,
  CalculatorHubEntry,
  CalculatorRunRequest,
  CalculatorRunResponse,
} from '../types/calculator-types.js';

/**
 * Calculator API client.
 * All calculator metadata, validation and results come from the server — the
 * client never derives quantities or prices on its own.
 */
import { apiUrl } from './apiBase.js';

export class CalculatorApiError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'CalculatorApiError';
    this.details = details;
  }
}

async function readError(response: Response, fallback: string): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  const message = typeof record?.error === 'string' ? record.error : fallback;
  const details = Array.isArray(record?.details)
    ? record.details.filter((detail): detail is string => typeof detail === 'string')
    : [];
  throw new CalculatorApiError(message, details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Validates the hub payload and drops malformed entries instead of letting them
 * reach the render pass (a malformed entry previously produced a runtime
 * exception and an empty screen). Throws only when nothing usable is returned.
 */
export function normalizeHubCategories(raw: unknown): CalculatorHubCategory[] {
  const record = isRecord(raw) ? raw : {};
  const categories = Array.isArray(record.categories) ? record.categories : null;

  if (!categories) {
    throw new CalculatorApiError('Calculator listing is malformed (missing categories)');
  }

  const normalized: CalculatorHubCategory[] = [];
  for (const category of categories) {
    if (!isRecord(category)) continue;
    const calculators = Array.isArray(category.calculators) ? category.calculators : [];
    const entries: CalculatorHubEntry[] = [];
    for (const entry of calculators) {
      if (!isRecord(entry)) continue;
      if (typeof entry.calculatorId !== 'string' || entry.calculatorId === '') continue;
      if (typeof entry.name !== 'string' || entry.name === '') continue;
      const status = entry.status === 'available' ? 'available' : 'coming-soon';
      entries.push({
        calculatorId: entry.calculatorId,
        name: entry.name,
        category: (typeof category.id === 'string' ? category.id : 'area') as CalculatorHubEntry['category'],
        summary: typeof entry.summary === 'string' ? entry.summary : '',
        status,
        fields: status === 'available' && Array.isArray(entry.fields) ? entry.fields : [],
      });
    }
    if (entries.length === 0) continue;
    normalized.push({
      id: (typeof category.id === 'string' ? category.id : 'area') as CalculatorHubCategory['id'],
      name: typeof category.name === 'string' ? category.name : '',
      summary: typeof category.summary === 'string' ? category.summary : '',
      calculators: entries,
    });
  }

  if (normalized.length === 0) {
    throw new CalculatorApiError('Calculator listing is empty or malformed');
  }

  return normalized;
}

/**
 * The live calculators the hub must always show. If the API listing is missing
 * one of these the hub surfaces a visible notice (and a retry) instead of
 * silently rendering an incomplete — or empty — page.
 */
export const REQUIRED_LIVE_CALCULATORS = [
  'room.floor-area',
  'wall.net-area',
  'masonry.brick-quantity',
  'concrete.volume',
  'plaster.quantity',
  'tile.quantity',
] as const;

/** Returns the required live calculators absent from a hub listing. */
export function findMissingRequiredCalculators(categories: CalculatorHubCategory[]): string[] {
  const present = new Set<string>();
  for (const category of categories) {
    // Guard malformed payloads so a bad entry can never throw during render.
    const calculators = Array.isArray(category.calculators) ? category.calculators : [];
    for (const entry of calculators) {
      if (entry.status === 'available') present.add(entry.calculatorId);
    }
  }
  return REQUIRED_LIVE_CALCULATORS.filter((id) => !present.has(id));
}

/** Loads the calculator hub listing (available + coming-soon calculators). */
export async function fetchCalculatorHub(): Promise<CalculatorHubCategory[]> {
  const response = await fetch(apiUrl('/calculators'));

  if (!response.ok) {
    await readError(response, `Failed to load calculators (${response.status})`);
  }

  // A wrong API base returns the HTML shell with HTTP 200; parsing must fail
  // loudly instead of silently rendering an empty hub.
  const body: unknown = await response.json().catch(() => {
    throw new CalculatorApiError('Calculator listing could not be read (unexpected response)');
  });

  return normalizeHubCategories(body);
}

/** Runs one verified calculator and returns its result, traceability and BOQ. */
export async function runCalculator(
  calculatorId: string,
  request: CalculatorRunRequest
): Promise<CalculatorRunResponse> {
  const response = await fetch(apiUrl(`/calculators/${encodeURIComponent(calculatorId)}/calculate`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    await readError(response, `Calculation failed (${response.status})`);
  }

  return (await response.json()) as CalculatorRunResponse;
}
