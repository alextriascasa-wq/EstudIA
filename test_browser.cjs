const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) {
      console.log('PAGE RES FAILED:', response.status(), response.url());
    }
  });

  console.log('Navigating...');
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    console.log('Navigation complete. DOM:', await page.evaluate(() => document.body.innerHTML.substring(0, 200)));
  } catch (e) {
    console.error('Navigation error:', e);
  }
  
  await browser.close();
})();
