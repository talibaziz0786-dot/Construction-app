# Product Boundaries & Architecture

This document defines the architectural boundaries for user access, authentication, monetization, and future feature scaling.

## 1. User Access Model
- **Guest**: Access to public/basic calculators without authentication.
- **Authenticated User**: Registered users can save projects, maintain history, and manage persistent data.
- **Premium User**: Future state for advanced features and limits.
- **Admin**: Future role for system management.

## 2. Authentication & Authorization Boundary
- Identity and Authorization are infrastructure concerns, NOT domain concerns.
- **Calculations are Authentication-Agnostic**: Mathematical results of construction calculators must NEVER change based on user type.
- Authorization is enforced at the Application boundary, ensuring users can only access their owned projects.

## 3. Project & Calculation Ownership
- **Project Ownership**: `User` → `Projects` → `Buildings` → `Floors` → `Spaces` → `Geometry`.
- **Calculations**: Perform independently of user context; only the persistence of a calculation result is linked to an authenticated `Project`.

## 4. Monetization & Advertisements
- **Ads Boundary**: Ads are purely a presentation concern. They must NEVER reside within domain entities or calculation logic.
- **Ads UX**: Ads must not interfere with calculator inputs or obscure results.
- **Premium Model**: Capability-based. Future features are gated by capabilities (e.g., `report.export`), not hard-coded `if premium` checks.

## 5. Security & Privacy Principles
- All user-provided inputs must be strictly validated server-side.
- Authentication secrets, tokens, and user credentials remain strictly on the backend.
- Client-side premium flags are NEVER trusted; all entitlements are validated server-side.
- Logs must remain free of sensitive data (PII, credentials, tokens).

## 6. Frontend & Mobile-First Strategy
- **Mobile-First**: Design and development must prioritize mobile/tablet interactions.
- **Responsive UI**: Future UI implementation must target WCAG 2.2 AA accessibility and a modern, professional look without fragmenting existing design systems.

## 7. SEO & Acquisition Strategy
- Public calculator pages are optimized for discovery.
- Funnel strategy: Search -> Free Utility -> Useful Result -> Optional Signup -> Premium Upsell.
