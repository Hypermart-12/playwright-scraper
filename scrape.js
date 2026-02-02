import { chromium as c_3s } from "playwright";
import f_u2 from "fs";

(async () => {
  const u_wjiu = process.env.TARGET_URL;
  if (!u_wjiu) process.exit(1);

  const b_k2 = u_wjiu.match(/\/bundles\/(\d+)/);
  const i_99 = b_k2 ? b_k2[1] : "0";

  const b_jws = await c_3s.launch({ headless: true });
  const c_xi = await b_jws.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  await c_xi.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const p_u2 = await c_xi.newPage();

  try {
    await p_u2.goto(u_wjiu, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p_u2.waitForSelector('body', { timeout: 10000 });
    await p_u2.waitForTimeout(5000);

    const r_d7 = await p_u2.evaluate(() => {
      const z_x = (t) => {
        const e = Array.from(document.querySelectorAll('div, span, label, p'));
        const l = e.find(el => el.innerText?.trim() === t);
        return l ? l.nextElementSibling?.innerText?.trim() : "---";
      };
      return {
        n_1: document.querySelector('h1, .item-name')?.innerText?.trim() || "???",
        d_1: z_x("Created"),
        d_2: z_x("Updated"),
      };
    });

    const o_v9 = {
      id: i_99,
      l: u_wjiu,
      ...r_d7,
      s: new Date().toLocaleString()
    };

    
    const s_8k = Buffer.from(JSON.stringify(o_v9)).toString('base64');
    f_u2.writeFileSync("data.json", JSON.stringify({ z_9x: s_8k }));

  } catch (e_r1) {
    try { await p_u2.screenshot({ path: 'error-screenshot.png', fullPage: true }); } catch (s_e) {}
    
    const e_o9 = Buffer.from(JSON.stringify({ 
      id: i_99, 
      l: u_wjiu, 
      err: "t_out", 
      m: e_r1.message 
    })).toString('base64');
    
    f_u2.writeFileSync("data.json", JSON.stringify({ z_9x: e_o9 }));
  } finally {
    await b_jws.close();
  }
})();
