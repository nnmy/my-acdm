/* =====================================================================
   Bioelectromagnetics: minh họa "Kích thích não sâu (DBS): trường quanh điện cực" (id: dbs, trang 6-fem.html)
   Nhúng vào trang: <div class="demo" id="demoDbs" data-demo="dbs"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=dbs

   Mô hình đối xứng trục (r, z): ∇·(σ∇V) = 0, tích phân yếu có trọng số 2πr.
   - Điện cực: bán kính 0,635 mm (đường kính 1,27 mm), 4 tiếp điểm dài 1,5 mm, cách nhau 1,5 mm (kiểu điện cực DBS
     thông dụng); đầu điện cực ở z = 0. Thân điện cực cách điện (Neumann). Tiếp điểm không hoạt động coi như cách điện
     (đơn giản hóa: thật ra chúng là vật dẫn "trôi").
   - Lớp bao xơ (encapsulation) dày 0,5 mm quanh điện cực, σ chỉnh được; mô não đồng nhất σ = 0,2 S/m.
   - Kích thích đơn cực, cực âm (cathodic); biên ngoài (r = 40 mm, z = −40 / +50 mm) nối đất V = 0.
   - Lưới chữ nhật phân cấp, mỗi ô chia 2 tam giác; nút đánh số theo hàng nên K có dạng dải, giải trực tiếp bằng
     phân rã Cholesky dải (khác với gradient liên hợp ở các demo khác).
   - "VTA" ở đây dùng ngưỡng |E| (thường dùng ~0,2 V/mm cho sợi trục cỡ vài µm, xung ~60 µs); hàm kích hoạt
     rời rạc f_n = (V_{n−1} − 2V_n + V_{n+1}) / Δz² tính dọc một sợi trục song song với điện cực, Δz = 0,5 mm.
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas } = BEM;
const MM = 1e-3, A_LEAD = 0.635 * MM, T_ENC = 0.5 * MM, SIG_B = 0.2;
const CONTACTS = [0, 1, 2, 3].map(k => [k * 3 * MM, (k * 3 + 1.5) * MM]);
const RMAX = 40 * MM, ZMIN = -40 * MM, ZMAX = 50 * MM;

function grid() {
  const r = [], push = (arr, a, b, n, g = 1) => { for (let k = 1; k <= n; k++) arr.push(a + (b - a) * (g === 1 ? k / n : (g ** k - 1) / (g ** n - 1))); };
  r.push(0); push(r, 0, A_LEAD, 4); push(r, A_LEAD, A_LEAD + T_ENC, 5); push(r, A_LEAD + T_ENC, 4 * MM, 14, 1.06); push(r, 4 * MM, RMAX, 18, 1.16);
  const zz = [];
  // -40 → -4 mm (thưa dần ra xa), -4 → -0,5 (đều), -0,5 → 0 (4 ô), 0 → 13,5 (0,25 mm), 13,5 → 50 (thưa dần)
  const far = []; { const n = 14, g = 1.2; for (let k = 0; k <= n; k++) far.push(-4 * MM - (ZMIN * -1 - 4 * MM) * (g ** k - 1) / (g ** n - 1)); }
  far.reverse().forEach(v => zz.push(v));
  push(zz, -4 * MM, -T_ENC, 10); push(zz, -T_ENC, 0, 3); push(zz, 0, 13.5 * MM, 54); push(zz, 13.5 * MM, ZMAX, 16, 1.2);
  return { r: Float64Array.from(r), z: Float64Array.from(zz) };
}
const G = grid(), NR = G.r.length, NZ = G.z.length, NN = NR * NZ;
const nid = (i, j) => j * NR + i;
const IA = [...G.r].findIndex(v => Math.abs(v - A_LEAD) < 1e-9), J0 = [...G.z].findIndex(v => Math.abs(v) < 1e-12);
const insideLead = (i, j) => i < IA && j > J0;   // nút nằm trong thân điện cực (không thuộc miền)

/* phần tử (bất biến), vật liệu: 0 = não, 1 = lớp bao */
const ELS = (() => {
  const T = [], mat = [];
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NR - 1; i++) {
    const rc = (G.r[i] + G.r[i + 1]) / 2, zc = (G.z[j] + G.z[j + 1]) / 2;
    if (rc < A_LEAD && zc > 0) continue;
    const m = (zc > 0 && rc < A_LEAD + T_ENC) || (zc <= 0 && zc > -T_ENC && rc < A_LEAD + T_ENC) ? 1 : 0;
    const a = nid(i, j), b = nid(i + 1, j), c = nid(i + 1, j + 1), d = nid(i, j + 1);
    T.push([a, b, c], [a, c, d]); mat.push(m, m);
  }
  const X = i => G.r[i % NR], Y = i => G.z[Math.floor(i / NR)];
  const geo = T.map(t => { const [p, q, s] = t, b = [Y(q) - Y(s), Y(s) - Y(p), Y(p) - Y(q)], c = [X(s) - X(q), X(p) - X(s), X(q) - X(p)]; return { b, c, A: Math.abs(b[0] * c[1] - b[1] * c[0]) / 2, rc: (X(p) + X(q) + X(s)) / 3 }; });
  return { T, mat, geo, X, Y };
})();

function solve(active, sigEnc) {
  const { T, mat, geo } = ELS, rows = [...Array(NN)].map(() => new Map());
  T.forEach((t, e) => {
    const g = geo[e], s = 2 * Math.PI * g.rc * (mat[e] ? sigEnc : SIG_B) / (4 * g.A);
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) { const m = rows[t[p]]; m.set(t[q], (m.get(t[q]) || 0) + s * (g.b[p] * g.b[q] + g.c[p] * g.c[q])); }
  });
  const V = new Float64Array(NN), fixed = new Int8Array(NN);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NR; i++) {
    const n = nid(i, j);
    if (insideLead(i, j)) { fixed[n] = 2; continue; }
    if (i === NR - 1 || j === 0 || j === NZ - 1) { fixed[n] = 1; V[n] = 0; }
    if (i === IA && j >= J0) { const [z0, z1] = CONTACTS[active], z = G.z[j]; if (z >= z0 - 1e-9 && z <= z1 + 1e-9) { fixed[n] = 3; V[n] = 1; } }
  }
  // hệ trên các nút tự do, giữ nguyên thứ tự → ma trận dải
  const map = new Int32Array(NN).fill(-1), free = [];
  for (let n = 0; n < NN; n++) if (!fixed[n]) { map[n] = free.length; free.push(n); }
  const n = free.length; let bw = 0;
  free.forEach((g, r) => rows[g].forEach((_, h) => { if (map[h] >= 0) bw = Math.max(bw, r - map[h]); }));
  const W = bw + 1, Lb = new Float64Array(n * W), rhs = new Float64Array(n);   // Lb[i*W + (i-j)] = A(i, j), j ≤ i
  free.forEach((g, r) => rows[g].forEach((v, h) => { const c = map[h]; if (c < 0) rhs[r] -= v * V[h]; else if (c <= r) Lb[r * W + (r - c)] = v; }));
  // Cholesky dải tại chỗ
  for (let j = 0; j < n; j++) {
    let s = Lb[j * W]; for (let k = Math.max(0, j - bw); k < j; k++) { const l = Lb[j * W + (j - k)]; s -= l * l; }
    const d = Math.sqrt(s); Lb[j * W] = d;
    for (let i = j + 1; i <= Math.min(n - 1, j + bw); i++) {
      let t = Lb[i * W + (i - j)]; for (let k = Math.max(0, i - bw); k < j; k++) t -= Lb[i * W + (i - k)] * Lb[j * W + (j - k)];
      Lb[i * W + (i - j)] = t / d;
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = rhs[i]; for (let k = Math.max(0, i - bw); k < i; k++) s -= Lb[i * W + (i - k)] * y[k]; y[i] = s / Lb[i * W]; }
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k <= Math.min(n - 1, i + bw); k++) s -= Lb[k * W + (k - i)] * y[k]; y[i] = s / Lb[i * W]; }
  free.forEach((g, r) => { V[g] = y[r]; });
  let I = 0; for (let g = 0; g < NN; g++) if (fixed[g] === 3) rows[g].forEach((v, h) => { I += v * V[h]; });
  const E = ELS.T.map((t, e) => { const g = geo[e]; let er = 0, ez = 0; for (let p = 0; p < 3; p++) { er -= V[t[p]] * g.b[p]; ez -= V[t[p]] * g.c[p]; } return Math.hypot(er, ez) / (2 * g.A); });
  return { V, E, I, n, bw };
}
/* nội suy V tại (r, z) */
function interp(V, r, z) {
  const bs = (a, v) => { let lo = 0, hi = a.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= v) lo = m; else hi = m; } return lo; };
  const i = bs(G.r, r), j = bs(G.z, z), u = (r - G.r[i]) / (G.r[i + 1] - G.r[i]), w = (z - G.z[j]) / (G.z[j + 1] - G.z[j]);
  const a = V[nid(i, j)], b = V[nid(i + 1, j)], c = V[nid(i + 1, j + 1)], d = V[nid(i, j + 1)];
  return u >= w ? a + u * (b - a) + w * (c - b) : a + w * (d - a) + u * (c - d);   // tam giác [a,b,c] hoặc [a,c,d]
}

BEM.demo('dbs', {
  domId: 'demoDbs',
  title: 'Kích thích não sâu (DBS): trường quanh điện cực',
  page: '6-fem.html',
  html: `<div class="demo-title"><h4>Kích thích não sâu (DBS): trường quanh điện cực</h4><span>Mô hình đối xứng trục, giải trực tiếp bằng Cholesky dải</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvDbs" class="ar" role="img" aria-label="Mặt cắt dọc qua điện cực DBS bốn tiếp điểm; màu chỉ độ lớn điện trường, đường viền đen là vùng mô được kích hoạt theo ngưỡng điện trường. Bên dưới là hàm kích hoạt dọc một sợi trục song song với điện cực."></canvas><canvas id="cvDbsP" class="profile" aria-hidden="true"></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Tiếp điểm hoạt động">
        <button class="btn" type="button" data-dbc="0" aria-pressed="false">C0</button>
        <button class="btn" type="button" data-dbc="1" aria-pressed="true">C1</button>
        <button class="btn" type="button" data-dbc="2" aria-pressed="false">C2</button>
        <button class="btn" type="button" data-dbc="3" aria-pressed="false">C3</button>
      </div>
      <div class="btnrow" role="group" aria-label="Chế độ điều khiển">
        <button class="btn" type="button" data-dbm="V" aria-pressed="true">Điều khiển điện áp</button>
        <button class="btn" type="button" data-dbm="I" aria-pressed="false">Điều khiển dòng</button>
      </div>
      <div class="ctrl"><label for="dbAmp">Biên độ (cực âm)</label><output for="dbAmp"></output><input type="range" id="dbAmp" min="0.5" max="5" step="0.1" value="3"></div>
      <div class="ctrl"><label for="dbEnc">σ của lớp bao xơ</label><output for="dbEnc"></output><input type="range" id="dbEnc" min="0.03" max="0.3" step="0.01" value="0.1"></div>
      <div class="ctrl"><label for="dbThr">Ngưỡng kích hoạt |E|</label><output for="dbThr"></output><input type="range" id="dbThr" min="0.1" max="0.5" step="0.01" value="0.2"></div>
      <div class="ctrl"><label for="dbFib">Khoảng cách sợi trục tới trục điện cực</label><output for="dbFib"></output><input type="range" id="dbFib" min="1" max="6" step="0.1" value="2.5"></div>
      <dl class="readout" aria-live="polite">
        <dt>Trở kháng</dt><dd id="dbZ">—</dd>
        <dt id="dbOL">Dòng điện</dt><dd id="dbO">—</dd>
        <dt>Thể tích VTA</dt><dd class="big" id="dbVta">—</dd>
        <dt>Bán kính VTA ngang tiếp điểm</dt><dd id="dbRad">—</dd>
        <dt>Hàm kích hoạt lớn nhất</dt><dd id="dbAf">—</dd>
        <dt>Số ẩn; nửa băng thông</dt><dd id="dbN">—</dd>
      </dl>
      <p class="note-s">Giảm σ của lớp bao xơ (mô sẹo dày lên sau vài tuần): ở chế độ điện áp, trở kháng tăng nên dòng và VTA giảm; ở chế độ dòng, VTA gần như không đổi. Đây là một lý do các máy DBS mới chuyển sang điều khiển dòng.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvDbs'), cvP = document.getElementById('cvDbsP'), st = {}, stP = {};
    let active = 1, mode = 'V', S = null, cache = {}, pend = false, scale = 1, af = null;
    const rAmp = range('dbAmp', { show: v => num(v, 2) + (mode === 'V' ? ' V' : ' mA'), onInput: () => post() });
    const rEnc = range('dbEnc', { show: v => num(v, 2) + ' S/m', onInput: () => schedule() });
    const rThr = range('dbThr', { show: v => num(v, 2) + ' V/mm', onInput: () => post() });
    const rFib = range('dbFib', { show: v => num(v, 2) + ' mm', onInput: () => post() });
    const group = (sel, fn) => { const bs = [...document.querySelectorAll(sel)]; bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b); })); };
    group('#demoDbs [data-dbc]', b => { active = +b.dataset.dbc; schedule(); });
    group('#demoDbs [data-dbm]', b => { mode = b.dataset.dbm; rAmp.upd(); });
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function schedule() { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; run(); }); }
    function run() {
      const key = active + ':' + rEnc.get().toFixed(2);
      S = cache[key] || (cache[key] = solve(active, rEnc.get()));
      const keys = Object.keys(cache); if (keys.length > 12) delete cache[keys[0]];
      post();
    }
    function post() {
      if (!S) return;
      const amp = rAmp.get(); scale = mode === 'V' ? amp : amp * 1e-3 / S.I;   // độ lớn điện thế của tiếp điểm (V)
      const thr = rThr.get() * 1000;
      set('dbZ', fmt(1 / S.I, 'Ω'));
      if (mode === 'V') { set('dbOL', 'Dòng điện'); set('dbO', fmt(scale * S.I, 'A')); } else { set('dbOL', 'Điện áp tiếp điểm'); set('dbO', '−' + fmt(scale, 'V')); }
      let vol = 0; S.E.forEach((e, k) => { if (e * scale >= thr) { const g = ELS.geo[k]; vol += 2 * Math.PI * g.rc * g.A; } });
      set('dbVta', num(vol * 1e9, 3) + ' mm³');
      const zc = (CONTACTS[active][0] + CONTACTS[active][1]) / 2; let rad = 0;
      for (let r = A_LEAD + 0.01 * MM; r < 20 * MM; r += 0.02 * MM) { const e = Math.abs(interp(S.V, r + 0.01 * MM, zc) - interp(S.V, r - 0.01 * MM, zc)) / (0.02 * MM) * scale; if (e < thr) break; rad = r; }
      set('dbRad', rad ? num(rad / MM, 3) + ' mm' : '< bề mặt');
      // hàm kích hoạt dọc sợi trục ở r = xf (cực âm: V = −scale·V₁)
      const xf = rFib.get() * MM, dz = 0.5 * MM, zs = [], vs = [];
      for (let z = -10 * MM; z <= 22 * MM + 1e-9; z += dz) { zs.push(z); vs.push(-scale * interp(S.V, xf, z)); }
      af = zs.slice(1, -1).map((z, k) => [z, (vs[k] - 2 * vs[k + 1] + vs[k + 2]) / (dz * dz)]);
      const fm = Math.max(...af.map(p => p[1]));
      set('dbAf', num(fm * 1e-6 * 1000, 3) + ' mV/mm²');
      set('dbN', S.n + '; ' + S.bw);
      draw(); drawP();
    }
    function color(v) { if (v < 0.5) { const t = v / 0.5; return `rgb(255,${255 - 61 * t | 0},${240 - 192 * t | 0})`; } const t = (v - 0.5) / 0.5; return `rgb(${242 - 103 * t | 0},${194 - 165 * t | 0},${48 - 26 * t | 0})`; }
    function draw() {
      if (!st.ctx || !S) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const zLo = -7 * MM, zHi = 15 * MM; let s = (H - 40) / (zHi - zLo), rW = (W - 4) / (2 * s); if (rW < 6 * MM) { rW = 6 * MM; s = (W - 4) / (2 * rW); } rW = Math.min(rW, 20 * MM); const cx = W / 2, by = H - 14 - (H - 40 - s * (zHi - zLo)) / 2;
      const P = (r, z) => [cx + r * s, by - (z - zLo) * s];
      const thr = rThr.get() * 1000, lo = Math.log10(thr) - 1.3, hi = Math.log10(thr) + 1.2;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - rW * s, by - (zHi - zLo) * s, 2 * rW * s, (zHi - zLo) * s); ctx.clip();
      ELS.T.forEach((t, e) => {
        const z0 = ELS.Y(t[0]); if (z0 > zHi || ELS.Y(t[2]) < zLo || ELS.X(t[0]) > rW) return;
        const v = (Math.log10(S.E[e] * scale + 1e-12) - lo) / (hi - lo), col = color(Math.max(0, Math.min(1, v)));
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.6;
        for (const sg of [1, -1]) { ctx.beginPath(); t.forEach((n, q) => { const [x, y] = P(sg * ELS.X(n), ELS.Y(n)); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      });
      // đường viền VTA: cạnh giữa phần tử trên / dưới ngưỡng (theo ô lưới)
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
      const on = new Uint8Array(NR * NZ); const cellOn = (i, j) => (i >= 0 && j >= 0 && i < NR - 1 && j < NZ - 1) ? on[j * NR + i] : 0;
      { let k = 0; for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NR - 1; i++) { const rc = (G.r[i] + G.r[i + 1]) / 2, zc = (G.z[j] + G.z[j + 1]) / 2; if (rc < A_LEAD && zc > 0) continue; on[j * NR + i] = (S.E[k] + S.E[k + 1]) / 2 * scale >= thr ? 1 : 0; k += 2; } }
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NR - 1; i++) {
        if (!cellOn(i, j)) continue;
        const seg = (r0, z0, r1, z1) => { for (const sg of [1, -1]) { const a = P(sg * r0, z0), b = P(sg * r1, z1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } };
        if (!cellOn(i + 1, j)) seg(G.r[i + 1], G.z[j], G.r[i + 1], G.z[j + 1]);
        if (i > 0 && !cellOn(i - 1, j) && !(i - 1 < IA && j >= J0)) seg(G.r[i], G.z[j], G.r[i], G.z[j + 1]);
        if (!cellOn(i, j + 1) && !(i < IA && j + 1 >= J0)) seg(G.r[i], G.z[j + 1], G.r[i + 1], G.z[j + 1]);
        if (!cellOn(i, j - 1)) seg(G.r[i], G.z[j], G.r[i + 1], G.z[j]);
      }
      ctx.stroke();
      // lớp bao xơ
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(27,25,32,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      { const e = A_LEAD + T_ENC; const a = P(-e, zHi), b = P(-e, -T_ENC), c = P(e, -T_ENC), d = P(e, zHi); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); }
      ctx.stroke(); ctx.setLineDash([]);
      // điện cực
      { const [x0, y0] = P(-A_LEAD, zHi), [x1, y1] = P(A_LEAD, 0); ctx.fillStyle = '#d9dde2'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); }
      CONTACTS.forEach(([z0, z1], k) => { const [x0, y0] = P(-A_LEAD, z1), [x1, y1] = P(A_LEAD, z0); ctx.fillStyle = k === active ? C.neg : '#8b929b'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = C.ink; ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('C' + k, x0 - 4 - T_ENC * s, (y0 + y1) / 2); });
      // sợi trục
      { const xf = rFib.get() * MM, [x, y0] = P(xf, zHi), [, y1] = P(xf, zLo); ctx.strokeStyle = C.sea; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.ink; ctx.fillText('|E| (thang log) và vùng |E| ≥ ngưỡng', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('nét đứt xám: lớp bao xơ; nét đứt xanh: sợi trục', 10, 24);
      // thước 2 mm
      const [sx, sy] = [W - 16 - 2 * MM * s, H - 14]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 2 * MM * s, sy); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('2 mm', sx + MM * s, sy - 3);
    }
    function drawP() {
      if (!stP.ctx || !af) return;
      const { ctx, W, H } = stP; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x0 = 46, x1 = W - 12, y0 = 24, y1 = H - 22, mx = Math.max(...af.map(p => Math.abs(p[1]))) || 1;
      const zA = af[0][0], zB = af[af.length - 1][0], px = z => x0 + (z - zA) / (zB - zA) * (x1 - x0), ym = (y0 + y1) / 2, py = v => ym - v / mx * (y1 - y0) / 2;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke();
      const bw = Math.max(1.5, (x1 - x0) / af.length * 0.7);
      af.forEach(([z, v]) => { ctx.fillStyle = v > 0 ? C.pos : C.sea; const y = py(v); ctx.fillRect(px(z) - bw / 2, Math.min(y, ym), bw, Math.abs(y - ym)); });
      const [c0, c1] = CONTACTS[active]; ctx.fillStyle = 'rgba(55,135,196,.15)'; ctx.fillRect(px(c0), y0, px(c1) - px(c0), y1 - y0);
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Hàm kích hoạt dọc sợi trục (đỏ: khử cực, xanh: ưu phân cực)', x0, 4);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [-10, -5, 0, 5, 10, 15, 20].forEach(z => ctx.fillText(z + ' mm', px(z * MM), y1 + 4));
    }
    watchCanvas(cv, st, draw); watchCanvas(cvP, stP, drawP);
    rAmp.upd(); rEnc.upd(); rThr.upd(); rFib.upd(); run();
  },
});
})();
