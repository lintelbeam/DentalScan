# Setup Guide

Follow these steps to get the project running:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    ```bash
    cp .env.example .env
    ```
    Set `DATABASE_URL` to your Postgres connection string.

3.  **Initialize Database**:
    This project uses Prisma migrations. Run:
    ```bash
    npx prisma migrate deploy
    ```

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open the App**:
    Navigate to [http://localhost:3000](http://localhost:3000) to see the Scanning Flow in action.

## Docker Quick Start

If you prefer running everything in Docker from the repository root:

1.  **Build and Start**:
    ```bash
    docker compose up --build
    ```

2.  **Open the App**:
    Navigate to [http://localhost:3000](http://localhost:3000).

3.  **Stop Containers**:
    ```bash
    docker compose down
    ```

This compose setup includes a Postgres container and runs `prisma migrate deploy` before starting Next.js.

## Docker HTTPS (Required For Camera On Public URL)

If you want camera access from a public URL, you must serve the app over HTTPS with a real domain.

1.  **Create HTTPS env file from repo root**:
    ```bash
    cp .env.https.example .env.https
    ```
    Then set:
    - `APP_DOMAIN` to your DNS name (for example `scan.your-domain.com`)
    - `ANTHROPIC_API_KEY` for AI auto-replies in messaging
    - Optional `ANTHROPIC_MODEL` (default is `claude-3-haiku-20240307`)

2.  **Point DNS**:
    Create an `A` record for `APP_DOMAIN` to your server IP.

3.  **Start app + TLS proxy**:
    ```bash
    docker compose --env-file .env.https -f docker-compose.yml -f docker-compose.https.yml up --build -d
    ```

4.  **Open the app**:
    Navigate to `https://<APP_DOMAIN>`.

5.  **Stop HTTPS stack**:
    ```bash
    docker compose --env-file .env.https -f docker-compose.yml -f docker-compose.https.yml down
    ```

### Important Notes

- Camera APIs are blocked on plain HTTP public IP URLs like `http://localhost:3000`.
- Use a valid HTTPS domain URL instead.

## Project Notes

-   **Database**: Uses Postgres via `DATABASE_URL`. You can inspect data with `npx prisma studio`.
-   **Framework**: Built with Next.js 14 (App Router) and Tailwind CSS.
-   **Structure**:
    -   `src/components/ScanningFlow.tsx`: The core capture component (Task 1).
    -   `src/app/api/notify/route.ts`: Notification logic (Task 2).
    -   `src/app/api/messaging/route.ts`: Messaging logic (Task 3).

## Vercel Deployment Checklist

1.  Set Vercel project root to `starter-kit`.
2.  Add `DATABASE_URL` in Vercel Environment Variables (Production/Preview as needed).
3.  Optional: add `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
4.  Deploy. Build runs:
    - `prisma generate`
    - `prisma migrate deploy` (when `DATABASE_URL` is present)
    - `next build`

If `DATABASE_URL` is missing or invalid, API routes that write to DB (for example `/api/scans`) will fail.
