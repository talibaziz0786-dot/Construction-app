# Masonry Specification

## Status
VERIFIED & IMPLEMENTED (Methodology Version 1.0.0)

## References
- IS 1077:1992 — Common Burnt Clay Building Bricks
- IS 1200 (Part 3):1991 — Method of measurement of building and civil engineering works: Part 3 Brickwork
- IS 2212:1991 — Code of practice for brickwork
- CPWD DSR (Delhi Schedule of Rates) / DAR (Delhi Analysis of Rates) — Supporting government estimation benchmark (Reference only, never hard-coded as constant or formula default)

## Verified Facts
- **IS 1077 Modular Brick Standard**: Nominal dimensions 190mm x 90mm x 90mm (length x width x height).
- **Brickwork Measurement Basis (IS 1200 Part III)**: Generally volume-based for masonry walls exceeding half-brick in thickness, and area-based for half-brick walls.
- **Opening and Deduction Rules (IS 1200 Part III)**: Specific rules govern deductions for openings based on their size and type.
- **CPWD Benchmarks**: CPWD DSR/DAR provides schedule-based benchmark quantities (e.g., 487 bricks per m³ for specific masonry types), which are treated strictly as `REFERENCE BENCHMARK` and not as universal physical constants or calculation inputs.

## Final Calculation Model
VERIFIED METHODOLOGY v1.0.0

This model clearly distinguishes between theoretical material quantity and quantities for procurement, including configurable allowances.

### Calculation Formula
1. **Determine Net Masonry Geometry**: Utilize net masonry volume or obtain net area via `wall.net-area` and multiply by wall thickness.
2. **Determine Effective Brick Module Volume**:
   ```text
   Effective Brick Module Volume = (Brick Length + Mortar Joint Thickness) × (Brick Width + Mortar Joint Thickness) × (Brick Height + Mortar Joint Thickness)
   ```
3. **Calculate Theoretical Brick Quantity**:
   ```text
   Theoretical Brick Quantity = Net Masonry Volume / Effective Brick Module Volume
   ```
4. **Apply Optional Wastage / Procurement Allowance**:
   ```text
   Procurement Quantity Before Rounding = Theoretical Brick Quantity × (1 + Wastage Percentage / 100)
   ```
   If wastage is omitted, `wastagePercentage = 0` (used solely for mathematical calculation; never implies 0% real-world wastage).
5. **Round Only at Procurement Boundary**:
   ```text
   Procurement Quantity = round UP to whole brick (Math.ceil)
   ```

### Inputs & Configuration
- **Net Masonry Volume**: Volume of masonry (`Dimension.VOLUME`) with strict positive validation.
- **Brick Dimensions**: Length, width, height (`Dimension.LENGTH`) with strict positive validation.
- **Mortar Joint Thickness**: Explicit uniform mortar joint thickness (`Dimension.LENGTH`) with non-negative validation. No hard-coded `10mm` default.
- **Wastage Percentage**: Optional percentage (>= 0), defaulting to `0` when omitted for theoretical computation. No hard-coded `5%` default.

### Validation & Rules
- **Positive Dimensions Only**: Rejects zero or negative dimensions, negative mortar joint, and invalid wastage.
- **No Hidden Defaults**: All brick dimensions, mortar joints, and wastage percentages must be explicitly supplied.
- **Precision Preservation**: Intermediate values retain full floating-point precision; rounding occurs only at the final procurement boundary (rounding UP).
- **Traceability**: Output includes calculatorId (`masonry.brick-quantity`), methodologyVersion (`1.0.0`), inputs, assumptions, timestamp, and calculation trace.


