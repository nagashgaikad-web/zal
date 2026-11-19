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
    if (allTop && !exInfo(ex.id).assist) { ex.suggest = (st.w || 0) + stepFor(ex.id); hint = { k: "ac", t: shortName(ex.id) + ": все подходы на верхней границе — в следующий раз можно " + fmtW(ex.suggest) + " кг. Тренер подтвердит при разборе." }; }
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
    if (first >= 0) { const h = ED.hint; setCur(b, first); ED.hint = h; startRest(Math.max(...blk.exs.map(x => restFor(x.id))), "Круг суперсета готов", "round"); return; }
  } else if (ex.sets.length < ex.plan.sets) { startRest(restFor(ex.id), "Подход " + ex.sets.length + " из " + ex.plan.sets + " готов", "set"); return; }
  // упражнение (блок) завершено
  const nx = nextOpen(b, SES.cur.e);
  if (!nx) { stopRest(); SES.allDone = true; toast("Все упражнения сделаны 💪", "ac", 3000); return; }
  const h = ED.hint; setCur(nx.bi, nx.ei); ED.hint = h; startRest(CFG.restEx || restFor(ex.id), blk.ss ? "Суперсет готов" : "Упражнение готово", "ex");
}

/* ---------------- таймер отдыха ---------------- */
let restTick = 0;
/* kind: set — между подходами, round — между кругами суперсета, ex — переход к следующему упражнению */
const REST_KIND = {
  set: { title: "Отдых между подходами", over: "Время! Следующий подход", chip: "Подходы", next: "Следующий подход" },
  round: { title: "Отдых между кругами", over: "Время! Следующий круг", chip: "Круг", next: "Следующий круг суперсета" },
  ex: { title: "Переход к упражнению", over: "Время! Следующее упражнение", chip: "Упражнение", next: "Следующее упражнение" }
};
const restKind = R => REST_KIND[R && R.kind] || REST_KIND.set;
function startRest(sec, label, kind) {
  SES.rest = { start: Date.now(), total: sec, endsAt: Date.now() + sec * 1000, label: label || "Отдых", kind: kind || "set", fired: false, mini: false };
  LS.set("active", SES); runRestTick();
}
function stopRest() { if (SES) { SES.rest = null; LS.set("active", SES); } clearInterval(restTick); restTick = 0; const r = $("#rest"); if (r) r.remove(); }
function runRestTick() { clearInterval(restTick); restTick = setInterval(updRest, 250); updRest(true); }
function updRest(build) {
  if (!SES || !SES.rest || VIEW.name !== "workout") { clearInterval(restTick); restTick = 0; return; }
  const R = SES.rest; const left = (R.endsAt - Date.now()) / 1000; const over = left <= 0;
  let el = $("#rest");
  if (!el || build === true) { if (el) el.remove(); el = document.createElement("div"); el.id = "rest"; el.className = "rest"; document.body.appendChild(el); el.innerHTML = restHTML(); bindRest(el); }
  el.classList.toggle("mini", !!R.mini); el.classList.toggle("over", over); el.classList.toggle("kx", R.kind === "ex");
  const C = 2 * Math.PI * 88, frac = over ? 1 : 1 - left / R.total;
  const fg = $(".fgc", el); if (fg) fg.style.strokeDashoffset = String(C * (1 - frac));
  const t = over ? "+" + mmss(-left) : mmss(left);
  $$(".rt", el).forEach(x => x.textContent = t);
  const bar = $(".minic .bar i", el); if (bar) bar.style.width = (frac * 100).toFixed(1) + "%";
  const lab = $(".rlab", el); if (lab) lab.textContent = over ? restKind(R).over : restKind(R).title;
  if (over && !R.fired) { R.fired = true; LS.set("active", SES); beep(); haptic(3); const f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f); setTimeout(() => f.remove(), 1300); if (R.mini) { R.mini = false; el.classList.remove("mini"); } }
  if (over && -left > 600) stopRest(); // забытый таймер
}
function restHTML() {
  const ex = curEx(), K = restKind(SES.rest); const nxt = ex.cardio ? exInfo(ex.id).name : (SES.rest.kind !== "ex" && ex.sets.length < ex.plan.sets ? "Подход " + (ex.sets.length + 1) + " · " + exInfo(ex.id).name : exInfo(ex.id).name);
  const g = !ex.cardio ? suggestFor(ex, ex.sets.length) : null;
  const C = 2 * Math.PI * 88;
  return '<div class="panel"><div class="full"><div class="top2"><b class="rlab">' + esc(K.title) + '</b><button class="icon-btn" id="rMin" aria-label="Свернуть">' + I.chevD + "</button></div>" +
    '<div class="ring-wrap"><svg viewBox="0 0 200 200"><circle class="bgc" cx="100" cy="100" r="88" fill="none" stroke-width="12"/><circle class="fgc" cx="100" cy="100" r="88" fill="none" stroke-width="12" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg><div class="c"><span class="num rt">0:00</span><small>' + esc(SES.rest.label) + "</small></div></div>" +
    '<div class="rest-ctl"><button class="btn sec num" data-add="-15">−15</button><button class="btn sec num" data-add="30">+30</button><button class="btn pri" id="rSkip">Дальше</button></div>' +
    '<div class="next">' + esc(K.next) + '<b>' + esc(nxt) + "</b>" + (g && g.w !== "" ? '<span class="num">' + fmtW(g.w) + " кг × " + g.r + "</span>" : "") + "</div></div>" +
    '<button class="minic" id="rMax"><span class="num rt">0:00</span><span class="bar"><i></i></span><span class="chip cy">' + esc(K.chip) + '</span></button></div>';
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

