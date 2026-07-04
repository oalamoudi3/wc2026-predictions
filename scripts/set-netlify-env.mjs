// Sets per-site Netlify env vars. Usage:
//   node scripts/set-netlify-env.mjs estraha6
//   node scripts/set-netlify-env.mjs wc2026
// Optional: SUPABASE_SERVICE_ROLE_KEY and FOOTBALL_DATA_TOKEN in environment.

import { execSync } from "node:child_process";

const site = process.argv[2];
const sites = {
  estraha6: {
    id: "7bcbff48-13f4-419d-97d3-c876d44d669f",
    vars: {
      SUPABASE_URL: "https://rodqybmuajlebyotmgmq.supabase.co",
      SUPABASE_ANON_KEY: "sb_publishable_HqmySh_KmRBO-UMKMnPTCA_9SB7wnV8",
      FOOTBALL_DATA_TOKEN: "c1f8079b0d644de2b86381c6aad8ddc3",
      SITE_GROUP_NAME: "استراحة 6",
      SITE_TAGLINE: "توقّعات لاستراحة 6. بطلٌ واحد. وافتخارٌ طوال الصيف.",
      SITE_BOARD_EMPTY: "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا استراحة 6 وابدؤوا التوقّع!",
    },
  },
  wc2026: {
    id: "e3e9df13-7fd8-408e-a5e9-d04c93da0c1c",
    vars: {
      SUPABASE_URL: "https://aihjrgdzglrerkuxatvv.supabase.co",
      SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpaGpyZ2R6Z2xyZXJrdXhhdHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDc5NjEsImV4cCI6MjA5NjIyMzk2MX0.P9f2uW1_g3SxDvaKRcJafx5fXUED6oGGozskDNAjPk4",
      SITE_GROUP_NAME: "العائلة",
      SITE_TAGLINE: "توقّعات العائلة. بطلٌ واحد. وافتخارٌ طوال الصيف.",
      SITE_BOARD_EMPTY: "🏆 يظهر الترتيب عند انطلاق كأس العالم. سجّلوا توقعاتكم وابدؤوا التوقّع!",
    },
  },
};

const cfg = sites[site];
if (!cfg) {
  console.error("Usage: node scripts/set-netlify-env.mjs <estraha6|wc2026>");
  process.exit(1);
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  cfg.vars.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
}
if (process.env.FOOTBALL_DATA_TOKEN && site === "wc2026") {
  cfg.vars.FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
}

// Netlify CLI applies env:set to the linked site only — link first.
try {
  execSync("netlify unlink", { stdio: "ignore", shell: true });
} catch {
  /* not linked */
}
execSync(`netlify link --id ${cfg.id}`, { stdio: "inherit", shell: true });

for (const [key, value] of Object.entries(cfg.vars)) {
  console.log(`Setting ${key} on ${site}...`);
  execSync(
    `netlify env:set ${key} ${JSON.stringify(value)} --context production --force`,
    { stdio: "inherit", shell: true }
  );
}
console.log("Done. Trigger a redeploy so build-time config is regenerated.");
