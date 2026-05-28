const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('wss://connect.anchorbrowser.io/?sessionId=e9fe313c-9f98-49fd-a0fa-863762a0101a');
  const page = await browser.newPage();

  // Set desktop resolution
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to the page
  await page.goto('https://my-starday.polsia.app/pedagoger-och-terapeuter', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for images to load
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'desktop_pedagoger.png', fullPage: false });

  // Get page title
  const title = await page.title();
  console.log('Page title:', title);

  // Check if images are visible
  const images = await page.$$('.screenshot-img-wrap img');
  console.log('Number of images found:', images.length);

  // Check for broken images
  for (let i = 0; i < images.length; i++) {
    const naturalWidth = await images[i].evaluate(el => el.naturalWidth);
    const complete = await images[i].evaluate(el => el.complete);
    const src = await images[i].evaluate(el => el.src);
    console.log(`Image ${i}: complete=${complete}, naturalWidth=${naturalWidth}, src=${src.substring(0, 80)}`);
  }

  // Check the evidence-card text
  const evidenceStats = await page.$$('.evidence-stat');
  for (let i = 0; i < evidenceStats.length; i++) {
    const text = await evidenceStats[i].textContent();
    const fontSize = await evidenceStats[i].evaluate(el => getComputedStyle(el).fontSize);
    const rect = await evidenceStats[i].evaluate(el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, left: r.left, top: r.top };
    });
    console.log(`Evidence ${i}: "${text}" fontSize=${fontSize}, rect=${JSON.stringify(rect)}`);
  }

  await browser.close();
})();