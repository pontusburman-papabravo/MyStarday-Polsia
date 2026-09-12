'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const VIEWPORTS = [
  { name: '375×812', width: 375, height: 812 },
  { name: '390×844', width: 390, height: 844 },
  { name: '393×852', width: 393, height: 852 },
  { name: '430×932', width: 430, height: 932 },
];

const ITEM_COUNTS = [0, 1, 8, 16];

const OLD_OVERLAP_CSS = `
body.parent-magic-page-schedule .magic-page-shell {
  padding-bottom: calc(var(--parent-bottom-nav-height, 56px) + 12px) !important;
}
body.parent-magic-page-schedule.has-native-tab-bar .magic-page-stats {
  display: flex !important;
}
`;

function scheduleShellBlock(css) {
  const start = css.indexOf('body.parent-magic-page-schedule .magic-page-shell');
  assert.ok(start > -1, 'schedule magic-page-shell rule must exist');
  return css.slice(start, start + 520);
}

function fixtureHtml({ items = 8, poisonOldCss = false } = {}) {
  const rows = Array.from({ length: items }, (_, i) => {
    const label = i === 0 ? 'Vakna' : `Aktivitet ${i + 1}`;
    return `<article class="schedule-row" data-row="${i}">${label}</article>`;
  }).join('\n');
  const body = items > 0
    ? `<div id="scheduleRows">${rows}</div>`
    : '<p class="empty-day" data-empty="1">Inga aktiviteter denna dag</p>';
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/parent-bottom-nav.css">
  <link rel="stylesheet" href="/css/parent-tab-bar.css">
  <link rel="stylesheet" href="/css/parent-magic-common.css">
  <style>
    html, body { margin: 0; }
    .app-view-toggle-wrap { min-height: 60px; }
    .planning-back { min-height: 44px; }
    .schedule-mode-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
    .schedule-mode-btn { min-height: 44px; padding: 8px 12px; }
    .editor-chrome { padding: 16px; }
    .child-tabs { min-height: 44px; margin-bottom: 16px; display: flex; align-items: center; }
    .view-mode-bar { min-height: 44px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .day-hint { font-size: 12px; margin: 0 0 8px; }
    .day-tabs { display: flex; gap: 4px; margin: 0 0 12px; overflow-x: auto; }
    .day-tab { min-height: 44px; min-width: 44px; padding: 8px 10px; flex: 0 0 auto; }
    .section-label { min-height: 40px; margin: 0 0 8px; font-weight: 700; }
    .schedule-row {
      height: 134px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      padding: 12px;
      margin: 0 0 8px;
    }
    .empty-day { min-height: 44px; }
    .native-tab-bar .tab-item { min-width: 44px; }
    #parentMagicPageMount { display: block; }
  </style>
  ${poisonOldCss ? `<style id="old-overlap">${OLD_OVERLAP_CSS}</style>` : ''}
</head>
<body class="parent-magic-view parent-magic-page-schedule has-native-tab-bar">
  <main>
    <div class="app-view-toggle-wrap" id="appViewToggleMount"></div>
    <div id="parentMagicPageMount">
      <div class="magic-page-shell">
        <div class="magic-page-hero">
          <div class="magic-page-hero-icon" aria-hidden="true">📅</div>
          <div><h1>Vecko schema</h1><p>Mitt barn</p></div>
        </div>
        <div class="schedule-mode-toggle schedule-magic-mode-bar" role="group">
          <button type="button" class="schedule-mode-btn active">Mitt barn</button>
          <button type="button" class="schedule-mode-btn">Alla barn</button>
        </div>
        <div class="magic-page-stats">
          <div class="magic-page-stat-card"><strong>1</strong><span>Barn</span></div>
          <div class="magic-page-stat-card"><strong>7</strong><span>Dagar</span></div>
        </div>
      </div>
    </div>
    <div class="editor-chrome">
      <div class="child-tabs">Mitt barn</div>
      <div class="view-mode-bar">
        <span>Schema</span>
        <span>Visa</span>
        <span>Lägg till</span>
      </div>
      <p class="day-hint">Välj dag — dra dag-flik till annan dag för att kopiera/byta</p>
      <div class="day-tabs" id="daySelector">
        <button type="button" class="day-tab">Mån</button>
        <button type="button" class="day-tab">Tis</button>
        <button type="button" class="day-tab">Ons</button>
        <button type="button" class="day-tab">Tor</button>
        <button type="button" class="day-tab">Fre</button>
        <button type="button" class="day-tab">Lör</button>
        <button type="button" class="day-tab">Sön</button>
      </div>
      <div class="section-label">Morgon</div>
      ${body}
    </div>
  </main>
  <nav class="native-tab-bar" aria-label="Huvudnavigering">
    <a class="tab-item" href="/dashboard">Hem</a>
    <a class="tab-item active" href="/schedule">Planering</a>
  </nav>
</body>
</html>`;
}

function startFixtureServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/css/')) {
      const file = path.join(ROOT, 'public', url.pathname);
      if (!file.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(file)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.end(fs.readFileSync(file));
      return;
    }
    if (url.pathname === '/fixture') {
      const items = Number(url.searchParams.get('items') || '8');
      const poison = url.searchParams.get('old') === '1';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fixtureHtml({ items, poisonOldCss: poison }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function scrollLastRowAboveNav() {
  const last = document.querySelector('[data-row]:last-of-type');
  const nav = document.querySelector('.native-tab-bar');
  if (!last || !nav) return;
  last.scrollIntoView({ block: 'end' });
  const overlap = last.getBoundingClientRect().bottom - nav.getBoundingClientRect().top;
  if (overlap > 0) {
    const se = document.scrollingElement || document.documentElement;
    se.scrollTop += overlap;
  }
}

async function measure(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.native-tab-bar');
    const first = document.querySelector('[data-row="0"], [data-empty="1"]');
    const last = document.querySelector('[data-row]:last-of-type') || first;
    const navBox = nav ? nav.getBoundingClientRect() : null;
    const firstBox = first ? first.getBoundingClientRect() : null;
    const lastBox = last ? last.getBoundingClientRect() : null;
    const stats = document.querySelector('.magic-page-stats');
    const statsStyle = stats ? getComputedStyle(stats) : null;
    return {
      scrollTop: document.scrollingElement ? document.scrollingElement.scrollTop : window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      navTop: navBox ? navBox.top : null,
      navBottom: navBox ? navBox.bottom : null,
      navHeight: navBox ? navBox.height : null,
      firstTop: firstBox ? firstBox.top : null,
      firstBottom: firstBox ? firstBox.bottom : null,
      lastTop: lastBox ? lastBox.top : null,
      lastBottom: lastBox ? lastBox.bottom : null,
      statsDisplay: statsStyle ? statsStyle.display : null,
      daySelectorTop: document.getElementById('daySelector')
        ? document.getElementById('daySelector').getBoundingClientRect().top
        : null,
    };
  });
}

describe('Weekly Schedule 375×812 first-row vs bottom-nav', () => {
  it('exposes a shared nav-height token used by the nav itself', () => {
    const css = read('public/css/parent-bottom-nav.css');
    assert.match(css, /--parent-bottom-nav-height:\s*calc\(56px \+ env\(safe-area-inset-bottom, 0px\)\)/);
    assert.match(css, /height:\s*var\(--parent-bottom-nav-height\)/);
  });

  it('schedule hub hero does not pad by nav height (that pushed the first row under the tab bar)', () => {
    const css = read('public/css/parent-magic-common.css');
    const block = scheduleShellBlock(css);
    assert.match(css, /body\.parent-magic-view\.parent-magic-page-schedule:not\(\.parent-theme-light\) \.magic-page-shell/);
    assert.match(css, /body\.parent-magic-view\.parent-theme-light\.parent-magic-page-schedule \.magic-page-shell/);
    assert.match(block, /padding-bottom:\s*0/);
    assert.doesNotMatch(block, /padding-bottom:\s*calc\(var\(--parent-bottom-nav-height/);
  });

  it('hides redundant hub stats on mobile schedule with native tab bar', () => {
    const css = read('public/css/parent-magic-common.css');
    assert.match(
      css,
      /body\.parent-magic-page-schedule\.has-native-tab-bar \.magic-page-stats\s*\{[^}]*display:\s*none/s,
    );
  });

  it('scroll restoration uses nav-height scroll-padding on the schedule page', () => {
    const css = read('public/css/parent-magic-common.css');
    assert.match(css, /scroll-padding-bottom:\s*var\(--parent-bottom-nav-height/);
  });

  it('375×812 native-style tab bar uses the same height token as the web dock', () => {
    const css = read('public/css/parent-tab-bar.css');
    assert.match(css, /height:\s*var\(--parent-bottom-nav-height/);
    assert.match(css, /body\.has-native-tab-bar main\s*\{[^}]*padding-bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom/s);
  });

  it('does not change non-schedule magic-page-shell padding to the nav token', () => {
    const css = read('public/css/parent-magic-common.css');
    const generic = css.slice(css.indexOf('.magic-page-shell {'), css.indexOf('.magic-page-hero'));
    assert.doesNotMatch(generic, /--parent-bottom-nav-height/);
  });
});

describe('Weekly Schedule mobile geometry (puppeteer)', () => {
  let browser;
  let server;
  let baseUrl;
  let puppeteer;

  before(async () => {
    puppeteer = require('puppeteer');
    const started = await startFixtureServer();
    server = started.server;
    baseUrl = started.baseUrl;
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('old hero nav-padding overlaps the first row; current CSS does not', { timeout: 60_000 }, async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    await page.goto(`${baseUrl}/fixture?items=8&old=1`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { window.scrollTo(0, 0); });
    const oldGeo = await measure(page);
    assert.ok(oldGeo.navTop > 0, 'nav must be visible');
    assert.ok(
      oldGeo.firstBottom > oldGeo.navTop,
      `old CSS must overlap (firstBottom ${oldGeo.firstBottom} vs navTop ${oldGeo.navTop})`,
    );

    await page.goto(`${baseUrl}/fixture?items=8`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { window.scrollTo(0, 0); });
    const geo = await measure(page);
    assert.equal(geo.scrollTop, 0);
    assert.ok(geo.firstBottom <= geo.navTop, `first row under nav: bottom ${geo.firstBottom} navTop ${geo.navTop}`);
    assert.ok(geo.scrollWidth <= geo.innerWidth + 1, `horizontal overflow ${geo.scrollWidth} > ${geo.innerWidth}`);
    assert.equal(geo.statsDisplay, 'none');
    assert.ok(geo.daySelectorTop >= 0, 'day selector must stay on screen');
    await page.close();
  });

  for (const vp of VIEWPORTS) {
    it(`${vp.name} populated day: first row above nav, last row scrolls clear, no overflow`, { timeout: 60_000 }, async () => {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await page.goto(`${baseUrl}/fixture?items=8`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => { window.scrollTo(0, 0); });
      const initial = await measure(page);
      assert.ok(initial.firstBottom <= initial.navTop, `${vp.name} first row under nav (${initial.firstBottom} > ${initial.navTop})`);
      assert.ok(initial.scrollWidth <= initial.innerWidth + 1, `${vp.name} overflow-x`);

      await page.evaluate(scrollLastRowAboveNav);
      const scrolled = await measure(page);
      assert.ok(
        scrolled.lastBottom <= scrolled.navTop,
        `${vp.name} last row under nav (${scrolled.lastBottom} > ${scrolled.navTop})`,
      );
      await page.close();
    });
  }

  for (const count of ITEM_COUNTS) {
    it(`375×812 with ${count} item(s): visible content stays above nav`, { timeout: 60_000 }, async () => {
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.goto(`${baseUrl}/fixture?items=${count}`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => { window.scrollTo(0, 0); });
      const geo = await measure(page);
      assert.ok(geo.firstBottom <= geo.navTop, `${count} items: first/empty under nav (${geo.firstBottom} > ${geo.navTop})`);
      if (count >= 8) {
        await page.evaluate(scrollLastRowAboveNav);
        const scrolled = await measure(page);
        assert.ok(scrolled.lastBottom <= scrolled.navTop, `${count} items: last row under nav`);
      }
      assert.ok(geo.scrollWidth <= geo.innerWidth + 1, `${count} items: overflow-x`);
      await page.close();
    });
  }
});
