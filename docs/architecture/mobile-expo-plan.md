# Mobile & Expo Migration Strategy

> This document defines the long-term mobile extension strategy for bringing the Construction App to the Google Play Store.

## 1. No Immediate Migration
* **DO NOT migrate to Expo or React Native in Phase 0.**
* The current web application (`client/`) and server (`server/`) remain active, stable, and authoritative.

## 2. Long-Term Architecture (Monorepo / Shared Packages)
When mobile development is authorized, the architecture will evolve into a shared workspace:
* `apps/web` (React Vite web client)
* `apps/mobile` (Expo React Native mobile client)
* `apps/api` (Node.js Express backend)
* `packages/domain` (Shared calculation contracts, domain models, and validation schemas)
* `packages/api-client` (Shared Axios API client)

## 3. Separation of Concerns
* Business logic, calculation formulas, and validation schemas will be shared across web and mobile via `packages/domain`.
* UI components will remain platform-specific (Tailwind CSS for web, React Native primitives for mobile) to ensure native performance and UX quality on Android devices.
