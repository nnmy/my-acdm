/* =====================================================================
   Sinh điện từ: minh họa "Thông lượng từ qua đường cong kín" (id: gauss-b, trang 3-maxwell.html)
   Nhúng vào trang: <div class="demo" id="demoGaussB" data-demo="gauss-b"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=gauss-b
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const K = 8.9875517923e9, EPS0 = 8.8541878128e-12, MU0 = 1.25663706e-6, nC = 1e-9;
const CL = 299792458, HPL = 6.62607015e-34, QE = 1.602176634e-19;
const xy = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
const pressGroup = (btns, a) => btns.forEach(b => b.setAttribute('aria-pressed', b === a));
const logLen = (v, ref, a, b, lo, hi) => Math.max(lo, Math.min(hi, a + b * Math.log10(Math.max(1e-30, v) / ref)));
const sgnTxt = q => (q > 0 ? '+' : q < 0 ? '−' : '') + Math.abs(q);
function bg(ctx, W, H) { ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.fillStyle = C.line; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) ctx.fillRect(x - .75, y - .75, 1.5, 1.5); }
function head(ctx, x, y, dx, dy, col) { const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x - dx * 4 - dy * 3.6, y - dy * 4 + dx * 3.6); ctx.lineTo(x - dx * 4 + dy * 3.6, y - dy * 4 - dx * 3.6); ctx.fill(); }
function drawCharge(ctx, x, y, q, label) {
  ctx.fillStyle = q > 0 ? C.pos : q < 0 ? C.neg : '#B9C0C8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (q) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 5.5, y); ctx.lineTo(x + 5.5, y); if (q > 0) { ctx.moveTo(x, y - 5.5); ctx.lineTo(x, y + 5.5); } ctx.stroke(); }
  if (label) { ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const w = ctx.measureText(label).width + 8; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x - w / 2, y - 35, w, 17); ctx.fillStyle = C.ink; ctx.fillText(label, x, y - 19); }
}
/* vòng tròn "mặt kín" + mũi tên thông lượng pháp tuyến (đỏ: đi ra, xanh: đi vào) */
function drawSurface(ctx, cx, cy, R, normalAt, ref) {
  ctx.strokeStyle = C.sea; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a), x = cx + R * nx, y = cy + R * ny;
    const fn = normalAt(x, y, nx, ny); if (!fn) continue;
    const L = logLen(Math.abs(fn), ref, 4, 5, 3, 22);
    if (fn > 0) arrow(ctx, x, y, x + nx * L, y + ny * L, C.pos, 2, 6);
    else arrow(ctx, x + nx * L, y + ny * L, x, y, C.neg, 2, 6);
  }
  ctx.fillStyle = C.sea; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}


/* small helper: 2-band time plot (giống đồ thị ở phần 1) */
function bandPlot(sp, series, tNow, tSpan) {
  if (!sp.ctx) return;
  const { ctx, W, H } = sp; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const h = H / series.length;
  series.forEach((s, bi) => {
    const y0 = bi * h, mid = y0 + h / 2;
    const L = Math.max(s.floor || 1e-30, ...s.data.map(p => Math.abs(p[1]))) * 1.1;
    const ys = v => mid - v / L * (h / 2 - 6), xs = t => W - (tNow - t) / tSpan * W;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash(s.dash || []); ctx.beginPath();
    s.data.forEach(([t, v], i) => i ? ctx.lineTo(xs(t), ys(v)) : ctx.moveTo(xs(t), ys(v))); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const lab = `${s.name}   (±${fmt(L, s.unit, 2)})`, w = ctx.measureText(lab).width + 8;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(6, y0 + 4, w, 18); ctx.fillStyle = s.color; ctx.fillText(lab, 10, y0 + 5);
    if (bi) { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); }
  });
}

BEM.demo('gauss-b', {
  domId: 'demoGaussB',
  title: 'Thông lượng từ qua đường cong kín',
  page: '3-maxwell.html',
  html: `<div class="demo-title"><h4>Thông lượng từ qua đường cong kín</h4><span>Mô hình 2D: dây dẫn dài vuông góc màn hình</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvGB" class="grab ar" role="img" aria-label="Đường sức từ của các dây dẫn và một đường cong kín kéo rê được; mũi tên chỉ thông lượng đi ra và đi vào."></canvas>
        </div>
        <div class="panel">
          <div class="btnrow" role="group" aria-label="Nguồn từ trường">
            <button class="btn" type="button" data-gb="one" aria-pressed="false">Một dây</button>
            <button class="btn" type="button" data-gb="pair" aria-pressed="false">Hai dây ngược chiều</button>
            <button class="btn" type="button" data-gb="coil" aria-pressed="true">Ống dây ≈ nam châm</button>
          </div>
          <div class="ctrl"><label for="gbR">Bán kính đường cong</label><output for="gbR"></output><input type="range" id="gbR" min="1" max="9" step="0.1" value="3.5"></div>
          <dl class="readout" aria-live="polite">
            <dt>Phần đi ra</dt><dd id="gbOut">—</dd>
            <dt>Phần đi vào</dt><dd id="gbIn">—</dd>
            <dt>Tổng ∮B·n dl</dt><dd class="big" id="gbSum">—</dd>
          </dl>
          <p class="note-s">Trong mô hình 2D, "mặt kín" là một mặt trụ dài vuông góc màn hình, nên thông lượng tính trên mỗi mét chiều dài (Wb/m). Thử bao quanh chỉ một đầu của ống dây (đầu "N"): phần đi ra vẫn đúng bằng phần đi vào, vì đường sức chạy ngược lại bên trong ống.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 2: GAUSS TỪ. Dây dẫn dài (2D), đường sức = đường đồng mức của Az,
   thông lượng ∮ B·n dl tính trên 720 điểm.
   ===================================================================== */
(function demoGaussB() {
  const cv = document.getElementById('cvGB'); if (!cv) return;
  const st = {}, WW = 0.20, I0 = 10, CELL = 5;
  const SETS = {
    one: [[0.5, 0.5, 1]], pair: [[0.4, 0.5, 1], [0.6, 0.5, -1]],
    coil: [...Array(7)].flatMap((_, i) => [[0.32 + i * 0.06, 0.4, 1], [0.32 + i * 0.06, 0.6, -1]]),
  };
  let wires = [], A = null, dirty = true, drag = null, off = [0, 0];
  const sf = { fx: 0.68, fy: 0.5 };
  const sR = range('gbR', { show: v => num(v, 3) + ' cm', onInput: () => draw() });
  const btns = [...document.querySelectorAll('#demoGaussB [data-gb]')];
  function load(k) { wires = SETS[k].map(([fx, fy, s]) => ({ fx, fy, s })); sf.fx = k === 'coil' ? 0.68 : 0.5; sf.fy = 0.5; dirty = true; draw(); }
  btns.forEach(b => b.addEventListener('click', () => { pressGroup(btns, b); load(b.dataset.gb); }));
  const P = () => wires.map(w => ({ x: w.fx * st.W, y: w.fy * st.H, I: w.s * I0 }));
  function B2(pts, x, y) { const s = st.W / WW; let bx = 0, by = 0; for (const w of pts) { const dx = (x - w.x) / s, dy = (y - w.y) / s, r2 = Math.max(1e-8, dx * dx + dy * dy), k = MU0 * w.I / (2 * Math.PI * r2); bx += k * dy; by -= k * dx; } return [bx, by]; }
  function compute(pts) {
    const nx = Math.ceil(st.W / CELL) + 1, ny = Math.ceil(st.H / CELL) + 1, V = new Float32Array(nx * ny), M = new Uint8Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let a = 0, near = false; for (const w of pts) { const r = Math.hypot(i * CELL - w.x, j * CELL - w.y); if (r < 12) near = true; a -= w.I * Math.log(Math.max(r, 1)); }
      const k = j * nx + i; V[k] = a; M[k] = near; if (!near) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
    }
    A = { nx, ny, V, M, lo, hi }; dirty = false;
  }
  function contours(ctx) {
    const { nx, ny, V, M, lo, hi } = A, dA = I0 * 0.24 * Math.max(1, Math.sqrt(wires.length));
    ctx.strokeStyle = 'rgba(27,25,32,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = Math.ceil(lo / dA - 0.5); k <= Math.floor(hi / dA - 0.5); k++) {
      const L = (k + 0.5) * dA;
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const id = [j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i]; if (id.some(q => M[q])) continue;
        const v = id.map(q => V[q]), c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], h = [];
        for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a - L) * (b - L) < 0) { const t = (L - a) / (b - a), p = c[e], q = c[(e + 1) % 4]; h.push([(p[0] + (q[0] - p[0]) * t) * CELL, (p[1] + (q[1] - p[1]) * t) * CELL]); } }
        if (h.length >= 2) { ctx.moveTo(h[0][0], h[0][1]); ctx.lineTo(h[1][0], h[1][1]); }
        if (h.length === 4) { ctx.moveTo(h[2][0], h[2][1]); ctx.lineTo(h[3][0], h[3][1]); }
      }
    }
    ctx.stroke();
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, pts = P(); if (dirty) compute(pts);
    bg(ctx, W, H); contours(ctx);
    const cx = sf.fx * W, cy = sf.fy * H, R = sR.get() / 100 / WW * W, Rm = sR.get() / 100;
    drawSurface(ctx, cx, cy, R, (x, y, nx, ny) => { const [bx, by] = B2(pts, x, y); return bx * nx + by * ny; }, 2e-6);
    for (const w of pts) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (w.I > 0) { ctx.fillStyle = C.pos; ctx.beginPath(); ctx.arc(w.x, w.y, 3.2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.strokeStyle = C.neg; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(w.x - 4.5, w.y - 4.5); ctx.lineTo(w.x + 4.5, w.y + 4.5); ctx.moveTo(w.x + 4.5, w.y - 4.5); ctx.lineTo(w.x - 4.5, w.y + 4.5); ctx.stroke(); }
    }
    const N = 720, dl = 2 * Math.PI * Rm / N; let out = 0, inn = 0;
    for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * 2 * Math.PI, nx = Math.cos(a), ny = Math.sin(a), [bx, by] = B2(pts, cx + R * nx, cy + R * ny), f = (bx * nx + by * ny) * dl; if (f > 0) out += f; else inn += f; }
    setTxt('gbOut', fmt(out, 'Wb/m')); setTxt('gbIn', fmt(inn, 'Wb/m'));
    const sum = out + inn;
    setTxt('gbSum', Math.abs(sum) < 1e-4 * Math.max(out, 1e-30) ? '≈ 0' : fmt(sum, 'Wb/m'));
  }
  cv.addEventListener('pointerdown', e => {
    const [x, y] = xy(cv, e); let best = null, bd = 18;
    wires.forEach((w, i) => { const d = Math.hypot(w.fx * st.W - x, w.fy * st.H - y); if (d < bd) { bd = d; best = i; } });
    if (best === null) { best = 'S'; off = [sf.fx * st.W - x, sf.fy * st.H - y]; const R = sR.get() / 100 / WW * st.W; if (Math.hypot(off[0], off[1]) > R + 14) { off = [0, 0]; sf.fx = x / st.W; sf.fy = y / st.H; } }
    drag = best; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); draw();
  });
  cv.addEventListener('pointermove', e => {
    if (drag === null) return; const [x, y] = xy(cv, e);
    if (drag === 'S') { sf.fx = (x + off[0]) / st.W; sf.fy = (y + off[1]) / st.H; }
    else { wires[drag].fx = clampF(x / st.W, 12 / st.W); wires[drag].fy = clampF(y / st.H, 12 / st.H); dirty = true; }
    draw();
  });
  const end = () => { drag = null; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st, () => { dirty = true; draw(); });
  sR.upd(); load('coil');
})();
  },
});
})();
