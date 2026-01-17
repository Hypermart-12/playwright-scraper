import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const url = process.env.TARGET_URL;
  if (!url) process.exit(1);

  // Launch with a common User-Agent to blend in
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  // STEALTH: Disable the 'automated' flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  try {
    console.log(`🔍 Navigating to: ${url}`);
    
    // 1. Initial Load
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 2. Wait for a broad container (the body or a known header)
    await page.waitForSelector('body', { timeout: 10000 });
    
    // 3. Force a 5-second wait to allow JavaScript to finish injecting the date
    console.log("⏳ Waiting for Roblox JS to render...");
    await page.waitForTimeout(5000);

    // 4. Extract data using Text Search instead of strict CSS classes
    const data = await page.evaluate(() => {
      const findValueNextTo = (text) => {
        // Find all elements containing the label text
        const elements = Array.from(document.querySelectorAll('div, span, label, p'));
        const label = elements.find(el => el.innerText?.trim() === text);
        return label ? label.nextElementSibling?.innerText?.trim() : "Not Found";
      };

      return {
        bundleName: document.querySelector('h1, .item-name')?.innerText?.trim() || "Unknown Bundle",
        dateCreated: findValueNextTo("Created"),
        dateUpdated: findValueNextTo("Updated"),
        scrapedAt: new Date().toLocaleString()
      };
    });

    console.log("✅ Scrape Result:", data);
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("❌ Scrape failed. Taking error-screenshot.png");
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    
    fs.writeFileSync("data.json", JSON.stringify({ 
      error: "Timeout/Blocked", 
      details: err.message,
      check_screenshot: "Download the artifact from GitHub Actions summary"
    }, null, 2));
  } finally {
    await browser.close();
  }
})();
