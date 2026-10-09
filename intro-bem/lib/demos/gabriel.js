/* =====================================================================
   Sinh điện từ: minh họa "Phổ điện môi của mô (mô hình Gabriel)" (id: gabriel, trang 4-dien-moi.html)
   Nhúng vào trang: <div class="demo" id="demoGabriel" data-demo="gabriel"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=gabriel
   Cần: lib/demos/gabriel-data.js (tự nạp qua deps)
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, watchCanvas } = BEM;
const OPTS = ['muscle', 'fat', 'blood', 'grey', 'white', 'csf', 'bone', 'skinw', 'skind', 'heart', 'liver', 'lung', 'nerve'];

BEM.demo('gabriel', {
  domId: 'demoGabriel',
  title: 'Phổ điện môi của mô (mô hình Gabriel)',
  page: '4-dien-moi.html',
  deps: ['gabriel-data'],
  html: `<div class="demo-title"><h4>Phổ điện môi của mô (mô hình Gabriel)</h4><span>So sánh hai mô; kéo trên đồ thị để đọc giá trị</span></div>
  <div class="demo-body">
    <div class="stagebox">
      <canvas id="cvGab" class="ar grab" role="img" aria-label="Đồ thị log-log của hằng số điện môi tương đối và độ dẫn điện theo tần số, từ 10 Hz đến 100 GHz, cho hai loại mô."></canvas>
    </div>
    <div class="panel">
      <div class="ctrl"><label for="gbA">Mô A (xanh)</label><select id="gbA"></select></div>
      <div class="ctrl"><label for="gbB">Mô B (đỏ)</label><select id="gbB"></select></div>
      <div class="ctrl"><label for="gbF">Tần số f</label><output for="gbF"></output><input type="range" id="gbF" min="1" max="11" step="0.01" value="9.39"></div>
      <div class="checks"><label><input type="checkbox" id="gbBands" checked> Tô các vùng α, β, γ</label></div>
      <table class="mini" aria-live="polite">
        <thead><tr><th></th><th id="gbHA">A</th><th id="gbHB">B</th></tr></thead>
        <tbody id="gbRows"></tbody>
      </table>
      <p class="note-s">δ: độ xuyên sâu (biên độ E còn 37%); λ: bước sóng trong mô. Dưới 1 MHz, mô hình chỉ là ước lượng và hai đại lượng này ít ý nghĩa (trường gần như tĩnh). Mô hình: Gabriel, Lau &amp; Gabriel (1996).</p>
    </div>
  </div>`,
  init() {
    const G = BEM.GABRIEL, cv = document.getElementById('cvGab'), st = {};
    const sA = document.getElementById('gbA'), sB = document.getElementById('gbB');
    OPTS.forEach(k => {
      [sA, sB].forEach(s => { const o = document.createElement('option'); o.value = k; o.textContent = `${G.T[k].vi} (${G.T[k].en})`; s.appendChild(o); });
    });
    const none = document.createElement('option'); none.value = ''; none.textContent = '(không so sánh)'; sB.prepend(none);
    sA.value = 'muscle'; sB.value = 'fat';
    let bands = true, drag = false;
    const rF = range('gbF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => draw() });
    [sA, sB].forEach(s => s.addEventListener('change', () => draw()));
    document.getElementById('gbBands').addEventListener('change', e => { bands = e.target.checked; draw(); });
    const X0 = 1, X1 = 11;
    function geom() {
      const { W, H } = st, L = 58, R = 14, T = 22, gap = 34, B = 30, ph = (H - T - B - gap) / 2;
      return { L, R, T, pw: W - L - R, ph, y1: T, y2: T + ph + gap };
    }
    function panel(ctx, g, y0, lo, hi, fnA, fnB, title) {
      const xs = lf => g.L + (lf - X0) / (X1 - X0) * g.pw, ys = v => y0 + g.ph - (Math.log10(Math.max(v, 1e-30)) - lo) / (hi - lo) * g.ph;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let d = lo; d <= hi; d++) { ctx.beginPath(); ctx.moveTo(g.L, ys(10 ** d)); ctx.lineTo(g.L + g.pw, ys(10 ** d)); ctx.stroke(); if ((d - lo) % (hi - lo > 6 ? 2 : 1) === 0) ctx.fillText(sci(10 ** d, 1), g.L - 6, ys(10 ** d)); }
      for (let d = X0; d <= X1; d++) { ctx.beginPath(); ctx.moveTo(xs(d), y0); ctx.lineTo(xs(d), y0 + g.ph); ctx.stroke(); }
      ctx.strokeStyle = C.ink; ctx.strokeRect(g.L, y0, g.pw, g.ph);
      const line = (fn, col) => {
        ctx.save(); ctx.beginPath(); ctx.rect(g.L, y0, g.pw, g.ph); ctx.clip();
        ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let k = 0; k <= 300; k++) { const lf = X0 + (X1 - X0) * k / 300, v = fn(10 ** lf); k ? ctx.lineTo(xs(lf), ys(v)) : ctx.moveTo(xs(lf), ys(v)); }
        ctx.stroke(); ctx.restore();
      };
      if (fnB) line(fnB, C.pos);
      line(fnA, C.sea);
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const w = ctx.measureText(title).width + 8; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(g.L + 4, y0 + 4, w, 18); ctx.fillStyle = C.ink; ctx.fillText(title, g.L + 8, y0 + 5);
      return { xs, ys };
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, g = geom(), A = sA.value, B = sB.value, f = rF.get();
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const xs = lf => g.L + (lf - X0) / (X1 - X0) * g.pw;
      if (bands) {
        [[1, 4, 'α'], [5, 7, 'β'], [9.5, 11, 'γ']].forEach(([a, b, n]) => {
          ctx.fillStyle = 'rgba(123,205,232,.16)'; ctx.fillRect(xs(a), g.y1, xs(b) - xs(a), g.y2 + g.ph - g.y1);
          ctx.font = '400 20px "VT323", monospace'; ctx.fillStyle = C.sea; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(n, (xs(a) + xs(b)) / 2, g.y1 - 1);
        });
      }
      panel(ctx, g, g.y1, 0, 8, v => G.eps(A, v).re, B ? v => G.eps(B, v).re : null, 'Hằng số điện môi tương đối εᵣ');
      panel(ctx, g, g.y2, -4, 2, v => G.eps(A, v).sigma, B ? v => G.eps(B, v).sigma : null, 'Độ dẫn điện σ (S/m)');
      ctx.font = '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let d = X0; d <= X1; d++) if (d % 2 === 1) ctx.fillText(fmt(10 ** d, 'Hz', 1), xs(d), g.y2 + g.ph + 6);
      const x = xs(Math.log10(f));
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, g.y1); ctx.lineTo(x, g.y2 + g.ph); ctx.stroke(); ctx.setLineDash([]);
      // bảng số
      const rows = [['εᵣ', k => num(G.eps(k, f).re, 3)], ['σ (S/m)', k => num(G.eps(k, f).sigma, 3)], ['ρ (Ω·m)', k => num(1 / G.eps(k, f).sigma, 3)],
        ['tan δ', k => { const e = G.eps(k, f); return num(e.im / e.re, 3); }], ['δ', k => fmt(G.wave(k, f).delta, 'm', 3)], ['λ', k => fmt(G.wave(k, f).lambda, 'm', 3)]];
      document.getElementById('gbHA').textContent = G.T[A].vi; document.getElementById('gbHB').textContent = B ? G.T[B].vi : '';
      document.getElementById('gbRows').innerHTML = rows.map(([n, fn]) => `<tr><td>${n}</td><td>${fn(A)}</td><td>${B ? fn(B) : ''}</td></tr>`).join('');
    }
    const setF = e => { const r = cv.getBoundingClientRect(), g = geom(), lf = X0 + (e.clientX - r.left - g.L) / g.pw * (X1 - X0); rF.set(Math.max(X0, Math.min(X1, lf))); };
    cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); setF(e); });
    cv.addEventListener('pointermove', e => { if (drag) setF(e); });
    cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
    watchCanvas(cv, st, draw);
    rF.upd();
  },
});
})();
