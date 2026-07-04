// Split seed SQL into batches for MCP execute_sql size limits.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(join(root, "scripts", "seed-estraha6.sql"), "utf8")
  .replace(/^--.*\r?\n/m, "")
  .replace(/Cura├دao/g, "Curaçao");

const conflictIdx = sql.indexOf("ON CONFLICT");
const insertPart = sql.slice(0, conflictIdx);
const tail = sql.slice(conflictIdx);
const valuesIdx = insertPart.indexOf("VALUES");
const header = insertPart.slice(0, valuesIdx + "VALUES".length + 1);
const valuesBody = insertPart.slice(valuesIdx + "VALUES".length + 1).trim().replace(/,\s*$/, "");

const rows = valuesBody.split(/\),\r?\n\(/).map((r, i, arr) => {
  if (i === 0) return r.replace(/^\(/, "");
  if (i === arr.length - 1) return r.replace(/\)$/, "");
  return r;
});

const batchSize = 52;
for (let i = 0; i < rows.length; i += batchSize) {
  const chunk = rows.slice(i, i + batchSize).map((r) => `(${r})`).join(",\n");
  const batchNum = Math.floor(i / batchSize) + 1;
  const q = `${header}${chunk}\n${tail}`;
  writeFileSync(join(root, "scripts", `seed-batch-${batchNum}.sql`), q);
  console.log(`seed-batch-${batchNum}.sql: ${Math.min(batchSize, rows.length - i)} rows`);
}
