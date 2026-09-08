'use strict';

/**
 * App Store Connect privacy URL audit — language + routing must stay deterministic.
 *
 * English (UK) in ASC is the en-GB listing locale (Sweden English beta), not a UK
 * storefront launch. The jurisdiction resolver for SE + en-GB already points at
 * /en/eea/privacy. /en/uk/privacy is a closed-market placeholder, not a policy.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const { resolveLegalRoutes } = require('../src/lib/legal-routing');
const { PUBLIC_WEB_ROUTES, EN_ONLY_STATIC } = require('../config/public-web-routes');

const ROOT = path.join(__dirname, '..');

const ASC_SWEDISH_PRIVACY_PATH = '/privacy';
const ASC_ENGLISH_UK_PRIVACY_PATH = '/en/eea/privacy';

const SWEDISH_BODY_MARKERS = [
  'Senast uppdaterad',
  'Personuppgiftsansvarig',
  'Vi värnar om din integritet',
  'rättslig grund',
  'barnens integritet',
  'Tillbaka',
  'Startsidan',
];

function readPublic(rel) {
  return fs.readFileSync(path.join(ROOT, 'public', rel), 'utf8');
}

function htmlLang(html) {
  const match = html.match(/<html[^>]*\slang="([^"]+)"/i);
  return match ? match[1] : null;
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function fileForPath(pathname) {
  const sv = PUBLIC_WEB_ROUTES.find((r) => r.sv === pathname);
  if (sv) return sv.fileSv;
  const en = PUBLIC_WEB_ROUTES.find((r) => r.en === pathname);
  if (en) return en.fileEn;
  const only = EN_ONLY_STATIC.find((r) => r.path === pathname);
  if (only) return only.file;
  return null;
}

function requestPath(app, pathname) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const req = http.get({ hostname: '127.0.0.1', port, path: pathname }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          server.close(() => {
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        });
      });
      req.on('error', (err) => {
        server.close(() => reject(err));
      });
    });
  });
}

describe('ASC privacy route mapping is deterministic', () => {
  it('registry wires all four candidate privacy URLs to existing files', () => {
    const expected = {
      '/privacy': 'privacy.html',
      '/en/privacy': 'en-privacy.html',
      '/en/eea/privacy': 'en/eea-privacy.html',
      '/en/uk/privacy': 'en/uk-privacy.html',
    };
    for (const [pathname, file] of Object.entries(expected)) {
      assert.equal(fileForPath(pathname), file, pathname);
      assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), file);
    }
  });

  it('public-pages mounts Swedish /privacy hardcoded and English legal routes from the registry', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    assert.match(src, /router\.get\('\/privacy'/);
    assert.match(src, /privacy\.html/);
    assert.match(src, /router\.get\('\/terms'/);
    assert.match(src, /PUBLIC_WEB_ROUTES/);
    assert.match(src, /EN_ONLY_STATIC/);
    assert.match(src, /router\.get\(route\.en/);
    assert.match(src, /router\.get\(route\.path/);
  });

  it('SE sv-SE and SE en-GB legal mapping matches ASC Swedish vs English (UK) URLs', () => {
    const swedish = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'sv-SE' });
    const englishSweden = resolveLegalRoutes({ countryCode: 'SE', marketRegion: 'EU', locale: 'en-GB' });
    const ukClosed = resolveLegalRoutes({ countryCode: 'GB', marketRegion: 'UK', locale: 'en-GB' });

    assert.equal(swedish.privacy, ASC_SWEDISH_PRIVACY_PATH);
    assert.equal(swedish.terms, '/terms');
    assert.equal(swedish.status, 'live');

    assert.equal(englishSweden.privacy, ASC_ENGLISH_UK_PRIVACY_PATH);
    assert.equal(englishSweden.terms, '/en/eea/terms');
    assert.notEqual(englishSweden.privacy, '/en/privacy');
    assert.notEqual(englishSweden.privacy, '/en/uk/privacy');

    assert.equal(ukClosed.privacy, '/en/uk/privacy');
    assert.equal(ukClosed.status, 'placeholder');
  });

  it('terms follow the same jurisdiction pattern as privacy', () => {
    assert.equal(fileForPath('/terms'), 'terms.html');
    assert.equal(fileForPath('/en/terms'), 'en-terms.html');
    assert.equal(fileForPath('/en/eea/terms'), 'en/eea-terms.html');
    assert.equal(fileForPath('/en/uk/terms'), 'en/uk-terms.html');
  });
});

describe('privacy page language (repo HTML)', () => {
  it('/privacy is Swedish and stays Swedish', () => {
    const html = readPublic('privacy.html');
    assert.equal(htmlLang(html), 'sv');
    assert.match(html, /<title>Integritetspolicy/);
    assert.match(html, /<h1>Integritetspolicy för/);
    for (const marker of SWEDISH_BODY_MARKERS) {
      assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(html, /Privacy policy för/);
    assert.doesNotMatch(html, /EEA Privacy Notice/);
  });

  it('/en/privacy is mixed: English chrome, Swedish body — not ASC English (UK)', () => {
    const html = readPublic('en-privacy.html');
    assert.equal(htmlLang(html), 'en');
    assert.match(html, /<title>Privacy policy/);
    assert.match(html, /Privacy policy för My Starday/);
    assert.match(html, /Senast uppdaterad/);
    assert.match(html, /Vi värnar om din integritet/);
    assert.match(html, /Personuppgiftsansvarig/);
    assert.notEqual('/en/privacy', ASC_ENGLISH_UK_PRIVACY_PATH);
  });

  it('selected English (UK) page /en/eea/privacy is English without major Swedish body copy', () => {
    const html = readPublic('en/eea-privacy.html');
    const text = visibleText(html);
    assert.equal(htmlLang(html), 'en');
    assert.match(html, /<title>EEA Privacy Notice/);
    assert.match(html, /<h1>EEA Privacy Notice<\/h1>/);
    assert.match(html, /Last updated/);
    assert.match(html, /We care about your privacy/);
    assert.match(html, /personal data/);
    for (const marker of SWEDISH_BODY_MARKERS) {
      assert.doesNotMatch(text, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    // Proper noun for the Swedish DPA is allowed; it is not body copy.
    assert.match(html, /Integritetsskyddsmyndigheten \(IMY\)/);
  });

  it('/en/uk/privacy is an English closed-market placeholder, not a privacy policy', () => {
    const html = readPublic('en/uk-privacy.html');
    assert.equal(htmlLang(html), 'en');
    assert.match(html, /UK Privacy Notice \(placeholder\)/);
    assert.match(html, /United Kingdom launch not open/);
    assert.doesNotMatch(html, /We care about your privacy/);
    assert.doesNotMatch(html, /Senast uppdaterad/);
    assert.notEqual('/en/uk/privacy', ASC_ENGLISH_UK_PRIVACY_PATH);
  });
});

describe('privacy routes return 200 from the public-pages router', () => {
  it('serves Swedish and English (UK) privacy pages with 200 and matching language', async () => {
    const publicPages = require('../src/routes/public-pages');
    const app = express();
    app.use(publicPages);

    const swedish = await requestPath(app, ASC_SWEDISH_PRIVACY_PATH);
    assert.equal(swedish.status, 200);
    assert.equal(htmlLang(swedish.body), 'sv');
    assert.match(swedish.body, /Integritetspolicy/);

    const englishUk = await requestPath(app, ASC_ENGLISH_UK_PRIVACY_PATH);
    assert.equal(englishUk.status, 200);
    assert.equal(htmlLang(englishUk.body), 'en');
    assert.match(englishUk.body, /EEA Privacy Notice/);
    assert.doesNotMatch(visibleText(englishUk.body), /Senast uppdaterad/);
    assert.doesNotMatch(visibleText(englishUk.body), /Vi värnar om din integritet/);

    const genericEn = await requestPath(app, '/en/privacy');
    assert.equal(genericEn.status, 200);
    assert.match(genericEn.body, /Vi värnar om din integritet/);

    const ukPlaceholder = await requestPath(app, '/en/uk/privacy');
    assert.equal(ukPlaceholder.status, 200);
    assert.match(ukPlaceholder.body, /placeholder/);
  });
});

describe('ASC metadata documents the verified English (UK) privacy URL', () => {
  it('en-GB store metadata points Privacy at /en/eea/privacy, not /privacy or /integritet', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/app-store-connect-metadata-en-GB.md'), 'utf8');
    assert.match(doc, /Privacy Policy: \[APP_URL\]\/en\/eea\/privacy/);
    assert.match(doc, /Privacy \| `\[APP_URL\]\/en\/eea\/privacy`/);
    assert.doesNotMatch(doc, /Privacy Policy: \[APP_URL\]\/privacy\b/);
    assert.doesNotMatch(doc, /Privacy \| `\[APP_URL\]\/integritet`/);
    assert.match(doc, /Do not use `\/en\/uk\/privacy`/);
    assert.match(doc, /Do not use `\/en\/privacy`/);
  });
});
