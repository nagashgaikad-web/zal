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
    : '<div class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">Тренер</div><div class="d">Разбор приходит в ' + esc(COACH_TIME) + '</div></div></div><div class="muted" style="font-size:15px">После тренировки нажми «Завершить». В ' + esc(COACH_TIME) + ' здесь появится разбор и цели по весам на следующий раз.</div></div>';
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

