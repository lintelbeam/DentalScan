# 🚀 Candidate Setup Guide

Welcome! This guide will help you get your local development environment ready for the DentalScan AI Engineering Challenge.

## Quick Start

Follow these steps to get the project running in under 2 minutes:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Initialize Database**:
    This project uses **SQLite** for ease of setup. Run the following command to create your local database and sync the schema:
    ```bash
    npx prisma db push
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

4.  **Open the App**:
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

## Docker HTTPS (Required For Camera On Public URL)

If you want camera access from a public URL, you must serve the app over HTTPS with a real domain.

1.  **Create HTTPS env file from repo root**:
    ```bash
    cp .env.https.example .env.https
    ```
    Then set `APP_DOMAIN` to your DNS name (for example `scan.your-domain.com`).

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

- Camera APIs are blocked on plain HTTP public IP URLs like `http://207.231.108.58:3000`.
- Use a valid HTTPS domain URL instead.

## Project Notes

-   **Database**: The database is located at `prisma/dev.db`. You can explore it using `npx prisma studio`.
-   **Framework**: Built with Next.js 14 (App Router) and Tailwind CSS.
-   **Structure**:
    -   `src/components/ScanningFlow.tsx`: The core capture component (Task 1).
    -   `src/app/api/notify/route.ts`: Notification logic (Task 2).
    -   `src/app/api/messaging/route.ts`: Messaging logic (Task 3).

## 🦷 Good Luck!
We're excited to see your implementation. If you have any questions, feel free to reach out.
