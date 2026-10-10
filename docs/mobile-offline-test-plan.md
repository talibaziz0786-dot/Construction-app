# Mobile Offline Test Plan (manual, on-device)

Goal: prove offline-first works — same verified methodology, local
persistence, sync resume. Server stays authoritative online.

## Setup

- App built from `apps/mobile` with `EXPO_PUBLIC_API_BASE_URL` pointing at a
  reachable backend (LAN IP for a physical device).
- Backend running; `GET /api/health` reachable from the phone.

## Cases

1. **Start online → open Brick Masonry → Calculate** → expect server result
   badge "Server verified", BOQ quantities shown, amounts rate-unavailable.
2. **Enable airplane mode → Recalculate** → expect "Offline result" badge,
   same quantities as online (±0), saved to History as Pending sync.
3. **Save/create local draft** (change an input, calculate) → History grows.
4. **Kill + restart app while offline** → History + pending queue persist;
   Hub still renders (cached catalog badge).
5. **Disable airplane mode** → banner flips Online → Syncing → queue drains;
   History entries flip to Synced/Server-verified; no duplicates.
6. **Failed sync/retry**: point API URL at a dead host, go online, confirm
   Sync failed badge; fix URL, confirm retry succeeds.
7. **Cached rate labeling**: open any BOQ offline → rates show unavailable
   with "cost requires online rates" note (never a priced amount).
8. **Invalid inputs offline**: empty / NaN / oversize opening → field or
   OfflineInputError message, no crash, no save, no queue entry.
9. **Hindi toggle offline** → chrome switches, persisted across restart.
10. **Parity harness**: `npm run offline:parity` passes (sanity 4206/4417).

Record PASS/FAIL per case with device + OS version. Do not claim 53/53
browser verification unless `verify-phase2.mjs` genuinely executes all 53.
