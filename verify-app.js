const fs = require('fs');
const path = '/opt/polsia/workspaces/company-87240/agent-30/exec-3335465/stjarndag/public/app.html';
const h = fs.readFileSync(path, 'utf8');
const need = ['<html', '</html>', '<body', '</body>'];
const missing = need.filter(t => !h.includes(t));
if (missing.length) {
  console.error('FAIL: app.html missing: ' + missing.join(', '));
  process.exit(1);
}
console.log('PASS: app.html has all required tags');