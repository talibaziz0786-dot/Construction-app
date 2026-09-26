# STATUS

> STATUS DOCUMENT RULE
> Read this file before starting substantial work.
> It describes the current project state but does not override `.clinerules/00-project-rules.md`.

## 1. Project Identity
* **Project Name:** Construction App (`construction-app`)
* **Goal:** A professional construction estimation and home-planning platform helping homeowners and contractors understand material quantities, labor, costs, BOQ, budgets, and contractor quotation differences across major house construction areas without forcing a complex project/room workflow.

## 2. Product Vision
* **Universal Construction Estimation Platform:** Homeowners and professionals can immediately choose what construction estimate they need (Wall, Plaster, Tiles, Concrete, Foundation, RCC Roof, etc.) from a Calculator Hub or use a full Room/Floor/House workspace.
* **Calculator-First UX:** Home → Calculator Hub → Calculator-specific flow with progressive disclosure of inputs.
* **Monetization Architecture:** Free calculators + ads + credits/tokens / short-duration access + premium entitlements, keeping calculation domain logic completely decoupled from monetization.

## 3. Current Architecture & Stack
* **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide, Zustand, React Hook Form, Zod, Axios.
* **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose.
* **Clean Architecture:** Domain-oriented modular architecture with separation of concerns, single source of truth, and server-side authoritative calculations.
* **Security:** JWT HttpOnly cookies, bcrypt, auth middleware, authorization, ownership checks, IDOR protection, rate limiting, Helmet, CORS allowlist, payload validation.

## 4. Current Canonical Files & Engine
* **Calculation Engine:** `server/src/modules/estimation/engine/`
* **Dependency Graph:** `server/src/modules/estimation/engine/DependencyGraph.ts`
* **Calculator Registry:** `server/src/modules/estimation/engine/registry/CalculatorRegistry.ts`
* **Calculators:**
  * `room.floor-area v1.0.0`
  * `wall.net-area v1.0.0`
  * `masonry.brick-quantity v1.0.0`
  * `concrete.volume v1.0.0`
  * `plaster.quantity v1.0.0`
  * `tile.quantity v1.0.0`
* **Physical Hierarchy:** Project → Building → Floor → Space/Room → Wall → Opening.

## 5. Completed Phases
* **Phase 0 — Project Foundation & Architecture:** COMPLETE.
* **Phase 1 — Calculator Hub & Estimation Stabilization:** COMPLETE + FROZEN. Do not reopen. Do not change calculation methodology. Architecture stabilized to ONE canonical composer, registry, orchestrator, BOQ model and rate-card contract; added server-driven Calculator Hub + six quick calculators with Zod-validated compositions. Verified baseline at time of writing: 88/88 server + 33/33 client passing (run `npm --prefix server test` / `npm --prefix client test` to re-verify; STATUS.md must not be treated as frozen test evidence).
* **Phase 2 — Calculator Hub / Calculator Experience:** READY / IN PROGRESS (owner-authorized 2026-09-25). Scope is product-experience improvements to the existing discovery/inputs/results/BOQ/states/i18n/theme/responsiveness/accessibility only. No new construction formulas, no methodology changes, no engine-architecture changes.

## 6. Calculation Methodology Baseline
* **Brick Module:** Physical brick `0.19 × 0.09 × 0.09 m`, Mortar joint `0.01 m`, Effective module `0.20 × 0.10 × 0.10 m` (`0.002 m³`).
* **Procurement:** `theoreticalBrickQuantity = netMasonryVolume / 0.002`, `procurementQuantity = ceil(theoretical * (1 + wastage%))`.
* **Sanity Baseline:** 10 ft × 10 ft room (height 3 m, no openings) gives gross wall area ~36.58 m², masonry volume ~8.41 m³, theoretical bricks ~4,206, procurement (5% wastage) ~4,417 bricks.

## 7. Current Tests & Build Status
* **Server Tests:** 88/88 passing (engine composition + BOQ domain + calculator API + all calculator suites).
* **Client Tests:** 33/33 passing (calculation/calculator service, unit conversion, friendly units, theme coverage suites).
* **Server TypeScript:** PASS (`tsc --noEmit`, zero `any` / unsafe casts in the calculation, BOQ, cost and rate architecture).
* **Client TypeScript:** PASS (`tsc --noEmit`, zero `any` outside `three-stdlib` interop typing).
* **Server Build:** PASS (`tsc` emit).
* **Client Build:** PASS (Vite production bundle; existing >500 kB 3D chunk warning unchanged).
* **Phase 2 Verification (2026-09-26):** `npm run verify:phase2` (`node verify-phase2.mjs`) is the reproducible end-to-end check for this phase: 1 script-structure guard, 15 API-contract checks (catalog + all six calculators + BOQ theoretical/procurement fields + 404/400 error paths) and 37 browser checks over the Chrome DevTools protocol (hub search / category filter / empty state / result-count live region, Hindi + light theme, brick form → result → BOQ whose displayed number is compared against the API using the exact payload the client posted, client-side validation surfaces, no console errors or 5xx, 390 px overflow guard). **Latest run: PASS (53 checks, 0 failed, 0 skipped)** with server 88/88 + client 33/33 tests green and both `tsc --noEmit` projects clean. Browser checks skip automatically when Chrome (DevTools port 9222) or the client dev server is unavailable (`--api` runs the API half alone), and a repeated run inside the same minute reports `BLOCKED` with a re-run hint because the API allows 30 calculation requests per minute per IP.
* **MVP Release Polish (2026-09-23 + Phase 2 UX 2026-09-25):** Home now answers “What can I calculate?” with six verified calculator cards and a primary “Start Calculating” CTA; Calculator Hub shows result/unit hints, search empty state and retryable errors; Calculator result hides internal calculator/composition IDs behind “Verified method”; BOQ hides confusing zero totals until a local rate is entered; print CSS now produces a clean black-on-white calculator report with title/disclaimer; mobile overflow guard + visible focus states added. Phase 2 adds: hub category filter + clear-search + result-count live region, form Clear/Fill-example + touched-only errors + described-by wiring, result aria-live + meaning line, BOQ theoretical/wastage lines + translated empty/rate states, calculator-page focus/scroll handling. No construction formulas changed.

## 8. Known Limitations & Assumptions
* **Legacy Openings:** Openings without explicit `wallSide` default deterministically to `north`.

## 9. Monetization & Entitlements
* Free core calculators + Ad slots (`AdSlot.tsx`) + Credits/tokens and short-duration access roadmap. Calculation domain remains 100% unaware of monetization or ads.

## 10. Future Roadmap & Mobile Strategy
* **Calculator Hub Expansion:** Add structure, masonry, surface, concrete, waterproofing, and earthwork calculators.
* **Expo / Android Strategy:** Planned future mobile app (`apps/mobile`) reusing shared domain logic, schemas, types, and API client while maintaining platform-specific UI.

## 11. Cline Handoff Protocol
Every future Cline chat must:
1. Read `.clinerules/00-project-rules.md`
2. Read `STATUS.md`
3. Read relevant architecture docs in `docs/architecture/`
4. Inspect actual files before editing
5. Reuse canonical implementations (Never create duplicate architecture)
6. Run tests and type checks after any change
