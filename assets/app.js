// =====================================================================
//  كأس العالم 2026 — استراحة 6 — منطق الواجهة الأمامية (عربي / RTL)
//  يتصل المتصفح مباشرة بـ Supabase. أمان الصفوف (RLS) في قاعدة البيانات
//  هو ما يحمي البيانات فعليًا، ومفتاح anon هنا عامٌّ عن قصد.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.APP_CONFIG || {};

// إذا كان إعداد Supabase ناقصًا أو غير صالح، نعرض رسالة واضحة بدل صفحة فارغة.
function showConfigError(detail) {
  const safe = String(detail ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const box = document.createElement("div");
  box.setAttribute("dir", "rtl");
  box.style.cssText =
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
    "padding:24px;background:#0b1220;color:#e8eefc;font-family:Cairo,system-ui,sans-serif;z-index:9999";
  box.innerHTML =
    '<div style="max-width:520px;text-align:center;background:#111a2e;border:1px solid #24304d;' +
    'border-radius:16px;padding:28px 24px;line-height:1.9">' +
    '<div style="font-size:40px;margin-bottom:8px">⚠️</div>' +
    '<h2 style="margin:0 0 10px">تعذّر تحميل التطبيق</h2>' +
    '<p style="margin:0 0 6px">إعداد Supabase غير صالح. يجب ضبط متغيّرات البيئة ' +
    '<b>SUPABASE_URL</b> و<b>SUPABASE_ANON_KEY</b> في Netlify ثم إعادة النشر.</p>' +
    '<p style="margin:8px 0 0;opacity:.6;font-size:13px">' + safe + "</p></div>";
  document.body.appendChild(box);
}

function validSupabaseUrl(u) {
  if (!u || u.includes("YOUR-PROJECT")) return false;
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

let sb;
if (!validSupabaseUrl(cfg.SUPABASE_URL) || !cfg.SUPABASE_ANON_KEY) {
  showConfigError("SUPABASE_URL: " + (cfg.SUPABASE_URL || "(فارغ)"));
  throw new Error("Invalid Supabase configuration — app halted.");
}
sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

// أسماء الأدوار بالعربية
const STAGE_LABEL = {
  GROUP_STAGE: "دور المجموعات",
  LAST_32: "دور الـ32", LAST_16: "دور الـ16", QUARTER_FINALS: "ربع النهائي",
  SEMI_FINALS: "نصف النهائي", THIRD_PLACE: "تحديد المركز الثالث", FINAL: "النهائي",
};
const FIXTURES_PROXY_URL = "/.netlify/functions/fixtures";
const STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
const STAGE_ALL = ["GROUP_STAGE", ...STAGE_ORDER];
const STAGE_TO_BRKEY = { LAST_32: "r32", LAST_16: "r16", QUARTER_FINALS: "qf", SEMI_FINALS: "sf", FINAL: "f" };
const isKnockout = (m) => m.stage && m.stage !== "GROUP_STAGE";

// المرحلة الحالية = مرحلة أقرب مباراة لم تنتهِ (من بين المراحل المعطاة).
// تُستخدم لفتح المرحلة الجارية فقط وطيّ البقية.
function activeStage(stagesPresent) {
  const next = state.matches
    .filter((m) => stagesPresent.includes(m.stage) && m.status !== "FINISHED")
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
  if (next) return next.stage;
  for (let i = STAGE_ALL.length - 1; i >= 0; i--) {
    if (stagesPresent.includes(STAGE_ALL[i])) return STAGE_ALL[i];
  }
  return stagesPresent[0];
}
const stageLabel = (s) => STAGE_LABEL[s] || String(s).replace(/_/g, " ");
const grpName = (g) => (g ? String(g).replace(/Group/i, "المجموعة") : g);

// أسماء المنتخبات بالعربية (يُستخدم الاسم الأصلي إن لم يوجد)
const AR_TEAM = {
  "Argentina":"الأرجنتين","Brazil":"البرازيل","France":"فرنسا","England":"إنجلترا","Spain":"إسبانيا",
  "Germany":"ألمانيا","Portugal":"البرتغال","Netherlands":"هولندا","Belgium":"بلجيكا","Italy":"إيطاليا",
  "Croatia":"كرواتيا","Uruguay":"الأوروغواي","Mexico":"المكسيك","United States":"الولايات المتحدة",
  "Bosnia-Herzegovina":"البوسنة والهرسك","Cape Verde Islands":"الرأس الأخضر","Congo DR":"الكونغو الديمقراطية",
  "USA":"الولايات المتحدة","Canada":"كندا","Japan":"اليابان","South Korea":"كوريا الجنوبية",
  "Korea Republic":"كوريا الجنوبية","Australia":"أستراليا","Morocco":"المغرب","Senegal":"السنغال",
  "Ghana":"غانا","Nigeria":"نيجيريا","Cameroon":"الكاميرون","Egypt":"مصر","Tunisia":"تونس",
  "Algeria":"الجزائر","Saudi Arabia":"السعودية","Qatar":"قطر","Iran":"إيران","IR Iran":"إيران",
  "Iraq":"العراق","United Arab Emirates":"الإمارات","Jordan":"الأردن","Oman":"عُمان","Kuwait":"الكويت",
  "Bahrain":"البحرين","Palestine":"فلسطين","Lebanon":"لبنان","Syria":"سوريا","Switzerland":"سويسرا",
  "Denmark":"الدنمارك","Sweden":"السويد","Norway":"النرويج","Poland":"بولندا","Serbia":"صربيا",
  "Czechia":"التشيك","Czech Republic":"التشيك","Austria":"النمسا","Wales":"ويلز","Scotland":"اسكتلندا",
  "Republic of Ireland":"أيرلندا","Ireland":"أيرلندا","Ukraine":"أوكرانيا","Turkey":"تركيا",
  "Türkiye":"تركيا","Greece":"اليونان","Colombia":"كولومبيا","Chile":"تشيلي","Peru":"بيرو",
  "Ecuador":"الإكوادور","Paraguay":"باراغواي","Venezuela":"فنزويلا","Bolivia":"بوليفيا",
  "Costa Rica":"كوستاريكا","Panama":"بنما","Jamaica":"جامايكا","Honduras":"هندوراس","Haiti":"هايتي",
  "South Africa":"جنوب أفريقيا","Ivory Coast":"ساحل العاج","Côte d'Ivoire":"ساحل العاج",
  "Cote d'Ivoire":"ساحل العاج","Mali":"مالي","Cape Verde":"الرأس الأخضر","DR Congo":"الكونغو الديمقراطية",
  "New Zealand":"نيوزيلندا","Uzbekistan":"أوزبكستان","Curaçao":"كوراساو","Curacao":"كوراساو",
  "Slovakia":"سلوفاكيا","Slovenia":"سلوفينيا","Hungary":"المجر","Romania":"رومانيا","Russia":"روسيا",
  "Finland":"فنلندا","Iceland":"آيسلندا","Albania":"ألبانيا","Bosnia and Herzegovina":"البوسنة والهرسك",
  "North Macedonia":"مقدونيا الشمالية","Montenegro":"الجبل الأسود","Georgia":"جورجيا","Israel":"إسرائيل",
  "Indonesia":"إندونيسيا","Thailand":"تايلاند","China PR":"الصين","China":"الصين","India":"الهند",
};
// بحث محصّن ضد اختلاف الترميز/التشكيل (مثل ç في Curaçao، أو المسافات).
// نطبّع المفاتيح والاسم الوارد إلى NFC حتى تتطابق دائمًا.
const _norm = (s) => String(s ?? "").normalize("NFC").trim();
const AR_TEAM_NORM = new Map(Object.entries(AR_TEAM).map(([k, v]) => [_norm(k), v]));
const teamName = (t) => (t ? (AR_TEAM_NORM.get(_norm(t)) || t) : "غير محدد");
const tn = (t) => esc(teamName(t));

const state = {
  user: null, profile: null,
  config: null, results: null,
  matches: [], myPreds: new Map(), othersPreds: new Map(),
  bonus: null, names: new Map(), authMode: "login",
  groupPreds: new Map(), thirdPred: { teams: [] },
  bracketPreds: new Map(), bracketOthers: new Map(),
  crests: new Map(), groupToggle: new Map(),
  bracketBuild: {},
};

// ---------- أدوات صغيرة ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isLocked = (m) => new Date(m.kickoff).getTime() <= Date.now();
const bonusLocked = () => state.config?.bonus_locks_at && new Date(state.config.bonus_locks_at).getTime() <= Date.now();
const crestFor = (t) => state.crests.get(t) || null;
const flagImg = (t, cls = "crest") => {
  const u = crestFor(t);
  return u ? `<img class="${cls}" src="${esc(u)}" alt="" onerror="this.style.visibility='hidden'"/>` : `<span class="${cls}"></span>`;
};

// ---- وقت السعودية (Asia/Riyadh = UTC+3) + تاريخ بالعربية ----
const SA_TZ = "Asia/Riyadh";
const AR = "ar";
const saDateKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: SA_TZ }); // YYYY-MM-DD
const fmtSADate = (iso) =>
  new Date(iso).toLocaleDateString(AR, { timeZone: SA_TZ, calendar: "gregory", numberingSystem: "latn", weekday: "long", day: "numeric", month: "long" });
const fmtSATime = (iso) =>
  new Date(iso).toLocaleTimeString(AR, { timeZone: SA_TZ, calendar: "gregory", numberingSystem: "latn", hour: "2-digit", minute: "2-digit" });
function fmtKick(iso) {
  return new Date(iso).toLocaleString(AR, {
    timeZone: SA_TZ, calendar: "gregory", numberingSystem: "latn",
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// جدول المجموعة محسوبًا من المباريات المنتهية
function groupStandings(groupName) {
  const ms = state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp === groupName);
  const table = new Map();
  const ensure = (t) => {
    if (!table.has(t)) table.set(t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
    return table.get(t);
  };
  ms.forEach((m) => {
    if (m.home_team) ensure(m.home_team);
    if (m.away_team) ensure(m.away_team);
    if (m.status === "FINISHED" && m.home_score != null && m.away_score != null) {
      const h = ensure(m.home_team), a = ensure(m.away_team);
      h.p++; a.p++;
      h.gf += m.home_score; h.ga += m.away_score;
      a.gf += m.away_score; a.ga += m.home_score;
      if (m.home_score > m.away_score) { h.w++; a.l++; h.pts += 3; }
      else if (m.home_score < m.away_score) { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    }
  });
  return [...table.values()].sort(
    (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team)
  );
}
function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " error" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = "toast"), 2400);
}

function fromFootballDataMatch(m) {
  const ft = m.score?.fullTime ?? {};
  const stage = m.stage || "GROUP_STAGE";
  const grp = m.group ? `Group ${String(m.group).replace(/GROUP_/i, "").replace(/_/g, " ")}` : null;
  return {
    id: m.id,
    stage,
    grp,
    matchday: m.matchday ?? null,
    kickoff: m.utcDate || null,
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

async function loadFootballDataMatches() {
  try {
    const res = await fetch(FIXTURES_PROXY_URL);
    if (!res.ok) throw new Error("fixtures proxy failed: " + res.status);
    const data = await res.json();
    return Array.isArray(data.matches) ? data.matches.map(fromFootballDataMatch) : [];
  } catch (e) {
    console.warn("Official fixtures unavailable:", e?.message || e);
    return [];
  }
}

function pointsFor(pred, m) {
  if (!pred || m.home_score == null || m.away_score == null) return 0;
  const P = state.config;
  if (pred.home_score === m.home_score && pred.away_score === m.away_score) return P.points_exact;
  const a = Math.sign(pred.home_score - pred.away_score);
  const b = Math.sign(m.home_score - m.away_score);
  return a === b ? P.points_result : 0;
}

// =====================================================================
//  تسجيل الدخول
// =====================================================================
function showAuth() { $("#auth-view").classList.remove("hidden"); $("#app-view").classList.add("hidden"); }
function showApp() { $("#auth-view").classList.add("hidden"); $("#app-view").classList.remove("hidden"); }

$$(".seg-btn").forEach((b) =>
  b.addEventListener("click", () => {
    if (!b.dataset.mode) return;
    state.authMode = b.dataset.mode;
    $$(".seg-btn").forEach((x) => x.classList.toggle("active", x === b));
    $("#name-field").style.display = state.authMode === "signup" ? "block" : "none";
    $("#auth-submit").textContent = state.authMode === "signup" ? "إنشاء حساب" : "تسجيل الدخول";
    $("#password").autocomplete = state.authMode === "signup" ? "new-password" : "current-password";
    $("#auth-msg").textContent = "";
  })
);

$("#auth-submit").addEventListener("click", async () => {
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const name = $("#display-name").value.trim();
  const msg = $("#auth-msg");
  msg.className = "msg"; msg.textContent = "";
  if (!email || !password) { msg.className = "msg error"; msg.textContent = "البريد وكلمة المرور مطلوبان."; return; }

  $("#auth-submit").disabled = true;
  try {
    if (state.authMode === "signup") {
      if (!name) { throw new Error("الرجاء إدخال اسمك."); }
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      state._pendingName = name;
      if (!data.session) {
        msg.textContent = "تم إنشاء الحساب. تحقّق من بريدك للتأكيد ثم سجّل الدخول.";
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (e) {
    msg.className = "msg error"; msg.textContent = e.message || "حدث خطأ ما.";
  } finally {
    $("#auth-submit").disabled = false;
  }
});

$("#logout").addEventListener("click", () => sb.auth.signOut());

// ---- استعادة كلمة المرور (نسيت كلمة المرور / رابط الاسترجاع) ----
let isRecovery = false;
function showRecovery() {
  $("#auth-view")?.classList.add("hidden");
  $("#app-view")?.classList.add("hidden");
  $("#recovery-view")?.classList.remove("hidden");
}
$("#forgot-link")?.addEventListener("click", async () => {
  const email = $("#email").value.trim();
  const msg = $("#auth-msg");
  if (!email) { msg.className = "msg error"; msg.textContent = "أدخل بريدك الإلكتروني أولًا ثم اضغط «نسيت كلمة المرور؟»."; return; }
  const btn = $("#forgot-link"); btn.disabled = true;
  // redirectTo = نفس عنوان الموقع، حتى يعود الرابط إلى الموقع لا إلى localhost
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  btn.disabled = false;
  if (error) {
    const sec = /after (\d+) seconds/i.exec(error.message || "");
    if (sec) {
      // ليست مشكلة: أُرسل الرابط بالفعل، وهذا مجرد حدّ زمني لمنع التكرار.
      msg.className = "msg";
      msg.textContent = `تم إرسال الرابط بالفعل. تحقّق من بريدك (ومجلّد «المهملات»/«العروض»). يمكنك إعادة المحاولة بعد ${sec[1]} ثانية.`;
    } else {
      msg.className = "msg error"; msg.textContent = error.message;
    }
    return;
  }
  msg.className = "msg"; msg.textContent = "أرسلنا رابط إعادة التعيين إلى بريدك. افتح الرابط من نفس المتصفح (تحقّق من «المهملات» أيضًا).";
});
$("#recovery-submit")?.addEventListener("click", async () => {
  const pw = $("#new-password").value;
  const msg = $("#recovery-msg");
  if (!pw || pw.length < 6) { msg.className = "msg error"; msg.textContent = "كلمة المرور يجب ألا تقل عن 6 أحرف."; return; }
  const btn = $("#recovery-submit"); btn.disabled = true;
  const { error } = await sb.auth.updateUser({ password: pw });
  btn.disabled = false;
  if (error) { msg.className = "msg error"; msg.textContent = error.message; return; }
  isRecovery = false;
  try { history.replaceState(null, "", window.location.pathname); } catch {}
  msg.className = "msg"; msg.textContent = "تم تحديث كلمة المرور ✓";
  const { data } = await sb.auth.getUser();
  if (data?.user) { if (!entering) { entering = true; enterApp(data.user); } } else { showAuth(); }
});

let entering = false;
// Show the app shell FIRST, then load data — so a slow/aborted request on
// reload can never leave the page blank. Guarded so it runs once.
async function enterApp(user) {
  showApp();
  state.user = user;
  try { await ensureProfile(); } catch (e) { console.warn("profile:", e?.message); }
  try { await loadAll(); } catch (e) { console.warn("loadAll:", e?.message); }
  ensureTourHelp();
  maybeShowNotice();
  maybeStartTour();
  startAutoRefresh();
}
sb.auth.onAuthStateChange((evt, session) => {
  if (evt === "PASSWORD_RECOVERY") { isRecovery = true; showRecovery(); return; }
  if (session?.user) {
    if (isRecovery) return; // ابقَ على شاشة تعيين كلمة المرور حتى يحفظها
    if (!entering) { entering = true; enterApp(session.user); }
  } else {
    entering = false;
    state.user = null;
    stopAutoRefresh();
    endTour(false);
    $("#tour-help")?.remove();
    showAuth();
  }
});

// ---- تحديث تلقائي خفيف: يجلب أحدث البيانات ويعيد الرسم كل دقيقة وعند العودة
// إلى التبويب، حتى لا يحتاج المستخدم لتحديث الصفحة يدويًا. لا يقاطع المستخدم
// أثناء الكتابة أو السحب أو فتح نافذة منبثقة. ----
let _refreshTimer = null;
let _dragBusy = false;
function userBusy() {
  const a = document.activeElement;
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return true;
  if (_dragBusy) return true;                 // أثناء سحب ترتيب المجموعات
  if ($("#tour") || $("#notice") || $("#champ")) return true; // نافذة الجولة/التنبيه/التتويج مفتوحة
  const rec = $("#recovery-view");
  if (rec && !rec.classList.contains("hidden")) return true;
  return false;
}
async function refreshNow() {
  if (!state.user || document.hidden || userBusy()) return;
  try { await loadAll(); } catch (e) { console.warn("auto-refresh:", e?.message); }
}
function startAutoRefresh() {
  if (_refreshTimer) return;
  _refreshTimer = setInterval(refreshNow, 60000);
  document.addEventListener("visibilitychange", onVisible);
}
function stopAutoRefresh() {
  if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  document.removeEventListener("visibilitychange", onVisible);
}
function onVisible() { if (!document.hidden) refreshNow(); }

async function ensureProfile() {
  const { data } = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  if (data) { state.profile = data; return; }
  const name = state._pendingName || state.user.email.split("@")[0];
  const { data: created } = await sb
    .from("profiles").upsert({ id: state.user.id, display_name: name }).select().maybeSingle();
  state.profile = created || { id: state.user.id, display_name: name };
}

// =====================================================================
//  تحميل البيانات
// =====================================================================
async function loadAll() {
  $("#who").textContent = state.profile?.display_name || "";
  const [{ data: conf }, { data: res }, { data: matches }, { data: profiles }] = await Promise.all([
    sb.from("app_config").select("*").eq("id", 1).maybeSingle(),
    sb.from("tournament_results").select("*").eq("id", 1).maybeSingle(),
    sb.from("matches").select("*").order("kickoff", { ascending: true }),
    sb.from("profiles").select("id,display_name"),
  ]);
  state.config = conf || { points_result: 1, points_exact: 2, points_champion: 5, points_finalist: 3, points_semifinalist: 2, points_group_pos: 1, points_group_perfect: 1, points_third: 2, points_advance: 2 };
  state.results = res || {};
  state.matches = matches || [];
  if (!state.matches.length) {
    // وحيد المصدر: لو لم تُحمَّل المباريات من قاعدة البيانات بعد، نقرأها من
    // وسيط football-data.org فقط (لا مصدر بديل، لتفادي أي تعارض في الأسماء).
    state.matches = await loadFootballDataMatches();
  }
  state.names = new Map((profiles || []).map((p) => [p.id, p.display_name]));

  // خريطة شعارات/أعلام لكل منتخب
  state.crests = new Map();
  state.matches.forEach((m) => {
    if (m.home_team && m.home_crest) state.crests.set(m.home_team, m.home_crest);
    if (m.away_team && m.away_crest) state.crests.set(m.away_team, m.away_crest);
  });

  await loadPredictions();
  await loadBonus();
  await loadExtraPreds();
  renderActiveTab();
  // بعد تحديث البيانات: إن انتهى النهائي، اعرض تتويج البطل (مرة واحدة).
  maybeShowChampion().catch(() => {});
}

// توقعات الترتيب/الثوالث/الإقصائيات. يتعامل بهدوء إن لم تُطبّق predictions.sql بعد.
// يجلب كل الصفوف متجاوزًا حدّ 1000 صف في الطلب الواحد. بدون هذا تُسقط بعض
// التوقعات من الواجهة بينما تبقى محفوظة في قاعدة البيانات.
//
// ترقيم Keyset عبر عمود فريد مرتّب (id): مناعة تامة ضد تغيّر ترتيب الصفوف
// وضد الإدراج المتزامن، فالنتيجة دائمًا كاملة مهما كان العدد. (الترقيم بالإزاحة
// بدون ترتيب ثابت قد يُسقط/يكرّر صفوفًا بشكل غير متسق.)
async function fetchAllById(table, columns) {
  const PAGE = 1000;
  const cols = columns.split(",").map((c) => c.trim());
  if (!cols.includes("id")) cols.push("id");
  const sel = cols.join(",");
  const all = [];
  let last = null;
  for (;;) {
    let q = sb.from(table).select(sel).order("id", { ascending: true }).limit(PAGE);
    if (last !== null) q = q.gt("id", last);
    const { data, error } = await q;
    if (error) { console.warn("fetchAllById", table, error.message); break; }
    if (!data || !data.length) break;
    all.push(...data);
    last = data[data.length - 1].id;
    if (data.length < PAGE) break;
  }
  return all;
}
// للجداول بلا عمود id مفرد (مثل bracket_predictions): ترقيم بالإزاحة مع ترتيب
// ثابت متعدد الأعمدة حتى يكون مكتملًا وحتميًا.
async function fetchAllOrdered(table, columns, orderCols) {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    let q = sb.from(table).select(columns);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) { console.warn("fetchAllOrdered", table, error.message); break; }
    if (data && data.length) all.push(...data);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function loadExtraPreds() {
  const [gp, tp, kb] = await Promise.all([
    sb.from("group_predictions").select("user_id,grp,pos1,pos2,pos3,pos4").eq("user_id", state.user.id),
    sb.from("third_predictions").select("teams").eq("user_id", state.user.id).maybeSingle(),
    sb.from("knockout_brackets").select("picks").eq("user_id", state.user.id).maybeSingle(),
  ]);
  const bk = await fetchAllOrdered("bracket_predictions", "match_id,user_id,advance_team", ["match_id", "user_id"]);
  state.groupPreds = new Map();
  (gp.data || []).forEach((r) => state.groupPreds.set(r.grp, r));
  state.thirdPred = tp.data || { teams: [] };
  state.bracketBuild = (kb.data && kb.data.picks) || {};
  state.bracketPreds = new Map();
  state.bracketOthers = new Map();
  bk.forEach((p) => {
    if (p.user_id === state.user.id) state.bracketPreds.set(p.match_id, p.advance_team);
    else {
      if (!state.bracketOthers.has(p.match_id)) state.bracketOthers.set(p.match_id, []);
      state.bracketOthers.get(p.match_id).push(p);
    }
  });
}

async function loadPredictions() {
  const data = await fetchAllById("predictions", "match_id,user_id,home_score,away_score,created_at,updated_at");
  state.myPreds = new Map();
  state.othersPreds = new Map();
  data.forEach((p) => {
    if (p.user_id === state.user.id) {
      state.myPreds.set(p.match_id, p);
    } else {
      if (!state.othersPreds.has(p.match_id)) state.othersPreds.set(p.match_id, []);
      state.othersPreds.get(p.match_id).push(p);
    }
  });
}

async function loadBonus() {
  const { data } = await sb.from("bonus_predictions").select("*").eq("user_id", state.user.id).maybeSingle();
  state.bonus = data || {};
}

// =====================================================================
//  التبويبات
// =====================================================================
$$(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.classList.toggle("active", x === t));
    $$(".panel").forEach((p) => p.classList.add("hidden"));
    $("#tab-" + t.dataset.tab).classList.remove("hidden");
    state.activeTab = t.dataset.tab;
    renderActiveTab();
  })
);
function renderActiveTab() {
  const tab = state.activeTab || "info"; // الافتراضي عند الدخول: المجموعات والجدول
  if (tab === "groups") renderGroups();
  else if (tab === "knockouts") renderKnockouts();
  else if (tab === "bonus") renderBonus();
  else if (tab === "picks") renderPicks();
  else if (tab === "bracket") renderBracket();
  else if (tab === "info") renderInfo();
  else if (tab === "board") renderBoard();
  else if (tab === "stats") renderStats();
}

// الفرق التي توقّع المستخدم في «بطاقة التوقّع» تأهّلها من هذا الدور
function bracketWinnersAtStage(stage) {
  const k = STAGE_TO_BRKEY[stage];
  const set = new Set();
  if (!k) return set;
  for (const [key, team] of Object.entries(state.bracketBuild || {})) {
    if (team && key.startsWith(k + "-")) set.add(team);
  }
  return set;
}
// تنبيه يربط اختيار «يتأهل» في الإقصائيات ببطاقة التوقّع المقفلة لهذا المستخدم.
// يعتمد فقط على بطاقة المستخدم الحالي (state.bracketBuild) واختياراته (state.bracketPreds).
function bracketNote(m) {
  if (!isKnockout(m) || !m.home_team || !m.away_team) return null;
  const winners = bracketWinnersAtStage(m.stage); // فرق توقّع هذا المستخدم تأهّلها من هذا الدور
  if (!winners.size) return null;
  const mine = state.bracketPreds.get(m.id);
  if (mine) {
    // عند الاختيار: نبّه إذا أقصى الفريق الذي توقّع تأهّله في بطاقته
    const elim = mine === m.home_team ? m.away_team : m.home_team;
    if (elim && winners.has(elim)) {
      return { text: `في بطاقتك توقّعت تأهّل <b>${tn(elim)}</b> من هذا الدور.`, warn: true };
    }
    return null;
  }
  // قبل الاختيار: تذكير بالفريق الذي توقّع تأهّله
  const fav = [m.home_team, m.away_team].find((t) => winners.has(t));
  if (fav) return { text: `في بطاقتك توقّعت تأهّل <b>${tn(fav)}</b> من هذا الدور.`, warn: false };
  return null;
}
function bracketNoteHtml(m, opts = {}) {
  if (!opts.advance) return "";
  const n = bracketNote(m);
  if (!n) return `<div class="brk-note hidden"></div>`;
  return `<div class="brk-note${n.warn ? " warn" : ""}">${n.text}</div>`;
}

// الفائز المُستنتَج من توقّع النتيجة (إن كانت حاسمة)؛ null عند التعادل أو غياب النتيجة
function impliedWinner(m) {
  const p = state.myPreds.get(m.id);
  if (!p || p.home_score == null || p.away_score == null) return null;
  if (p.home_score > p.away_score) return m.home_team;
  if (p.away_score > p.home_score) return m.away_team;
  return null; // تعادل → يلزم اختيار الفائز بركلات الترجيح
}
// المتأهّل الفعّال لأي مستخدم: الاختيار الصريح إن وُجد، وإلا يُستنتَج من نتيجة
// حاسمة (الأعلى تسجيلًا). يطابق منطق get_leaderboard تمامًا حتى تتوافق الشارات
// ولوحة الصدارة مع المجموع الرسمي. التعادل بلا اختيار صريح → لا متأهّل.
function effAdvancer(m, pred, explicit) {
  if (explicit) return explicit;
  if (!pred || pred.home_score == null || pred.away_score == null) return null;
  if (pred.home_score > pred.away_score) return m.home_team;
  if (pred.away_score > pred.home_score) return m.away_team;
  return null;
}
// محتوى «من يتأهل»:
//  • لا نتيجة بعد → مخفي (فارغ)
//  • نتيجة حاسمة → سطر «يتأهل للدور التالي: الفريق» (الفائز بالأهداف، بلا أزرار)
//  • تعادل → أزرار اختيار «الفائز بركلات الترجيح»
function advanceContentHtml(m, locked) {
  const p = state.myPreds.get(m.id);
  const hasScore = p && p.home_score != null && p.away_score != null;
  if (!hasScore) return ""; // يبقى مخفيًا حتى تُدخل نتيجة
  const finished = m.status === "FINISHED" && m.home_score != null;
  const actualAdv = finished
    ? (m.winner === "HOME_TEAM" ? m.home_team : m.winner === "AWAY_TEAM" ? m.away_team : null)
    : null;
  const byGoals = impliedWinner(m);
  if (byGoals) {
    const correct = actualAdv && actualAdv === byGoals ? " correct" : "";
    return `<div class="advrow"><span class="advlbl">يتأهل للدور التالي:</span>` +
      `<span class="adv-auto${correct}">${flagImg(byGoals, "crest sm")}${tn(byGoals)}</span></div>`;
  }
  // تعادل → اختيار الفائز بركلات الترجيح (مع العلم لتوضيح الفريق)
  const mineAdv = state.bracketPreds.get(m.id);
  const advBtn = (team) => {
    const sel = mineAdv === team ? " sel" : "";
    const correct = actualAdv && actualAdv === team ? " correct" : "";
    return `<button class="adv-btn${sel}${correct}" data-team="${esc(team)}" ${locked ? "disabled" : ""}>${flagImg(team, "crest sm")}${tn(team)}</button>`;
  };
  return `<div class="advrow"><span class="advlbl">الفائز بركلات الترجيح:</span>${advBtn(m.home_team)}${advBtn(m.away_team)}</div>`;
}

// وسم يوضّح كيف حُسمت المباراة (ركلات الترجيح / الوقت الإضافي) — للعرض فقط.
// يُستخدم في صف المباراة وفي الجدول الكامل معًا.
function decidedTag(m) {
  const finished = m.status === "FINISHED" && m.home_score != null;
  if (!finished) return "";
  const penWinner = m.winner === "HOME_TEAM" ? m.home_team : m.winner === "AWAY_TEAM" ? m.away_team : null;
  const isPens = m.decided_by === "PENALTY_SHOOTOUT" ||
    (isKnockout(m) && m.home_score === m.away_score && penWinner);
  if (isPens) {
    // أظهر نتيجة الترجيح فقط إذا كانت صحيحة (غير متعادلة) — تفاديًا لبيانات ناقصة من المصدر
    const validPen = m.pen_home != null && m.pen_away != null && m.pen_home !== m.pen_away;
    const pp = validPen ? ` ${m.pen_home}–${m.pen_away}` : "";
    return `<span class="decided">بركلات الترجيح${pp}${penWinner ? " — " + tn(penWinner) : ""}</span>`;
  }
  if (m.decided_by === "EXTRA_TIME") return `<span class="decided">بعد الوقت الإضافي</span>`;
  return "";
}

// =====================================================================
//  صف المباراة (مشترك بين المجموعات والإقصائيات)
// =====================================================================
function matchRow(m, opts = {}) {
  const locked = isLocked(m);
  const finished = m.status === "FINISHED" && m.home_score != null;
  const live = ["IN_PLAY", "PAUSED"].includes(m.status);
  const mine = state.myPreds.get(m.id);
  const hv = mine ? mine.home_score : "";
  const av = mine ? mine.away_score : "";

  // نقاط هذه المباراة = نقاط النتيجة + نقطة المتأهّل (للإقصائيات فقط)، حتى
  // تطابق الشارة لوحة الصدارة تمامًا.
  let matchPts = pointsFor(mine, m);
  if (finished && isKnockout(m)) {
    const actualAdv = m.winner === "HOME_TEAM" ? m.home_team : m.winner === "AWAY_TEAM" ? m.away_team : null;
    const myAdv = effAdvancer(m, mine, state.bracketPreds.get(m.id));
    if (actualAdv && myAdv && myAdv === actualAdv) matchPts += (state.config?.points_advance ?? 1);
  }

  let statusPill = `<span class="pill open">مفتوحة</span>`;
  if (live) statusPill = `<span class="pill live">● مباشر</span>`;
  else if (finished) statusPill = `<span class="pill points">+${matchPts} نقطة</span>`;
  else if (locked) statusPill = `<span class="pill locked">مقفلة</span>`;

  const disabled = locked ? "disabled" : "";

  // النتيجة الفعلية/المباشرة تُعرض بجانب توقّع المستخدم مباشرةً للمقارنة.
  // كيف حُسمت المباراة (للعرض فقط — لا يؤثر على الاحتساب):
  //  • ركلات الترجيح: تعادل + فائز محدّد (أو decided_by) → تعادل في الاحتساب.
  //  • الوقت الإضافي: decided_by === EXTRA_TIME.
  let liveScore = "";
  if (finished) liveScore = `<span class="live-score fin">النتيجة ${m.home_score}–${m.away_score}</span>${decidedTag(m)}`;
  else if (live && m.home_score != null) liveScore = `<span class="live-score is-live">● مباشر ${m.home_score}–${m.away_score}</span>`;

  // توقعات الآخرين (تظهر بعد انطلاق المباراة فقط عبر RLS)
  let others = "";
  const list = state.othersPreds.get(m.id);
  if (locked && list?.length) {
    // للإقصائيات: أظهر مَن اختاره كل مستخدم للتأهل (خاصة عند التعادل/الترجيح)،
    // ولوّنه أخضر إن كان صحيحًا أو أحمر إن كان خاطئًا بعد انتهاء المباراة.
    const advMap = new Map();
    (state.bracketOthers.get(m.id) || []).forEach((b) => advMap.set(b.user_id, b.advance_team));
    const actualAdv2 = finished
      ? (m.winner === "HOME_TEAM" ? m.home_team : m.winner === "AWAY_TEAM" ? m.away_team : null)
      : null;
    const chips = list.map((p) => {
      const adv = isKnockout(m) ? effAdvancer(m, p, advMap.get(p.user_id)) : null;
      let advHtml = "";
      if (adv) {
        const cls = actualAdv2 ? (adv === actualAdv2 ? " ok" : " no") : "";
        advHtml = ` <span class="chip-adv${cls}">↗ ${tn(adv)}</span>`;
      }
      return `<span class="chip"><b>${esc(state.names.get(p.user_id) || "؟")}</b> ${p.home_score}–${p.away_score}${advHtml}</span>`;
    }).join("");
    others = `<div class="others">التوقعات: ${chips}</div>`;
  }

  // مَن يتأهل (للإقصائيات فقط، إذا عُرف الفريقان) — حاوية ثابتة تُحدَّث مع تغيّر النتيجة
  let adv = "";
  if (opts.advance && m.home_team && m.away_team) {
    adv = `<div class="adv-slot">${advanceContentHtml(m, locked)}</div>`;
  }

  return `
  <div class="match" data-id="${m.id}">
    <div class="side home">${flagImg(m.home_team)}<span class="tname">${tn(m.home_team)}</span></div>
    <div class="score-in">
      <div class="score-row">
        <input type="number" min="0" max="30" value="${hv}" data-side="home" ${disabled} inputmode="numeric"/>
        <span class="vs">:</span>
        <input type="number" min="0" max="30" value="${av}" data-side="away" ${disabled} inputmode="numeric"/>
      </div>
      ${liveScore}
    </div>
    <div class="side away"><span class="tname">${tn(m.away_team)}</span>${flagImg(m.away_team)}</div>
    <div class="meta">
      <span class="kick">${opts.showGroup && m.grp ? `<b class="mgrp">${esc(grpName(m.grp))}</b> · ` : ""}${fmtKick(m.kickoff)}</span>
      <span style="display:flex;gap:8px;align-items:center">
        <span class="saved-tag">حُفظ ✓</span>${statusPill}
      </span>
    </div>
    ${adv}
    ${bracketNoteHtml(m, opts)}
    ${others}
  </div>`;
}

// يُومض شارة "حُفظ ✓" داخل صف المباراة لطمأنة المستخدم
function flashSaved(row) {
  const tag = $(".saved-tag", row);
  if (tag) { tag.classList.add("show"); setTimeout(() => tag.classList.remove("show"), 1200); }
}
// يحدّث تنبيه التعارض مع بطاقة التوقّع في صف معيّن
function refreshBracketNote(row, id) {
  const noteEl = $(".brk-note", row);
  const m = state.matches.find((x) => x.id === id);
  if (!noteEl || !m) return;
  const n = bracketNote(m);
  noteEl.innerHTML = n ? n.text : "";
  noteEl.className = "brk-note" + (n ? (n.warn ? " warn" : "") : " hidden");
}
// يعيد رسم صف «من يتأهل» (أزرار ↔ تلقائي بالأهداف) ويعيد ربط الأزرار
function refreshAdvanceRow(row, m) {
  const slot = $(".adv-slot", row);
  if (!slot) return;
  slot.innerHTML = advanceContentHtml(m, isLocked(m));
  wireAdvanceButtons(row, m.id);
}
// أزرار "مَن يتأهل" (تُستخدم عند التعادل أو قبل إدخال نتيجة)
function wireAdvanceButtons(row, id) {
  $$(".adv-btn", row).forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      const team = btn.dataset.team;
      const { error } = await sb
        .from("bracket_predictions")
        .upsert({ user_id: state.user.id, match_id: id, advance_team: team, updated_at: new Date().toISOString() },
                { onConflict: "user_id,match_id" });
      if (error) { toast("مقفلة — انطلقت المباراة.", true); return; }
      state.bracketPreds.set(id, team);
      $$(".adv-btn", row).forEach((b) => b.classList.toggle("sel", b.dataset.team === team));
      refreshBracketNote(row, id);
      flashSaved(row);
      toast("تم حفظ المتأهل ✓");
    })
  );
}
function wireAdvance(root) {
  $$(".match", root).forEach((row) => wireAdvanceButtons(row, Number(row.dataset.id)));
}

// حفظ توقّع نتيجة مباراة (مع تأخير بسيط)
function wireMatchInputs(root) {
  $$(".match", root).forEach((row) => {
    const id = Number(row.dataset.id);
    const inputs = $$("input", row);
    const tag = $(".saved-tag", row);
    let timer;
    inputs.forEach((inp) =>
      inp.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const h = inputs[0].value, a = inputs[1].value;
          if (h === "" || a === "") return;
          const home_score = Math.max(0, Math.min(30, parseInt(h, 10)));
          const away_score = Math.max(0, Math.min(30, parseInt(a, 10)));
          const { error } = await sb
            .from("predictions")
            .upsert({ user_id: state.user.id, match_id: id, home_score, away_score, updated_at: new Date().toISOString() },
                    { onConflict: "user_id,match_id" });
          if (error) { toast("مقفلة — انطلقت المباراة.", true); return; }
          state.myPreds.set(id, { match_id: id, user_id: state.user.id, home_score, away_score });
          tag.classList.add("show"); setTimeout(() => tag.classList.remove("show"), 1200);
          maybeRevealNext(id);
          // إقصائيات: نتيجة حاسمة → الفائز بالأهداف يُحفظ تلقائيًا كمتأهّل (في الخلفية)
          const m = state.matches.find((x) => x.id === id);
          if (m && isKnockout(m)) {
            const byGoals = impliedWinner(m);
            if (byGoals && state.bracketPreds.get(id) !== byGoals) {
              const { error: e2 } = await sb.from("bracket_predictions").upsert(
                { user_id: state.user.id, match_id: id, advance_team: byGoals, updated_at: new Date().toISOString() },
                { onConflict: "user_id,match_id" });
              if (!e2) state.bracketPreds.set(id, byGoals);
            }
            refreshAdvanceRow(row, m);
            refreshBracketNote(row, id);
          }
        }, 550);
      })
    );
  });
}

// عند إكمال توقعات يومٍ كامل، افتح اليوم التالي تلقائيًا
function maybeRevealNext(matchId) {
  const m = state.matches.find((x) => x.id === matchId);
  if (!m || m.stage !== "GROUP_STAGE") return;
  const days = [...new Set(state.matches.filter((x) => x.stage === "GROUP_STAGE").map((x) => saDateKey(x.kickoff)))].sort();
  const day = saDateKey(m.kickoff);
  const idx = days.indexOf(day);
  if (idx < 0 || idx + 1 >= days.length) return;
  const curMatches = state.matches.filter((x) => x.stage === "GROUP_STAGE" && saDateKey(x.kickoff) === day);
  if (curMatches.every((x) => state.myPreds.has(x.id))) {
    const next = days[idx + 1];
    const wrap = $(`.group[data-grp="${cssAttr(next)}"]`);
    if (wrap && !state.groupToggle.has(next)) wrap.classList.remove("collapsed");
  }
}
const cssAttr = (s) => String(s).replace(/"/g, '\\"');

// =====================================================================
//  دور المجموعات — مرتّبة حسب اليوم (أسهل للتوقّع والمتابعة)
// =====================================================================
function renderGroups() {
  const el = $("#tab-groups");
  const groupMatches = state.matches.filter((m) => m.stage === "GROUP_STAGE");
  if (!groupMatches.length) { el.innerHTML = emptyState(); return; }

  // تجميع المباريات حسب يومها (بتوقيت السعودية) مرتّبةً زمنيًا
  const byDay = {};
  groupMatches.forEach((m) => { (byDay[saDateKey(m.kickoff)] ??= []).push(m); });
  const days = Object.keys(byDay).sort();
  days.forEach((d) => byDay[d].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)));

  // اليوم المفتوح افتراضيًا = أول يوم فيه مباراة لم تنطلق بعد (وإلا فآخر يوم)
  let firstOpen = days.findIndex((d) => byDay[d].some((m) => !isLocked(m)));
  if (firstOpen === -1) firstOpen = days.length - 1;

  el.innerHTML =
    `<p class="note">توقّع نتيجة كل مباراة، مرتّبةً حسب اليوم. تُقفل المباراة عند انطلاقها وتظهر نتيجتها المباشرة بجانب توقّعك. النتيجة الصحيحة بالضبط = ٢ نقطة، توقّع الفائز = ١.</p>` +
    days.map((d, idx) => {
      const rows = byDay[d].map((m) => matchRow(m, { showGroup: true })).join("");
      const manual = state.groupToggle.get(d); // true=مفتوح، false=مغلق، undefined=تلقائي
      const open = manual !== undefined ? manual : idx === firstOpen;
      const total = byDay[d].length;
      const done = byDay[d].filter((m) => state.myPreds.has(m.id)).length;
      const tag = done === total
        ? `<span class="group-done">✓ مكتمل</span>`
        : `<span class="day-count">${done}/${total}</span>`;
      return `<div class="group${open ? "" : " collapsed"}" data-grp="${esc(d)}">
        <div class="group-head"><h3>${esc(fmtSADate(byDay[d][0].kickoff))} ${tag}</h3><span class="chev">▾</span></div>
        <div class="group-body">${rows}</div>
      </div>`;
    }).join("");

  $$(".group-head", el).forEach((h) =>
    h.addEventListener("click", () => {
      const wrap = h.parentElement;
      wrap.classList.toggle("collapsed");
      state.groupToggle.set(wrap.dataset.grp, !wrap.classList.contains("collapsed"));
    })
  );
  wireMatchInputs(el);
}

// =====================================================================
//  الأدوار الإقصائية
// =====================================================================
function renderKnockouts() {
  const el = $("#tab-knockouts");
  const ko = state.matches.filter(isKnockout);
  if (!ko.length) {
    el.innerHTML = `<div class="empty">تظهر الأدوار الإقصائية تلقائيًا بعد انتهاء دور المجموعات وتحديد المباريات.</div>`;
    return;
  }
  const byStage = {};
  ko.forEach((m) => { (byStage[m.stage] ??= []).push(m); });
  const stages = [
    ...STAGE_ORDER.filter((s) => byStage[s]),
    ...Object.keys(byStage).filter((s) => !STAGE_ORDER.includes(s)),
  ];
  const active = activeStage(stages); // افتح المرحلة الجارية فقط
  el.innerHTML =
    `<p class="note">توقّع نتيجة كل مواجهة: النتيجة الصحيحة بالضبط ٢. المتأهل ١ نقطة · عند التعادل اختر الفائز بركلات الترجيح.</p>` +
    stages.map((s) => {
      const rows = byStage[s].map((m) => matchRow(m, { advance: true })).join("");
      const open = s === active;
      return `<div class="group${open ? "" : " collapsed"}">
        <div class="group-head"><h3>${stageLabel(s)}</h3><span class="chev">▾</span></div>
        <div class="group-body">${rows}</div>
      </div>`;
    }).join("");
  $$(".group-head", el).forEach((h) =>
    h.addEventListener("click", () => h.parentElement.classList.toggle("collapsed"))
  );
  wireMatchInputs(el);
  wireAdvance(el);
}

// =====================================================================
//  التوقعات الإضافية (البطل/النهائي/نصف النهائي)
// =====================================================================
function teamList() {
  const set = new Set();
  state.matches.filter((m) => m.stage === "GROUP_STAGE").forEach((m) => {
    if (m.home_team) set.add(m.home_team);
    if (m.away_team) set.add(m.away_team);
  });
  return [...set].sort((a, b) => teamName(a).localeCompare(teamName(b), "ar"));
}
// قراءة فقط: البطل/النهائي/نصف النهائي مأخوذة تلقائيًا من «بطاقة التوقّع»
// (مصدر واحد — لا إدخال منفصل عن الأدوار الإقصائية)
function renderBonus() {
  const el = $("#tab-bonus");
  if (!state.matches.length) { el.innerHTML = emptyState(); return; }
  const C = state.config;
  const b = state.bonus || {};
  const r = state.results || {};
  const fin = Array.isArray(r.finalists) ? r.finalists : [];
  const semi = Array.isArray(r.semifinalists) ? r.semifinalists : [];

  const line = (team, correct) => team
    ? `<span class="champ-t${correct ? " ok" : ""}">${flagImg(team, "crest")}${tn(team)}${correct ? " ✓" : ""}</span>`
    : `<span class="b-empty">— لم تُحدَّد بعد —</span>`;
  const champCorrect = b.champion && r.champion && b.champion === r.champion;

  // ملخّص تقدّم التوقعات
  const gmAll = state.matches.filter((m) => m.stage === "GROUP_STAGE");
  const gmDone = gmAll.filter((m) => state.myPreds.has(m.id)).length;
  const groupNames = [...new Set(gmAll.filter((m) => m.grp).map((m) => m.grp))];
  const ordersDone = groupNames.filter((g) => {
    const p = state.groupPreds.get(g);
    return p && p.pos1 && p.pos2 && p.pos3 && p.pos4;
  }).length;
  const thirdsDone = (state.thirdPred?.teams || []).filter(Boolean).length;
  const stat = (label, done, total) =>
    `<div class="sum-stat"><span class="sum-num">${done}<small>/${total}</small></span><span class="sum-lbl">${label}</span></div>`;

  el.innerHTML =
    `<p class="note">هذه صفحة <b>ملخّص توقعاتك</b>. البطل وأصحاب النهائي ونصف النهائي تُؤخذ تلقائيًا من <b>بطاقة التوقّع</b>. لتعديلها افتح البطاقة.</p>` +
    `<div class="sum-grid">
      ${stat("مباريات المجموعات", gmDone, gmAll.length)}
      ${stat("ترتيب المجموعات", ordersDone, groupNames.length)}
      ${stat("أفضل الثوالث", thirdsDone, 8)}
      ${stat("البطل", b.champion ? 1 : 0, 1)}
    </div>` +
    `<button id="go-bracket" class="btn-ghost" style="margin:0 4px 16px">🏆 فتح بطاقة التوقّع</button>` +
    `<div class="bonus-grid">
      <div class="bonus-card">
        <h4>🏆 البطل <small style="color:var(--gold)">${r.champion ? "· الفعلي: " + tn(r.champion) : ""}</small></h4>
        <p class="hint">${C.points_champion} نقطة.</p>
        ${line(b.champion, champCorrect)}
      </div>
      <div class="bonus-card">
        <h4>🥈 صاحبا النهائي</h4>
        <p class="hint">${C.points_finalist} نقطة لكل منهما.</p>
        <div class="bonus-row">${line(b.finalist1, b.finalist1 && fin.includes(b.finalist1))}${line(b.finalist2, b.finalist2 && fin.includes(b.finalist2))}</div>
      </div>
      <div class="bonus-card">
        <h4>🥉 أصحاب نصف النهائي</h4>
        <p class="hint">${C.points_semifinalist} نقطة لكل منها.</p>
        <div class="bonus-row">
          ${line(b.semifinalist1, b.semifinalist1 && semi.includes(b.semifinalist1))}
          ${line(b.semifinalist2, b.semifinalist2 && semi.includes(b.semifinalist2))}
          ${line(b.semifinalist3, b.semifinalist3 && semi.includes(b.semifinalist3))}
          ${line(b.semifinalist4, b.semifinalist4 && semi.includes(b.semifinalist4))}
        </div>
      </div>
    </div>`;

  const go = $("#go-bracket", el);
  if (go) go.addEventListener("click", () => { const t = $(`.tab[data-tab="bracket"]`); if (t) t.click(); });
}

// =====================================================================
//  ترتيب المجموعات (سحب وإفلات) + أفضل أصحاب المركز الثالث
// =====================================================================
function teamsInGroup(g) {
  const s = new Set();
  state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp === g).forEach((m) => {
    if (m.home_team) s.add(m.home_team);
    if (m.away_team) s.add(m.away_team);
  });
  return [...s].sort();
}

function renderPicks() {
  const el = $("#tab-picks");
  const groupNames = [...new Set(
    state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp).map((m) => m.grp)
  )].sort();
  if (!groupNames.length) { el.innerHTML = emptyState(); return; }

  const locked = bonusLocked();
  const C = state.config;

  const orderCards = groupNames.map((g) => {
    const teams = teamsInGroup(g);
    const pred = state.groupPreds.get(g) || {};
    const saved = [pred.pos1, pred.pos2, pred.pos3, pred.pos4].filter(Boolean).filter((t) => teams.includes(t));
    const ordered = [...saved, ...teams.filter((t) => !saved.includes(t))];
    const lis = ordered.map((t, i) =>
      `<li data-team="${esc(t)}"><span class="ord">${i + 1}</span>${flagImg(t)}<span class="tname">${tn(t)}</span>${locked ? "" : '<span class="handle">⠿</span>'}</li>`
    ).join("");
    const lockBadge = locked ? `<span class="group-locked">🔒 مقفلة</span>` : "";
    return `<div class="bonus-card">
      <h4>${esc(grpName(g))} ${lockBadge}</h4>
      <ul class="dnd${locked ? " locked" : ""}" data-grp="${esc(g)}">${lis}</ul>
    </div>`;
  }).join("");

  const note = locked
    ? `<p class="note">توقعات الترتيب مقفلة (انتهت الجولة الأولى).</p>`
    : `<p class="note hl">مدد وقت توقع المجموعات والأدوار الإقصائية لنهاية الجولة الأولى لزيادة الحنكة.${C?.bonus_locks_at ? " يُقفل: " + fmtKick(C.bonus_locks_at) : ""}</p>` +
      `<p class="note">رتّب فرق كل مجموعة بالسحب والإفلات من الأول إلى الرابع. كل مركز صحيح = ${C.points_group_pos} نقطة · المجموعة المثالية: مكافأة +${C.points_group_perfect} (${C.points_group_pos * 4 + C.points_group_perfect} نقاط) · كل ثالث صحيح = ${C.points_third}.</p>`;

  el.innerHTML = note +
    `<h3 class="sec">📊 ترتيب المجموعات النهائي</h3><div class="bonus-grid picks-grid">${orderCards}</div>` +
    `<h3 class="sec">🥉 أفضل أصحاب المركز الثالث</h3><div id="thirds-wrap"></div>`;

  if (!locked && window.Sortable) {
    $$(".dnd", el).forEach((ul) =>
      Sortable.create(ul, {
        animation: 150, handle: ".handle",
        forceFallback: true, fallbackTolerance: 3, // consistent on touch + mouse
        onStart: () => { _dragBusy = true; },
        onEnd: async () => { _dragBusy = false; renumber(ul); await saveGroupOrder(ul); renderThirds(); },
      })
    );
  }
  renderThirds();
}

function renumber(ul) { $$("li", ul).forEach((li, i) => ($(".ord", li).textContent = i + 1)); }

async function saveGroupOrder(ul) {
  const g = ul.dataset.grp;
  const order = $$("li", ul).map((li) => li.dataset.team);
  const row = {
    user_id: state.user.id, grp: g,
    pos1: order[0] || null, pos2: order[1] || null, pos3: order[2] || null, pos4: order[3] || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("group_predictions").upsert(row, { onConflict: "user_id,grp" });
  if (error) { toast("تعذّر الحفظ (مقفل؟).", true); return; }
  state.groupPreds.set(g, row);
  toast(grpName(g) + " — تم الحفظ ✓");
}

// الفرق التي وضعها المستخدم في المركز الثالث في كل مجموعة
function predictedThirds() {
  const arr = [];
  [...state.groupPreds.values()].forEach((p) => { if (p.pos3) arr.push(p.pos3); });
  return [...new Set(arr)];
}

function renderThirds() {
  const wrap = $("#thirds-wrap");
  if (!wrap) return;
  const locked = bonusLocked();
  const C = state.config;
  const opts = predictedThirds();
  let chosen = (state.thirdPred?.teams || []).filter((t) => opts.includes(t));

  if (!opts.length) {
    wrap.innerHTML = `<p class="thirds-count">رتّب مجموعاتك أولًا — ستظهر هنا الفرق التي وضعتها في المركز الثالث لتختار منها ٨.</p>`;
    return;
  }

  const chips = opts.map((t) => {
    const on = chosen.includes(t) ? " sel" : "";
    return `<button class="tchip${on}" data-team="${esc(t)}" ${locked ? "disabled" : ""}>${flagImg(t, "crest")}${tn(t)}</button>`;
  }).join("");

  wrap.innerHTML = `<div class="bonus-card">
    <p class="hint">يتأهل ٨ من أصحاب المراكز الثالثة إلى دور الـ32. اختر ٨ من الفرق التي وضعتها في المركز الثالث. ${C.points_third} نقطة لكل فريق صحيح.</p>
    <p class="thirds-count">المختار: <b id="tcount">${chosen.length}</b> / 8</p>
    <div class="thirds-chips">${chips}</div>
  </div>`;

  if (locked) return;
  $$(".tchip", wrap).forEach((btn) =>
    btn.addEventListener("click", async () => {
      const t = btn.dataset.team;
      const cur = new Set((state.thirdPred?.teams || []).filter((x) => opts.includes(x)));
      if (cur.has(t)) cur.delete(t);
      else { if (cur.size >= 8) { toast("الحد الأقصى ٨ فرق.", true); return; } cur.add(t); }
      const teams = [...cur];
      const { error } = await sb.from("third_predictions")
        .upsert({ user_id: state.user.id, teams, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) { toast("تعذّر الحفظ (مقفل؟).", true); return; }
      state.thirdPred = { teams };
      btn.classList.toggle("sel");
      const c = $("#tcount"); if (c) c.textContent = cur.size;
    })
  );
}

// =====================================================================
//  بطاقة التوقّع (دور الـ32 → البطل) مبنية من توقعات المستخدم
// =====================================================================
// 32 منتخبًا = 12 أول مجموعة + 8 ثوالث مختارة + 12 ثاني مجموعة
function bracketOrdering() {
  const gn = [...new Set(state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp).map((m) => m.grp))].sort();
  const w = gn.map((g) => state.groupPreds.get(g)?.pos1);
  const r = gn.map((g) => state.groupPreds.get(g)?.pos2);
  const t = (state.thirdPred?.teams || []).filter(Boolean).slice(0, 8);
  if (gn.length < 12 || w.some((x) => !x) || r.some((x) => !x) || t.length < 8) return null;
  return [...w, ...t, ...r]; // 32
}
const BR_KEYS = ["r32", "r16", "qf", "sf", "f"];
// يحسب مواجهات كل دور انطلاقًا من اختيارات المستخدم
function computeRounds(ordering, picks) {
  const rounds = [];
  let cur = [];
  for (let i = 0; i < 16; i++) cur.push([ordering[i], ordering[31 - i]]);
  rounds.push(cur);
  for (let L = 0; L < 4; L++) {
    const winners = cur.map((m, idx) => {
      let w = picks[BR_KEYS[L] + "-" + idx];
      return w && m.includes(w) ? w : null;
    });
    const next = [];
    for (let j = 0; j < winners.length / 2; j++) next.push([winners[2 * j], winners[2 * j + 1]]);
    rounds.push(next);
    cur = next;
  }
  return rounds; // [r32(16), r16(8), qf(4), sf(2), f(1)]
}
function pruneBracket(ordering) {
  let changed = true;
  while (changed) {
    changed = false;
    const rounds = computeRounds(ordering, state.bracketBuild);
    for (let L = 0; L < 5; L++) {
      rounds[L].forEach((m, idx) => {
        const k = BR_KEYS[L] + "-" + idx;
        if (state.bracketBuild[k] && !m.includes(state.bracketBuild[k])) { delete state.bracketBuild[k]; changed = true; }
      });
    }
  }
}
async function saveBracket(ordering) {
  const { error } = await sb.from("knockout_brackets")
    .upsert({ user_id: state.user.id, picks: state.bracketBuild, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) { toast("تعذّر الحفظ (مقفل؟).", true); return; }
  await syncBonusFromBracket(ordering);
  toast("تم حفظ البطاقة ✓");
}
// يحوّل البطاقة إلى توقع البطل/النهائي/نصف النهائي (لاحتساب النقاط عبر التوقعات الإضافية)
async function syncBonusFromBracket(ordering) {
  const rounds = computeRounds(ordering, state.bracketBuild);
  const sf = rounds[3]; // مباراتا نصف النهائي
  const semis = [sf[0][0], sf[0][1], sf[1][0], sf[1][1]];
  const payload = {
    user_id: state.user.id, updated_at: new Date().toISOString(),
    champion: state.bracketBuild["f-0"] || null,
    finalist1: state.bracketBuild["sf-0"] || null,
    finalist2: state.bracketBuild["sf-1"] || null,
    semifinalist1: semis[0] || null, semifinalist2: semis[1] || null,
    semifinalist3: semis[2] || null, semifinalist4: semis[3] || null,
  };
  const { error } = await sb.from("bonus_predictions").upsert(payload, { onConflict: "user_id" });
  if (!error) state.bonus = { ...(state.bonus || {}), ...payload };
}

function renderBracket() {
  const el = $("#tab-bracket");
  const groupNames = [...new Set(state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp).map((m) => m.grp))].sort();
  if (!groupNames.length) { el.innerHTML = emptyState(); return; }

  const ordering = bracketOrdering();
  if (!ordering) {
    const w = groupNames.filter((g) => state.groupPreds.get(g)?.pos1 && state.groupPreds.get(g)?.pos2).length;
    const t = (state.thirdPred?.teams || []).filter(Boolean).length;
    const need = [];
    if (w < groupNames.length) need.push(`رتّب جميع المجموعات في تبويب «ترتيب المجموعات» (أكملت ${w} من ${groupNames.length})`);
    if (t < 8) need.push(`اختر ٨ من أصحاب المركز الثالث (اخترت ${t})`);
    el.innerHTML =
      `<p class="note">ابنِ بطاقتك من توقعاتك: المتأهلان الأول والثاني من كل مجموعة + ٨ ثوالث، ثم اختر الفائز في كل مواجهة حتى البطل.</p>` +
      `<div class="empty">للبدء:<br/>• ${need.join("<br/>• ")}</div>`;
    return;
  }

  const locked = bonusLocked();
  pruneBracket(ordering);
  const rounds = computeRounds(ordering, state.bracketBuild);
  const champion = state.bracketBuild["f-0"] && rounds[4][0].includes(state.bracketBuild["f-0"]) ? state.bracketBuild["f-0"] : null;
  const titles = ["دور الـ32", "دور الـ16", "ربع النهائي", "نصف النهائي", "النهائي"];

  const teamBtn = (team, L, idx) => {
    if (!team) return `<span class="bteam empty">—</span>`;
    const chosen = state.bracketBuild[BR_KEYS[L] + "-" + idx] === team;
    return `<button class="bteam${chosen ? " sel" : ""}" data-key="${BR_KEYS[L]}" data-idx="${idx}" data-team="${esc(team)}" ${locked ? "disabled" : ""}>${flagImg(team, "crest sm")}<span>${tn(team)}</span></button>`;
  };

  const roundsHtml = rounds.map((matches, L) => {
    const ms = matches.map((m, idx) => `<div class="bmatch">${teamBtn(m[0], L, idx)}<span class="bvs">×</span>${teamBtn(m[1], L, idx)}</div>`).join("");
    return `<div class="bround"><h4 class="bround-h">${titles[L]}</h4>${ms}</div>`;
  }).join("");

  const champHtml = champion
    ? `<div class="champ"><span class="champ-l">🏆 البطل المتوقّع</span><span class="champ-t">${flagImg(champion, "crest")}${tn(champion)}</span></div>`
    : `<div class="champ muted">🏆 اختر الفائز في كل دور حتى تصل إلى البطل</div>`;

  const note = locked
    ? `<p class="note">بطاقة التوقّع مقفلة (انتهت الجولة الأولى).</p>`
    : `<p class="note hl">مدد وقت توقع المجموعات والأدوار الإقصائية لنهاية الجولة الأولى لزيادة الحنكة.${state.config?.bonus_locks_at ? " يُقفل: " + fmtKick(state.config.bonus_locks_at) : ""}</p>` +
      `<p class="note">اختر الفائز في كل مواجهة وصولًا إلى البطل. تُبنى المواجهات من توقعاتك (الأول/الثاني/الثوالث)، وتُحدّث تلقائيًا توقع البطل وأصحاب النهائي ونصف النهائي.</p>`;

  el.innerHTML = note + champHtml + `<div class="bracket">${roundsHtml}</div>`;

  if (locked) return;
  $$(".bteam", el).forEach((btn) => {
    if (btn.disabled || btn.classList.contains("empty")) return;
    btn.addEventListener("click", async () => {
      state.bracketBuild[btn.dataset.key + "-" + btn.dataset.idx] = btn.dataset.team;
      pruneBracket(ordering);
      await saveBracket(ordering);
      renderBracket();
    });
  });
}

// =====================================================================
//  المجموعات والجدول (معلومات فقط)
// =====================================================================
function renderInfo() {
  const el = $("#tab-info");
  if (!state.matches.length) { el.innerHTML = emptyState(); return; }

  const groups = [...new Set(
    state.matches.filter((m) => m.stage === "GROUP_STAGE" && m.grp).map((m) => m.grp)
  )].sort();

  const groupsHtml = groups.map((g) => {
    const rows = groupStandings(g);
    const body = rows.map((r, i) => `
      <tr${i < 2 ? ' class="qual"' : ""}>
        <td class="pos">${i + 1}</td>
        <td class="tm">${flagImg(r.team, "crest sm")}<span>${tn(r.team)}</span></td>
        <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
        <td>${r.gf - r.ga > 0 ? "+" : ""}${r.gf - r.ga}</td>
        <td class="pts">${r.pts}</td>
      </tr>`).join("");
    return `<div class="group">
      <div class="group-head"><h3>${esc(grpName(g))}</h3><span class="chev">▾</span></div>
      <div class="group-body">
        <table class="gtable">
          <thead><tr><th></th><th>الفريق</th><th>لعب</th><th>فاز</th><th>تعادل</th><th>خسر</th><th>الفارق</th><th>نقاط</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }).join("");

  // الجدول الكامل: مُجمَّع حسب المرحلة ثم اليوم؛ تُفتح المرحلة الجارية فقط.
  const renderSrow = (m) => {
    const label = m.grp ? grpName(m.grp) : stageLabel(m.stage);
    const finished = m.status === "FINISHED" && m.home_score != null;
    const live = ["IN_PLAY", "PAUSED"].includes(m.status);
    const scoreOrVs = finished || (live && m.home_score != null)
      ? `<b class="sc">${m.home_score}–${m.away_score}</b>`
      : `<span class="vs">×</span>`;
    const flag = live ? `<span class="pill live">● مباشر</span>` : finished ? `<span class="pill points">انتهت</span>` : "";
    return `<div class="srow">
      <span class="stime">${fmtSATime(m.kickoff)}</span>
      <span class="steams">
        <span class="sh">${flagImg(m.home_team)}${tn(m.home_team)}</span>
        ${scoreOrVs}
        <span class="sa">${tn(m.away_team)}${flagImg(m.away_team)}</span>
        ${decidedTag(m)}
      </span>
      <span class="stag">${esc(label)} ${flag}</span>
    </div>`;
  };
  const schedStages = STAGE_ALL.filter((s) => state.matches.some((m) => m.stage === s));
  const activeSched = activeStage(schedStages);
  const schedHtml = schedStages.map((s) => {
    const ms = state.matches.filter((m) => m.stage === s).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    const byDay = {};
    ms.forEach((m) => { (byDay[saDateKey(m.kickoff)] ??= []).push(m); });
    const daysHtml = Object.keys(byDay).sort().map((day) =>
      `<div class="sday"><div class="sday-head">${fmtSADate(byDay[day][0].kickoff)}</div>${byDay[day].map(renderSrow).join("")}</div>`
    ).join("");
    const open = s === activeSched;
    return `<div class="group${open ? "" : " collapsed"}">
      <div class="group-head"><h3>${stageLabel(s)} <span class="day-count">${ms.length} مباراة</span></h3><span class="chev">▾</span></div>
      <div class="group-body">${daysHtml}</div>
    </div>`;
  }).join("");

  el.innerHTML =
    `<p class="note">تتحدّث جداول المجموعات تلقائيًا مع ورود النتائج (المتأهلان الأولان مظلّلان). كل المواعيد بتوقيت <b>السعودية (UTC+3)</b>.</p>` +
    `<div class="seg info-seg">
       <button class="seg-btn" data-view="tables">جداول المجموعات</button>
       <button class="seg-btn active" data-view="schedule">الجدول الكامل</button>
     </div>
     <div id="info-tables" class="hidden">${groupsHtml}</div>
     <div id="info-schedule">${schedHtml}</div>`;

  $$(".info-seg .seg-btn", el).forEach((b) =>
    b.addEventListener("click", () => {
      $$(".info-seg .seg-btn", el).forEach((x) => x.classList.toggle("active", x === b));
      $("#info-tables", el).classList.toggle("hidden", b.dataset.view !== "tables");
      $("#info-schedule", el).classList.toggle("hidden", b.dataset.view !== "schedule");
    })
  );
  $$(".group-head", el).forEach((h) =>
    h.addEventListener("click", () => h.parentElement.classList.toggle("collapsed"))
  );
}

// =====================================================================
//  الترتيب العام
// =====================================================================
async function renderBoard() {
  const el = $("#tab-board");
  if (!el.querySelector(".board")) el.innerHTML = `<div class="empty">يتم حساب النقاط…</div>`; // لا وميض عند التحديث التلقائي
  const { data, error } = await sb.rpc("get_leaderboard");
  if (error) { el.innerHTML = `<div class="empty">🏆 يظهر الترتيب عند انطلاق كأس العالم وبدء وصول النتائج.</div>`; return; }
  if (!data?.length) { el.innerHTML = `<div class="empty">${esc(cfg.SITE_BOARD_EMPTY || "🏆 يظهر الترتيب عند انطلاق كأس العالم.")}</div>`; return; }

  // إعادة توزيع للعرض فقط: تُجمع نقاط مباريات الإقصائيات (نتيجة/تامة) مع نقطة
  // المتأهّل تحت «نقاط الإقصائيات»، وتبقى «تامة/نتيجة صحيحة» لدور المجموعات فقط.
  // المجموع لا يتغيّر (يبقى u.total_points من قاعدة البيانات).
  const PE = state.config?.points_exact ?? 2, PR = state.config?.points_result ?? 1, PA = state.config?.points_advance ?? 1;
  const mById = new Map(state.matches.map((m) => [m.id, m]));
  const split = new Map(); // uid -> { ge, gr, ko }
  const su = (uid) => { let s = split.get(uid); if (!s) { s = { ge: 0, gr: 0, ko: 0 }; split.set(uid, s); } return s; };
  const tallyPred = (p) => {
    const m = mById.get(p.match_id);
    if (!m || m.status !== "FINISHED" || m.home_score == null || m.away_score == null) return;
    const exact = p.home_score === m.home_score && p.away_score === m.away_score;
    const result = !exact && Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score);
    const s = su(p.user_id);
    if (isKnockout(m)) s.ko += exact ? PE : (result ? PR : 0);
    else if (exact) s.ge += 1; else if (result) s.gr += 1;
  };
  state.myPreds.forEach((p) => tallyPred(p));
  state.othersPreds.forEach((list) => list.forEach((p) => tallyPred(p)));
  // المتأهّل الفعّال لكل (مستخدم، مباراة) في الإقصائيات: يُبنى أولًا من التوقّعات
  // الحاسمة، ثم يَغلبه الاختيار الصريح — ثم يُحتسب مرة واحدة. يطابق get_leaderboard.
  const effByKey = new Map(); // `${uid}|${mid}` -> team
  const setEff = (uid, mid, team) => { if (team) effByKey.set(`${uid}|${mid}`, team); };
  const derive = (uid, p) => {
    const m = mById.get(p.match_id);
    if (!m || !isKnockout(m) || p.home_score == null || p.away_score == null) return;
    const t = p.home_score > p.away_score ? m.home_team : (p.away_score > p.home_score ? m.away_team : null);
    setEff(uid, p.match_id, t);
  };
  state.myPreds.forEach((p) => derive(state.user.id, p));
  state.othersPreds.forEach((list) => list.forEach((p) => derive(p.user_id, p)));
  state.bracketPreds.forEach((team, mid) => setEff(state.user.id, mid, team));
  state.bracketOthers.forEach((list, mid) => list.forEach((b) => setEff(b.user_id, mid, b.advance_team)));
  effByKey.forEach((team, key) => {
    const i = key.indexOf("|");
    const uid = key.slice(0, i), mid = Number(key.slice(i + 1));
    const m = mById.get(mid);
    if (!m || m.status !== "FINISHED") return;
    const act = m.winner === "HOME_TEAM" ? m.home_team : m.winner === "AWAY_TEAM" ? m.away_team : null;
    if (act && team === act) su(uid).ko += PA;
  });

  const rows = data.map((u, i) => {
    const me = u.user_id === state.user.id ? " me" : "";
    const sp = split.get(u.user_id) || { ge: 0, gr: 0, ko: 0 };
    const parts = [
      `${sp.ge} توقّعات تامة`,
      `${sp.gr} نتيجة صحيحة`,
    ];
    if (u.bonus_points) parts.push(`${u.bonus_points} نقاط إضافية`);
    if (u.group_points) parts.push(`${u.group_points} نقاط الترتيب`);
    if (u.perfect_groups) {
      const pb = u.perfect_groups * (state.config?.points_group_perfect || 0);
      parts.push(`<span class="perfect-tag"> ${u.perfect_groups} مجموعة مثالية (+${pb})</span>`);
    }
    if (u.third_points) parts.push(`${u.third_points} نقاط الثوالث`);
    if (sp.ko) parts.push(`${sp.ko} نقاط الإقصائيات`);
    return `<div class="row${me}">
      <div class="rank">${i + 1}</div>
      <div class="name">${esc(u.display_name)}${me ? " (أنت)" : ""}
        <small>${parts.join(" · ")}</small>
      </div>
      <div class="total">${u.total_points}<span> نقطة</span></div>
    </div>`;
  }).join("");
  el.innerHTML = `<p class="note">يتحدّث تلقائيًا مع ورود النتائج.</p><div class="board">${rows}</div>`;
}

function emptyState() {
  return `<div class="empty">لم تُحمّل المباريات بعد.<br/>تظهر تلقائيًا عند أول تشغيل لوظيفة النتائج.</div>`;
}

// =====================================================================
//  تبويب الإحصائيات — أفضل ٥ في كل فئة
//  يجمع بين لوحة الصدارة (get_leaderboard) والتوقّعات المحمّلة محليًا.
//  قسمة نقاط النتائج (مجموعات/إقصائيات) تُحسب هنا بنفس منطق لوحة الصدارة،
//  ونقطة المتأهّل تؤخذ من الخادم (bracket_points) لضمان التطابق.
// =====================================================================
async function renderStats() {
  const el = $("#tab-stats");
  if (!el.querySelector(".stats")) el.innerHTML = `<div class="empty">يتم حساب الإحصائيات…</div>`;
  const { data: lb, error } = await sb.rpc("get_leaderboard");
  if (error || !lb || !lb.length) {
    el.innerHTML = `<div class="empty">📊 تظهر الإحصائيات عند انطلاق البطولة وبدء وصول النتائج.</div>`;
    return;
  }

  const PE = state.config?.points_exact ?? 2, PR = state.config?.points_result ?? 1;
  const mById = new Map(state.matches.map((m) => [m.id, m]));
  const add = (map, uid, v) => map.set(uid, (map.get(uid) || 0) + v);

  // نقاط تسجيل النتائج مقسومة: دور المجموعات · الأدوار الإقصائية
  const grpScore = new Map(), koScore = new Map();
  const scorePred = (p) => {
    const m = mById.get(p.match_id);
    if (!m || m.status !== "FINISHED" || m.home_score == null || m.away_score == null) return;
    const exact = p.home_score === m.home_score && p.away_score === m.away_score;
    const result = !exact && Math.sign(p.home_score - p.away_score) === Math.sign(m.home_score - m.away_score);
    const pts = exact ? PE : (result ? PR : 0);
    if (pts) add(isKnockout(m) ? koScore : grpScore, p.user_id, pts);
  };
  // النشاط (عدد التوقّعات) والتغييرات (توقّعات عُدِّلت بعد إدخالها بأكثر من ٥ دقائق)
  const activity = new Map(), changes = new Map();
  const meta = (p) => {
    add(activity, p.user_id, 1);
    if (p.created_at && p.updated_at && (new Date(p.updated_at) - new Date(p.created_at)) > 5 * 60000)
      add(changes, p.user_id, 1);
  };
  const eachPred = (p) => { scorePred(p); meta(p); };
  state.myPreds.forEach(eachPred);
  state.othersPreds.forEach((list) => list.forEach(eachPred));

  // الأدوار الإقصائية = نقاط النتائج + نقاط المتأهّل (من الخادم)
  const koTotal = new Map();
  new Set([...koScore.keys(), ...lb.map((u) => u.user_id)]).forEach((uid) => {
    const bp = lb.find((u) => u.user_id === uid)?.bracket_points || 0;
    koTotal.set(uid, (koScore.get(uid) || 0) + bp);
  });

  const nameOf = (uid) => state.names.get(uid) || lb.find((u) => u.user_id === uid)?.display_name || "؟";
  const fromMap = (map) => [...map.entries()].map(([uid, v]) => ({ uid, name: nameOf(uid), v }))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  const fromField = (f) => lb.map((u) => ({ uid: u.user_id, name: u.display_name, v: u[f] || 0 }))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);

  const cards = [
    { icon: "⚽", title: "دور المجموعات", sub: "نقاط توقّع نتائج مباريات المجموعات", unit: "نقطة", list: fromMap(grpScore) },
    { icon: "🎯", title: "الأدوار الإقصائية", sub: "نقاط النتائج + المتأهّل في الإقصائيات", unit: "نقطة", list: fromMap(koTotal) },
    { icon: "🏆", title: "البطل والنهائيون ونصف النهائيون", sub: "النقاط الإضافية", unit: "نقطة", list: fromField("bonus_points") },
    { icon: "📊", title: "ترتيب المجموعات", sub: "توقّع ترتيب فرق كل مجموعة", unit: "نقطة", list: fromField("group_points") },
    { icon: "🥉", title: "أصحاب المركز الثالث", sub: "توقّع المتأهّلين من الثوالث", unit: "نقطة", list: fromField("third_points") },
    { icon: "🔥", title: "الأكثر تفاعلًا", sub: "عدد التوقّعات المُدخَلة", unit: "توقّع", list: fromMap(activity) },
    { icon: "✏️", title: "الأكثر تغييرًا لتوقّعاته", sub: "توقّعات عُدِّلت بعد إدخالها", unit: "تعديل", list: fromMap(changes) },
  ];

  const medals = ["🥇", "🥈", "🥉", "٤", "٥"];
  const cardHtml = (c) => {
    const rows = c.list.length
      ? c.list.map((x, i) => `<div class="st-row${x.uid === state.user.id ? " me" : ""}">
          <span class="st-rank">${medals[i]}</span>
          <span class="st-name">${esc(x.name)}${x.uid === state.user.id ? " <em>(أنت)</em>" : ""}</span>
          <span class="st-val">${x.v}<small> ${c.unit}</small></span>
        </div>`).join("")
      : `<div class="st-empty">لا بيانات بعد</div>`;
    return `<div class="st-card">
      <div class="st-head"><span class="st-ico">${c.icon}</span>
        <div><div class="st-title">${c.title}</div><div class="st-sub">${c.sub}</div></div></div>
      <div class="st-list">${rows}</div>
    </div>`;
  };
  el.innerHTML = `<p class="note">أفضل ٥ في كل فئة · يتحدّث تلقائيًا مع ورود النتائج.</p>
    <div class="stats">${cards.map(cardHtml).join("")}</div>`;
}

// =====================================================================
//  تتويج البطل — يظهر مرة واحدة بعد انتهاء مباراة النهائي.
//  المرحلة ١: بطل كأس العالم (يُقرأ الفائز من مباراة النهائي).
//  المرحلة ٢: بطل التوقّعات (متصدّر لوحة الصدارة) + قصاصات + فيديو.
// =====================================================================
function finalMatch() { return state.matches.find((m) => m.stage === "FINAL"); }
function finalWinnerTeam(m) {
  if (!m || m.status !== "FINISHED") return null;
  if (m.winner === "HOME_TEAM") return m.home_team;
  if (m.winner === "AWAY_TEAM") return m.away_team;
  if (m.home_score != null && m.away_score != null) {
    if (m.home_score > m.away_score) return m.home_team;
    if (m.away_score > m.home_score) return m.away_team;
  }
  return null; // لم يُحسم بعد
}
async function maybeShowChampion() {
  if (!state.user) return;
  const champTeam = finalWinnerTeam(finalMatch());
  if (!champTeam) return;                         // النهائي لم ينتهِ بعد
  const key = `wc_champion_${state.user.id}`;
  try { if (localStorage.getItem(key)) return; } catch { return; }
  let leaderName = null, leaderIsMe = false;
  try {
    const { data } = await sb.rpc("get_leaderboard");
    if (data && data.length) { leaderName = data[0].display_name; leaderIsMe = data[0].user_id === state.user.id; }
  } catch {}
  try { localStorage.setItem(key, "1"); } catch {}
  showChampion(champTeam, leaderName, leaderIsMe);
}
function fireConfetti() {
  if (typeof window.confetti !== "function") return;
  const colors = ["#f6c945", "#2fe08a", "#5b8cff", "#ff5a5f", "#ffffff"];
  window.confetti({ particleCount: 180, spread: 100, startVelocity: 45, origin: { y: 0.55 }, colors });
  const end = Date.now() + 2600;
  (function frame() {
    window.confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0 }, colors });
    window.confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
function showChampion(champTeam, leaderName, leaderIsMe) {
  if ($("#champ")) return;
  const wrap = document.createElement("div");
  wrap.id = "champ";
  wrap.innerHTML =
    `<div class="champ-dim"></div>` +
    `<div class="champ-card" role="dialog" aria-modal="true">` +
      `<div class="champ-stage" data-stage="1">` +
        `<div class="champ-trophy">🏆</div>` +
        `<div class="champ-kicker">بطل كأس العالم ٢٠٢٦</div>` +
        `<div class="champ-team">${flagImg(champTeam, "champ-flag")}<span>${tn(champTeam)}</span></div>` +
        `<button class="champ-next" type="button">تتويج بطل التوقّعات 🎉</button>` +
      `</div>` +
      `<div class="champ-stage" data-stage="2" hidden>` +
        `<div class="champ-kicker">بطل التوقّعات</div>` +
        `<div class="champ-winner">${esc(leaderName || "—")}</div>` +
        (leaderIsMe ? `<div class="champ-you">🎉 مبروك! أنت البطل 🎉</div>` : ``) +
        `<video class="champ-video" src="./assets/champion.mp4" playsinline controls preload="auto"></video>` +
        `<button class="champ-ok" type="button">إغلاق</button>` +
      `</div>` +
    `</div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  const vid = $(".champ-video", wrap);
  // إن لم يتوفّر ملف الفيديو، أخفِه بهدوء (تبقى القصاصات والاسم).
  vid.addEventListener("error", () => { vid.style.display = "none"; });
  $(".champ-next", wrap).addEventListener("click", () => {
    $('.champ-stage[data-stage="1"]', wrap).hidden = true;
    $('.champ-stage[data-stage="2"]', wrap).hidden = false;
    fireConfetti();
    try { vid.play().catch(() => {}); } catch {}
  });
  $(".champ-ok", wrap).addEventListener("click", close);
  $(".champ-dim", wrap).addEventListener("click", close);
}

// =====================================================================
//  جولة إرشادية (تظهر بعد تسجيل الدخول، ويمكن إغلاقها أو إعادتها لاحقًا)
// =====================================================================
const TOUR_VERSION = "v1";
const tourKey = (uid) => `wc_tour_done_${TOUR_VERSION}_${uid || "anon"}`;
const TOUR_STEPS = [
  {
    tab: null, kicker: "أهلاً بك 👋", title: "جولة سريعة في الموقع",
    body: "خلّينا نأخذك في دقيقة واحدة على صفحات الموقع وكيف تتوقّع. تقدر تتخطّاها أو تعيدها لاحقًا من زر «؟» بالأسفل.",
  },
  {
    tab: "groups", kicker: "الخطوة ١", title: "دور المجموعات",
    body: "توقّع نتيجة كل مباراة في دور المجموعات. تُحفظ توقعاتك تلقائيًا، وتقدر تعدّلها وقت ما تشاء قبل انطلاق المباراة — وتُقفل عند صافرة البداية. (٢ نقطة للنتيجة بالضبط · ١ لتوقّع الفائز)",
  },
  {
    tab: "knockouts", kicker: "الخطوة ٢", title: "الأدوار الإقصائية",
    body: "مثل دور المجموعات لكن لمباريات خروج المغلوب: توقّع النتيجة وحدِّد مَن يتأهل من كل مواجهة. تظهر المباريات تلقائيًا بعد انتهاء دور المجموعات، وتقدر تغيّر توقعك حسب مجريات البطولة.",
  },
  {
    tab: "picks", kicker: "الخطوة ٣", title: "ترتيب المجموعات",
    body: "رتّب فرق كل مجموعة بالسحب والإفلات من الأول إلى الرابع (المتصدّر، الوصيف، الثالث، الرابع)، ثم اختر ٨ فرق تتوقّع تأهّلها كأفضل أصحاب المركز الثالث.",
  },
  {
    tab: "bracket", kicker: "الخطوة ٤", title: "بطاقة التوقّع",
    body: "تتحوّل ترتيباتك في الصفحة السابقة إلى شجرة إقصائيات من دور الـ32 حتى النهائي. اختر الفائز في كل مواجهة وصولًا إلى بطلك المتوقّع.",
  },
  {
    tab: "bonus", kicker: "الخطوة ٥", title: "ملخص توقعاتي",
    body: "صفحة ملخّص: تقدّمك في كل التوقعات، إضافةً إلى بطلك وأصحاب النهائي ونصف النهائي المأخوذين تلقائيًا من بطاقة توقّعك. لتعديلها افتح البطاقة.",
  },
  {
    tab: "info", kicker: "الخطوة ٦", title: "المجموعات والجدول",
    body: "صفحة معلومات: جداول المجموعات تتحدّث مباشرةً مع ورود النتائج، إضافةً إلى جدول كامل بمواعيد وأوقات جميع المباريات بتوقيت السعودية.",
  },
  {
    tab: "board", kicker: "الخطوة ٧", title: "الترتيب العام",
    body: "لوحة الصدارة: ترتيب جميع اللاعبين حسب النقاط وعدد التوقعات الصحيحة، ويُحدَّث تلقائيًا بعد كل مباراة. الأدقّ توقّعًا يتصدّر!",
  },
  {
    tab: null, kicker: "جاهز 🎯", title: "ابدأ التوقّع!",
    body: "ابدأ من «دور المجموعات». تقدر تعيد فتح هذه الجولة في أي وقت من زر «؟» في أسفل الشاشة. بالتوفيق!",
  },
];
let tourIdx = 0;

function buildTourDom() {
  if ($("#tour")) return;
  document.body.classList.add("tour-on");
  const wrap = document.createElement("div");
  wrap.id = "tour";
  wrap.innerHTML = `<div id="tour-dim"></div><div id="tour-card" class="tour-card"></div>`;
  document.body.appendChild(wrap);
  window.addEventListener("resize", tourReposition);
  window.addEventListener("scroll", tourReposition, { passive: true });
}
function tourReposition() { const s = TOUR_STEPS[tourIdx]; if (s && $("#tour")) positionCard(s); }
function clearTourActive() { $$(".tab.tour-active").forEach((t) => t.classList.remove("tour-active")); }

// We highlight the REAL active tab via a CSS class (so it can never drift on
// any screen). Only the explanation card is positioned — and only roughly,
// placed just under the tabs bar, centered on the highlighted tab.
function positionCard(step) {
  const card = $("#tour-card");
  if (!card) return;
  const tab = step.tab ? $(`.tab[data-tab="${step.tab}"]`) : null;
  if (!tab) {
    card.classList.add("center");
    card.style.left = card.style.top = ""; card.style.transform = "";
    return;
  }
  const nav = $(".tabs");
  const navR = (nav || tab).getBoundingClientRect();
  const tabR = tab.getBoundingClientRect();
  card.classList.remove("center"); card.style.transform = "none";
  const cw = card.offsetWidth || 340;
  let left = tabR.left + tabR.width / 2 - cw / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - cw - 12));
  card.style.left = left + "px";
  card.style.top = (navR.bottom + 12) + "px";
}

function renderTourCard(step) {
  const card = $("#tour-card");
  if (!card) return;
  const last = tourIdx === TOUR_STEPS.length - 1;
  const dots = TOUR_STEPS.map((_, i) => `<span class="tour-dot${i === tourIdx ? " on" : ""}"></span>`).join("");
  card.innerHTML = `
    <button class="tour-x" id="tour-x" aria-label="إغلاق">✕</button>
    <div class="tour-kicker">${esc(step.kicker)}</div>
    <h3>${esc(step.title)}</h3>
    <p>${esc(step.body)}</p>
    <div class="tour-foot">
      <div class="tour-dots">${dots}</div>
      <div class="tour-btns">
        ${tourIdx > 0 ? `<button class="tour-btn" id="tour-prev">السابق</button>` : `<button class="tour-skip" id="tour-skip">تخطّي</button>`}
        <button class="tour-btn primary" id="tour-next">${last ? "ابدأ" : "التالي"}</button>
      </div>
    </div>`;
  $("#tour-x", card).onclick = () => endTour(true);
  const skip = $("#tour-skip", card); if (skip) skip.onclick = () => endTour(true);
  const prev = $("#tour-prev", card); if (prev) prev.onclick = () => { tourIdx = Math.max(0, tourIdx - 1); showTourStep(); };
  $("#tour-next", card).onclick = () => {
    if (last) { endTour(true); return; }
    tourIdx = Math.min(TOUR_STEPS.length - 1, tourIdx + 1); showTourStep();
  };
}

function showTourStep() {
  clearTourActive();
  const step = TOUR_STEPS[tourIdx];
  if (step.tab) {
    const t = $(`.tab[data-tab="${step.tab}"]`);
    if (t) {
      t.click();                      // switch to that page (sets .active)
      t.classList.add("tour-active"); // our spotlight ring, on the real tab
      try { t.scrollIntoView({ block: "nearest", inline: "center" }); } catch {}
    }
  }
  renderTourCard(step);
  // Card placement only (the highlight itself is the real element, never drifts).
  requestAnimationFrame(() => requestAnimationFrame(() => positionCard(step)));
}

function startTour() {
  tourIdx = 0;
  buildTourDom();
  showTourStep();
}
function endTour(markDone) {
  const w = $("#tour"); if (w) w.remove();
  document.body.classList.remove("tour-on");
  clearTourActive();
  window.removeEventListener("resize", tourReposition);
  window.removeEventListener("scroll", tourReposition);
  if (markDone && state.user) { try { localStorage.setItem(tourKey(state.user.id), "1"); } catch {} }
}
function maybeStartTour() {
  try {
    if (state.user && !localStorage.getItem(tourKey(state.user.id))) startTour();
  } catch { /* localStorage blocked — skip */ }
}

// تنبيه يظهر مرة واحدة فقط — حصريًا لموقع «استراحة 6» (يُعرّف بمشروع Supabase
// الخاص به)، فلا يظهر على موقع العائلة رغم اشتراكهما في نفس الكود.
const NOTICE_VERSION = "v1";
function isEstraha6() {
  return String(cfg.SUPABASE_URL || "").includes("rodqybmuajlebyotmgmq");
}
function maybeShowNotice() {
  if (!isEstraha6() || !state.user) return;
  const key = `estraha6_notice_${NOTICE_VERSION}_${state.user.id}`;
  try {
    if (localStorage.getItem(key)) return; // عُرض من قبل
  } catch { return; }
  showNotice("مهما أخذتك الحنكة والحماس، تذكر انه مافي جوائز");
  try { localStorage.setItem(key, "1"); } catch {}
}
function showNotice(text) {
  if ($("#notice")) return;
  const wrap = document.createElement("div");
  wrap.id = "notice";
  wrap.innerHTML =
    `<div class="notice-dim"></div>` +
    `<div class="notice-card" role="dialog" aria-modal="true">` +
      `<div class="notice-emoji">🏆</div>` +
      `<p class="notice-text">${esc(text)}</p>` +
      `<button class="notice-ok" type="button">حسناً</button>` +
    `</div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  $(".notice-ok", wrap).addEventListener("click", close);
  $(".notice-dim", wrap).addEventListener("click", close);
}
function ensureTourHelp() {
  if ($("#tour-help")) return;
  const b = document.createElement("button");
  b.id = "tour-help";
  b.type = "button";
  b.title = "شرح صفحات الموقع";
  b.textContent = "؟";
  b.addEventListener("click", () => startTour());
  document.body.appendChild(b);
}

// ---------- إقلاع ----------
(async () => {
  // رابط إعادة تعيين كلمة المرور: اعرض شاشة كلمة المرور الجديدة بدل الدخول.
  if (window.location.hash.includes("type=recovery")) { isRecovery = true; showRecovery(); return; }
  const { data } = await sb.auth.getSession();
  if (data.session?.user) {
    if (!entering) { entering = true; enterApp(data.session.user); }
  } else {
    showAuth();
  }
})();
