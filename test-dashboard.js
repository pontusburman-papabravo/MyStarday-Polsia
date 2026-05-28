const { chromium } = require('playwright');

const CDP_URL = 'wss://connect.anchorbrowser.io/?sessionId=f9c97f0c-5d56-4d69-9060-bb86ca394392';

async function runTest() {
  console.log('Connecting to browser session...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: 'console_error',
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  // Listen for page errors
  page.on('pageerror', err => {
    consoleErrors.push({
      type: 'page_error',
      text: err.message,
      stack: err.stack
    });
  });

  // Listen for failed requests
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push({
        url: response.url(),
        status: status,
        statusText: response.statusText()
      });
    }
  });

  // Listen for request failures
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown'
    });
  });

  console.log('\n--- Testing Login Page ---');
  try {
    await page.goto('https://stjarndag.polsia.app/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Login page loaded successfully');
    await page.waitForTimeout(2000); // Wait for any delayed errors
  } catch (err) {
    console.log('Login page navigation failed:', err.message);
  }

  const loginPageErrors = [...consoleErrors];
  const loginPageFailedReqs = [...failedRequests];
  console.log(`Login page: ${loginPageErrors.length} console errors, ${loginPageFailedReqs.length} failed requests`);

  // Clear arrays for dashboard check
  consoleErrors.length = 0;
  failedRequests.length = 0;

  console.log('\n--- Testing Dashboard ---');
  try {
    await page.goto('https://stjarndag.polsia.app/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Dashboard loaded successfully');
    await page.waitForTimeout(3000); // Wait for dynamic content and API calls
  } catch (err) {
    console.log('Dashboard navigation failed:', err.message);
  }

  const dashboardErrors = [...consoleErrors];
  const dashboardFailedReqs = [...failedRequests];
  console.log(`Dashboard: ${dashboardErrors.length} console errors, ${dashboardFailedReqs.length} failed requests`);

  // Print full report
  console.log('\n========================================');
  console.log('         TEST RESULTS REPORT');
  console.log('========================================');

  if (loginPageErrors.length > 0) {
    console.log('\n--- LOGIN PAGE CONSOLE ERRORS ---');
    loginPageErrors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.type}] ${err.text}`);
      if (err.location) console.log(`   Location: ${JSON.stringify(err.location)}`);
      if (err.stack) console.log(`   Stack: ${err.stack.substring(0, 200)}`);
    });
  }

  if (loginPageFailedReqs.length > 0) {
    console.log('\n--- LOGIN PAGE FAILED REQUESTS ---');
    loginPageFailedReqs.forEach((req, i) => {
      console.log(`${i + 1}. ${req.status || req.failure} - ${req.url}`);
      if (req.statusText) console.log(`   ${req.statusText}`);
    });
  }

  if (dashboardErrors.length > 0) {
    console.log('\n--- DASHBOARD CONSOLE ERRORS ---');
    dashboardErrors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.type}] ${err.text}`);
      if (err.location) console.log(`   Location: ${JSON.stringify(err.location)}`);
      if (err.stack) console.log(`   Stack: ${err.stack.substring(0, 200)}`);
    });
  }

  if (dashboardFailedReqs.length > 0) {
    console.log('\n--- DASHBOARD FAILED REQUESTS ---');
    dashboardFailedReqs.forEach((req, i) => {
      console.log(`${i + 1}. ${req.status || req.failure} - ${req.url}`);
      if (req.statusText) console.log(`   ${req.statusText}`);
    });
  }

  if (loginPageErrors.length === 0 && loginPageFailedReqs.length === 0 &&
      dashboardErrors.length === 0 && dashboardFailedReqs.length === 0) {
    console.log('\nNo console errors or failed requests detected!');
  }

  await browser.close();
}

runTest().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});