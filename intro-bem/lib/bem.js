/* =====================================================================
   Sinh điện từ: tiện ích dùng chung.
   Nạp file này TRƯỚC thẻ <script> của MathJax (để cấu hình có hiệu lực)
   và trước script riêng của từng trang.
   ===================================================================== */

/* ---------- cấu hình MathJax 3: \( ... \) inline, \[ ... \] display ---------- */
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'global' },
  options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'canvas'] },
};

const BEM = (() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = {
    ink: '#1B1920', paper: '#FBFCFD', mist: '#EEF6FA', line: '#DCE6EC', muted: '#59606B',
    sky: '#7bcde8', sea: '#3787c4', pos: '#d8312a', neg: '#3787c4', gold: '#f2c230',
  };

  /* Canvas sắc nét trên màn hình HiDPI. Gọi lại khi đổi kích thước.
     Trả về {ctx, W, H} với W, H tính bằng CSS px; ctx đã scale sẵn. */
  function fitCanvas(canvas, st) {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    st.W = r.width; st.H = r.height; st.dpr = dpr;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    st.ctx = canvas.getContext('2d');
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return st;
  }
  /* Theo dõi kích thước canvas, gọi onResize khi thay đổi. */
  function watchCanvas(canvas, st, onResize) {
    const go = () => { fitCanvas(canvas, st); onResize && onResize(); };
    new ResizeObserver(go).observe(canvas);
    go();
  }

  /* Định dạng số theo tiền tố SI: fmt(0.00123, 'A') -> "1,23 mA" (dấu phẩy thập phân kiểu Việt). */
  const PREFIX = [[1e18, 'E'], [1e15, 'P'], [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
  function num(v, digits = 3) {
    if (!isFinite(v)) return '—';
    let s = Number(v).toPrecision(digits);
    if (s.includes('e')) s = Number(s).toString();
    if (s.includes('.') && !s.includes('e')) s = s.replace(/\.?0+$/, '');
    return s.replace('.', ',').replace('-', '−');
  }
  function fmt(v, unit = '', digits = 3) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    for (const [f, p] of PREFIX) if (a >= f * 0.9995) return num(v / f, digits) + ' ' + p + unit;
    return sci(v, digits) + ' ' + unit;
  }
  /* Dạng khoa học: 5,96 × 10⁷ */
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sci(v, digits = 3) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 3) return num(v, digits);
    const m = v / Math.pow(10, e);
    return num(m, digits) + ' × 10' + String(e).split('').map(c => SUP[c]).join('');
  }

  /* Gắn slider với ô hiển thị giá trị. map: giá trị slider -> giá trị thực (ví dụ thang log). */
  function range(id, { map = v => v, show, onInput } = {}) {
    const el = document.getElementById(id), out = document.querySelector(`output[for="${id}"]`);
    const get = () => map(parseFloat(el.value));
    const upd = () => { if (out && show) out.textContent = show(get()); onInput && onInput(get()); };
    el.addEventListener('input', upd);
    return { el, get, upd, set(v) { el.value = v; upd(); } };
  }

  /* Mũi tên trên canvas. */
  function arrow(ctx, x0, y0, x1, y1, color, width = 2, head = 8) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    const ux = dx / L, uy = dy / L, h = Math.min(head, L * 0.6);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * h * 0.8, y1 - uy * h * 0.8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5);
    ctx.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5);
    ctx.closePath(); ctx.fill();
  }

  /* Chỉ chạy vòng lặp animation khi phần tử đang hiện trên màn hình. */
  function loopWhenVisible(el, frame) {
    let vis = false, last = null;
    new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; last = null; }), { threshold: 0.05 }).observe(el);
    (function tick(now) {
      if (vis) { const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000); last = now; frame(dt, now / 1000); }
      requestAnimationFrame(tick);
    })(performance.now());
  }

  return { REDUCED, COLORS, fitCanvas, watchCanvas, fmt, num, sci, range, arrow, loopWhenVisible };
})();

/* =====================================================================
   MINH HỌA TẢI KHI CẦN (lazy loading)
   Mỗi minh họa là một file lib/demos/<id>.js gọi BEM.demo(id, def):
     def.html  : giao diện (thanh tiêu đề + canvas + bảng điều khiển)
     def.deps  : (tùy chọn) các file phụ trong lib/demos/ cần nạp trước
     def.init(): chạy minh họa sau khi giao diện đã được chèn
   Trên trang: <div class="demo" id="..." data-demo="<id>"> chỉ là chỗ giữ chỗ;
   file JS chỉ được tải và chạy khi khung này cách màn hình dưới 600px.
   Chạy riêng lẻ: lib/demos/run.html?demo=<id>
   ===================================================================== */
(() => {
  const SRC = document.currentScript ? document.currentScript.src : location.href;
  const DEMO_BASE = new URL('demos/', SRC).href;
  const reg = {}, waiting = {}, scripts = {};
  BEM.demo = (id, def) => { reg[id] = def; (waiting[id] || []).forEach(f => f(def)); delete waiting[id]; };
  BEM.loadScript = name => scripts[name] || (scripts[name] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = DEMO_BASE + name + '.js'; s.onload = res; s.onerror = () => rej(new Error('Không tải được lib/demos/' + name + '.js'));
    document.head.appendChild(s);
  }));
  BEM.loadDemo = id => reg[id] ? Promise.resolve(reg[id]) : new Promise((res, rej) => {
    (waiting[id] = waiting[id] || []).push(res);
    BEM.loadScript(id).catch(rej);
  });
  BEM.mountDemo = (el, id) => BEM.loadDemo(id)
    .then(def => Promise.all((def.deps || []).map(BEM.loadScript)).then(() => def))
    .then(def => {
      el.innerHTML = def.html; el.classList.add('ready'); def.init(el);
      if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([el]).catch(() => {});
    })
    .catch(err => { const m = el.querySelector('.demo-loading'); if (m) m.textContent = err.message; console.error(err); });
  BEM.lazyDemos = (root = document) => {
    const els = [...root.querySelectorAll('[data-demo]:not(.ready)')];
    if (!('IntersectionObserver' in window)) { els.forEach(el => BEM.mountDemo(el, el.dataset.demo)); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); BEM.mountDemo(e.target, e.target.dataset.demo); }
    }), { rootMargin: '600px 0px' });
    els.forEach(el => io.observe(el));
  };

  /* ---------- mục lục nổi: tự dựng từ <section class="part" id> và h2, h3 bên trong ---------- */
  BEM.floatingToc = () => {
    const parts = [...document.querySelectorAll('main section.part[id]')];
    if (!parts.length) return;
    const home = document.body.dataset.home || 'index.html';
    const nav = document.createElement('nav'); nav.className = 'ftoc'; nav.setAttribute('aria-label', 'Mục lục trang');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ftoc-btn'; btn.setAttribute('aria-controls', 'ftocPanel');
    const panel = document.createElement('div'); panel.className = 'ftoc-panel'; panel.id = 'ftocPanel';
    const homeA = document.createElement('a'); homeA.className = 'ftoc-home'; homeA.href = home; homeA.textContent = 'Trang chủ Sinh điện từ';
    const ol = document.createElement('ol'); const links = [];
    parts.forEach(sec => {
      const h2 = sec.querySelector('h2'); if (!h2) return;
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + sec.id; a.textContent = h2.textContent.trim(); li.appendChild(a); links.push([sec, a]);
      const h3s = [...sec.querySelectorAll('h3')].filter(h => !h.closest('.demo'));
      if (h3s.length) {
        const sub = document.createElement('ol');
        h3s.forEach((h, i) => {
          if (!h.id) h.id = sec.id + '-' + (i + 1);
          const l2 = document.createElement('li'), a2 = document.createElement('a');
          a2.href = '#' + h.id; a2.textContent = h.textContent.trim(); l2.appendChild(a2); sub.appendChild(l2);
        });
        li.appendChild(sub);
      }
      ol.appendChild(li);
    });
    panel.append(homeA, ol); nav.append(btn, panel); document.body.appendChild(nav);
    // Mặc định mở. Chỉ nút này mới thu gọn / mở lại; lựa chọn được nhớ giữa các trang của module.
    const ICON_MIN = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2"/></svg>';
    const ICON_MAX = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h8" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
    const KEY = 'intro-bem-toc-open';
    let open = true; try { const v = localStorage.getItem(KEY); if (v !== null) open = v === '1'; } catch (e) {}
    const setOpen = v => {
      open = v; nav.classList.toggle('open', v); btn.setAttribute('aria-expanded', v);
      btn.innerHTML = v ? ICON_MIN + '<span>Thu gọn</span>' : ICON_MAX + '<span>Mục lục</span>';
      btn.title = v ? 'Thu gọn mục lục' : 'Mở mục lục';
      try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
    };
    btn.addEventListener('click', () => setOpen(!open));
    setOpen(open);
    // đánh dấu mục đang xem
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(([s, a]) => a.classList.toggle('active', s === e.target));
    }), { rootMargin: '-35% 0px -60% 0px' });
    links.forEach(([s]) => io.observe(s));
  };

  const go = () => { BEM.lazyDemos(); if (!document.body.hasAttribute('data-no-toc')) BEM.floatingToc(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
