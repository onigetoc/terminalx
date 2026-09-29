// Test: open app, type "echo hello" in the PTY terminal, screenshot result.
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: "C:/Users/coteg/AppData/Local/Temp/opencode/t1-open.png" });
console.log("STEP1 opened. title:", await page.title());

// Terminal canvas lives in .xterm-screen / textarea. Click it to focus.
const xterm = page.locator(".xterm").first();
console.log("xterm count:", await page.locator(".xterm").count());
await xterm.click({ position: { x: 400, y: 200 } });
await page.waitForTimeout(1500);
await page.keyboard.type("echo hello", { delay: 40 });
await page.waitForTimeout(500);
await page.keyboard.press("Enter");
await page.waitForTimeout(2500);
await page.screenshot({ path: "C:/Users/coteg/AppData/Local/Temp/opencode/t2-echo.png" });

console.log("logs:\n" + logs.join("\n"));
await browser.close();
