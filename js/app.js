/* Зал — загрузчик. Код приложения лежит частями в js/app/ (так его проще обновлять по одной части).
   Части склеиваются по порядку в один скрипт — ровно как раньше был один файл app.js. */
(() => {
  const V = "5";
  const PARTS = ["1-core", "2-home", "3-editor-rest", "4-workout", "5-finish-history", "6-settings-start"];
  const fail = e => {
    console.error("zal loader", e);
    const a = document.getElementById("app");
    if (a) a.innerHTML = '<main class="view"><h1 class="lt">Зал</h1><p class="muted">Не удалось загрузить приложение. Проверь связь и открой его ещё раз.</p></main>';
  };
  Promise.all(PARTS.map(p => fetch("js/app/" + p + ".js?v=" + V).then(r => { if (!r.ok) throw new Error(p + ": HTTP " + r.status); return r.text(); })))
    .then(txt => { const s = document.createElement("script"); s.textContent = txt.join("") + "\n//# sourceURL=zal-app.js"; document.body.appendChild(s); })
    .catch(fail);
})();
