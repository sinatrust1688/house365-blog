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

    /* 直式照片：整張放進去（CSS 的 .tall → object-fit:contain），左右用同一張照片模糊當底。
       只有主圖這樣，卡片維持裁切。每次換主圖都要重跑，不然換到直式照片還是被切。 */
    function fitMain() {
      if (!main) return;
      var box = main.parentNode;
      var apply = function () {
        var tall = main.naturalWidth && main.naturalHeight > main.naturalWidth * 1.02;
        box.classList.toggle('tall', !!tall);
        var src = main.currentSrc || main.src;
        box.style.setProperty('--bgimg', tall ? 'url("' + src.replace(/"/g, '%22') + '")' : 'none');
      };
      if (main.complete && main.naturalWidth) apply();
      main.addEventListener('load', apply);
    }
    fitMain();

    $$('.thumbs button', g).forEach(function (b, i) {
      b.addEventListener('click', function () {
        // 最後一顆「+N 張」是開燈箱，不是換主圖（原本沿用換主圖的事件，點下去什麼也沒發生）
        if (b.classList.contains('more')) { open(+(b.getAttribute('data-i') || 0)); return; }
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

  /* ── 卡片（找房頁／地圖頁 JS 渲染；與 listing_render.card_html 同形） ── */
  function card(it) {
    // ⚠️ 住商圖床看 Referer 給圖：不帶來源只給 383×287 縮圖，帶來源才給 738×553 原圖。
    //    不可以改回 no-referrer（見 listing_render._img 的說明）。
    var cover = it.ph || NOPHOTO, ref = /hbhousing\.com\.tw/.test(cover) ? ' referrerpolicy="origin"' : '';
    var meta = [it.a, it.tl, it.r ? it.r + '房' : '', it.pg ? it.pg + '坪' : ''].filter(Boolean).join('｜');
    // 第三層：樓層・屋齡（和 listing_render.card_html 的 meta2 同一套，改一邊就要改另一邊）
    var meta2 = [it.f || '', it.y ? it.y + ' 年' : ''].filter(Boolean).join('・');
    // 照片角標：左上「新上架」（nw＝委託起日 ≤14 天）、左下捷運站
    var tags = (it.nw ? '<span class="tg new">新上架</span>' : '') +
               (it.m ? '<span class="tg mrt">' + esc(it.m) + '站</span>' : '');
    return '<a class="card" href="' + BASE + '/listing/' + esc(String(it.c).toLowerCase()) + '.html">' +
      '<div class="ph"><img src="' + esc(cover) + '" alt="' + esc(it.n) + '" loading="lazy" decoding="async"' + ref +
      ' onerror="this.onerror=null;this.src=\'' + NOPHOTO + '\'">' + tags + '</div>' +
      '<div class="bd"><span class="nm">' + esc(it.n) + '</span><div class="mt">' + esc(meta) + '</div>' +
      (meta2 ? '<div class="mt2">' + esc(meta2) + '</div>' : '') +
      '<div class="pr">' + (it.p ? fmt(it.p) + ' 萬' : '價格洽詢') + (it.u ? '<small>' + it.u + ' 萬/坪</small>' : '') + '</div></div></a>';
  }

  /* ══ 篩選條件：網址 hash ⇄ 物件 ══════════════════════════════
     ・單選：city／pmin／pmax／mrt／sort　・複選（逗號串）：area／type／rooms
     ・舊連結（#area=106、#type=building、#mrt=daan）照樣通——逗號串只是多一個值 */
  var KEYS = ['city', 'area', 'type', 'rooms', 'pmin', 'pmax', 'mrt', 'sort'];
  var MULTI = { area: 1, type: 1, rooms: 1 };
  var INDEX = null, INDEX_CBS = [];

  function parseHash() {
    var o = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('='), k = decodeURIComponent(p[0]), v = decodeURIComponent(p[1] || '');
      if (!v) return;
      o[k] = MULTI[k] ? v.split(',').filter(Boolean) : v;
    });
    return o;
  }
  function hashOf(q) {
    return KEYS.filter(function (k) { return MULTI[k] ? (q[k] && q[k].length) : q[k]; })
      .map(function (k) { return k + '=' + encodeURIComponent(MULTI[k] ? q[k].join(',') : q[k]); }).join('&');
  }
  function matches(q) {
    return function (it) {
      if (q.city && it.ct !== q.city) return false;
      if (q.area && q.area.length && q.area.indexOf(String(it.z)) < 0) return false;
      if (q.type && q.type.length && q.type.indexOf(it.t) < 0) return false;
      if (q.rooms && q.rooms.length) {
        var r = +it.r || 0, hit = q.rooms.some(function (x) { return x === '4' ? r >= 4 : r === +x; });
        if (!hit) return false;
      }
      if (q.pmin && !(it.p >= +q.pmin)) return false;
      if (q.pmax && !(it.p <= +q.pmax)) return false;
      if (q.mrt && it.ms !== q.mrt) return false;
      return true;
    };
  }
  function sortRows(rows, s) {
    return rows.sort(function (a, b) {
      if (s === 'plow') return (a.p || 1e12) - (b.p || 1e12);
      if (s === 'phigh') return (b.p || 0) - (a.p || 0);
      if (s === 'ulow') return (a.u || 1e12) - (b.u || 1e12);
      if (s === 'big') return (b.pg || 0) - (a.pg || 0);
      // 「最新上架」：先看 nw（委託起日 ≤14 天，這才是真的新），同組再看 d（本站第一次看到的日子）。
      // 只用 d 排不行——本站 2026-08-18 上線，1,614 件裡有 1,577 件的 d 都是那一天，等於沒排。
      if ((b.nw || 0) !== (a.nw || 0)) return (b.nw || 0) - (a.nw || 0);
      return (b.d || '') > (a.d || '') ? 1 : (b.d || '') < (a.d || '') ? -1 : 0;
    });
  }
  /* index.json 只抓一次，找房頁與地圖頁共用 */
  function loadIndex(cb) {
    if (INDEX) { cb(INDEX); return; }
    INDEX_CBS.push(cb);
    if (INDEX_CBS.length > 1) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + '/listing/index.json', true);
    xhr.onload = function () {
      try { INDEX = JSON.parse(xhr.responseText); } catch (e) { INDEX = { items: [] }; }
      INDEX_CBS.splice(0).forEach(function (f) { f(INDEX); });
    };
    xhr.onerror = function () { INDEX = { items: [] }; INDEX_CBS.splice(0).forEach(function (f) { f(INDEX); }); };
    xhr.send();
  }

  /* ══ 信義式下拉面板（區域／類型／總價／格局／更多）══════════════
     每顆鈕一個 .pick：按鈕開關 .pk-pop，面板內是 checkbox／快選帶／select。
     面板只改 DOM，不改網址；按「確定」或「搜尋」才寫 location.hash（＝才會重新篩選）。 */
  function picker(form, onApply) {
    var picks = $$('.pick', form);
    var selCity = form.getAttribute('data-city') || '';

    function close(p) { var pop = $('.pk-pop', p); if (pop) { pop.hidden = true; $('.pk-btn', p).setAttribute('aria-expanded', 'false'); } }
    function closeAll(except) { picks.forEach(function (p) { if (p !== except) close(p); }); }
    function open(p) {
      closeAll(p);
      var pop = $('.pk-pop', p), btn = $('.pk-btn', p);
      var willOpen = pop.hidden;
      pop.hidden = !willOpen; btn.setAttribute('aria-expanded', String(willOpen));
    }

    /* 區域面板：左欄縣市單選 → 右欄只顯示該縣市的區 */
    function showCity(c) {
      selCity = c || '';
      $$('.pk-col.cities .ct', form).forEach(function (b) {
        b.classList.toggle('on', (b.getAttribute('data-city') || '') === selCity);
      });
      $$('.pk-col.areas .ck', form).forEach(function (l) {
        var hit = selCity && l.getAttribute('data-city') === selCity;
        l.classList.toggle('hide', !hit);
        if (!hit) { var i = $('input', l); if (i) i.checked = false; }
      });
      syncAllBox();
    }
    function syncAllBox() {   // 「全區」＝該縣市底下一個區都沒勾
      $$('.pk-col.areas .ck.all input', form).forEach(function (i) {
        var c = i.parentNode.getAttribute('data-city');
        var any = $$('.pk-col.areas .ck:not(.all)[data-city="' + c + '"] input:checked', form).length;
        i.checked = !any;
      });
    }
    $$('.pk-col.cities .ct', form).forEach(function (b) {
      b.addEventListener('click', function () { showCity(b.getAttribute('data-city') || ''); });
    });
    $$('.pk-col.areas input', form).forEach(function (i) {
      i.addEventListener('change', function () {
        if (i.hasAttribute('data-all')) {         // 勾「全區」→ 清掉該縣市所有單區
          var c = i.parentNode.getAttribute('data-city');
          $$('.pk-col.areas .ck:not(.all)[data-city="' + c + '"] input', form).forEach(function (x) { x.checked = false; });
          i.checked = true;
        }
        syncAllBox(); labels();
      });
    });

    /* 總價：快選帶 ⇄ 自訂區間（互相同步，看得到自己選了什麼） */
    $$('.pk-bands .bd', form).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.pk-bands .bd', form).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        form.pmin.value = b.getAttribute('data-min') || '';
        form.pmax.value = b.getAttribute('data-max') || '';
        labels();
      });
    });
    ['pmin', 'pmax'].forEach(function (k) {
      if (!form[k]) return;
      form[k].addEventListener('input', function () { syncBands(); labels(); });
    });
    function syncBands() {
      var lo = form.pmin ? form.pmin.value : '', hi = form.pmax ? form.pmax.value : '';
      var found = false;
      $$('.pk-bands .bd', form).forEach(function (b) {
        var on = (b.getAttribute('data-min') || '') === lo && (b.getAttribute('data-max') || '') === hi;
        b.classList.toggle('on', on); if (on) found = true;
      });
      if (!found) $$('.pk-bands .bd', form).forEach(function (b) { b.classList.remove('on'); });
    }

    $$('.pick .pk-pop select, .pick .pk-rows input', form).forEach(function (el) {
      el.addEventListener('change', labels);
    });

    /* 鈕上的字：選了什麼就寫什麼（信義那樣），沒選就是「不限…」 */
    function checked(name) {
      return $$('.pk-rows input[name="' + name + '"]:checked, .pk-col.areas input[name="' + name + '"]:checked', form)
        .map(function (i) { return $('span', i.parentNode).textContent; });
    }
    function txt(list, none, one) {
      if (!list.length) return none;
      return list.length === 1 ? (one ? one(list[0]) : list[0]) : list[0] + ' 等 ' + list.length + ' 項';
    }
    function labels() {
      var lb = function (k) { var p = $('.pick[data-pick="' + k + '"] [data-lb]', form); return p; };
      var a = checked('area');
      lb('area').textContent = selCity ? (selCity + '・' + (a.length ? txt(a) : '全區')) : '全部縣市';
      lb('type').textContent = txt(checked('type'), '不限類型');
      lb('rooms').textContent = txt(checked('rooms'), '不限格局');
      var lo = form.pmin ? form.pmin.value : '', hi = form.pmax ? form.pmax.value : '';
      lb('price').textContent = (!lo && !hi) ? '不限總價'
        : (lo ? fmt(+lo) : '0') + '～' + (hi ? fmt(+hi) + ' 萬' : '不限');
      var extra = (form.mrt && form.mrt.value ? 1 : 0) + (form.sort && form.sort.value && form.sort.value !== 'new' ? 1 : 0);
      lb('more').textContent = extra ? '更多（' + extra + '）' : '更多';
    }

    picks.forEach(function (p) {
      $('.pk-btn', p).addEventListener('click', function (e) { e.stopPropagation(); open(p); });
      var pop = $('.pk-pop', p);
      pop.addEventListener('click', function (e) { e.stopPropagation(); });
      var done = $('[data-done]', pop), clr = $('[data-clear]', pop);
      if (done) done.addEventListener('click', function () { close(p); commit(); });
      if (clr) clr.addEventListener('click', function () {
        $$('input[type=checkbox]', pop).forEach(function (i) { i.checked = false; });
        $$('input[type=number]', pop).forEach(function (i) { i.value = ''; });
        $$('select', pop).forEach(function (s) { s.value = s.name === 'sort' ? 'new' : ''; });
        if (p.getAttribute('data-pick') === 'area') { showCity(''); }
        syncBands(); syncAllBox(); labels();
      });
    });
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });

    function read() {          // DOM → 條件物件
      var q = {};
      if (selCity) q.city = selCity;
      ['area', 'type', 'rooms'].forEach(function (k) {
        var v = $$('input[name="' + k + '"]:checked', form)
          .map(function (i) { return i.value; }).filter(Boolean);
        if (v.length) q[k] = v;
      });
      if (form.pmin && form.pmin.value) q.pmin = form.pmin.value;
      if (form.pmax && form.pmax.value) q.pmax = form.pmax.value;
      if (form.mrt && form.mrt.value) q.mrt = form.mrt.value;
      if (form.sort && form.sort.value && form.sort.value !== 'new') q.sort = form.sort.value;
      return q;
    }
    function write(q) {        // 條件物件 → DOM
      showCity(q.city || '');
      $$('input[type=checkbox]', form).forEach(function (i) { if (!i.hasAttribute('data-all')) i.checked = false; });
      ['area', 'type', 'rooms'].forEach(function (k) {
        (q[k] || []).forEach(function (v) {
          var i = form.querySelector('input[name="' + k + '"][value="' + v.replace(/"/g, '') + '"]');
          if (i) { i.checked = true; if (k === 'area') { var l = i.parentNode; l.classList.remove('hide'); } }
        });
      });
      if (form.pmin) form.pmin.value = q.pmin || '';
      if (form.pmax) form.pmax.value = q.pmax || '';
      if (form.mrt) form.mrt.value = q.mrt || '';
      if (form.sort) form.sort.value = q.sort || 'new';
      syncBands(); syncAllBox(); labels();
    }
    function commit() {
      var q = read(), h = hashOf(q);
      if (('#' + h) === location.hash || (!h && location.hash === '#all=1')) { onApply(); return; }
      location.hash = h || 'all=1';    // 條件全清＝看全部，不要掉回預設的台北市大安區
    }
    var go = document.getElementById('dosearch');
    if (go) go.addEventListener('click', function () { closeAll(null); commit(); });
    return { read: read, write: write, commit: commit, closeAll: closeAll };
  }

  /* ══ 找房頁：hash → 篩選 → 渲染卡片 ══════════════════════════ */
  function filterIndex() {
    var box = $('#cards'); if (!box) return;
    var form = $('#filters'), now = $('#nowtext');
    var dCity = form ? (form.getAttribute('data-city') || '') : '';
    var dArea = form ? (form.getAttribute('data-area') || '') : '';
    var pk = form ? picker(form, function () { apply(); }) : null;

    function apply() {
      if (!INDEX) return;
      var q = parseHash();
      if (!location.hash.replace(/^#/, '') && (dCity || dArea)) {   // 沒帶條件 → 套預設並寫進網址（可分享）
        q = { city: dCity, area: dArea ? [dArea] : [] };
        if (history.replaceState) history.replaceState(null, '', '#' + hashOf(q));
      }
      if (pk) pk.write(q);
      var rows = sortRows(INDEX.items.filter(matches(q)), q.sort || 'new');
      var PAGE = 60, shown = Math.min(rows.length, PAGE);
      function draw() {
        box.innerHTML = (rows.slice(0, shown).map(card).join('')
          || '<p class="note">沒有符合條件的物件，換個條件試試，或直接 LINE 我們幫你找。</p>')
          + (shown < rows.length ? '<p class="more"><button type="button" class="btn-o" id="more">載入更多（還有 ' + (rows.length - shown) + ' 件）</button></p>' : '');
        var mb = document.getElementById('more');
        if (mb) mb.addEventListener('click', function () { shown = Math.min(rows.length, shown + PAGE); draw(); });
      }
      draw();
      if (now) {
        var lb = $$('.pick [data-lb]', form).map(function (e) { return e.textContent; })
          .filter(function (t) { return t && t.indexOf('不限') !== 0 && t !== '更多'; });
        now.textContent = '目前顯示：' + (lb.join('｜') || '全部在售物件') + '．' + fmt(rows.length) + ' 件';
      }
    }
    var sa = $('#showall');
    if (sa) sa.addEventListener('click', function (e) {
      e.preventDefault();
      if (location.hash.replace(/^#/, '') === 'all=1') apply(); else location.hash = 'all=1';
    });
    window.addEventListener('hashchange', apply);
    loadIndex(function () { apply(); });
  }

  /* ══ 地圖找房：Leaflet（自架，非 CDN）＋國土測繪／OSM 圖磚 ═══════
     ・圖釘座標是四捨五入到小數第 3 位的約略位置（≈110 公尺），不是門牌
     ・同一格子裡多件 → 顯示件數泡泡，點下去放大；只剩 1 件 → 顯示價格泡泡
     ・右欄只列「目前畫面看得到」的物件（拖曳、縮放都會重算） */
  function mapView() {
    var lay = document.getElementById('maplay'); if (!lay || !window.L) return;
    var form = $('#filters'), box = document.getElementById('mapcards'), cnt = document.getElementById('mapcount');
    var c = (lay.getAttribute('data-center') || '25.036,121.545').split(',');
    var tiles = []; try { tiles = JSON.parse(lay.getAttribute('data-tiles') || '[]'); } catch (e) {}
    var map = L.map('map', { center: [+c[0], +c[1]], zoom: +(lay.getAttribute('data-zoom') || 13), zoomControl: true });
    var t0 = tiles[0] || {}, t1 = tiles[1];
    var layer = L.tileLayer(t0.url, { maxZoom: t0.max || 19, attribution: t0.attr || '' }).addTo(map);
    if (t1) {                       // 主圖磚掛掉自動換備援，客人不會看到一片灰
      var swapped = false;
      layer.on('tileerror', function () {
        if (swapped) return; swapped = true;
        map.removeLayer(layer);
        L.tileLayer(t1.url, { maxZoom: t1.max || 19, attribution: t1.attr || '' }).addTo(map);
      });
    }
    map.invalidateSize();          // 先量對容器大小，不然第一批圖磚只會蓋住畫面中間一小塊
    var pins = L.layerGroup().addTo(map), rows = [], fitted = false;
    var pk = form ? picker(form, function () { refilter(true); }) : null;

    function bubble(html, cls, ll, onclick) {
      var m = L.marker(ll, { icon: L.divIcon({ className: 'pinwrap', html: '<i class="' + cls + '">' + html + '</i>' }) });
      m.on('click', onclick);
      return m;
    }
    function draw() {
      pins.clearLayers();
      var z = map.getZoom(), b = map.getBounds();
      var vis = rows.filter(function (it) { return it.g && b.contains([it.g[0], it.g[1]]); });
      // 合併格子的邊長（度）：拉遠就變大，不然全台一次看時台北會擠成一坨疊在一起的泡泡
      var cell = z >= 17 ? 0.0008 : z >= 16 ? 0.0016 : z >= 15 ? 0.003 : z >= 14 ? 0.006
        : z >= 13 ? 0.012 : z >= 12 ? 0.03 : z >= 11 ? 0.06 : z >= 10 ? 0.12 : z >= 9 ? 0.25 : 0.6;
      var grid = {};
      vis.forEach(function (it) {
        var k = Math.round(it.g[0] / cell) + ':' + Math.round(it.g[1] / cell);
        (grid[k] = grid[k] || []).push(it);
      });
      Object.keys(grid).forEach(function (k) {
        var g = grid[k], ll = [g[0].g[0], g[0].g[1]];
        if (g.length === 1) {
          var it = g[0];
          pins.addLayer(bubble(it.p ? fmt(it.p) + '萬' : '洽詢', 'pin', ll, function () {
            L.popup({ className: 'mapop', maxWidth: 260, autoPanPadding: [20, 20] })
              .setLatLng(ll).setContent(card(it)).openOn(map);
          }));
        } else {
          var la = 0, lo = 0;
          g.forEach(function (x) { la += x.g[0]; lo += x.g[1]; });
          pins.addLayer(bubble(g.length + ' 件', 'pin n', [la / g.length, lo / g.length], function () {
            map.setView([la / g.length, lo / g.length], Math.min(map.getZoom() + 2, 18));
          }));
        }
      });
      var list = vis.slice(0, 60);
      box.innerHTML = list.map(card).join('') || '<p class="note">這個範圍內沒有物件，把地圖拉遠一點看看。</p>';
      cnt.textContent = '此範圍內 ' + fmt(vis.length) + ' 件' + (vis.length > list.length ? '（先列 60 件）' : '');
    }
    function refilter(recentre) {
      var q = parseHash();
      if (!location.hash.replace(/^#/, '') && form) {
        var dc = form.getAttribute('data-city') || '', da = form.getAttribute('data-area') || '';
        if (dc || da) {
          q = { city: dc, area: da ? [da] : [] };
          if (history.replaceState) history.replaceState(null, '', '#' + hashOf(q));
        }
      }
      if (pk) pk.write(q);
      rows = sortRows(INDEX.items.filter(matches(q)), q.sort || 'new').filter(function (it) { return it.g; });
      if (rows.length && (!fitted || recentre)) {
        fitted = true;
        map.fitBounds(rows.map(function (it) { return [it.g[0], it.g[1]]; }), { padding: [30, 30], maxZoom: 16 });
      }
      draw();
    }
    map.on('moveend zoomend', draw);
    window.addEventListener('hashchange', function () { refilter(true); });
    $$('.maptabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.maptabs button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        lay.setAttribute('data-view', b.getAttribute('data-tab'));
        if (b.getAttribute('data-tab') === 'map') setTimeout(function () { map.invalidateSize(); }, 50);
      });
    });
    loadIndex(function () { map.invalidateSize(); refilter(true); });
    window.addEventListener('load', function () { map.invalidateSize(); });
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

  function init() { lightbox(); loan(); loanTool(); videoLite(); filterIndex(); mapView(); homeSearch(); fab(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
