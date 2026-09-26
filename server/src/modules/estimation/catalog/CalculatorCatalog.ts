import { z } from 'zod';
import { Dimension, Unit } from '../domain/units/types.js';
import { Measurement } from '../domain/measurements/Measurement.js';
import { SupportedMaterialCategory } from '../domain/project/RateCard.js';
import { InvalidMeasurementError } from '../domain/errors.js';
import {
  ComposedCalculationResult,
  ComposedStepRequest,
} from '../engine/core/composition/CalculationComposerTypes.js';
import {
  findStepResult,
  readMeasurementValue,
  readNumberField,
} from '../engine/core/composition/CalculationComposer.js';

/**
 * Canonical calculator catalog.
 *
 * Single source of truth for the Calculator Hub: which calculators exist, whether
 * they are verified ("available") or not yet specified ("coming-soon"), which
 * inputs they accept, and how their verified output is presented.
 *
 * Every "available" entry executes only verified, registered calculators — this
 * catalog never introduces a construction formula of its own.
 */
export type CalculatorCategoryId = 'area' | 'masonry' | 'concrete' | 'finishing';

export interface CalculatorCategoryDefinition {
  id: CalculatorCategoryId;
  name: string;
  summary: string;
}

export const CALCULATOR_CATEGORIES: readonly CalculatorCategoryDefinition[] = [
  {
    id: 'area',
    name: 'Area & Surfaces',
    summary: 'Floor area and wall surface area with opening deductions.',
  },
  {
    id: 'masonry',
    name: 'Masonry',
    summary: 'Brick quantity from verified masonry volume and wastage.',
  },
  {
    id: 'concrete',
    name: 'Concrete',
    summary: 'Concrete and PCC volume with wastage allowance.',
  },
  {
    id: 'finishing',
    name: 'Finishing',
    summary: 'Plaster volume and tile coverage for floors.',
  },
];

export type CalculatorStatus = 'available' | 'coming-soon';

export type CalculatorFieldKind = 'measurement' | 'count' | 'percentage' | 'openings';

export interface CalculatorInputField {
  name: string;
  label: string;
  kind: CalculatorFieldKind;
  /** Canonical unit the server expects; `null` for counts, percentages and openings. */
  unit: Unit | null;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** True when the value is a length the client may display in ft / cm / mm. */
  isLength: boolean;
  help?: string;
}

export interface CalculatorResultRow {
  label: string;
  value: number;
  unit: string;
}

/** A BOQ line proposed by a calculation, before rates are resolved. */
export interface BoqLineDraft {
  category: SupportedMaterialCategory;
  description: string;
  quantity: number;
  unit: Unit;
  theoreticalQuantity: number;
  wastagePercentage: number;
}

export interface CalculatorInterpretation {
  /** Heading of the primary result, e.g. "Estimated Requirement". */
  resultLabel: string;
  primary: CalculatorResultRow;
  rows: CalculatorResultRow[];
  boqLines: BoqLineDraft[];
}

export interface QuickCalculatorDefinition {
  /** Stable ID used in the API path — the calculator that owns the methodology. */
  calculatorId: string;
  name: string;
  category: CalculatorCategoryId;
  summary: string;
  /** Verified calculators executed, in order. */
  composition: readonly string[];
  isEstimate: boolean;
  fields: readonly CalculatorInputField[];
  /** Validates raw request values and returns them in canonical SI units. */
  parseValues: (raw: unknown) => Record<string, unknown>;
  buildSteps: (values: Record<string, unknown>) => ComposedStepRequest[];
  interpret: (composed: ComposedCalculationResult) => CalculatorInterpretation;
}

/** Calculators that are not verified yet and are presented as "Coming Soon". */
export interface PlannedCalculatorDefinition {
  calculatorId: string;
  name: string;
  category: CalculatorCategoryId;
  summary: string;
}

/**
 * Planned calculators. They have no formula, no validation and no engine entry
 * until a verified engineering specification exists — they are listed so the hub
 * can honestly show what is coming next.
 */
export const PLANNED_CALCULATORS: readonly PlannedCalculatorDefinition[] = [
  {
    calculatorId: 'foundation.excavation',
    name: 'Foundation & Excavation',
    category: 'concrete',
    summary: 'Excavation, PCC bed and footing concrete quantities.',
  },
  {
    calculatorId: 'rcc.column',
    name: 'RCC Column',
    category: 'concrete',
    summary: 'Column concrete, formwork and reinforcement.',
  },
  {
    calculatorId: 'rcc.beam',
    name: 'RCC Beam',
    category: 'concrete',
    summary: 'Beam concrete, formwork and reinforcement.',
  },
  {
    calculatorId: 'rcc.slab',
    name: 'RCC Slab / Roof',
    category: 'concrete',
    summary: 'Slab concrete, steel and shuttering.',
  },
  {
    calculatorId: 'staircase.quantity',
    name: 'Staircase',
    category: 'concrete',
    summary: 'Step geometry, concrete and reinforcement.',
  },
  {
    calculatorId: 'masonry.block-quantity',
    name: 'Block Wall (AAC / Concrete)',
    category: 'masonry',
    summary: 'Block masonry quantity and mortar.',
  },
  {
    calculatorId: 'paint.quantity',
    name: 'Paint & Primer',
    category: 'finishing',
    summary: 'Primer and paint coverage from surface area.',
  },
  {
    calculatorId: 'putty.quantity',
    name: 'Wall Putty',
    category: 'finishing',
    summary: 'Putty quantity for the required number of coats.',
  },
  {
    calculatorId: 'waterproofing.area',
    name: 'Waterproofing',
    category: 'finishing',
    summary: 'Roof and wet-area waterproofing coverage.',
  },
];

/** A hub card entry, either an available calculator or a coming-soon one. */
export interface CalculatorHubEntry {
  calculatorId: string;
  name: string;
  category: CalculatorCategoryId;
  summary: string;
  status: CalculatorStatus;
  fields: CalculatorInputField[];
}

export interface CalculatorHubCategory {
  id: CalculatorCategoryId;
  name: string;
  summary: string;
  calculators: CalculatorHubEntry[];
}

function measurement(value: number, unit: Unit, dimension: Dimension): Measurement {
  return new Measurement(value, unit, dimension);
}

/** Reads a value that `parseValues` has already validated. */
function requiredNumber(values: Record<string, unknown>, name: string): number {
  const raw = values[name];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new InvalidMeasurementError(`Validated value "${name}" is missing`);
  }
  return raw;
}

const OpeningValueSchema = z.object({
  type: z.enum(['door', 'window', 'ventilator', 'other']).default('door'),
  width: z.number().min(0.1).max(20),
  height: z.number().min(0.1).max(20),
  quantity: z.number().int().min(1).max(50).default(1),
});

const OpeningsSchema = z.array(OpeningValueSchema).max(50).default([]);

type OpeningValue = z.infer<typeof OpeningValueSchema>;

/** Reads the openings array of values that `parseValues` has already validated. */
function requiredOpenings(values: Record<string, unknown>, name: string): OpeningValue[] {
  const parsed = OpeningsSchema.safeParse(values[name]);
  if (!parsed.success) {
    throw new InvalidMeasurementError(`Validated openings field "${name}" is missing`);
  }
  return parsed.data;
}

function toOpenings(values: OpeningValue[]) {
  return values.map((opening, index) => ({
    id: `opening-${index + 1}`,
    type: opening.type,
    width: measurement(opening.width, Unit.M, Dimension.LENGTH),
    height: measurement(opening.height, Unit.M, Dimension.LENGTH),
    quantity: opening.quantity,
  }));
}

/** Reads a numeric field of one executed step, failing loudly when it is absent. */
function stepNumber(
  composed: ComposedCalculationResult,
  calculatorId: string,
  field: string
): number {
  const step = findStepResult(composed, calculatorId);
  const value = step === undefined ? undefined : readNumberField(step.output, field);
  if (value === undefined) {
    throw new Error(`Composition ${composed.compositionId} did not expose ${calculatorId}.${field}`);
  }
  return value;
}

/** Reads a measurement field of one executed step, failing loudly when absent. */
function stepMeasurement(
  composed: ComposedCalculationResult,
  calculatorId: string,
  field: string
): number {
  const step = findStepResult(composed, calculatorId);
  const value = step === undefined ? undefined : readMeasurementValue(step.output, field);
  if (value === undefined) {
    throw new Error(`Composition ${composed.compositionId} did not expose ${calculatorId}.${field}`);
  }
  return value;
}

const lengthField = (
  name: string,
  label: string,
  defaultValue: number,
  help?: string,
  min = 0.05,
  max = 500
): CalculatorInputField => ({
  name,
  label,
  kind: 'measurement',
  unit: Unit.M,
  min,
  max,
  step: 0.01,
  defaultValue,
  isLength: true,
  help,
});

const wastageField = (defaultValue: number): CalculatorInputField => ({
  name: 'wastagePercentage',
  label: 'Wastage allowance',
  kind: 'percentage',
  unit: null,
  min: 0,
  max: 50,
  step: 0.5,
  defaultValue,
  isLength: false,
  help: 'Breakage and cutting allowance added to the procurement quantity',
});

const openingsField: CalculatorInputField = {
  name: 'openings',
  label: 'Openings (doors / windows)',
  kind: 'openings',
  unit: null,
  min: 0,
  max: 50,
  step: 1,
  defaultValue: 0,
  isLength: false,
  help: 'Areas deducted from the wall surface before quantity calculation',
};

const floorAreaValuesSchema = z.object({
  length: z.number().min(0.1).max(500),
  width: z.number().min(0.1).max(500),
});

const floorAreaCalculator: QuickCalculatorDefinition = {
  calculatorId: 'room.floor-area',
  name: 'Room Floor Area',
  category: 'area',
  summary: 'Floor area of a rectangular room from its length and width.',
  composition: ['room.floor-area'],
  isEstimate: false,
  fields: [
    lengthField('length', 'Room length', 3.05, 'Internal length of the room', 0.1),
    lengthField('width', 'Room width', 3.05, 'Internal width of the room', 0.1),
  ],
  parseValues: (raw) => floorAreaValuesSchema.parse(raw),
  buildSteps: (values) => [
    {
      calculatorId: 'room.floor-area',
      input: {
        source: 'value',
        value: {
          length: measurement(requiredNumber(values, 'length'), Unit.M, Dimension.LENGTH),
          width: measurement(requiredNumber(values, 'width'), Unit.M, Dimension.LENGTH),
        },
      },
    },
  ],
  interpret: (composed) => {
    const area = stepMeasurement(composed, 'room.floor-area', 'area');
    return {
      resultLabel: 'Floor Area',
      primary: { label: 'Floor Area', value: area, unit: 'sq.m' },
      rows: [],
      boqLines: [],
    };
  },
};

const wallNetAreaValuesSchema = z.object({
  wallLength: z.number().min(0.1).max(500),
  wallHeight: z.number().min(0.5).max(30),
  openings: OpeningsSchema,
});

const wallNetAreaCalculator: QuickCalculatorDefinition = {
  calculatorId: 'wall.net-area',
  name: 'Wall Area',
  category: 'area',
  summary: 'Gross wall area, opening deductions and net wall area for one wall.',
  composition: ['wall.net-area'],
  isEstimate: false,
  fields: [
    lengthField('wallLength', 'Wall length', 3.05, 'Length of the wall run', 0.1),
    lengthField('wallHeight', 'Wall height', 3, 'Floor to ceiling height', 0.5, 30),
    openingsField,
  ],
  parseValues: (raw) => wallNetAreaValuesSchema.parse(raw),
  buildSteps: (values) => [
    {
      calculatorId: 'wall.net-area',
      input: {
        source: 'value',
        value: {
          wallLength: measurement(requiredNumber(values, 'wallLength'), Unit.M, Dimension.LENGTH),
          wallHeight: measurement(requiredNumber(values, 'wallHeight'), Unit.M, Dimension.LENGTH),
          openings: toOpenings(requiredOpenings(values, 'openings')),
        },
      },
    },
  ],
  interpret: (composed) => {
    const grossArea = stepMeasurement(composed, 'wall.net-area', 'grossArea');
    const openingDeductionArea = stepMeasurement(composed, 'wall.net-area', 'openingDeductionArea');
    const netArea = stepMeasurement(composed, 'wall.net-area', 'netArea');
    return {
      resultLabel: 'Net Wall Area',
      primary: { label: 'Net Wall Area', value: netArea, unit: 'sq.m' },
      rows: [
        { label: 'Gross wall area', value: grossArea, unit: 'sq.m' },
        { label: 'Opening deduction', value: openingDeductionArea, unit: 'sq.m' },
      ],
      boqLines: [],
    };
  },
};

const brickValuesSchema = z.object({
  wallLength: z.number().min(0.1).max(500),
  wallHeight: z.number().min(0.5).max(30),
  wallThickness: z.number().min(0.05).max(2).default(0.23),
  openings: OpeningsSchema,
  brickLength: z.number().min(0.05).max(1).default(0.19),
  brickWidth: z.number().min(0.05).max(1).default(0.09),
  brickHeight: z.number().min(0.05).max(1).default(0.09),
  mortarJointThickness: z.number().min(0).max(0.1).default(0.01),
  wastagePercentage: z.number().min(0).max(50).default(5),
});

const brickCalculator: QuickCalculatorDefinition = {
  calculatorId: 'masonry.brick-quantity',
  name: 'Brick Masonry',
  category: 'masonry',
  summary: 'Brick quantity for a wall from face-module coursing (bed + head joints), with wastage.',
  composition: ['wall.net-area', 'masonry.brick-quantity'],
  isEstimate: true,
  fields: [
    lengthField('wallLength', 'Wall length', 3.05, 'Length of the wall run', 0.1),
    lengthField('wallHeight', 'Wall height', 3, 'Floor to ceiling height', 0.5, 30),
    lengthField('wallThickness', 'Wall thickness', 0.23, 'Finished thickness of the brick wall', 0.05, 2),
    openingsField,
    lengthField('brickLength', 'Brick length', 0.19, 'Standard modular brick', 0.05, 1),
    lengthField('brickWidth', 'Brick width', 0.09, 'Standard modular brick', 0.05, 1),
    lengthField('brickHeight', 'Brick height', 0.09, 'Standard modular brick', 0.05, 1),
    lengthField('mortarJointThickness', 'Mortar joint', 0.01, 'Bed + head joint mapped onto brick length and height (face module); wall thickness carries no joint', 0, 0.1),
    wastageField(5),
  ],
  parseValues: (raw) => brickValuesSchema.parse(raw),
  buildSteps: (values) => {
    const wallThickness = requiredNumber(values, 'wallThickness');
    const brickLength = requiredNumber(values, 'brickLength');
    const brickWidth = requiredNumber(values, 'brickWidth');
    const brickHeight = requiredNumber(values, 'brickHeight');
    const mortarJointThickness = requiredNumber(values, 'mortarJointThickness');
    const wastagePercentage = requiredNumber(values, 'wastagePercentage');

    return [
      {
        calculatorId: 'wall.net-area',
        input: {
          source: 'value',
          value: {
            wallLength: measurement(requiredNumber(values, 'wallLength'), Unit.M, Dimension.LENGTH),
            wallHeight: measurement(requiredNumber(values, 'wallHeight'), Unit.M, Dimension.LENGTH),
            openings: toOpenings(requiredOpenings(values, 'openings')),
          },
        },
      },
      {
        calculatorId: 'masonry.brick-quantity',
        input: {
          source: 'derived',
          // Documented assumption: masonry volume = net wall area × wall thickness.
          derive: (previous) => {
            const netAreaSqM = stepMeasurement(previous, 'wall.net-area', 'netArea');
            return {
              netMasonryVolume: measurement(netAreaSqM * wallThickness, Unit.CU_M, Dimension.VOLUME),
              brickLength: measurement(brickLength, Unit.M, Dimension.LENGTH),
              brickWidth: measurement(brickWidth, Unit.M, Dimension.LENGTH),
              brickHeight: measurement(brickHeight, Unit.M, Dimension.LENGTH),
              mortarJointThickness: measurement(mortarJointThickness, Unit.M, Dimension.LENGTH),
              wastagePercentage,
              wallThickness: measurement(wallThickness, Unit.M, Dimension.LENGTH),
            };
          },
        },
      },
    ];
  },
  interpret: (composed) => {
    const netAreaSqM = stepMeasurement(composed, 'wall.net-area', 'netArea');
    const netMasonryVolumeCuM = stepMeasurement(composed, 'masonry.brick-quantity', 'netMasonryVolume');
    const effectiveBrickModuleCuM = stepMeasurement(composed, 'masonry.brick-quantity', 'effectiveBrickModule');
    const theoreticalBrickQuantity = stepNumber(composed, 'masonry.brick-quantity', 'theoreticalBrickQuantity');
    const procurementAllowance = stepNumber(composed, 'masonry.brick-quantity', 'procurementAllowance');
    const procurementQuantity = stepNumber(composed, 'masonry.brick-quantity', 'procurementQuantity');
    const wastagePercentage = stepNumber(composed, 'masonry.brick-quantity', 'wastagePercentage');
    const step = findStepResult(composed, 'masonry.brick-quantity');
    const output = (step?.output ?? {}) as {
      brickDimensions?: { length?: { value?: number }; width?: { value?: number }; height?: { value?: number } };
      mortarJoint?: { value?: number };
    };
    const brickLengthM = typeof output.brickDimensions?.length?.value === 'number' ? output.brickDimensions.length.value : NaN;
    const brickWidthM = typeof output.brickDimensions?.width?.value === 'number' ? output.brickDimensions.width.value : NaN;
    const brickHeightM = typeof output.brickDimensions?.height?.value === 'number' ? output.brickDimensions.height.value : NaN;
    const mortarJointM = typeof output.mortarJoint?.value === 'number' ? output.mortarJoint.value : NaN;

    return {
      resultLabel: 'Estimated Requirement',
      primary: { label: 'Bricks required', value: procurementQuantity, unit: 'bricks' },
      rows: [
        { label: 'Net wall area', value: netAreaSqM, unit: 'sq.m' },
        { label: 'Net masonry volume', value: netMasonryVolumeCuM, unit: 'cu.m' },
        ...(Number.isFinite(brickLengthM) ? [{ label: 'Brick length', value: brickLengthM, unit: 'm' }] : []),
        ...(Number.isFinite(brickWidthM) ? [{ label: 'Brick width', value: brickWidthM, unit: 'm' }] : []),
        ...(Number.isFinite(brickHeightM) ? [{ label: 'Brick height', value: brickHeightM, unit: 'm' }] : []),
        ...(Number.isFinite(mortarJointM) ? [{ label: 'Mortar joint', value: mortarJointM, unit: 'm' }] : []),
        { label: 'Effective brick module', value: effectiveBrickModuleCuM, unit: 'cu.m' },
        { label: 'Theoretical bricks', value: theoreticalBrickQuantity, unit: 'bricks' },
        { label: `Wastage allowance @ ${wastagePercentage}%`, value: procurementAllowance, unit: 'bricks' },
        { label: `Wastage percentage`, value: wastagePercentage, unit: '%' },
        { label: 'Bricks to purchase', value: procurementQuantity, unit: 'bricks' },
      ],
      boqLines: [
        {
          category: 'brick',
          description: 'Standard clay brick',
          quantity: procurementQuantity,
          unit: Unit.PIECE,
          theoreticalQuantity: theoreticalBrickQuantity,
          wastagePercentage,
        },
      ],
    };
  },
};

const concreteValuesSchema = z.object({
  length: z.number().min(0.05).max(500),
  width: z.number().min(0.05).max(500),
  depth: z.number().min(0.02).max(20),
  wastagePercentage: z.number().min(0).max(50).default(5),
});

const concreteCalculator: QuickCalculatorDefinition = {
  calculatorId: 'concrete.volume',
  name: 'Concrete Volume',
  category: 'concrete',
  summary: 'Concrete volume for a slab, PCC bed or rectangular element.',
  composition: ['concrete.volume'],
  isEstimate: true,
  fields: [
    lengthField('length', 'Length', 3, 'Length of the concrete element', 0.05),
    lengthField('width', 'Width', 3, 'Width of the concrete element', 0.05),
    lengthField('depth', 'Depth / thickness', 0.15, 'Thickness of the concrete layer', 0.02, 20),
    wastageField(5),
  ],
  parseValues: (raw) => concreteValuesSchema.parse(raw),
  buildSteps: (values) => [
    {
      calculatorId: 'concrete.volume',
      input: {
        source: 'value',
        value: {
          length: measurement(requiredNumber(values, 'length'), Unit.M, Dimension.LENGTH),
          width: measurement(requiredNumber(values, 'width'), Unit.M, Dimension.LENGTH),
          depth: measurement(requiredNumber(values, 'depth'), Unit.M, Dimension.LENGTH),
          wastagePercentage: requiredNumber(values, 'wastagePercentage'),
        },
      },
    },
  ],
  interpret: (composed) => {
    const netVolume = stepMeasurement(composed, 'concrete.volume', 'netVolume');
    const procurementAllowance = stepMeasurement(composed, 'concrete.volume', 'procurementAllowance');
    const procurementVolume = stepMeasurement(composed, 'concrete.volume', 'procurementVolume');
    const wastagePercentage = stepNumber(composed, 'concrete.volume', 'wastagePercentage');

    return {
      resultLabel: 'Estimated Requirement',
      primary: { label: 'Concrete required', value: procurementVolume, unit: 'cu.m' },
      rows: [
        { label: 'Net volume', value: netVolume, unit: 'cu.m' },
        { label: `Wastage allowance @ ${wastagePercentage}%`, value: procurementAllowance, unit: 'cu.m' },
      ],
      boqLines: [
        {
          category: 'concrete',
          description: 'Concrete (site mixed / ready mix)',
          quantity: procurementVolume,
          unit: Unit.CU_M,
          theoreticalQuantity: netVolume,
          wastagePercentage,
        },
      ],
    };
  },
};

const plasterValuesSchema = z.object({
  netSurfaceArea: z.number().min(0.5).max(5000),
  plasterThickness: z.number().min(0.005).max(0.1).default(0.012),
  wastagePercentage: z.number().min(0).max(50).default(5),
  cementRatio: z.number().min(0.5).max(10).default(1),
  sandRatio: z.number().min(1).max(12).default(4),
  dryVolumeFactor: z.number().min(1).max(2).default(1.33),
  cementBagWeightKg: z.number().min(20).max(100).default(50),
});

const plasterCalculator: QuickCalculatorDefinition = {
  calculatorId: 'plaster.quantity',
  name: 'Plaster',
  category: 'finishing',
  summary: 'Cement plaster volume for a surface area and thickness.',
  composition: ['plaster.quantity'],
  isEstimate: true,
  fields: [
    {
      name: 'netSurfaceArea',
      label: 'Surface area to plaster',
      kind: 'measurement',
      unit: Unit.SQ_M,
      min: 0.5,
      max: 5000,
      step: 0.1,
      defaultValue: 30,
      isLength: false,
      help: 'Total area of walls and/or ceiling receiving plaster',
    },
    lengthField('plasterThickness', 'Plaster thickness', 0.012, 'Typical plaster thickness', 0.005, 0.1),
    wastageField(5),
  ],
  parseValues: (raw) => plasterValuesSchema.parse(raw),
  buildSteps: (values) => [
    {
      calculatorId: 'plaster.quantity',
      input: {
        source: 'value',
        value: {
          netSurfaceArea: measurement(requiredNumber(values, 'netSurfaceArea'), Unit.SQ_M, Dimension.AREA),
          plasterThickness: measurement(requiredNumber(values, 'plasterThickness'), Unit.M, Dimension.LENGTH),
          wastagePercentage: requiredNumber(values, 'wastagePercentage'),
          cementRatio: (values as Record<string, unknown>).cementRatio === undefined ? 1 : requiredNumber(values, 'cementRatio'),
          sandRatio: (values as Record<string, unknown>).sandRatio === undefined ? 4 : requiredNumber(values, 'sandRatio'),
          dryVolumeFactor: (values as Record<string, unknown>).dryVolumeFactor === undefined ? 1.33 : requiredNumber(values, 'dryVolumeFactor'),
          cementBagWeightKg: (values as Record<string, unknown>).cementBagWeightKg === undefined ? 50 : requiredNumber(values, 'cementBagWeightKg'),
        },
      },
    },
  ],
  interpret: (composed) => {
    const step = findStepResult(composed, 'plaster.quantity');
    const output = (step?.output ?? {}) as {
      netSurfaceArea?: { value?: number };
      plasterThickness?: { value?: number };
      dryMaterialVolume?: { value?: number };
      sandVolume?: { value?: number };
      cementQuantityKg?: number;
      cementBags?: number;
      mixRatio?: string;
      dryVolumeFactor?: number;
      cementBagWeightKg?: number;
    };
    const netSurfaceArea = stepMeasurement(composed, 'plaster.quantity', 'netSurfaceArea');
    const plasterThickness = stepMeasurement(composed, 'plaster.quantity', 'plasterThickness');
    const theoreticalVolume = stepMeasurement(composed, 'plaster.quantity', 'theoreticalVolume');
    const procurementAllowance = stepMeasurement(composed, 'plaster.quantity', 'procurementAllowance');
    const procurementVolume = stepMeasurement(composed, 'plaster.quantity', 'procurementVolume');
    const wastagePercentage = stepNumber(composed, 'plaster.quantity', 'wastagePercentage');
    const dryMaterialVolume = typeof output.dryMaterialVolume?.value === 'number' ? output.dryMaterialVolume.value : procurementVolume * 1.33;
    const sandVolume = typeof output.sandVolume?.value === 'number' ? output.sandVolume.value : dryMaterialVolume * (4 / 5);
    const cementQuantityKg = typeof output.cementQuantityKg === 'number' ? output.cementQuantityKg : 0;
    const cementBags = typeof output.cementBags === 'number' ? output.cementBags : 0;
    const mixRatio = typeof output.mixRatio === 'string' ? output.mixRatio : '1:4';
    const dryVolumeFactor = typeof output.dryVolumeFactor === 'number' ? output.dryVolumeFactor : 1.33;
    const cementBagWeightKg = typeof output.cementBagWeightKg === 'number' ? output.cementBagWeightKg : 50;

    return {
      resultLabel: 'Estimated Requirement',
      primary: { label: 'Plaster volume (wet)', value: procurementVolume, unit: 'cu.m' },
      rows: [
        { label: 'Plaster area', value: netSurfaceArea, unit: 'sq.m' },
        { label: 'Plaster thickness', value: plasterThickness, unit: 'm' },
        { label: 'Wet plaster volume', value: theoreticalVolume, unit: 'cu.m' },
        { label: `Wastage allowance @ ${wastagePercentage}%`, value: procurementAllowance, unit: 'cu.m' },
        { label: 'Procurement volume (wet)', value: procurementVolume, unit: 'cu.m' },
        { label: `Dry material volume (factor ${dryVolumeFactor})`, value: dryMaterialVolume, unit: 'cu.m' },
        { label: `Cement required (mix ${mixRatio}, ${cementBagWeightKg} kg bag)`, value: cementBags, unit: 'bags' },
        { label: 'Cement required', value: cementQuantityKg, unit: 'kg' },
        { label: 'Sand / balu required', value: sandVolume, unit: 'cu.m' },
      ],
      boqLines: [
        {
          category: 'plaster',
          description: 'Cement plaster (wet volume)',
          quantity: procurementVolume,
          unit: Unit.CU_M,
          theoreticalQuantity: theoreticalVolume,
          wastagePercentage,
        },
        {
          category: 'cement',
          description: `Cement for plaster (mix ${mixRatio}, ${cementBagWeightKg} kg bag)`,
          quantity: cementBags,
          unit: Unit.PIECE,
          theoreticalQuantity: cementBags,
          wastagePercentage,
        },
        {
          category: 'sand',
          description: `Sand / balu for plaster (mix ${mixRatio})`,
          quantity: sandVolume,
          unit: Unit.CU_M,
          theoreticalQuantity: sandVolume,
          wastagePercentage,
        },
      ],
    };
  },
};

const tileValuesSchema = z.object({
  roomLength: z.number().min(0.1).max(500),
  roomWidth: z.number().min(0.1).max(500),
  tileLength: z.number().min(0.05).max(3).default(0.6),
  tileWidth: z.number().min(0.05).max(3).default(0.6),
  wastagePercentage: z.number().min(0).max(50).default(7),
});

const tileCalculator: QuickCalculatorDefinition = {
  calculatorId: 'tile.quantity',
  name: 'Floor Tiles',
  category: 'finishing',
  summary: 'Tile count for a rectangular floor area and tile size.',
  composition: ['room.floor-area', 'tile.quantity'],
  isEstimate: true,
  fields: [
    lengthField('roomLength', 'Room length', 3.05, 'Length of the tiled floor', 0.1),
    lengthField('roomWidth', 'Room width', 3.05, 'Width of the tiled floor', 0.1),
    lengthField('tileLength', 'Tile length', 0.6, 'Length of one tile', 0.05, 3),
    lengthField('tileWidth', 'Tile width', 0.6, 'Width of one tile', 0.05, 3),
    wastageField(7),
  ],
  parseValues: (raw) => tileValuesSchema.parse(raw),
  buildSteps: (values) => {
    const tileLength = requiredNumber(values, 'tileLength');
    const tileWidth = requiredNumber(values, 'tileWidth');
    const wastagePercentage = requiredNumber(values, 'wastagePercentage');

    return [
      {
        calculatorId: 'room.floor-area',
        input: {
          source: 'value',
          value: {
            length: measurement(requiredNumber(values, 'roomLength'), Unit.M, Dimension.LENGTH),
            width: measurement(requiredNumber(values, 'roomWidth'), Unit.M, Dimension.LENGTH),
          },
        },
      },
      {
        calculatorId: 'tile.quantity',
        input: {
          source: 'derived',
          derive: (previous) => {
            const floorAreaSqM = stepMeasurement(previous, 'room.floor-area', 'area');
            return {
              floorArea: measurement(floorAreaSqM, Unit.SQ_M, Dimension.AREA),
              tileLength: measurement(tileLength, Unit.M, Dimension.LENGTH),
              tileWidth: measurement(tileWidth, Unit.M, Dimension.LENGTH),
              wastagePercentage,
            };
          },
        },
      },
    ];
  },
  interpret: (composed) => {
    const floorAreaSqM = stepMeasurement(composed, 'room.floor-area', 'area');
    const singleTileAreaSqM = stepMeasurement(composed, 'tile.quantity', 'singleTileArea');
    const theoreticalTileCount = stepNumber(composed, 'tile.quantity', 'theoreticalTileCount');
    const procurementAllowance = stepNumber(composed, 'tile.quantity', 'procurementAllowance');
    const procurementTileCount = stepNumber(composed, 'tile.quantity', 'procurementTileCount');
    const wastagePercentage = stepNumber(composed, 'tile.quantity', 'wastagePercentage');

    return {
      resultLabel: 'Estimated Requirement',
      primary: { label: 'Tiles required', value: procurementTileCount, unit: 'tiles' },
      rows: [
        { label: 'Floor area', value: floorAreaSqM, unit: 'sq.m' },
        { label: 'Single tile area', value: singleTileAreaSqM, unit: 'sq.m' },
        { label: 'Theoretical tiles', value: theoreticalTileCount, unit: 'tiles' },
        { label: `Wastage allowance @ ${wastagePercentage}%`, value: procurementAllowance, unit: 'tiles' },
      ],
      boqLines: [
        {
          category: 'tile',
          description: 'Floor tiles',
          quantity: procurementTileCount,
          unit: Unit.PIECE,
          theoreticalQuantity: theoreticalTileCount,
          wastagePercentage,
        },
      ],
    };
  },
};

/** Every calculator the hub can execute today, in display order. */
export const QUICK_CALCULATORS: readonly QuickCalculatorDefinition[] = [
  floorAreaCalculator,
  wallNetAreaCalculator,
  brickCalculator,
  concreteCalculator,
  plasterCalculator,
  tileCalculator,
];

export function findQuickCalculator(calculatorId: string): QuickCalculatorDefinition | undefined {
  return QUICK_CALCULATORS.find((calculator) => calculator.calculatorId === calculatorId);
}

/** Builds the hub listing: available calculators with their input fields, plus coming-soon entries. */
export function buildCalculatorHub(): CalculatorHubCategory[] {
  return CALCULATOR_CATEGORIES.map((category) => {
    const available: CalculatorHubEntry[] = QUICK_CALCULATORS.filter(
      (calculator) => calculator.category === category.id
    ).map((calculator) => ({
      calculatorId: calculator.calculatorId,
      name: calculator.name,
      category: calculator.category,
      summary: calculator.summary,
      status: 'available',
      fields: [...calculator.fields],
    }));

    const planned: CalculatorHubEntry[] = PLANNED_CALCULATORS.filter(
      (calculator) => calculator.category === category.id
    ).map((calculator) => ({
      calculatorId: calculator.calculatorId,
      name: calculator.name,
      category: calculator.category,
      summary: calculator.summary,
      status: 'coming-soon',
      fields: [],
    }));

    return {
      id: category.id,
      name: category.name,
      summary: category.summary,
      calculators: [...available, ...planned],
    };
  });
}



