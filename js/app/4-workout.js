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
    (!ex.cardio ? '<span class="chip cy">' + I.clock + " " + (blk.ss ? "круг " : "подход ") + mmss(blk.ss ? Math.max(...blk.exs.map(x => restFor(x.id))) : restFor(ex.id)) + "</span>" : "") +
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
  const orig = ex.replacedFrom || ex.id;
  const same = id => !!exInfo(id).cardio === !!ex.cardio;
  const rec = altsFor(orig).filter(id => id !== ex.id && same(id));
  if (orig !== ex.id) rec.unshift(orig);
  const all = Object.keys(EX).concat(Object.keys(PROG.custom || {})).filter((id, i, arr) => arr.indexOf(id) === i && same(id) && id !== ex.id && id !== "pendulum" && !rec.includes(id))
    .sort((x, y) => exInfo(x).name.localeCompare(exInfo(y).name, "ru"));
  const mus = id => (exInfo(id).prim || []).map(m => MUS_NAME[m] || m).join(", ");
  const tip1 = id => { const t = String(exInfo(id).tip || ""); const i = t.indexOf(". "); return i > 0 ? t.slice(0, i + 1) : t; };
  const row = (id, full) => '<button class="row" data-id="' + esc(id) + '"><div class="grow"><div class="ttl">' + esc(exInfo(id).name) + '</div><div class="sub">' +
    (id === orig && orig !== ex.id ? "вернуть исходное · " : "") + esc(mus(id)) + (cur.has(id) && id !== orig ? " · уже есть сегодня" : "") + "</div>" +
    (full && tip1(id) ? '<div class="sub">' + esc(tip1(id)) + "</div>" : "") + "</div>" + I.chevR.replace("<svg", '<svg class="chev"') + "</button>";
  const allHTML = '<div class="sec-h"><h2>Все упражнения</h2></div><div class="list">' + all.map(id => row(id, false)).join("") + "</div>";
  openSheet('<div class="sh-top"><h2>Заменить на…</h2><button class="icon-btn" data-close>' + I.x + '</button></div>' +
    (rec.length
      ? '<p class="muted small" style="margin-bottom:10px">Тренажёр занят — замены на те же мышцы. Подходы и повторы останутся из плана.</p><div class="list">' + rec.map(id => row(id, true)).join("") + "</div>" +
        '<button class="btn sec" id="rpAll" style="margin-top:14px">Показать все упражнения</button><div id="rpAllList" hidden>' + allHTML + "</div>"
      : '<p class="muted small" style="margin-bottom:10px">Для этого упражнения нет готовых замен — выбери из списка. Подходы и повторы останутся из плана.</p>' + allHTML),
    sh => { $("[data-close]", sh).addEventListener("click", () => closeSheet());
      const btn = $("#rpAll", sh); if (btn) btn.addEventListener("click", () => { $("#rpAllList", sh).hidden = false; btn.remove(); });
      $$("[data-id]", sh).forEach(b => b.addEventListener("click", () => { const to = b.dataset.id;
        SES.replaced = (SES.replaced || []).filter(r => r.from !== orig);
        if (to === orig) { delete ex.replacedFrom; } else { SES.replaced.push({ from: orig, to }); ex.replacedFrom = orig; }
        ex.id = to; ex.sets = []; ED.idx = null; ED.init = false; ED.hint = null; MEDIA.lastKey = null; saveSes(true); closeSheet();
        toast((to === orig ? "Вернул: " : "Заменено: ") + exInfo(to).name); })); });
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

