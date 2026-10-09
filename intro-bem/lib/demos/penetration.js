/* =====================================================================
   Sinh điện từ: minh họa "Độ xuyên sâu và lớp mô" (id: penetration, trang 4-dien-moi.html)
   Nhúng vào trang: <div class="demo" id="demoDepth" data-demo="penetration"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=penetration
   Cần: lib/demos/gabriel-data.js (tự nạp qua deps)
   Mô hình lớp: da 2 mm / mỡ t mm / cơ; sóng phẳng tới vuông góc, BỎ QUA phản xạ ở mặt phân cách.
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas } = BEM;
const LINES = [['muscle', C.pos], ['blood', '#8F1D4F'], ['skinw', '#B98A5E'], ['fat', '#C99A12'], ['bone', '#59606B']];
const LAYER = { skinw: '#F3DCC6', fat: '#FBEBB5', muscle: '#F2C9C2' };

BEM.demo('penetration', {
  domId: 'demoDepth',
  title: 'Độ xuyên sâu và lớp mô',
  page: '4-dien-moi.html',
  deps: ['gabriel-data'],
  html: `<div class="demo-title"><h4>Độ xuyên sâu và lớp mô</h4><span>Chọn tần số và bề dày lớp mỡ</span></div>
  <div class="demo-body">
    <div class="stagebox">
      <canvas id="cvPd" class="ar" role="img" aria-label="Đồ thị log-log độ xuyên sâu theo tần số cho cơ, máu, da, mỡ, xương."></canvas>
      <canvas id="cvPl" class="profile" style="height:210px" role="img" aria-label="Công suất và SAR tương đối theo độ sâu qua ba lớp da, mỡ, cơ."></canvas>
    </div>
    <div class="panel">
      <div class="ctrl"><label for="pdF">Tần số f</label><output for="pdF"></output><input type="range" id="pdF" min="6" max="11" step="0.01" value="9.39"></div>
      <div class="ctrl"><label for="pdT">Bề dày lớp mỡ</label><output for="pdT"></output><input type="range" id="pdT" min="1" max="40" step="0.5" value="10"></div>
      <dl class="readout" aria-live="polite">
        <dt>δ của da</dt><dd id="pdS">—</dd>
        <dt>δ của mỡ</dt><dd id="pdFa">—</dd>
        <dt>δ của cơ</dt><dd id="pdM">—</dd>
        <dt>Công suất tới mặt cơ</dt><dd class="big" id="pdP">—</dd>
        <dt>Độ sâu công suất còn 13,5%</dt><dd id="pdZ">—</dd>
      </dl>
      <p class="note-s">Đồ thị dưới: đường đen là công suất tương đối P(z)/P(0) = e<sup>−2z/δ</sup> (cộng dồn qua các lớp); vùng vàng là SAR tương đối ∝ σ·P/ρ. Mô hình bỏ qua phản xạ ở mặt da–mỡ–cơ, vốn có thể tạo sóng đứng và điểm nóng trong lớp mỡ (phần 5 sẽ mô phỏng bằng FDTD).</p>
    </div>
  </div>`,
  init() {
    const G = BEM.GABRIEL, cv = document.getElementById('cvPd'), cp = document.getElementById('cvPl'), s1 = {}, s2 = {};
    const rF = range('pdF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => draw() });
    const rT = range('pdT', { show: v => num(v, 3) + ' mm', onInput: () => draw() });
    const X0 = 6, X1 = 11, Y0 = -4, Y1 = 1, ZMAX = 0.07;
    let drag = false;
    function drawTop() {
      if (!s1.ctx) return;
      const { ctx, W, H } = s1, L = 58, R = 14, T = 14, B = 30, pw = W - L - R, ph = H - T - B, f = rF.get();
      const xs = lf => L + (lf - X0) / (X1 - X0) * pw, ys = v => T + ph - (Math.log10(v) - Y0) / (Y1 - Y0) * ph;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let d = Y0; d <= Y1; d++) { ctx.beginPath(); ctx.moveTo(L, ys(10 ** d)); ctx.lineTo(L + pw, ys(10 ** d)); ctx.stroke(); ctx.fillText(fmt(10 ** d, 'm', 1), L - 6, ys(10 ** d)); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let d = X0; d <= X1; d++) { ctx.beginPath(); ctx.moveTo(xs(d), T); ctx.lineTo(xs(d), T + ph); ctx.stroke(); ctx.fillText(fmt(10 ** d, 'Hz', 1), xs(d), T + ph + 6); }
      ctx.strokeStyle = C.ink; ctx.strokeRect(L, T, pw, ph);
      ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      LINES.forEach(([k, col]) => {
        ctx.strokeStyle = col; ctx.lineWidth = k === 'muscle' || k === 'fat' ? 2.8 : 1.8; ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const lf = X0 + (X1 - X0) * i / 200, d = G.wave(k, 10 ** lf).delta; i ? ctx.lineTo(xs(lf), ys(d)) : ctx.moveTo(xs(lf), ys(d)); }
        ctx.stroke();
      });
      ctx.restore();
      const x = xs(Math.log10(f));
      ctx.strokeStyle = C.ink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      let lx = L + 8;
      LINES.forEach(([k, col]) => { const t = G.T[k].vi; ctx.fillStyle = 'rgba(255,255,255,.9)'; const w = ctx.measureText(t).width; ctx.fillRect(lx - 2, T + ph - 22, w + 4, 18); ctx.fillStyle = col; ctx.fillText(t, lx, T + ph - 20); lx += w + 14; });
      ctx.fillStyle = C.ink; ctx.fillText('Độ xuyên sâu δ', L + 8, T + 4);
    }
    function profile() {
      const f = rF.get(), tf = rT.get() / 1000, b1 = 0.002, b2 = b1 + tf;
      const tis = z => z < b1 ? 'skinw' : z < b2 ? 'fat' : 'muscle';
      const cache = {}; ['skinw', 'fat', 'muscle'].forEach(k => { const w = G.wave(k, f); cache[k] = { d: w.delta, s: w.eps.sigma, rho: G.T[k].rho }; });
      const N = 700, dz = ZMAX / N, pts = []; let att = 0, z135 = null, Pm = null;
      for (let i = 0; i <= N; i++) {
        const z = i * dz, k = tis(z), P = Math.exp(-att);
        if (z135 === null && P <= Math.exp(-2)) z135 = z;
        if (Pm === null && z >= b2) Pm = P;
        pts.push([z, P, cache[k].s * P / cache[k].rho]);
        att += 2 * dz / cache[k].d;
      }
      return { pts, b1, b2, cache, z135, Pm };
    }
    function drawBottom(pr) {
      if (!s2.ctx) return;
      const { ctx, W, H } = s2, L = 58, R = 14, T = 26, B = 28, pw = W - L - R, ph = H - T - B;
      const xs = z => L + z / ZMAX * pw, ys = v => T + ph - v * ph;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      [[0, pr.b1, 'skinw', 'Da'], [pr.b1, pr.b2, 'fat', 'Mỡ'], [pr.b2, ZMAX, 'muscle', 'Cơ']].forEach(([a, b, k, n]) => {
        ctx.fillStyle = LAYER[k]; ctx.fillRect(xs(a), T, xs(b) - xs(a), ph);
        ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        if (xs(b) - xs(a) > 22) ctx.fillText(n, (xs(a) + xs(b)) / 2, T - 4);
      });
      const smax = Math.max(...pr.pts.map(p => p[2])) || 1;
      ctx.fillStyle = 'rgba(242,194,48,.55)'; ctx.beginPath(); ctx.moveTo(xs(0), ys(0));
      pr.pts.forEach(([z, , s]) => ctx.lineTo(xs(z), ys(s / smax))); ctx.lineTo(xs(ZMAX), ys(0)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.beginPath();
      pr.pts.forEach(([z, P], i) => i ? ctx.lineTo(xs(z), ys(P)) : ctx.moveTo(xs(z), ys(P))); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(L, T, pw, ph);
      ctx.font = '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let mm = 0; mm <= 70; mm += 10) ctx.fillText(mm + ' mm', xs(mm / 1000), T + ph + 6);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('1', L - 6, ys(1)); ctx.fillText('0', L - 6, ys(0));
    }
    function draw() {
      drawTop();
      const pr = profile(); drawBottom(pr);
      const set = (id, t) => { document.getElementById(id).textContent = t; };
      set('pdS', fmt(pr.cache.skinw.d, 'm', 3)); set('pdFa', fmt(pr.cache.fat.d, 'm', 3)); set('pdM', fmt(pr.cache.muscle.d, 'm', 3));
      set('pdP', num(pr.Pm * 100, 3) + '%'); set('pdZ', pr.z135 === null ? '> 70 mm' : num(pr.z135 * 1000, 3) + ' mm');
    }
    const setF = e => { const r = cv.getBoundingClientRect(), lf = X0 + (e.clientX - r.left - 58) / (r.width - 72) * (X1 - X0); rF.set(Math.max(X0, Math.min(X1, lf))); };
    cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); setF(e); });
    cv.addEventListener('pointermove', e => { if (drag) setF(e); });
    cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
    watchCanvas(cv, s1, draw); watchCanvas(cp, s2, draw);
    rF.upd(); rT.upd();
  },
});
})();
