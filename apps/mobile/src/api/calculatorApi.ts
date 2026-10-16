/**
 * Calculator API client (mobile).
 *
 * All calculator metadata, validation and results come from the server — the
 * mobile app never derives quantities or prices on its own. This mirrors the
 * web client's `client/src/services/calculatorService.ts` over the same API
 * contract; it lives here because the repository is not a monorepo yet and
 * cross-workspace imports are intentionally avoided.
 */
import { apiUrl } from './apiBase';
import type {
  CalculatorHubCategory,
  CalculatorHubEntry,
  CalculatorRunRequest,
  CalculatorRunResponse,
} from '../types/calculator';

export class CalculatorApiError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'CalculatorApiError';
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readError(response: Response, fallback: string): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const record = isRecord(body) ? body : null;
  const message = typeof record?.error === 'string' ? record.error : fallback;
  const details = Array.isArray(record?.details)
    ? record.details.filter((detail): detail is string => typeof detail === 'string')
    : [];
  throw new CalculatorApiError(message, details);
}

/**
 * Validates the hub payload and drops malformed entries instead of letting
 * them reach the render pass. Throws only when nothing usable is returned.
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
        category: typeof category.id === 'string' ? (category.id as CalculatorHubEntry['category']) : 'area',
        summary: typeof entry.summary === 'string' ? entry.summary : '',
        status,
        fields: status === 'available' && Array.isArray(entry.fields) ? entry.fields : [],
      });
    }
    if (entries.length === 0) continue;
    normalized.push({
      id: typeof category.id === 'string' ? (category.id as CalculatorHubCategory['id']) : 'area',
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

/** Loads the calculator hub listing (available + coming-soon calculators). */
export async function fetchCalculatorHub(): Promise<CalculatorHubCategory[]> {
  const response = await fetch(apiUrl('/calculators'));

  if (!response.ok) {
    await readError(response, `Failed to load calculators (${response.status})`);
  }

  // A wrong API base can return a non-JSON body; parsing must fail loudly.
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

/** True for device-level failures (offline, unreachable host, DNS). */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /network request failed/i.test(error.message);
}
