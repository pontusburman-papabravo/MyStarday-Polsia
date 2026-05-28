const fs = require('fs');
['public/login.html','public/register.html'].forEach(f => {
  const h = fs.readFileSync(f,'utf8');
  const missing = ['<html','</html>','<body','</body>'].filter(t => !h.includes(t));
  if (missing.length) { console.error('FAIL:',f,'missing:',missing.join(', ')); process.exit(1); }
  console.log('PASS:',f);
});