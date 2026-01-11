import puppeteer from "@cloudflare/puppeteer";
import { Person, SubmissionResult } from "./types";

/**
 * Abstract Base Class for Browser Operations.
 * Follows the Single Responsibility Principle (SRP) by handling only browser lifecycle.
 */
export abstract class BaseBrowser {
  protected env: Env;
  protected browser: any;
  protected readonly TIMEOUT = 60000; // 1 Minute (Fail fast to free up slots)

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Initializes the browser instance.
   */
  protected async initBrowser() {
    console.log(
      "[BaseBrowser] Launching new high-performance browser instance..."
    );
    this.browser = await puppeteer.launch(this.env.MYBROWSER, {
      keep_alive: 60000,
    });
  }

  /**
   * Safely closes the browser instance.
   */
  protected async closeBrowser() {
    if (this.browser) {
      try {
        console.log("[BaseBrowser] Closing browser...");
        await this.browser.close();
      } catch (e) {
        console.error("[BaseBrowser] Error closing browser:", e);
      }
    }
  }

  /**
   * Executes an operation with retry logic.
   * @param operation The async operation to retry
   * @param attempts Number of attempts (default: 3)
   * @param delayMs Delay between attempts in ms (default: 1000)
   * @param name Name of the operation for logging
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = 3,
    delayMs: number = 1000,
    name: string = "Operation"
  ): Promise<T> {
    let lastError: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        if (i > 1)
          console.log(`[BaseBrowser] Retry ${i}/${attempts} for ${name}...`);
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[BaseBrowser] ${name} failed (Attempt ${i}/${attempts}): ${error.message}`
        );
        if (i < attempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }

  /**
   * Abstract method that concrete classes must implement.
   */
  abstract execute(
    data: any,
    targetUrl: string,
    config?: any
  ): Promise<SubmissionResult>;
}

/**
 * Concrete implementation for Form Submission.
 * Encapsulates the specific logic for filling and submitting forms.
 */
export class FormBrowser extends BaseBrowser {
  async execute(person: Person, targetUrl: string): Promise<SubmissionResult> {
    try {
      await this.initBrowser();
      const page = await this.browser.newPage();

      console.log(
        `[FormBrowser] Navigating to ${targetUrl} for ${person.email}`
      );

      // Retry Navigation
      await this.withRetry(
        () =>
          page.goto(targetUrl, {
            waitUntil: "domcontentloaded", // Faster than networkidle0
            timeout: this.TIMEOUT,
          }),
        3,
        1000,
        "Navigate to Target URL"
      );

      await this.fillForm(page, person);

      // Retry Submission
      await this.withRetry(() => this.submit(page), 3, 2000, "Submit Form");

      const result = await this.verifySuccess(page);

      return result;
    } catch (error: any) {
      const isRateLimit =
        error.message &&
        (error.message.includes("429") || error.message.includes("Rate limit"));

      if (isRateLimit) {
        console.warn(
          `[FormBrowser] Rate limit (429) for ${person.email}. JobManager will retry.`
        );
      } else {
        console.error(
          `[FormBrowser] Execution failed for ${person.email}:`,
          error
        );
      }

      return {
        success: false,
        status: isRateLimit ? 429 : 500,
        message:
          error instanceof Error ? error.message : "Unknown Browser Error",
      };
    } finally {
      await this.closeBrowser();
    }
  }

  private async fillForm(page: any, person: Person) {
    console.log("[FormBrowser] Filling form fields...");
    // Wait for the form to be ready
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });

    await page.type(
      'input[name="name"]',
      `${person.firstName} ${person.lastName}`
    );
    await page.type('input[name="email"]', person.email);
    await page.type('input[name="phone"]', person.phone);
    await page.type('textarea[name="message"]', person.message);
  }

  private async submit(page: any) {
    console.log("[FormBrowser] Clicking submit...");
    await page.click('button[type="submit"]');
  }

  private async verifySuccess(page: any): Promise<SubmissionResult> {
    let successMessage = "Success";
    try {
      await page.waitForSelector(".text-green-700", { timeout: 5000 });
    } catch {
      console.warn(
        "[FormBrowser] Success indicator not found, checking title..."
      );
      successMessage = "Submitted (Selector not found)";
    }
    const title = await page.title();

    return {
      success: true,
      status: 200,
      message: `${successMessage}. Page Title: ${title}`,
    };
  }
}
