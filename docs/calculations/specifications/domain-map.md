# Calculation Domains & Methodology

This document outlines the high-level domains and the dependency graph for the calculation engine.

## Architecture Strategy
- **Calculations are Domain-Driven**: Independent of HTTP/Auth/UI.
- **Product Architecture**: User access and monetization (Ads/Premium) are defined as distinct boundaries to prevent pollution of the domain/calculation engine.

## Dependency Graph
```text
Room Dimensions (Length, Width)
      ↓
room.floor-area
      ↓
Floor Area (sq.m)
```

## Versioning Strategy
Every calculator will include:
- `calculatorId`: Unique identifier (e.g., `room.floor-area`).
- `methodologyVersion`: Semantic versioning for the formula methodology.

## Verification Status
- `room.floor-area` (v1.0.0): VERIFIED & IMPLEMENTED (Pure Geometric Calculation).
- `wall.net-area` (v1.0.0): VERIFIED & IMPLEMENTED (Pure Geometric Calculation).
- `masonry.brick-quantity` (v1.0.0): VERIFIED & IMPLEMENTED (Masonry Brick Quantity Calculation).
- All other construction material methodologies currently have `DRAFT — IMPLEMENTATION BLOCKED UNTIL VERIFIED` status.
