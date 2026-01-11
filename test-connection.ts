import { chromium } from "playwright";

const auth = "brd-customer-hl_1844116d-zone-scraping_browser1:l20ywvbvliqp";
const BROWSER_WS = `wss://${auth}@brd.superproxy.io:9222`;

async function run() {
  console.log("Connecting to browser with Playwright...");
  try {
    const browser = await chromium.connectOverCDP(BROWSER_WS);
    console.log("Connected successfully!");
    console.log("Browser version:", browser.version());
    await browser.close();
    console.log("Browser closed.");
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

run();
