import { DurableObject } from "cloudflare:workers";
import { FormBrowser } from "./BrowserHandler";
import { GET_CONFIG } from "./deployment-config";
import { JobData, JobItem } from "./types";

/**
 * Interface for Job Management.
 * Follows the Interface Segregation Principle (ISP).
 */
interface IJobManager {
  startJob(data: any): Promise<Response>;
  checkStatus(): Promise<Response>;
}

/**
 * JobManager Durable Object.
 * Orchestrates the job processing and delegates browser tasks to FormBrowser.
 */
export class JobManager extends DurableObject implements IJobManager {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/start") {
      let body: JobData;
      try {
        body = await request.json<JobData>();
      } catch (e) {
        return new Response("Invalid JSON body", { status: 400 });
      }
      return this.startJob(body);
    }

    if (url.pathname === "/status") {
      return this.checkStatus();
    }

    return new Response("Not found", { status: 404 });
  }

  async startJob(body: JobData): Promise<Response> {
    const data = body.data || [];

    // Recursive Sharding Logic (1 DO per 1 Form)
    const RECURSIVE_THRESHOLD = 1;
    if (data.length > RECURSIVE_THRESHOLD) {
      return this.delegateShards(data, body);
    }

    // Initialize Local Job
    const jobItems: JobItem[] = data.map((person) => {
      // Validate Person Data
      if (!person || !person.email) {
        console.error(
          "[JobManager] Invalid person data found:",
          JSON.stringify(person)
        );
        // Fallback to prevent UI crashes and indicate error
        return {
          id: crypto.randomUUID(),
          person: person || {
            firstName: "Error",
            lastName: "Data",
            email: "error@missing.data",
            phone: "",
            message: "Data was lost during processing",
          },
          status: "failed", // Mark as failed immediately if data is missing
          attempts: 11, // Skip retries
          lastError: "Invalid or missing person data",
        };
      }

      return {
        id: crypto.randomUUID(),
        person,
        status: "pending",
        attempts: 0,
        workerId: this.state.id.toString(), // Capture DO ID
      };
    });

    await this.state.storage.put("job_data", body);
    await this.state.storage.put("job_items", jobItems);
    await this.state.storage.put("status", "processing");

    // Trigger Alarm immediately (no jitter) to start processing ASAP
    console.log(
      `[JobManager-WorkerRole] I am a Worker. Processing ${data.length} items directly.`
    );
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm) {
      this.state.storage.setAlarm(Date.now() + 100);
    }

    return new Response(`Job started for ${data.length} items.`);
  }

  async checkStatus(): Promise<Response> {
    const status = await this.state.storage.get("status");

    // Check for Shards (Recursive Aggregation)
    const shards = await this.state.storage.get<string[]>("shards");
    if (shards && shards.length > 0) {
      const id1 = this.env.JOB_MANAGER.idFromString(shards[0]);
      const id2 = this.env.JOB_MANAGER.idFromString(shards[1]);

      const stub1 = this.env.JOB_MANAGER.get(id1);
      const stub2 = this.env.JOB_MANAGER.get(id2);

      const [res1, res2] = await Promise.all([
        stub1.fetch("http://do/status"),
        stub2.fetch("http://do/status"),
      ]);

      if (!res1.ok || !res2.ok) {
        return new Response("Error fetching shard status", { status: 500 });
      }

      const data1 = await res1.json<any>();
      const data2 = await res2.json<any>();

      // Merge Results
      const mergedItems = [...(data1.items || []), ...(data2.items || [])];
      const mergedStats = {
        success: (data1.stats?.success || 0) + (data2.stats?.success || 0),
        failed: (data1.stats?.failed || 0) + (data2.stats?.failed || 0),
        pending: (data1.stats?.pending || 0) + (data2.stats?.pending || 0),
        total: (data1.stats?.total || 0) + (data2.stats?.total || 0),
        workerCount:
          (data1.stats?.workerCount || 0) + (data2.stats?.workerCount || 0),
      };

      // Determine overall status
      let overallStatus = "processing";
      if (data1.status === "completed" && data2.status === "completed") {
        overallStatus = "completed";
      }

      return new Response(
        JSON.stringify(
          { status: overallStatus, stats: mergedStats, items: mergedItems },
          null,
          2
        )
      );
    }

    // Local Status
    const jobItems =
      (await this.state.storage.get<JobItem[]>("job_items")) || [];

    const stats = {
      success: jobItems.filter((i) => i.status === "success").length,
      failed: jobItems.filter((i) => i.status === "failed").length,
      pending: jobItems.filter((i) => i.status === "pending").length,
      total: jobItems.length,
    };

    return new Response(
      JSON.stringify({ status, stats, items: jobItems }, null, 2)
    );
  }

  private async delegateShards(data: any[], body: JobData): Promise<Response> {
    console.log(`[JobManager] Splitting ${data.length} items...`);
    const mid = Math.floor(data.length / 2);
    const left = data.slice(0, mid);
    const right = data.slice(mid);

    console.log(
      `[JobManager] Delegating: Left=${left.length}, Right=${right.length}`
    );

    const id1 = this.env.JOB_MANAGER.newUniqueId();
    const id2 = this.env.JOB_MANAGER.newUniqueId();

    // Store shard IDs for status aggregation
    await this.state.storage.put("shards", [id1.toString(), id2.toString()]);

    const stub1 = this.env.JOB_MANAGER.get(id1);
    const stub2 = this.env.JOB_MANAGER.get(id2);

    const config = {
      targetUrl: body.targetUrl,
    };

    this.state.waitUntil(
      Promise.all([
        stub1.fetch("http://do/start", {
          method: "POST",
          body: JSON.stringify({ ...config, data: left }),
        }),
        stub2.fetch("http://do/start", {
          method: "POST",
          body: JSON.stringify({ ...config, data: right }),
        }),
      ])
    );

    return new Response(
      `Delegated to shards: ${id1.toString()}, ${id2.toString()}`
    );
  }

  async alarm() {
    const jobData = await this.state.storage.get<JobData>("job_data");
    const targetUrl = jobData?.targetUrl || "https://yupsis.com/contact";
    let jobItems = (await this.state.storage.get<JobItem[]>("job_items")) || [];

    const pendingItems = jobItems.filter((item) => item.status !== "success");

    if (pendingItems.length === 0) {
      await this.state.storage.put("status", "completed");
      return;
    }

    // Process Batch
    const { BATCH_SIZE, CONCURRENCY_LIMIT } = GET_CONFIG();
    const batch = pendingItems.slice(0, BATCH_SIZE);

    // Track if we hit a rate limit in this batch
    let rateLimitHit = false;

    // Helper for simple concurrency control
    const executeWithConcurrency = async (
      items: JobItem[],
      concurrency: number,
      fn: (item: JobItem) => Promise<void>
    ) => {
      // If concurrency is high (Paid Tier Burst Mode), just run all promises at once
      if (concurrency > 100) {
        return Promise.all(items.map(fn));
      }

      const results: Promise<void>[] = [];
      const executing: Promise<void>[] = [];

      for (const item of items) {
        const p = fn(item).then(() => {
          executing.splice(executing.indexOf(p), 1);
        });
        results.push(p);
        executing.push(p);
        if (executing.length >= concurrency) {
          await Promise.race(executing);
        }
      }
      return Promise.all(results);
    };

    await executeWithConcurrency(batch, CONCURRENCY_LIMIT, async (item) => {
      // Increased max retries for massive scale resilience
      if (item.attempts > 50) {
        item.status = "failed";
        item.lastError = "Max retries exceeded (50)";
        return;
      }

      item.attempts++;

      console.log(
        `[JobManager-WorkerRole] Processing ${item.person.email} (Attempt ${item.attempts})...`
      );

      // Instantiate Browser per request to avoid shared state conflicts
      const browser = new FormBrowser(this.env);

      const result = await browser.execute(item.person, targetUrl);

      if (result.success) {
        item.status = "success";
      } else {
        // Handle Rate Limiting (429) specially
        if (
          result.message &&
          (result.message.includes("429") ||
            result.message.includes("Rate limit"))
        ) {
          console.warn(
            `[JobManager] Rate limit hit for ${item.person.email}. Backing off.`
          );
          item.status = "pending"; // Keep pending

          // Decrement attempts so we don't count this as a failure attempt (since it's a platform limit)
          item.attempts--;

          rateLimitHit = true;
        } else {
          item.status = "failed";
          item.lastError = result.message;
        }
      }
    });

    // Update Storage
    const updatedJobItems = jobItems.map((original) => {
      const updated = batch.find((b) => b.id === original.id);
      return updated || original;
    });

    await this.state.storage.put("job_items", updatedJobItems);

    // Only reschedule if there are items that are not successful AND have not exceeded max retries
    const hasPendingWork = updatedJobItems.some(
      (i) => i.status !== "success" && i.attempts <= 50
    );

    if (hasPendingWork) {
      // Calculate delay
      let delay = 100; // Default fast retry for standard pending items
      if (rateLimitHit) {
        // Super aggressive retry for rate limits (100ms - 500ms)
        delay = 100 + Math.random() * 400;
        console.log(
          `[JobManager] Rate limit detected. Fast retry in ${Math.round(
            delay
          )}ms`
        );
      }

      await this.state.storage.setAlarm(Date.now() + delay);
    } else {
      await this.state.storage.put("status", "completed");
    }
  }
}
