import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const url = process.env.TARGET_URL;
  if (!url) {
    console.error("❌ No TARGET_URL provided.");
    process.exit(1);
  }

  // 1. Extract Bundle ID from URL immediately (Regex looks for numbers after /bundles/)
  // Example URL: https://www.roblox.com/bundles/12345/Name-Here
  const bundleIdMatch = url.match(/\/bundles\/(\d+)/);
  const bundleId = bundleIdMatch ? bundleIdMatch[1] : "Unknown";

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
    
    // 2. Initial Load
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 3. Wait for a broad container (body)
    await page.waitForSelector('body', { timeout: 10000 });
    
    // 4. Force a wait to allow Roblox JS to inject date/stats
    console.log("⏳ Waiting for Roblox JS to render...");
    await page.waitForTimeout(5000);

    // 5. Scrape DOM Elements
    const domData = await page.evaluate(() => {
      const findValueNextTo = (text) => {
        // Find all elements containing the label text (flexible search)
        const elements = Array.from(document.querySelectorAll('div, span, label, p'));
        const label = elements.find(el => el.innerText?.trim() === text);
        return label ? label.nextElementSibling?.innerText?.trim() : "Not Found";
      };

      return {
        bundleName: document.querySelector('h1, .item-name')?.innerText?.trim() || "Unknown Bundle",
        dateCreated: findValueNextTo("Created"),
        dateUpdated: findValueNextTo("Updated"),
      };
    });

    // 6. Combine DOM data with URL data
    const finalData = {
      bundleId: bundleId,       // <--- Added Here
      link: url,                // <--- Added Here
      ...domData,
      scrapedAt: new Date().toLocaleString()
    };

    console.log("✅ Scrape Result:", finalData);
    fs.writeFileSync("data.json", JSON.stringify(finalData, null, 2));

  } catch (err) {
    console.error("❌ Scrape failed. Taking error-screenshot.png");
    try {
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    } catch (shotErr) {
        console.error("Could not take screenshot:", shotErr.message);
    }
    
    // Write error data but still include the ID and Link if possible so n8n can identify which one failed
    fs.writeFileSync("data.json", JSON.stringify({ 
      bundleId: bundleId,
      link: url,
      error: "Timeout/Blocked", 
      details: err.message,
      check_screenshot: "Download the artifact from GitHub Actions summary"
    }, null, 2));

  } finally {
    await browser.close();
  }
})();
