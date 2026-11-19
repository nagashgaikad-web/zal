/* Зал — дневник тренировок для телефона.
   Хранит всё в телефоне и отправляет в закрытый репозиторий GitHub; тренер разбирает тренировку по расписанию. */
(() => {
"use strict";
const VERSION = "1.0.4";

/* ---------------- утилиты ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem("zal." + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("zal." + k, JSON.stringify(v)); } catch (e) { console.warn("storage", e); } },
  del(k) { try { localStorage.removeItem("zal." + k); } catch (_) {} }
};
const pad2 = n => String(n).padStart(2, "0");
const ymd = (d = new Date()) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const pd = s => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); };
const MON = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MON_S = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
const DOW = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const DOW_S = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const fmtLong = d => DOW[d.getDay()] + ", " + d.getDate() + " " + MON[d.getMonth()];
const fmtShort = s => { const d = pd(s); return DOW_S[d.getDay()] + ", " + d.getDate() + " " + MON_S[d.getMonth()]; };
const mmss = sec => { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ":" + pad2(s % 60); };
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return h ? h + ":" + pad2(Math.floor(s % 3600 / 60)) + ":" + pad2(s % 60) : Math.floor(s / 60) + ":" + pad2(s % 60); };
const fmtW = w => w == null || w === "" ? "—" : (Math.round(w * 100) / 100).toString().replace(".", ",");
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
const range = s => { const m = String(s || "").match(/(\d+)\s*[–-]\s*(\d+)/); if (m) return { lo: +m[1], hi: +m[2] }; const n = parseInt(s, 10); return isFinite(n) ? { lo: n, hi: n } : { lo: 10, hi: 12 }; };
const daysBetween = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);

/* ---------------- иконки ---------------- */
const sv = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
const I = {
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  minus: sv('<path d="M5 12h14"/>'),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  chevR: sv('<path d="M9 5l7 7-7 7"/>'),
  chevL: sv('<path d="M15 5l-7 7 7 7"/>'),
  chevD: sv('<path d="M5 9l7 7 7-7"/>'),
  more: sv('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
  play: sv('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  pause: sv('<path d="M8 5v14M16 5v14"/>'),
  info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  swap: sv('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
  skip: sv('<path d="M5 5l9 7-9 7zM18 5v14"/>'),
  note: sv('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>'),
  camera: sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  flame: sv('<path d="M12 3c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3 2-4.5 2-7 2 1 3 2.5 3 4 1-1.5 1.5-4.5 1-8z"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
  home: sv('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  hist: sv('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  coach: sv('<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  clock: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
  list: sv('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
  trash: sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  spark: sv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
  bolt: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  warn: sv('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
  medal: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  refresh: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  up: sv('<path d="M12 19V5M5 12l7-7 7 7"/>')
};

/* ---------------- настройки ---------------- */
const DEF_CFG = { owner: "", repo: "zal-data", token: "", branch: "main", api: "https://api.github.com",
  restBase: 120, restIso: 90, restEx: 120, sound: true, haptics: true, awake: true, treatment: true, skipOnb: false };
let CFG = Object.assign({}, DEF_CFG, LS.get("cfg", {}));
const saveCfg = () => LS.set("cfg", CFG);
let COACH_TIME = LS.get("coachTime", "14:00"); // время разбора — из zal-data/config.json
let COACH_TZ = LS.get("coachTz", "America/Whitehorse"); // часовой пояс разбора — как на ноутбуке, не на телефоне
function coachWhen() {
  const [h, m] = COACH_TIME.split(":").map(Number); let mins;
  try { const p = new Intl.DateTimeFormat("en-GB", { timeZone: COACH_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()); mins = +p.find(x => x.type === "hour").value * 60 + +p.find(x => x.type === "minute").value; }
  catch (_) { const n = new Date(); mins = n.getHours() * 60 + n.getMinutes(); }
  return (mins < h * 60 + m ? "сегодня" : "завтра") + " в " + COACH_TIME;
}
const EGD_DATE = "2027-01-11"; // контрольная ЭГДС — не раньше этой даты

/* ---------------- программа по умолчанию (копия Дневника, v6) ---------------- */
const DEFAULT_PROGRAM = {"version":6,"updated":"2026-11-17","custom":{},"days":{"A":[{"id":"bike","reps":"7–10 мин","sets":1},{"id":"bulgarian","reps":"8–10","sets":2},{"id":"incline_db","reps":"10–12","sets":2},{"id":"gravitron","reps":"10–12","sets":2},{"id":"leg_curl","reps":"10–12","sets":2},{"id":"lateral","reps":"12–15","sets":2},{"ss":[{"id":"hammer","reps":"10–12","sets":2},{"id":"rope_pushdown","reps":"12–15","sets":2}]},{"id":"pallof","reps":"10","sets":2}],"B":[{"id":"bike","reps":"7–10 мин","sets":1},{"id":"leg_press","reps":"12","sets":2},{"id":"chest_press","reps":"10–12","sets":2},{"id":"cable_row","reps":"10–12","sets":2},{"id":"lateral","reps":"12–15","sets":2},{"ss":[{"id":"abduction","reps":"12–15","sets":2},{"id":"adduction","reps":"12–15","sets":2}]},{"id":"incline_curl","reps":"10–12","sets":2},{"id":"triceps_machine","reps":"12","sets":2},{"ss":[{"id":"wrist_curl","reps":"15–20","sets":2},{"id":"calf_raise","reps":"12–15","sets":2}]}],"C":[{"id":"bike","reps":"7–10 мин","sets":1},{"id":"leg_ext","reps":"12–15","sets":2},{"id":"hammer_pulldown","reps":"10–12","sets":2},{"id":"pec_deck","reps":"12–15","sets":2},{"id":"kickback","reps":"12–15","sets":2},{"id":"leg_curl","reps":"12–15","sets":2},{"id":"lateral","reps":"12–15","sets":2},{"id":"rear_delt","reps":"15","sets":2},{"ss":[{"id":"bb_curl","reps":"10–12","sets":2},{"id":"triceps_machine","reps":"12","sets":2}]},{"id":"reverse_curl","reps":"12–15","sets":2},{"id":"pallof","reps":"10","sets":2}]},"targets":{"bulgarian":{"date":"2026-11-14","note":"без веса или гантели 4–6 кг","reps":"8–10","sets":2,"w":0},"gravitron":{"date":"2026-11-14","note":"тяжело — 25 кг","reps":"10","sets":2,"w":20.4},"hammer":{"date":"2026-11-14","reps":"10","sets":2,"w":8},"incline_curl":{"date":"2026-11-15","note":"гантели по 6 кг, запас 3–4","reps":"10–12","sets":2,"w":6},"incline_db":{"date":"2026-11-14","reps":"12","sets":2,"w":16},"lateral":{"date":"2026-11-14","reps":"12","sets":2,"w":32},"leg_press":{"date":"2026-11-17","note":"запас 3–4 повтора, без отказа; закончить подход, когда повторы пойдут тяжело","reps":"12","sets":2,"w":80},"rope_pushdown":{"date":"2026-11-14","reps":"12–15","sets":2,"w":18}}};

let PROG = LS.get("program", null) || DEFAULT_PROGRAM;
let COACH = LS.get("coach", null);            // последний разбор
let COACH_ARCH = LS.get("coachArch", []);     // архив разборов
let HIST = LS.get("hist", {});                // id -> тренировка (из GitHub и локальные)
let SES = LS.get("active", null);             // идущая тренировка
let OUT = LS.get("outbox", {});               // очередь на отправку: path -> {d, msg, b64, ts}
let SHAS = LS.get("shas", {});
const SYNC = { busy: false, err: null, lastPull: LS.get("lastPull", 0), lastPush: LS.get("lastPush", 0) };

/* ---------------- упражнения ---------------- */
const COMPOUND = new Set(["bulgarian","leg_press","pendulum","goblet","reverse_lunge","incline_db","chest_press","gravitron","cable_row","hammer_pulldown"]);
const DUMBBELL = new Set(["incline_db","hammer","incline_curl","bulgarian","goblet","reverse_lunge"]);
const STEP = { leg_press: 5, bb_curl: 2.5, reverse_curl: 2.5, wrist_curl: 2.5 };
const exInfo = id => EX[id] || (PROG.custom && PROG.custom[id]) || { name: id, prim: [], sec: [] };
const stepFor = id => STEP[id] || (DUMBBELL.has(id) ? 1 : 2.5);
const restFor = id => COMPOUND.has(id) ? CFG.restBase : CFG.restIso;
const e1rm = s => s.w * (1 + s.r / 30);
const unitNote = id => exInfo(id).assist ? "противовес · меньше = тяжелее" : DUMBBELL.has(id) ? "вес одной гантели" : exInfo(id).perSide ? "на каждую ногу" : "";

/* ---------------- история ---------------- */
const doneWorkouts = () => Object.values(HIST).filter(w => w && w.date && w.status !== "active" && w.status !== "deleted").sort((a, b) => (a.date + (a.startedAt || "")).localeCompare(b.date + (b.startedAt || "")));
function lastFor(id, beforeDate) {
  const ws = doneWorkouts().filter(w => !beforeDate || w.date <= beforeDate).reverse();
  for (const w of ws) { const x = (w.exercises || []).find(e => e.id === id && (e.sets && e.sets.length || e.minutes != null)); if (x) return { date: w.date, ...x }; }
  return null;
}
function nextType() {
  const ws = doneWorkouts(); if (!ws.length) return "A";
  const last = ws[ws.length - 1].type; const order = ["A", "B", "C"]; const i = order.indexOf(last);
  return i < 0 ? "A" : order[(i + 1) % 3];
}
const tonnage = w => (w.exercises || []).reduce((t, x) => t + (x.sets || []).reduce((s, st) => s + (exInfo(x.id).assist ? 0 : (st.w || 0) * (st.r || 0) * (exInfo(x.id).perSide ? 2 : 1) * (DUMBBELL.has(x.id) && !exInfo(x.id).perSide ? 2 : 1)), 0), 0);
const setCount = w => (w.exercises || []).reduce((t, x) => t + (x.sets ? x.sets.length : 0), 0);
const fmtT = kg => kg >= 1000 ? (Math.round(kg / 100) / 10).toString().replace(".", ",") + " т" : Math.round(kg) + " кг";

/* ---------------- GitHub ---------------- */
function b64enc(str) { const bytes = new TextEncoder().encode(str); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64dec(b64) { const bin = atob(String(b64).replace(/\s/g, "")); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const GH = {
  ok: () => !!(CFG.owner && CFG.repo && CFG.token),
  url(p) { return CFG.api.replace(/\/$/, "") + "/repos/" + encodeURIComponent(CFG.owner.trim()) + "/" + encodeURIComponent(CFG.repo.trim()) + "/contents/" + p.split("/").map(encodeURIComponent).join("/"); },
  async req(method, p, body) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(this.url(p) + (method === "GET" ? "?ref=" + encodeURIComponent(CFG.branch) + "&t=" + Date.now() : ""), {
        method, cache: "no-store", signal: ctl.signal,
        headers: Object.assign({ "Authorization": "Bearer " + CFG.token.trim(), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, body ? { "Content-Type": "application/json" } : {}),
        body: body ? JSON.stringify(body) : undefined
      });
      return r;
    } finally { clearTimeout(tm); }
  },
  async err(r) { let m = ""; try { m = (await r.json()).message || ""; } catch (_) {} return new HttpError(r.status, m || ("HTTP " + r.status)); },
  async getRaw(p) {
    const r = await this.req("GET", p);
    if (r.status === 404) return null;
    if (!r.ok) throw await this.err(r);
    const j = await r.json();
    if (Array.isArray(j)) return { dir: j };
    SHAS[p] = j.sha; LS.set("shas", SHAS);
    return { sha: j.sha, b64: j.content || "" };
  },
  async getJSON(p) { const r = await this.getRaw(p); if (!r || r.dir) return null; return { sha: r.sha, data: JSON.parse(b64dec(r.b64) || "null") }; },
  async list(dir) { const r = await this.getRaw(dir); return r && r.dir ? r.dir : []; },
  async put(p, content, msg, isB64) {
    const body = { message: msg || ("Зал: " + p), content: isB64 ? content : b64enc(content), branch: CFG.branch };
    if (SHAS[p]) body.sha = SHAS[p];
    let r = await this.req("PUT", p, body);
    if (r.status === 409 || r.status === 422) { // устаревший sha — берём свежий и повторяем
      delete body.sha; const cur = await this.getRaw(p); if (cur && cur.sha) body.sha = cur.sha;
      r = await this.req("PUT", p, body);
    }
    if (!r.ok) throw await this.err(r);
    const j = await r.json(); if (j.content && j.content.sha) { SHAS[p] = j.content.sha; LS.set("shas", SHAS); }
    return j;
  }
};
function errText(e) {
  if (!e) return "";
  if (e.status === 401) return "Ключ GitHub не подходит или истёк";
  if (e.status === 403) return "У ключа нет прав на запись (Contents: Read and write)";
  if (e.status === 404) return "Репозиторий не найден — проверь логин и название";
  if (e.name === "AbortError") return "GitHub не ответил — плохая связь";
  if (e instanceof TypeError) return "Нет связи с GitHub";
  return e.message || String(e);
}

/* ---------------- очередь отправки ---------------- */
let flushTimer = 0;
function queue(path, data, msg, isB64) {
  OUT[path] = { d: data, msg, b64: !!isB64, ts: Date.now() };
  LS.set("outbox", OUT); renderSync(); scheduleFlush(600);
}
function scheduleFlush(ms) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms); }
async function flush() {
  if (SYNC.busy || !GH.ok() || !Object.keys(OUT).length) { renderSync(); return; }
  if (!navigator.onLine) { renderSync(); return; }
  SYNC.busy = true; renderSync();
  try {
    for (const p of Object.keys(OUT)) {
      const it = OUT[p];
      await GH.put(p, it.d, it.msg, it.b64);
      if (OUT[p] && OUT[p].ts === it.ts) { delete OUT[p]; LS.set("outbox", OUT); }
      const m = p.match(/^workouts\/(.+)\.json$/); if (m && HIST[m[1]] && SHAS[p]) { HIST[m[1]]._sha = SHAS[p]; LS.set("hist", HIST); }
    }
    SYNC.err = null; SYNC.lastPush = Date.now(); LS.set("lastPush", SYNC.lastPush);
  } catch (e) { SYNC.err = e; scheduleFlush(e.status === 401 || e.status === 404 ? 60000 : 12000); }
  finally { SYNC.busy = false; renderSync(); if (Object.keys(OUT).length && !SYNC.err) scheduleFlush(400); }
}

/* ---------------- загрузка с GitHub ---------------- */
let pulling = false;
async function pull(opts = {}) {
  if (pulling || !GH.ok() || !navigator.onLine) return false;
  pulling = true; renderSync();
  let changed = false;
  try {
    const [p, c, cf] = await Promise.all([GH.getJSON("program.json"), GH.getJSON("coach/latest.json"), GH.getJSON("config.json")]);
    if (cf && cf.data && cf.data.coachTime && cf.data.coachTime !== COACH_TIME) { COACH_TIME = cf.data.coachTime; LS.set("coachTime", COACH_TIME); changed = true; }
    if (cf && cf.data && cf.data.tz && cf.data.tz !== COACH_TZ) { COACH_TZ = cf.data.tz; LS.set("coachTz", COACH_TZ); }
    if (p && p.data && JSON.stringify(p.data) !== JSON.stringify(PROG)) { PROG = p.data; LS.set("program", PROG); changed = true; }
    if (c && c.data && (!COACH || c.data.id !== COACH.id || c.data.date !== COACH.date)) {
      const isNew = !!COACH; COACH = c.data; LS.set("coach", COACH);
      if (!COACH_ARCH.some(x => x.id === COACH.id)) { COACH_ARCH.unshift(COACH); COACH_ARCH = COACH_ARCH.slice(0, 60); LS.set("coachArch", COACH_ARCH); }
      changed = true; if (isNew && !opts.silent) toast("Тренер прислал разбор: " + (COACH.title || "новая запись"), "ac", 4500);
    }
    const files = await GH.list("workouts");
    const present = new Set(files.filter(f => /\.json$/.test(f.name)).map(f => f.name.replace(/\.json$/, "")));
    for (const id of Object.keys(HIST)) { // тренировку удалили в GitHub — убираем и с телефона
      if (!present.has(id) && HIST[id] && HIST[id]._sha && !OUT["workouts/" + id + ".json"] && !(SES && SES.id === id)) { delete HIST[id]; delete SHAS["workouts/" + id + ".json"]; changed = true; }
    }
    for (const f of files) {
      if (!/\.json$/.test(f.name)) continue;
      const id = f.name.replace(/\.json$/, "");
      if (SES && SES.id === id) continue;
      if (OUT["workouts/" + f.name]) continue;
      if (HIST[id] && HIST[id]._sha === f.sha) continue;
      const w = await GH.getJSON("workouts/" + f.name);
      if (w && w.data) { HIST[id] = Object.assign(w.data, { _id: id, _sha: f.sha }); changed = true; }
    }
    if (changed) LS.set("hist", HIST);
    SYNC.lastPull = Date.now(); LS.set("lastPull", SYNC.lastPull); SYNC.err = null;
  } catch (e) { SYNC.err = e; }
  finally { pulling = false; renderSync(); }
  if (changed && !opts.noRender && VIEW.name !== "workout") render();
  return changed;
}

