# Calculation Specifications

This folder contains formal specifications for all future construction calculators.

**CRITICAL**: No implementation (code) is allowed in this directory. These are living documents designed to ensure methodology consistency, verification, and traceability before a single line of calculation logic is written.

## Domains Covered
- Site & Area
- Dimensions & Geometry
- Excavation & Foundation
- Masonry
- Concrete / RCC
- Reinforcement Steel
- Plaster
- Flooring & Tiles
- Paint & Finishing
- Waterproofing
- Doors & Windows
- Staircase
- Plumbing
- Electrical
- Labour
- Wastage
- Cost
- BOQ

## Structure of a Specification
Each document must follow this template to ensure traceability:
1. **Overview**: Purpose and scope.
2. **Methodology**: The core logic (formulas and rules).
3. **References**: Authority/Source (verified or "PENDING VERIFICATION").
4. **Input/Output**: Definitions with units.
5. **Edge Cases**: Handling of zeros, negatives, and invalid inputs.
6. **Versioning**: `calculatorId` and `methodologyVersion`.
7. **Test Cases**: Scenarios for verification.
