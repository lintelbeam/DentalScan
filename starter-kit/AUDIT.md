# DentalScan Audit Notes

Status: Based on real troubleshooting history from this thread (development + deployment), plus direct API verification done on April 19, 2026.

## 1. Scope

- Product: `starter-kit` challenge implementation
- Environments reviewed:
  - Local/dev and self-hosted HTTPS (`https://dental-scan.nip.io`)
  - Vercel production (`https://dental-scan.vercel.app`)
- Inputs used:
  - User-provided Vercel build/runtime logs
  - API probes executed during troubleshooting in this thread
- Browser/device evidence from logs:
  - Windows 11 + Chrome 147

## 2. Coverage Performed

- Scan finalization API (`POST /api/scans`)
- Notification API (`POST /api/notify`)
- Messaging API (`GET /api/messaging`)
- Deploy/build pipeline behavior on Vercel (Prisma + env vars)
- Camera permission behavior on public HTTP vs HTTPS origins

## 3. Findings

| ID | Area | Severity | Observation | Expected | Actual | Evidence | Status |
|---|---|---|---|---|---|---|---|
| AUD-001 | Vercel runtime config | High | `DATABASE_URL` missing in Vercel runtime caused Prisma initialization failure and `500` on scan finalization. | `/api/scans` should persist scan and return `200/201`. | Route returned `{"ok":false,"error":"Failed to finalize scan"}` with Prisma `P1012` in runtime log. | User-provided Vercel log: `Environment variable not found: DATABASE_URL` at `schema.prisma:7`. | Resolved after env wiring |
| AUD-002 | Build pipeline reliability | High | Build originally relied on `next build` only, which can produce stale Prisma client on Vercel dependency cache. | Prisma client and schema migration should run during build/deploy. | Prisma warning observed in logs about generation not triggered on Vercel. | User-provided build log warning + subsequent script update in repo. | Resolved |
| AUD-003 | Production DB backend fit | High | SQLite/file-based assumption worked on self-hosted server but failed on Vercel serverless model. | Same API behavior across environments. | Self-hosted domain returned `201`; Vercel returned `500` during misconfigured phase. | Historical API outputs in this thread (`nip.io` success vs Vercel failure). | Resolved by moving to Postgres/Supabase setup |
| AUD-004 | Camera access constraints | Medium | Camera blocked on non-secure origin/public IP HTTP; behavior looked like an app issue during testing. | Camera should request permission when page is considered secure. | Browser blocked camera on HTTP IP URL; worked with HTTPS domain. | User report + browser privacy prompt behavior discussed in thread. | Known platform constraint |
| AUD-005 | Credential handling hygiene | High | Database password appeared in troubleshooting chat/context while debugging deployment. | Secrets should remain private/rotated if exposed. | Password string was shared in plaintext during support steps. | Chat history from deployment troubleshooting. | Action required |

## 4. Confirmed Working Behaviors (As of 2026-04-19)

- `POST /api/scans` returns `201` on:
  - `https://dental-scan.vercel.app/api/scans`
  - `https://dental-scan.nip.io/api/scans`
- Completed scan path creates a DB `Scan` record and a simulated notification payload in response.
- Notification dispatch remains simulated by design (no Twilio/Telnyx integration).

## 5. Remaining Risks / Limitations

- No auth/authorization boundary for API routes (challenge scope).
- Camera behavior still depends on secure-context browser rules; this is expected but should be clearly communicated in UX/docs.
- Operational risk remains if Vercel env vars are missing in Preview/Production parity.

## 6. Follow-Up Actions

1. Rotate exposed Supabase/Postgres password immediately, then update all env targets.
2. Verify `DATABASE_URL` exists for both Vercel `Production` and `Preview`.
3. Keep `prisma generate` + `prisma migrate deploy` in build path.
4. Add one startup/runtime health check endpoint to confirm DB connectivity post-deploy.
5. Keep secure-origin requirement visible in onboarding/setup text for camera features.

## 7. Sign-Off

- Audit complete: Yes (for scope above)
- Basis: real chat/deployment evidence only (no fabricated product findings)
