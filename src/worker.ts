import { Logger } from "@/common/logger";
import sql from "@/database/client";
import { FilesRepository } from "@/modules/automation/repositories/files.repository";
import { BrowserService } from "@/modules/automation/services/browser.service";

const logger = new Logger("Worker");

async function main() {
  try {
    logger.info("Worker started. Checking for pending tasks...");

    const filesRepo = new FilesRepository();
    const browserService = new BrowserService(filesRepo);

    // Fetch a large batch of pending items (e.g., 50 at a time)
    // This reduces DB calls significantly
    const BATCH_SIZE = 100;
    const items = await filesRepo.findPending(BATCH_SIZE);

    if (items.length === 0) {
      logger.info("No pending tasks found. Exiting.");
      process.exit(0);
    }

    logger.info(`Picked up batch of ${items.length} tasks.`);

    // Process tasks sequentially in a loop
    for (const item of items) {
      if (!item) continue;

      logger.info(`Processing task: ${item.email} (ID: ${item.id})`);
      try {
        await browserService.execute(item);
        logger.info(`Task completed: ${item.email}`);
      } catch (err) {
        logger.error(`Task failed: ${item.email} - ${err}`);
        // Continue to next item in the batch
      }
    }

    logger.info("Batch processing completed. Exiting.");
    process.exit(0);
  } catch (error) {
    logger.error(`Worker failed: ${error}`);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
