import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { MeasurementSystem, LengthUnit, AreaUnit, VolumeUnit } from '../types/unit-types.js';
import {
  fromMeters,
  toMeters,
  fromSqMeters,
  fromCuMeters,
  roundTo,
} from '../utils/unitConversion.js';

interface UnitContextType {
  system: MeasurementSystem;
  setSystem: (system: MeasurementSystem) => void;
  lengthUnit: LengthUnit;
  setLengthUnit: (unit: LengthUnit) => void;
  smallLengthUnit: LengthUnit;
  areaUnit: AreaUnit;
  areaSymbol: string;
  volumeUnit: VolumeUnit;
  volumeSymbol: string;
  formatLength: (meters: number, decimals?: number) => string;
  formatArea: (sqMeters: number, decimals?: number) => string;
  formatVolume: (cuMeters: number, decimals?: number) => string;
  toCanonicalLength: (value: number, isSmallUnit?: boolean) => number;
  fromCanonicalLength: (meters: number, isSmallUnit?: boolean, decimals?: number) => number;
}

const STORAGE_KEY = 'construction-app:unit-system';
const LENGTH_STORAGE_KEY = 'construction-app:length-unit';

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [system, setSystemState] = useState<MeasurementSystem>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'metric' || saved === 'imperial') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'metric';
  });

  const [lengthUnit, setLengthUnitState] = useState<LengthUnit>(() => {
    try {
      const saved = localStorage.getItem(LENGTH_STORAGE_KEY) as LengthUnit;
      if (saved && ['m', 'cm', 'mm', 'ft', 'in'].includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'ft'; // default to ft as requested/expected
  });

  const setSystem = (newSystem: MeasurementSystem) => {
    setSystemState(newSystem);
    const newLen: LengthUnit = newSystem === 'metric' ? 'm' : 'ft';
    setLengthUnitState(newLen);
    try {
      localStorage.setItem(STORAGE_KEY, newSystem);
      localStorage.setItem(LENGTH_STORAGE_KEY, newLen);
    } catch {
      // Ignore
    }
  };

  const setLengthUnit = (newUnit: LengthUnit) => {
    setLengthUnitState(newUnit);
    const newSys: MeasurementSystem = ['m', 'cm', 'mm'].includes(newUnit) ? 'metric' : 'imperial';
    setSystemState(newSys);
    try {
      localStorage.setItem(LENGTH_STORAGE_KEY, newUnit);
      localStorage.setItem(STORAGE_KEY, newSys);
    } catch {
      // Ignore
    }
  };

  const isMetric = ['m', 'cm', 'mm'].includes(lengthUnit);
  const smallLengthUnit: LengthUnit = isMetric ? 'cm' : 'in';
  const areaUnit: AreaUnit = isMetric ? 'sq.m' : 'sq.ft';
  const areaSymbol = isMetric ? 'sq.m' : 'sq ft';
  const volumeUnit: VolumeUnit = isMetric ? 'cu.m' : 'cu.ft';
  const volumeSymbol = isMetric ? 'cu.m' : 'cu ft';

  const value = useMemo<UnitContextType>(() => {
    return {
      system,
      setSystem,
      lengthUnit,
      setLengthUnit,
      smallLengthUnit,
      areaUnit,
      areaSymbol,
      volumeUnit,
      volumeSymbol,
      formatLength: (meters: number, decimals = 2) => {
        const val = fromMeters(meters, lengthUnit, decimals);
        return `${val} ${lengthUnit}`;
      },
      formatArea: (sqMeters: number, decimals = 2) => {
        const val = fromSqMeters(sqMeters, areaUnit, decimals);
        return `${val} ${areaSymbol}`;
      },
      formatVolume: (cuMeters: number, decimals = 3) => {
        const val = fromCuMeters(cuMeters, volumeUnit, decimals);
        return `${val} ${volumeSymbol}`;
      },
      toCanonicalLength: (val: number, isSmall = false) => {
        const targetUnit = isSmall ? smallLengthUnit : lengthUnit;
        return toMeters(val, targetUnit);
      },
      fromCanonicalLength: (meters: number, isSmall = false, decimals = 3) => {
        const targetUnit = isSmall ? smallLengthUnit : lengthUnit;
        return fromMeters(meters, targetUnit, decimals);
      },
    };
  }, [system, lengthUnit, smallLengthUnit, areaUnit, areaSymbol, volumeUnit, volumeSymbol]);

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};

export function useUnit(): UnitContextType {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
