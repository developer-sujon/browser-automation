import { test } from "@playwright/test";
import { dataGenerator, random, sleep } from "../src/utils/data-generator";

test.setTimeout(30 * 60 * 1000);

test("MD Rasel Mahmud - 100 Submissions", async ({ page }) => {
  let successCount = 0;
  let failCount = 0;

  console.log("🤖 Starting 100 submissions for mdraselmahmud.com\n");

  for (let i = 1; i <= 100; i++) {
    try {
      const person = dataGenerator.getPerson();

      console.log(`\n[${i}/100] Submitting...`);
      console.log(`${person.fullName}`);
      console.log(`${person.email}`);
      console.log(`${person.phone}`);

      // Navigate
      await page.goto("https://mdraselmahmud.com/contact");
      await sleep(random.delay(2000, 3000));

      // Fill form with typing animation
      await page.click('input[name="firstName"]');
      for (const char of person.firstName) {
        await page.type('input[name="firstName"]', char, { delay: 0 });
        await sleep(random.delay(50, 120));
      }
      await sleep(500);

      await page.click('input[name="lastName"]');
      for (const char of person.lastName) {
        await page.type('input[name="lastName"]', char, { delay: 0 });
        await sleep(random.delay(50, 120));
      }
      await sleep(500);

      await page.click('input[name="phone"]');
      for (const char of person.phone) {
        await page.type('input[name="phone"]', char, { delay: 0 });
        await sleep(random.delay(40, 100));
      }
      await sleep(500);

      await page.click('input[name="email"]');
      for (const char of person.email) {
        await page.type('input[name="email"]', char, { delay: 0 });
        await sleep(random.delay(40, 100));
      }
      await sleep(600);

      await page.click('textarea[name="description"]');
      await sleep(random.delay(1000, 2000));
      for (const char of person.message) {
        await page.type('textarea[name="description"]', char, { delay: 0 });
        await sleep(random.delay(50, 110));
      }
      await sleep(random.delay(2000, 3000));

      // Listen for backend response
      console.log("📡 Waiting for backend response...");

      const responsePromise = page.waitForResponse(
        (response) => {
          // Check if it's the contact API endpoint
          return response.url().includes("/contact");
        },
        { timeout: 15000 }
      );

      // Submit
      await page.click('button[type="submit"]');

      // Wait for response
      try {
        const response = await responsePromise;
        const status = response.status();

        console.log(`📊 Response Status: ${status}`);

        if (status === 200) {
          // Parse JSON response
          const data = await response.json();

          console.log(`Response:`, JSON.stringify(data, null, 2));

          // Check success conditions
          if (data.message && data.message.includes("Email Send")) {
            successCount++;
            console.log(`[${i}/100] SUCCESS!`);
            console.log(`Message: ${data.message}`);
            console.log(
              `Accepted: ${data.data?.accepted?.join(", ") || "N/A"}`
            );
            console.log(`Rejected: ${data.data?.rejected?.length || 0}`);
            console.log(`From IP: ${data.ipAddress || "N/A"}`);

            // Screenshot every 2 successes
            if (successCount % 2 === 0) {
              await page.screenshot({
                path: `screenshots/mdrasel-success-${successCount}.png`,
                fullPage: true,
              });
              console.log(`Screenshot saved`);
            }
          } else {
            // Response 200 but no success message
            failCount++;
            console.log(`[${i}/100] FAILED - Unexpected response`);
            console.log(`Response:`, data);

            await page.screenshot({
              path: `screenshots/mdrasel-failed-${i}.png`,
            });
          }
        } else {
          // Non-200 status
          failCount++;
          console.log(`[${i}/100] FAILED - Status ${status}`);

          await page.screenshot({
            path: `screenshots/mdrasel-error-${i}.png`,
          });
        }
      } catch (error: any) {
        failCount++;
        console.log(`[${i}/100] FAILED - ${error.message}`);

        await page.screenshot({
          path: `screenshots/mdrasel-timeout-${i}.png`,
        });
      }

      // Delay between submissions
      await sleep(random.delay(2000, 4000));
    } catch (error: any) {
      failCount++;
      console.error(`[${i}/100] Exception: ${error.message}`);

      try {
        await page.screenshot({
          path: `screenshots/mdrasel-exception-${i}.png`,
        });
      } catch (e) {
        // Ignore screenshot error
      }
    }

    // Progress report every 10
    if (i % 10 === 0) {
      const successRate = ((successCount / i) * 100).toFixed(2);
      console.log("\n" + "=".repeat(70));
      console.log(`PROGRESS REPORT - ${i}/100`);
      console.log("=".repeat(70));
      console.log(`Successful: ${successCount} (${successRate}%)`);
      console.log(`Failed: ${failCount}`);
      console.log("=".repeat(70) + "\n");

      // Longer break every 10
      if (i < 100) {
        const breakTime = random.delay(5000, 10000);
        console.log(`☕ Taking ${(breakTime / 1000).toFixed(1)}s break...\n`);
        await sleep(breakTime);
      }
    }
  }

  // Final summary
  const finalRate = ((successCount / 100) * 100).toFixed(2);
  console.log("\n" + "=".repeat(70));
  console.log("ALL SUBMISSIONS COMPLETED!");
  console.log("=".repeat(70));
  console.log(`Successful: ${successCount}/100 (${finalRate}%)`);
  console.log(`Failed: ${failCount}/100`);
  console.log("=".repeat(70) + "\n");
});
