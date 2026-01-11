import { globalErrorHandler } from "@/common/middleware/error-handler";
import { env } from "@/config/env";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { FilesRepository } from "../automation/repositories/files.repository";
import type { BrowserService } from "../automation/services/browser.service";
import { FileItemSchema } from "../automation/types";

export const createRouter = (browserService: BrowserService) => {
  const app = new Hono();
  const filesRepo = new FilesRepository();

  app.post("/api/batch-run", bearerAuth({ token: env.API_KEY }), async (c) => {
    const limit = 1000;
    const items = await filesRepo.findPending(limit);

    if (items.length === 0) {
      return c.json({ message: "No pending items found" });
    }

    // 2. Loop and trigger /api/run for each item
    // Fire and forget - triggering requests without waiting for them to complete
    items.forEach((item) => {
      const baseUrl = env.APP_URL;
      const apiUrl = `${baseUrl}/api/run`;

      fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      }).catch((err) => {
        console.error(`Failed to trigger job for ${item.id}:`, err);
      });
    });

    return c.json({
      message: `Triggered ${items.length} jobs`,
    });
  });

  app.post("/api/run", bearerAuth({ token: env.API_KEY }), async (c) => {
    const body = await c.req.json();

    const validation = FileItemSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: "Invalid request body",
          details: validation.error.format(),
        },
        400
      );
    }

    const item = validation.data;

    void browserService.execute(item);
    return c.json({ message: "Job processing started in background" });
  });

  // Global Error Handler
  app.onError(globalErrorHandler);

  return app;
};
