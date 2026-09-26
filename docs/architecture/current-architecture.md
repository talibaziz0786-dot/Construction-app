# Current Architecture Reference

> This document describes the canonical architecture of the Construction App. It must be consulted before implementing any new features or calculators.

## 1. Overview
The Construction App is structured following Clean Architecture principles, ensuring strict separation of concerns between domain calculation logic, application services, HTTP controllers, persistence models, and presentation clients.

## 2. Technology Stack
* **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, Lucide icons, Zustand state management, React Hook Form, Zod validation, Axios.
* **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose ODM.
* **Testing:** Vitest.

## 3. Backend Architecture (`server/src/`)
* **Modules:** Organized by domain (`estimation`, `project`, `auth`, etc.).
* **Calculation Engine (`server/src/modules/estimation/engine/`):**
  * Authoritative server-side calculation layer.
  * **DependencyGraph.ts:** Canonical dependency resolver and topological sorter for calculations.
  * **registry/CalculatorRegistry.ts:** The ONE central registry for all registered calculators (`Calculator` contract). There is no second registry.
  * **core/composition/CalculationComposer.ts (+ CalculationComposerTypes.ts):** The ONE composed-calculation executor (ordered value/derived steps, aggregated traceable result). There is no second composer.
  * **orchestration/EstimationOrchestrator.ts:** Application-facing engine entry point owning the registry, graph and composer.
  * **Calculators:** Independent modular calculators (`room.floor-area`, `wall.net-area`, `masonry.brick-quantity`, `concrete.volume`, `plaster.quantity`, `tile.quantity`), registered once per process via `calculators/canonicalCalculators.ts`.
* **BOQ:** ONE canonical model in `estimation/domain/boq.ts` (nullable rate/amount when no usable rate is configured; totals derived from priced lines only).
* **Rates:** ONE canonical contract in `estimation/domain/project/RateCard.ts` (`SUPPORTED_MATERIAL_CATEGORIES` runtime list + derived type; entries carry category, optional item/material, rate, unit, currency, optional source/location/notes, optional updatedAt). Routes and persistence consume it — no parallel rate schemas.
* **Calculator Catalog & API (`estimation/catalog/`, `estimation/routes/calculatorRoutes.ts`):** Server-driven Calculator Hub listing plus Zod-validated quick-calculation compositions. `GET /api/calculators`, `POST /api/calculators/:calculatorId/calculate`.
* **Security & Middleware:** JWT HttpOnly auth cookies, bcrypt hashing, role/ownership verification, Helmet, CORS, rate limiting, and input validation.

## 4. Frontend Architecture (`client/src/`)
* **Client State & Hooks:** Zustand stores and React hooks (e.g., `useMultiRoomProject`, `useAuth`, `useUnit`) manage UI state and API communication.
* **Presentation:** Tailwind CSS v4 styling, component-based modular structure, ad slots (`AdSlot.tsx`), and export report modals (`ExportReportModal.tsx`).
* **Calculator-first product:** Home → Calculator Hub (`/calculators`, server-driven listing) → calculator flow (`/calculators/:calculatorId`, simple inputs → clear result → optional rate-card BOQ/cost → export/print). The Project → Floor → Room hierarchy remains available in the workspace for detailed estimation.
* **Boundary Rule:** The frontend performs input formatting, validation presentation, and display unit conversion only. It never executes core construction engineering formulas.

## 5. Single Source of Truth & Principles
* Every domain concept (Unit, Measurement, Quantity, Material, Project, Room, Wall, Opening, Estimate) has one canonical definition.
* No duplicate files, parallel calculators, or ad-hoc calculation formulas.
