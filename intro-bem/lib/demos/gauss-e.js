/* =====================================================================
   Sinh điện từ: minh họa "Mặt Gauss" (id: gauss-e, trang 3-maxwell.html)
   Nhúng vào trang: <div class="demo" id="demoGaussE" data-demo="gauss-e"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=gauss-e
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

BEM.demo('gauss-e', {
  domId: 'demoGaussE',
  title: 'Mặt Gauss',
  page: '3-maxwell.html',
  html: `<div class="demo-title"><h4>Mặt Gauss</h4><span>Kéo điện tích hoặc kéo mặt Gauss (vòng tròn xanh)</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvGE" class="grab ar" role="img" aria-label="Ba điện tích điểm, đường sức điện và một mặt cầu Gauss kéo rê được. Mũi tên đỏ quanh mặt cầu chỉ thông lượng đi ra, mũi tên xanh chỉ thông lượng đi vào."></canvas>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="gq1">q₁</label><output for="gq1"></output><input type="range" id="gq1" min="-30" max="30" step="1" value="20"></div>
          <div class="ctrl"><label for="gq2">q₂</label><output for="gq2"></output><input type="range" id="gq2" min="-30" max="30" step="1" value="-10"></div>
          <div class="ctrl"><label for="gq3">q₃</label><output for="gq3"></output><input type="range" id="gq3" min="-30" max="30" step="1" value="10"></div>
          <div class="ctrl"><label for="gR">Bán kính mặt Gauss</label><output for="gR"></output><input type="range" id="gR" min="1" max="9" step="0.1" value="4"></div>
          <dl class="readout" aria-live="polite">
            <dt>Q bên trong</dt><dd id="geQ">—</dd>
            <dt>Q<sub>trong</sub>/ε₀</dt><dd class="big" id="geQe">—</dd>
            <dt>Φ<sub>E</sub> (tích phân số)</dt><dd class="big" id="gePhi">—</dd>
            <dt>Phần đi ra</dt><dd id="geOut">—</dd>
            <dt>Phần đi vào</dt><dd id="geIn">—</dd>
          </dl>
          <p class="note-s" id="geNote">Mặt Gauss là một mặt cầu; hình chỉ là mặt cắt qua tâm. Φ<sub>E</sub> được tính bằng cách cộng E·dA trên 7200 mảnh nhỏ của mặt cầu.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 1: GAUSS ĐIỆN. 3 điện tích điểm trong mặt phẳng z = 0, mặt cầu Gauss.
   Φ tính bằng tích phân số: 60 × 120 mảnh có diện tích bằng nhau.
   ===================================================================== */
(function demoGaussE() {
  const cv = document.getElementById('cvGE'); if (!cv) return;
  const st = {}, WW = 0.20;
  const ch = [{ fx: 0.33, fy: 0.5, q: 20 }, { fx: 0.56, fy: 0.34, q: -10 }, { fx: 0.74, fy: 0.68, q: 10 }];
  const sf = { fx: 0.38, fy: 0.52 };
  let lines = [], dirty = true, drag = null, off = [0, 0];
  const qs = ['gq1', 'gq2', 'gq3'].map((id, i) => range(id, { show: v => sgnTxt(v) + ' nC', onInput: v => { ch[i].q = v; dirty = true; draw(); } }));
  const sR = range('gR', { show: v => num(v, 3) + ' cm', onInput: () => draw() });
  const P = () => ch.map(c => ({ x: c.fx * st.W, y: c.fy * st.H, q: c.q }));
  function E2(pts, x, y) {
    const s = st.W / WW; let ex = 0, ey = 0;
    for (const c of pts) { if (!c.q) continue; const dx = (x - c.x) / s, dy = (y - c.y) / s, r = Math.max(2e-4, Math.hypot(dx, dy)), k = K * c.q * nC / (r * r * r); ex += k * dx; ey += k * dy; }
    return [ex, ey];
  }
  function trace(pts) {
    lines = []; const h = 2.5;
    pts.forEach((c, i) => {
      if (!c.q) return; const n = Math.max(3, Math.round(Math.abs(c.q) * 0.5)), sg = Math.sign(c.q);
      for (let k = 0; k < n; k++) {
        const a = (k + 0.5) / n * Math.PI * 2; let x = c.x + Math.cos(a) * 13, y = c.y + Math.sin(a) * 13, end = -1, pdx = Math.cos(a), pdy = Math.sin(a);
        const L = [[x, y]];
        for (let s = 0; s < 1600; s++) {
          let [ex, ey] = E2(pts, x, y), m = Math.hypot(ex, ey); if (!m) break;
          [ex, ey] = E2(pts, x + sg * ex / m * h / 2, y + sg * ey / m * h / 2); m = Math.hypot(ex, ey); if (!m) break;
          const dx = sg * ex / m, dy = sg * ey / m; if (dx * pdx + dy * pdy < -0.3) break; pdx = dx; pdy = dy;
          x += dx * h; y += dy * h; L.push([x, y]);
          if (x < -40 || y < -40 || x > st.W + 40 || y > st.H + 40) break;
          const j = pts.findIndex((o, jj) => jj !== i && o.q && Math.hypot(o.x - x, o.y - y) < 11); if (j >= 0) { end = j; break; }
        }
        if (sg < 0 && end >= 0 && pts[end].q > 0) continue;
        lines.push([L, sg]);
      }
    });
    dirty = false;
  }
  function flux(pts) {
    const s = st.W / WW, cx = sf.fx * st.W / s, cy = sf.fy * st.H / s, R = sR.get() / 100;
    const Nu = 60, Np = 120, dA = R * R * (2 / Nu) * (2 * Math.PI / Np);
    const Q = pts.map(c => ({ x: c.x / s, y: c.y / s, q: c.q * nC }));
    let out = 0, inn = 0;
    for (let i = 0; i < Nu; i++) {
      const u = -1 + (i + 0.5) * 2 / Nu, sn = Math.sqrt(1 - u * u);
      for (let j = 0; j < Np; j++) {
        const ph = (j + 0.5) / Np * 2 * Math.PI, nx = sn * Math.cos(ph), ny = sn * Math.sin(ph), nz = u;
        const px = cx + R * nx, py = cy + R * ny, pz = R * nz; let f = 0;
        for (const c of Q) { if (!c.q) continue; const dx = px - c.x, dy = py - c.y, dz = pz, r2 = dx * dx + dy * dy + dz * dz, r = Math.sqrt(r2); f += K * c.q * (dx * nx + dy * ny + dz * nz) / (r2 * r); }
        if (f > 0) out += f * dA; else inn += f * dA;
      }
    }
    let qin = 0, near = false;
    Q.forEach(c => { const d = Math.hypot(c.x - cx, c.y - cy); if (d < R) qin += c.q; if (c.q && Math.abs(d - R) < 0.003) near = true; });
    return { out, inn, qin, near };
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, pts = P(); if (dirty) trace(pts);
    bg(ctx, W, H);
    ctx.strokeStyle = 'rgba(27,25,32,.5)'; ctx.lineWidth = 1.2;
    for (const [L, sg] of lines) {
      ctx.beginPath(); L.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      for (let k = 45; k < L.length - 3; k += 80) head(ctx, L[k][0], L[k][1], (L[k + 2][0] - L[k - 2][0]) * sg, (L[k + 2][1] - L[k - 2][1]) * sg, 'rgba(27,25,32,.7)');
    }
    const cx = sf.fx * W, cy = sf.fy * H, R = sR.get() / 100 / WW * W;
    drawSurface(ctx, cx, cy, R, (x, y, nx, ny) => { const [ex, ey] = E2(pts, x, y); return ex * nx + ey * ny; }, 300);
    pts.forEach((c, i) => drawCharge(ctx, c.x, c.y, c.q, `q${'₁₂₃'[i]} = ${sgnTxt(c.q)} nC`));
    const f = flux(pts);
    setTxt('geQ', fmt(f.qin, 'C')); setTxt('geQe', fmt(f.qin / EPS0, 'V·m'));
    setTxt('gePhi', fmt(f.out + f.inn, 'V·m')); setTxt('geOut', fmt(f.out, 'V·m')); setTxt('geIn', fmt(f.inn, 'V·m'));
    setTxt('geNote', f.near ? 'Có điện tích nằm gần sát mặt Gauss: tích phân số kém chính xác ở đó. Dời mặt Gauss ra một chút.' : 'Mặt Gauss là một mặt cầu; hình chỉ là mặt cắt qua tâm. Φ được tính bằng cách cộng E·dA trên 7200 mảnh nhỏ của mặt cầu.');
  }
  cv.addEventListener('pointerdown', e => {
    const [x, y] = xy(cv, e); let best = null, bd = 20;
    ch.forEach((c, i) => { const d = Math.hypot(c.fx * st.W - x, c.fy * st.H - y); if (d < bd) { bd = d; best = i; } });
    if (best === null) { best = 'S'; off = [sf.fx * st.W - x, sf.fy * st.H - y]; const R = sR.get() / 100 / WW * st.W; if (Math.hypot(off[0], off[1]) > R + 14) { off = [0, 0]; sf.fx = x / st.W; sf.fy = y / st.H; } }
    drag = best; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); draw();
  });
  cv.addEventListener('pointermove', e => {
    if (drag === null) return; const [x, y] = xy(cv, e);
    if (drag === 'S') { sf.fx = (x + off[0]) / st.W; sf.fy = (y + off[1]) / st.H; }
    else { ch[drag].fx = clampF(x / st.W, 14 / st.W); ch[drag].fy = clampF(y / st.H, 14 / st.H); dirty = true; }
    draw();
  });
  const end = () => { drag = null; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st, () => { dirty = true; draw(); });
  qs.forEach(s => s.upd()); sR.upd(); draw();
})();
  },
});
})();
