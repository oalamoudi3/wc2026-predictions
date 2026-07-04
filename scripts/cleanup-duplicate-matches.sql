-- =====================================================================
--  Remove duplicate fixtures created by the openfootball fallback.
--  Symptom: teams appear twice in a group (e.g. "Czechia" + "Czech Republic",
--  "Bosnia-Herzegovina" + "Bosnia & Herzegovina").
--
--  Cause: when football-data.org was briefly rate-limited, the scheduled
--  function fell back to openfootball, which inserts a SECOND copy of all 104
--  matches with different (negative) ids and slightly different names.
--  (The function has since been fixed to never do this when the DB already
--  has fixtures, so this only needs running once per project.)
--
--  Run this in the Supabase SQL Editor of the affected project.
--  It is SAFE: it only deletes the duplicate (negative-id) rows, and only
--  when the real football-data set exists and the duplicate carries no user
--  predictions — so no real fixture or pick is ever lost.
-- =====================================================================

-- 1) Inspect what's there ---------------------------------------------
select
  count(*)                                  as total_matches,
  count(*) filter (where id < 0)            as openfootball_duplicates,
  count(*) filter (where id > 0)            as football_data_real,
  (select count(*) from predictions p where p.match_id < 0) as predictions_on_duplicates
from matches;

-- 2) Safe cleanup ------------------------------------------------------
-- Deletes a duplicate row only if (a) the real positive-id set exists and
-- (b) nobody predicted on that duplicate row.
delete from matches m
where m.id < 0
  and exists (select 1 from matches q where q.id > 0)
  and not exists (select 1 from predictions p where p.match_id = m.id);

-- 3) Verify (should now be 104, all positive) -------------------------
select
  count(*)                       as total_matches,
  count(*) filter (where id < 0) as remaining_duplicates
from matches;
