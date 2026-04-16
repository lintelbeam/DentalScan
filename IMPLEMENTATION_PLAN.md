# DentalScan Implementation Plan

## Scope And Constraints
- Goal: plan implementation only (no application code changes in this step).
- Repository baseline reviewed from tracked files (excluding generated/vendor dirs like `starter-kit/.next` and `starter-kit/node_modules`).
- Challenge source of truth: `docs/assignment.md`.
- Keep current stack/versioning (Next.js `14.2.0`, Prisma, Tailwind, SQLite in starter kit).

## 1) Repository Inventory

### 1.1 Routes (Current)
| Route | Methods | File | Current Behavior |
|---|---|---|---|
| `/` | GET | `starter-kit/src/app/page.tsx` | Renders `ScanningFlow` only. |
| `/api/notify` | POST | `starter-kit/src/app/api/notify/route.ts` | Parses `scanId/status`; logs stub; does not persist notification. |
| `/api/messaging` | GET, POST | `starter-kit/src/app/api/messaging/route.ts` | GET validates `threadId` but returns empty array; POST logs stub; no DB writes. |

### 1.2 Components (Current)
| Component | File | Current Behavior |
|---|---|---|
| `ScanningFlow` | `starter-kit/src/components/ScanningFlow.tsx` | Camera capture flow for 5 views; placeholder guidance overlay; local state only; no API integration for finalization/notify/messaging. |

### 1.3 Prisma Models (Current)
| Model | File | Fields |
|---|---|---|
| `Scan` | `starter-kit/prisma/schema.prisma` | `id`, `status`, `images` (comma-separated string), `createdAt`, `updatedAt` |
| `Notification` | `starter-kit/prisma/schema.prisma` | `id`, `userId`, `title`, `message`, `read`, `createdAt` |
| `Thread` | `starter-kit/prisma/schema.prisma` | `id`, `patientId`, `messages[]`, `updatedAt` |
| `Message` | `starter-kit/prisma/schema.prisma` | `id`, `threadId`, `content`, `sender`, `createdAt`, relation to `Thread` |

### 1.4 Scripts (Current)
| Scope | Script | Command |
|---|---|---|
| `starter-kit/package.json` | `dev` | `next dev` |
| `starter-kit/package.json` | `build` | `next build` |
| `starter-kit/package.json` | `start` | `next start` |
| `starter-kit/package.json` | `lint` | `next lint` |
| Docker (root) | compose runtime | `docker compose up --build` (per `starter-kit/SETUP_GUIDE.md`) |

### 1.5 Config / Infra Files (Current)
- Root: `.gitignore`, `docker-compose.yml`, `package-lock.json`
- Starter kit:
  - runtime/build: `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`
  - framework/config: `tsconfig.json`, `postcss.config.js`, `tailwind.config.ts`, `next-env.d.ts`
  - styles/layout: `src/app/globals.css`, `src/app/layout.tsx`
  - docs: `README.md`, `SETUP_GUIDE.md`

## 2) Requirement Comparison Against Challenge Brief

### 2.1 Scan Enhancement (Frontend)
- Required by brief:
  - responsive centered guidance circle/mouth guide
  - quality indicator (e.g., color changes)
  - performance-conscious camera UI
- Current status:
  - placeholder dashed overlay only
  - no quality state/indicator logic
  - no explicit camera stream cleanup on unmount
- Gap: **Not implemented**.

### 2.2 Notification Trigger + Read/Unread Storage (Backend/State)
- Required by brief:
  - update scan submission logic to trigger simulated notification
  - persist notification in Prisma with read/unread state
- Current status:
  - `/api/notify` stub logs only; no `notification.create`
  - no scan finalization route/orchestration
  - no endpoint to update/read notification read-state lifecycle
- Gap: **Mostly not implemented**.

### 2.3 Patient-Dentist Messaging (Full-Stack)
- Required by brief:
  - quick-message sidebar on scan result dashboard
  - backend persistence to `Thread` / `Message`
- Current status:
  - no result dashboard/quick-message UI
  - `/api/messaging` GET/POST are stubs
- Gap: **Not implemented**.

## 3) Missing Pieces, Implicit Requirements, Ambiguities

### 3.1 Concrete Missing Pieces
- No scan finalization API that persists scan completion and images.
- No integration from `ScanningFlow` to backend on final step.
- No notification persistence logic in API.
- No notification lifecycle API (read/unread updates) despite read state requirement.
- No messaging sidebar component or result dashboard surface.
- No implemented thread/message persistence/retrieval behavior.
- No input validation/error contracts for existing APIs.

### 3.2 Implicit Requirements (Needed To Satisfy Brief)
- A completion transition from capture UI to a result/dashboard state is required to host quick messaging.
- Stable API payload contracts between frontend and backend are required for consistent state.
- Minimal identity context is required (`patientId`, clinic/dentist recipient ID) because models use `patientId`/`userId`.
- Notification must be triggered as part of finalization path (not as isolated manual API call).

### 3.3 High-Risk Ambiguities To Resolve Early
- What exact screen is “scan result dashboard”? (same `/` view vs dedicated route)
- How to determine “quality indicator” without face-tracking library? (heuristic vs true tracking)
- Who is notification recipient (`Notification.userId`) in starter context?
- Should messaging thread be pre-created, created-on-first-message, or one-thread-per-scan?
- Exact finalization payload shape and whether exactly 5 images are mandatory server-side.
- Should notification read/unread updates be in scope for this challenge submission or only storage default?
- Assignment mentions PostgreSQL/Twilio stubs, starter kit uses SQLite and no provider scaffolding.

### 3.4 Not Specified: Should Not Be Invented
- Real SMS/voice provider integration (Twilio/Telnyx production wiring).
- Authentication/authorization model, role system, or clinic tenancy rules.
- AI-based facial landmark quality scoring model.
- Real-time transport (WebSocket/SSE) requirements.
- Telehealth room creation/join orchestration details.
- Compliance/security policies beyond basic secure coding defaults.

## 4) Recommended API Contracts (Minimal, Challenge-Focused)

### 4.1 Scan Finalization (new)
`POST /api/scans/finalize`

Request:
```json
{
  "scanId": "optional-cuid",
  "images": ["string", "string", "string", "string", "string"],
  "clinicUserId": "string"
}
```

Behavior:
- Validates payload.
- Creates or updates `Scan` with `status = "completed"` and `images` as comma-joined string.
- Triggers notification creation (directly or via shared notify helper).

Response `200`:
```json
{
  "ok": true,
  "scan": {
    "id": "cuid",
    "status": "completed",
    "imagesCount": 5
  },
  "notification": {
    "id": "cuid",
    "userId": "string",
    "read": false
  }
}
```

Errors:
- `400` invalid payload
- `404` scan not found (if `scanId` provided but missing)
- `500` server/database failure

### 4.2 Notification Triggering (existing route)
`POST /api/notify`

Request:
```json
{
  "scanId": "cuid",
  "status": "completed",
  "clinicUserId": "string"
}
```

Response `200`:
```json
{
  "ok": true,
  "notification": {
    "id": "cuid",
    "userId": "string",
    "title": "Scan Completed",
    "message": "New patient scan is ready for review.",
    "read": false
  }
}
```

Recommended extension for read-state lifecycle:
- `PATCH /api/notify` with `{ "notificationId": "cuid", "read": true }`

### 4.3 Messaging (existing route)
`GET /api/messaging?threadId=<cuid>`

Response `200`:
```json
{
  "threadId": "cuid",
  "messages": [
    {
      "id": "cuid",
      "threadId": "cuid",
      "sender": "patient",
      "content": "text",
      "createdAt": "ISO-8601"
    }
  ]
}
```

`POST /api/messaging`

Request:
```json
{
  "threadId": "optional-cuid",
  "patientId": "required-if-threadId-missing",
  "sender": "patient",
  "content": "string"
}
```

Behavior:
- Validates sender/content.
- Uses existing thread if `threadId` provided; otherwise creates new `Thread` with `patientId`.
- Persists `Message` linked to thread.

Response `201`:
```json
{
  "ok": true,
  "threadId": "cuid",
  "message": {
    "id": "cuid",
    "sender": "patient",
    "content": "string",
    "createdAt": "ISO-8601"
  }
}
```

## 5) Minimal File-By-File Change Plan

## 5.1 Existing Files To Modify
1. `starter-kit/src/components/ScanningFlow.tsx`
- Implement responsive centered mouth/guide overlay.
- Add quality indicator state/UI (heuristic, lightweight).
- On step 5 completion, call scan finalization API and surface success/error states.
- Ensure media stream cleanup on unmount.

2. `starter-kit/src/app/page.tsx`
- Add dashboard/result state after scan completion.
- Render quick-message sidebar in completed state.
- Keep the pre-scan flow unchanged until finalization succeeds.

3. `starter-kit/src/app/api/notify/route.ts`
- Replace stub with Prisma write to `Notification`.
- Add strict input validation and consistent JSON errors.
- (Recommended) add `PATCH` handler for read/unread updates.

4. `starter-kit/src/app/api/messaging/route.ts`
- Implement GET query to fetch thread messages ordered by `createdAt`.
- Implement POST insert logic with thread create-or-use behavior.
- Validate `sender` and non-empty content.

## 5.2 New Files Recommended
1. `starter-kit/src/app/api/scans/finalize/route.ts`
- Central orchestration endpoint for scan completion + notification trigger.

2. `starter-kit/src/components/QuickMessageSidebar.tsx`
- Isolated messaging UI (list + composer + loading/error states).

3. `starter-kit/src/lib/prisma.ts`
- Shared Prisma singleton to avoid per-request client instantiation issues in dev/hot-reload.

4. `starter-kit/src/lib/contracts.ts` (optional but recommended)
- Shared request/response TypeScript contracts for scan finalize/notify/messaging.

## 5.3 Optional Schema Improvements (Only If Scope Allows)
- `starter-kit/prisma/schema.prisma`
  - Consider enums for `Scan.status` and `Message.sender`.
  - Consider relation fields/indexes to tie scans, notifications, and threads more explicitly.
- Note: these are quality improvements, not strictly required for minimum challenge completion.

## 6) Execution Order (Minimal Risk)
1. Implement shared Prisma helper and API contracts.
2. Implement `/api/notify` and `/api/messaging` persistence.
3. Implement `/api/scans/finalize` orchestration.
4. Integrate frontend scan completion call from `ScanningFlow`.
5. Add result dashboard + `QuickMessageSidebar`.
6. Manual verification:
   - complete 5-step scan
   - confirm `Scan` + `Notification` persisted
   - send/read messages for thread

## 7) Acceptance Criteria Checklist
- 5-step capture finishes and transitions into result/dashboard state.
- Guidance overlay is centered/responsive and quality indicator is visible.
- Completing scan persists scan + triggers notification with `read = false`.
- Messaging UI can send and retrieve persisted messages from Prisma.
- APIs return consistent success/error contracts and validate inputs.
- No framework/version upgrades required to complete scope.
