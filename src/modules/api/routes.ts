import { globalErrorHandler } from "@/common/middleware/error-handler";
import { Hono } from "hono";
import { FilesRepository } from "../automation/repositories/files.repository";
import type { BrowserService } from "../automation/services/browser.service";

export const createRouter = (browserService: BrowserService) => {
  const app = new Hono();
  const filesRepo = new FilesRepository();

  app.post("/api/trigger", async (c) => {
    const limit = 1;
    const items = await filesRepo.findPending(limit);

    if (items.length === 0) {
      return c.json({ message: "No pending items found" });
    }

    // Process each form
    for (const item of items) {
      await browserService.execute(item);
    }

    return c.json({
      message: `Triggered ${items.length} jobs`,
    });
  });

  // Health check
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // Global Error Handler
  app.onError(globalErrorHandler);

  return app;
};
