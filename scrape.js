import { chromium } from "playwright";
import fs from "fs";

(async () => {
  const url = process.env.TARGET_URL;
  if (!url) process.exit(1);

  const browser = await chromium.launch({ headless: true });
  // Use a real browser user-agent to look less like a bot
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to: ${url}`);
    
    // 1. Navigate and wait until the network is quiet
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // 2. Wait for ANY element that indicates the page loaded (the item name)
    await page.waitForSelector('.item-name', { timeout: 15000 });

    // 3. Try to find the date using a more general text-search
    const data = await page.evaluate(() => {
      // Find all divs; look for one that contains "Created"
      const allDivs = Array.from(document.querySelectorAll('div, span, label'));
      const createdElement = allDivs.find(el => el.innerText === 'Created');
      const updatedElement = allDivs.find(el => el.innerText === 'Updated');

      return {
        bundleName: document.querySelector('.item-name')?.innerText || "Unknown",
        createdDate: createdElement ? createdElement.nextElementSibling?.innerText : "Not Found",
        updatedDate: updatedElement ? updatedElement.nextElementSibling?.innerText : "Not Found",
        url: window.location.href
      };
    });

    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
    console.log("Success:", data);

  } catch (err) {
    console.error("Scrape failed. Taking error-screenshot.png");
    // This is the most important part for debugging!
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    
    fs.writeFileSync("data.json", JSON.stringify({ 
      error: "Timeout or Bot Blocked", 
      details: err.message 
    }, null, 2));
  } finally {
    await browser.close();
  }
})();
