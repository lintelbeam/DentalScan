# Loom Talk Track (2 Minutes)

## 0:00 - 0:20 | What This Project Covers

- This submission implements the core challenge flows end-to-end:
  - Scan capture enhancement
  - Scan finalization + notification trigger
  - Results view + patient/clinic messaging
- Scope is intentionally lean and demo-focused.

## 0:20 - 0:50 | Architecture Overview

- **Frontend**: Next.js App Router + Tailwind.
  - Scan flow UI in `src/components/ScanningFlow.tsx` and `src/components/scanning-flow/*`.
  - Results + quick messaging UI in `src/app/results/[scanId]/page.tsx` and `src/components/results/QuickMessageSidebar.tsx`.
- **Backend**: Route handlers in `src/app/api/*`.
  - `scans`, `notify`, `messaging` endpoints.
- **Data layer**: Prisma + SQLite (`prisma/schema.prisma`) with `Scan`, `Notification`, `Thread`, `Message` models.

## 0:50 - 1:20 | Key Tradeoffs

- Camera quality logic uses a lightweight heuristic (downsampled canvas + motion/detail checks) instead of heavier CV libraries.
- Notification dispatch is simulated for reliability and speed in a challenge context.
- Messaging includes optimistic UI and transaction-based writes, with optional Anthropic auto-reply when API key is configured.
- Tests focus on high-value units and route validation; no heavy camera E2E automation.

## 1:20 - 1:50 | Demo Path

1. Start at `/` and capture all 5 scan views.
2. Show quality indicator and guidance changing with movement/framing.
3. Complete capture and show finalization/redirect to `/results/[scanId]`.
4. On results page, send a quick message and show optimistic update + server reconciliation.
5. (Optional) Show clinic auto-reply if `ANTHROPIC_API_KEY` is set.

## 1:50 - 2:00 | Known Limitations

- Notification delivery is stubbed (no real SMS/voice provider integration).
- No production auth/authorization boundaries.
- Camera scoring is non-clinical and heuristic.
- Manual QA is used for camera behavior (see `QA_CHECKLIST.md`).
