/* =====================================================================
   Omics: minh họa "Ảo giác độ chính xác khi số gene nhiều hơn số bệnh nhân" (id: overfit, trang 5-ai.html)
   Nhúng vào trang: <div class="demo" id="demoOverfit" data-demo="overfit"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=overfit

   n bệnh nhân (nửa "bệnh", nửa "khỏe"), p gene ~ N(0, 1) độc lập. Mặc định KHÔNG gene nào liên quan tới nhãn
   (độ chính xác thật = 50%). Tùy chọn: 10 gene có dịch chuyển trung bình 0,8 SD ở nhóm bệnh.
   Mô hình: chọn k = 20 gene có |t| lớn nhất, rồi phân loại theo tâm gần nhất (nearest centroid).
   - Sai: chọn gene trên toàn bộ dữ liệu, sau đó mới kiểm định chéo 5 phần → thiên lệch chọn lọc
     (Ambroise & McLachlan, PNAS 2002).
   - Đúng: chọn gene lại bên trong mỗi lần chia, chỉ dùng phần huấn luyện.
   - Kiểm tra trên 1000 bệnh nhân mới sinh từ cùng phân bố.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const K = 20, NNEW = 1000, NSIG = 10, SHIFT = 0.8;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

OMICS.demo('overfit', {
  domId: 'demoOverfit',
  title: 'Ảo giác độ chính xác khi số gene nhiều hơn số bệnh nhân',
  page: '5-ai.html',
  html: `<div class="demo-title"><h4>Ảo giác độ chính xác khi p ≫ n</h4><span>Dữ liệu ngẫu nhiên hoàn toàn, nhưng mô hình vẫn có thể "đạt 90%"</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvOf" class="ar tall-m" role="img" aria-label="Biểu đồ cột so sánh độ chính xác của mô hình theo bốn cách đánh giá: trên chính dữ liệu huấn luyện, kiểm định chéo sai cách, kiểm định chéo đúng cách, và trên bệnh nhân mới; đường ngang đánh dấu mức đoán ngẫu nhiên 50%."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="ofN">Số bệnh nhân n</label><output for="ofN"></output><input type="range" id="ofN" min="20" max="200" step="10" value="40"></div>
      <div class="ctrl"><label for="ofP">Số gene p</label><output for="ofP"></output><input type="range" id="ofP" min="1.3" max="3.7" step="0.05" value="3.3"></div>
      <div class="checks"><label><input type="checkbox" id="ofSig"> Có 10 gene thật sự liên quan tới bệnh</label></div>
      <div class="btnrow"><button class="btn" type="button" id="ofRe">Tạo dữ liệu mới</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Huấn luyện</dt><dd id="ofTr">—</dd>
        <dt>CV, chọn gene trước (sai)</dt><dd class="big" id="ofW">—</dd>
        <dt>CV, chọn gene bên trong (đúng)</dt><dd class="big" id="ofR">—</dd>
        <dt>1000 bệnh nhân mới</dt><dd id="ofNew">—</dd>
      </dl>
      <p class="note-s">CV: kiểm định chéo 5 phần. Với hàng nghìn gene ngẫu nhiên, luôn có vài chục gene tình cờ khác nhau giữa hai nhóm nhỏ. Nếu chọn chúng bằng toàn bộ dữ liệu, thông tin về nhãn của phần kiểm tra đã "rò" vào mô hình, và kiểm định chéo báo độ chính xác ảo. Bỏ chọn trường "gene thật sự liên quan" để thấy rõ nhất.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvOf'), st = {};
    let seed = 5, R = null, pend = false;
    const rN = range('ofN', { show: v => String(v), onInput: () => schedule() });
    const rP = range('ofP', { map: v => Math.round(10 ** v), show: v => String(v), onInput: () => schedule() });
    const sig = document.getElementById('ofSig'); sig.addEventListener('change', () => schedule());
    document.getElementById('ofRe').addEventListener('click', () => { seed += 17; schedule(); });
    function schedule() { if (pend) return; pend = true; setTimeout(() => { pend = false; run(); }, 30); }
    function data(r, n, p, withSig) {
      const gs = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
      const y = Array.from({ length: n }, (_, i) => i % 2), X = y.map(c => { const x = new Float64Array(p); for (let j = 0; j < p; j++) x[j] = gs() + (withSig && c && j < NSIG ? SHIFT : 0); return x; });
      return { X, y };
    }
    function select(X, y, idx, p) {      // k gene có |t| lớn nhất, chỉ dùng các mẫu trong idx
      const t = new Float64Array(p), s = [[0, 0], [0, 0]]; void s;
      const n1 = idx.filter(i => y[i]).length, n0 = idx.length - n1;
      for (let j = 0; j < p; j++) {
        let m0 = 0, m1 = 0; idx.forEach(i => { if (y[i]) m1 += X[i][j]; else m0 += X[i][j]; }); m0 /= n0; m1 /= n1;
        let v = 0; idx.forEach(i => { const d = X[i][j] - (y[i] ? m1 : m0); v += d * d; }); v /= (idx.length - 2);
        t[j] = Math.abs(m1 - m0) / Math.sqrt(v * (1 / n0 + 1 / n1) + 1e-12);
      }
      return Array.from({ length: p }, (_, j) => j).sort((a, b) => t[b] - t[a]).slice(0, K);
    }
    function fit(X, y, idx, genes) { const c = [new Float64Array(K), new Float64Array(K)], n = [0, 0]; idx.forEach(i => { n[y[i]]++; genes.forEach((g, k) => { c[y[i]][k] += X[i][g]; }); }); c.forEach((v, l) => v.forEach((_, k) => { v[k] /= n[l] || 1; })); return { genes, c }; }
    const pred = (m, x) => { let d0 = 0, d1 = 0; m.genes.forEach((g, k) => { d0 += (x[g] - m.c[0][k]) ** 2; d1 += (x[g] - m.c[1][k]) ** 2; }); return d1 < d0 ? 1 : 0; };
    const acc = (m, X, y, idx) => idx.filter(i => pred(m, X[i]) === y[i]).length / idx.length;
    function run() {
      const n = rN.get(), p = rP.get(), r = rng(seed * 131 + n * 7 + p), ws = sig.checked;
      const { X, y } = data(r, n, p, ws), all = X.map((_, i) => i);
      const order = all.slice().sort(() => r() - 0.5), folds = [0, 1, 2, 3, 4].map(f => order.filter((_, k) => k % 5 === f));
      const gAll = select(X, y, all, p), mAll = fit(X, y, all, gAll);
      const train = acc(mAll, X, y, all);
      let wrong = 0, right = 0;
      folds.forEach(te => { const tr = all.filter(i => !te.includes(i));
        wrong += acc(fit(X, y, tr, gAll), X, y, te) * te.length;
        right += acc(fit(X, y, tr, select(X, y, tr, p)), X, y, te) * te.length; });
      const nd = data(rng(seed * 977 + 3), NNEW, p, ws), newAcc = acc(mAll, nd.X, nd.y, nd.X.map((_, i) => i));
      R = { train, wrong: wrong / n, right: right / n, newAcc };
      const set = (id, v) => { document.getElementById(id).textContent = num(v * 100, 3) + '%'; };
      set('ofTr', train); set('ofW', R.wrong); set('ofR', R.right); set('ofNew', newAcc);
      draw();
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 56, x1 = W - 16, y0 = 40, y1 = H - 56, py = v => y1 - v * (y1 - y0);
      const nar = W < 520, bars = [[nar ? 'Huấn luyện' : 'Trên dữ liệu huấn luyện', R.train, '#9DA4AD'], [nar ? 'CV (sai)' : 'Kiểm định chéo (sai)', R.wrong, C.pos], [nar ? 'CV (đúng)' : 'Kiểm định chéo (đúng)', R.right, '#2e9d4f'], [nar ? 'BN mới' : 'Bệnh nhân mới', R.newAcc, C.sea]];
      const bw = (x1 - x0) / bars.length;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      bars.forEach(([t, v, c], i) => { const x = x0 + i * bw + bw * 0.18, w = bw * 0.64; ctx.fillStyle = c; ctx.fillRect(x, py(v), w, y1 - py(v));
        ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(num(v * 100, 3) + '%', x + w / 2, py(v) - 4);
        ctx.textBaseline = 'top'; ctx.fillStyle = C.muted; const words = t.split(' ('); ctx.fillText(words[0], x + w / 2, y1 + 6); if (words[1]) ctx.fillText('(' + words[1], x + w / 2, y1 + 22); });
      ctx.setLineDash([6, 4]); ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(x0, py(0.5)); ctx.lineTo(x1, py(0.5)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('đoán ngẫu nhiên 50%', x0 + 6, py(0.5) - 3);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.muted; [0, 0.5, 1].forEach(v => ctx.fillText(num(v * 100, 3) + '%', x0 - 6, py(v)));
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink; ctx.fillText('Độ chính xác phân loại "bệnh / khỏe" (' + rN.get() + ' bệnh nhân, ' + rP.get() + ' gene, chọn ' + K + ' gene)', 10, 10);
    }
    watchCanvas(cv, st, draw);
    rN.upd(); rP.upd();
  },
});
})();
