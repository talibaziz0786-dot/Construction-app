# Calculation Engine Specification

## Overview
The universal calculation engine provides a standardized infrastructure for executing construction-related estimations, ensuring traceability, type safety, and methodology versioning.

## Key Concepts
- **Calculator Contract**: A standard interface (`Calculator<TInput, TOutput>`) that all estimation logic must implement.
- **Envelope Pattern**: Inputs and outputs are strictly enveloped in `CalculationInput` and `CalculationOutput` types to ensure consistency.
- **Traceability**: Every output includes a `trace` object (calculator ID, methodology version, timestamp, input values).
- **Registry**: A centralized `CalculatorRegistry` allows for discovery and management of available calculators.
- **Status Model**: Results include a `status` (success, success-with-warnings, blocked) to manage incomplete/invalid calculations.
- **Assumptions**: Structured, traceable assumptions that distinguish verified/unverified data.

## Implementation Rules
1. **Strong Typing**: No `any`. Use generics for input/output.
2. **Immutability**: Calculation outputs should be treated as immutable once generated.
3. **Traceability**: Every calculator MUST report the exact version and inputs used.
4. **Error Handling**: Use the domain-level errors from `Phase 1.0` and standard `ResultStatus` transitions.
5. **Precision**: Calculation engine preserves floating-point precision; rounding occurs at the output boundary or as requested by the specific domain.
