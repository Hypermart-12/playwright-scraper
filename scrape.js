import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const url = process.env.TARGET_URL;
  const n8nWebhook = process.env.N8N_WEBHOOK_URL; // From GitHub Secrets

  if (!url) {
    console.error("TARGET_URL missing");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    const data = await page.evaluate(() => ({
      title: document.querySelector("h1")?.innerText || null,
      created: document.querySelector(".text-date")?.innerText || null,
      scrapedAt: new Date().toISOString()
    }));

    // 1. Save to file for GitHub Artifacts (output.json)
    fs.writeFileSync("output.json", JSON.stringify(data, null, 2));
    console.log("Results saved to output.json");

    // 2. Send data back to n8n via Webhook
    if (n8nWebhook) {
      console.log("Sending data to n8n...");
      await fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "success", data })
      });
    }

  } catch (error) {
    console.error("Scrape failed:", error.message);
    
    // Notify n8n of the failure
    if (n8nWebhook) {
      await fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "error", error: error.message })
      });
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
