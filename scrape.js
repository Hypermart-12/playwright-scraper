import { chromium } from "playwright";
import fs from "fs";

(async () => {
  // Get the URL from n8n (via GitHub environment variable)
  const url = process.env.TARGET_URL;

  if (!url) {
    console.error("No TARGET_URL provided.");
    process.exit(1);
  }

  console.log(`Launching browser for: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the site
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Extract the information
    const results = await page.evaluate(() => {
      return {
        title: document.querySelector("h1")?.innerText || "No H1 found",
        dateText: document.querySelector(".text-date")?.innerText || "No date found",
        scrapedAt: new Date().toLocaleString()
      };
    });

    // Save the results to a file named data.json
    fs.writeFileSync("data.json", JSON.stringify(results, null, 2));
    console.log("Successfully saved data to data.json");

  } catch (error) {
    console.error("Scraping failed:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
