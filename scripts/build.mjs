// Generates site-specific assets from Netlify environment variables at build time.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

const groupName = process.env.SITE_GROUP_NAME || "استراحة 6";
const tagline =
  process.env.SITE_TAGLINE ||
  `توقّعات لـ${groupName}. بطلٌ واحد. وافتخارٌ طوال الصيف.`;
const boardEmpty =
  process.env.SITE_BOARD_EMPTY ||
  `🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا ${groupName} وابدؤوا التوقّع!`;

const configJs = `// Auto-generated at build time — do not edit. Set values in Netlify env vars.
window.APP_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL)},
  SUPABASE_ANON_KEY: ${JSON.stringify(process.env.SUPABASE_ANON_KEY)},
  SITE_GROUP_NAME: ${JSON.stringify(groupName)},
  SITE_TAGLINE: ${JSON.stringify(tagline)},
  SITE_BOARD_EMPTY: ${JSON.stringify(boardEmpty)},
};
`;

writeFileSync(join(root, "assets", "config.js"), configJs, "utf8");

const htmlPath = join(root, "index.template.html");
let html = readFileSync(htmlPath, "utf8");
const title = `${groupName} — كأس العالم 2026`;
html = html
  .replace(/__SITE_TITLE__/g, title)
  .replace(/__SITE_GROUP_NAME__/g, groupName)
  .replace(/__SITE_TAGLINE__/g, tagline);
writeFileSync(join(root, "index.html"), html, "utf8");

console.log(`Built config for "${groupName}" → assets/config.js`);
