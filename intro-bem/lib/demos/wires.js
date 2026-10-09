/* =====================================================================
   Sinh điện từ: minh họa "Dây dẫn và từ trường" (id: wires, trang 2-tu.html)
   Nhúng vào trang: <div class="demo" id="demoWires" data-demo="wires"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=wires
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const MU0 = 1.25663706e-6;           // T m / A
const WORLD_W = 0.20;                // khung rộng 20 cm (demo dây dẫn)
const xy = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
function pressGroup(btns, active) { btns.forEach(b => b.setAttribute('aria-pressed', b === active)); }
function dots(ctx, W, H) { ctx.fillStyle = C.line; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) ctx.fillRect(x - .75, y - .75, 1.5, 1.5); }
/* kim la bàn nhỏ: đầu đỏ chỉ theo (bx, by) */
function needle(ctx, x, y, bx, by, L, w = 3) {
  const n = Math.hypot(bx, by); if (!n) return;
  const ux = bx / n, uy = by / n, px = -uy, py = ux;
  ctx.fillStyle = C.pos; ctx.beginPath(); ctx.moveTo(x + ux * L, y + uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
  ctx.fillStyle = '#9DA4AD'; ctx.beginPath(); ctx.moveTo(x - ux * L, y - uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
}

BEM.demo('wires', {
  domId: 'demoWires',
  title: 'Dây dẫn và từ trường',
  page: '2-tu.html',
  html: `<div class="demo-title"><h4>Dây dẫn và từ trường</h4><span>Mặt cắt vuông góc với các dây. ⊙ dòng điện đi ra, ⊗ đi vào</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvWires" class="grab ar" role="img" aria-label="Đường sức từ quanh các dây dẫn thẳng, nhìn theo mặt cắt. Có thể kéo rê dây dẫn."></canvas>
          <span class="hint">Kéo rê dây; chạm chỗ trống để đo B</span>
        </div>
        <div class="panel">
          <div class="btnrow" role="group" aria-label="Cấu hình">
            <button class="btn" type="button" data-wset="one" aria-pressed="true">Một dây</button>
            <button class="btn" type="button" data-wset="same" aria-pressed="false">Cùng chiều</button>
            <button class="btn" type="button" data-wset="loop" aria-pressed="false">Vòng dây</button>
            <button class="btn" type="button" data-wset="coil" aria-pressed="false">Ống dây</button>
          </div>
          <div class="ctrl"><label for="wI">Dòng điện mỗi dây I</label><output for="wI"></output>
            <input type="range" id="wI" min="1" max="50" step="1" value="10"></div>
          <div class="btnrow"><button class="btn" type="button" id="wFlip">Đảo chiều dòng điện</button></div>
          <div class="checks">
            <label><input type="checkbox" id="wLines" checked> Đường sức</label>
            <label><input type="checkbox" id="wNeedles"> Lưới la bàn</label>
          </div>
          <dl class="readout" aria-live="polite">
            <dt>B tại điểm đo</dt><dd class="big" id="wB">—</dd>
            <dt>So với Trái Đất (50 µT)</dt><dd id="wBe">—</dd>
            <dt>Khoảng cách tới dây gần nhất</dt><dd id="wR">—</dd>
            <dt>µ₀I/(2πr) của dây đó</dt><dd id="wB1">—</dd>
          </dl>
          <p class="note-s" id="wNote"></p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 1: DÂY DẪN THẲNG (mặt cắt). Đường sức = đường đồng mức của thế vector Az.
   Az ∝ −Σ I ln r ; giữa hai đường liền kề có cùng từ thông, nên mật độ đường ∝ B.
   ===================================================================== */
(function demoWires() {
  const cv = document.getElementById('cvWires'); if (!cv) return;
  const st = {}, CELL = 5;
  const SETS = {
    one:  { w: [[0.5, 0.5, 1]], note: 'Đường sức là các vòng tròn đồng tâm, thưa dần khi ra xa vì B tỉ lệ nghịch với r.' },
    same: { w: [[0.38, 0.5, 1], [0.62, 0.5, 1]], note: 'Hai dòng điện cùng chiều: ở chính giữa hai dây, từ trường của chúng triệt tiêu (B = 0). Ra xa, cả cặp trông như một dây mang dòng 2I. Hai dây này hút nhau.' },
    loop: { w: [[0.5, 0.3, 1], [0.5, 0.7, -1]], note: 'Mặt cắt của một vòng dây: dòng điện đi ra ở trên, đi vào ở dưới. Ở giữa vòng, từ trường của hai phía cộng lại và hướng dọc theo trục vòng dây.' },
    coil: { w: [...Array(9)].flatMap((_, i) => [[0.26 + i * 0.06, 0.34, 1], [0.26 + i * 0.06, 0.66, -1]]), note: 'Mặt cắt dọc của ống dây (mô hình 2D): bên trong, đường sức gần như song song và cách đều, tức là B gần như đều, theo B = µ₀nI. Bên ngoài B rất yếu. Máy MRI dùng một ống dây siêu dẫn lớn theo đúng nguyên lý này.' },
  };
  let wires = [], dirty = true, A = null, probe = null, drag = -1, cur = 'one';
  const show = { lines: true, needles: false };
  const sI = range('wI', { show: v => v + ' A', onInput: () => { dirty = true; draw(); } });
  const btns = [...document.querySelectorAll('#demoWires [data-wset]')];
  function load(k) {
    cur = k; wires = SETS[k].w.map(([fx, fy, s]) => ({ fx, fy, s }));
    setTxt('wNote', SETS[k].note); dirty = true; probe = null; draw();
  }
  btns.forEach(b => b.addEventListener('click', () => { pressGroup(btns, b); load(b.dataset.wset); }));
  document.getElementById('wFlip').addEventListener('click', () => { wires.forEach(w => w.s *= -1); dirty = true; draw(); });
  document.getElementById('wLines').addEventListener('change', e => { show.lines = e.target.checked; draw(); });
  document.getElementById('wNeedles').addEventListener('change', e => { show.needles = e.target.checked; draw(); });

  const P = () => wires.map(w => ({ x: w.fx * st.W, y: w.fy * st.H, I: w.s * sI.get() }));
  function Bat(pts, x, y) {                     // T, theo trục màn hình
    const s = st.W / WORLD_W; let bx = 0, by = 0;
    for (const w of pts) {
      const dx = (x - w.x) / s, dy = (y - w.y) / s, r2 = Math.max(1e-8, dx * dx + dy * dy);
      const k = MU0 * w.I / (2 * Math.PI * r2);   // dòng đi ra: ngược chiều kim đồng hồ trên màn hình
      bx += k * dy; by += -k * dx;
    }
    return [bx, by];
  }
  function compute(pts) {
    const nx = Math.ceil(st.W / CELL) + 1, ny = Math.ceil(st.H / CELL) + 1;
    const V = new Float32Array(nx * ny), M = new Uint8Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = i * CELL, y = j * CELL; let a = 0, near = false;
      for (const w of pts) { const r = Math.hypot(x - w.x, y - w.y); if (r < 13) near = true; a -= w.I * Math.log(Math.max(r, 1)); }
      const k = j * nx + i; V[k] = a; M[k] = near ? 1 : 0;
      if (!near) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
    }
    A = { nx, ny, V, M, lo, hi };
    dirty = false;
  }
  function contours(ctx, pts) {
    const { nx, ny, V, M, lo, hi } = A;
    const dA = sI.get() * 0.24 * Math.max(1, Math.sqrt(pts.length));
    const k0 = Math.ceil(lo / dA - 0.5), k1 = Math.floor(hi / dA - 0.5);
    if (k1 - k0 > 400) return;
    ctx.strokeStyle = 'rgba(27,25,32,.62)'; ctx.lineWidth = 1.25;
    const heads = [];
    for (let k = k0; k <= k1; k++) {
      const L = (k + 0.5) * dA; let seg = 0;
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const id = [j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i];
        if (id.some(q => M[q])) continue;
        const v = id.map(q => V[q]), c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], h = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e], b = v[(e + 1) % 4];
          if ((a - L) * (b - L) < 0) { const t = (L - a) / (b - a), p = c[e], q = c[(e + 1) % 4]; h.push([(p[0] + (q[0] - p[0]) * t) * CELL, (p[1] + (q[1] - p[1]) * t) * CELL]); }
        }
        if (h.length >= 2) { ctx.moveTo(h[0][0], h[0][1]); ctx.lineTo(h[1][0], h[1][1]); if (++seg % 34 === 17) heads.push([(h[0][0] + h[1][0]) / 2, (h[0][1] + h[1][1]) / 2]); }
        if (h.length === 4) { ctx.moveTo(h[2][0], h[2][1]); ctx.lineTo(h[3][0], h[3][1]); }
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(27,25,32,.8)';
    for (const [x, y] of heads) {
      let [bx, by] = Bat(pts, x, y); const n = Math.hypot(bx, by); if (!n) continue; bx /= n; by /= n;
      ctx.beginPath(); ctx.moveTo(x + bx * 5, y + by * 5); ctx.lineTo(x - bx * 4 - by * 3.6, y - by * 4 + bx * 3.6); ctx.lineTo(x - bx * 4 + by * 3.6, y - by * 4 - bx * 3.6); ctx.fill();
    }
  }
  function drawWire(ctx, w) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w.x, w.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (w.I > 0) { ctx.fillStyle = C.pos; ctx.beginPath(); ctx.arc(w.x, w.y, 3.6, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.strokeStyle = C.neg; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(w.x - 5, w.y - 5); ctx.lineTo(w.x + 5, w.y + 5); ctx.moveTo(w.x + 5, w.y - 5); ctx.lineTo(w.x - 5, w.y + 5); ctx.stroke(); }
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, pts = P();
    if (dirty) compute(pts);
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); dots(ctx, W, H);
    if (show.lines) contours(ctx, pts);
    if (show.needles) for (let y = 22; y < H; y += 40) for (let x = 22; x < W; x += 40) {
      if (pts.some(w => Math.hypot(w.x - x, w.y - y) < 16)) continue;
      const [bx, by] = Bat(pts, x, y); needle(ctx, x, y, bx, by, 9, 2.6);
    }
    pts.forEach(w => drawWire(ctx, w));
    if (probe) {
      const [bx, by] = Bat(pts, probe[0], probe[1]), B = Math.hypot(bx, by);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(probe[0], probe[1], 4, 0, Math.PI * 2); ctx.stroke();
      if (B) arrow(ctx, probe[0], probe[1], probe[0] + bx / B * 30, probe[1] + by / B * 30, C.sea, 2.4, 9);
      let best = null, bd = Infinity; pts.forEach(w => { const d = Math.hypot(w.x - probe[0], w.y - probe[1]); if (d < bd) { bd = d; best = w; } });
      const rM = bd / W * WORLD_W;
      setTxt('wB', fmt(B, 'T')); setTxt('wBe', num(B / 50e-6, 3) + ' lần');
      setTxt('wR', num(rM * 100, 3) + ' cm'); setTxt('wB1', fmt(MU0 * Math.abs(best.I) / (2 * Math.PI * rM), 'T'));
    } else { ['wB', 'wBe', 'wR', 'wB1'].forEach(id => setTxt(id, id === 'wB' ? 'chạm / rê chuột' : '—')); }
  }
  cv.addEventListener('pointerdown', e => {
    const [x, y] = xy(cv, e); let best = -1, bd = 22;
    wires.forEach((w, i) => { const d = Math.hypot(w.fx * st.W - x, w.fy * st.H - y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { drag = best; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); } else probe = [x, y];
    draw();
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = xy(cv, e);
    if (drag >= 0) { wires[drag].fx = clampF(x / st.W, 14 / st.W); wires[drag].fy = clampF(y / st.H, 14 / st.H); dirty = true; draw(); }
    else if (e.pointerType === 'mouse') { probe = [x, y]; draw(); }
  });
  const end = () => { drag = -1; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st, () => { dirty = true; draw(); });
  sI.upd(); load('one');
})();
  },
});
})();
