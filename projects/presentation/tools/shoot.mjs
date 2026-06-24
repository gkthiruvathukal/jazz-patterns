// Screenshot the real web app (VexFlow notation + UI) for authentic slide assets.
// Usage: APP_URL=http://localhost:4173/ node tools/shoot.mjs
import puppeteer from "puppeteer";

const URL = process.env.APP_URL || "http://localhost:4173/";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 720, deviceScaleFactor: 2 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pick(key, scale) {
  await page.select("#key", key);
  await page.select("#scale", scale);
  await page.evaluate(() => {
    for (const id of ["key", "scale"]) {
      document.getElementById(id).dispatchEvent(new Event("change"));
    }
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(350);
  await page.waitForSelector("#notation svg");
}

async function setDark(dark) {
  await page.evaluate((d) => {
    const isDark = document.documentElement.dataset.theme === "dark";
    if (isDark !== d) document.getElementById("theme-toggle").click();
  }, dark);
  await sleep(150);
}

async function shootNotation(name) {
  // Screenshot the SVG itself (tight to the staff) rather than the full-width box.
  const el = await page.$("#notation svg");
  await el.screenshot({ path: `assets/${name}` });
  console.log("wrote", name);
}

await page.goto(URL, { waitUntil: "networkidle2" });
await page.waitForSelector("#notation svg");
await page.evaluate(() => document.fonts.ready);

// 1) C major notation (light) — pairs with the LilyPond engraving.
await setDark(false);
await pick("C", "Major (Ionian)");
await shootNotation("app-cmajor.png");

// 2) Minor Pentatonic b5 (light) — shows the m3 … M3 interval labels.
await pick("C", "Minor Pentatonic b5");
await shootNotation("app-pentb5.png");

// 3) Dark theme + C Dorian — the state reused for the mobile capture below.
await setDark(true);
await pick("C", "Dorian");
await sleep(250);

// 4) Mobile portrait (dark) — the full app reflowed to a typical phone width,
// captured top-to-bottom so every control + the notation fits in one image.
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await sleep(300);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "assets/app-mobile-dark.png", fullPage: true });
console.log("wrote app-mobile-dark.png");

await browser.close();
