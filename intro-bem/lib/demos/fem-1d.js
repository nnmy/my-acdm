/* =====================================================================
   Bioelectromagnetics: minh họa "FEM một chiều: hàm nón, nghiệm và sai số" (id: fem-1d, trang 6-fem.html)
   Nhúng vào trang: <div class="demo" id="demoFem1d" data-demo="fem-1d"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=fem-1d

   Hai bài toán 1D, phần tử tuyến tính (hàm nón), giải hệ ba đường chéo bằng thuật toán Thomas:
   - "lop"  : −(σV')' = 0 qua ba lớp da / mỡ / cơ (dày 2 / 10 / 18 mm), V(0) = 1 V, V(L) = 0.
              Mỗi phần tử nhận MỘT giá trị σ theo trọng tâm (như khi gán nhãn mô cho lưới thật).
              Nghiệm chính xác tuyến tính từng khúc; FEM đúng tuyệt đối nếu nút trùng mặt phân cách.
   - "nhiet": phương trình nhiệt sinh học Pennes ở trạng thái dừng trong cơ, nguồn SAR giảm theo hàm mũ:
              −k θ'' + β θ = ρ·SAR₀·e^(−x/ℓ), θ(0) = θ(L) = 0 (bề mặt được làm mát, như túi nước trong
              điều trị tăng thân nhiệt). k = 0,49 W/(m·K), β = w_b c_b = 2000 W/(m³·K), ρ = 1090 kg/m³,
              SAR₀ = 10 W/kg, ℓ = 5 mm. Nghiệm chính xác giải tích; sai số giảm theo h².
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, watchCanvas } = BEM;
const L = 0.030;
const LAYERS = [{ name: 'Da', x0: 0, x1: 0.002, s: 0.2, col: '#f6dccb' }, { name: 'Mỡ', x0: 0.002, x1: 0.012, s: 0.04, col: '#fbf1c7' }, { name: 'Cơ', x0: 0.012, x1: 0.030, s: 0.35, col: '#f3d0cf' }];
const K_T = 0.49, BETA = 2000, Q0 = 1090 * 10, ELL = 0.005;

/* ----- nghiệm chính xác ----- */
const sigAt = x => (LAYERS.find(l => x < l.x1) || LAYERS[2]).s;
const Rtot = LAYERS.reduce((s, l) => s + (l.x1 - l.x0) / l.s, 0), Jex = 1 / Rtot;
function exLayer(x) {           // V(x)
  let v = 1;
  for (const l of LAYERS) { if (x <= l.x1) return v - Jex * (x - l.x0) / l.s; v -= Jex * (l.x1 - l.x0) / l.s; }
  return 0;
}
const m = Math.sqrt(BETA / K_T), a = 1 / ELL, A = Q0 / (BETA - K_T * a * a);
const em = Math.exp(-m * L), ea = Math.exp(-a * L);
// θ = A e^{-ax} + C1 e^{m(x-L)} + C2 e^{-mx};  θ(0)=0, θ(L)=0
const [c1, c2] = (() => { const a11 = em, a12 = 1, a21 = 1, a22 = em, r1 = -A, r2 = -A * ea, d = a11 * a22 - a12 * a21; return [(r1 * a22 - a12 * r2) / d, (a11 * r2 - a21 * r1) / d]; })();
const exHeat = x => A * Math.exp(-a * x) + c1 * Math.exp(m * (x - L)) + c2 * Math.exp(-m * x);
const dexHeat = x => -a * A * Math.exp(-a * x) + m * c1 * Math.exp(m * (x - L)) - m * c2 * Math.exp(-m * x);

/* ----- lưới ----- */
function meshNodes(N, conform) {
  if (!conform) return Float64Array.from({ length: N + 1 }, (_, i) => L * i / N);
  // phân số phần tử cho từng lớp theo bề dày, mỗi lớp ít nhất 1
  const n = Math.max(3, N), t = LAYERS.map(l => l.x1 - l.x0);
  let k = t.map(v => Math.max(1, Math.round(n * v / L)));
  while (k.reduce((s, v) => s + v, 0) > n) { const i = k.indexOf(Math.max(...k)); k[i]--; }
  while (k.reduce((s, v) => s + v, 0) < n) { let bi = 0, bv = -1; t.forEach((v, i) => { const h = v / k[i]; if (h > bv) { bv = h; bi = i; } }); k[bi]++; }
  const xs = [0]; LAYERS.forEach((l, i) => { for (let j = 1; j <= k[i]; j++) xs.push(l.x0 + (l.x1 - l.x0) * j / k[i]); });
  return Float64Array.from(xs);
}
/* ----- giải ----- */
function thomas(sub, dia, sup, rhs) {   // hệ ba đường chéo, kích thước n
  const n = dia.length, c = new Float64Array(n), d = new Float64Array(n), x = new Float64Array(n);
  c[0] = sup[0] / dia[0]; d[0] = rhs[0] / dia[0];
  for (let i = 1; i < n; i++) { const w = dia[i] - sub[i] * c[i - 1]; c[i] = sup[i] / w; d[i] = (rhs[i] - sub[i] * d[i - 1]) / w; }
  x[n - 1] = d[n - 1]; for (let i = n - 2; i >= 0; i--) x[i] = d[i] - c[i] * x[i + 1];
  return x;
}
const GP = [[-Math.sqrt(3 / 5), 5 / 9], [0, 8 / 9], [Math.sqrt(3 / 5), 5 / 9]];
function solve(prob, N, conform) {
  const X = meshNodes(N, prob === 'lop' && conform), ne = X.length - 1, nn = X.length;
  const dia = new Float64Array(nn), off = new Float64Array(nn), b = new Float64Array(nn), sig = new Float64Array(ne);
  for (let e = 0; e < ne; e++) {
    const h = X[e + 1] - X[e];
    let k11, k12, b1 = 0, b2 = 0;
    if (prob === 'lop') { sig[e] = sigAt((X[e] + X[e + 1]) / 2); k11 = sig[e] / h; k12 = -k11; }
    else {
      k11 = K_T / h + BETA * h / 3; k12 = -K_T / h + BETA * h / 6;
      GP.forEach(([g, w]) => { const xi = (g + 1) / 2, x = X[e] + xi * h, q = Q0 * Math.exp(-x / ELL) * w * h / 2; b1 += q * (1 - xi); b2 += q * xi; });
    }
    dia[e] += k11; dia[e + 1] += k11; off[e] = k12; b[e] += b1; b[e + 1] += b2;   // off[e]: K(e, e+1)
  }
  const V = new Float64Array(nn);
  V[0] = prob === 'lop' ? 1 : 0; V[nn - 1] = 0;
  const n = nn - 2;
  if (n > 0) {
    const sub = new Float64Array(n), d = new Float64Array(n), sup = new Float64Array(n), r = new Float64Array(n);
    for (let i = 0; i < n; i++) { const g = i + 1; d[i] = dia[g]; sub[i] = off[g - 1]; sup[i] = off[g]; r[i] = b[g]; }
    r[0] -= off[0] * V[0]; r[n - 1] -= off[nn - 2] * V[nn - 1];
    const x = thomas(sub, d, sup, r); for (let i = 0; i < n; i++) V[i + 1] = x[i];
  }
  return { X, V, sig, ne };
}
const exact = (prob, x) => prob === 'lop' ? exLayer(x) : exHeat(x);
const dexact = (prob, x) => prob === 'lop' ? -Jex / sigAt(x) : dexHeat(x);
function errors(prob, S) {
  let eV = 0, eD = 0; const { X, V } = S;
  for (let e = 0; e < X.length - 1; e++) {
    const h = X[e + 1] - X[e], g = (V[e + 1] - V[e]) / h;
    for (let k = 0; k <= 8; k++) {
      const xi = (k + 0.5) / 9.0, x = X[e] + xi * h, vh = V[e] + (V[e + 1] - V[e]) * xi;
      eV = Math.max(eV, Math.abs(vh - exact(prob, x))); eD = Math.max(eD, Math.abs(g - dexact(prob, x)));
    }
  }
  return { eV, eD };
}
const NLIST = [2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 24, 30, 36, 40, 48, 60, 80, 100, 120];

BEM.demo('fem-1d', {
  domId: 'demoFem1d',
  title: 'FEM một chiều: hàm nón, nghiệm và sai số',
  page: '6-fem.html',
  html: `<div class="demo-title"><h4>FEM một chiều: hàm nón, nghiệm và sai số</h4><span>Chọn bài toán, số phần tử và cách chia lưới</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvF1" class="ar tall-m" role="img" aria-label="Đồ thị nghiệm FEM tuyến tính từng khúc so với nghiệm chính xác, đạo hàm của nghiệm và đồ thị hội tụ sai số theo kích thước phần tử."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Bài toán">
        <button class="btn" type="button" data-f1p="lop" aria-pressed="true">Điện thế qua lớp mô</button>
        <button class="btn" type="button" data-f1p="nhiet" aria-pressed="false">Nhiệt do SAR</button>
      </div>
      <div class="ctrl"><label for="f1N">Số phần tử</label><output for="f1N"></output><input type="range" id="f1N" min="0" max="${NLIST.length - 1}" step="1" value="4"></div>
      <div class="checks">
        <label id="f1ConfL"><input type="checkbox" id="f1Conf"> Lưới bám mặt phân cách</label>
        <label><input type="checkbox" id="f1Hat" checked> Hiện các hàm nón</label>
      </div>
      <dl class="readout" aria-live="polite">
        <dt>Số ẩn (nút tự do)</dt><dd id="f1Dof">—</dd>
        <dt id="f1EvL">Sai số lớn nhất của V</dt><dd class="big" id="f1Ev">—</dd>
        <dt id="f1EdL">Sai số lớn nhất của E</dt><dd id="f1Ed">—</dd>
        <dt id="f1QL">Dòng J (chính xác)</dt><dd id="f1Q">—</dd>
      </dl>
      <p class="note-s" id="f1Note"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvF1'), st = {};
    let prob = 'lop', conform = false, hats = true, S = null, conv = null;
    const rN = range('f1N', { map: v => NLIST[v | 0], show: v => String(v), onInput: () => run() });
    const group = (sel, fn) => { const bs = [...document.querySelectorAll(sel)]; bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b); })); };
    group('#demoFem1d [data-f1p]', b => { prob = b.dataset.f1p; conv = null; run(); });
    document.getElementById('f1Conf').addEventListener('change', e => { conform = e.target.checked; run(); });
    document.getElementById('f1Hat').addEventListener('change', e => { hats = e.target.checked; draw(); });
    const set = (id, t) => { document.getElementById(id).textContent = t; };

    function convergence() {
      const res = { uni: [], con: [] };
      NLIST.forEach(N => {
        const su = solve(prob, N, false), eu = errors(prob, su); res.uni.push([L / N, eu.eV]);
        if (prob === 'lop') { const sc = solve(prob, N, true), ec = errors(prob, sc); res.con.push([L / (sc.X.length - 1), ec.eV]); }
      });
      return res;
    }
    function run() {
      const N = rN.get();
      document.getElementById('f1ConfL').hidden = prob !== 'lop';
      S = solve(prob, N, conform); const E = errors(prob, S);
      if (!conv) conv = convergence();
      set('f1Dof', String(S.X.length - 2));
      if (prob === 'lop') {
        set('f1EvL', 'Sai số lớn nhất của V'); set('f1EdL', 'Sai số lớn nhất của E');
        set('f1Ev', E.eV < 1e-12 ? '≈ 0 (làm tròn)' : fmt(E.eV, 'V'));
        set('f1Ed', E.eD < 1e-9 ? '≈ 0 (làm tròn)' : fmt(E.eD, 'V/m'));
        set('f1QL', 'Dòng J chính xác; J của FEM');
        const Jh = S.sig[0] * (S.V[0] - S.V[1]) / (S.X[1] - S.X[0]);
        set('f1Q', num(Jex, 3) + '; ' + num(Jh, 3) + ' A/m²');
        set('f1Note', conform
          ? 'Mọi nút mặt phân cách đều là nút lưới: nghiệm FEM trùng nghiệm chính xác dù chỉ có vài phần tử, vì nghiệm thật tuyến tính trong từng lớp.'
          : 'Mỗi phần tử chỉ có một σ (theo trọng tâm). Phần tử nằm vắt qua mặt phân cách bị gán sai mô, nên sai số không giảm đều theo h. Thử 15 hoặc 30 phần tử: nút rơi đúng mặt phân cách.');
      } else {
        set('f1EvL', 'Sai số lớn nhất của θ'); set('f1EdL', 'Sai số lớn nhất của dθ/dx');
        set('f1Ev', fmt(E.eV, 'K')); set('f1Ed', num(E.eD / 1000, 3) + ' K/mm');
        let mx = 0, xm = 0; for (let k = 0; k <= 600; k++) { const x = L * k / 600, v = exHeat(x); if (v > mx) { mx = v; xm = x; } }
        set('f1QL', 'Tăng nhiệt lớn nhất (chính xác)'); set('f1Q', num(mx, 3) + ' K ở ' + num(xm * 1000, 2) + ' mm');
        set('f1Note', 'Nghiệm trơn: sai số của θ giảm theo h² (đường dốc 2 trên đồ thị log–log), còn sai số đạo hàm chỉ giảm theo h. Điểm nóng nằm dưới bề mặt vì mặt da được làm mát.');
      }
      draw();
    }
    function draw() {
      if (!st.ctx || !S) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      const narrow = W < 560, pad = 44, top = narrow ? 46 : 30;
      // màn hình rộng: nghiệm ở trên, đạo hàm + hội tụ cạnh nhau ở dưới; màn hình hẹp: ba khung xếp dọc
      const h1 = narrow ? (H - top) * 0.44 - 26 : (H - top) * 0.58 - 26, y2 = top + h1 + 34;
      const h2 = narrow ? (H - y2 - 60) / 2 : H - y2 - 30;
      const wConv = narrow ? W - pad - 14 : Math.min(W * 0.38, 260), x0 = pad, x1 = W - 16, x1b = narrow ? W - 16 : W - wConv - 34;
      const { X, V } = S;
      const exf = x => exact(prob, x), dexf = x => dexact(prob, x);
      // ---- khung 1: nghiệm ----
      let vmin = 0, vmax = 1;
      if (prob === 'nhiet') { vmax = 0; for (let k = 0; k <= 300; k++) vmax = Math.max(vmax, exf(L * k / 300)); for (let i = 0; i < V.length; i++) vmax = Math.max(vmax, V[i]); vmax *= 1.12; }
      const px = x => x0 + (x / L) * (x1 - x0), py = v => top + h1 - (v - vmin) / (vmax - vmin) * h1;
      if (prob === 'lop') LAYERS.forEach(l => { ctx.fillStyle = l.col; ctx.fillRect(px(l.x0), top, px(l.x1) - px(l.x0), h1); ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const full = l.name + ' (σ = ' + num(l.s, 2) + ')', w = px(l.x1) - px(l.x0); ctx.fillText(ctx.measureText(full).width < w - 6 ? full : l.name, (px(l.x0) + px(l.x1)) / 2, top + h1 - 18); });
      else { // nguồn SAR mờ
        ctx.fillStyle = 'rgba(242,194,48,.18)'; ctx.beginPath(); ctx.moveTo(px(0), top + h1);
        for (let k = 0; k <= 120; k++) { const x = L * k / 120; ctx.lineTo(px(x), top + h1 - Math.exp(-x / ELL) * h1 * 0.9); }
        ctx.lineTo(px(L), top + h1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9a7a12'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('← nguồn ρ·SAR (tương đối)', px(L * 0.2), top + h1 - 4);
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, top, x1 - x0, h1);
      // hàm nón
      if (hats) {
        for (let i = 0; i < X.length; i++) {
          const xa = i > 0 ? X[i - 1] : X[i], xb = i < X.length - 1 ? X[i + 1] : X[i];
          ctx.strokeStyle = 'rgba(55,135,196,.45)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(px(xa), py(0)); ctx.lineTo(px(X[i]), py(V[i])); ctx.lineTo(px(xb), py(0)); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      // nghiệm chính xác
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 400; k++) { const x = L * k / 400; k ? ctx.lineTo(px(x), py(exf(x))) : ctx.moveTo(px(x), py(exf(x))); } ctx.stroke();
      // FEM
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i < X.length; i++) i ? ctx.lineTo(px(X[i]), py(V[i])) : ctx.moveTo(px(X[i]), py(V[i])); ctx.stroke();
      ctx.fillStyle = C.pos; for (let i = 0; i < X.length; i++) { ctx.beginPath(); ctx.arc(px(X[i]), py(V[i]), X.length > 60 ? 1.6 : 3.2, 0, 7); ctx.fill(); }
      // trục
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(prob === 'lop' ? 'Điện thế V (V)' : 'Tăng nhiệt θ = T − T_b (K)', x0, 8);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
      [vmin, (vmin + vmax) / 2, vmax].forEach(v => ctx.fillText(num(v, 2), x0 - 5, py(v)));
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      { let xr = x1; const ly0 = narrow ? 26 : 8; const leg = [['— chính xác', C.ink], ['— FEM', C.pos]]; if (hats) leg.push(['┄ hàm nón × V', C.sea]);
        leg.forEach(([t, c]) => { ctx.fillStyle = c; ctx.fillText(t, xr, ly0); xr -= ctx.measureText(t).width + 14; }); }
      // ---- khung 2: đạo hàm ----
      const dlab = prob === 'lop' ? 'Điện trường E = −dV/dx (V/m)' : 'Gradient dθ/dx (K/mm)', dsc = prob === 'lop' ? 1 : 1e-3;
      const gs = []; for (let e = 0; e < X.length - 1; e++) gs.push((V[e + 1] - V[e]) / (X[e + 1] - X[e]) * (prob === 'lop' ? -1 : 1) * dsc);
      const exd = x => dexf(x) * (prob === 'lop' ? -1 : 1) * dsc;
      let dmin = 0, dmax = 0; for (let k = 0; k <= 300; k++) { const v = exd(L * (k + 0.5) / 301); dmin = Math.min(dmin, v); dmax = Math.max(dmax, v); }
      gs.forEach(v => { dmin = Math.min(dmin, v); dmax = Math.max(dmax, v); }); const span = (dmax - dmin) || 1; dmax += span * 0.08; dmin -= prob === 'lop' ? 0 : span * 0.08;
      const qx = x => x0 + (x / L) * (x1b - x0), qy = v => y2 + h2 - (v - dmin) / (dmax - dmin) * h2;
      if (prob === 'lop') LAYERS.forEach(l => { ctx.fillStyle = l.col; ctx.fillRect(qx(l.x0), y2, qx(l.x1) - qx(l.x0), h2); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, y2, x1b - x0, h2);
      if (dmin < 0) { ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, qy(0)); ctx.lineTo(x1b, qy(0)); ctx.stroke(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 600; k++) { const x = L * k / 600, v = exd(Math.min(L - 1e-9, x)); k ? ctx.lineTo(qx(x), qy(v)) : ctx.moveTo(qx(x), qy(v)); } ctx.stroke();
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.4; ctx.beginPath();
      gs.forEach((v, e) => { ctx.moveTo(qx(X[e]), qy(v)); ctx.lineTo(qx(X[e + 1]), qy(v)); }); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(dlab, x0, y2 - 4);
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      [dmin, dmax].forEach(v => ctx.fillText(num(v, 2), x0 - 5, qy(v)));
      ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      [0, 10, 20, 30].forEach(mm => ctx.fillText(mm + ' mm', qx(mm / 1000), y2 + h2 + 4));
      // ---- khung 3: hội tụ ----
      const cx0 = narrow ? pad : W - wConv - 6, cx1 = W - 14, cy0 = narrow ? y2 + h2 + 46 : y2, cy1 = cy0 + h2;
      const all = conv.uni.concat(conv.con).map(p => p[1]).filter(v => v > 1e-13);
      const hmin = L / 140, hmax = L / 1.6, emin = Math.max(1e-12, Math.min(...all) / 3), emax = Math.max(...all) * 3;
      const lx = h => cx0 + (Math.log(h / hmin) / Math.log(hmax / hmin)) * (cx1 - cx0), ly = e => cy1 - (Math.log(Math.max(e, emin) / emin) / Math.log(emax / emin)) * (cy1 - cy0);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
      const line = (pts, col, dash) => { ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach(([h, e], i) => i ? ctx.lineTo(lx(h), ly(e)) : ctx.moveTo(lx(h), ly(e))); ctx.stroke(); ctx.setLineDash([]); pts.forEach(([h, e]) => { ctx.beginPath(); ctx.arc(lx(h), ly(e), 1.8, 0, 7); ctx.fill(); }); };
      // đường tham chiếu h²
      if (prob === 'nhiet') { const [h0, e0] = conv.uni[0]; line([[h0, e0], [hmin, e0 * (hmin / h0) ** 2]], '#9DA4AD', [3, 3]); ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('∝ h²', lx(hmin * 4) - 6, ly(e0 * (hmin * 4 / h0) ** 2) - 3); }
      line(conv.uni, C.pos);
      if (prob === 'lop') line(conv.con, C.sea);
      const hc = L / (S.X.length - 1), ec = errors(prob, S).eV;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx(hc), ly(ec), 5.5, 0, 7); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('Sai số theo h (log–log)', cx0, cy0 - 4);
      ctx.fillStyle = C.muted; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText('h nhỏ', cx0 + 2, cy1 + 4); ctx.textAlign = 'right'; ctx.fillText('h lớn', cx1, cy1 + 4);
      if (prob === 'lop') { ctx.textAlign = 'left'; ctx.fillStyle = C.pos; ctx.fillText('lưới đều', cx0 + 4, cy0 + 4); ctx.fillStyle = C.sea; ctx.fillText('lưới bám mặt (≈ 0)', cx0 + 4, cy0 + 20); }
    }
    watchCanvas(cv, st, draw);
    rN.upd();
  },
});
})();
