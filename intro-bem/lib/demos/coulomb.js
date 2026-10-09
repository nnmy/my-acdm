/* =====================================================================
   Sinh điện từ: minh họa "Hai điện tích" (id: coulomb, trang 1-dien.html)
   Nhúng vào trang: <div class="demo" id="demoCoulomb" data-demo="coulomb"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=coulomb
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

BEM.demo('coulomb', {
  domId: 'demoCoulomb',
  title: 'Hai điện tích',
  page: '1-dien.html',
  html: `<div class="demo-title"><h4>Hai điện tích</h4><span>Kéo rê điện tích, hoặc chỉnh q₁, q₂, r</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvCoulomb" class="grab ar" aria-label="Mô phỏng hai điện tích, đường sức điện trường và lực Coulomb. Có thể kéo rê điện tích." role="img"></canvas>
          <span class="hint" id="hintCoulomb">Rê chuột hoặc chạm vào hình để đo E và V</span>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="q1">Điện tích q₁</label><output for="q1"></output>
            <input type="range" id="q1" min="-50" max="50" step="1" value="20" class="pos"></div>
          <div class="ctrl"><label for="q2">Điện tích q₂</label><output for="q2"></output>
            <input type="range" id="q2" min="-50" max="50" step="1" value="-20"></div>
          <div class="ctrl"><label for="rr">Khoảng cách r</label><output for="rr"></output>
            <input type="range" id="rr" min="1" max="16" step="0.1" value="7"></div>
          <div class="checks">
            <label><input type="checkbox" id="cLines" checked> Đường sức</label>
            <label><input type="checkbox" id="cGrid"> Lưới vector E</label>
            <label><input type="checkbox" id="cForce" checked> Lực</label>
          </div>
          <div class="btnrow" role="group" aria-label="Cấu hình mẫu">
            <button class="btn" type="button" data-preset="dipole">Lưỡng cực</button>
            <button class="btn" type="button" data-preset="same">Cùng dấu</button>
            <button class="btn" type="button" data-preset="uneven">Lệch độ lớn</button>
          </div>
          <dl class="readout" aria-live="polite">
            <dt>Lực F (mỗi hạt)</dt><dd class="big" id="oF">—</dd>
            <dt>Loại lực</dt><dd id="oFt">—</dd>
            <dt>E do q₁ tại q₂</dt><dd id="oE12">—</dd>
            <dt>E tại con trỏ</dt><dd id="oEc">—</dd>
            <dt>V tại con trỏ</dt><dd id="oVc">—</dd>
          </dl>
          <p class="note-s">Khung hình rộng 20 cm. Hai mũi tên lực luôn dài bằng nhau: đó là định luật III Newton. Độ dài mũi tên theo thang logarit.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 1: HAI ĐIỆN TÍCH (đường sức, lưới vector, lực Coulomb)
   ===================================================================== */
(function demoCoulomb() {
  const cv = document.getElementById('cvCoulomb'); if (!cv) return;
  const st = {};
  const ch = [{ fx: 0.325, fy: 0.5, q: 20 }, { fx: 0.675, fy: 0.5, q: -20 }];
  let lines = [], cursor = null, drag = -1, dirty = true;
  const show = { lines: true, grid: false, force: true };
  const qFmt = v => sgnTxt(v) + ' nC';
  const s1 = range('q1', { show: qFmt, onInput: v => { ch[0].q = v; s1el.classList.toggle('pos', v >= 0); dirty = true; draw(); } });
  const s2 = range('q2', { show: qFmt, onInput: v => { ch[1].q = v; s2el.classList.toggle('pos', v >= 0); dirty = true; draw(); } });
  const s1el = s1.el, s2el = s2.el;
  const sr = range('rr', { show: v => num(v, 3) + ' cm', onInput: v => { setR(v); } });

  function curR() { const a = px(st, ch[0]), b = px(st, ch[1]); return cm(st, Math.hypot(a.x - b.x, a.y - b.y)); }
  function setR(rcm) {
    const a = px(st, ch[0]), b = px(st, ch[1]);
    let ux = b.x - a.x, uy = b.y - a.y; const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    const half = rcm / 100 / WORLD_W * st.W / 2;
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const m = 24, ok = (x, y) => x > m && x < st.W - m && y > m && y < st.H - m;
    if (!ok(mx - ux * half, my - uy * half) || !ok(mx + ux * half, my + uy * half)) { ux = 1; uy = 0; mx = st.W / 2; my = st.H / 2; }
    ch[0].fx = (mx - ux * half) / st.W; ch[0].fy = (my - uy * half) / st.H;
    ch[1].fx = (mx + ux * half) / st.W; ch[1].fy = (my + uy * half) / st.H;
    dirty = true; draw();
  }
  function syncR() { const r = curR(); sr.el.value = r.toFixed(1); document.querySelector('output[for="rr"]').textContent = num(r, 3) + ' cm'; }

  document.getElementById('cLines').addEventListener('change', e => { show.lines = e.target.checked; draw(); });
  document.getElementById('cGrid').addEventListener('change', e => { show.grid = e.target.checked; draw(); });
  document.getElementById('cForce').addEventListener('change', e => { show.force = e.target.checked; draw(); });
  const PRESETS = { dipole: [20, -20], same: [20, 20], uneven: [40, -10] };
  document.querySelectorAll('#demoCoulomb [data-preset]').forEach(b => b.addEventListener('click', () => {
    const [a, c] = PRESETS[b.dataset.preset];
    s1.set(a); s2.set(c);
    ch[0].fx = 0.5; ch[1].fx = 0.5; ch[0].fy = ch[1].fy = 0.5; ch[0].fx = 0.49; ch[1].fx = 0.51;  // hướng ngang
    sr.set(7);
  }));

  cv.addEventListener('pointerdown', e => {
    const [x, y] = pointerXY(cv, e);
    let best = -1, bd = 26;
    ch.forEach((c, i) => { const p = px(st, c), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { drag = best; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); cursor = null; }
    else cursor = [x, y];
    draw();
  });
  cv.addEventListener('pointermove', e => {
    const [x, y] = pointerXY(cv, e);
    if (drag >= 0) {
      const m = 18 / Math.min(st.W, st.H);
      ch[drag].fx = clampF(x / st.W, 18 / st.W); ch[drag].fy = clampF(y / st.H, 18 / st.H);
      // giữ khoảng cách tối thiểu 1 cm
      const o = ch[1 - drag], a = px(st, ch[drag]), b = px(st, o);
      const minPx = 0.01 / WORLD_W * st.W, d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < minPx) { const ux = d ? (a.x - b.x) / d : 1, uy = d ? (a.y - b.y) / d : 0; ch[drag].fx = (b.x + ux * minPx) / st.W; ch[drag].fy = (b.y + uy * minPx) / st.H; }
      dirty = true; syncR();
    } else if (e.pointerType === 'mouse') cursor = [x, y];
    draw();
  });
  const end = () => { drag = -1; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && drag < 0) { cursor = null; draw(); } });

  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, P = ch.map(c => px(st, c));
    if (dirty) { lines = traceLines(st, P); dirty = false; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    // vạch thước 1 cm
    ctx.fillStyle = C.line;
    const s = W / WORLD_W / 100;
    for (let x = s; x < W; x += s) for (let y = s; y < H; y += s) ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
    if (show.grid) {
      const sp = 34;
      for (let y = sp / 2; y < H; y += sp) for (let x = sp / 2; x < W; x += sp) {
        if (P.some(c => Math.hypot(c.x - x, c.y - y) < 20)) continue;
        const f = fieldAt(st, P, x, y); if (!f.E) continue;
        const L = logLen(f.E, 500, 3, 3.4, 2, 15);
        arrow(ctx, x - f.Ex / f.E * L / 2, y - f.Ey / f.E * L / 2, x + f.Ex / f.E * L / 2, y + f.Ey / f.E * L / 2, C.sea, 1.6, 5);
      }
    }
    if (show.lines) drawLines(ctx, lines);
    // lực
    const rM = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y) / W * WORLD_W;
    const F = K * Math.abs(ch[0].q * ch[1].q) * nC * nC / (rM * rM);
    if (show.force && F > 0) {
      const L = logLen(F, 1e-6, 22, 16, 16, 110), rep = ch[0].q * ch[1].q > 0;
      [[0, 1], [1, 0]].forEach(([i, j], k) => {
        let ux = P[i].x - P[j].x, uy = P[i].y - P[j].y; const d = Math.hypot(ux, uy); ux /= d; uy /= d;
        if (!rep) { ux = -ux; uy = -uy; }
        const x0 = P[i].x + ux * (R_CHG + 2), y0 = P[i].y + uy * (R_CHG + 2);
        arrow(ctx, x0, y0, x0 + ux * L, y0 + uy * L, C.gold, 7, 14);
        arrow(ctx, x0, y0, x0 + ux * L, y0 + uy * L, C.ink, 3, 11);
        ctx.font = 'italic 600 14px Georgia, serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(k ? 'F₁₂' : 'F₂₁', x0 + ux * (L + 14) - uy * 12, y0 + uy * (L + 14) + ux * 12);
      });
    }
    P.forEach((c, i) => drawCharge(ctx, c, `q${i ? '₂' : '₁'} = ${sgnTxt(ch[i].q)} nC`));
    // con trỏ đo
    let f = null;
    if (cursor) {
      f = fieldAt(st, P, cursor[0], cursor[1]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cursor[0], cursor[1], 4, 0, Math.PI * 2); ctx.stroke();
      if (f.E) { const L = logLen(f.E, 500, 6, 6, 6, 34); arrow(ctx, cursor[0], cursor[1], cursor[0] + f.Ex / f.E * L, cursor[1] + f.Ey / f.E * L, C.sea, 2.2, 8); }
    }
    // số liệu
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    set('oF', F > 0 ? fmt(F, 'N') : '0 N');
    set('oFt', F === 0 ? 'không có lực (q = 0)' : ch[0].q * ch[1].q > 0 ? 'đẩy (cùng dấu)' : 'hút (trái dấu)');
    set('oE12', fmt(K * Math.abs(ch[0].q) * nC / (rM * rM), 'V/m'));
    set('oEc', f ? fmt(f.E, 'V/m') : 'rê chuột / chạm');
    set('oVc', f ? fmt(f.V, 'V') : '—');
  }
  watchCanvas(cv, st, () => { dirty = true; draw(); });
  s1.upd(); s2.upd(); syncR(); draw();
})();
  },
});
})();
