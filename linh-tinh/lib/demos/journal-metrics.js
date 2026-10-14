/* =====================================================================
   Linh tinh: minh họa "IF và CiteScore tính ra sao" (id: journal-metrics, trang xuat-ban.html)
   Một tạp chí GIẢ ĐỊNH đăng N bài mỗi năm. Mỗi bài có "sức hút" q ~ log-chuẩn (lệch phải, như trích dẫn thật);
   số trích dẫn nhận được trong năm thứ a sau khi đăng ~ Poisson(R · q · hình_dạng_ngành(a)).
   - JIF năm Y (Clarivate): trích dẫn trong năm Y tới các bài đăng năm Y−1, Y−2 / số bài "có thể trích dẫn"
     (bài nghiên cứu + bài tổng quan) đăng năm Y−1, Y−2. Hiển thị 1 chữ số thập phân (từ JCR 2023).
   - CiteScore năm Y (Elsevier/Scopus, từ 2020): trích dẫn trong 4 năm Y−3…Y tới tài liệu đăng trong Y−3…Y
     / số tài liệu đăng trong Y−3…Y.
   - Tự trích dẫn của tạp chí: cộng thêm tỉ lệ s% trích dẫn đến từ chính tạp chí.
   - Bài tổng quan: được trích dẫn trung bình nhiều hơn (ở đây ×3, giả định minh họa).
   Phân bố lệch: phần lớn bài có ít trích dẫn hơn JIF (Larivière et al. 2016: 65–75% bài).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, pressGroup } = LT;
const SHAPE = { fast: [0.35, 1.0, 1.0, 0.8, 0.6], slow: [0.1, 0.35, 0.55, 0.65, 0.65] };   // trích dẫn theo tuổi bài (năm 0…4)
const RATE = { fast: 2.0, slow: 0.7 };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function pois(l, r) { if (l > 40) { let u = 0; while (!u) u = r(); return Math.max(0, Math.round(l + Math.sqrt(l) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()))); } const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }

LT.demo('journal-metrics', {
  domId: 'demoMetrics',
  title: 'IF và CiteScore tính ra sao',
  page: 'xuat-ban.html',
  html: `<div class="demo-title"><h4>IF và CiteScore tính ra sao</h4><span>Một tạp chí giả định; đổi ngành, số bài tổng quan, tự trích dẫn</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvJm" class="ar" role="img" aria-label="Biểu đồ số bài báo theo số lần được trích dẫn; vạch đỏ là IF (trung bình), vạch xanh là trung vị."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Ngành">
        <button class="btn" type="button" data-jmf="fast" aria-pressed="true">Ngành trích dẫn nhanh (y sinh)</button>
        <button class="btn" type="button" data-jmf="slow" aria-pressed="false">Ngành trích dẫn chậm (toán)</button>
      </div>
      <div class="ctrl"><label for="jmRev">Tỉ lệ bài tổng quan</label><output for="jmRev"></output><input type="range" id="jmRev" min="0" max="40" step="5" value="5"></div>
      <div class="ctrl"><label for="jmSelf">Tự trích dẫn của tạp chí</label><output for="jmSelf"></output><input type="range" id="jmSelf" min="0" max="50" step="5" value="5"></div>
      <dl class="readout" aria-live="polite">
        <dt>Impact Factor (2 năm)</dt><dd class="big" id="jmJif">—</dd>
        <dt>CiteScore (4 năm)</dt><dd class="big" id="jmCs">—</dd>
        <dt>Trung vị trích dẫn mỗi bài</dt><dd id="jmMed">—</dd>
        <dt>Số bài thấp hơn IF</dt><dd id="jmBelow">—</dd>
      </dl>
      <p class="note-s" id="jmNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvJm'), st = {};
    let field = 'fast', R = null;
    const rRev = range('jmRev', { show: v => v + '%', onInput: () => calc() });
    const rSelf = range('jmSelf', { show: v => v + '%', onInput: () => calc() });
    const bs = [...root.querySelectorAll('[data-jmf]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); field = b.dataset.jmf; calc(); }));
    function calc() {
      const r = rng(field === 'fast' ? 11 : 23), N = 200, Y = 4, rev = rRev.get() / 100, self = rSelf.get() / 100, sh = SHAPE[field], R0 = RATE[field];
      // bài đăng các năm 0…Y (Y là năm tính chỉ số); mỗi bài: số trích dẫn nhận trong từng năm
      const papers = [];
      for (let y = 0; y <= Y; y++) for (let i = 0; i < N; i++) {
        let u = 0; while (!u) u = r(); const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
        const q = Math.exp(1.0 * z - 0.5) * (r() < rev ? 3 : 1);              // trung bình ≈ 1 (bài nghiên cứu)
        const cites = []; for (let c = y; c <= Y; c++) cites.push(pois(R0 * q * sh[c - y] / (1 - self), r));
        papers.push({ y, cites });
      }
      const inYear = (p, c) => p.cites[c - p.y] || 0;
      const jifSet = papers.filter(p => p.y === Y - 1 || p.y === Y - 2), jifC = jifSet.map(p => inYear(p, Y));
      const jif = jifC.reduce((a, b) => a + b, 0) / jifSet.length;
      const csSet = papers.filter(p => p.y >= Y - 3), cs = csSet.reduce((a, p) => { let s = 0; for (let c = Math.max(p.y, Y - 3); c <= Y; c++) s += inYear(p, c); return a + s; }, 0) / csSet.length;
      const sorted = jifC.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
      const below = jifC.filter(x => x < jif).length / jifC.length;
      R = { jifC, jif, cs, med, below };
      document.getElementById('jmJif').textContent = num(Math.round(jif * 10) / 10, 3);
      document.getElementById('jmCs').textContent = num(Math.round(cs * 10) / 10, 3);
      document.getElementById('jmMed').textContent = String(med);
      document.getElementById('jmBelow').textContent = num(below * 100, 3) + '%';
      document.getElementById('jmNote').textContent = field === 'slow'
        ? 'Cùng chất lượng, tạp chí toán có IF thấp hơn nhiều vì bài được trích dẫn chậm và ít: không so IF giữa các ngành khác nhau.'
        : 'IF là trung bình của một phân bố rất lệch: vài bài được trích dẫn nhiều kéo trung bình lên, còn phần lớn bài thấp hơn IF. IF của tạp chí không nói lên một bài cụ thể tốt hay dở. Tăng tỉ lệ bài tổng quan hoặc tự trích dẫn để thấy IF bị đẩy lên mà chất lượng nghiên cứu không đổi.';
      draw();
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const maxC = 20, bins = new Array(maxC + 1).fill(0); R.jifC.forEach(c => { bins[Math.min(c, maxC)]++; });
      const x0 = 48, x1 = W - 16, y0 = 44, y1 = H - 40, bw = (x1 - x0) / (maxC + 1), my = Math.max(...bins) * 1.1, py = v => y1 - v / my * (y1 - y0), px = v => x0 + (v + 0.5) * bw;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      bins.forEach((b, k) => { ctx.fillStyle = k < R.jif ? '#bcd7ee' : C.sea; ctx.fillRect(x0 + k * bw + 1, py(b), bw - 2, y1 - py(b)); });
      [[R.jif, C.pos, 'IF = ' + num(Math.round(R.jif * 10) / 10, 3) + ' (trung bình)'], [R.med, '#2e9d4f', 'trung vị = ' + R.med]].forEach(([v, col, t], i) => {
        const x = px(Math.min(v, maxC)); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y0 + 10); ctx.lineTo(x, y1); ctx.stroke();
        ctx.fillStyle = col; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(t, Math.min(x + 5, W - 150), y0 + 12 + i * 16);
      });
      ctx.fillStyle = C.ink; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Số bài (đăng 2 năm trước) theo số trích dẫn nhận được trong năm tính IF', 10, 10);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [0, 5, 10, 15].forEach(k => ctx.fillText(String(k), px(k), y1 + 6)); ctx.fillText('≥ 20', px(20), y1 + 6);
      ctx.fillText('số lần được trích dẫn', (x0 + x1) / 2, y1 + 22);
    }
    watchCanvas(cv, st, draw);
    rRev.upd(); rSelf.upd();
  },
});
})();
