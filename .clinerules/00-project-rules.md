# 1. PROJECT IDENTITY

Project:
Construction App

Goal:

A professional construction estimation and home-planning platform that helps homeowners understand approximate material quantities, labour, costs, BOQ, budgets, and contractor quotation differences.

The project must eventually support construction-related calculations across the major areas of a house.

The first version will NOT depend on AI.

AI may be introduced later as an optional layer.

# 2. TECHNOLOGY

Frontend:

* React
* Vite
* TypeScript
* Tailwind CSS

Backend:

* Node.js
* Express
* TypeScript
* MongoDB
* Mongoose


# 5. SINGLE SOURCE OF TRUTH

Every important domain concept must have one canonical definition.

Examples:

* Unit
* Measurement
* Quantity
* Material
* MaterialRate
* Project
* House
* Floor
* Room
* Estimate
* BOQ
* Cost
* CalculationResult

Do not redefine the same concept independently in unrelated modules.

# 6. CALCULATION ENGINE RULE

Construction calculations are core business logic.

Calculation formulas MUST NOT be placed directly inside:

* React components
* pages
* controllers
* routes
* API handlers
* database models

Calculations must eventually live inside a dedicated calculation/domain layer.

Each calculator must be independently testable.

Every future calculator must document:

* Calculator ID
* Version
* Purpose
* Inputs
* Units
* Validation
* Formula/rules
* Assumptions
* Wastage
* Rounding
* Output
* Limitations
* Reference/source
* Test cases

Never invent a construction formula merely to make a feature work.

If a formula or engineering assumption is uncertain, stop and flag it for verification.

# 7. ENGINEERING SAFETY

The application provides preliminary estimation and planning assistance.

It must NOT falsely claim that estimates are guaranteed or that the application replaces:

* structural engineers
* architects
* licensed professionals
* approved drawings
* site-specific engineering design

Structural calculations and safety-critical recommendations must be clearly separated from preliminary quantity estimation.

# 8. UNIT SYSTEM

Units and conversions must have a centralized source of truth.

Do not implement ad-hoc conversions in individual calculators.

The system should eventually support relevant construction units such as:

* mm
* cm
* m
* inch
* ft
* sq.ft
* sq.m
* cu.ft
* cu.m
* kg
* tonne
* litre
* piece
* bag
* box
* running ft

Exact conversion rules must be centralized and tested.

# 9. FRONTEND RULES

Frontend is responsible for:

* UI
* UX
* forms
* validation presentation
* client state
* API communication
* accessibility

Frontend must NOT contain authoritative construction business logic.

Do not duplicate backend calculation formulas inside React components.

# 10. BACKEND RULES

Backend is responsible for:

* business rules
* calculation orchestration
* persistence
* authentication/authorization when implemented
* server-side validation
* API contracts
* project data integrity

Controllers should remain thin.

Do not put large business logic inside controllers.

# 11. DATABASE RULES

Database schemas must represent domain concepts clearly.

Do not duplicate the same data unnecessarily.

Avoid storing derived values when they can safely be calculated from canonical source data, unless there is a documented performance/history requirement.

# 12. TYPESCRIPT RULES

Use strict TypeScript.

Avoid `any`.

Never use:

```text
@ts-ignore
@ts-nocheck
```

to hide errors.

Do not weaken TypeScript configuration merely to make code compile.

Types should represent actual domain contracts.

Supporting technologies may be added only when there is a clear architectural requirement.

# 3. CORE PRINCIPLES

Always follow:

* Clean architecture
* Modular architecture
* Separation of concerns
* SOLID principles where appropriate
* Single Source of Truth
* DRY
* Strict TypeScript
* Explicit contracts
* Predictable naming
* Testable business logic
* Maintainable code
* Production-oriented implementation

# 4. ABSOLUTE NO-DUPLICATION RULE

Never create duplicate:

* files
* services
* controllers
* types
* interfaces
* models
* utilities
* calculators
* business logic
* API contracts

Before creating a new file, inspect the existing project.

If equivalent functionality already exists, modify or extend the canonical implementation instead of creating another implementation.

Never create names such as:

* new
* old
* backup
* v2
* final
* final2
* copy
* temp
* test2

unless explicitly required.


# 13. VALIDATION

User input must be validated.

Validation should exist at the appropriate boundaries.

Never trust client-side validation alone.

Critical backend inputs must be validated server-side.

# 14. TESTING

Every important calculation must have automated tests.

Tests must cover:

* normal values
* boundary values
* invalid values
* unit conversion
* rounding
* wastage
* edge cases

When modifying a calculation, run the relevant tests.

Do not modify tests merely to make incorrect code pass.

# 15. DOCUMENTATION

Important architectural decisions must be documented.

Construction formulas and assumptions must be documented before implementation.

Do not silently change calculation methodology.

# 16. DEPENDENCY DISCIPLINE

Do not install packages without a reason.

Before adding a dependency:

1. Check whether the existing stack can solve the problem.
2. Check whether the dependency is actually necessary.
3. Consider maintenance and bundle/runtime impact.
4. Avoid multiple packages solving the same problem.

# 17. ARCHITECTURE DISCIPLINE

Never restructure the project casually.

Do not rename or move major folders simply because another structure looks nicer.

Before a structural change:

1. Inspect current architecture.
2. Explain why the change is necessary.
3. Identify affected imports/contracts.
4. Make the smallest safe change.
5. Validate the project afterwards.

# 18. AI CODING BEHAVIOR

Cline is an implementation assistant, not the sole architecture authority.

Before significant implementation:

* inspect the existing code
* understand existing abstractions
* reuse canonical implementations
* avoid speculative abstractions
* avoid duplicate implementations

Never generate an entire large feature blindly if it can be safely implemented incrementally.

# 19. PHASE DISCIPLINE

The project will be developed in phases.

Cline must work only on the currently authorized phase.

Do not automatically implement future phases.

Owner-authoritative phase status (2026-09-25 handoff takes precedence over any stale wording):

**Phase 0 — Project Foundation & Architecture: COMPLETE**
**Phase 1 — Calculator Hub & Estimation Stabilization: COMPLETE + FROZEN (do not reopen, do not change calculation methodology)**
**Phase 2 — Calculator Hub / Calculator Experience: READY / IN PROGRESS (authorized scope only)**

Future phases beyond Phase 2 will be explicitly authorized by the project owner.

# 20. STOP CONDITIONS

Cline must stop and ask for clarification when:

* requirements conflict
* an architectural decision is ambiguous
* a construction formula is uncertain
* an existing implementation conflicts with a requested change
* a new dependency appears necessary but its purpose is unclear
* a structural migration appears necessary
* there is risk of duplicate business logic
* safety-critical engineering assumptions are uncertain

Do not silently guess.

# 21. CHANGE SAFETY

Before modifying an existing file:

* inspect it
* understand its role
* check imports/usages
* preserve existing contracts unless intentionally changing them

After significant changes:

* run TypeScript checks
* run linting
* run relevant tests
* check imports
* inspect the resulting project structure

# 22. SECRETS

Never hard-code:

* API keys
* passwords
* JWT secrets
* database credentials
* payment credentials

Use environment variables.

Never commit real secrets.

# 23. CODE QUALITY

Prefer:

* readable code
* small focused modules
* explicit naming
* predictable data flow
* reusable domain logic
* testable functions

Avoid:

* giant files
* giant components
* giant controllers
* deeply coupled modules
* unnecessary abstraction
* magic numbers without explanation

# 24. PROJECT OWNER

The project owner has final authority over architecture and product decisions.

Do not silently override explicit project requirements.

If a better approach is discovered, explain it first rather than silently changing the architecture.

# 25. CURRENT PHASE RESTRICTION

Owner-authoritative phase status: Phase 0 COMPLETE, Phase 1 COMPLETE + FROZEN, Phase 2 READY / IN PROGRESS (2026-09-25 handoff).

For the current Phase 2 (Calculator Hub / Calculator Experience):

ONLY make authorized product-experience improvements to the existing calculator discovery, inputs, results, BOQ readability, states, i18n, theme, responsiveness and accessibility.

Do not implement new construction formulas.

Do not modify existing calculation methodology.

Do not modify the canonical engine architecture.

Do not implement AI.

Do not implement payments beyond the existing documented roadmap boundaries.

Do not implement ads beyond the existing AdSlot architecture.
