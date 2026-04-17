# QA Checklist

## 1. Camera Flow (Manual)

- Open app on HTTPS origin (or `localhost`) and verify camera permission prompt appears.
- Deny permission and verify:
  - Permission error message is shown.
  - `Retry Camera` is visible and clickable.
- Allow permission and verify:
  - Live camera feed appears.
  - Quality indicator transitions between red/amber/green based on movement and framing.
  - Guidance text updates when moving off-center, too far, or shaky.
- Capture all 5 steps and verify:
  - Step label increments correctly.
  - Thumbnail strip updates with each captured image.
  - Capture button is disabled when quality is poor.
- After 5th capture verify finalization state:
  - Spinner/progress appears.
  - Redirect to `/results/[scanId]` occurs.

## 2. Messaging Flow

- On results page, verify message history loads (or empty state appears).
- Send a valid patient message and verify:
  - Optimistic message appears immediately.
  - Message persists after server response.
  - Assistant/clinic response appears when configured.
- Trigger send failure (e.g., stop API/server) and verify:
  - Inline error is shown.
  - Retry action is available and works after recovery.
- Keyboard behavior:
  - `Enter` sends.
  - `Shift+Enter` inserts newline.
  - `Ctrl+Enter` / `Cmd+Enter` sends.

## 3. Notification Flow

- Call scan finalization (`POST /api/scans`) with `status=completed` and images.
- Verify notification record is created for clinic user.
- Re-submit same completed scan and verify duplicate notification is not created.
- Call `POST /api/notify` with:
  - Missing `scanId` => `400`.
  - `status=pending` => skipped response.
  - Unknown `scanId` + `completed` => `404`.

## 4. Local Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
