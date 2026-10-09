/* =====================================================================
   Sinh điện từ: minh họa "Nam châm và cuộn dây" (id: faraday, trang 3-maxwell.html)
   Nhúng vào trang: <div class="demo" id="demoFaraday" data-demo="faraday"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=faraday
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

BEM.demo('faraday', {
  domId: 'demoFaraday',
  title: 'Nam châm và cuộn dây',
  page: '3-maxwell.html',
  html: `<div class="demo-title"><h4>Nam châm và cuộn dây</h4><span>Kéo nam châm qua lại, hoặc bật chế độ tự dao động</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvFa" class="grab ar" role="img" aria-label="Nam châm chuyển động dọc trục một cuộn dây; điện kế chỉ suất điện động cảm ứng."></canvas>
          <canvas id="cvFaPlot" class="profile" role="img" aria-label="Đồ thị từ thông và suất điện động theo thời gian."></canvas>
        </div>
        <div class="panel">
          <div class="btnrow" role="group" aria-label="Chế độ">
            <button class="btn" type="button" data-fmode="osc" aria-pressed="true">Tự dao động</button>
            <button class="btn" type="button" data-fmode="drag" aria-pressed="false">Kéo bằng tay</button>
            <button class="btn" type="button" id="faFlip">Lật nam châm</button>
          </div>
          <div class="ctrl"><label for="faN">Số vòng dây N</label><output for="faN"></output><input type="range" id="faN" min="1" max="500" step="1" value="100"></div>
          <div class="ctrl"><label for="faT">Chu kỳ dao động</label><output for="faT"></output><input type="range" id="faT" min="0.3" max="4" step="0.1" value="1.5"></div>
          <dl class="readout" aria-live="polite">
            <dt>Vị trí x</dt><dd id="faX">—</dd>
            <dt>Vận tốc v</dt><dd id="faV">—</dd>
            <dt>Từ thông NΦ<sub>B</sub></dt><dd id="faPhi">—</dd>
            <dt>Suất điện động ℰ</dt><dd class="big" id="faE">—</dd>
          </dl>
          <p class="note-s">Mũi tên vàng trong cuộn dây: từ trường do dòng cảm ứng sinh ra. Khi nam châm tiến lại gần, nó đẩy nam châm ra; khi nam châm rời xa, nó kéo lại (định luật Lenz). Ở chính giữa cuộn dây, Φ đạt cực đại nên ℰ = 0.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 3: FARADAY. Nam châm (lưỡng cực m = 1 A·m²) chuyển động dọc trục cuộn dây bán kính 2 cm.
   ===================================================================== */
(function demoFaraday() {
  const cv = document.getElementById('cvFa'), cvp = document.getElementById('cvFaPlot'); if (!cv) return;
  const st = {}, sp = {}, WW = 0.30, a = 0.02, m = 1, AMP = 0.11, SPAN = 6;
  let mode = 'osc', flip = 1, x = -AMP, v = 0, t = 0, phase = -Math.PI / 2, drag = false, dragX = null, hist = [];
  const sN = range('faN', { show: v => String(v) });
  const sT = range('faT', { show: v => num(v, 2) + ' s' });
  const btns = [...document.querySelectorAll('#demoFaraday [data-fmode]')];
  btns.forEach(b => b.addEventListener('click', () => { pressGroup(btns, b); mode = b.dataset.fmode; }));
  document.getElementById('faFlip').addEventListener('click', () => { flip *= -1; });
  const phi1 = xx => flip * MU0 * m * a * a / (2 * Math.pow(a * a + xx * xx, 1.5));
  const dphi = xx => -flip * 1.5 * MU0 * m * a * a * 2 * xx / (2 * Math.pow(a * a + xx * xx, 2.5));
  function step(dt) {
    t += dt;
    if (mode === 'osc' && !drag) { const w = 2 * Math.PI / sT.get(); phase += w * dt; x = AMP * Math.sin(phase); v = AMP * w * Math.cos(phase); }
    else {
      const nx = dragX === null ? x : dragX, vv = dt ? (nx - x) / dt : 0;
      v += (vv - v) * Math.min(1, dt * 12); x = nx; if (!drag) v *= Math.max(0, 1 - dt * 8);
      phase = Math.asin(Math.max(-1, Math.min(1, x / AMP)));
    }
    const N = sN.get(), Phi = N * phi1(x), emf = -N * dphi(x) * v;
    hist.push([t, Phi, emf]); while (hist.length && hist[0][0] < t - SPAN) hist.shift();
    return { N, Phi, emf };
  }
  function dipoleLines(ctx, mx, my, dir) {
    ctx.strokeStyle = 'rgba(27,25,32,.22)'; ctx.lineWidth = 1;
    for (const L of [30, 48, 75, 115, 175]) for (const side of [1, -1]) {
      ctx.beginPath();
      for (let k = 0; k <= 80; k++) { const th = 0.05 + (Math.PI - 0.1) * k / 80, r = L * Math.sin(th) ** 2, px = mx + dir * r * Math.cos(th), py = my + side * r * Math.sin(th); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  }
  let emfMax = 1e-6;
  function draw(r) {
    if (!st.ctx) return;
    const { ctx, W, H } = st, s = W / WW, cx = W / 2, cy = H * 0.55, ap = a * s * 1.35;
    bg(ctx, W, H);
    const mx = cx + x * s, ml = 0.04 * s, mh = 0.014 * s;
    dipoleLines(ctx, mx, cy, flip);
    ctx.strokeStyle = 'rgba(27,25,32,.35)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke(); ctx.setLineDash([]);
    const turns = Math.min(10, Math.max(2, Math.round(Math.log10(r.N + 1) * 4))), sp_ = 7, rx = ap * 0.3;
    const xs = [...Array(turns)].map((_, i) => cx + (i - (turns - 1) / 2) * sp_);
    ctx.strokeStyle = '#B98A5E'; ctx.lineWidth = 2.4;
    xs.forEach(X => { ctx.beginPath(); ctx.ellipse(X, cy, rx, ap, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); });
    // nam châm
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillStyle = flip > 0 ? C.neg : C.pos; ctx.fillRect(mx - ml / 2, cy - mh / 2, ml / 2, mh);
    ctx.fillStyle = flip > 0 ? C.pos : C.neg; ctx.fillRect(mx, cy - mh / 2, ml / 2, mh);
    ctx.strokeRect(mx - ml / 2, cy - mh / 2, ml, mh);
    ctx.font = '700 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(flip > 0 ? 'S' : 'N', mx - ml / 4, cy + 1); ctx.fillText(flip > 0 ? 'N' : 'S', mx + ml / 4, cy + 1);
    ctx.strokeStyle = '#B98A5E'; ctx.lineWidth = 2.4;
    xs.forEach(X => { ctx.beginPath(); ctx.ellipse(X, cy, rx, ap, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); });
    // dây ra điện kế
    const gx = W - 70, gy = 64;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(xs[xs.length - 1], cy - ap); ctx.lineTo(xs[xs.length - 1], gy + 26); ctx.lineTo(gx - 20, gy + 26);
    ctx.moveTo(xs[0], cy - ap); ctx.lineTo(xs[0], gy + 38); ctx.lineTo(gx + 20, gy + 38); ctx.lineTo(gx + 20, gy + 26); ctx.stroke();
    // điện kế
    emfMax = Math.max(1e-6, ...hist.map(h => Math.abs(h[2])));
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy + 24, 44, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; for (let k = -4; k <= 4; k++) { const an = -Math.PI / 2 + k * Math.PI / 12; ctx.beginPath(); ctx.moveTo(gx + Math.cos(an) * 36, gy + 24 + Math.sin(an) * 36); ctx.lineTo(gx + Math.cos(an) * 42, gy + 24 + Math.sin(an) * 42); ctx.stroke(); }
    const ang = -Math.PI / 2 + Math.max(-1, Math.min(1, r.emf / emfMax)) * Math.PI / 3;
    ctx.strokeStyle = C.pos; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, gy + 24); ctx.lineTo(gx + Math.cos(ang) * 38, gy + 24 + Math.sin(ang) * 38); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = 'italic 600 14px Georgia, serif'; ctx.fillText('ℰ', gx, gy + 12);
    // dòng cảm ứng và từ trường cảm ứng (Lenz)
    const k = r.emf / emfMax;
    if (Math.abs(k) > 0.04) {
      const L = 14 + 34 * Math.min(1, Math.abs(k)), sg = Math.sign(r.emf);
      arrow(ctx, cx - sg * L / 2, cy - ap - 14, cx + sg * L / 2, cy - ap - 14, C.gold, 6, 12);
      arrow(ctx, cx - sg * L / 2, cy - ap - 14, cx + sg * L / 2, cy - ap - 14, C.ink, 2, 9);
      ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textBaseline = 'bottom'; ctx.fillText('B cảm ứng', cx, cy - ap - 22);
      const fx = xs[xs.length - 1] + rx;      // mặt trước của vòng dây: ℰ > 0 thì dòng đi xuống
      arrow(ctx, fx + 4, cy - sg * 10, fx + 4, cy + sg * 10, C.ink, 2.2, 8);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('I', fx + 10, cy);
    }
    setTxt('faX', num(x * 100, 3) + ' cm'); setTxt('faV', fmt(v, 'm/s')); setTxt('faPhi', fmt(r.Phi, 'Wb')); setTxt('faE', fmt(r.emf, 'V'));
    bandPlot(sp, [{ name: 'NΦ(t)', unit: 'Wb', color: C.sea, data: hist.map(h => [h[0], h[1]]), floor: 1e-9 }, { name: 'ℰ(t)', unit: 'V', color: C.pos, data: hist.map(h => [h[0], h[2]]), floor: 1e-6 }], t, SPAN);
  }
  cv.addEventListener('pointerdown', e => {
    const [px] = xy(cv, e), s = st.W / WW;
    drag = true; dragX = Math.max(-0.14, Math.min(0.14, (px - st.W / 2) / s));
    pressGroup(btns, btns[1]); mode = 'drag'; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing');
  });
  cv.addEventListener('pointermove', e => { if (!drag) return; const [px] = xy(cv, e); dragX = Math.max(-0.14, Math.min(0.14, (px - st.W / 2) / (st.W / WW))); });
  const end = () => { drag = false; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st); watchCanvas(cvp, sp);
  sN.upd(); sT.upd();
  let last = step(0); draw(last);
  loopWhenVisible(cv, dt => { if (REDUCED && mode === 'osc') dt = 0; last = step(dt); draw(last); });
})();
  },
});
})();
