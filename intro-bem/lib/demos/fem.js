/* =====================================================================
   Sinh điện từ: minh họa "Mô phỏng FEM: dòng điện tDCS trong đầu" (id: fem, trang 5-do-lieu.html)
   Nhúng vào trang: <div class="demo" id="demoFem" data-demo="fem"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=fem

   Giải ∇·(σ∇V) = 0 trên mặt cắt đầu 2D (bán kính 9 cm, 4 lớp) bằng phần tử tam giác tuyến tính.
   - Lưới cực có cấu trúc: các vòng tròn trùng với mặt phân cách giữa các lớp (lưới "bám" theo mô).
   - Điện cực: điều kiện Dirichlet V = ±0,5 V trên các nút biên ngoài; nơi khác: không có dòng đi ra (Neumann).
   - Hệ K·V = b giải bằng gradient liên hợp có tiền điều kiện Jacobi.
   - Quy đổi: kết quả 2D được tỉ lệ để dòng tổng = 2 mA chạy qua một lát dày 5 cm (giả định minh họa).
   - σ (S/m): da đầu 0,465; xương sọ 0,01 (chỉnh được); dịch não tủy 1,654; não 0,276 (giá trị mặc định của SimNIBS).
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas } = BEM;
const RB = 0.076, RC = 0.079, RS = 0.085, RH = 0.090;           // bán kính các mặt phân cách (m)
const LAYERS = [['Não', 0.276], ['Dịch não tủy', 1.654], ['Xương sọ', 0.01], ['Da đầu', 0.465]];
const MESH = { coarse: { ns: 36, nb: 6, nc: 1, nk: 2, nsk: 2 }, fine: { ns: 96, nb: 16, nc: 2, nk: 3, nsk: 3 } };
const I_TOTAL = 0.002, DEPTH = 0.05;

BEM.demo('fem', {
  domId: 'demoFem',
  title: 'Mô phỏng FEM: dòng điện tDCS trong đầu',
  page: '5-do-lieu.html',
  html: `<div class="demo-title"><h4>Mô phỏng FEM: dòng điện tDCS trong đầu</h4><span>Lưới tam giác bám theo các lớp mô</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvFem" class="ar" role="img" aria-label="Mặt cắt đầu bốn lớp chia lưới tam giác; màu chỉ độ lớn điện trường hoặc điện thế khi có dòng điện qua hai điện cực."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Lưới">
        <button class="btn" type="button" data-fm="coarse" aria-pressed="false">Lưới thô</button>
        <button class="btn" type="button" data-fm="fine" aria-pressed="true">Lưới mịn</button>
      </div>
      <div class="btnrow" role="group" aria-label="Hiển thị">
        <button class="btn" type="button" data-fvw="E" aria-pressed="true">|E|</button>
        <button class="btn" type="button" data-fvw="V" aria-pressed="false">Điện thế V</button>
      </div>
      <div class="checks"><label><input type="checkbox" id="feMesh"> Hiện lưới</label></div>
      <div class="ctrl"><label for="feSep">Góc giữa hai điện cực</label><output for="feSep"></output><input type="range" id="feSep" min="30" max="180" step="5" value="90"></div>
      <div class="ctrl"><label for="feSk">σ của xương sọ</label><output for="feSk"></output><input type="range" id="feSk" min="-2.7" max="-0.3" step="0.01" value="-2"></div>
      <dl class="readout" aria-live="polite">
        <dt>Số nút; số phần tử</dt><dd id="feN">—</dd>
        <dt>Số vòng lặp CG</dt><dd id="feIt">—</dd>
        <dt>Phần dòng đi vào não</dt><dd class="big" id="feFr">—</dd>
        <dt>E lớn nhất trong não</dt><dd id="feEm">—</dd>
        <dt>E trung bình trong não</dt><dd class="big" id="feEb">—</dd>
        <dt>E trung bình trong da đầu</dt><dd id="feEs">—</dd>
      </dl>
      <p class="note-s">Giá trị E quy đổi cho dòng 2 mA chạy qua một lát dày 5 cm (giả định để minh họa mô hình 2D). Thử kéo hai điện cực lại gần nhau hoặc giảm σ của xương sọ: phần dòng đi vào não giảm hẳn, vì dòng điện chạy tắt qua da đầu.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvFem'), st = {};
    let mesh = 'fine', view = 'E', showMesh = false, M = null, R = null;
    const rSep = range('feSep', { show: v => v + '°', onInput: () => solve() });
    const rSk = range('feSk', { map: v => 10 ** v, show: v => num(v, 3) + ' S/m', onInput: () => solve() });
    const group = (sel, fn) => { const bs = [...document.querySelectorAll(sel)]; bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b); })); };
    group('#demoFem [data-fm]', b => { mesh = b.dataset.fm; build(); solve(); });
    group('#demoFem [data-fvw]', b => { view = b.dataset.fvw; draw(); });
    document.getElementById('feMesh').addEventListener('change', e => { showMesh = e.target.checked; draw(); });

    function build() {
      const p = MESH[mesh], radii = [];
      const seg = (a, b, n) => { for (let k = 1; k <= n; k++) radii.push(a + (b - a) * k / n); };
      seg(0, RB, p.nb); seg(RB, RC, p.nc); seg(RC, RS, p.nk); seg(RS, RH, p.nsk);
      const ns = p.ns, K = radii.length, X = [0], Y = [0];
      radii.forEach(r => { for (let s = 0; s < ns; s++) { const a = 2 * Math.PI * s / ns; X.push(r * Math.sin(a)); Y.push(-r * Math.cos(a)); } });
      const id = (k, s) => 1 + (k - 1) * ns + ((s % ns) + ns) % ns, T = [];
      for (let s = 0; s < ns; s++) T.push([0, id(1, s), id(1, s + 1)]);
      for (let k = 1; k < K; k++) for (let s = 0; s < ns; s++) {
        const a = id(k, s), b = id(k + 1, s), c = id(k + 1, s + 1), d = id(k, s + 1);
        if ((s + k) % 2) { T.push([a, b, c]); T.push([a, c, d]); } else { T.push([a, b, d]); T.push([b, c, d]); }
      }
      const layer = T.map(t => { const r = Math.hypot((X[t[0]] + X[t[1]] + X[t[2]]) / 3, (Y[t[0]] + Y[t[1]] + Y[t[2]]) / 3); return r < RB ? 0 : r < RC ? 1 : r < RS ? 2 : 3; });
      M = { X, Y, T, layer, ns, K, nb: p.nb, outer: [...Array(ns)].map((_, s) => id(K, s)) };
      document.getElementById('feN').textContent = X.length + '; ' + T.length;
    }
    function solve() {
      if (!M) return;
      const { X, Y, T, layer, ns } = M, N = X.length, sig = [LAYERS[0][1], LAYERS[1][1], rSk.get(), LAYERS[3][1]];
      const rows = [...Array(N)].map(() => new Map()), geo = [];
      T.forEach((t, e) => {
        const [i, j, k] = t, b = [Y[j] - Y[k], Y[k] - Y[i], Y[i] - Y[j]], c = [X[k] - X[j], X[i] - X[k], X[j] - X[i]];
        const A = Math.abs(b[0] * c[1] - b[1] * c[0]) / 2, s = sig[layer[e]] / (4 * A);
        geo.push({ b, c, A });
        for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) { const m = rows[t[p]]; m.set(t[q], (m.get(t[q]) || 0) + s * (b[p] * b[q] + c[p] * c[q])); }
      });
      // điện cực trên vòng ngoài cùng
      const V = new Float64Array(N), fixed = new Int8Array(N), half = 8 * Math.PI / 180, sep = rSep.get() * Math.PI / 180;
      M.outer.forEach((n, s) => {
        const a = 2 * Math.PI * s / ns, d = x => Math.abs(Math.atan2(Math.sin(a - x), Math.cos(a - x)));
        if (d(-sep / 2) <= half) { fixed[n] = 1; V[n] = 0.5; } else if (d(sep / 2) <= half) { fixed[n] = -1; V[n] = -0.5; }
      });
      // b = −K_fd · V_d ; giải K_ff x = b bằng PCG Jacobi
      const free = [], map = new Int32Array(N).fill(-1);
      for (let i = 0; i < N; i++) if (!fixed[i]) { map[i] = free.length; free.push(i); }
      const n = free.length, diag = new Float64Array(n), rhs = new Float64Array(n);
      const cols = [], vals = [];
      free.forEach((gi, r) => {
        const cs = [], vs = [];
        rows[gi].forEach((v, gj) => { if (fixed[gj]) rhs[r] -= v * V[gj]; else { cs.push(map[gj]); vs.push(v); if (gj === gi) diag[r] = v; } });
        cols.push(Int32Array.from(cs)); vals.push(Float64Array.from(vs));
      });
      const mul = (x, y) => { for (let r = 0; r < n; r++) { let s = 0; const c = cols[r], v = vals[r]; for (let q = 0; q < c.length; q++) s += v[q] * x[c[q]]; y[r] = s; } };
      const x = new Float64Array(n), rr = Float64Array.from(rhs), z = new Float64Array(n), pp = new Float64Array(n), Ap = new Float64Array(n);
      for (let i = 0; i < n; i++) { z[i] = rr[i] / diag[i]; pp[i] = z[i]; }
      let rz = 0; for (let i = 0; i < n; i++) rz += rr[i] * z[i];
      const bn = Math.sqrt(rhs.reduce((s, v) => s + v * v, 0)) || 1; let it = 0;
      for (; it < 5000; it++) {
        mul(pp, Ap); let pAp = 0; for (let i = 0; i < n; i++) pAp += pp[i] * Ap[i];
        const al = rz / pAp; let rn = 0;
        for (let i = 0; i < n; i++) { x[i] += al * pp[i]; rr[i] -= al * Ap[i]; rn += rr[i] * rr[i]; }
        if (Math.sqrt(rn) / bn < 1e-9) { it++; break; }
        let rz2 = 0; for (let i = 0; i < n; i++) { z[i] = rr[i] / diag[i]; rz2 += rr[i] * z[i]; }
        const be = rz2 / rz; rz = rz2; for (let i = 0; i < n; i++) pp[i] = z[i] + be * pp[i];
      }
      free.forEach((gi, r) => { V[gi] = x[r]; });
      // dòng tổng (trên mỗi mét chiều sâu) = tổng phản lực ở điện cực dương
      let Itot = 0; for (let i = 0; i < N; i++) if (fixed[i] === 1) rows[i].forEach((v, j) => { Itot += v * V[j]; });
      const scale = (I_TOTAL / DEPTH) / Itot;
      const E = T.map((t, e) => { const g = geo[e]; let ex = 0, ey = 0; for (let p = 0; p < 3; p++) { ex -= V[t[p]] * g.b[p]; ey -= V[t[p]] * g.c[p]; } return [ex / (2 * g.A) * scale, ey / (2 * g.A) * scale]; });
      // dòng đi qua mặt não: các phần tử ở vòng não ngoài cùng
      let Ib = 0; const kb = M.nb, base = ns + 2 * ns * (kb - 2);
      for (let s = 0; s < ns; s++) for (const e of [base + 2 * s, base + 2 * s + 1]) {
        const t = T[e], cx = (X[t[0]] + X[t[1]] + X[t[2]]) / 3, cy = (Y[t[0]] + Y[t[1]] + Y[t[2]]) / 3, r = Math.hypot(cx, cy);
        Ib += Math.abs(sig[0] * (E[e][0] * cx + E[e][1] * cy) / r) * (RB * Math.PI / ns);
      }
      Ib /= 2;                                          // vào = ra
      let em = 0, eb = 0, ab = 0, es = 0, as = 0;
      E.forEach((v, e) => { const m = Math.hypot(v[0], v[1]), A = geo[e].A; if (layer[e] === 0) { em = Math.max(em, m); eb += m * A; ab += A; } if (layer[e] === 3) { es += m * A; as += A; } });
      R = { V, E, it, scale, fixed };
      const set = (id, t) => { document.getElementById(id).textContent = t; };
      set('feIt', String(it)); set('feFr', num(Ib / (I_TOTAL / DEPTH) * 100, 3) + '%');
      set('feEm', fmt(em, 'V/m')); set('feEb', fmt(eb / ab, 'V/m')); set('feEs', fmt(es / as, 'V/m'));
      draw();
    }
    function color(v) {               // 0..1 → trắng, vàng, đỏ, đỏ sẫm
      if (v < 0.5) { const t = v / 0.5; return `rgb(255,${Math.round(255 - 61 * t)},${Math.round(240 - 192 * t)})`; }
      const t = (v - 0.5) / 0.5; return `rgb(${Math.round(242 - 103 * t)},${Math.round(194 - 165 * t)},${Math.round(48 - 26 * t)})`;
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st, { X, Y, T, layer } = M, s = Math.min(W, H) * 0.44 / RH, cx = W / 2, cy = H / 2 + 6;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const mags = R.E.map(v => Math.hypot(v[0], v[1])), mx = Math.max(...mags), lo = Math.log10(mx) - 2.5;
      T.forEach((t, e) => {
        let col;
        if (view === 'E') col = color(Math.max(0, (Math.log10(mags[e] + 1e-30) - lo) / 2.5));
        else { const v = (R.V[t[0]] + R.V[t[1]] + R.V[t[2]]) / 3 * 2, a = Math.min(1, Math.abs(v)); col = v > 0 ? `rgb(${251 - 35 * a},${252 - 203 * a},${253 - 211 * a})` : `rgb(${251 - 196 * a},${252 - 117 * a},${253 - 57 * a})`; }
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx + X[t[0]] * s, cy + Y[t[0]] * s); ctx.lineTo(cx + X[t[1]] * s, cy + Y[t[1]] * s); ctx.lineTo(cx + X[t[2]] * s, cy + Y[t[2]] * s); ctx.closePath(); ctx.fill();
        if (showMesh) { ctx.strokeStyle = 'rgba(27,25,32,.35)'; ctx.lineWidth = 0.6; ctx.stroke(); } else { ctx.strokeStyle = col; ctx.lineWidth = 0.5; ctx.stroke(); }
      });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
      [RB, RC, RS, RH].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, Math.PI * 2); ctx.stroke(); });
      // điện cực
      const sep = rSep.get() * Math.PI / 180, half = 8 * Math.PI / 180;
      [[-sep / 2, C.pos, '+'], [sep / 2, C.neg, '−']].forEach(([a, col, lab]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, RH * s + 5, a - half - Math.PI / 2, a + half - Math.PI / 2); ctx.stroke();
        ctx.fillStyle = col; ctx.font = '700 16px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(lab, cx + (RH * s + 20) * Math.sin(a), cy - (RH * s + 20) * Math.cos(a));
      });
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(view === 'E' ? '|E| (thang log, 2,5 bậc)' : 'Điện thế V', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('Từ ngoài vào: da đầu, xương sọ, dịch não tủy, não', 10, 26);
    }
    watchCanvas(cv, st, draw);
    rSep.upd(); rSk.upd(); build(); solve();
  },
});
})();
