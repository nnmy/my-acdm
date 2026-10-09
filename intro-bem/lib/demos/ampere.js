/* =====================================================================
   Sinh điện từ: minh họa "Tụ điện đang nạp" (id: ampere, trang 3-maxwell.html)
   Nhúng vào trang: <div class="demo" id="demoAmpere" data-demo="ampere"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=ampere
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

BEM.demo('ampere', {
  domId: 'demoAmpere',
  title: 'Tụ điện đang nạp',
  page: '3-maxwell.html',
  html: `<div class="demo-title"><h4>Tụ điện đang nạp</h4><span>Kéo vòng Ampère dọc trục, chỉnh bán kính của nó</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvAm" class="grab ar" role="img" aria-label="Mạch nạp tụ điện; điện trường giữa hai bản tăng dần; vòng Ampère kéo rê được dọc trục."></canvas>
          <canvas id="cvAmPlot" class="profile" role="img" aria-label="Đồ thị dòng điện trong dây và dòng điện dịch chuyển theo thời gian."></canvas>
        </div>
        <div class="panel">
          <div class="btnrow"><button class="btn" type="button" id="amGo">Đóng mạch lại</button></div>
          <div class="ctrl"><label for="amU">Hiệu điện thế nguồn U</label><output for="amU"></output><input type="range" id="amU" min="1" max="3" step="0.01" value="2"></div>
          <div class="ctrl"><label for="amR">Điện trở R</label><output for="amR"></output><input type="range" id="amR" min="1" max="6" step="0.01" value="3"></div>
          <div class="ctrl"><label for="amr">Bán kính vòng Ampère r</label><output for="amr"></output><input type="range" id="amr" min="0.5" max="9" step="0.1" value="3"></div>
          <dl class="readout" aria-live="polite">
            <dt>Thời gian t</dt><dd id="amt">—</dd>
            <dt>Dòng trong dây I</dt><dd id="amI">—</dd>
            <dt>Điện trường giữa hai bản</dt><dd id="amE">—</dd>
            <dt>Dòng dịch chuyển I<sub>d</sub> (toàn bản)</dt><dd id="amId">—</dd>
            <dt>Vòng Ampère bao quanh</dt><dd id="amEnc">—</dd>
            <dt>B trên vòng</dt><dd class="big" id="amB">—</dd>
          </dl>
          <p class="note-s">Đặt vòng quanh dây rồi kéo vào khe giữa hai bản: B trên vòng không đổi (nếu r lớn hơn bán kính bản), dù trong khe không có hạt mang điện nào chạy qua. Thời gian trên hình được làm chậm lại; số liệu là thật.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 4: AMPÈRE–MAXWELL, tụ phẳng bản tròn (R = 5 cm, khe 2 mm) nạp qua R.
   ===================================================================== */
(function demoAmpere() {
  const cv = document.getElementById('cvAm'), cvp = document.getElementById('cvAmPlot'); if (!cv) return;
  const st = {}, sp = {}, RP = 0.05, GAP = 0.002, AREA = Math.PI * RP * RP, CAP = EPS0 * AREA / GAP;
  let T = 0, ph = 0, loopF = 0.25, drag = false;
  const sU = range('amU', { map: v => 10 ** v, show: v => fmt(v, 'V') });
  const sRs = range('amR', { map: v => 10 ** v, show: v => fmt(v, 'Ω') });
  const sr = range('amr', { show: v => num(v, 3) + ' cm' });
  document.getElementById('amGo').addEventListener('click', () => { T = 0; });
  function geom() {
    const { W, H } = st, cy = H * 0.56, hp = Math.min(H * 0.3, W * 0.2), ppc = hp / 5, gap = 26;
    return { cy, hp, ppc, gap, xl: W / 2 - gap / 2, xr: W / 2 + gap / 2, x0: W * 0.06, x1: W * 0.94, top: H * 0.12 };
  }
  function phys() {
    const U = sU.get(), R = sRs.get(), tau = R * CAP, I = U / R * Math.exp(-T), Q = CAP * U * (1 - Math.exp(-T)), E = Q / (EPS0 * AREA);
    return { U, R, tau, I, Q, E, I0: U / R };
  }
  function draw(p) {
    if (!st.ctx) return;
    const { ctx, W, H } = st, g = geom(), fr = 1 - Math.exp(-T);
    bg(ctx, W, H);
    // mạch
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(g.x0, g.cy); ctx.lineTo(g.xl, g.cy); ctx.moveTo(g.xr, g.cy); ctx.lineTo(g.x1, g.cy);
    ctx.moveTo(g.x0, g.cy); ctx.lineTo(g.x0, g.top); ctx.lineTo(W / 2 - 60, g.top); ctx.moveTo(W / 2 + 60, g.top); ctx.lineTo(g.x1, g.top); ctx.lineTo(g.x1, g.cy); ctx.stroke();
    // nguồn (bên trái) + điện trở (bên phải) trên đường trên
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 60, g.top - 14); ctx.lineTo(W / 2 - 60, g.top + 14); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W / 2 - 48, g.top - 7); ctx.lineTo(W / 2 - 48, g.top + 7); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(W / 2 - 48, g.top); ctx.lineTo(W / 2 + 10, g.top); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(W / 2 + 10, g.top - 8, 50, 16); ctx.strokeRect(W / 2 + 10, g.top - 8, 50, 16);
    ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('U', W / 2 - 54, g.top - 16); ctx.fillText('R', W / 2 + 35, g.top - 10);
    // hạt mang điện chạy trong dây (theo chiều dòng quy ước, tốc độ ∝ I)
    ctx.fillStyle = C.gold;
    const path = [[g.x0, g.top], [g.x0, g.cy], [g.xl, g.cy]], path2 = [[g.xr, g.cy], [g.x1, g.cy], [g.x1, g.top]];
    [path, path2].forEach(pp => {
      const segs = []; let tot = 0; for (let i = 1; i < pp.length; i++) { const l = Math.hypot(pp[i][0] - pp[i - 1][0], pp[i][1] - pp[i - 1][1]); segs.push([pp[i - 1], pp[i], l]); tot += l; }
      for (let d = ph % 22; d < tot; d += 22) { let dd = d; for (const [A, B, l] of segs) { if (dd <= l) { ctx.fillRect(A[0] + (B[0] - A[0]) * dd / l - 2.5, A[1] + (B[1] - A[1]) * dd / l - 2.5, 5, 5); break; } dd -= l; } }
    });
    // điện trường trong khe
    const nE = Math.round(9 * fr);
    for (let k = 0; k < nE; k++) {
      const y = g.cy - g.hp + (k + 0.5) * 2 * g.hp / nE;
      ctx.strokeStyle = 'rgba(216,49,42,.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(g.xl + 3, y); ctx.lineTo(g.xr - 3, y); ctx.stroke();
      head(ctx, W / 2 + 3, y, 1, 0, 'rgba(216,49,42,.9)');
    }
    // bản tụ
    ctx.fillStyle = '#9DA4AD'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.fillRect(g.xl - 6, g.cy - g.hp, 6, 2 * g.hp); ctx.strokeRect(g.xl - 6, g.cy - g.hp, 6, 2 * g.hp);
    ctx.fillRect(g.xr, g.cy - g.hp, 6, 2 * g.hp); ctx.strokeRect(g.xr, g.cy - g.hp, 6, 2 * g.hp);
    const nq = Math.round(8 * fr); ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (let k = 0; k < nq; k++) { const y = g.cy - g.hp + (k + 0.5) * 2 * g.hp / nq; ctx.fillStyle = C.pos; ctx.fillText('+', g.xl - 14, y); ctx.fillStyle = C.neg; ctx.fillText('−', g.xr + 14, y); }
    // vòng Ampère
    const lx = loopF * W, rcm = sr.get(), ry = Math.min(rcm * g.ppc, H * 0.46), rx = Math.max(4, ry * 0.28);
    const inGap = lx > g.xl - 6 && lx < g.xr + 6;
    const Ienc = inGap ? 0 : p.I, Id = inGap ? p.I * Math.min(1, (rcm / 5) ** 2) : 0, B = MU0 * (Ienc + Id) / (2 * Math.PI * rcm / 100);
    ctx.strokeStyle = C.sea; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(lx, g.cy, rx, ry, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(lx, g.cy, rx, ry, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    if (B > 0) head(ctx, lx + rx, g.cy + 2, 0, 1, C.sea);
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.sea; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('vòng Ampère', lx, Math.min(H - 18, g.cy + ry + 6));
    if (inGap && p.I / p.I0 > 0.02) { ctx.fillStyle = C.ink; ctx.textBaseline = 'bottom'; ctx.fillText('I_d', W / 2, g.cy - g.hp - 6); }
    setTxt('amt', fmt(T * p.tau, 's') + ' (' + num(T, 2) + 'τ)'); setTxt('amI', fmt(p.I, 'A')); setTxt('amE', fmt(p.E, 'V/m'));
    setTxt('amId', fmt(p.I, 'A')); setTxt('amEnc', inGap ? 'I_d = ' + fmt(Id, 'A') + ' (khe)' : 'I = ' + fmt(Ienc, 'A') + ' (dây)'); setTxt('amB', fmt(B, 'T'));
    // đồ thị I(t) và I_d(t) (trùng nhau) theo t/τ
    if (sp.ctx) {
      const c2 = sp.ctx, W2 = sp.W, H2 = sp.H, xs = tt => 40 + (W2 - 56) * tt / 6, ys = v => H2 - 24 - (H2 - 40) * v;
      c2.clearRect(0, 0, W2, H2); c2.fillStyle = '#fff'; c2.fillRect(0, 0, W2, H2);
      c2.strokeStyle = C.line; c2.lineWidth = 1; c2.beginPath(); c2.moveTo(40, ys(0)); c2.lineTo(W2 - 16, ys(0)); c2.moveTo(40, ys(0)); c2.lineTo(40, ys(1)); c2.stroke();
      const curve = (f, col, dash, w) => { c2.strokeStyle = col; c2.lineWidth = w; c2.setLineDash(dash); c2.beginPath(); for (let k = 0; k <= 120; k++) { const tt = 6 * k / 120; k ? c2.lineTo(xs(tt), ys(f(tt))) : c2.moveTo(xs(tt), ys(f(tt))); } c2.stroke(); c2.setLineDash([]); };
      curve(tt => 1 - Math.exp(-tt), '#B9C0C8', [], 2);
      curve(tt => Math.exp(-tt), C.ink, [], 3);
      curve(tt => Math.exp(-tt), C.gold, [6, 5], 3);
      c2.strokeStyle = C.ink; c2.setLineDash([3, 4]); c2.lineWidth = 1; c2.beginPath(); c2.moveTo(xs(Math.min(6, T)), 8); c2.lineTo(xs(Math.min(6, T)), H2 - 24); c2.stroke(); c2.setLineDash([]);
      c2.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; c2.textAlign = 'left'; c2.textBaseline = 'top';
      c2.fillStyle = C.ink; c2.fillText('I(t) / I₀', W2 * 0.3, 10); c2.fillStyle = '#B98A00'; c2.fillText('I_d(t) / I₀ (nét đứt, trùng với I)', W2 * 0.3, 28);
      c2.fillStyle = C.muted; c2.fillText('Q(t) / Q_max', W2 * 0.72, 10);
      c2.textAlign = 'right'; c2.fillText('t / τ', W2 - 4, H2 - 34); c2.textAlign = 'center'; for (let k = 0; k <= 6; k++) c2.fillText(String(k), xs(k), H2 - 18 + 0);
    }
  }
  cv.addEventListener('pointerdown', e => { const [x] = xy(cv, e); drag = true; loopF = Math.max(0.1, Math.min(0.9, x / st.W)); cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); });
  cv.addEventListener('pointermove', e => { if (!drag) return; const [x] = xy(cv, e); loopF = Math.max(0.1, Math.min(0.9, x / st.W)); });
  const end = () => { drag = false; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st); watchCanvas(cvp, sp);
  sU.upd(); sRs.upd(); sr.upd();
  if (REDUCED) T = 1;
  draw(phys());
  loopWhenVisible(cv, dt => { if (!REDUCED) T = Math.min(8, T + dt * 0.35); const p = phys(); ph += dt * 90 * (p.I / p.I0); draw(p); });
})();
  },
});
})();
