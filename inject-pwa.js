/**
 * Inject PWA meta tags into all public HTML files
 * Idempotent: only adds tags if not already present
 */
const fs = require('fs');
const path = require('path');

const PWA_TAGS = `  <!-- PWA / Favicon -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#F5A623">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Min Stjärndag">`;

const SW_SCRIPT = `  <!-- Service Worker Registration -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  </script>`;

const htmlFiles = fs.readdirSync('public')
  .filter(f => f.endsWith('.html'))
  .map(f => path.join('public', f));

let updated = 0;
let skipped = 0;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Inject PWA tags before </head> if not already present
  if (!content.includes('rel="manifest"')) {
    content = content.replace('</head>', PWA_TAGS + '\n</head>');
    changed = true;
    console.log(`  + PWA tags → ${file}`);
  } else {
    console.log(`  ✓ already has manifest → ${file}`);
  }

  // Inject SW registration before </body> if not already present
  if (!content.includes("serviceWorker.register('/sw.js')")) {
    content = content.replace('</body>', SW_SCRIPT + '\n</body>');
    changed = true;
    console.log(`  + SW script → ${file}`);
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\nDone: ${updated} files updated, ${skipped} files already up to date`);
