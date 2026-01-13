import { Logger } from "@/common/logger";
import { env } from "@/config/env";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { FilesRepository } from "../repositories/files.repository";
import type { FileItem, SubmissionResult } from "../types";

/**
 * BrowserService handles:
 * - Launching browser
 * - Anti-detection setup
 * - Navigating, filling, submitting forms
 * - Capturing success/failure results
 */
export class BrowserService {
  private logger: Logger;

  constructor(private filesRepo: FilesRepository) {
    const taskIndex =
      process.env.JOB_COMPLETION_INDEX || process.env.TASK_INDEX || "NA";
    this.logger = new Logger(`BrowserService[${taskIndex}]`);
  }

  /**
   * Executes the automation workflow for a single form/job
   */
  async execute(item: FileItem): Promise<void> {
    if (!item?.id) {
      this.logger.error(`Skipping item without ID: ${item?.email}`);
      return;
    }

    const itemId = item.id;
    let attempt = 1;

    while (true) {
      let browser: Browser | null = null;
      let context: BrowserContext | null = null;
      let page: Page | null = null;

      try {
        this.logger.info(`[Attempt ${attempt}] Processing ${item.email}...`);

        // Launch browser
        browser = await this.launchBrowser();

        // Setup browser context with anti-detect
        context = await this.setupContext(browser);
        page = await context.newPage();

        // Navigate to target URL
        await this.navigate(page, env.TARGET_URL);

        // Fill the form
        await this.fillForm(page, item);

        // Submit form and check success
        const result = await this.submitAndVerify(page, item);

        if (result.success) {
          this.logger.info(`SUCCESS for ${item.email}`);
          // Save result metadata directly to DB
          await this.filesRepo.updateStatus(itemId, "success", attempt, result);
          break; // exit loop
        } else {
          this.logger.warn(`Attempt ${attempt} uncertain. Retrying...`);
          throw new Error(result.message); // Trigger retry logic
        }
      } catch (error: any) {
        this.logger.error(
          `Error (Attempt ${attempt}) for ${item.email}: ${error.message}`
        );
        const screenshotPath = await this.captureError(page, item.email);

        // Update status to processing (since we are retrying) with detailed error metadata
        await this.filesRepo.updateStatus(itemId, "processing", attempt, {
          success: false,
          status: 500,
          message: error.message,
          error_stack: error.stack,
          screenshot: screenshotPath,
          timestamp: new Date().toISOString(),
        });
      } finally {
        await this.cleanup(browser, context, page);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempt++;
    }
  }

  /**
   * Launch Chromium without proxy
   */
  private async launchBrowser(): Promise<Browser> {
    this.logger.info("Launching browser...");
    return await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Recommended for Docker/K8s
        "--disable-gpu",
      ],
    });
  }

  /**
   * Setup browser context with viewport, headers, anti-detection
   */
  private async setupContext(browser: Browser): Promise<BrowserContext> {
    const proxyConfig =
      env.PROXY_SERVER && env.PROXY_USERNAME && env.PROXY_PASSWORD
        ? {
            server: env.PROXY_SERVER,
            username: env.PROXY_USERNAME,
            password: env.PROXY_PASSWORD,
          }
        : undefined;

    if (proxyConfig) {
      this.logger.info("Using proxy configuration");
    }

    const context = await browser.newContext({
      // proxy: proxyConfig,
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "Asia/Dhaka",
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    // Anti-detection scripts
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      (globalThis as any).chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
      };
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    return context;
  }

  /**
   * Navigate with retry for empty responses
   */
  private async navigate(page: Page, url: string) {
    this.logger.info(`Navigating to ${url}...`);
    try {
      await page.goto(url, { timeout: 120_000, waitUntil: "domcontentloaded" });
      await page
        .waitForLoadState("networkidle", { timeout: 30_000 })
        .catch(() => {});
    } catch (e: any) {
      if (e.message.includes("ERR_EMPTY_RESPONSE")) {
        await page.waitForTimeout(5000);
      }
      throw e;
    }
  }

  /**
   * Fill form fields for a FileItem
   */
  private async fillForm(page: Page, item: FileItem) {
    this.logger.info("Filling form...");

    const formExists = await page
      .waitForSelector('input[name="name"]', { timeout: 30_000 })
      .catch(() => false);
    if (!formExists) throw new Error("Form not found");

    await page.evaluate(() => (globalThis as any).scrollTo(0, 300));

    // Fill all fields with small delays
    await this.fillField(
      page,
      'input[name="name"]',
      `${item.first_name} ${item.last_name}`
    );
    await this.fillField(page, 'input[name="email"]', item.email);
    await this.fillField(page, 'input[name="phone"]', item.phone);
    await this.fillField(page, 'textarea[name="message"]', item.message);

    this.logger.info("Form filled");
  }

  private async fillField(page: Page, selector: string, value: string) {
    await page.click(selector);
    await page.waitForTimeout(200);
    await page.fill(selector, value);
    await page.waitForTimeout(500);
  }

  /**
   * Submit form, take screenshots, check success
   */
  private async submitAndVerify(
    page: Page,
    item: FileItem
  ): Promise<SubmissionResult> {
    const submitBtn = 'button[type="submit"]';

    await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      btn?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, submitBtn);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `logs/pre-submit-${item.email}-${Date.now()}.png`,
    });

    this.logger.info("Submitting...");
    await page.click(submitBtn);
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: `logs/post-submit-${item.email}-${Date.now()}.png`,
      fullPage: true,
    });

    return this.checkSuccess(page);
  }

  /**
   * Detect success by page content or green indicator
   */
  private async checkSuccess(page: Page): Promise<SubmissionResult> {
    const content = (await page.content()).toLowerCase();

    const hasGreenText = await page
      .waitForSelector(".text-green-700", { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    const keywords = [
      "success",
      "thank you",
      "thanks",
      "submitted",
      "received",
      "message sent",
    ];
    const found = keywords.find((w) => content.includes(w));

    const success = hasGreenText || !!found;
    const message = success
      ? `Success: ${hasGreenText ? "Green indicator" : `Found '${found}'`}`
      : "Uncertain: No success indicator";

    return {
      success,
      status: success ? 200 : 500,
      message: `${message} | Title: ${await page.title()} | URL: ${page.url()}`,
    };
  }

  /**
   * Capture screenshot on error
   */
  private async captureError(
    page: Page | null,
    email: string
  ): Promise<string | null> {
    if (!page) return null;
    try {
      const path = `logs/error-${email}-${Date.now()}.png`;
      await page.screenshot({
        path,
        fullPage: true,
      });
      return path;
    } catch {
      return null;
    }
  }

  /**
   * Close page, context, browser safely
   */
  private async cleanup(
    browser: Browser | null,
    context: BrowserContext | null,
    page: Page | null
  ) {
    try {
      if (page) await page.close();
    } catch (e) {
      this.logger.error(`Page close error: ${e}`);
    }
    try {
      if (context) await context.close();
    } catch (e) {
      this.logger.error(`Context close error: ${e}`);
    }
    try {
      if (browser) await browser.close();
    } catch (e) {
      this.logger.error(`Browser close error: ${e}`);
    }
  }
}
