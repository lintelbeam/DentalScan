# DentalScan Starter Kit (Submission)

This repo contains a working DentalScan challenge implementation with scan capture, finalization, notifications, results, and messaging.

## Feature Summary

- Responsive scan capture flow with a centered mouth guide overlay.
- Lightweight camera stability heuristic (downsampled frame analysis) with red/amber/green quality feedback.
- Camera lifecycle handling for loading, denied permission, retry, and media-track cleanup.
- Scan finalization flow (`POST /api/scans`) with persisted scan records.
- Notification flow (`POST /api/notify`) with simulated dispatch and duplicate prevention.
- Results page (`/results/[scanId]`) with captured images and quick messaging sidebar.
- Messaging API (`/api/messaging`) with thread resolution, optimistic client UX, and optional Anthropic auto-reply.
- Local validation suite (Vitest + lint + typecheck) and manual QA checklist.

## Local Setup (Recommended)

### Prerequisites

- Node.js 18+
- npm 9+
- Postgres database (local or hosted)

### Run Locally

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`.

### Optional AI Auto-Reply (Messaging)

Set an Anthropic key before running:

```bash
export ANTHROPIC_API_KEY=your-key
npm run dev
```

Optional model override:

```bash
export ANTHROPIC_MODEL=claude-3-haiku-20240307
```

## Docker

From repository root (`DentalScan/`):

```bash
docker compose up --build
```

This starts both app and Postgres.

For HTTPS/domain setup (needed for camera on non-localhost), see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## Validation Commands

Run from `starter-kit/`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run build` runs:

1. `prisma generate`
2. `prisma migrate deploy` (when `DATABASE_URL` is set)
3. `next build`

This is required for Vercel to avoid stale Prisma Client and missing schema updates.

## Vercel Deploy Notes

- Set Vercel project root to `starter-kit`.
- Add `DATABASE_URL` (hosted Postgres) in Vercel Environment Variables.
- Optional: add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` for clinic auto-replies.
- Ensure the DB is reachable from Vercel and supports SSL if required by provider.

## API Endpoints

- `POST /api/scans` - finalize/persist scan payload.
- `POST /api/notify` - create notification when scan status is `completed`.
- `GET /api/messaging` - fetch message history by `threadId` or `patientId`.
- `POST /api/messaging` - create message and resolve/create thread.

## QA and Demo Docs

- Manual validation checklist: [QA_CHECKLIST.md](./QA_CHECKLIST.md)
- Product audit worksheet template: [AUDIT.md](./AUDIT.md)

## Known Limitations

- Notification dispatch is simulated (no Twilio/Telnyx integration).
- Messaging is demo-scoped (no auth/role enforcement/multi-tenant hardening).
- Camera quality scoring is heuristic and non-clinical.
- No automated camera E2E coverage; camera validation is manual.
- Anthropic reply depends on valid API key/network/model availability.
