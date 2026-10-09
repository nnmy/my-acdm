/* =====================================================================
   Sinh điện từ: minh họa "Địa hình điện thế" (id: potential, trang 1-dien.html)
   Nhúng vào trang: <div class="demo" id="demoPotential" data-demo="potential"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=potential
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const K = 8.9875517923e9;          // 1 / (4 pi eps0), N m^2 / C^2
const WORLD_W = 0.20;              // khung hình rộng 20 cm
const nC = 1e-9;
const sgnTxt = q => (q > 0 ? '+' : q < 0 ? '−' : '') + Math.abs(q);

/* ---------- mô hình trường của các điện tích điểm ----------
   charges: [{fx, fy, q}] với fx, fy là tọa độ tỉ lệ (0..1) trên canvas, q tính bằng nC.
   Tọa độ canvas: x sang phải, y xuống dưới. */
function px(st, c) { return { x: c.fx * st.W, y: c.fy * st.H, q: c.q }; }
function fieldAt(st, pts, x, y) {
  const s = st.W / WORLD_W;                       // px trên mỗi mét
  let Ex = 0, Ey = 0, V = 0;
  for (const c of pts) {
    if (!c.q) continue;
    const dx = (x - c.x) / s, dy = (y - c.y) / s;
    const r = Math.max(2e-4, Math.hypot(dx, dy)), kq = K * c.q * nC;
    Ex += kq * dx / (r * r * r); Ey += kq * dy / (r * r * r); V += kq / r;
  }
  return { Ex, Ey, V, E: Math.hypot(Ex, Ey) };
}
const cm = (st, pxv) => pxv / st.W * WORLD_W * 100;

/* Đường sức: xuất phát từ điện tích dương (theo E) và từ điện tích âm (ngược E).
   Đường xuất phát từ điện tích âm mà kết thúc ở điện tích dương thì bỏ (đã vẽ từ phía dương).
   Số đường tỉ lệ với |q|. */
const R_CHG = 13;
function traceLines(st, pts) {
  const lines = [], h = 2.5, M = 40;
  pts.forEach((c, i) => {
    if (!c.q) return;
    const n = Math.max(4, Math.round(Math.abs(c.q) * 0.4)), sg = Math.sign(c.q);
    const other = pts.find((o, j) => j !== i && o.q) || { x: c.x + 1, y: c.y };
    const a0 = Math.atan2(other.y - c.y, other.x - c.x);
    for (let k = 0; k < n; k++) {
      const a = a0 + ((k + 0.5) / n) * 2 * Math.PI;
      let x = c.x + Math.cos(a) * (R_CHG + 1), y = c.y + Math.sin(a) * (R_CHG + 1);
      const line = [[x, y]];
      let endAt = -1, pdx = Math.cos(a), pdy = Math.sin(a);
      for (let s = 0; s < 1800; s++) {
        const f1 = fieldAt(st, pts, x, y); if (!f1.E) break;
        const xm = x + sg * f1.Ex / f1.E * h / 2, ym = y + sg * f1.Ey / f1.E * h / 2;
        const f2 = fieldAt(st, pts, xm, ym); if (!f2.E) break;
        const dx = sg * f2.Ex / f2.E, dy = sg * f2.Ey / f2.E;
        if (dx * pdx + dy * pdy < -0.3) break;              // dừng ở điểm trung hòa
        pdx = dx; pdy = dy; x += dx * h; y += dy * h;
        line.push([x, y]);
        if (x < -M || y < -M || x > st.W + M || y > st.H + M) break;
        const hit = pts.findIndex((o, j) => j !== i && o.q && Math.hypot(o.x - x, o.y - y) < R_CHG - 2);
        if (hit >= 0) { endAt = hit; break; }
      }
      if (sg < 0 && endAt >= 0 && pts[endAt].q > 0) continue;
      lines.push({ line, sg });
    }
  });
  return lines;
}
function drawLines(ctx, lines) {
  ctx.strokeStyle = 'rgba(27,25,32,.62)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
  for (const { line } of lines) {
    ctx.beginPath(); line.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  }
  // mũi tên chỉ chiều E dọc theo đường sức
  ctx.fillStyle = 'rgba(27,25,32,.75)';
  for (const { line, sg } of lines) {
    for (let k = 45; k < line.length - 4; k += 70) {
      const [x0, y0] = line[k - 2], [x1, y1] = line[k + 2];
      let dx = (x1 - x0) * sg, dy = (y1 - y0) * sg; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const [x, y] = line[k];
      ctx.beginPath();
      ctx.moveTo(x + dx * 5, y + dy * 5);
      ctx.lineTo(x - dx * 4 - dy * 3.6, y - dy * 4 + dx * 3.6);
      ctx.lineTo(x - dx * 4 + dy * 3.6, y - dy * 4 - dx * 3.6);
      ctx.closePath(); ctx.fill();
    }
  }
}
function drawCharge(ctx, c, label) {
  const col = c.q > 0 ? C.pos : c.q < 0 ? C.neg : '#B9C0C8';
  ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(c.x, c.y, R_CHG, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(c.x - 6, c.y); ctx.lineTo(c.x + 6, c.y);
  if (c.q > 0) { ctx.moveTo(c.x, c.y - 6); ctx.lineTo(c.x, c.y + 6); }
  if (c.q) ctx.stroke();
  if (label) {
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const ty = c.y - R_CHG - 6;
    const w = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(c.x - w / 2, ty - 17, w, 18);
    ctx.fillStyle = C.ink; ctx.fillText(label, c.x, ty);
  }
}
const logLen = (v, ref, a, b, lo, hi) => Math.max(lo, Math.min(hi, a + b * Math.log10(Math.max(1e-30, v) / ref)));

/* Kéo rê: trả về chỉ số đối tượng gần nhất trong bán kính */
function pointerXY(cv, e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));

BEM.demo('potential', {
  domId: 'demoPotential',
  title: 'Địa hình điện thế',
  page: '1-dien.html',
  html: `<div class="demo-title"><h4>Địa hình điện thế</h4><span>Kéo điện tích thử (ô vuông vàng) hoặc hai điện tích</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvPot" class="grab ar" role="img" aria-label="Bản đồ điện thế của hai điện tích với các đường đẳng thế và một điện tích thử kéo rê được."></canvas>
          <canvas id="cvProfile" role="img" aria-label="Đồ thị điện thế V và thành phần điện trường Ex dọc theo đường ngang đi qua điện tích thử." class="profile"></canvas>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="pq1">Điện tích q₁</label><output for="pq1"></output>
            <input type="range" id="pq1" min="-50" max="50" step="1" value="30" class="pos"></div>
          <div class="ctrl"><label for="pq2">Điện tích q₂</label><output for="pq2"></output>
            <input type="range" id="pq2" min="-50" max="50" step="1" value="-30"></div>
          <div class="checks">
            <label><input type="checkbox" id="pHeat" checked> Màu điện thế</label>
            <label><input type="checkbox" id="pIso" checked> Đường đẳng thế</label>
          </div>
          <div class="legend"><span><i style="background:#e98c86"></i>V &gt; 0</span><span><i style="background:#9cc4e4"></i>V &lt; 0</span><span><i style="background:#f2c230"></i>điện tích thử q₀ = +1 nC</span></div>
          <dl class="readout" aria-live="polite">
            <dt>V tại q₀</dt><dd class="big" id="pV">—</dd>
            <dt>|E| tại q₀</dt><dd id="pE">—</dd>
            <dt>Eₓ tại q₀</dt><dd id="pEx">—</dd>
            <dt>Thế năng U = q₀V</dt><dd id="pU">—</dd>
            <dt>Bước đẳng thế ΔV</dt><dd id="pdV">—</dd>
          </dl>
          <p class="note-s">Đồ thị dưới hình: V(x) và Eₓ(x) dọc đường ngang đi qua q₀. Chỗ nào V(x) dốc xuống thì Eₓ dương, chỗ V đạt cực trị thì Eₓ = 0. Hai đường đẳng thế liền kề chênh nhau đúng ΔV, nên chỗ nào các đường dày thì E mạnh. Đường nét đứt là V = 0.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 2: ĐỊA HÌNH ĐIỆN THẾ (heatmap, đẳng thế, điện tích thử, đồ thị V(x), Ex(x))
   ===================================================================== */
(function demoPotential() {
  const cv = document.getElementById('cvPot'), cvp = document.getElementById('cvProfile'); if (!cv) return;
  const st = {}, sp = {};
  const ch = [{ fx: 0.3, fy: 0.55, q: 30 }, { fx: 0.7, fy: 0.55, q: -30 }];
  const probe = { fx: 0.5, fy: 0.3 };
  const show = { heat: true, iso: true };
  const CELL = 4;
  let grid = null, heat = document.createElement('canvas'), dirty = true, drag = null;
  const qFmt = v => sgnTxt(v) + ' nC';
  const a1 = range('pq1', { show: qFmt, onInput: v => { ch[0].q = v; a1.el.classList.toggle('pos', v >= 0); dirty = true; draw(); } });
  const a2 = range('pq2', { show: qFmt, onInput: v => { ch[1].q = v; a2.el.classList.toggle('pos', v >= 0); dirty = true; draw(); } });
  document.getElementById('pHeat').addEventListener('change', e => { show.heat = e.target.checked; draw(); });
  document.getElementById('pIso').addEventListener('change', e => { show.iso = e.target.checked; draw(); });

  // các mức đẳng thế cách đều nhau ΔV, chọn theo điện tích lớn nhất (khoảng 8 mức trong bán kính 2 cm)
  let dV = 1000;
  function levels() {
    const qmax = Math.max(1, Math.abs(ch[0].q), Math.abs(ch[1].q)), vref = K * qmax * nC / 0.02;
    const raw = vref / 8, e = 10 ** Math.floor(Math.log10(raw)), m = raw / e;
    dV = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e;
    const out = []; for (let k = 1; k * dV <= vref * 1.6 && k < 40; k++) out.push(k * dV, -k * dV);
    return out;
  }
  const mix = (a, b, t) => Math.round(a + (b - a) * t);

  function compute() {
    const P = ch.map(c => px(st, c));
    const nx = Math.ceil(st.W / CELL) + 1, ny = Math.ceil(st.H / CELL) + 1;
    const V = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = fieldAt(st, P, i * CELL, j * CELL).V;
    grid = { nx, ny, V };
    heat.width = nx; heat.height = ny;
    const V0 = K * Math.max(1, Math.abs(ch[0].q), Math.abs(ch[1].q)) * nC / 0.03;   // thang màu: V ở 3 cm
    const hc = heat.getContext('2d'), img = hc.createImageData(nx, ny), d = img.data;
    for (let k = 0; k < nx * ny; k++) {
      const t = Math.tanh(V[k] / V0), a = Math.abs(t) * 0.6, c = t > 0 ? [216, 49, 42] : [55, 135, 196];
      d[k * 4] = mix(251, c[0], a); d[k * 4 + 1] = mix(252, c[1], a); d[k * 4 + 2] = mix(253, c[2], a); d[k * 4 + 3] = 255;
    }
    hc.putImageData(img, 0, 0);
    dirty = false;
  }
  function isolines(ctx, L) {
    const { nx, ny, V } = grid;
    ctx.beginPath();
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const v = [V[j * nx + i], V[j * nx + i + 1], V[(j + 1) * nx + i + 1], V[(j + 1) * nx + i]];
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const hits = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a - L) * (b - L) < 0) { const t = (L - a) / (b - a), p = c[e], q = c[(e + 1) % 4]; hits.push([(p[0] + (q[0] - p[0]) * t) * CELL, (p[1] + (q[1] - p[1]) * t) * CELL]); }
      }
      if (hits.length >= 2) { ctx.moveTo(hits[0][0], hits[0][1]); ctx.lineTo(hits[1][0], hits[1][1]); }
      if (hits.length === 4) { ctx.moveTo(hits[2][0], hits[2][1]); ctx.lineTo(hits[3][0], hits[3][1]); }
    }
    ctx.stroke();
  }

  function draw() {
    if (!st.ctx) return;
    if (dirty) compute();
    const { ctx, W, H } = st, P = ch.map(c => px(st, c)), LV = levels();
    ctx.clearRect(0, 0, W, H);
    if (show.heat) { ctx.imageSmoothingEnabled = true; ctx.drawImage(heat, 0, 0, grid.nx * CELL, grid.ny * CELL); }
    else { ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); }
    if (show.iso) {
      ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(27,25,32,.55)'; ctx.setLineDash([]);
      LV.forEach(L => isolines(ctx, L));
      if (ch[0].q * ch[1].q < 0) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(27,25,32,.7)'; isolines(ctx, 0); ctx.setLineDash([]); }
    }
    const pp = { x: probe.fx * W, y: probe.fy * H };
    ctx.strokeStyle = 'rgba(27,25,32,.45)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, pp.y); ctx.lineTo(W, pp.y); ctx.stroke(); ctx.setLineDash([]);
    P.forEach((c, i) => drawCharge(ctx, c, `q${i ? '₂' : '₁'} = ${sgnTxt(ch[i].q)} nC`));
    const f = fieldAt(st, P, pp.x, pp.y);
    if (f.E) {
      const L = logLen(f.E, 500, 10, 8, 10, 60);
      arrow(ctx, pp.x, pp.y, pp.x + f.Ex / f.E * L, pp.y + f.Ey / f.E * L, C.ink, 2.5, 10);
      ctx.font = 'italic 600 15px Georgia, serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('E', pp.x + f.Ex / f.E * (L + 12), pp.y + f.Ey / f.E * (L + 12));
    }
    ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillRect(pp.x - 7, pp.y - 7, 14, 14); ctx.strokeRect(pp.x - 7, pp.y - 7, 14, 14);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(pp.x - 4, pp.y); ctx.lineTo(pp.x + 4, pp.y); ctx.moveTo(pp.x, pp.y - 4); ctx.lineTo(pp.x, pp.y + 4); ctx.stroke();
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    set('pV', fmt(f.V, 'V')); set('pdV', fmt(dV, 'V')); set('pE', fmt(f.E, 'V/m')); set('pEx', fmt(f.Ex, 'V/m')); set('pU', fmt(f.V * nC, 'J'));
    drawProfile(P, pp);
  }

  function drawProfile(P, pp) {
    if (!sp.ctx) return;
    const { ctx, W, H } = sp; ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const xs = [], Vs = [], Es = [], far = [];
    const minD = 0.012 / WORLD_W * st.W;
    for (let x = 0; x <= W; x += 2) {
      const sx = x / W * st.W, f = fieldAt(st, P, sx, pp.y);
      xs.push(x); Vs.push(f.V); Es.push(f.Ex); far.push(P.every(c => Math.hypot(c.x - sx, c.y - pp.y) > minD));
    }
    const lim = arr => Math.max(1e-9, ...arr.filter((_, i) => far[i]).map(Math.abs)) * 1.1;
    const vL = lim(Vs), eL = lim(Es);
    const band = (y0, h, arr, L, col, name, unit) => {
      const mid = y0 + h / 2, ys = v => mid - Math.max(-1, Math.min(1, v / L)) * (h / 2 - 6);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      arr.forEach((v, i) => i ? ctx.lineTo(xs[i], ys(v)) : ctx.moveTo(xs[i], ys(v))); ctx.stroke();
      const k = Math.round(pp.x / 2);
      ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pp.x, ys(arr[Math.min(k, arr.length - 1)]), 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(6, y0 + 4, 150, 18);
      ctx.fillStyle = col; ctx.fillText(`${name}   (±${fmt(L, unit, 2)})`, 10, y0 + 5);
    };
    band(0, H / 2, Vs, vL, C.sea, 'V(x)', 'V');
    band(H / 2, H / 2, Es, eL, C.pos, 'Eₓ(x)', 'V/m');
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(pp.x, 0); ctx.lineTo(pp.x, H); ctx.stroke(); ctx.setLineDash([]);
  }

  cv.addEventListener('pointerdown', e => {
    const [x, y] = pointerXY(cv, e);
    const cands = [['probe', probe], [0, ch[0]], [1, ch[1]]];
    let best = null, bd = 26;
    for (const [k, o] of cands) { const d = Math.hypot(o.fx * st.W - x, o.fy * st.H - y); if (d < bd) { bd = d; best = k; } }
    if (best === null) { best = 'probe'; probe.fx = x / st.W; probe.fy = y / st.H; }     // chạm chỗ trống: đặt điện tích thử
    drag = best; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); draw();
  });
  cv.addEventListener('pointermove', e => {
    if (drag === null) return;
    const [x, y] = pointerXY(cv, e), o = drag === 'probe' ? probe : ch[drag];
    o.fx = clampF(x / st.W, 10 / st.W); o.fy = clampF(y / st.H, 10 / st.H);
    if (drag !== 'probe') dirty = true;
    draw();
  });
  const end = () => { drag = null; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  watchCanvas(cv, st, () => { dirty = true; draw(); });
  watchCanvas(cvp, sp, () => draw());
  a1.upd(); a2.upd(); draw();
})();
  },
});
})();
