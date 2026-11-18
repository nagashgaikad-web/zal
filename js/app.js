/* Зал — дневник тренировок для телефона.
   Хранит всё в телефоне и отправляет в закрытый репозиторий GitHub; тренер разбирает тренировку вечером. */
(() => {
"use strict";
const VERSION = "1.0.0";

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
  restBase: 120, restIso: 90, sound: true, haptics: true, awake: true, treatment: true, coachTime: "23:00", skipOnb: false };
let CFG = Object.assign({}, DEF_CFG, LS.get("cfg", {}));
const saveCfg = () => LS.set("cfg", CFG);
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
    const [p, c] = await Promise.all([GH.getJSON("program.json"), GH.getJSON("coach/latest.json")]);
    if (p && p.data && JSON.stringify(p.data) !== JSON.stringify(PROG)) { PROG = p.data; LS.set("program", PROG); changed = true; }
    if (c && c.data && (!COACH || c.data.id !== COACH.id || c.data.date !== COACH.date)) {
      const isNew = !!COACH; COACH = c.data; LS.set("coach", COACH);
      if (!COACH_ARCH.some(x => x.id === COACH.id)) { COACH_ARCH.unshift(COACH); COACH_ARCH = COACH_ARCH.slice(0, 60); LS.set("coachArch", COACH_ARCH); }
      changed = true; if (isNew && !opts.silent) toast("Тренер прислал разбор: " + (COACH.title || "новая запись"), "ac", 4500);
    }
    const files = await GH.list("workouts");
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

/* ---------------- обратная связь: звук, вибро, экран ---------------- */
let AC = null;
function unlockAudio() {
  try {
    if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); }
    if (navigator.audioSession) navigator.audioSession.type = "transient";
    if (AC.state === "suspended") AC.resume();
  } catch (_) {}
}
function beep(pattern = [0, .18, .36]) {
  if (!CFG.sound || !AC) return;
  try {
    const t0 = AC.currentTime + .02;
    pattern.forEach((dt, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.value = i === pattern.length - 1 ? 1320 : 990;
      g.gain.setValueAtTime(0, t0 + dt); g.gain.linearRampToValueAtTime(.35, t0 + dt + .015); g.gain.exponentialRampToValueAtTime(.001, t0 + dt + .15);
      o.connect(g).connect(AC.destination); o.start(t0 + dt); o.stop(t0 + dt + .17);
    });
  } catch (_) {}
}
function haptic(times = 1) {
  if (!CFG.haptics) return;
  try { if (navigator.vibrate) { navigator.vibrate(times > 1 ? [40, 60, 40] : 25); return; } } catch (_) {}
  const l = $("#hapt"); if (!l) return;
  for (let i = 0; i < times; i++) setTimeout(() => l.click(), i * 120);
}
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && CFG.awake && "wakeLock" in navigator && document.visibilityState === "visible") { if (!wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } }
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (_) { wakeLock = null; }
}

/* ---------------- тосты и шторки ---------------- */
let toastTm = 0;
function toast(msg, kind = "", ms = 2600) {
  $$(".toast").forEach(t => t.remove());
  const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = msg; t.setAttribute("role", "status");
  document.body.appendChild(t); clearTimeout(toastTm); toastTm = setTimeout(() => t.remove(), ms);
  t.addEventListener("click", () => t.remove());
}
function openSheet(html, mount) {
  closeSheet(true);
  const L = $("#layer");
  L.innerHTML = '<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + "</div>";
  $(".sheet-bg", L).addEventListener("click", () => closeSheet());
  const sh = $(".sheet", L);
  // свайп вниз, чтобы закрыть
  let y0 = null, dy = 0;
  sh.addEventListener("touchstart", e => { if (sh.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
  sh.addEventListener("touchend", () => { if (y0 == null) return; sh.style.transform = ""; if (dy > 110) closeSheet(); y0 = null; });
  if (mount) mount(sh);
  return sh;
}
function closeSheet(silent) { const L = $("#layer"); if (L) L.innerHTML = ""; if (!silent && VIEW.name === "workout") renderWorkout(); }

/* ================================================================
   НАВИГАЦИЯ
   ================================================================ */
const VIEW = { name: "home", tab: "home" };
function go(name) { VIEW.name = name; if (["home", "history", "coach", "settings"].includes(name)) VIEW.tab = name; window.scrollTo(0, 0); render(); }
function render() {
  stopAnim();
  const app = $("#app");
  if (!GH.ok() && !CFG.skipOnb && VIEW.name !== "settings") { app.innerHTML = viewOnboarding(); bindOnboarding(); return; }
  if (VIEW.name === "workout" && SES) { renderWorkout(true); return; }
  if (VIEW.name === "summary") { app.innerHTML = viewSummary(); bindSummary(); return; }
  const v = VIEW.name === "history" ? viewHistory() : VIEW.name === "coach" ? viewCoach() : VIEW.name === "settings" ? viewSettings() : viewHome();
  app.innerHTML = v + tabbar() + (SES ? resumePill() : "");
  bindCommon();
  if (VIEW.name === "home") bindHome();
  if (VIEW.name === "history") bindHistory();
  if (VIEW.name === "coach") bindCoach();
  if (VIEW.name === "settings") bindSettings();
  renderSync();
}
function tabbar() {
  const t = (id, label, ic) => '<button class="tab" data-go="' + id + '"' + (VIEW.tab === id ? ' aria-current="page"' : "") + ">" + ic + "<span>" + label + "</span></button>";
  return '<div class="tabbar"><nav>' + t("home", "Сегодня", I.home) + t("history", "История", I.hist) + t("coach", "Тренер", I.coach) + t("settings", "Настройки", I.gear) + "</nav></div>";
}
function resumePill() { return '<button class="resume" id="resume">' + I.bolt + "<span>Тренировка " + esc(SES.type) + ' идёт</span><span class="num" id="resumeT">' + hms(Date.now() - SES.startedAt) + "</span></button>"; }
function syncPill() { return '<span class="sync" id="sync"><i></i><span>…</span></span>'; }
function renderSync() {
  const el = $("#sync"); if (!el) return;
  const n = Object.keys(OUT).length;
  let cls = "", txt = "Синхронизировано";
  if (!GH.ok()) { cls = "off"; txt = "Без GitHub"; }
  else if (SYNC.busy || pulling) { cls = "wait"; txt = "Отправляю…"; if (pulling && !SYNC.busy) txt = "Обновляю…"; }
  else if (SYNC.err) { cls = n ? "wait" : "err"; txt = n ? "Ждёт отправки · " + n : "Нет связи"; }
  else if (n) { cls = "wait"; txt = "Ждёт отправки · " + n; }
  el.className = "sync " + cls; el.lastElementChild.textContent = txt;
}
function bindCommon() {
  $$("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  const r = $("#resume"); if (r) r.addEventListener("click", () => go("workout"));
  const s = $("#sync"); if (s) s.addEventListener("click", async () => { if (!GH.ok()) { go("settings"); return; } if (SYNC.err) toast(errText(SYNC.err), "warn"); flush(); await pull(); });
}

/* ================================================================
   СЕГОДНЯ
   ================================================================ */
let HOME_TYPE = null;
function planStats(type) {
  const items = (PROG.days && PROG.days[type]) || [];
  let ex = 0, sets = 0, min = 0;
  items.forEach(it => (it.ss || [it]).forEach(x => { ex++; if (exInfo(x.id).cardio) { min += range(x.reps).hi; } else { sets += x.sets || 0; min += (x.sets || 0) * (it.ss ? 1.6 : 2.6); } }));
  return { ex, sets, min: Math.round(min / 5) * 5, names: items.flatMap(it => (it.ss || [it]).map(x => x.id)) };
}
function viewHome() {
  const today = ymd(), now = new Date();
  const ws = doneWorkouts();
  const doneToday = ws.find(w => w.date === today);
  const type = HOME_TYPE || nextType();
  const st = planStats(type);
  let hero;
  if (SES) {
    const all = flatExs(SES), d = all.filter(x => isExDone(x.ex)).length;
    hero = '<section class="hero"><span class="tag">' + I.bolt + ' Идёт тренировка</span><div class="big">Тренировка <span>' + esc(SES.type) + '</span></div><div class="meta"><span class="num">' + d + " из " + all.length + "</span> упражнений · идёт <span class=\"num\" id=\"heroT\">" + hms(Date.now() - SES.startedAt) + '</span></div><div style="height:18px"></div><button class="btn pri" id="continue">' + I.play + " Продолжить</button></section>";
  } else {
    const names = st.names.filter(id => !exInfo(id).cardio);
    hero = '<section class="hero"><span class="tag">' + (doneToday ? I.check + " Сегодня уже сделано" : I.spark + " Следующая") + '</span><div class="big">Тренировка <span>' + esc(type) + "</span></div>" +
      '<div class="meta">' + st.ex + " " + plural(st.ex, ["упражнение", "упражнения", "упражнений"]) + " · " + st.sets + " " + plural(st.sets, ["подход", "подхода", "подходов"]) + " · ~" + st.min + " мин</div>" +
      '<div class="chips">' + names.slice(0, 4).map(id => '<span class="chip">' + esc(shortName(id)) + "</span>").join("") + (names.length > 4 ? '<span class="chip">+' + (names.length - 4) + "</span>" : "") + "</div>" +
      '<div class="seg" style="margin-bottom:12px" id="typeSeg">' + ["A", "B", "C"].map(t => '<button data-t="' + t + '" aria-pressed="' + (t === type) + '">' + t + "</button>").join("") + "</div>" +
      '<button class="btn pri" id="start">' + I.play + " Начать тренировку</button></section>";
  }
  // неделя
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let week = '<div class="week">';
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i); const k = ymd(d);
    const w = ws.find(x => x.date === k);
    const cls = (w ? " done" : [0, 2, 4].includes(i) && k >= today ? " plan" : "") + (k === today ? " today" : "");
    week += '<div class="day' + cls + '"><b>' + DOW_S[d.getDay()] + "</b><i>" + (w ? esc(w.type) : d.getDate()) + "</i></div>";
  }
  week += "</div>";
  // статистика
  const monK = ymd(mon); const wkW = ws.filter(w => w.date >= monK);
  const prevMon = new Date(mon); prevMon.setDate(mon.getDate() - 7); const prevW = ws.filter(w => w.date >= ymd(prevMon) && w.date < monK);
  const tn = wkW.reduce((t, w) => t + tonnage(w), 0), tp = prevW.reduce((t, w) => t + tonnage(w), 0);
  const egd = daysBetween(today, EGD_DATE);
  const stats = '<div class="stats">' +
    stat("Неделя", wkW.length + "<small>/3</small>", "тренировок") +
    stat("Тоннаж недели", fmtT(tn).replace(/ (т|кг)$/, "<small>$1</small>"), tp ? (tn >= tp ? "▲ " : "▼ ") + "к прошлой: " + fmtT(tp) : "за эту неделю") +
    stat("Всего", ws.length + "", plural(ws.length, ["тренировка", "тренировки", "тренировок"])) +
    (CFG.treatment && egd > 0 ? stat("До ЭГДС", egd + "<small>дн</small>", "не раньше " + pd(EGD_DATE).getDate() + " " + MON_S[pd(EGD_DATE).getMonth()]) : stat("Подходов", ws.reduce((t, w) => t + setCount(w), 0) + "", "за всё время")) + "</div>";
  // тренер
  const coach = COACH ? '<button class="card coach-card tap" data-go="coach"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">' + esc(COACH.title || "Разбор тренировки") + '</div><div class="d">' + esc(COACH.date ? fmtShort(COACH.date) : "") + '</div></div></div><div class="clamp">' + esc(plainText(COACH.text)).slice(0, 400) + "</div></button>"
    : '<div class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">Тренер</div><div class="d">Разбор — в ' + esc(CFG.coachTime) + ' в день тренировки</div></div></div><div class="muted" style="font-size:15px">После тренировки нажми «Завершить». Вечером здесь появится разбор и цели по весам на следующий раз.</div></div>';
  return '<main class="view"><div class="top"><div><div class="eyebrow">' + esc(fmtLong(now)) + '</div><h1 class="lt">Сегодня</h1></div>' + syncPill() + "</div>" + hero + week + '<div class="sec-h"><h2>Тренер</h2></div>' + coach + '<div class="sec-h"><h2>Статистика</h2></div>' + stats + "</main>";
}
const stat = (l, v, s) => '<div class="stat"><div class="l">' + l + '</div><div class="v num">' + v + '</div><div class="l faint" style="margin-top:2px">' + esc(s) + "</div></div>";
function shortName(id) { const n = exInfo(id).name || id; return n.length > 26 ? n.replace(/ (в|на|со|с|сидя|стоя).*$/i, "") : n; }
function plainText(t) { return String(t || "").replace(/[#*_>`]/g, "").replace(/\n+/g, " "); }
function bindHome() {
  $$("#typeSeg button").forEach(b => b.addEventListener("click", () => { HOME_TYPE = b.dataset.t; haptic(); render(); }));
  const s = $("#start"); if (s) s.addEventListener("click", () => { unlockAudio(); startWorkout(HOME_TYPE || nextType()); });
  const c = $("#continue"); if (c) c.addEventListener("click", () => { unlockAudio(); go("workout"); });
}

/* ================================================================
   ТРЕНИРОВКА: модель
   ================================================================ */
function mkEx(x) { const e = exInfo(x.id); return { id: x.id, plan: { sets: x.sets || (e.cardio ? 1 : 2), reps: x.reps || "" }, sets: [], skipped: false, note: "", cardio: !!e.cardio, minutes: null, swStart: null, swAcc: 0 }; }
function startWorkout(type) {
  const items = (PROG.days && PROG.days[type]) || [];
  if (!items.length) { toast("В программе нет тренировки " + type, "warn"); return; }
  let id = ymd() + "-" + type, k = 2; while (HIST[id]) id = ymd() + "-" + type + "-" + (k++);
  SES = { id, date: ymd(), type, startedAt: Date.now(), status: "active", progVersion: PROG.version || null,
    blocks: items.map(it => ({ ss: !!it.ss, exs: (it.ss || [it]).map(mkEx) })), cur: { b: 0, e: 0 }, rest: null, heartburn: false, heartburnWhere: "", replaced: [] };
  HOME_TYPE = null; saveSes(true); haptic(); go("workout");
}
function saveSes(push) {
  LS.set("active", SES);
  if (push && SES) queue("workouts/" + SES.id + ".json", JSON.stringify(exportDoc(SES), null, 1), "Тренировка " + SES.type + " " + SES.date + ": подход");
}
const flatExs = s => s.blocks.flatMap((b, bi) => b.exs.map((ex, ei) => ({ ex, bi, ei, ss: b.ss, n: b.exs.length })));
const curBlock = () => SES.blocks[SES.cur.b];
const curEx = () => curBlock().exs[SES.cur.e];
const isExDone = ex => ex.skipped || (ex.cardio ? ex.minutes != null : ex.sets.length >= ex.plan.sets);
function nextOpen(fromB, fromE) {
  const all = flatExs(SES); const i0 = all.findIndex(x => x.bi === fromB && x.ei === fromE);
  for (let k = 1; k <= all.length; k++) { const x = all[(i0 + k) % all.length]; if (!isExDone(x.ex)) return x; }
  return null;
}
function setCur(b, e) { SES.cur = { b, e }; ED.idx = null; ED.hint = null; ED.init = false; MEDIA.tab = MEDIA.tab === "photo" ? "anim" : MEDIA.tab; saveSes(false); }
function exportDoc(s) {
  const exercises = [], skipped = [];
  s.blocks.forEach((b, bi) => b.exs.forEach(ex => {
    if (ex.skipped && !ex.sets.length && ex.minutes == null) { skipped.push(ex.id); return; }
    if (ex.cardio) { if (ex.minutes != null) exercises.push(clean({ id: ex.id, minutes: ex.minutes, note: ex.note || undefined })); return; }
    if (!ex.sets.length) return;
    exercises.push(clean({ id: ex.id, sets: ex.sets.map(st => clean({ w: st.w, r: st.r, rir: st.rir })), note: ex.note || undefined, ss: b.ss ? bi : undefined, plan: ex.plan.sets + "×" + ex.plan.reps }));
  }));
  const fin = s.finishedAt || null;
  return clean({ date: s.date, type: s.type, status: s.status, startedAt: new Date(s.startedAt).toISOString(), finishedAt: fin ? new Date(fin).toISOString() : undefined,
    duration: Math.round(((fin || Date.now()) - s.startedAt) / 60000), feel: s.feel, energy: s.energy, sleep: s.sleep, heartburn: !!s.heartburn, heartburnWhere: s.heartburnWhere || undefined,
    notes: s.notes || undefined, liked: s.liked || undefined, disliked: s.disliked || undefined, exercises, skipped: skipped.length ? skipped : undefined,
    replaced: s.replaced && s.replaced.length ? s.replaced : undefined, programVersion: s.progVersion || undefined, app: "zal " + VERSION });
}
function clean(o) { Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; }

/* ---------------- редактор подхода ---------------- */
const ED = { idx: null, w: "", r: "", rir: 2, hint: null, init: false };
function suggestFor(ex, i) {
  const tg = PROG.targets && PROG.targets[ex.id];
  const last = lastFor(ex.id);
  const prev = ex.sets[i - 1];
  let w = prev ? prev.w : tg && tg.w != null ? tg.w : last && last.sets ? (last.sets[i] || last.sets[last.sets.length - 1]).w : "";
  const rg = range(ex.plan.reps);
  let r = prev ? prev.r : last && last.sets && last.sets[i] ? Math.min(last.sets[i].r, rg.hi) : rg.lo;
  if (tg && tg.reps && !prev) r = range(tg.reps).lo;
  const rir = prev && prev.rir != null ? prev.rir : CFG.treatment ? 3 : 2;
  return { w, r, rir };
}
function initEditor() {
  if (ED.init) return;
  const ex = curEx(); if (!ex || ex.cardio) { ED.init = true; return; }
  if (ED.idx != null && ex.sets[ED.idx]) { const s = ex.sets[ED.idx]; ED.w = s.w; ED.r = s.r; ED.rir = s.rir ?? 2; }
  else { ED.idx = null; const g = suggestFor(ex, ex.sets.length); ED.w = g.w; ED.r = g.r; ED.rir = g.rir; }
  ED.init = true;
}
function logSet() {
  const ex = curEx();
  const w = num(ED.w), r = parseInt(ED.r, 10);
  if (w == null) { toast("Укажи вес (0 — если без веса)", "warn"); const i = $("#edW"); if (i) i.focus(); return; }
  if (!(r > 0)) { toast("Укажи количество повторов", "warn"); return; }
  const st = { w: w == null ? 0 : w, r, rir: ED.rir, t: Date.now() };
  unlockAudio(); haptic();
  if (ED.idx != null) { ex.sets[ED.idx] = Object.assign(ex.sets[ED.idx], st); ED.idx = null; ED.init = false; saveSes(true); renderWorkout(); toast("Подход исправлен"); return; }
  ex.sets.push(st);
  // подсказки по правилам
  const rg = range(ex.plan.reps); let hint = null;
  if (CFG.treatment && st.rir === 0) hint = { k: "bad", t: "Подход до отказа. Пока идёт лечение, оставляй 2–3 повтора в запасе (правило 3)." };
  else if (st.r > rg.hi && st.rir >= 2) hint = { k: "ac", t: "Повторов больше верхней границы (" + rg.hi + "). В следующем подходе можно +" + fmtW(stepFor(ex.id)) + " кг." };
  if (ex.sets.length >= ex.plan.sets) {
    const allTop = ex.sets.slice(0, ex.plan.sets).every(s => s.r >= rg.hi && (s.rir == null || s.rir >= (CFG.treatment ? 2 : 1)));
    if (allTop && !exInfo(ex.id).assist) { ex.suggest = (st.w || 0) + stepFor(ex.id); hint = { k: "ac", t: shortName(ex.id) + ": все подходы на верхней границе — в следующий раз можно " + fmtW(ex.suggest) + " кг. Тренер подтвердит вечером." }; }
    else if (allTop && exInfo(ex.id).assist) hint = { k: "ac", t: shortName(ex.id) + ": все подходы на верхней границе — в следующий раз противовес можно уменьшить на " + fmtW(stepFor(ex.id)) + " кг." };
  }
  ED.hint = hint; ED.init = false;
  afterSet();
  saveSes(true);
  renderWorkout();
}
function afterSet() {
  const b = SES.cur.b, blk = curBlock(), ex = curEx();
  if (blk.ss) {
    const nx = blk.exs.findIndex((x, i) => i > SES.cur.e && !x.skipped && x.sets.length < x.plan.sets && x.sets.length < ex.sets.length);
    if (nx >= 0) { const h = ED.hint; setCur(b, nx); ED.hint = h; toast("Суперсет: сразу " + shortName(curEx().id), "", 2000); return; }
    const first = blk.exs.findIndex(x => !x.skipped && x.sets.length < x.plan.sets);
    if (first >= 0) { const h = ED.hint; setCur(b, first); ED.hint = h; startRest(Math.max(...blk.exs.map(x => restFor(x.id))), "Круг суперсета готов"); return; }
  } else if (ex.sets.length < ex.plan.sets) { startRest(restFor(ex.id), "Подход " + ex.sets.length + " из " + ex.plan.sets); return; }
  // упражнение (блок) завершено
  const nx = nextOpen(b, SES.cur.e);
  if (!nx) { stopRest(); SES.allDone = true; toast("Все упражнения сделаны 💪", "ac", 3000); return; }
  const h = ED.hint; setCur(nx.bi, nx.ei); ED.hint = h; startRest(restFor(ex.id), "Упражнение готово");
}

/* ---------------- таймер отдыха ---------------- */
let restTick = 0;
function startRest(sec, label) {
  SES.rest = { start: Date.now(), total: sec, endsAt: Date.now() + sec * 1000, label: label || "Отдых", fired: false, mini: false };
  LS.set("active", SES); runRestTick();
}
function stopRest() { if (SES) { SES.rest = null; LS.set("active", SES); } clearInterval(restTick); restTick = 0; const r = $("#rest"); if (r) r.remove(); }
function runRestTick() { clearInterval(restTick); restTick = setInterval(updRest, 250); updRest(true); }
function updRest(build) {
  if (!SES || !SES.rest || VIEW.name !== "workout") { clearInterval(restTick); restTick = 0; return; }
  const R = SES.rest; const left = (R.endsAt - Date.now()) / 1000; const over = left <= 0;
  let el = $("#rest");
  if (!el || build === true) { if (el) el.remove(); el = document.createElement("div"); el.id = "rest"; el.className = "rest"; document.body.appendChild(el); el.innerHTML = restHTML(); bindRest(el); }
  el.classList.toggle("mini", !!R.mini); el.classList.toggle("over", over);
  const C = 2 * Math.PI * 88, frac = over ? 1 : 1 - left / R.total;
  const fg = $(".fgc", el); if (fg) fg.style.strokeDashoffset = String(C * (1 - frac));
  const t = over ? "+" + mmss(-left) : mmss(left);
  $$(".rt", el).forEach(x => x.textContent = t);
  const bar = $(".minic .bar i", el); if (bar) bar.style.width = (frac * 100).toFixed(1) + "%";
  const lab = $(".rlab", el); if (lab) lab.textContent = over ? "Время! Следующий подход" : "Отдых";
  if (over && !R.fired) { R.fired = true; LS.set("active", SES); beep(); haptic(3); const f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); setTimeout(() => f.remove(), 1300); if (R.mini) { R.mini = false; el.classList.remove("mini"); } }
  if (over && -left > 600) stopRest(); // забытый таймер
}
function restHTML() {
  const ex = curEx(); const nxt = ex.cardio ? exInfo(ex.id).name : (ex.sets.length < ex.plan.sets ? "Подход " + (ex.sets.length + 1) + " · " + exInfo(ex.id).name : exInfo(ex.id).name);
  const g = !ex.cardio ? suggestFor(ex, ex.sets.length) : null;
  const C = 2 * Math.PI * 88;
  return '<div class="panel"><div class="full"><div class="top2"><b class="rlab">Отдых</b><button class="icon-btn" id="rMin" aria-label="Свернуть">' + I.chevD + "</button></div>" +
    '<div class="ring-wrap"><svg viewBox="0 0 200 200"><circle class="bgc" cx="100" cy="100" r="88" fill="none" stroke-width="12"/><circle class="fgc" cx="100" cy="100" r="88" fill="none" stroke-width="12" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg><div class="c"><span class="num rt">0:00</span><small>' + esc(SES.rest.label) + "</small></div></div>" +
    '<div class="rest-ctl"><button class="btn sec num" data-add="-15">−15</button><button class="btn sec num" data-add="30">+30</button><button class="btn pri" id="rSkip">Дальше</button></div>' +
    '<div class="next">Дальше<b>' + esc(nxt) + "</b>" + (g && g.w !== "" ? '<span class="num">' + fmtW(g.w) + " кг × " + g.r + "</span>" : "") + "</div></div>" +
    '<button class="minic" id="rMax"><span class="num rt">0:00</span><span class="bar"><i></i></span><span class="chip cy">Отдых</span></button></div>';
}
function bindRest(el) {
  $("#rMin", el).addEventListener("click", () => { SES.rest.mini = true; LS.set("active", SES); updRest(); });
  $("#rMax", el).addEventListener("click", () => { SES.rest.mini = false; LS.set("active", SES); updRest(); });
  $("#rSkip", el).addEventListener("click", () => { haptic(); stopRest(); });
  $$("[data-add]", el).forEach(b => b.addEventListener("click", () => { haptic(); const R = SES.rest; const d = +b.dataset.add; if (R.endsAt < Date.now()) { R.endsAt = Date.now(); R.total = 0; } R.endsAt += d * 1000; R.total = Math.max(1, R.total + d); R.fired = R.endsAt <= Date.now(); LS.set("active", SES); updRest(); }));
}

/* ---------------- картинка: движение / мышцы / фото ---------------- */
const MEDIA = { tab: "anim", raf: 0, id: null };
function stopAnim() { cancelAnimationFrame(MEDIA.raf); MEDIA.raf = 0; MEDIA.id = null; }
function startAnim(id) {
  stopAnim(); MEDIA.id = id;
  const el = $("#anim"); if (!el || typeof ANIM === "undefined" || !ANIM.has(id)) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { el.innerHTML = ANIM.frame(id, .5); return; }
  const per = ANIM.cycle(id) ? 1800 : 2800, t0 = performance.now(); let lastDraw = 0;
  const loop = now => { if (MEDIA.id !== id) return; if (now - lastDraw > 33) { lastDraw = now; const ph = ((now - t0) % per) / per; const t = ANIM.cycle(id) ? ph : (ph < .5 ? ph * 2 : 2 - ph * 2); const e = $("#anim"); if (!e) return; e.innerHTML = ANIM.frame(id, t); } MEDIA.raf = requestAnimationFrame(loop); };
  MEDIA.raf = requestAnimationFrame(loop);
}
/* карта мышц на модели BodyParts3D: индекс-картинка задаёт мышцу каждого пикселя */
const FIG = { ready: null, views: {}, cache: {} };
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function figInit() {
  if (FIG.ready) return FIG.ready;
  FIG.ready = (async () => {
    for (const v of ["front", "back"]) {
      const [b, m] = await Promise.all([loadImg(FIGDATA[v].B), loadImg(FIGDATA[v].I)]);
      const W = b.naturalWidth, H = b.naturalHeight, c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(m, 0, 0); const idd = x.getImageData(0, 0, W, H).data; x.clearRect(0, 0, W, H); x.drawImage(b, 0, 0); const img = x.getImageData(0, 0, W, H);
      const n = W * H, ids = new Uint8Array(n), lum = new Float32Array(n);
      for (let i = 0; i < n; i++) { ids[i] = idd[i * 4]; const r = img.data[i * 4], g = img.data[i * 4 + 1], bb = img.data[i * 4 + 2]; lum[i] = (0.299 * r + 0.587 * g + 0.114 * bb) / 255; }
      FIG.views[v] = { W, H, ids, lum, base: img };
    }
  })();
  return FIG.ready;
}
function actFor(id) {
  const a = ACT[id], load = {};
  if (a) for (const k in a) { const al = ALIAS[k]; if (al) { for (const j in al) load[j] = Math.max(load[j] || 0, a[k] * al[j]); } else load[k] = Math.max(load[k] || 0, a[k]); }
  return load;
}
async function figFor(id) {
  if (FIG.cache[id]) return FIG.cache[id];
  await figInit();
  const load = actFor(id); const out = {};
  for (const v of ["front", "back"]) {
    const V = FIG.views[v]; const c = document.createElement("canvas"); c.width = V.W; c.height = V.H;
    const ctx = c.getContext("2d"); const img = ctx.createImageData(V.W, V.H); const d = img.data, src = V.base.data;
    for (let i = 0; i < V.ids.length; i++) {
      const idv = V.ids[i], L = V.lum[i]; const o = i * 4;
      const isBg = src[o] < 10;
      if (isBg && idv < 2) { d[o + 3] = 0; continue; }
      const k = idv >= 2 ? MKEYS[(idv - 2) >> 1] : null; const a = k ? (load[k] || 0) : 0;
      const g = 30 + L * 120; // приглушённая фигура
      let r = g * .92, gg = g * .97, b = g * 1.08;
      if (a > 0) { const t = Math.min(1, .35 + a * .65); const hr = 200 * (.35 + .9 * L), hg = 240 * (.35 + .9 * L), hb = 75 * (.35 + .9 * L); r = r + (hr - r) * t; gg = gg + (hg - gg) * t; b = b + (hb - b) * t; }
      d[o] = Math.min(255, r); d[o + 1] = Math.min(255, gg); d[o + 2] = Math.min(255, b); d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); out[v] = c.toDataURL("image/png");
  }
  FIG.cache[id] = out; return out;
}
function photoKey(id) { return "photo." + id; }
async function photoFor(id) {
  let p = LS.get(photoKey(id), null); if (p) return p;
  if (LS.get("nophoto." + id, false) || !GH.ok() || !navigator.onLine) return null;
  try { const r = await GH.getRaw("photos/" + id + ".jpg"); if (r && r.b64) { p = "data:image/jpeg;base64," + r.b64.replace(/\s/g, ""); LS.set(photoKey(id), p); return p; } LS.set("nophoto." + id, true); } catch (_) {}
  return null;
}
async function takePhoto(id) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment");
  inp.addEventListener("change", async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    try {
      const bmp = await createImageBitmap(f); const s = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", .72); LS.set(photoKey(id), url); LS.del("nophoto." + id);
      queue("photos/" + id + ".jpg", url.split(",")[1], "Фото тренажёра: " + exInfo(id).name, true);
      MEDIA.tab = "photo"; toast("Фото сохранено", "ac"); renderWorkout(true);
    } catch (e) { toast("Не получилось сохранить фото", "bad"); }
  });
  inp.click();
}
async function paintMedia(ex, blk) {
  const host = $("#media"); if (!host) return;
  const id = ex.id;
  const tabs = '<div class="mtabs">' + [["anim", "Движение"], ["mus", "Мышцы"], ["photo", "Фото"]].map(([k, l]) => '<button data-mt="' + k + '" aria-pressed="' + (MEDIA.tab === k) + '">' + l + "</button>").join("") + "</div>";
  const ssTag = blk.ss ? '<span class="ss-tag">Суперсет · ' + (SES.cur.e + 1) + "/" + blk.exs.length + "</span>" : "";
  let inner = "";
  if (MEDIA.tab === "anim") inner = '<div id="anim" style="height:100%">' + (typeof ANIM !== "undefined" && ANIM.has(id) ? ANIM.frame(id, 0) : "") + "</div>";
  else if (MEDIA.tab === "mus") inner = '<div class="figs" id="figs"></div>';
  else inner = '<div id="ph" style="height:100%"></div>';
  host.innerHTML = inner + ssTag + tabs;
  $$("[data-mt]", host).forEach(b => b.addEventListener("click", () => { MEDIA.tab = b.dataset.mt; haptic(); paintMedia(curEx(), curBlock()); }));
  stopAnim();
  if (MEDIA.tab === "anim") startAnim(id);
  else if (MEDIA.tab === "mus") { try { const f = await figFor(id); const el = $("#figs"); if (el && curEx().id === id) el.innerHTML = '<img src="' + f.front + '" alt="Мышцы спереди" style="height:100%"><img src="' + f.back + '" alt="Мышцы сзади" style="height:100%">'; } catch (_) { const el = $("#figs"); if (el) el.innerHTML = '<div class="empty-photo">Не удалось загрузить рисунок</div>'; } }
  else {
    const el = $("#ph"); el.innerHTML = '<div class="empty-photo">Загружаю…</div>';
    const p = await photoFor(id); if (curEx().id !== id || MEDIA.tab !== "photo") return;
    el.innerHTML = p ? '<img class="photo" src="' + p + '" alt="Фото тренажёра"><button class="icon-btn" id="phRe" style="position:absolute;right:10px;top:10px" aria-label="Переснять">' + I.camera + "</button>"
      : '<div class="empty-photo">' + I.camera + '<div>Сфотографируй тренажёр в своём зале — фото будет здесь и в GitHub.</div><button class="btn sm sec" id="phNew">' + I.camera + " Сделать фото</button></div>";
    const b = $("#phNew") || $("#phRe"); if (b) b.addEventListener("click", () => takePhoto(id));
  }
}

/* ================================================================
   ТРЕНИРОВКА: экран
   ================================================================ */
let clockTm = 0;
function renderWorkout(full) {
  if (!SES) { go("home"); return; }
  const app = $("#app");
  if (full || !$("#wk")) {
    app.innerHTML = '<div class="wk" id="wk"><header class="wk-top" id="wkTop"></header><div class="wk-body"><div class="media" id="media"></div><div id="wkMain"></div></div></div><nav class="wk-nav" id="wkNav"></nav>';
    MEDIA.lastKey = null;
  }
  const blk = curBlock(), ex = curEx();
  const all = flatExs(SES);
  const ci = all.findIndex(x => x.bi === SES.cur.b && x.ei === SES.cur.e);
  // верх
  $("#wkTop").innerHTML = '<div class="wk-bar"><button class="icon-btn" id="wkHome" aria-label="Свернуть">' + I.chevD + '</button><div class="mid"><div class="num" id="wkClock">' + hms(Date.now() - SES.startedAt) + '</div><div class="s">Тренировка ' + esc(SES.type) + " · " + (ci + 1) + " из " + all.length + '</div></div><button class="finish" id="wkFinish">Завершить</button></div>' +
    '<button class="prog" id="wkPlan" aria-label="План тренировки" style="width:100%">' + all.map((x, i) => { const st = x.ex.skipped ? "skip" : isExDone(x.ex) ? "done" : i === ci ? "cur" : ""; const p = x.ex.cardio ? 0 : Math.min(100, x.ex.sets.length / x.ex.plan.sets * 100); return '<i class="' + st + '" style="--p:' + p + '%"></i>'; }).join("") + "</button>";
  // картинка (перерисовываем только при смене упражнения)
  const key = SES.cur.b + ":" + SES.cur.e + ":" + ex.id;
  if (MEDIA.lastKey !== key) { MEDIA.lastKey = key; paintMedia(ex, blk); }
  // основная часть
  initEditor();
  const info = exInfo(ex.id), tg = PROG.targets && PROG.targets[ex.id], last = lastFor(ex.id);
  let h = '<div class="ex-head"><h1>' + esc(info.name) + '</h1><button class="icon-btn" id="exMenu" aria-label="Ещё">' + I.more + "</button></div>";
  h += '<div class="ex-sub">' + (ex.cardio ? '<span class="chip">' + esc(ex.plan.reps) + "</span>" : '<span class="chip">' + ex.plan.sets + " × " + esc(ex.plan.reps) + "</span>") +
    (tg && !ex.cardio ? '<span class="chip ac">Цель: ' + (tg.w != null ? fmtW(tg.w) + " кг × " : "") + esc(tg.reps || "") + "</span>" : "") +
    (!ex.cardio ? '<span class="chip cy">' + I.clock + " " + mmss(blk.ss ? Math.max(...blk.exs.map(x => restFor(x.id))) : restFor(ex.id)) + "</span>" : "") +
    (unitNote(ex.id) ? '<span class="chip">' + esc(unitNote(ex.id)) + "</span>" : "") + "</div>";
  if (tg && tg.note) h += '<p class="prev">' + esc(tg.note) + "</p>";
  if (last) h += '<p class="prev">Прошлый раз, ' + esc(fmtShort(last.date)) + ": <b class=\"num\">" + (last.minutes != null ? last.minutes + " мин" : (last.sets || []).map(s => fmtW(s.w) + "×" + s.r).join(" · ")) + "</b></p>";
  if (SES.heartburn) h += '<div class="hint bad">' + I.warn + "<div><b>Изжога или дискомфорт.</b> Снизь нагрузку или закончи тренировку. Боль в груди при нагрузке — к врачу, не списывай на рефлюкс.</div></div>";
  if (ex.skipped) h += '<div class="hint">' + I.skip + '<div>Упражнение пропущено. <button class="link" id="unskip" style="color:var(--ac);font-weight:600">Вернуть</button></div></div>';
  h += ex.cardio ? cardioHTML(ex) : setsHTML(ex);
  if (ex.note) h += '<div class="hint">' + I.note + "<div>" + esc(ex.note) + "</div></div>";
  if (SES.allDone && all.every(x => isExDone(x.ex))) h += '<div class="hint ac">' + I.check + '<div><b>Все упражнения сделаны.</b> Нажми «Завершить», чтобы отправить тренировку тренеру.</div></div>';
  h += '<div style="height:16px"></div>';
  $("#wkMain").innerHTML = h;
  // низ
  const prev = all[ci - 1], next = all[ci + 1];
  $("#wkNav").innerHTML = '<div class="in"><button class="btn sec prevb" id="wkPrev" aria-label="Предыдущее"' + (prev ? "" : " disabled") + ">" + I.chevL + "</button>" +
    (next ? '<button class="btn sec nextb" id="wkNext"><span class="t"><small>' + (next.bi === SES.cur.b ? "Суперсет, дальше" : "Дальше") + "</small><span>" + esc(exInfo(next.ex.id).name) + "</span></span>" + I.chevR + "</button>"
      : '<button class="btn pri nextb" id="wkFinish2" style="justify-content:center">' + I.check + " Завершить тренировку</button>") + "</div>";
  bindWorkout();
  clearInterval(clockTm); clockTm = setInterval(() => { const c = $("#wkClock"); if (!c || !SES) { clearInterval(clockTm); return; } c.textContent = hms(Date.now() - SES.startedAt); const sw = $("#swClock"); if (sw) sw.textContent = mmss(swElapsed(curEx()) / 1000); }, 500);
  keepAwake(true);
  if (SES.rest) { if (!restTick) runRestTick(); else updRest(true); }
}
function setsHTML(ex) {
  let h = '<div class="sets">';
  const total = Math.max(ex.plan.sets, ex.sets.length + (ED.idx == null && ex.sets.length >= ex.plan.sets ? 0 : 0));
  for (let i = 0; i < total; i++) {
    const s = ex.sets[i];
    const editing = (ED.idx === i) || (ED.idx == null && i === ex.sets.length && !ex.skipped);
    if (editing) { h += editorHTML(ex, i); continue; }
    if (s) h += '<button class="set done" data-edit="' + i + '"><span class="n">' + I.check.replace("<svg", '<svg style="width:16px;height:16px"') + '</span><span class="val num">' + fmtW(s.w) + " <small>кг</small> × " + s.r + '</span><span class="rir">запас ' + (s.rir ?? "—") + "</span></button>";
    else { const g = suggestFor(ex, i); h += '<div class="set todo"><span class="n">' + (i + 1) + '</span><span class="val num">' + (g.w !== "" ? fmtW(g.w) + " <small>кг</small> × " : "") + g.r + "</span></div>"; }
  }
  if (ED.idx == null && ex.sets.length >= ex.plan.sets && !ex.skipped) h += '<div class="hint ac">' + I.check + "<div>Все подходы сделаны." + (ED.hint ? "" : " Можно идти дальше.") + "</div></div>";
  h += "</div>";
  if (ED.hint) h += '<div class="hint ' + ED.hint.k + '">' + (ED.hint.k === "bad" ? I.warn : I.spark) + "<div>" + esc(ED.hint.t) + "</div></div>";
  h += '<div class="ex-actions"><button class="btn sec sm" id="addSet">' + I.plus + " Подход</button><button class=\"btn sec sm\" id=\"howTo\">" + I.info + " Как делать</button></div>";
  return h;
}
function editorHTML(ex, i) {
  const editing = ED.idx != null; const rg = range(ex.plan.reps);
  const assist = exInfo(ex.id).assist;
  return '<div class="editor"><div class="eh"><b>' + (editing ? "Изменить подход " + (i + 1) : "Подход " + (i + 1) + " из " + ex.plan.sets) + '</b><span class="chip">' + rg.lo + (rg.hi !== rg.lo ? "–" + rg.hi : "") + " повт.</span></div>" +
    '<div class="steppers"><div class="stp"><div class="lab">' + (assist ? "Противовес" : "Вес") + '</div><div class="row2"><button class="pm" data-w="-1" aria-label="Меньше">' + I.minus + '</button><input id="edW" inputmode="decimal" enterkeyhint="done" value="' + esc(ED.w === "" || ED.w == null ? "" : fmtW(ED.w)) + '" placeholder="0" aria-label="Вес, кг"><button class="pm" data-w="1" aria-label="Больше">' + I.plus + '</button></div><div class="unit">кг · шаг ' + fmtW(stepFor(ex.id)) + "</div></div>" +
    '<div class="stp"><div class="lab">Повторы</div><div class="row2"><button class="pm" data-r="-1" aria-label="Меньше">' + I.minus + '</button><input id="edR" inputmode="numeric" enterkeyhint="done" value="' + esc(ED.r) + '" placeholder="0" aria-label="Повторы"><button class="pm" data-r="1" aria-label="Больше">' + I.plus + '</button></div><div class="unit">' + (exInfo(ex.id).perSide ? "на каждую сторону" : "раз") + "</div></div></div>" +
    '<div class="rir-row"><div class="lab"><span>Сколько ещё мог сделать</span><span class="faint">' + (CFG.treatment ? "цель: 2–3" : "цель: 1–2") + '</span></div><div class="seg" id="rirSeg">' + [0, 1, 2, 3, 4].map(v => '<button data-rir="' + v + '" aria-pressed="' + (ED.rir === v) + '">' + (v === 4 ? "4+" : v) + "</button>").join("") + "</div></div>" +
    '<button class="btn pri" id="logSet">' + I.check + (editing ? " Сохранить" : " Подход готов") + "</button>" +
    (editing ? '<div class="ex-actions"><button class="btn sec sm" id="edCancel">Отмена</button><button class="btn danger sm" id="edDel">' + I.trash + " Удалить</button></div>" : "") + "</div>";
}
function swElapsed(ex) { if (!ex || !ex.cardio) return 0; return (ex.swAcc || 0) + (ex.swStart ? Date.now() - ex.swStart : 0); }
function cardioHTML(ex) {
  const run = !!ex.swStart; const rg = range(ex.plan.reps);
  const mins = ex.minutes != null ? ex.minutes : Math.max(rg.lo, Math.round(swElapsed(ex) / 60000)) || rg.lo;
  return '<div class="card cardio" style="margin-top:16px"><div class="eyebrow">Секундомер</div><div class="clock num" id="swClock">' + mmss(swElapsed(ex) / 1000) + '</div><button class="btn ' + (run ? "sec" : "pri") + '" id="swBtn" style="margin-top:8px">' + (run ? I.pause + " Пауза" : I.play + (swElapsed(ex) ? " Продолжить" : " Старт")) + "</button></div>" +
    '<div class="editor" style="margin-top:12px"><div class="steppers" style="grid-template-columns:1fr"><div class="stp"><div class="lab">Минут</div><div class="row2"><button class="pm" data-m="-1">' + I.minus + '</button><input id="edM" inputmode="numeric" value="' + mins + '"><button class="pm" data-m="1">' + I.plus + "</button></div></div></div>" +
    '<label class="field"><span>Уровень, обороты, ощущения</span><input class="input" id="edNote" value="' + esc(ex.note) + '" placeholder="уровень 10, ~65 об/мин"></label>' +
    '<button class="btn pri" id="cardioDone">' + I.check + (ex.minutes != null ? " Сохранить" : " Готово") + "</button></div>";
}
function bindWorkout() {
  const ex = curEx();
  $("#wkHome").addEventListener("click", () => { stopRest0(); go("home"); });
  $("#wkFinish").addEventListener("click", openFinish);
  const f2 = $("#wkFinish2"); if (f2) f2.addEventListener("click", openFinish);
  $("#wkPlan").addEventListener("click", openPlan);
  $("#exMenu").addEventListener("click", openExMenu);
  const prev = $("#wkPrev"); if (prev) prev.addEventListener("click", () => { const all = flatExs(SES); const ci = all.findIndex(x => x.bi === SES.cur.b && x.ei === SES.cur.e); if (all[ci - 1]) { haptic(); setCur(all[ci - 1].bi, all[ci - 1].ei); renderWorkout(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  const nx = $("#wkNext"); if (nx) nx.addEventListener("click", () => { const all = flatExs(SES); const ci = all.findIndex(x => x.bi === SES.cur.b && x.ei === SES.cur.e); if (all[ci + 1]) { haptic(); setCur(all[ci + 1].bi, all[ci + 1].ei); renderWorkout(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  const us = $("#unskip"); if (us) us.addEventListener("click", () => { ex.skipped = false; saveSes(true); renderWorkout(); });
  // подходы
  $$("[data-edit]").forEach(b => b.addEventListener("click", () => { ED.idx = +b.dataset.edit; ED.init = false; haptic(); renderWorkout(); }));
  const add = $("#addSet"); if (add) add.addEventListener("click", () => { ex.plan.sets++; ED.idx = null; ED.init = false; saveSes(false); haptic(); renderWorkout(); });
  const how = $("#howTo"); if (how) how.addEventListener("click", () => openHow(ex.id));
  $$("[data-w]").forEach(b => b.addEventListener("click", () => { const v = (num($("#edW").value) || 0) + (+b.dataset.w) * stepFor(ex.id); ED.w = Math.max(0, Math.round(v * 100) / 100); $("#edW").value = fmtW(ED.w); haptic(); }));
  $$("[data-r]").forEach(b => b.addEventListener("click", () => { const v = (parseInt($("#edR").value, 10) || 0) + (+b.dataset.r); ED.r = Math.max(0, v); $("#edR").value = ED.r; haptic(); }));
  const ew = $("#edW"); if (ew) { ew.addEventListener("input", () => { ED.w = num(ew.value) ?? ""; }); ew.addEventListener("focus", () => ew.select()); }
  const er = $("#edR"); if (er) { er.addEventListener("input", () => { ED.r = parseInt(er.value, 10) || ""; }); er.addEventListener("focus", () => er.select()); }
  $$("[data-rir]").forEach(b => b.addEventListener("click", () => { ED.rir = +b.dataset.rir; $$("[data-rir]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); haptic(); }));
  const ls = $("#logSet"); if (ls) ls.addEventListener("click", () => { ED.w = num($("#edW").value) ?? ""; ED.r = parseInt($("#edR").value, 10) || ""; logSet(); });
  const ec = $("#edCancel"); if (ec) ec.addEventListener("click", () => { ED.idx = null; ED.init = false; renderWorkout(); });
  const ed = $("#edDel"); if (ed) ed.addEventListener("click", () => { ex.sets.splice(ED.idx, 1); ED.idx = null; ED.init = false; saveSes(true); renderWorkout(); toast("Подход удалён"); });
  // кардио
  const sw = $("#swBtn"); if (sw) sw.addEventListener("click", () => { unlockAudio(); haptic(); if (ex.swStart) { ex.swAcc = (ex.swAcc || 0) + Date.now() - ex.swStart; ex.swStart = null; } else ex.swStart = Date.now(); LS.set("active", SES); renderWorkout(); });
  $$("[data-m]").forEach(b => b.addEventListener("click", () => { const i = $("#edM"); i.value = Math.max(0, (parseInt(i.value, 10) || 0) + (+b.dataset.m)); haptic(); }));
  const cd = $("#cardioDone"); if (cd) cd.addEventListener("click", () => {
    const m = parseInt($("#edM").value, 10); if (!(m > 0)) { toast("Укажи минуты", "warn"); return; }
    if (ex.swStart) { ex.swAcc += Date.now() - ex.swStart; ex.swStart = null; }
    const first = ex.minutes == null; ex.minutes = m; ex.note = $("#edNote").value.trim(); haptic(); unlockAudio();
    if (first) { const n = nextOpen(SES.cur.b, SES.cur.e); if (n) setCur(n.bi, n.ei); }
    saveSes(true); renderWorkout(); window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
function stopRest0() { clearInterval(restTick); restTick = 0; const r = $("#rest"); if (r) r.remove(); clearInterval(clockTm); keepAwake(false); }

/* ---------------- шторки тренировки ---------------- */
function openHow(id) {
  const e = exInfo(id), g = typeof GUIDE !== "undefined" && GUIDE[id];
  const mus = (e.prim || []).map(m => MUS_NAME[m] || m).join(", "), sec = (e.sec || []).map(m => MUS_NAME[m] || m).join(", ");
  openSheet('<div class="sh-top"><h2>' + esc(e.name) + '</h2><button class="icon-btn" data-close>' + I.x + '</button></div><div class="how">' +
    (mus ? '<p class="muted"><b style="color:var(--tx)">Работают:</b> ' + esc(mus) + (sec ? " · <b style=\"color:var(--tx)\">помогают:</b> " + esc(sec) : "") + "</p>" : "") +
    (g ? "<h3>Как делать</h3><ol>" + g.how.map(s => "<li>" + esc(s) + "</li>").join("") + "</ol><h3>Частые ошибки</h3><ul>" + g.err.map(s => "<li>" + esc(s) + "</li>").join("") + "</ul>" : "") +
    (e.tip ? '<div class="hint ac">' + I.spark + "<div>" + esc(e.tip) + "</div></div>" : "") + "</div>", sh => $("[data-close]", sh).addEventListener("click", () => closeSheet()));
}
function openExMenu() {
  const ex = curEx();
  openSheet('<div class="sh-top"><h2>' + esc(exInfo(ex.id).name) + '</h2><button class="icon-btn" data-close>' + I.x + "</button></div>" +
    '<div class="menu"><button data-a="how">' + I.info + "Как делать</button><button data-a=\"photo\">" + I.camera + (LS.get(photoKey(ex.id), null) ? "Переснять фото тренажёра" : "Сфотографировать тренажёр") + '</button><button data-a="note">' + I.note + "Заметка к упражнению</button></div>" +
    '<div class="menu" style="margin-top:12px"><button data-a="replace">' + I.swap + 'Заменить упражнение</button><button data-a="plan">' + I.list + "Сделать другое сейчас</button><button data-a=\"skip\">" + I.skip + (ex.skipped ? "Вернуть упражнение" : "Пропустить упражнение") + "</button></div>" +
    '<div class="menu" style="margin-top:12px"><button data-a="hb" class="' + (SES.heartburn ? "" : "bad") + '">' + I.flame + (SES.heartburn ? "Изжога прошла — снять отметку" : "Изжога или дискомфорт") + "</button></div>",
  sh => {
    $("[data-close]", sh).addEventListener("click", () => closeSheet());
    $$("[data-a]", sh).forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.a;
      if (a === "how") openHow(ex.id);
      if (a === "photo") { closeSheet(true); takePhoto(ex.id); }
      if (a === "note") openNote();
      if (a === "replace") openReplace();
      if (a === "plan") openPlan();
      if (a === "skip") { ex.skipped = !ex.skipped; if (ex.skipped) { const n = nextOpen(SES.cur.b, SES.cur.e); if (n) setCur(n.bi, n.ei); } saveSes(true); closeSheet(); }
      if (a === "hb") { if (SES.heartburn) { SES.heartburn = false; saveSes(true); closeSheet(); } else openHeartburn(); }
    }));
  });
}
function openNote() {
  const ex = curEx();
  openSheet('<div class="sh-top"><h2>Заметка</h2><button class="icon-btn" data-close>' + I.x + '</button></div><textarea class="textarea" id="nt" placeholder="Например: сиденье 4, тянуло в пояснице">' + esc(ex.note) + '</textarea><button class="btn pri" id="ntSave" style="margin-top:14px">Сохранить</button>',
    sh => { $("[data-close]", sh).addEventListener("click", () => closeSheet()); const t = $("#nt", sh); setTimeout(() => t.focus(), 300); $("#ntSave", sh).addEventListener("click", () => { ex.note = t.value.trim(); saveSes(true); closeSheet(); }); });
}
function openHeartburn() {
  openSheet('<div class="sh-top"><h2>Изжога или дискомфорт</h2><button class="icon-btn" data-close>' + I.x + '</button></div><div class="hint bad" style="margin-top:0">' + I.warn + '<div>Правило 8: снизь нагрузку или закончи тренировку. <b>Боль в груди при нагрузке — к врачу</b>, не списывай на рефлюкс.</div></div>' +
    '<label class="field"><span>Где и когда</span><input class="input" id="hbW" placeholder="за грудиной, после жима ногами" value="' + esc(SES.heartburnWhere) + '"></label>' +
    '<button class="btn danger" id="hbSave" style="margin-top:14px">Отметить и продолжить легче</button><button class="btn sec" id="hbEnd" style="margin-top:10px">Закончить тренировку</button>',
    sh => { $("[data-close]", sh).addEventListener("click", () => closeSheet());
      const save = () => { SES.heartburn = true; SES.heartburnWhere = $("#hbW", sh).value.trim(); saveSes(true); };
      $("#hbSave", sh).addEventListener("click", () => { save(); closeSheet(); });
      $("#hbEnd", sh).addEventListener("click", () => { save(); openFinish(); }); });
}
function openReplace() {
  const ex = curEx(); const cur = new Set(flatExs(SES).map(x => x.ex.id));
  const ids = Object.keys(EX).concat(Object.keys(PROG.custom || {})).filter(id => !exInfo(id).cardio && id !== ex.id && id !== "pendulum");
  const alts = ["goblet", "reverse_lunge", "bulgarian"].filter(id => ids.includes(id));
  const sorted = alts.concat(ids.filter(id => !alts.includes(id)).sort((a, b) => exInfo(a).name.localeCompare(exInfo(b).name, "ru")));
  openSheet('<div class="sh-top"><h2>Заменить на…</h2><button class="icon-btn" data-close>' + I.x + '</button></div><p class="muted small" style="margin-bottom:10px">Тренажёр занят или его нет. Подходы и повторы останутся из плана.</p><div class="list">' +
    sorted.map(id => '<button class="row" data-id="' + esc(id) + '"><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub">' + esc((exInfo(id).prim || []).map(m => MUS_NAME[m] || m).join(", ")) + (cur.has(id) ? " · уже есть сегодня" : "") + (alts.includes(id) ? " · замена при дискомфорте" : "") + "</div></div>" + I.chevR.replace("<svg", '<svg class="chev"') + "</button>").join("") + "</div>",
    sh => { $("[data-close]", sh).addEventListener("click", () => closeSheet());
      $$("[data-id]", sh).forEach(b => b.addEventListener("click", () => { const to = b.dataset.id; SES.replaced.push({ from: ex.id, to }); ex.replacedFrom = ex.id; ex.id = to; ex.sets = []; ED.idx = null; ED.init = false; ED.hint = null; MEDIA.lastKey = null; saveSes(true); closeSheet(); toast("Заменено: " + exInfo(to).name); })); });
}
function openPlan() {
  const all = flatExs(SES);
  let h = '<div class="sh-top"><h2>План · тренировка ' + esc(SES.type) + '</h2><button class="icon-btn" data-close>' + I.x + "</button></div><div class=\"list\">";
  all.forEach((x, i) => {
    const cur = x.bi === SES.cur.b && x.ei === SES.cur.e; const done = isExDone(x.ex) && !x.ex.skipped;
    const sub = x.ex.cardio ? (x.ex.minutes != null ? x.ex.minutes + " мин" : x.ex.plan.reps) : x.ex.sets.length + " из " + x.ex.plan.sets + " · " + x.ex.plan.reps + (x.ex.sets.length ? " · " + x.ex.sets.map(s => fmtW(s.w) + "×" + s.r).join(", ") : "");
    h += '<button class="plan-item' + (cur ? " cur" : "") + (done ? " done" : "") + (x.ex.skipped ? " skip" : "") + '" data-i="' + i + '"' + (x.ss ? ' style="box-shadow:inset 3px 0 0 var(--rest)"' : "") + '><span class="st">' + (done ? I.check.replace("<svg", '<svg style="width:14px;height:14px"') : i + 1) + '</span><div class="grow"><div class="ttl">' + esc(exInfo(x.ex.id).name) + '</div><div class="sub num">' + esc(sub) + (x.ss ? " · суперсет" : "") + "</div></div></button>";
  });
  h += '</div><p class="help" style="margin-top:10px">Нажми на упражнение, чтобы перейти к нему. Порядок лучше не менять без причины: ноги → база → изоляция → руки.</p>';
  openSheet(h, sh => { $("[data-close]", sh).addEventListener("click", () => closeSheet());
    $$("[data-i]", sh).forEach(b => b.addEventListener("click", () => { const x = all[+b.dataset.i]; setCur(x.bi, x.ei); haptic(); closeSheet(); window.scrollTo(0, 0); })); });
}

/* ---------------- завершение ---------------- */
function openFinish() {
  const all = flatExs(SES); const left = all.filter(x => !isExDone(x.ex)).length;
  const F = { feel: SES.feel ?? 7, energy: SES.energy ?? 3, sleep: SES.sleep ?? 7 };
  const sc = (k, arr) => '<div class="scale' + (arr.length > 5 ? " ten" : "") + '" data-k="' + k + '">' + arr.map(v => '<button data-v="' + v + '" aria-pressed="' + (F[k] === v) + '" class="num">' + v + "</button>").join("") + "</div>";
  openSheet('<div class="sh-top"><h2>Завершить тренировку</h2><button class="icon-btn" data-close>' + I.x + "</button></div>" +
    (left ? '<div class="hint warn" style="margin-top:0">' + I.warn + "<div>Не сделано " + left + " " + plural(left, ["упражнение", "упражнения", "упражнений"]) + ". Они попадут в разбор как пропущенные.</div></div>" : "") +
    '<label class="field"><span>Самочувствие на тренировке (1–10)</span></label>' + sc("feel", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) +
    '<label class="field"><span>Энергия до тренировки (1–5)</span></label>' + sc("energy", [1, 2, 3, 4, 5]) +
    '<label class="field"><span>Сон прошлой ночью</span></label><div class="stp" style="display:flex;align-items:center;gap:10px;padding:8px"><button class="pm" id="slM">' + I.minus + '</button><div style="flex:1;text-align:center"><span class="num" id="slV" style="font-size:28px;font-weight:700">' + fmtW(F.sleep) + '</span> <span class="faint">ч</span></div><button class="pm" id="slP">' + I.plus + "</button></div>" +
    '<div class="switch-row" style="border-radius:16px;margin-top:14px"><span>Была изжога или дискомфорт</span><input type="checkbox" class="tgl" id="fHb"' + (SES.heartburn ? " checked" : "") + "></div>" +
    '<label class="field" id="fHbW"' + (SES.heartburn ? "" : " hidden") + '><span>Где и когда</span><input class="input" id="fHbWi" value="' + esc(SES.heartburnWhere) + '"></label>' +
    '<label class="field"><span>Что понравилось</span><textarea class="textarea" id="fLk" rows="2">' + esc(SES.liked || "") + "</textarea></label>" +
    '<label class="field"><span>Что не понравилось</span><textarea class="textarea" id="fDl" rows="2">' + esc(SES.disliked || "") + "</textarea></label>" +
    '<label class="field"><span>Заметки для тренера</span><textarea class="textarea" id="fNt" rows="2" placeholder="еда до тренировки, как прошло, вопросы">' + esc(SES.notes || "") + "</textarea></label>" +
    '<button class="btn pri" id="fSave" style="margin-top:18px">' + I.check + ' Сохранить и отправить</button><button class="btn ghost" id="fDiscard" style="margin-top:6px;color:var(--bad)">Удалить тренировку</button>',
  sh => {
    $("[data-close]", sh).addEventListener("click", () => closeSheet());
    $$(".scale", sh).forEach(s => $$("button", s).forEach(b => b.addEventListener("click", () => { F[s.dataset.k] = +b.dataset.v; $$("button", s).forEach(x => x.setAttribute("aria-pressed", String(x === b))); haptic(); })));
    const sl = d => { F.sleep = Math.max(3, Math.min(12, F.sleep + d)); $("#slV", sh).textContent = fmtW(F.sleep); haptic(); };
    $("#slM", sh).addEventListener("click", () => sl(-.5)); $("#slP", sh).addEventListener("click", () => sl(.5));
    $("#fHb", sh).addEventListener("change", e => { $("#fHbW", sh).hidden = !e.target.checked; });
    $("#fSave", sh).addEventListener("click", () => {
      Object.assign(SES, F, { heartburn: $("#fHb", sh).checked, heartburnWhere: $("#fHbWi", sh).value.trim(), liked: $("#fLk", sh).value.trim(), disliked: $("#fDl", sh).value.trim(), notes: $("#fNt", sh).value.trim() });
      finishWorkout();
    });
    $("#fDiscard", sh).addEventListener("click", () => {
      if (!confirmInline(sh, "#fDiscard", "Точно удалить? Нажми ещё раз")) return;
      const id = SES.id; stopRest0(); SES = null; LS.del("active"); delete OUT["workouts/" + id + ".json"]; LS.set("outbox", OUT);
      if (SHAS["workouts/" + id + ".json"]) queue("workouts/" + id + ".json", JSON.stringify({ status: "deleted", date: id.slice(0, 10), deletedAt: new Date().toISOString() }), "Тренировка удалена");
      closeSheet(true); go("home"); toast("Тренировка удалена");
    });
  });
}
function confirmInline(sh, sel, txt) { const b = $(sel, sh); if (b.dataset.armed) return true; b.dataset.armed = "1"; b.textContent = txt; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Удалить тренировку"; } }, 3000); return false; }
function finishWorkout() {
  SES.rest = null; flatExs(SES).forEach(x => { if (x.ex.cardio && x.ex.swStart) { x.ex.swAcc += Date.now() - x.ex.swStart; x.ex.swStart = null; } });
  SES.status = "done"; SES.finishedAt = Date.now();
  const doc = exportDoc(SES);
  HIST[SES.id] = Object.assign({}, doc, { _id: SES.id }); LS.set("hist", HIST);
  queue("workouts/" + SES.id + ".json", JSON.stringify(doc, null, 1), "Тренировка " + SES.type + " " + SES.date + ": завершена");
  LAST_DONE = SES.id; stopRest0(); SES = null; LS.del("active"); closeSheet(true); haptic(2); beep([0, .12]);
  go("summary"); flush();
}

/* ---------------- итог ---------------- */
let LAST_DONE = null;
function viewSummary() {
  const w = HIST[LAST_DONE]; if (!w) return viewHome();
  const prs = [];
  (w.exercises || []).forEach(x => { if (!x.sets || !x.sets.length || exInfo(x.id).assist) return; const best = Math.max(...x.sets.map(e1rm)); const prev = doneWorkouts().filter(o => o.date < w.date || (o.date === w.date && o._id !== w._id && o.startedAt < w.startedAt)).flatMap(o => (o.exercises || []).filter(e => e.id === x.id).flatMap(e => e.sets || [])); if (prev.length && best > Math.max(...prev.map(e1rm)) + .01) prs.push(x.id); });
  return '<main class="view"><div class="done-hero"><div class="medal">' + I.check + '</div><h1 class="lt">Тренировка ' + esc(w.type) + ' готова</h1><p class="muted" style="margin-top:8px">' + esc(fmtShort(w.date)) + " · отправлено тренеру. Разбор — сегодня в " + esc(CFG.coachTime) + ".</p></div>" +
    '<div class="grid3">' + stat("Время", w.duration + "<small>мин</small>", "") + stat("Подходов", setCount(w) + "", "") + stat("Тоннаж", fmtT(tonnage(w)).replace(/ (т|кг)$/, "<small>$1</small>"), "") + "</div>" +
    (prs.length ? '<div class="sec-h"><h2>Рекорды</h2></div><div class="list">' + prs.map(id => '<div class="row"><span class="badge A">' + I.up.replace("<svg", '<svg style="width:20px;height:20px"') + '</span><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub">лучше прошлых по расчётному максимуму</div></div></div>').join("") + "</div>" : "") +
    '<div class="sec-h"><h2>Упражнения</h2></div>' + workoutList(w) +
    '<div style="height:20px"></div><button class="btn pri" data-go="home">Готово</button><div class="sync" id="sync" style="margin:14px auto 0;display:flex;width:max-content"><i></i><span>…</span></div></main>';
}
function bindSummary() { bindCommon(); renderSync(); }
function workoutList(w) {
  return '<div class="list">' + (w.exercises || []).map(x => '<div class="row"><div class="grow"><div class="ttl">' + esc(exInfo(x.id).name) + '</div><div class="sub num">' + (x.minutes != null ? x.minutes + " мин" : (x.sets || []).map(s => fmtW(s.w) + "×" + s.r + (s.rir != null ? " (" + s.rir + ")" : "")).join(" · ")) + (x.note ? " · " + esc(x.note) : "") + "</div></div></div>").join("") +
    (w.skipped || []).map(id => '<div class="row"><div class="grow"><div class="ttl faint">' + esc(exInfo(id).name) + '</div><div class="sub">пропущено</div></div></div>').join("") + "</div>";
}

/* ================================================================
   ИСТОРИЯ
   ================================================================ */
let HTAB = "w";
function viewHistory() {
  const ws = doneWorkouts().filter(w => w.status !== "deleted").reverse();
  let h = '<main class="view"><div class="top"><div><div class="eyebrow">' + ws.length + " " + plural(ws.length, ["тренировка", "тренировки", "тренировок"]) + '</div><h1 class="lt">История</h1></div>' + syncPill() + "</div>";
  h += '<div class="seg" id="hSeg"><button data-h="w" aria-pressed="' + (HTAB === "w") + '">Тренировки</button><button data-h="e" aria-pressed="' + (HTAB === "e") + '">Упражнения</button></div><div style="height:14px"></div>';
  if (!ws.length) return h + '<div class="card muted">Здесь появятся тренировки. Первая уже в пути?</div></main>';
  if (HTAB === "w") {
    h += '<div class="list">' + ws.map(w => '<button class="row" data-w="' + esc(w._id) + '"><span class="badge ' + esc(w.type) + '">' + esc(w.type) + '</span><div class="grow"><div class="ttl">' + esc(fmtShort(w.date)) + (w.heartburn ? ' <span class="chip bad" style="padding:2px 8px">изжога</span>' : "") + '</div><div class="sub num">' + (w.duration ? w.duration + " мин · " : "") + setCount(w) + " подх. · " + fmtT(tonnage(w)) + "</div></div>" + I.chevR.replace("<svg", '<svg class="chev"') + "</button>").join("") + "</div>";
  } else {
    const ids = {}; ws.slice().reverse().forEach(w => (w.exercises || []).forEach(x => { if (x.sets && x.sets.length) (ids[x.id] = ids[x.id] || []).push({ date: w.date, sets: x.sets }); }));
    h += '<div class="list">' + Object.keys(ids).sort((a, b) => exInfo(a).name.localeCompare(exInfo(b).name, "ru")).map(id => {
      const pts = ids[id]; const lastP = pts[pts.length - 1]; const best = lastP.sets.reduce((a, s) => e1rm(s) > e1rm(a) ? s : a, lastP.sets[0]);
      return '<button class="row" data-e="' + esc(id) + '"><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub num">' + fmtW(best.w) + " кг × " + best.r + " · " + pts.length + " " + plural(pts.length, ["раз", "раза", "раз"]) + '</div></div><div style="width:84px">' + spark(pts.map(p => Math.max(...p.sets.map(s => exInfo(id).assist ? -s.w : e1rm(s))))) + "</div></button>";
    }).join("") + "</div>";
  }
  return h + "</main>";
}
function spark(vals, cls = "spark", w = 84, hgt = 40) {
  if (!vals.length) return "";
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [vals.length === 1 ? w / 2 : i / (vals.length - 1) * (w - 6) + 3, hgt - 5 - (v - mn) / rg * (hgt - 10)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const up = vals[vals.length - 1] >= vals[0];
  return '<svg class="' + cls + '" viewBox="0 0 ' + w + " " + hgt + '" style="height:' + hgt + 'px"><path d="' + d + '" fill="none" stroke="' + (up ? "var(--ac)" : "var(--warn)") + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' + '<circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="3" fill="' + (up ? "var(--ac)" : "var(--warn)") + '"/></svg>';
}
function bindHistory() {
  $$("#hSeg button").forEach(b => b.addEventListener("click", () => { HTAB = b.dataset.h; render(); }));
  $$("[data-w]").forEach(b => b.addEventListener("click", () => {
    const w = HIST[b.dataset.w];
    openSheet('<div class="sh-top"><h2>Тренировка ' + esc(w.type) + '</h2><button class="icon-btn" data-close>' + I.x + '</button></div><p class="muted" style="margin:-6px 0 14px">' + esc(fmtShort(w.date)) + (w.duration ? " · " + w.duration + " мин" : "") + (w.feel ? " · самочувствие " + w.feel + "/10" : "") + (w.sleep ? " · сон " + fmtW(w.sleep) + " ч" : "") + "</p>" +
      (w.heartburn ? '<div class="hint bad" style="margin:0 0 12px">' + I.flame + "<div>Изжога / дискомфорт" + (w.heartburnWhere ? ": " + esc(w.heartburnWhere) : "") + "</div></div>" : "") + workoutList(w) +
      (w.notes ? '<p class="muted" style="margin-top:14px">' + esc(w.notes) + "</p>" : ""), sh => $("[data-close]", sh).addEventListener("click", () => closeSheet()));
  }));
  $$("[data-e]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.e; const assist = exInfo(id).assist;
    const pts = doneWorkouts().flatMap(w => (w.exercises || []).filter(x => x.id === id && x.sets && x.sets.length).map(x => ({ date: w.date, sets: x.sets })));
    const vals = pts.map(p => Math.max(...p.sets.map(s => assist ? -s.w : e1rm(s))));
    openSheet('<div class="sh-top"><h2>' + esc(exInfo(id).name) + '</h2><button class="icon-btn" data-close>' + I.x + '</button></div><div class="card" style="padding:14px 10px">' + spark(vals, "chart", 340, 160) + '<p class="help" style="text-align:center">' + (assist ? "Противовес по тренировкам: линия вверх — значит противовес меньше, ты сильнее" : "Расчётный максимум: вес × (1 + повторы / 30)") + "</p></div>" +
      '<div class="list" style="margin-top:12px">' + pts.slice().reverse().map(p => '<div class="row"><div class="grow"><div class="ttl">' + esc(fmtShort(p.date)) + '</div><div class="sub num">' + p.sets.map(s => fmtW(s.w) + "×" + s.r).join(" · ") + "</div></div></div>").join("") + "</div>", sh => $("[data-close]", sh).addEventListener("click", () => closeSheet()));
  }));
}

/* ================================================================
   ТРЕНЕР
   ================================================================ */
function md(t) {
  const lines = String(t || "").split(/\r?\n/); let h = "", inList = false;
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  lines.forEach(l => {
    const m = l.match(/^\s*[-•*]\s+(.*)/);
    if (m) { if (!inList) { h += "<ul>"; inList = true; } h += "<li>" + inline(m[1]) + "</li>"; return; }
    if (inList) { h += "</ul>"; inList = false; }
    const hd = l.match(/^#+\s+(.*)/); if (hd) { h += "<h3>" + inline(hd[1]) + "</h3>"; return; }
    if (l.trim()) h += "<p>" + inline(l) + "</p>";
  });
  if (inList) h += "</ul>"; return h;
}
function viewCoach() {
  let h = '<main class="view"><div class="top"><div><div class="eyebrow">разбор в ' + esc(CFG.coachTime) + '</div><h1 class="lt">Тренер</h1></div>' + syncPill() + "</div>";
  if (COACH) h += '<article class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">' + esc(COACH.title || "Разбор") + '</div><div class="d">' + esc(COACH.date ? fmtShort(COACH.date) : "") + (COACH.workout ? " · тренировка " + esc(COACH.workout) : "") + '</div></div></div><div class="prose">' + md(COACH.text) + "</div></article>";
  else h += '<div class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">Пока разборов нет</div><div class="d">первый появится после тренировки</div></div></div><p class="muted">Каждый вечер в ' + esc(CFG.coachTime) + " тренер смотрит новые тренировки: пишет вывод, ставит цели по весам и при необходимости правит программу. Всё это появится здесь и в Дневнике.</p></div>";
  const tg = PROG.targets || {}; const ids = Object.keys(tg).sort((a, b) => String(tg[b].date || "").localeCompare(String(tg[a].date || "")));
  if (ids.length) {
    h += '<div class="sec-h"><h2>Цели по весам</h2></div><div class="list">' + ids.map(id => '<div class="row"><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub">' + (tg[id].note ? esc(tg[id].note) : "от " + esc(tg[id].date ? fmtShort(tg[id].date) : "")) + '</div></div><span class="chip ac num">' + (tg[id].w != null ? fmtW(tg[id].w) + " кг × " : "") + esc(tg[id].reps || "") + "</span></div>").join("") + "</div>";
  }
  const arch = COACH_ARCH.filter(c => !COACH || c.id !== COACH.id);
  if (arch.length) h += '<div class="sec-h"><h2>Прошлые разборы</h2></div><div class="list">' + arch.map((c, i) => '<button class="row" data-c="' + i + '"><div class="grow"><div class="ttl">' + esc(c.title || "Разбор") + '</div><div class="sub">' + esc(c.date ? fmtShort(c.date) : "") + "</div></div>" + I.chevR.replace("<svg", '<svg class="chev"') + "</button>").join("") + "</div>";
  h += '<p class="help" style="margin-top:18px">Программа обновлена: ' + esc(PROG.updated ? fmtShort(PROG.updated) : "—") + (PROG.lastChange && PROG.lastChange.reason ? " — " + esc(PROG.lastChange.reason) : "") + ". Вопросы и изменения — в чате проекта «Зал».</p>";
  return h + "</main>";
}
function bindCoach() {
  const arch = COACH_ARCH.filter(c => !COACH || c.id !== COACH.id);
  $$("[data-c]").forEach(b => b.addEventListener("click", () => { const c = arch[+b.dataset.c]; openSheet('<div class="sh-top"><h2>' + esc(c.title || "Разбор") + '</h2><button class="icon-btn" data-close>' + I.x + '</button></div><p class="muted" style="margin:-6px 0 12px">' + esc(c.date ? fmtShort(c.date) : "") + '</p><div class="prose">' + md(c.text) + "</div>", sh => $("[data-close]", sh).addEventListener("click", () => closeSheet())); }));
}

/* ================================================================
   НАСТРОЙКИ
   ================================================================ */
function viewSettings() {
  const n = Object.keys(OUT).length;
  const restSeg = (k, opts) => '<div class="seg" data-rs="' + k + '">' + opts.map(v => '<button data-v="' + v + '" aria-pressed="' + (CFG[k] === v) + '" class="num">' + mmss(v) + "</button>").join("") + "</div>";
  const tg = (k, label, sub) => '<label class="switch-row"><span><span style="display:block">' + label + "</span>" + (sub ? '<span class="small faint">' + sub + "</span>" : "") + '</span><input type="checkbox" class="tgl" data-cfg="' + k + '"' + (CFG[k] ? " checked" : "") + "></label>";
  return '<main class="view"><div class="top"><div><div class="eyebrow">версия ' + VERSION + '</div><h1 class="lt">Настройки</h1></div>' + syncPill() + "</div>" +
    '<div class="sec-h"><h2>GitHub</h2></div><div class="card">' +
    '<label class="field" style="margin-top:0"><span>Логин GitHub</span><input class="input" id="sOwner" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(CFG.owner) + '" placeholder="например, ivanov"></label>' +
    '<label class="field"><span>Репозиторий с данными</span><input class="input" id="sRepo" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(CFG.repo) + '"></label>' +
    '<label class="field"><span>Ключ доступа</span><input class="input" id="sToken" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(CFG.token) + '" placeholder="github_pat_…"></label>' +
    '<p class="help">Ключ хранится только в этом телефоне и даёт доступ только к репозиторию с данными.</p>' +
    '<button class="btn pri" id="sSave" style="margin-top:14px">Сохранить и проверить</button><p class="help" id="sMsg" style="text-align:center"></p></div>' +
    '<div class="sec-h"><h2>Синхронизация</h2></div><div class="list">' +
    '<div class="row"><div class="grow"><div class="ttl">Ждут отправки</div><div class="sub">' + (n ? n + " " + plural(n, ["запись", "записи", "записей"]) : "всё отправлено") + (SYNC.lastPush ? " · отправка " + timeAgo(SYNC.lastPush) : "") + '</div></div><button class="btn sec sm" id="sPush">Отправить</button></div>' +
    '<div class="row"><div class="grow"><div class="ttl">Программа и разборы</div><div class="sub">' + (SYNC.lastPull ? "обновлено " + timeAgo(SYNC.lastPull) : "ещё не загружались") + (SYNC.err ? " · " + esc(errText(SYNC.err)) : "") + '</div></div><button class="btn sec sm" id="sPull">Обновить</button></div></div>' +
    '<div class="sec-h"><h2>Таймер отдыха</h2></div><div class="card"><div class="small muted" style="margin-bottom:8px">Базовые упражнения</div>' + restSeg("restBase", [90, 120, 150, 180]) + '<div class="small muted" style="margin:14px 0 8px">Изолирующие и суперсеты</div>' + restSeg("restIso", [60, 75, 90, 120]) + "</div>" +
    '<div class="sec-h"><h2>Во время тренировки</h2></div><div class="list">' + tg("sound", "Звук в конце отдыха", "работает, пока экран включён") + tg("haptics", "Вибрация") + tg("awake", "Не гасить экран", "экран не заблокируется во время тренировки") + tg("treatment", "Правила на время лечения", "запас 2–3 повтора, подсказки по ГЭРП, счётчик до ЭГДС") + "</div>" +
    '<div class="sec-h"><h2>Тренер</h2></div><div class="card"><div class="ttl" style="font-weight:600">Разбор каждый день в ' + esc(CFG.coachTime) + '</div><p class="help" style="margin:6px 0 0">Если в этот день была тренировка, тренер её разберёт, обновит цели и Дневник. Чтобы поменять время, напиши в чате проекта «Зал»: «Разбор в 21:30».</p></div>' +
    '<div class="sec-h"><h2>Данные</h2></div><div class="list"><button class="row" id="sReload"><div class="grow"><div class="ttl">Перезагрузить приложение</div><div class="sub">если что-то выглядит странно</div></div>' + I.refresh.replace("<svg", '<svg class="chev"') + "</button></div>" +
    '<p class="foot">Модель мышц — BodyParts3D © The Database Center for Life Science, <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en">CC BY-SA 2.1 JP</a>.<br>Схемы движений нарисованы для этого приложения.</p></main>';
}
function timeAgo(ts) { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return "только что"; if (m < 60) return m + " мин назад"; const h = Math.round(m / 60); if (h < 24) return h + " ч назад"; const d = new Date(ts); return d.getDate() + " " + MON_S[d.getMonth()]; }
async function checkConn(msgEl) {
  msgEl.textContent = "Проверяю…"; msgEl.style.color = "";
  try {
    const r = await GH.req("GET", "");
    if (!r.ok) throw await GH.err(r);
    msgEl.textContent = "✓ Подключено. Загружаю программу…"; msgEl.style.color = "var(--ok)";
    await pull({ silent: true, noRender: true }); flush();
    msgEl.textContent = "✓ Подключено"; return true;
  } catch (e) { msgEl.textContent = errText(e); msgEl.style.color = "var(--bad)"; return false; }
}
function bindSettings() {
  $("#sSave").addEventListener("click", async () => {
    CFG.owner = $("#sOwner").value.trim(); CFG.repo = $("#sRepo").value.trim() || "zal-data"; CFG.token = $("#sToken").value.trim(); saveCfg();
    SHAS = {}; LS.set("shas", SHAS);
    if (!GH.ok()) { $("#sMsg").textContent = "Заполни логин и ключ"; return; }
    if (await checkConn($("#sMsg"))) setTimeout(render, 900);
  });
  $("#sPush").addEventListener("click", () => { SYNC.err = null; flush(); setTimeout(render, 1500); });
  $("#sPull").addEventListener("click", async () => { await pull(); render(); });
  $("#sReload").addEventListener("click", () => location.reload());
  $$("[data-rs]").forEach(s => $$("button", s).forEach(b => b.addEventListener("click", () => { CFG[s.dataset.rs] = +b.dataset.v; saveCfg(); $$("button", s).forEach(x => x.setAttribute("aria-pressed", String(x === b))); haptic(); })));
  $$("[data-cfg]").forEach(t => t.addEventListener("change", () => { CFG[t.dataset.cfg] = t.checked; saveCfg(); if (t.checked) haptic(); }));
}

/* ================================================================
   ПЕРВЫЙ ЗАПУСК
   ================================================================ */
function viewOnboarding() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return '<main class="onb"><img class="logo" src="icons/icon-180.png" alt=""><h1 class="lt">Зал</h1><p class="muted" style="font-size:17px;margin-top:8px">Записывай подходы прямо в зале. Тренер разберёт тренировку вечером.</p>' +
    (standalone ? "" : '<div class="hint ac" style="margin-top:18px">' + I.up + "<div>Сначала поставь значок: в Safari нажми <b>Поделиться</b> → <b>На экран «Домой»</b>, и открывай приложение оттуда.</div></div>") +
    '<ol class="steps" style="margin-top:22px"><li>На github.com открой <b>Settings → Developer settings → Fine-grained tokens</b> и нажми <b>Generate new token</b>.</li><li>Доступ: <b>Only select repositories → zal-data</b>. Права: <b>Contents — Read and write</b>.</li><li>Скопируй ключ и вставь ниже.</li></ol>' +
    '<label class="field"><span>Логин GitHub</span><input class="input" id="oOwner" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(CFG.owner) + '" placeholder="например, ivanov"></label>' +
    '<label class="field"><span>Ключ доступа</span><input class="input" id="oToken" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="github_pat_…"></label>' +
    '<button class="btn pri" id="oGo" style="margin-top:18px">Подключить</button><p class="help" id="oMsg" style="text-align:center"></p>' +
    '<button class="btn ghost" id="oSkip" style="margin-top:4px">Попробовать без GitHub</button>' +
    '<p class="foot">Без GitHub всё сохраняется только в телефоне, и тренер тренировки не увидит.</p></main>';
}
function bindOnboarding() {
  $("#oGo").addEventListener("click", async () => {
    CFG.owner = $("#oOwner").value.trim(); CFG.token = $("#oToken").value.trim(); saveCfg();
    if (!GH.ok()) { $("#oMsg").textContent = "Заполни логин и ключ"; return; }
    if (await checkConn($("#oMsg"))) setTimeout(() => go("home"), 700);
  });
  $("#oSkip").addEventListener("click", () => { CFG.skipOnb = true; saveCfg(); go("home"); });
}

/* ================================================================
   ЗАПУСК
   ================================================================ */
document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (VIEW.name === "workout" && SES) { keepAwake(true); if (SES.rest) updRest(); }
    flush(); if (Date.now() - SYNC.lastPull > 30000) pull();
  }
});
addEventListener("online", () => { flush(); pull(); });
setInterval(() => { if (document.visibilityState === "visible") { pull(); flush(); } }, 120000);
setInterval(() => { const t = $("#resumeT") || $("#heroT"); if (t && SES) t.textContent = hms(Date.now() - SES.startedAt); }, 1000);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
if (SES) VIEW.name = "workout";
render();
pull({ silent: true }); flush();
window.__zal = { get SES() { return SES; }, get OUT() { return OUT; }, get HIST() { return HIST; }, CFG, pull, flush };
})();
