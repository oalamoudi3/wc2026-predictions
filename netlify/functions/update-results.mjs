// =====================================================================
//  update-results  —  Netlify Scheduled Function
//  Runs on a cron (see netlify.toml). On every run it:
//    1. Pulls all World Cup 2026 matches from football-data.org
//       (the SINGLE source of truth — no other feed is ever written)
//    2. Upserts fixtures + final scores into Supabase (service role)
//    3. Derives champion / finalists / semifinalists for bonus scoring
//    4. Sets the bonus lock time to the first kickoff
//  No manual score entry is ever needed. If football-data is briefly
//  unavailable (e.g. free-tier rate limit) the run is a no-op and the next
//  cron retries — so the data never mixes sources or duplicates.
// =====================================================================

import { createClient } from "@supabase/supabase-js";

const FD_URL = "https://api.football-data.org/v4/competitions/WC/matches";

// football-data.org stage  ->  our label is identical; we keep their strings.
const KNOCKOUT = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];

// ---- helpers --------------------------------------------------------
function groupLabel(g) {
  if (!g) return null;
  // football-data.org returns e.g. "GROUP_A"
  const m = String(g).match(/GROUP[_ ]?([A-L])/i);
  return m ? `Group ${m[1].toUpperCase()}` : null;
}

function winnerToTeam(match) {
  if (match.winner === "HOME_TEAM") return match.home_team;
  if (match.winner === "AWAY_TEAM") return match.away_team;
  return null;
}

// Map a raw football-data.org match object to our row shape.
function fromFootballData(m) {
  const sc = m.score ?? {};
  const ft = sc.fullTime ?? {};
  const rt = sc.regularTime, et = sc.extraTime, pen = sc.penalties;
  // SCORING SCORE = the football result at the end of regular + extra time (the
  // real draw for a shootout). football-data folds the penalty goals into
  // `fullTime`, so we use regularTime+extraTime directly — robust even when the
  // feed's fullTime/penalties are momentarily inconsistent (which can otherwise
  // yield a negative score). Penalties are display-only; `winner` drives the advancer.
  let home_score = ft.home ?? null;
  let away_score = ft.away ?? null;
  if (sc.duration === "PENALTY_SHOOTOUT") {
    if (rt && rt.home != null && rt.away != null) {
      home_score = rt.home + (et?.home ?? 0);
      away_score = rt.away + (et?.away ?? 0);
    } else if (pen && ft.home != null && ft.away != null) {
      home_score = Math.max(0, ft.home - (pen.home ?? 0));
      away_score = Math.max(0, ft.away - (pen.away ?? 0));
    }
  }
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
    home_score,
    away_score,
    winner: sc.winner ?? null,
    decided_by: sc.duration ?? null,           // REGULAR / EXTRA_TIME / PENALTY_SHOOTOUT (display only)
    pen_home: pen?.home ?? null,               // shootout score (display only)
    pen_away: pen?.away ?? null,
    updated_at: new Date().toISOString(),
  };
}

// The ONLY source: football-data.org. Returns [] on any failure/rate-limit,
// in which case the caller keeps existing data and waits for the next run.
async function fetchFootballData(token) {
  if (!token) return [];
  try {
    const res = await fetch(FD_URL, { headers: { "X-Auth-Token": token } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.matches) && data.matches.length) {
        return data.matches.map(fromFootballData);
      }
    } else {
      console.warn("football-data.org responded", res.status);
    }
  } catch (e) {
    console.warn("football-data.org fetch failed:", e.message);
  }
  return [];
}

// Derive the actual semifinalists / finalists / champion from knockout rows.
function deriveOutcomes(rows) {
  const teamsIn = (stage) => {
    const out = new Set();
    rows
      .filter((r) => r.stage === stage)
      .forEach((r) => {
        if (r.home_team) out.add(r.home_team);
        if (r.away_team) out.add(r.away_team);
      });
    return [...out];
  };
  const semifinalists = teamsIn("SEMI_FINALS");
  const finalists = teamsIn("FINAL");
  const finalRow = rows.find((r) => r.stage === "FINAL" && r.status === "FINISHED");
  const champion = finalRow ? winnerToTeam(finalRow) : null;
  return { semifinalists, finalists, champion };
}

// Compute live group tables + the 8 best third-placed teams (FIFA-style
// ordering: points, then goal difference, then goals for). Best thirds are
// only finalised from groups that have played all their matches.
function computeGroupTables(rows) {
  const groups = {};
  rows
    .filter((r) => r.stage === "GROUP_STAGE" && r.grp)
    .forEach((r) => {
      const g = (groups[r.grp] ??= new Map());
      const ensure = (t) => {
        if (!t) return null;
        if (!g.has(t)) g.set(t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
        return g.get(t);
      };
      const h = ensure(r.home_team), a = ensure(r.away_team);
      if (h && a && r.status === "FINISHED" && r.home_score != null && r.away_score != null) {
        h.p++; a.p++;
        h.gf += r.home_score; h.ga += r.away_score;
        a.gf += r.away_score; a.ga += r.home_score;
        if (r.home_score > r.away_score) { h.w++; a.l++; h.pts += 3; }
        else if (r.home_score < r.away_score) { a.w++; h.l++; a.pts += 3; }
        else { h.d++; a.d++; h.pts++; a.pts++; }
      }
    });
  const cmp = (x, y) =>
    y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team);

  const allGroups = Object.keys(groups);
  const groupRows = [];
  const thirds = [];
  for (const [grp, m] of Object.entries(groups)) {
    // Only record FINAL standings for groups that have actually finished all
    // their matches — otherwise provisional (all-zero, alphabetical) ordering
    // would award group points before any match is played.
    const complete = m.size === 4 && [...m.values()].every((t) => t.p >= 3);
    if (!complete) continue;
    const ordered = [...m.values()].sort(cmp);
    groupRows.push({
      grp,
      pos1: ordered[0]?.team ?? null,
      pos2: ordered[1]?.team ?? null,
      pos3: ordered[2]?.team ?? null,
      pos4: ordered[3]?.team ?? null,
      updated_at: new Date().toISOString(),
    });
    if (ordered[2]) thirds.push(ordered[2]);
  }
  // The best-8 third-placed teams is a tournament-wide ranking, so it is only
  // meaningful — and only scored — once EVERY group has finished. Until then we
  // return an empty list, so no "best third" points are awarded prematurely.
  const allComplete = allGroups.length > 0 && groupRows.length === allGroups.length;
  const bestThirds = allComplete ? thirds.sort(cmp).slice(0, 8).map((t) => t.team) : [];
  return { groupRows, bestThirds };
}

// ---- main handler ---------------------------------------------------
export default async function handler() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const incoming = await fetchFootballData(FOOTBALL_DATA_TOKEN);
  const source = "football-data.org";
  if (!incoming.length) {
    // football-data unavailable (e.g. free-tier rate limit). Do nothing this
    // run — existing fixtures stay intact and the next cron retries. We never
    // write any other feed, so the data can never mix sources or duplicate.
    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true });
    const msg = `football-data unavailable; kept existing ${count ?? 0} fixtures (retry next run)`;
    console.log(msg);
    return new Response(msg, { status: 200 });
  }

  // ---- Sticky merge: never let a match go backwards -------------------
  // football-data's free ("delayed") feed flickers: one request says
  // IN_PLAY 2-0, the next says TIMED/null for the same match. Without this,
  // each run would overwrite the DB and the score would appear/disappear.
  // Rule: keep the more-advanced status, and never replace a real score with
  // null. Scores only move forward (TIMED → IN_PLAY → FINISHED).
  const { data: existingRows } = await supabase
    .from("matches")
    .select("id,status,home_score,away_score,winner");
  const existing = new Map((existingRows || []).map((r) => [r.id, r]));
  const rank = (s) =>
    s === "FINISHED" || s === "AWARDED" ? 2 : s === "IN_PLAY" || s === "PAUSED" ? 1 : 0;
  const rows = incoming.map((r) => {
    const e = existing.get(r.id);
    if (!e) return r;
    // feed regressed (e.g. back to TIMED) → keep what we already had
    if (rank(e.status) > rank(r.status)) {
      return { ...r, status: e.status, home_score: e.home_score, away_score: e.away_score, winner: e.winner };
    }
    // same/forward status but feed dropped the score → keep the known score
    if ((r.home_score == null || r.away_score == null) && e.home_score != null && e.away_score != null) {
      return { ...r, home_score: e.home_score, away_score: e.away_score, winner: r.winner ?? e.winner };
    }
    return r;
  });

  // Upsert the merged (forward-only) rows.
  const { error: upErr } = await supabase.from("matches").upsert(rows, { onConflict: "id" });
  if (upErr) {
    console.error("matches upsert error:", upErr);
    return new Response("DB upsert failed: " + upErr.message, { status: 500 });
  }

  // Bonus lock = END of the last matchday-1 game (≈ kickoff + 2h). This gives
  // everyone until the whole first round is played to refine their group order
  // and bracket (more skill). Falls back to the first kickoff if matchday 1
  // can't be identified.
  const md1 = rows
    .filter((r) => r.stage === "GROUP_STAGE" && r.matchday === 1 && r.kickoff)
    .map((r) => r.kickoff)
    .sort();
  let lockAt = null;
  if (md1.length) {
    lockAt = new Date(new Date(md1[md1.length - 1]).getTime() + 2 * 60 * 60 * 1000).toISOString();
  } else {
    lockAt = rows.map((r) => r.kickoff).filter(Boolean).sort()[0] || null;
  }
  if (lockAt) {
    await supabase.from("app_config").update({ bonus_locks_at: lockAt }).eq("id", 1);
  }

  // Tournament outcomes for bonus scoring (core — always present).
  const outcomes = deriveOutcomes(rows);
  await supabase
    .from("tournament_results")
    .update({
      champion: outcomes.champion,
      finalists: outcomes.finalists,
      semifinalists: outcomes.semifinalists,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  // Extra-prediction outcomes (group standings + best thirds). These depend on
  // predictions.sql having been run; if it hasn't, fail soft so the core
  // matches/bonus pipeline keeps working.
  const { groupRows, bestThirds } = computeGroupTables(rows);
  const { error: btErr } = await supabase
    .from("tournament_results")
    .update({ best_thirds: bestThirds })
    .eq("id", 1);
  if (btErr) console.warn("best_thirds update skipped (run predictions.sql?):", btErr.message);
  if (groupRows.length) {
    const { error: grErr } = await supabase.from("group_results").upsert(groupRows, { onConflict: "grp" });
    if (grErr) console.warn("group_results upsert skipped (run predictions.sql?):", grErr.message);
  }

  const finished = rows.filter((r) => r.status === "FINISHED").length;
  const summary = `OK — source=${source}, matches=${rows.length}, finished=${finished}, champion=${outcomes.champion ?? "—"}`;
  console.log(summary);
  return new Response(summary, { status: 200 });
}

// Run every 2 minutes so live/final scores surface quickly during matches.
// (football-data.org free tier allows 10 requests/min; we make 1 per run.)
export const config = { schedule: "*/2 * * * *" };
