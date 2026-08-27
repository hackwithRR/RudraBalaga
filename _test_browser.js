const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Users/jslap018/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));

  try {
    await page.goto('file://' + path.resolve('admin.html'), { waitUntil: 'networkidle0', timeout: 15000 });
  } catch(e) {
    console.log('Navigation error (expected for networkidle0 with local file):', e.message);
  }

  // Wait a bit for async scripts to run
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();
  console.log('=== Done ===');
})().catch(e => { console.error(e); process.exit(1); });
