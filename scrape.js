import { chromium } from "playwright";

(async () => {
  const url = process.env.TARGET_URL;

  if (!url) {
    console.error("TARGET_URL missing");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

  const data = await page.evaluate(() => ({
    title: document.querySelector("h1")?.innerText || null,
    created: document.querySelector(".text-date")?.innerText || null
  }));

  console.log(JSON.stringify(data));
  await browser.close();
})();
