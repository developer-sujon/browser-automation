# EazySlot Automation

This project is a Cloud Run-ready automation service built with **Hono**, **Playwright**, and **Bun**.

## Features

- **Browser Automation**: Uses Playwright to fill and submit forms.
- **Cloud Run Optimized**: Runs in a containerized environment with proper flag handling (`--no-sandbox`).
- **Batch Processing**: Can process multiple jobs concurrently via `/api/batch-run`.
- **Database Integration**: Tracks job status (created, processing, success, failed) in PostgreSQL.
- **Webhook/API**: REST API to trigger jobs.

## Prerequisites

- [Bun](https://bun.sh)
- PostgreSQL Database
- Google Cloud Platform Account (for deployment)

## Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd eazyslot
   ```

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Environment Variables:**
   Copy `.env.example` to `.env` (create if not exists) and set:
   ```env
   DATABASE_URL=postgres://user:pass@host:5432/db
   TARGET_URL=https://target-site.com/contact
   APP_URL=https://your-cloud-run-url.a.run.app (Optional, for loopback)
   ```

## Local Development

1. **Run the server:**

   ```bash
   bun dev
   ```

2. **Trigger a Job:**

   ```bash
   curl -X POST http://localhost:4000/api/run \
     -H "Content-Type: application/json" \
     -d '{
       "first_name": "John",
       "last_name": "Doe",
       "email": "john@example.com",
       "phone": "1234567890",
       "message": "Hello World"
     }'
   ```

3. **Batch Run (Process Pending Jobs):**
   ```bash
   curl -X POST http://localhost:4000/api/batch-run \
   ```

## Deployment (Google Cloud Run)

This project is configured for **Google Cloud Build** and **Cloud Run**.

### Option 1: Continuous Deployment via GitHub

1. Connect your repository to **Google Cloud Build**.
2. Create a Trigger for `push` to `main` branch.
3. Use `cloudbuild.yaml` as the build configuration.
4. Set the following Substitution variables in Cloud Build Trigger:
   - `_REGION`: `asia-south1` (or your preferred region)

### Option 2: Manual Deployment

```bash
gcloud run deploy eazyslot \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

## Database Schema

The system expects a `files` table:

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'created', -- created, processing, success, failed
  attempts INT DEFAULT 0,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```
