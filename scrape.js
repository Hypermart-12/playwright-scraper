import { chromium } from "playwright";

(async () => {
  const url = process.env.TARGET_URL;
  const n8nUrl = process.env.N8N_WEBHOOK_URL;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(url);
  const data = await page.evaluate(() => ({
    title: document.querySelector("h1")?.innerText,
  }));

  // Send the data back to n8n Webhook
  if (n8nUrl) {
    await fetch(n8nUrl, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await browser.close();
})();
