const https = require("https");
const BASE_URL = "stjarndag.polsia.app";
const credentials = { email: "pontus.burman@papabravo.se", password: "Kalle001!" };

function makeRequest(path, method, body, cookies) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (cookies) headers["Cookie"] = cookies;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    const options = { hostname: BASE_URL, path, method, headers };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        const setCookies = res.headers["set-cookie"];
        const cookieStr = setCookies ? setCookies.map(c => c.split(";")[0]).join("; ") : null;
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), cookieStr }); }
        catch { resolve({ status: res.statusCode, data: raw, cookieStr }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=== Login ===");
  const loginRes = await makeRequest("/api/auth/login", "POST", credentials);
  console.log("Status:", loginRes.status);
  console.log("Cookie:", loginRes.cookieStr ? "received" : "none");
  const cookies = loginRes.cookieStr;
  if (!cookies) { console.log("Login failed"); return; }
  const endpoints = ["/api/categories", "/api/activities", "/api/rewards", "/api/features"];
  for (const path of endpoints) {
    console.log("");
    console.log("=== " + path + " ===");
    const res = await makeRequest(path, "GET", null, cookies);
    console.log("Status:", res.status);
    if (Array.isArray(res.data)) {
      console.log("Length:", res.data.length);
      if (res.data.length > 0) console.log("First:", JSON.stringify(res.data[0], null, 2));
    } else if (typeof res.data === "object") {
      console.log("Keys:", Object.keys(res.data));
      console.log("Data:", JSON.stringify(res.data, null, 2));
    } else { console.log("Data:", res.data); }
  }
}

main().catch(console.error);
