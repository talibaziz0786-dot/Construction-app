/**
 * Calculator API
 *
 * GET  /api/calculators                          → calculator hub listing
 * POST /api/calculators/:calculatorId/calculate  → run one verified calculator
 *
 * The route owns no construction mathematics: it validates the request, runs the
 * canonical composition through the estimation orchestrator, and resolves BOQ
 * amounts from user-entered rates only.
 */
import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  BoqLineDraft,
  buildCalculatorHub,
  findQuickCalculator,
} from '../catalog/CalculatorCatalog.js';
import { EstimationOrchestrator } from '../engine/orchestration/EstimationOrchestrator.js';
import { Boq, BoqBuilder, createBoqItem, createBoqSection } from '../domain/boq.js';
import {
  RateCard,
  RateCardEntry,
  SUPPORTED_MATERIAL_CATEGORIES,
  createEmptyRateCard,
  getRateFromCard,
} from '../domain/project/RateCard.js';
import { resolveRateForUnit } from '../domain/rates/resolution.js';
import { Unit } from '../domain/units/types.js';
import {
  DimensionMismatchError,
  InconsistentGeometryError,
  InvalidMeasurementError,
} from '../domain/errors.js';

const router: Router = express.Router();
const orchestrator = EstimationOrchestrator.getInstance();

const RateEntrySchema = z.object({
  category: z.enum(SUPPORTED_MATERIAL_CATEGORIES),
  item: z.string().max(120).optional(),
  rate: z.number().finite().nullable(),
  unit: z.string().min(1).max(20),
  currency: z.string().min(1).max(10).default('USD'),
  source: z.string().max(200).optional(),
  notes: z.string().max(300).optional(),
});

const RunRequestSchema = z.object({
  values: z.unknown(),
  rateCard: z
    .object({
      currency: z.string().min(1).max(10).default('USD'),
      entries: z.array(RateEntrySchema).max(30).default([]),
    })
    .optional(),
});

type RateCardRequest = z.infer<typeof RunRequestSchema>['rateCard'];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected calculation error';
}

/** Express may type route params as `string | string[]`; normalise it. */
function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/** Domain input errors are client mistakes and must not surface as 500s. */
function isInputError(error: unknown): boolean {
  return (
    error instanceof InvalidMeasurementError ||
    error instanceof DimensionMismatchError ||
    error instanceof InconsistentGeometryError
  );
}

function toRateCard(raw: RateCardRequest): RateCard {
  const card = createEmptyRateCard('calculator-run', raw?.currency ?? 'USD');
  if (!raw) {
    return card;
  }
  card.currency = raw.currency;
  card.entries = raw.entries.map(
    (entry): RateCardEntry => ({
      category: entry.category,
      item: entry.item,
      rate: entry.rate,
      unit: entry.unit,
      currency: entry.currency,
      source: entry.source,
      notes: entry.notes,
      updatedAt: new Date().toISOString(),
    })
  );
  return card;
}

/**
 * Resolves the rate for one BOQ line.
 * A rate is only used when it is a positive amount AND its unit is understood and
 * dimension-compatible with the quantity — otherwise no amount is produced.
 * Compatible-but-different units are converted through the canonical unit system.
 * The rules live in `domain/rates/resolution.ts` (one implementation for every
 * pricing path: quick calculators and project estimates).
 */
function resolveLineRate(
  entry: RateCardEntry | undefined,
  requiredUnit: Unit
): { rate: number | null; warning?: string } {
  const resolution = resolveRateForUnit(entry, requiredUnit);
  return { rate: resolution.rate, warning: resolution.warning };
}

function buildBoq(input: {
  calculationId: string;
  calculationName: string;
  lines: BoqLineDraft[];
  rateCard: RateCard;
  currency: string;
  sourceCalculatorId: string;
  sourceMethodologyVersion: string;
}): Boq {
  const builder = new BoqBuilder();

  builder.addAssumption('Quantities are produced by verified server-side calculators.');
  builder.addAssumption('Costs are based on the rates you entered.');
  builder.addAssumption('These estimates are for planning purposes only.');

  const items = input.lines.map((line) => {
    const rateEntry = getRateFromCard(input.rateCard, line.category);
    const { rate, warning } = resolveLineRate(rateEntry, line.unit);

    if (warning) {
      builder.addWarning(warning);
    }

    return createBoqItem({
      id: `${line.category}-${input.sourceCalculatorId}-1`,
      category: line.category,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate,
      currency: input.currency,
      theoreticalQuantity: line.theoreticalQuantity,
      procurementQuantity: line.quantity,
      wastagePercentage: line.wastagePercentage,
      sourceCalculatorId: input.sourceCalculatorId,
      sourceMethodologyVersion: input.sourceMethodologyVersion,
      context: input.calculationName,
    });
  });

  builder.addSection(
    createBoqSection({
      id: input.calculationId,
      name: input.calculationName,
      items,
      currency: input.currency,
    })
  );

  return builder.build(input.calculationId, input.calculationName, input.currency);
}

/** Calculator hub listing (available calculators with their input fields + coming soon). */
router.get('/calculators', (_req: Request, res: Response) => {
  res.json({ categories: buildCalculatorHub() });
});

/** Runs one verified calculator and returns its result, traceability and BOQ. */
router.post('/calculators/:calculatorId/calculate', async (req: Request, res: Response) => {
  const calculatorId = paramString(req.params.calculatorId);
  const definition = findQuickCalculator(calculatorId);

  if (!definition) {
    return res.status(404).json({ error: `Unknown calculator: ${calculatorId}` });
  }

  const parsedBody = RunRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsedBody.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    });
  }

  let values: Record<string, unknown>;
  try {
    values = definition.parseValues(parsedBody.data.values);
  } catch (error) {
    const message = errorMessage(error);
    const details = error instanceof z.ZodError
      ? error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      : [message];
    return res.status(400).json({ error: 'Invalid calculator input', details });
  }

  const rateCard = toRateCard(parsedBody.data.rateCard);
  const calculator = orchestrator.getCalculator(definition.calculatorId);

  if (!calculator) {
    return res.status(500).json({ error: `Calculator ${definition.calculatorId} is not registered` });
  }

  try {
    const output = await orchestrator.composeSteps(
      `calculator.${definition.calculatorId}`,
      definition.buildSteps(values),
      { requestedCalculatorId: definition.calculatorId }
    );

    const interpretation = definition.interpret(output.result);

    const boq = buildBoq({
      calculationId: `calculator.${definition.calculatorId}`,
      calculationName: definition.name,
      lines: interpretation.boqLines,
      rateCard,
      currency: rateCard.currency,
      sourceCalculatorId: definition.calculatorId,
      sourceMethodologyVersion: calculator.identity.methodologyVersion,
    });

    return res.json({
      calculatorId: definition.calculatorId,
      name: definition.name,
      calculator,
      composition: {
        compositionId: output.result.compositionId,
        calculatorsUsed: output.result.calculatorsUsed,
      },
      status: output.status,
      isEstimate: output.isEstimate,
      resultLabel: interpretation.resultLabel,
      primary: interpretation.primary,
      rows: interpretation.rows,
      assumptions: output.assumptions,
      warnings: output.warnings,
      boq,
    });
  } catch (error) {
    const message = errorMessage(error);

    if (isInputError(error) || error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid calculator input', details: [message] });
    }

    console.error('[calculatorRoutes]', error);
    return res.status(500).json({ error: 'Calculation failed', details: [message] });
  }
});

export default router;

