// Fetches World Cup fixtures and prints a Postgres upsert SQL statement.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FD_URL = "https://api.football-data.org/v4/competitions/WC/matches";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : null;
const token = process.env.FOOTBALL_DATA_TOKEN;
if (!token) {
  console.error("Set FOOTBALL_DATA_TOKEN");
  process.exit(1);
}

function groupLabel(g) {
  if (!g) return null;
  const m = String(g).match(/GROUP[_ ]?([A-L])/i);
  return m ? `Group ${m[1].toUpperCase()}` : null;
}

function fromFootballData(m) {
  const ft = m.score?.fullTime ?? {};
  return {
    id: m.id,
    stage: m.stage,
    grp: groupLabel(m.group),
    matchday: m.matchday ?? null,
    kickoff: m.utcDate,
    home_team: m.homeTeam?.name ?? null,
    away_team: m.awayTeam?.name ?? null,
    home_crest: m.homeTeam?.crest ?? null,
    away_crest: m.awayTeam?.crest ?? null,
    status: m.status ?? "SCHEDULED",
    home_score: ft.home ?? null,
    away_score: ft.away ?? null,
    winner: m.score?.winner ?? null,
    updated_at: new Date().toISOString(),
  };
}

function sqlVal(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

const res = await fetch(FD_URL, { headers: { "X-Auth-Token": token } });
if (!res.ok) {
  console.error("football-data.org error:", res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
const rows = (data.matches || []).map(fromFootballData);
if (!rows.length) {
  console.error("No matches returned");
  process.exit(1);
}

const cols = [
  "id", "stage", "grp", "matchday", "kickoff", "home_team", "away_team",
  "home_crest", "away_crest", "status", "home_score", "away_score", "winner", "updated_at",
];

const values = rows
  .map((r) => `(${cols.map((c) => sqlVal(r[c])).join(", ")})`)
  .join(",\n");

const firstKickoff = rows.map((r) => r.kickoff).filter(Boolean).sort()[0];

const lines = [
  `-- ${rows.length} matches`,
  `INSERT INTO matches (${cols.join(", ")}) VALUES`,
  values,
  `ON CONFLICT (id) DO UPDATE SET
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
  updated_at = EXCLUDED.updated_at;`,
];
if (firstKickoff) {
  lines.push(`UPDATE app_config SET bonus_locks_at = ${sqlVal(firstKickoff)} WHERE id = 1;`);
}
const sql = lines.join("\n");
if (outFile) {
  writeFileSync(outFile, sql, "utf8");
  console.error(`Wrote ${rows.length} matches to ${outFile}`);
} else {
  console.log(sql);
}
