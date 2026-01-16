import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const url = process.env.TARGET_URL || 'https://example.com';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(url);
  const data = await page.evaluate(() => ({
    title: document.querySelector("h1")?.innerText,
    time: new Date().toISOString()
  }));

  // Save the result to a file named 'data.json'
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
  
  await browser.close();
})();
