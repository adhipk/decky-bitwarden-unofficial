import deckyPlugin from "@decky/rollup";
import fs from "fs";
import path from "path";

function parseEnvFile(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function readLocalEnv() {
  // Read .env.local first, then .env (both are gitignored here).
  const candidates = [".env.local", ".env"];
  const merged = {};
  for (const filename of candidates) {
    const full = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(full)) continue;
    const data = parseEnvFile(fs.readFileSync(full, "utf-8"));
    Object.assign(merged, data);
  }
  return merged;
}

function inlineReplace(replacements) {
  const entries = Object.entries(replacements);
  return {
    name: "inline-replace-constants",
    transform(code) {
      let out = code;
      for (const [from, to] of entries) {
        out = out.split(from).join(to);
      }
      return { code: out, map: null };
    },
  };
}

export default deckyPlugin({
  // Add your extra Rollup options here
  plugins: [
    // Build-time frontend dev prefill (optional).
    //
    // Put these in `.env` or `.env.local`:
    //   DECKY_BW_LOGIN_EMAIL="me@example.com"
    //   DECKY_BW_LOGIN_PASSWORD="secret"
    //
    // (Also supported: DECKY_BW_DEV_EMAIL / DECKY_BW_DEV_PASSWORD)
    //
    // NOTE: this injects values into the built JS bundle. Do NOT ship with secrets set.
    inlineReplace((() => {
      const envFile = readLocalEnv();
      const email =
        process.env.DECKY_BW_LOGIN_EMAIL ??
        envFile.DECKY_BW_LOGIN_EMAIL ??
        process.env.DECKY_BW_DEV_EMAIL ??
        envFile.DECKY_BW_DEV_EMAIL ??
        "";
      const password =
        process.env.DECKY_BW_LOGIN_PASSWORD ??
        envFile.DECKY_BW_LOGIN_PASSWORD ??
        process.env.DECKY_BW_DEV_PASSWORD ??
        envFile.DECKY_BW_DEV_PASSWORD ??
        "";
      return {
        __DECKY_BW_DEV_EMAIL__: JSON.stringify(email),
        __DECKY_BW_DEV_PASSWORD__: JSON.stringify(password),
      };
    })()),
  ],
})