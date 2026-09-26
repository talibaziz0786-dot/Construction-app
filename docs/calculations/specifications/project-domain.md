# Project Domain Specification

## Overview
Defines the physical structure of a construction project.

## Entity Model
1. **Project**: Root container for the entire estimation project.
2. **Building**: A structure within the project.
3. **Floor**: A level within the building.
4. **Space (Room)**: A functional area (e.g., Bedroom, Kitchen).
5. **Wall & Opening**: Geometrical elements within a Space.

## Principles
- **Canonical Measurements**: All geometric properties (length, height, thickness) MUST use the shared `Measurement` class (Phase 1.0).
- **Source vs Derived**: The domain only stores source dimensions. Derived values (e.g., net wall area) will be computed by the estimation engine in future phases.
- **Ownership**: Strict ownership hierarchy: Project → Building → Floor → Space → Wall → Opening.

## Validation
- All dimensions must use valid `Measurement` objects (non-negative).
- Spaces must belong to one floor, walls to one space, openings to one wall.
- Identifiers are stable and unique within the context.
