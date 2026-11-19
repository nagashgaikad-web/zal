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
  return '<main class="view"><div class="done-hero"><div class="medal">' + I.check + '</div><h1 class="lt">Тренировка ' + esc(w.type) + ' готова</h1><p class="muted" style="margin-top:8px">' + esc(fmtShort(w.date)) + " · отправлено тренеру. Разбор — " + esc(coachWhen()) + ".</p></div>" +
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
  let h = '<main class="view"><div class="top"><div><div class="eyebrow">разбор в ' + esc(COACH_TIME) + '</div><h1 class="lt">Тренер</h1></div>' + syncPill() + "</div>";
  if (COACH) h += '<article class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">' + esc(COACH.title || "Разбор") + '</div><div class="d">' + esc(COACH.date ? fmtShort(COACH.date) : "") + (COACH.workout ? " · тренировка " + esc(COACH.workout) : "") + '</div></div></div><div class="prose">' + md(COACH.text) + "</div></article>";
  else h += '<div class="card"><div class="coach-head"><div class="avatar">' + I.coach + '</div><div><div class="t">Пока разборов нет</div><div class="d">первый появится после тренировки</div></div></div><p class="muted">Каждый день в ' + esc(COACH_TIME) + " тренер смотрит новые тренировки: пишет вывод, ставит цели по весам и при необходимости правит программу. Всё это появится здесь и в Дневнике.</p></div>";
  const tg = PROG.targets || {}; const ids = Object.keys(tg).sort((a, b) => String(tg[b].date || "").localeCompare(String(tg[a].date || "")));
  if (ids.length) {
    h += '<div class="sec-h"><h2>Цели по весам</h2></div><div class="list">' + ids.map(id => '<div class="row"><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub">' + (tg[id].note ? esc(tg[id].note) : "от " + esc(tg[id].date ? fmtShort(tg[id].date) : "")) + '</div></div><span class="chip ac num">' + (tg[id].w != null ? fmtW(tg[id].w) + " кг × " : "") + esc(tg[id].reps || "") + "</span></div>").join("") + "</div>";
  }
  const arch = COACH_ARCH.filter(c => !COACH || c.id !== COACH.id);
  if (arch.length) h += '<div class="sec-h"><h2>Прошлые разборы</h2></div><div class="list">' + arch.map((c, i) => '<button class="row" data-c="' + i + '"><div class="grow"><div class="ttl">' + esc(c.title || "Разбор") + '</div><div class="sub">' + esc(c.date ? fmtShort(c.date) : "") + "</div></div>" + I.chevR.replace("<svg", '<svg class="chev"') + "</button>").join("") + "</div>";
  h += '<p class="help" style="margin-top:18px">Программа обновлена: ' + esc(PROG.updated ? fmtShort(PROG.updated) : "—") + (PROG.lastChange && PROG.lastChange.reason ? " — " + esc(PROG.lastChange.reason) : "") + ". Вопросы и изменения — в чате проекта «Зал».</p>';
  return h + "</main>";
}
function bindCoach() {
  const arch = COACH_ARCH.filter(c => !COACH || c.id !== COACH.id);
  $$("[data-c]").forEach(b => b.addEventListener("click", () => { const c = arch[+b.dataset.c]; openSheet('<div class="sh-top"><h2>' + esc(c.title || "Разбор") + '</h2><button class="icon-btn" data-close>' + I.x + '</button></div><p class="muted" style="margin:-6px 0 12px">' + esc(c.date ? fmtShort(c.date) : "") + '</p><div class="prose">' + md(c.text) + "</div>", sh => $("[data-close]", sh).addEventListener("click", () => closeSheet())); }));
}

