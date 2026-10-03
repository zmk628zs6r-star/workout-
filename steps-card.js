/* === Карточка "Шаги за неделю" — автономный скрипт ===
   Подключается из index.html, сам находит дашборд и вставляет карточку.
   ПЕРЕД ЗАГРУЗКОЙ НА GITHUB: замени ТВОЙ_SUBDOMAIN на свой адрес Worker'а! */

(function () {
  const API = 'https://workout-steps.ТВОЙ_SUBDOMAIN.workers.dev/api/steps';
  const STEP_KM = 0.000762; // средняя длина шага ~76 см

  function localDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmt(n) { return n.toLocaleString('ru-RU'); }

  function buildCard(data) {
    const today = new Date();
    const days = [];
    const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ label: WD[d.getDay() === 0 ? 6 : d.getDay() - 1], steps: data[localDate(d)] || 0 });
    }
    const week = days.reduce((s, d) => s + d.steps, 0);
    const km = (week * STEP_KM).toFixed(1);
    const avg = Math.round(week / 7);
    const max = Math.max.apply(null, days.map(function (d) { return d.steps; }).concat([1]));

    const el = document.createElement('section');
    el.id = 'steps-card-week';
    el.innerHTML =
      '<h2>Шаги <span class="wt-muted">&middot; 7 дней</span></h2>' +
      '<div class="wt-total">' + fmt(week) + ' <small>шагов</small> <span class="wt-muted">&asymp; ' + km + ' км</span></div>' +
      '<div class="wt-muted">в среднем ' + fmt(avg) + ' в день</div>' +
      '<div class="wt-bars">' + days.map(function (d) {
        return '<div class="wt-col"><div class="wt-bar" style="height:' + Math.round(d.steps / max * 100) + '%"></div><span>' + d.label + '</span></div>';
      }).join('') + '</div>';

    const style = document.createElement('style');
    style.textContent = [
      '#steps-card-week{padding:16px;margin:12px 0;border-radius:14px;background:#16161a;border:1px solid #26262c}',
      '#steps-card-week h2{margin:0 0 6px;font-size:15px}',
      '.wt-muted{opacity:.55;font-size:12px;font-weight:400}',
      '.wt-total{font-size:22px;font-weight:700;margin:2px 0}',
      '.wt-total small{font-size:13px;font-weight:400;opacity:.7}',
      '.wt-bars{display:flex;gap:6px;align-items:flex-end;height:72px;margin-top:12px}',
      '.wt-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}',
      '.wt-bar{width:100%;max-width:26px;background:#3a86ff;border-radius:4px;min-height:2px;opacity:.9}',
      '.wt-col span{font-size:10px;opacity:.5;margin-top:4px}'
    ].join('');
    el.appendChild(style);
    return el;
  }

  // Ищем на странице дашборд и вставляем карточку перед блоком "Последние достижения"
  function findAnchor(root) {
    const all = root.querySelectorAll('*');
    for (const node of all) {
      if (node.children.length === 0 && node.textContent && node.textContent.trim().startsWith('Последние достижения')) {
        let card = node;
        for (let i = 0; i < 5 && card.parentElement; i++) card = card.parentElement;
        return card;
      }
    }
    return null;
  }

  let tries = 0;
  async function attempt() {
    if (document.getElementById('steps-card-week')) return;
    if (++tries > 20) return; // ждём до ~40 секунд, потом сдаёмся
    const root = document.getElementById('root');
    if (!root) return setTimeout(attempt, 2000);

    const res = await fetch(API).catch(function () { return null; });
    if (!res || !res.ok) return setTimeout(attempt, 5000); // API ещё не готов — повторим
    const data = await res.json();
    if (!data || Object.keys(data).length === 0) return; // данных пока нет — карточку не показываем

    const cardEl = buildCard(data);
    const anchor = findAnchor(root);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(cardEl, anchor);
    else root.appendChild(cardEl);
  }

  attempt();
})();
