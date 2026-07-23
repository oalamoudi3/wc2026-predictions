// Build with a site's config, then deploy to production.
// Usage: node scripts/deploy-site.mjs estraha6|wc2026

import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sites = {
  estraha6: {
    id: "7bcbff48-13f4-419d-97d3-c876d44d669f",
    vars: {
      SUPABASE_URL: "https://rodqybmuajlebyotmgmq.supabase.co",
      SUPABASE_ANON_KEY: "sb_publishable_HqmySh_KmRBO-UMKMnPTCA_9SB7wnV8",
      FOOTBALL_DATA_TOKEN: "c1f8079b0d644de2b86381c6aad8ddc3",
      SITE_GROUP_NAME: "استراحة 6",
      SITE_TAGLINE: "توقّعات لاستراحة 6. بطلٌ واحد. وافتخارٌ طوال الصيف.",
      SITE_BOARD_EMPTY:
        "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا استراحة 6 وابدؤوا التوقّع!",
    },
  },
  wc2026: {
    id: "e3e9df13-7fd8-408e-a5e9-d04c93da0c1c",
    vars: {
      SUPABASE_URL: "https://aihjrgdzglrerkuxatvv.supabase.co",
      SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpaGpyZ2R6Z2xyZXJrdXhhdHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDc5NjEsImV4cCI6MjA5NjIyMzk2MX0.P9f2uW1_g3SxDvaKRcJafx5fXUED6oGGozskDNAjPk4",
      FOOTBALL_DATA_TOKEN: "c1f8079b0d644de2b86381c6aad8ddc3",
      SITE_GROUP_NAME: "البناء",
      SITE_TAGLINE: "توقّعات البناء. بطلٌ واحد. وافتخارٌ طوال الصيف.",
      SITE_BOARD_EMPTY:
        "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا توقعاتكم وابدؤوا التوقّع!",
    },
  },
};

const site = process.argv[2];
const cfg = sites[site];
if (!cfg) {
  console.error("Usage: node scripts/deploy-site.mjs <estraha6|wc2026>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  execSync("netlify unlink", { stdio: "ignore", shell: true, cwd: root });
} catch {
  /* not linked */
}
execSync(`netlify link --id ${cfg.id}`, { stdio: "inherit", shell: true, cwd: root });

const buildEnv = { ...process.env, ...cfg.vars };
console.log(`Building for ${site} (${cfg.vars.SITE_GROUP_NAME})...`);
execSync("node scripts/build.mjs", { stdio: "inherit", cwd: root, env: buildEnv });

console.log(`Deploying ${site}...`);
execSync("netlify deploy --prod --dir . --functions netlify/functions", {
  stdio: "inherit",
  shell: true,
  cwd: root,
});

console.log(`Done: ${site}`);
