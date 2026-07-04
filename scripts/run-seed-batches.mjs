// Seeds estraha6-db by copying match rows from the World Cup project via MCP-sized SQL batches.
// Run: node scripts/run-seed-batches.mjs
// Requires writing batch files first: node scripts/make-seed-batches.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const batchDir = join(root, "scripts", "seed-batches");

const batches = readdirSync(batchDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${batches.length} batch files. Run each via Supabase execute_sql on rodqybmuajlebyotmgmq.`);
for (const f of batches) {
  const q = readFileSync(join(batchDir, f), "utf8");
  console.log(`\n--- ${f} (${q.length} chars) ---`);
}
