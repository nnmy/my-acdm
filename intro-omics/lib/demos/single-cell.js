/* =====================================================================
   Omics: minh họa "Tế bào đơn: giảm chiều và phân cụm" (id: single-cell, trang 4-phan-tich.html)
   Nhúng vào trang: <div class="demo" id="demoSc" data-demo="single-cell"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=single-cell

   Dữ liệu mô phỏng kiểu tế bào máu ngoại vi (PBMC): 600 tế bào, 4 loại (tỉ lệ ~ T 50%, bạch cầu đơn nhân 25%,
   NK 13%, B 12%), 40 gene: 12 gene đánh dấu thật (theo các marker PBMC quen thuộc) + 28 gene nền.
   Số đếm ~ Poisson(hệ số kích thước × mức biểu hiện), rồi log1p(CPM/100) như quy trình scanpy/Seurat.
   PCA: chuẩn hóa từng gene (z-score), lấy 10 thành phần chính bằng lặp lũy thừa + khử dần.
   k-means (khởi tạo k-means++) trên 10 PC. Độ khớp với nhãn thật: chỉ số Rand hiệu chỉnh (ARI, Hubert & Arabie 1985).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const TYPES = [['Tế bào T', 0.50, ['CD3E', 'IL7R', 'CCR7'], '#3787c4'], ['Bạch cầu đơn nhân', 0.25, ['CD14', 'LYZ', 'S100A8'], '#d8312a'], ['Tế bào NK', 0.13, ['NKG7', 'GNLY', 'GZMB'], '#2e9d4f'], ['Tế bào B', 0.12, ['MS4A1', 'CD79A', 'CD79B'], '#b8860b']];
const NC = 600, NG = 40, NPC = 10, CL = ['#3787c4', '#d8312a', '#2e9d4f', '#b8860b', '#7b4fbf', '#e07b39', '#2bb3b1', '#59606B'];
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function pois(l, r) { if (l > 30) { let u = 0; while (!u) u = r(); return Math.max(0, Math.round(l + Math.sqrt(l) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()))); } const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
function ari(a, b) {
  const n = a.length, ka = Math.max(...a) + 1, kb = Math.max(...b) + 1, T = [...Array(ka)].map(() => new Array(kb).fill(0));
  a.forEach((x, i) => T[x][b[i]]++); const c2 = x => x * (x - 1) / 2;
  let s = 0, sa = 0, sb = 0; T.forEach(r => r.forEach(v => { s += c2(v); })); T.forEach(r => { sa += c2(r.reduce((p, q) => p + q, 0)); });
  for (let j = 0; j < kb; j++) { let t = 0; for (let i = 0; i < ka; i++) t += T[i][j]; sb += c2(t); }
  const e = sa * sb / c2(n), mx = (sa + sb) / 2; return mx === e ? 1 : (s - e) / (mx - e);
}

OMICS.demo('single-cell', {
  domId: 'demoSc',
  title: 'Tế bào đơn: giảm chiều và phân cụm',
  page: '4-phan-tich.html',
  html: `<div class="demo-title"><h4>Tế bào đơn: giảm chiều và phân cụm</h4><span>600 tế bào máu mô phỏng, 40 gene, 4 loại tế bào "ẩn"</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSc" class="ar tall-m" role="img" aria-label="Biểu đồ phân tán của 600 tế bào trên hai thành phần chính đầu tiên, tô màu theo cụm k-means hoặc theo loại tế bào thật."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Tô màu">
        <button class="btn" type="button" data-scc="km" aria-pressed="true">Màu theo cụm k-means</button>
        <button class="btn" type="button" data-scc="true" aria-pressed="false">Màu theo loại thật</button>
      </div>
      <div class="ctrl"><label for="scK">Số cụm k</label><output for="scK"></output><input type="range" id="scK" min="2" max="8" step="1" value="4"></div>
      <div class="ctrl"><label for="scS">Mức biểu hiện của gene đánh dấu</label><output for="scS"></output><input type="range" id="scS" min="1" max="12" step="0.5" value="6"></div>
      <div class="btnrow"><button class="btn" type="button" id="scRe">Tạo dữ liệu mới</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Phương sai giải thích bởi PC1; PC2</dt><dd id="scVar">—</dd>
        <dt>Độ khớp với loại thật (ARI)</dt><dd class="big" id="scAri">—</dd>
        <dt>Tỉ lệ số đếm bằng 0</dt><dd id="scZ">—</dd>
      </dl>
      <div id="scLeg" class="legend"></div>
      <p class="note-s">ARI = 1: cụm trùng khớp hoàn toàn với loại tế bào thật; ARI ≈ 0: không hơn chia ngẫu nhiên. Thử k = 3 hoặc 6 và giảm mức biểu hiện của gene đánh dấu. Dữ liệu thật thường dùng UMAP thay cho hai PC đầu để vẽ, nhưng phân cụm vẫn chạy trên không gian PCA như ở đây.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSc'), st = {};
    let color = 'km', seed = 11, D = null;
    const rK = range('scK', { show: v => String(v), onInput: () => cluster() });
    const rS = range('scS', { show: v => '× ' + num(v, 2) + ' so với nền', onInput: () => gen() });
    const bs = [...document.querySelectorAll('#demoSc [data-scc]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); color = b.dataset.scc; draw(); }));
    document.getElementById('scRe').addEventListener('click', () => { seed += 37; gen(); });
    function gen() {
      const r = rng(seed), fold = rS.get(), lab = [], X = [];
      const base = Array.from({ length: NG }, () => 0.3 + 2.2 * r());           // mức nền mỗi gene (số đếm kỳ vọng)
      let zeros = 0;
      for (let c = 0; c < NC; c++) {
        let u = r(), t = 0; while (u > TYPES[t][1] && t < TYPES.length - 1) { u -= TYPES[t][1]; t++; }
        const sf = Math.exp(0.4 * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()));   // hệ số kích thước tế bào
        const cnt = base.map((b, g) => { const marker = g < 12 && Math.floor(g / 3) === t; return pois(sf * b * (marker ? fold : 1), r); });
        const tot = cnt.reduce((a, b) => a + b, 0) || 1; zeros += cnt.filter(x => !x).length;
        X.push(cnt.map(x => Math.log1p(x / tot * 100))); lab.push(t);
      }
      // z-score từng gene
      for (let g = 0; g < NG; g++) { let m = 0; X.forEach(x => { m += x[g]; }); m /= NC; let v = 0; X.forEach(x => { v += (x[g] - m) ** 2; }); const s = Math.sqrt(v / (NC - 1)) || 1; X.forEach(x => { x[g] = (x[g] - m) / s; }); }
      // ma trận hiệp phương sai và PCA bằng lặp lũy thừa
      const Cv = [...Array(NG)].map(() => new Float64Array(NG));
      X.forEach(x => { for (let i = 0; i < NG; i++) for (let j = i; j < NG; j++) Cv[i][j] += x[i] * x[j]; });
      for (let i = 0; i < NG; i++) for (let j = i; j < NG; j++) { Cv[i][j] /= NC - 1; Cv[j][i] = Cv[i][j]; }
      const tr = Cv.reduce((s, row, i) => s + row[i], 0), vecs = [], vals = [];
      for (let k = 0; k < NPC; k++) {
        let v = Float64Array.from({ length: NG }, () => r() - 0.5), lam = 0;
        for (let it = 0; it < 300; it++) {
          const w = new Float64Array(NG); for (let i = 0; i < NG; i++) { let s = 0; for (let j = 0; j < NG; j++) s += Cv[i][j] * v[j]; w[i] = s; }
          vecs.forEach(u => { let d = 0; for (let i = 0; i < NG; i++) d += w[i] * u[i]; for (let i = 0; i < NG; i++) w[i] -= d * u[i]; });
          const nn = Math.hypot(...w) || 1; lam = nn; for (let i = 0; i < NG; i++) v[i] = w[i] / nn;
        }
        vecs.push(v); vals.push(lam);
      }
      const P = X.map(x => vecs.map(u => { let s = 0; for (let i = 0; i < NG; i++) s += x[i] * u[i]; return s; }));
      D = { P, lab, ve: vals.map(l => l / tr), zf: zeros / (NC * NG) };
      cluster();
    }
    function cluster() {
      if (!D) return;
      const K = rK.get(), r = rng(seed * 7 + K), P = D.P;
      const d2 = (a, b) => { let s = 0; for (let i = 0; i < NPC; i++) s += (a[i] - b[i]) ** 2; return s; };
      let best = null;
      for (let rep = 0; rep < 5; rep++) {
        const cen = [P[Math.floor(r() * NC)].slice()];
        while (cen.length < K) { const dd = P.map(p => Math.min(...cen.map(c => d2(p, c)))), tot = dd.reduce((a, b) => a + b, 0); let u = r() * tot, i = 0; while (u > dd[i] && i < NC - 1) { u -= dd[i]; i++; } cen.push(P[i].slice()); }
        let asg = new Array(NC).fill(0);
        for (let it = 0; it < 50; it++) {
          let ch = false; P.forEach((p, i) => { let bi = 0, bd = Infinity; cen.forEach((c, k) => { const d = d2(p, c); if (d < bd) { bd = d; bi = k; } }); if (asg[i] !== bi) { asg[i] = bi; ch = true; } });
          cen.forEach((c, k) => { const mem = P.filter((_, i) => asg[i] === k); if (mem.length) for (let j = 0; j < NPC; j++) c[j] = mem.reduce((s, p) => s + p[j], 0) / mem.length; });
          if (!ch) break;
        }
        const sse = P.reduce((s, p, i) => s + d2(p, cen[asg[i]]), 0);
        if (!best || sse < best.sse) best = { sse, asg };
      }
      D.km = best.asg;
      document.getElementById('scVar').textContent = num(D.ve[0] * 100, 3) + '%; ' + num(D.ve[1] * 100, 3) + '%';
      document.getElementById('scAri').textContent = num(ari(D.lab, D.km), 3);
      document.getElementById('scZ').textContent = num(D.zf * 100, 3) + '%';
      draw();
    }
    function draw() {
      if (!st.ctx || !D || !D.km) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 40, x1 = W - 16, y0 = 30, y1 = H - 34, xs = D.P.map(p => p[0]), ys = D.P.map(p => p[1]);
      const ax = Math.max(...xs.map(Math.abs)) * 1.08, ay = Math.max(...ys.map(Math.abs)) * 1.08;
      const px = v => (x0 + x1) / 2 + v / ax * (x1 - x0) / 2, py = v => (y0 + y1) / 2 - v / ay * (y1 - y0) / 2;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, py(0)); ctx.lineTo(x1, py(0)); ctx.moveTo(px(0), y0); ctx.lineTo(px(0), y1); ctx.stroke();
      D.P.forEach((p, i) => { ctx.fillStyle = color === 'km' ? CL[D.km[i] % CL.length] : TYPES[D.lab[i]][3]; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 3, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(color === 'km' ? 'Màu theo cụm k-means (k = ' + rK.get() + ')' : 'Màu theo loại tế bào thật', 10, 8);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('PC1', (x0 + x1) / 2, y1 + 10);
      ctx.save(); ctx.translate(16, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('PC2', 0, 0); ctx.restore();
      document.getElementById('scLeg').innerHTML = color === 'km' ? '' : TYPES.map(t => `<span><i style="background:${t[3]}"></i>${t[0]} (${t[2].join(', ')})</span>`).join('');
    }
    watchCanvas(cv, st, draw);
    rK.upd(); rS.upd();
  },
});
})();
