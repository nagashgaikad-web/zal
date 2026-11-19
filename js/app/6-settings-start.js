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
    '<div class="sec-h"><h2>Таймер отдыха</h2></div><div class="card"><div class="small muted" style="margin-bottom:8px">Между подходами — базовые</div>' + restSeg("restBase", [90, 120, 150, 180]) + '<div class="small muted" style="margin:14px 0 8px">Между подходами — изолирующие и суперсеты</div>' + restSeg("restIso", [60, 75, 90, 120]) + '<div class="small muted" style="margin:14px 0 8px">Между упражнениями</div>' + restSeg("restEx", [60, 90, 120, 150, 180]) + '<p class="help" style="margin-top:10px">Отдых между подходами — голубой таймер, переход к следующему упражнению — оранжевый.</p></div>' +
    '<div class="sec-h"><h2>Во время тренировки</h2></div><div class="list">' + tg("sound", "Звук в конце отдыха", "работает, пока экран включён") + tg("haptics", "Вибрация") + tg("awake", "Не гасить экран", "экран не заблокируется во время тренировки") + tg("treatment", "Правила на время лечения", "запас 2–3 повтора, подсказки по ГЭРП, счётчик до ЭГДС") + "</div>" +
    '<div class="sec-h"><h2>Тренер</h2></div><div class="card"><div class="ttl" style="font-weight:600">Разбор каждый день в ' + esc(COACH_TIME) + '</div><p class="help" style="margin:4px 0 0">по времени ноутбука (UTC−7), а не телефона</p><p class="help" style="margin:6px 0 0">Тренер разберёт все новые тренировки, обновит цели и Дневник. Чтобы поменять время, напиши в чате проекта «Зал»: «Разбор в 21:30».</p></div>' +
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
  return '<main class="onb"><img class="logo" src="icons/icon-180.png" alt=""><h1 class="lt">Зал</h1><p class="muted" style="font-size:17px;margin-top:8px">Записывай подходы прямо в зале. Тренер разберёт тренировку и пришлёт цели на следующий раз.</p>' +
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
