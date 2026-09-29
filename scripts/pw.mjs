// Minimal Playwright helper. Uses installed Chrome/Edge (no browser download needed).
// Usage: node scripts/pw.mjs <url> [outPng]
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173";
const out = process.argv[3] ?? "pw-shot.png";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });

console.log("title:", await page.title());
console.log("url:", page.url());
console.log("logs:\n" + logs.join("\n"));
await browser.close();
