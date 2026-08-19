/* house365 物件官網前端（零外部依賴；listing_render.py write_assets 複製到 /assets/listing.js）
   lightbox()／loan()／loanTool()／videoLite()／filterIndex()／homeSearch()；沒有 JS 頁面照樣可讀。 */
(function () {
  'use strict';
  var BASE = (document.body.getAttribute('data-base') || '').replace(/\/$/, '');
  var NOPHOTO = BASE + '/assets/no-photo.svg';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

  /* ── lightbox：主圖／縮圖／看全部／格局圖 → 遮罩，←→、Esc、swipe、計數 ── */
  function lightbox() {
    var g = $('.gallery'); if (!g) return;
    var photos = []; try { photos = JSON.parse(g.getAttribute('data-photos') || '[]'); } catch (e) {}
    var main = $('.main img', g), lb = null, cur = 0, list = photos;
    function open(i, arr) {
      list = arr || photos; if (!list.length) return; cur = i;
      lb = document.createElement('div'); lb.className = 'lb';
      lb.innerHTML = '<img alt=""><button class="x" aria-label="關閉">×</button>' +
        (list.length > 1 ? '<button class="p" aria-label="上一張">‹</button><button class="n" aria-label="下一張">›</button>' : '') +
        '<div class="c"></div>';
      document.body.appendChild(lb); document.body.style.overflow = 'hidden'; show();
      lb.addEventListener('click', function (e) {
        var t = e.target;
        if (t.classList.contains('p')) step(-1); else if (t.classList.contains('n')) step(1);
        else if (t.classList.contains('x') || t === lb) close();
      });
      var sx = 0;
      lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      });
      document.addEventListener('keydown', key);
    }
    function key(e) { if (!lb) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); }
    function step(d) { cur = (cur + d + list.length) % list.length; show(); }
    function show() {
      var im = $('img', lb); im.src = list[cur]; im.onerror = function () { this.onerror = null; this.src = NOPHOTO; };
      $('.c', lb).textContent = (cur + 1) + ' / ' + list.length;
    }
    function close() { if (!lb) return; document.body.removeChild(lb); lb = null; document.body.style.overflow = ''; document.removeEventListener('keydown', key); }
    if (main) main.addEventListener('click', function () { open(+(main.getAttribute('data-i') || 0)); });
    $$('.thumbs button', g).forEach(function (b, i) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-i');
        if (main && photos[idx]) { main.src = photos[idx]; main.setAttribute('data-i', idx); }
        $$('.thumbs button', g).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
      });
    });
    var all = $('.count', g); if (all) all.addEventListener('click', function (e) { e.stopPropagation(); open(0); });
    var lay = $('[data-lb-single]', g); if (lay) lay.addEventListener('click', function (e) { e.preventDefault(); open(0, [lay.getAttribute('data-lb-single')]); });
  }

  /* ── 貸款月付試算：M = P·r / (1 − (1+r)^−n) ── */
  function loan() {
    var f = $('form.loan[data-price]'); if (!f) return;
    var price = +f.getAttribute('data-price') || 0;   // 萬
    function calc() {
      var ltv = +f.ltv.value || 0, rate = +f.rate.value || 0, yrs = +f.years.value || 0;
      var P = price * 10000 * ltv / 100, r = rate / 100 / 12, n = yrs * 12, m;
      if (!P || !n) { m = 0; } else if (!r) { m = P / n; } else { m = P * r / (1 - Math.pow(1 + r, -n)); }
      $('.m', f).textContent = fmt(m); $('.pv', f).textContent = fmt(P / 10000);
    }
    $$('input', f).forEach(function (i) { i.addEventListener('input', calc); });
    f.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
    calc();
  }

  /* ── 獨立試算頁 /tools/loan/：多一格「房價」，另算自備款與總利息（公式同 loan()） ── */
  function loanTool() {
    var f = document.getElementById('loan-tool'); if (!f) return;
    function calc() {
      var pw = +f.price.value || 0, ltv = +f.ltv.value || 0, rate = +f.rate.value || 0, yrs = +f.years.value || 0;
      var P = pw * 10000 * ltv / 100, r = rate / 100 / 12, n = Math.round(yrs * 12), m;
      if (!P || !n) { m = 0; } else if (!r) { m = P / n; } else { m = P * r / (1 - Math.pow(1 + r, -n)); }
      $('.m', f).textContent = fmt(m);
      $('.pv', f).textContent = fmt(P / 10000);
      $('.dp', f).textContent = fmt(pw - P / 10000);
      $('.ti', f).textContent = fmt((m * n - P) / 10000);
    }
    $$('input', f).forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); });
    calc();
  }

  /* ── YouTube lite：先顯示縮圖，點擊才載入 youtube-nocookie iframe ── */
  function videoLite() {
    $$('.yt[data-id]').forEach(function (box) {
      box.addEventListener('click', function () {
        var id = box.getAttribute('data-id'); if (!/^[\w-]{6,20}$/.test(id)) return;
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
        box.innerHTML = ''; box.appendChild(f);
      }, { once: true });
    });
  }

  /* ── 卡片（找房頁 JS 渲染；與 listing_render.card_html 同形） ── */
  function card(it) {
    var cover = it.ph || NOPHOTO, ref = /hbhousing\.com\.tw/.test(cover) ? ' referrerpolicy="no-referrer"' : '';
    var meta = [it.a, it.tl, it.r ? it.r + '房' : '', it.pg ? it.pg + '坪' : ''].filter(Boolean).join('｜');
    return '<a class="card" href="' + BASE + '/listing/' + esc(String(it.c).toLowerCase()) + '.html">' +
      '<div class="ph"><img src="' + esc(cover) + '" alt="' + esc(it.n) + '" loading="lazy" decoding="async"' + ref +
      ' onerror="this.onerror=null;this.src=\'' + NOPHOTO + '\'"></div>' +
      '<div class="bd"><span class="nm">' + esc(it.n) + '</span><div class="mt">' + esc(meta) + '</div>' +
      '<div class="pr">' + (it.p ? fmt(it.p) + ' 萬' : '價格洽詢') + (it.u ? '<small>' + it.u + ' 萬/坪</small>' : '') + '</div></div></a>';
  }

  /* ── 找房頁：fetch index.json、依 hash 篩選/排序、渲染、select→hash ──
     ・縣市→區域兩層下拉，選項與件數都由 index.json 實際資料算出來（件數多→少）
     ・網址沒帶任何條件 → 自動套 #filters 的 data-city／data-area（預設台北市大安區）
     ・#all=1 ＝看全部（清掉所有條件）；把條件全部選成「不限」也會回到 #all=1 */
  var KEYS = ['city', 'area', 'type', 'rooms', 'pmin', 'pmax', 'mrt', 'sort'];
  function filterIndex() {
    var box = $('#cards'); if (!box) return;
    var form = $('#filters'), now = $('#nowtext'), data = null;
    var dCity = form ? (form.getAttribute('data-city') || '') : '';
    var dArea = form ? (form.getAttribute('data-area') || '') : '';
    var zipCity = {}, areaRows = [];
    function parse() {
      var o = {}; location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
        if (!kv) return; var p = kv.split('='); o[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      }); return o;
    }
    function hashOf(q) {
      return KEYS.filter(function (k) { return q[k]; })
        .map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    }
    function buildCities() {
      var cn = {}, an = {};
      data.items.forEach(function (it) {
        var c = it.ct || '';
        if (c) cn[c] = (cn[c] || 0) + 1;
        if (!it.z) return;
        zipCity[it.z] = c;
        if (!an[it.z]) an[it.z] = { z: String(it.z), c: c, a: it.a || String(it.z), n: 0 };
        an[it.z].n++;
      });
      areaRows = Object.keys(an).map(function (k) { return an[k]; }).sort(function (a, b) { return b.n - a.n; });
      if (!form || !form.city) return;
      form.city.innerHTML = '<option value="">全部縣市</option>' + Object.keys(cn)
        .sort(function (a, b) { return cn[b] - cn[a]; })
        .map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '（' + fmt(cn[c]) + '）</option>'; }).join('');
    }
    function buildAreas(city) {   // 區域下拉只留該縣市的區
      if (!form || !form.area) return;
      form.area.innerHTML = '<option value="">全部區域</option>' + areaRows
        .filter(function (r) { return !city || r.c === city; })
        .map(function (r) { return '<option value="' + esc(r.z) + '">' + esc(r.a) + '（' + fmt(r.n) + '）</option>'; }).join('');
    }
    function label(q, city) {     // 「目前顯示：台北市 大安區．295 件」那行
      var t = [city || '全部縣市'];
      ['area', 'type', 'rooms', 'mrt'].forEach(function (k) {
        var s = form && form[k]; if (!s || !s.value) return;
        var o = s.options[s.selectedIndex]; if (o) t.push(o.text.replace(/（[\d,]+）$/, ''));
      });
      if (q.pmin || q.pmax) t.push((q.pmin ? fmt(+q.pmin) + ' 萬' : '0') + '～' + (q.pmax ? fmt(+q.pmax) + ' 萬' : '不限'));
      return t.join(' ');
    }
    function apply() {
      if (!data) return;
      var q = parse();
      if (!location.hash.replace(/^#/, '') && (dCity || dArea)) {    // 沒帶條件 → 套預設，並寫進網址（可分享）
        q = { city: dCity, area: dArea };
        if (history.replaceState) history.replaceState(null, '', '#' + hashOf(q));
      }
      var city = q.city || (q.area ? zipCity[q.area] || '' : '');
      buildAreas(city);
      if (form) {
        KEYS.forEach(function (k) { if (form[k]) form[k].value = (k === 'city' ? city : q[k]) || ''; });
        if (form.sort) form.sort.value = q.sort || 'new';
      }
      var rows = data.items.filter(function (it) {
        if (q.city && it.ct !== q.city) return false;
        if (q.area && String(it.z) !== q.area) return false;
        if (q.type && it.t !== q.type) return false;
        if (q.rooms) { var r = +it.r || 0; if (q.rooms === '4' ? r < 4 : r !== +q.rooms) return false; }
        if (q.pmin && !(it.p >= +q.pmin)) return false;
        if (q.pmax && !(it.p <= +q.pmax)) return false;
        if (q.mrt && it.ms !== q.mrt) return false;
        return true;
      });
      var s = q.sort || 'new';
      rows.sort(function (a, b) {
        if (s === 'plow') return (a.p || 1e12) - (b.p || 1e12);
        if (s === 'phigh') return (b.p || 0) - (a.p || 0);
        if (s === 'ulow') return (a.u || 1e12) - (b.u || 1e12);
        if (s === 'big') return (b.pg || 0) - (a.pg || 0);
        return (b.d || '') > (a.d || '') ? 1 : (b.d || '') < (a.d || '') ? -1 : 0;
      });
      var PAGE = 60, shown = Math.min(rows.length, PAGE);
      function draw() {
        box.innerHTML = (rows.slice(0, shown).map(card).join('') || '<p class="note">沒有符合條件的物件，換個條件試試，或直接 LINE 我們幫你找。</p>')
          + (shown < rows.length ? '<p class="more"><button type="button" class="btn-o" id="more">載入更多（還有 ' + (rows.length - shown) + ' 件）</button></p>' : '');
        var mb = document.getElementById('more');
        if (mb) mb.addEventListener('click', function () { shown = Math.min(rows.length, shown + PAGE); draw(); });
      }
      draw();
      if (now) now.textContent = '目前顯示：' + label(q, city) + '．' + fmt(rows.length) + ' 件';
    }
    if (form) form.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'city' && form.area) form.area.value = '';   // 換縣市 → 區域重選
      var q = {};
      KEYS.forEach(function (k) { if (form[k] && form[k].value) q[k] = form[k].value; });
      if (q.sort === 'new') delete q.sort;
      location.hash = hashOf(q) || 'all=1';        // 全部「不限」＝看全部，不要掉回預設
    });
    var sa = $('#showall');
    if (sa) sa.addEventListener('click', function (e) {
      e.preventDefault();
      if (location.hash.replace(/^#/, '') === 'all=1') apply(); else location.hash = 'all=1';
    });
    window.addEventListener('hashchange', apply);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + '/listing/index.json', true);
    xhr.onload = function () {
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = { items: [] }; }
      buildCities();
      apply();
    };
    xhr.onerror = function () { box.innerHTML = '<p class="note">物件清單載入失敗，請重新整理。</p>'; };
    xhr.send();
  }

  /* ── 首頁搜尋表單 → 組 hash 導向 /listing/#… ── */
  function homeSearch() {
    var f = $('#home-search'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var parts = [];
      ['area', 'type', 'pmin', 'pmax'].forEach(function (k) { if (f[k] && f[k].value) parts.push(k + '=' + encodeURIComponent(f[k].value)); });
      // 什麼都沒選＝我要看全部，不要掉進找房頁的預設（台北市大安區）
      location.href = BASE + '/listing/#' + (parts.length ? parts.join('&') : 'all=1');
    });
  }

  /* ── 右下角浮動 LINE 圓鈕：捲一段才淡入，一開始不擋內容 ── */
  function fab() {
    var b = $('.fab-line'); if (!b) return;
    function t() { b.classList[(window.pageYOffset || document.documentElement.scrollTop) > 300 ? 'add' : 'remove']('on'); }
    window.addEventListener('scroll', t, { passive: true });
    t();
  }

  function init() { lightbox(); loan(); loanTool(); videoLite(); filterIndex(); homeSearch(); fab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
