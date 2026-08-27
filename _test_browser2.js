const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache']
  });

  const page = await browser.newPage();
  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => consoleMessages.push(`CONSOLE[${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}\n${err.stack}`));
  page.on('requestfailed', req => errors.push(`REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`));

  // Also listen for errors in any frames
  page.on('framelesspageerror', err => errors.push(`FRAMELESS PAGE ERROR: ${err.message}`));

  try {
    await page.goto('file://' + path.resolve('admin.html'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch(e) {
    errors.push(`NAVIGATION ERROR: ${e.message}`);
  }

  // Wait for all async work to settle
  await new Promise(r => setTimeout(r, 5000));

  // Force evaluation to check for errors in any injected scripts
  try {
    const check = await page.evaluate(() => {
      return { typeofWindow: typeof window, readyState: document.readyState };
    });
    consoleMessages.push(`PAGE EVAL: ${JSON.stringify(check)}`);
  } catch(e) {
    errors.push(`EVAL ERROR: ${e.message}`);
  }

  await browser.close();

  console.log('=== Console Messages ===');
  consoleMessages.forEach(m => console.log(m));
  console.log('=== Errors ===');
  if (errors.length === 0) {
    console.log('NO ERRORS FOUND');
  } else {
    errors.forEach(e => console.log(e));
  }
  console.log('=== Done ===');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
