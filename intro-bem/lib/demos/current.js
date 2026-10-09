/* =====================================================================
   Sinh điện từ: minh họa "Dòng điện trong vật dẫn" (id: current, trang 1-dien.html)
   Nhúng vào trang: <div class="demo" id="demoCurrent" data-demo="current"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=current
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

BEM.demo('current', {
  domId: 'demoCurrent',
  title: 'Dòng điện trong vật dẫn',
  page: '1-dien.html',
  html: `<div class="demo-title"><h4>Dòng điện trong vật dẫn</h4><span>Chọn vật liệu, chỉnh hiệu điện thế và kích thước mẫu</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvCur" class="ar-wide" role="img" aria-label="Hình động: hạt mang điện trôi trong một mẫu vật dẫn nối với nguồn điện."></canvas>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="mat">Vật liệu</label>
            <select id="mat"></select></div>
          <div class="ctrl"><label for="uu">Hiệu điện thế U</label><output for="uu"></output>
            <input type="range" id="uu" min="-2" max="1" step="0.01" value="0"></div>
          <div class="ctrl"><label for="ll">Chiều dài L</label><output for="ll"></output>
            <input type="range" id="ll" min="1" max="20" step="0.5" value="10"></div>
          <div class="ctrl"><label for="aa">Tiết diện A</label><output for="aa"></output>
            <input type="range" id="aa" min="0" max="3" step="0.01" value="2"></div>
          <dl class="readout" aria-live="polite">
            <dt>Độ dẫn điện σ</dt><dd id="cS">—</dd>
            <dt>Điện trường E = U/L</dt><dd id="cE">—</dd>
            <dt>Mật độ dòng J = σE</dt><dd id="cJ">—</dd>
            <dt>Dòng điện I = JA</dt><dd class="big" id="cI">—</dd>
            <dt>Điện trở R</dt><dd id="cR">—</dd>
            <dt>Điện trở suất ρ</dt><dd id="cRho">—</dd>
            <dt>Công suất nhiệt P = UI</dt><dd id="cP">—</dd>
          </dl>
          <p class="note-s" id="matNote"></p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 3: DÒNG ĐIỆN TRONG VẬT DẪN / MÔ
   MATERIALS: σ gần đúng ở tần số thấp (DC đến vài chục Hz); mô ở ~37 °C.
     kind: 'metal' (electron) | 'ion' (cation + anion)
     cells: kiểu tế bào vẽ trong mẫu (null = không có)
     dens : mật độ hạt hiển thị (chỉ để minh họa)
   ===================================================================== */
const MATERIALS = [
  { id: 'cu',     name: 'Đồng (copper)',                    sigma: 5.96e7, kind: 'metal', dens: 1.0,  bg: '#F3DCC6', cells: null,
    note: 'Kim loại: hạt mang điện là electron tự do (chấm xanh), trôi ngược chiều E. Ion kim loại (chấm xám) đứng yên trong mạng tinh thể.' },
  { id: 'csf',    name: 'Dịch não tủy (CSF)',               sigma: 2.0,    kind: 'ion', dens: 0.55, bg: '#E3F1F7', cells: null,
    note: 'Dịch não tủy là một trong những "mô" dẫn điện tốt nhất trong cơ thể: dung dịch ion gần như không có tế bào. Na⁺ (đỏ) đi theo chiều E, Cl⁻ (xanh) đi ngược lại và nhanh hơn một chút (độ linh động lớn hơn).' },
  { id: 'saline', name: 'Nước muối sinh lý 0,9% (saline)',  sigma: 1.6,    kind: 'ion', dens: 0.5,  bg: '#E8F3F8', cells: null,
    note: 'Giá trị ở khoảng 25 °C. Độ dẫn của dung dịch điện giải tăng khoảng 2%/°C, ở 37 °C cỡ 2 S/m.' },
  { id: 'blood',  name: 'Máu (blood)',                      sigma: 0.7,    kind: 'ion', dens: 0.45, bg: '#FBEDEB', cells: 'rbc',
    note: 'Hồng cầu (chiếm khoảng 45% thể tích) gần như cách điện ở tần số thấp, nên máu dẫn điện kém hơn huyết tương.' },
  { id: 'mus-l',  name: 'Cơ, dọc thớ (muscle, longitudinal)', sigma: 0.4,  kind: 'ion', dens: 0.4,  bg: '#FBE9E6', cells: 'fiber-l',
    note: 'Dòng điện chạy dọc các sợi cơ, theo các "hành lang" dịch ngoại bào dài và thông suốt. Giá trị cỡ 0,3–0,5 S/m tùy nguồn.' },
  { id: 'mus-t',  name: 'Cơ, ngang thớ (muscle, transverse)', sigma: 0.1,  kind: 'ion', dens: 0.4,  bg: '#FBE9E6', cells: 'fiber-t',
    note: 'Cùng mô cơ nhưng dòng điện phải vòng qua từng sợi cơ: độ dẫn thấp hơn khoảng 4–5 lần. Để ý ion dồn lại ở mặt màng tế bào: đó là sự phân cực màng, nguồn gốc của vùng tán sắc β (phần 4).' },
  { id: 'fat',    name: 'Mỡ (fat)',                         sigma: 0.03,   kind: 'ion', dens: 0.3,  bg: '#FDF6DD', cells: 'fat',
    note: 'Tế bào mỡ to, xếp khít, dịch ngoại bào rất ít: độ dẫn điện thấp hơn cơ khoảng 10 lần. Giá trị cỡ 0,02–0,04 S/m.' },
  { id: 'bone',   name: 'Xương vỏ (cortical bone)',         sigma: 0.02,   kind: 'ion', dens: 0.25, bg: '#F1EEE7', cells: 'bone',
    note: 'Chất nền khoáng hóa gần như cách điện; ion chỉ đi được qua các kênh nhỏ chứa dịch.' },
  { id: 'water',  name: 'Nước cất (distilled water)',       sigma: 1e-4,   kind: 'ion', dens: 0.04, bg: '#F7FBFD', cells: null,
    note: 'Rất ít ion tự do (cỡ 10⁻⁴ S/m, tùy độ tinh khiết; nước siêu tinh khiết chỉ 5,5 × 10⁻⁶ S/m). Muốn nước dẫn điện tốt phải có muối hòa tan.' },
];

(function demoCurrent() {
  const cv = document.getElementById('cvCur'); if (!cv) return;
  const sel = document.getElementById('mat');
  MATERIALS.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m.name; sel.appendChild(o); });
  sel.value = 4;
  const st = {};
  let mat = MATERIALS[4], parts = [], cells = [], lattice = [], geo = null;
  const uS = range('uu', { map: v => 10 ** v, show: v => fmt(v, 'V'), onInput: () => calc() });
  const lS = range('ll', { show: v => num(v, 3) + ' cm', onInput: () => { rebuild(); calc(); } });
  const aS = range('aa', { map: v => 10 ** v, show: v => num(v, 3) + ' mm²', onInput: () => { rebuild(); calc(); } });
  sel.addEventListener('change', () => { mat = MATERIALS[+sel.value]; rebuild(); calc(); });

  let Efield = 1;
  function calc() {
    const U = uS.get(), L = lS.get() / 100, A = aS.get() * 1e-6, s = mat.sigma;
    const E = U / L, J = s * E, I = J * A, R = L / (s * A);
    Efield = E;
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    set('cS', '≈ ' + sci(s, 3) + ' S/m'); set('cE', fmt(E, 'V/m')); set('cJ', fmt(J, 'A/m²')); set('cI', fmt(I, 'A'));
    set('cR', fmt(R, 'Ω')); set('cRho', sci(1 / s, 3) + ' Ω·m'); set('cP', fmt(U * I, 'W'));
    document.getElementById('matNote').textContent = mat.note;
  }

  // hình học mẫu theo L và A (thang hiển thị, không theo tỉ lệ thật)
  function geometry() {
    const { W, H } = st;
    const len = W * (0.18 + 0.62 * (lS.get() - 1) / 19);
    const dia = 18 + (H * 0.46 - 18) * (Math.log10(aS.get()) / 3);
    const cx = W / 2, cy = H * 0.6;
    return { x0: cx - len / 2, x1: cx + len / 2, y0: cy - dia / 2, y1: cy + dia / 2, cy, dia };
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function insideCell(x, y) {
    for (const c of cells) { const u = (x - c.x) / c.rx, v = (y - c.y) / c.ry; if (u * u + v * v < 1) return c; }
    return null;
  }
  function rebuild() {
    if (!st.W) return;
    geo = geometry();
    const { x0, x1, y0, y1 } = geo, w = x1 - x0, h = y1 - y0;
    cells = []; lattice = [];
    const add = (x, y, rx, ry) => { if (x + rx > x0 && x - rx < x1 && y + ry > y0 && y - ry < y1) cells.push({ x, y, rx, ry }); };
    if (mat.cells === 'fiber-l') {
      const ry = 5.5, gap = 5;
      for (let y = y0 + ry + 2, row = 0; y < y1 - 2; y += 2 * ry + gap, row++)
        for (let x = x0 - (row % 2) * 30; x < x1 + 60; x += 92) add(x + 40, y, 42, ry);
    } else if (mat.cells === 'fiber-t') {
      const rx = 6, ry = Math.min(26, h * 0.42), gap = 6;
      for (let x = x0 + rx + 3, col = 0; x < x1 - 2; x += 2 * rx + gap, col++)
        for (let y = y0 - (col % 2) * (ry + 3); y < y1 + ry; y += 2 * ry + 6) add(x, y + ry * 0.6, rx, ry);
    } else if (mat.cells === 'fat') {
      const r = Math.max(9, Math.min(22, h * 0.3)), dx = 2 * r + 3, dy = Math.sqrt(3) * (r + 1.5);
      for (let y = y0 + r * 0.6, row = 0; y < y1 + r; y += dy, row++)
        for (let x = x0 + (row % 2) * dx / 2; x < x1 + r; x += dx) add(x, y, r, r);
    } else if (mat.cells === 'rbc') {
      let tries = 0;
      while (tries++ < 4000 && cells.length < w * h / 160) {
        const x = rnd(x0, x1), y = rnd(y0, y1), rot = Math.random() < 0.5;
        const rx = rot ? 6 : 3.4, ry = rot ? 3.4 : 6;
        if (!cells.some(c => Math.hypot(c.x - x, c.y - y) < 12)) add(x, y, rx, ry);
      }
    } else if (mat.cells === 'bone') {
      for (let y = y0 + 8, row = 0; y < y1 + 8; y += 17, row++)
        for (let x = x0 + (row % 2) * 9; x < x1 + 10; x += 18) add(x + rnd(-1, 1), y + rnd(-1, 1), 8.6, 7.8);
    }
    if (mat.kind === 'metal') for (let y = y0 + 6; y < y1 - 3; y += 9) for (let x = x0 + 5; x < x1 - 3; x += 9) lattice.push([x, y]);
    const n = Math.min(700, Math.round(w * h * mat.dens / 70));
    parts = [];
    for (let k = 0; k < n; k++) {
      let x, y, t = 0;
      do { x = rnd(x0 + 2, x1 - 2); y = rnd(y0 + 2, y1 - 2); } while (insideCell(x, y) && t++ < 30);
      if (insideCell(x, y)) continue;
      parts.push({ x, y, s: mat.kind === 'metal' ? -1 : (k % 2 ? 1 : -1) });
    }
  }

  function step(dt) {
    if (!geo) return;
    const { x0, x1, y0, y1 } = geo;
    // tốc độ hiển thị theo thang log của E (không theo tỉ lệ thật)
    const v = REDUCED ? 0 : 8 + 70 * Math.max(0, Math.min(1, Math.log10(Efield / 0.05) / 4.3));
    const jit = REDUCED ? 0 : 0.9;
    for (const p of parts) {
      const mob = p.s < 0 && mat.kind === 'ion' ? 1.5 : 1;          // Cl- linh động hơn Na+
      let nx = p.x + p.s * v * mob * dt + (Math.random() - 0.5) * 2 * jit;
      let ny = p.y + (Math.random() - 0.5) * 2 * jit;
      const c = insideCell(nx, ny);
      if (c) {                                                       // trượt theo màng tế bào
        let gx = (nx - c.x) / (c.rx * c.rx), gy = (ny - c.y) / (c.ry * c.ry); const g = Math.hypot(gx, gy) || 1; gx /= g; gy /= g;
        let dx = nx - p.x, dy = ny - p.y; const dn = dx * gx + dy * gy;
        if (dn < 0) { dx -= dn * gx; dy -= dn * gy; }
        nx = p.x + dx; ny = p.y + dy;
        if (insideCell(nx, ny)) { nx = p.x + (Math.random() - 0.5) * 2; ny = p.y + (Math.random() - 0.5) * 2; if (insideCell(nx, ny)) { nx = p.x; ny = p.y; } }
      }
      if (ny < y0 + 2) ny = y0 + 2; if (ny > y1 - 2) ny = y1 - 2;
      if (nx > x1 - 1) { nx = x0 + 2; ny = rnd(y0 + 2, y1 - 2); if (insideCell(nx, ny)) nx = p.x; }
      if (nx < x0 + 1) { nx = x1 - 2; ny = rnd(y0 + 2, y1 - 2); if (insideCell(nx, ny)) nx = p.x; }
      p.x = nx; p.y = ny;
    }
  }

  function draw() {
    if (!st.ctx || !geo) return;
    const { ctx, W, H } = st, { x0, x1, y0, y1, cy } = geo;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    // mạch ngoài + nguồn
    const top = H * 0.16, ex0 = x0 - 12, ex1 = x1 + 12, bx = W / 2;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(ex0 - 4, y0 - 6); ctx.lineTo(ex0 - 4, top); ctx.lineTo(bx - 10, top);
    ctx.moveTo(bx + 10, top); ctx.lineTo(ex1 + 4, top); ctx.lineTo(ex1 + 4, y0 - 6); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 10, top - 16); ctx.lineTo(bx - 10, top + 16); ctx.stroke();   // cực dương (vạch dài)
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx + 10, top - 8); ctx.lineTo(bx + 10, top + 8); ctx.stroke();     // cực âm (vạch ngắn, dày)
    ctx.font = '600 14px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
    ctx.fillStyle = C.pos; ctx.fillText('+', bx - 22, top - 6); ctx.fillStyle = C.neg; ctx.fillText('−', bx + 23, top - 6);
    ctx.fillStyle = C.ink; ctx.fillText('U = ' + fmt(uS.get(), 'V'), bx, top - 20);
    // chiều dòng điện quy ước trên dây
    arrow(ctx, ex0 + 54, top, ex0 + 30, top, C.ink, 2.5, 9);          // I rời cực dương, đi về điện cực trái
    arrow(ctx, ex1 + 4, top + 46, ex1 + 4, top + 26, C.ink, 2.5, 9);  // rồi từ điện cực phải trở về cực âm
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('I', ex0 + 36, top + 6);
    // mẫu
    ctx.fillStyle = mat.bg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
    // vạch chỉ chiều E
    ctx.strokeStyle = 'rgba(27,25,32,.10)'; ctx.lineWidth = 1;
    for (let y = y0 + 10; y < y1; y += 22) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    const cellFill = { 'fiber-l': '#F2C9C2', 'fiber-t': '#F2C9C2', fat: '#FBEBB5', rbc: '#EBA8A1', bone: '#DCD5C6' }[mat.cells];
    for (const c of cells) {
      ctx.fillStyle = cellFill; ctx.strokeStyle = 'rgba(27,25,32,.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#B9B2A8'; for (const [x, y] of lattice) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    for (const p of parts) {
      ctx.fillStyle = p.s > 0 ? C.pos : C.neg;
      const r = mat.kind === 'metal' ? 1.6 : 2.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // điện cực
    ctx.fillStyle = C.pos; ctx.fillRect(ex0 - 8, y0 - 8, 8, y1 - y0 + 16); ctx.strokeRect(ex0 - 8, y0 - 8, 8, y1 - y0 + 16);
    ctx.fillStyle = C.neg; ctx.fillRect(ex1, y0 - 8, 8, y1 - y0 + 16); ctx.strokeRect(ex1, y0 - 8, 8, y1 - y0 + 16);
    // nhãn E và kích thước
    ctx.fillStyle = C.ink; ctx.font = 'italic 600 15px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    arrow(ctx, (x0 + x1) / 2 - 24, y1 + 14, (x0 + x1) / 2 + 24, y1 + 14, C.ink, 2, 8);
    ctx.fillText('E', (x0 + x1) / 2, y1 + 20);
    ctx.font = '500 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted;
    ctx.fillText('L = ' + num(lS.get(), 3) + ' cm', (x0 + x1) / 2, y1 + 40);
  }

  watchCanvas(cv, st, () => { rebuild(); draw(); });
  uS.upd(); lS.upd(); aS.upd(); rebuild(); calc(); draw();
  loopWhenVisible(cv, dt => { step(dt); draw(); });
})();
  },
});
})();
