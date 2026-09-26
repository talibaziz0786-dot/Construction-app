# Calculator Hub UX Specification

> This specification defines the user experience architecture for navigating and executing construction estimates in the Construction App.

## 1. UX Principles
* **Calculator-First Design:** Home/Hub allows users to instantly pick a specific calculation tool (e.g., Wall, Plaster, Tiles, Concrete) without being forced into a multi-room project setup.
* **Progressive Disclosure:** Forms reveal input steps progressively (Scope → Dimensions → Specifications → Openings/Wastage → Results) to avoid overwhelming users.
* **Clarity & Trust:** Clear distinction between theoretical quantities, wastage allowances, and final procurement quantities.

## 2. Navigation Flow
```
Home / Hub
  ├── Quick Calculator (Single Wall, Plaster, Tile, Concrete, etc.)
  │     └── Enter Specific Inputs → Calculate → Clear Result & Summary
  │
  └── Full Project Workspace (Rooms, Floors, Buildings, BOQ, Export)
```

## 3. Presentation Standards
* Visual breakdown of units (e.g., m², m³, bricks, bags).
* Warnings and assumption callouts clearly highlighted.
* Guest-friendly execution with optional sign-up to save estimates.
