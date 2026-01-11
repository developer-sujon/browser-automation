import { env } from "@/config/env";
import { createRouter } from "@/modules/api/routes";
import { FilesRepository } from "@/modules/automation/repositories/files.repository";
import { BrowserService } from "@/modules/automation/services/browser.service";

// Initialize services (Dependency Injection)
const filesRepo = new FilesRepository();
const browserService = new BrowserService(filesRepo);

// Initialize App Router
const app = createRouter(browserService);

export default {
  port: parseInt(env.PORT),
  fetch: app.fetch,
};
