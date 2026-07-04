// Creates scripts/seed-batches/*.sql — ~20 rows each for MCP execute_sql.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "scripts", "seed-batches");
mkdirSync(outDir, { recursive: true });

const sql = readFileSync(join(root, "scripts", "seed-estraha6.sql"), "utf8")
  .replace(/^\uFEFF/, "")
  .replace(/^--[^\r\n]*[\r\n]+/, "")
  .replace(/Cura├دao/g, "Curaçao");

const conflictIdx = sql.indexOf("ON CONFLICT");
const insertPart = sql.slice(0, conflictIdx);
const tail = sql.slice(conflictIdx);
const valuesIdx = insertPart.indexOf("VALUES");
const header = insertPart.slice(0, valuesIdx + "VALUES".length + 1);
const valuesBody = insertPart.slice(valuesIdx + "VALUES".length + 1).trim().replace(/,\s*$/, "");

// Split on "),(" boundaries between row tuples
const rowStrings = valuesBody.split(/\),\r?\n\(/).map((r, i, arr) => {
  let s = r;
  if (i === 0) s = s.replace(/^\(/, "");
  if (i === arr.length - 1) s = s.replace(/\)$/, "");
  return s;
});

const batchSize = 20;
let batchNum = 0;
for (let i = 0; i < rowStrings.length; i += batchSize) {
  batchNum++;
  const chunk = rowStrings.slice(i, i + batchSize).map((r) => `(${r})`).join(",\n");
  const isLast = i + batchSize >= rowStrings.length;
  const q = isLast
    ? `${header}${chunk}\n${tail}`
    : `${header}${chunk}\nON CONFLICT (id) DO UPDATE SET
  stage = EXCLUDED.stage,
  grp = EXCLUDED.grp,
  matchday = EXCLUDED.matchday,
  kickoff = EXCLUDED.kickoff,
  home_team = EXCLUDED.home_team,
  away_team = EXCLUDED.away_team,
  home_crest = EXCLUDED.home_crest,
  away_crest = EXCLUDED.away_crest,
  status = EXCLUDED.status,
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  winner = EXCLUDED.winner,
  updated_at = EXCLUDED.updated_at;`;
  writeFileSync(join(outDir, `batch-${String(batchNum).padStart(2, "0")}.sql`), q, "utf8");
}
console.log(`Wrote ${batchNum} batches (${rowStrings.length} rows) to scripts/seed-batches/`);
