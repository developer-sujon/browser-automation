# Mass Form Submitter with Cloudflare Workers

A high-performance, scalable form submission system built on Cloudflare Workers, Durable Objects, and Puppeteer.

## Features

-   **Massive Concurrency:** Supports submitting 1000+ forms simultaneously.
-   **Isolation:** Strict 1-to-1 mapping (1 Form = 1 Worker = 1 Browser) for maximum security and reliability.
-   **Browser Providers:**
    -   **Cloudflare Browser Rendering:** Fast, integrated, cost-effective for small batches.
    -   **Bright Data / Browserless:** Unlimited concurrency with IP rotation for massive scale.
-   **Resilience:** Advanced retry logic, rate limit handling (429), and automatic backoff.
-   **Dashboard:** Built-in UI to track job status, worker IDs, and success/failure rates.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Configure Deployment:**
    Edit `src/deployment-config.ts` to set your preferences:
    
    -   **TIER:** `PAID` (Required for high concurrency)
    -   **BROWSER_PROVIDER:** `BRIGHT_DATA` (Recommended for 1k+ burst) or `CLOUDFLARE` (For <50 concurrent)
    
    **Bright Data Setup:**
    If using Bright Data, update the credentials in `src/deployment-config.ts`:
    ```typescript
    BRIGHT_DATA: {
      USER: "YOUR_ZONE_USERNAME",
      PASS: "YOUR_ZONE_PASSWORD",
      HOST: "brd.superproxy.io:9222",
    }
    ```

3.  **Local Development:**
    ```bash
    npx wrangler dev
    ```

4.  **Deploy:**
    ```bash
    npx wrangler deploy
    ```

## Cost Management

### Burst Mode (Unlimited Concurrency)
-   **Config:** `CONCURRENCY_LIMIT: 9999`
-   **Speed:** Instant execution of all forms.
-   **Cost Warning:** Can be expensive if using Cloudflare Browsers ($2000+/mo for 1k daily). Use **Bright Data** for cost efficiency (~$150/mo).

### Smart Queue (Cost Saver)
-   **Config:** `CONCURRENCY_LIMIT: 50`
-   **Speed:** Processes in batches (e.g., 50 at a time).
-   **Cost:** Very low (~$80/mo on Cloudflare).
-   **Trade-off:** Takes slightly longer (e.g., 40 mins for 1k forms).

## Architecture

-   **JobManager (Durable Object):** Orchestrates the jobs, manages state, and handles retries.
-   **BrowserHandler:** Abstracted layer to switch between Cloudflare Puppeteer and Bright Data/Browserless.
-   **Recursive Sharding:** Automatically splits large jobs into smaller shards to avoid memory limits.

## Disclaimer

This tool is intended for legitimate testing and automation purposes. Please respect the target website's Terms of Service and Rate Limits.
