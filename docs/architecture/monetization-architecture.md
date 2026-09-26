# Monetization Architecture

> This document outlines the sustainable freemium model and architecture boundaries for the Construction App.

## 1. Core Principles
* **Domain Independence:** The construction calculation engine and domain modules are 100% independent of monetization, ads, authentication, and payment providers.
* **Entitlement Boundary:** Access control and feature entitlements are enforced at the service/API routing layer via policy checks (e.g., `canUseCalculator(user, feature)`), keeping calculators pure.

## 2. Revenue Streams
* **Free Tier:** Basic core calculators, standard estimation summaries, supported by non-intrusive ad placements (`AdSlot.tsx`).
* **Credits / Tokens:** Pay-per-calculation packages for advanced BOQ reports, detailed structural calculators, or multi-floor exports.
* **Short-Duration Access:** 1-day, 7-day, or 30-day professional passes for contractors and estimators.

## 3. Future Payment Integration Boundary
* Payment gateways (e.g., Stripe/Razorpay) will integrate strictly through dedicated billing services and webhooks, updating user entitlement models in MongoDB without touching estimation math.
