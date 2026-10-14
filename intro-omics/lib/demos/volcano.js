/* =====================================================================
   Omics: minh họa "Biểu hiện khác biệt và kiểm định nhiều lần" (id: volcano, trang 4-phan-tich.html)
   Nhúng vào trang: <div class="demo" id="demoVolcano" data-demo="volcano"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=volcano

   Dữ liệu mô phỏng có "đáp án": 2000 gene, 10% thật sự khác biệt.
   Mỗi gene: mức nền log2 ~ N(8, 2²); độ lệch chuẩn sinh học σ_g ~ log-chuẩn quanh 0,5;
   gene khác biệt có log2FC = ±|N(1,2, 0,5²)|. n mẫu mỗi nhóm.
   Kiểm định t Welch hai phía (p từ hàm beta không đầy đủ chính quy hóa, Numerical Recipes §6.4),
   hiệu chỉnh Benjamini–Hochberg (1995): q_(i) = min_{j≥i} p_(j)·m / j.
   So sánh FDR danh định với FDR thật (= số gene báo sai / số gene báo).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const M = 2000, PI1 = 0.1;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function gammaln(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const q of c) s += q / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function betacf(a, b, x) { const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break; }
  return h; }
function ibeta(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
const pT = (t, df) => ibeta(df / 2, 0.5, df / (df + t * t));   // p hai phía
OMICS.stats = { gammaln, ibeta, pT };

OMICS.demo('volcano', {
  domId: 'demoVolcano',
  title: 'Biểu hiện khác biệt và kiểm định nhiều lần',
  page: '4-phan-tich.html',
  html: `<div class="demo-title"><h4>Biểu hiện khác biệt và kiểm định nhiều lần</h4><span>2000 gene mô phỏng, trong đó 200 gene thật sự khác biệt</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvVol" class="ar tall-m" role="img" aria-label="Volcano plot: trục ngang là log2 fold change, trục dọc là âm log10 p-value; gene được báo là khác biệt tô màu, gene báo đúng màu đỏ, báo sai đánh dấu chữ x đen."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Ngưỡng">
        <button class="btn" type="button" data-vlm="bh" aria-pressed="true">Hiệu chỉnh FDR (BH)</button>
        <button class="btn" type="button" data-vlm="raw" aria-pressed="false">p &lt; ngưỡng, không hiệu chỉnh</button>
      </div>
      <div class="ctrl"><label for="vlA">Ngưỡng (FDR hoặc p)</label><output for="vlA"></output><input type="range" id="vlA" min="0.01" max="0.2" step="0.01" value="0.05"></div>
      <div class="ctrl"><label for="vlFC">Ngưỡng |log2 fold change|</label><output for="vlFC"></output><input type="range" id="vlFC" min="0" max="2" step="0.1" value="0"></div>
      <div class="ctrl"><label for="vlN">Số mẫu mỗi nhóm</label><output for="vlN"></output><input type="range" id="vlN" min="2" max="12" step="1" value="6"></div>
      <div class="btnrow"><button class="btn" type="button" id="vlRe">Tạo dữ liệu mới</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Gene được báo khác biệt</dt><dd class="big" id="vlCall">—</dd>
        <dt>Trong đó báo sai</dt><dd id="vlFP">—</dd>
        <dt>FDR thật</dt><dd class="big" id="vlFdr">—</dd>
        <dt>Tìm được bao nhiêu gene thật</dt><dd id="vlSens">—</dd>
      </dl>
      <p class="note-s" id="vlNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvVol'), st = {};
    let mode = 'bh', seed = 7, D = null;
    const rA = range('vlA', { show: v => num(v, 2), onInput: () => call() });
    const rFC = range('vlFC', { show: v => num(v, 2), onInput: () => call() });
    const rN = range('vlN', { show: v => String(v), onInput: () => gen() });
    const bs = [...document.querySelectorAll('#demoVolcano [data-vlm]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); mode = b.dataset.vlm; call(); }));
    document.getElementById('vlRe').addEventListener('click', () => { seed += 101; gen(); });
    function gen() {
      const r = rng(seed), n = rN.get(), gs = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
      const genes = [];
      for (let g = 0; g < M; g++) {
        const de = g < M * PI1, base = 8 + 2 * gs(), sd = 0.5 * Math.exp(0.35 * gs()), lfc = de ? (r() < 0.5 ? -1 : 1) * Math.abs(1.2 + 0.5 * gs()) : 0;
        const a = Array.from({ length: n }, () => base + sd * gs()), b = Array.from({ length: n }, () => base + lfc + sd * gs());
        const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
        const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (n - 1), vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (n - 1);
        const se2 = va / n + vb / n, t = (mb - ma) / Math.sqrt(se2), df = se2 * se2 / ((va / n) ** 2 / (n - 1) + (vb / n) ** 2 / (n - 1));
        genes.push({ de, fc: mb - ma, p: Math.max(1e-300, pT(t, df)) });
      }
      const ord = genes.map((_, i) => i).sort((i, j) => genes[i].p - genes[j].p); let mn = 1;
      for (let k = M - 1; k >= 0; k--) { const g = genes[ord[k]]; mn = Math.min(mn, g.p * M / (k + 1)); g.q = mn; }
      D = genes; call();
    }
    function call() {
      if (!D) return;
      const a = rA.get(), fc = rFC.get();
      D.forEach(g => { g.call = (mode === 'bh' ? g.q : g.p) < a && Math.abs(g.fc) >= fc; });
      const called = D.filter(g => g.call), fp = called.filter(g => !g.de).length, tp = called.length - fp;
      document.getElementById('vlCall').textContent = String(called.length);
      document.getElementById('vlFP').textContent = String(fp);
      document.getElementById('vlFdr').textContent = called.length ? num(fp / called.length * 100, 3) + '%' : '—';
      document.getElementById('vlSens').textContent = tp + ' / ' + D.filter(g => g.de).length;
      document.getElementById('vlNote').textContent = mode === 'raw'
        ? 'Kiểm định 1800 gene không khác biệt với ngưỡng p < ' + num(a, 2) + ' thì trung bình có khoảng ' + Math.round(1800 * a) + ' gene "khác biệt" chỉ do ngẫu nhiên. Đó là lý do phải hiệu chỉnh khi kiểm định hàng nghìn gene cùng lúc.'
        : 'Benjamini–Hochberg giữ tỉ lệ báo sai trung bình (FDR) dưới ngưỡng đã chọn. Tăng số mẫu mỗi nhóm để thấy số gene thật tìm được tăng lên: với 2–3 mẫu, phần lớn gene thật bị bỏ sót.';
      draw();
    }
    function draw() {
      if (!st.ctx || !D) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 52, x1 = W - 16, y0 = 34, y1 = H - 36, XM = 4, YM = Math.max(6, ...D.map(g => -Math.log10(g.p))) * 1.05;
      const px = v => x0 + (Math.max(-XM, Math.min(XM, v)) + XM) / (2 * XM) * (x1 - x0), py = v => y1 - Math.min(v, YM) / YM * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      D.forEach(g => { if (g.call) return; ctx.fillStyle = g.de ? 'rgba(55,135,196,.55)' : 'rgba(150,156,165,.45)'; ctx.fillRect(px(g.fc) - 1.5, py(-Math.log10(g.p)) - 1.5, 3, 3); });
      D.forEach(g => { if (!g.call) return; const x = px(g.fc), y = py(-Math.log10(g.p));
        if (g.de) { ctx.fillStyle = C.pos; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
        else { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 4, y - 4); ctx.stroke(); } });
      const fc = rFC.get(); if (fc > 0) { ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.beginPath(); [-fc, fc].forEach(v => { ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); }); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Volcano plot', 10, 8);
      ctx.font = '500 11.5px "Be Vietnam Pro", system-ui, sans-serif'; let lx = 110;
      [['● báo đúng', C.pos], ['✕ báo sai', C.ink], ['■ gene thật bị bỏ sót', C.sea], ['■ không khác biệt', '#969ca5']].forEach(([t, c]) => { ctx.fillStyle = c; ctx.fillText(t, lx, 9); lx += ctx.measureText(t).width + 14; });
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [-4, -2, 0, 2, 4].forEach(v => ctx.fillText(String(v).replace('-', '−'), px(v), y1 + 6));
      ctx.fillText('log2 fold change (nhóm B so với A)', (x0 + x1) / 2, y1 + 20);
      ctx.save(); ctx.translate(16, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('−log10 p', 0, 0); ctx.restore();
    }
    watchCanvas(cv, st, draw);
    rA.upd(); rFC.upd(); rN.upd();
  },
});
})();
