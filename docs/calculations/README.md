# Calculations

This folder contains documentation for all construction-related calculations.

**Each calculator must be documented according to the rules in `.clinerules/00-project-rules.md`.**

# Measurement Domain Layer

This foundation provides the authoritative, shared infrastructure for all construction-related measurements and quantities.

## Principles
1. **Canonical Units**: All measurements are internally normalized to SI units (m, sq.m, cu.m, kg, piece).
2. **Deterministic Conversions**: Conversions are performed via a single, tested `conversion.ts` utility.
3. **Strongly Typed Dimensions**: Distinctions between length, area, volume, mass, and count are strictly enforced to prevent invalid operations.
4. **Precision**: All internal calculations use full floating-point precision. Rounding is deferred to presentation or specific business-logic requirements.
5. **No Construction Formulas**: This layer only provides measurement arithmetic. Material-specific logic will be added in subsequent phases.
