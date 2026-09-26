# Universal Calculator Roadmap

> This document defines the extensible roadmap for construction calculators in the Construction App. All future calculators must adhere to the Calculator Contract, registry, validation, and test architecture.

## 1. Calculator Categories & Roadmap

### Structure
* **Foundation / Neev** (`PLANNED`) - Excavation, PCC, footing masonry/concrete.
* **Footing** (`PLANNED`) - Independent footing volume, concrete, and steel estimation.
* **Column** (`PLANNED`) - RCC column concrete, formwork, and reinforcement.
* **Beam** (`PLANNED`) - RCC beam calculation.
* **Slab / RCC Roof** (`PLANNED`) - Roof slab concrete, steel, and shuttering.
* **Lintel** (`PLANNED`) - Door/window lintel quantities.
* **Staircase** (`PLANNED`) - Step geometry, concrete, and reinforcement.
* **Chajja / Sunshade** (`PLANNED`) - Cantilever projection estimation.

### Masonry
* **Brick Wall** (`IMPLEMENTED v1.0.0`) - Net area, mortar, and brick quantity.
* **Block Wall** (`PLANNED`) - AAC / concrete block masonry calculation.
* **Partition Wall** (`PLANNED`) - Thin internal partition quantities.
* **Foundation Masonry** (`PLANNED`) - Stepped masonry footings.

### Surface / Finishing
* **Plaster** (`IMPLEMENTED v1.0.0`) - Internal/external plaster volume and mortar ratios.
* **Putty** (`PLANNED`) - Wall putty quantities and coats.
* **Paint** (`PLANNED`) - Primer and paint coverage calculation.
* **Tiles** (`IMPLEMENTED v1.0.0`) - Floor/wall tile quantity, adhesive, and grout.
* **Flooring** (`PLANNED`) - Marble, granite, or screed flooring.
* **Skirting** (`PLANNED`) - Running foot tile skirting.

### Concrete
* **PCC** (`IMPLEMENTED v1.0.0` via concrete volume) - Plain cement concrete bed.
* **RCC** (`PLANNED`) - Reinforced cement concrete members.
* **Floor Concrete** (`IMPLEMENTED`) - Slab/floor blinding or grade concrete.

### Waterproofing
* **Roof Waterproofing** (`PLANNED`) - Membrane or chemical coating area.
* **Bathroom Waterproofing** (`PLANNED`) - Wet area vertical and horizontal waterproofing.

### Earthwork
* **Excavation** (`PLANNED`) - Trench and pit soil removal volume.
* **Filling & Backfilling** (`PLANNED`) - Foundation and plinth filling quantities.

## 2. Mandatory Implementation Checklist for New Calculators
Every future calculator must define:
1. Calculator ID & Version
2. Purpose & Description
3. Input Schema & Zod Validation
4. Canonical Units & Conversion Rules
5. Engineering Formula & Rules (verified by professional standards)
6. Assumptions, Wastage, & Rounding
7. Output Structure & Trace
8. Unit Tests (normal, boundary, invalid values)
