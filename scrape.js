import { chromium } from "playwright";
import fs from "fs";

(async () => {
  // 1. Get URL from environment (sent by n8n)
  const url = process.env.TARGET_URL;

  if (!url || !url.includes("roblox.com")) {
    console.error("❌ Valid Roblox URL is required.");
    process.exit(1);
  }

  console.log(`🚀 Launching Scraper for: ${url}`);

  // 2. Launch Browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 3. Navigate with high timeout for slow JS loading
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // 4. Wait for the specific info section to render
    // Roblox usually wraps metadata in '.item-details-info' or '.border-bottom'
    console.log("⏳ Waiting for JavaScript to render metadata...");
    await page.waitForSelector('.field-label', { timeout: 15000 });

    // 5. Extract the Data
    const data = await page.evaluate(() => {
      const getMetadata = (labelText) => {
        const labels = Array.from(document.querySelectorAll('.field-label'));
        const target = labels.find(el => el.innerText.includes(labelText));
        return target ? target.nextElementSibling?.innerText?.trim() : "Not Found";
      };

      return {
        bundleName: document.querySelector('.item-name')?.innerText || "Unknown",
        creator: document.querySelector('.item-company a')?.innerText || "Unknown",
        dateCreated: getMetadata("Created"),
        dateUpdated: getMetadata("Updated"),
        price: document.querySelector('.text-robux-lg')?.innerText || "Offsale",
        scrapedAt: new Date().toISOString()
      };
    });

    // 6. Save to file for the n8n GitHub Node to pick up
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
    console.log("✅ Data successfully saved to data.json:", data);

  } catch (error) {
    console.error("ℱ Scraping Error:", error.message);
    
    // Create an error file so n8n knows what happened
    fs.writeFileSync("data.json", JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await browser.close();
  }
})();
