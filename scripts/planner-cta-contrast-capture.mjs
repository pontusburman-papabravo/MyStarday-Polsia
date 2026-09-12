#!/usr/bin/env node
/**
 * Captures computed contrast for planner primary gold CTAs at 375×812.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/planner-cta-contrast-capture.mjs
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/planner-cta-contrast';

function contrast(fg, bg) {
  const parse = (c) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  };
  const lum = ([r, g, b]) => {
    const f = (x) => {
      const s = x / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const a = parse(fg);
  const b = parse(bg);
  if (!a || !b) return null;
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

await page.goto(`${BASE}/schedule`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.screenshot({ path: path.join(OUT, 'schedule-page-375.png'), fullPage: false });

const samples = await page.evaluate(() => {
  const btn = document.getElementById('scheduleAddMenuBtn')
    || document.querySelector('button.bg-gold, a.bg-gold, button[class*="bg-gold"]');
  if (!btn) return { found: false };
  const cs = getComputedStyle(btn);
  return {
    found: true,
    id: btn.id || btn.className.slice(0, 80),
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    minHeight: cs.minHeight,
    fontSize: cs.fontSize,
  };
});

const ratio = samples.found ? contrast(samples.color, samples.backgroundColor) : null;

const report = {
  url: `${BASE}/schedule`,
  viewport: '375×812',
  sample: samples,
  contrastRatio: ratio ? Number(ratio.toFixed(2)) : null,
  passesAA: ratio != null && ratio >= 4.5,
};

fs.writeFileSync(path.join(OUT, 'contrast-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
