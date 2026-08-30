const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('file:///Users/jslap018/Documents/RudraBalaga-main%202/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('typeof window.openScriptures === "function"', { timeout: 20000 });
  await page.evaluate(() => window.openScriptures());
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => document.querySelector('[data-scripture-id="guru-vandhana"]').click());
  await new Promise(r => setTimeout(r, 300));
  const r = await page.evaluate(() => {
    const c = document.querySelector('.scripture-content');
    return { len: c.textContent.trim().const puppeteer = require('puppeteer-core');
(async () => {
  const browser = awue(async () => {
  const browser = await pupper  const brows'p  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('file:///Users/jslap018/', e.message); process.exit(1); });
