/* =====================================================================
   Omics: minh họa "Giải trình tự shotgun và độ phủ" (id: sequencing, trang 3-omics.html)
   Nhúng vào trang: <div class="demo" id="demoSeq" data-demo="sequencing"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=sequencing

   Bộ gene vòng dài G = 2000 base (kiểu vi khuẩn, thu nhỏ). N đoạn đọc dài L bắt đầu ở vị trí ngẫu nhiên đều.
   Độ phủ trung bình C = N·L/G. Lander & Waterman (1988): số đoạn đọc phủ lên một base ~ Poisson(C),
   nên tỉ lệ base không được đọc ≈ e^(−C), và số khoảng trống (gap) kỳ vọng ≈ N·e^(−C).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const G = 2000;

OMICS.demo('sequencing', {
  domId: 'demoSeq',
  title: 'Giải trình tự shotgun và độ phủ',
  page: '3-omics.html',
  html: `<div class="demo-title"><h4>Giải trình tự shotgun và độ phủ</h4><span>Cắt bộ gene thành đoạn ngẫu nhiên, đọc, rồi xem còn sót chỗ nào</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSeq" class="ar" role="img" aria-label="Bộ gene vẽ thành một dải ngang; các đoạn đọc ngắn xếp chồng bên trên; dải độ phủ cho biết mỗi vị trí được đọc bao nhiêu lần, chỗ không được đọc tô đỏ."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="sqN">Số đoạn đọc N</label><output for="sqN"></output><input type="range" id="sqN" min="2" max="200" step="1" value="40"></div>
      <div class="ctrl"><label for="sqL">Độ dài đoạn đọc L</label><output for="sqL"></output><input type="range" id="sqL" min="50" max="400" step="10" value="150"></div>
      <div class="btnrow"><button class="btn" type="button" id="sqRe">Giải trình tự lại</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Độ phủ C = NL/G</dt><dd class="big" id="sqC">—</dd>
        <dt>Đã đọc (đo; lý thuyết)</dt><dd id="sqF">—</dd>
        <dt>Khoảng trống (đo; lý thuyết)</dt><dd id="sqG">—</dd>
      </dl>
      <p class="note-s">Lý thuyết Lander–Waterman: phần được đọc ≈ 1 − e^(−C), số khoảng trống ≈ N·e^(−C). Vì đoạn đọc rơi ngẫu nhiên, muốn gần như không sót chỗ nào cần độ phủ khoảng 8–10 lần trở lên. Giải trình tự bộ gene người thường nhắm độ phủ ~30 lần, vừa để lấp khoảng trống, vừa để phân biệt lỗi đọc với biến thể thật.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSeq'), st = {};
    let starts = [];
    const rN = range('sqN', { show: v => String(v), onInput: () => resample() });
    const rL = range('sqL', { show: v => v + ' base', onInput: () => calc() });
    document.getElementById('sqRe').addEventListener('click', () => { starts = []; resample(); });
    function resample() { const N = rN.get(); while (starts.length < N) starts.push(Math.floor(Math.random() * G)); starts.length = N; calc(); }
    let cov = null, gaps = 0;
    function calc() {
      const L = rL.get(), N = starts.length; cov = new Uint16Array(G);
      starts.forEach(s => { for (let k = 0; k < L; k++) cov[(s + k) % G]++; });
      let zero = 0; gaps = 0; for (let i = 0; i < G; i++) if (!cov[i]) { zero++; if (cov[(i - 1 + G) % G]) gaps++; }
      if (zero === G) gaps = 1;
      const Cv = N * L / G;
      document.getElementById('sqC').textContent = num(Cv, 3) + '×';
      document.getElementById('sqF').textContent = num((1 - zero / G) * 100, 3) + '%; ' + num((1 - Math.exp(-Cv)) * 100, 3) + '%';
      document.getElementById('sqG').textContent = gaps + '; ' + num(N * Math.exp(-Cv), 2);
      draw();
    }
    function draw() {
      if (!st.ctx || !cov) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 20, x1 = W - 20, px = i => x0 + i / G * (x1 - x0), L = rL.get();
      const gy = H - 40, cy0 = gy - 70, rowsTop = 34, rowH = 5;
      // xếp đoạn đọc thành hàng (tham lam)
      const rows = [], sorted = starts.slice().sort((a, b) => a - b), place = [];
      sorted.forEach(s => { let r = rows.findIndex(end => end < s); if (r < 0) { r = rows.length; rows.push(-1); } rows[r] = s + L + 6; place.push([s, r]); });
      const maxRows = Math.floor((cy0 - 14 - rowsTop) / rowH);
      place.forEach(([s, r]) => { if (r >= maxRows) return; const y = rowsTop + r * rowH; ctx.fillStyle = C.sea;
        const e = s + L; if (e <= G) ctx.fillRect(px(s), y, px(e) - px(s), rowH - 1.5); else { ctx.fillRect(px(s), y, x1 - px(s), rowH - 1.5); ctx.fillRect(x0, y, px(e - G) - x0, rowH - 1.5); } });
      // độ phủ
      let mx = 1; for (let i = 0; i < G; i++) mx = Math.max(mx, cov[i]);
      ctx.fillStyle = 'rgba(55,135,196,.35)'; ctx.beginPath(); ctx.moveTo(px(0), cy0 + 60);
      for (let i = 0; i < G; i++) ctx.lineTo(px(i), cy0 + 60 - cov[i] / mx * 56); ctx.lineTo(px(G), cy0 + 60); ctx.closePath(); ctx.fill();
      // bộ gene
      ctx.fillStyle = '#e9e4f5'; ctx.fillRect(x0, gy, x1 - x0, 14); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, gy, x1 - x0, 14);
      ctx.fillStyle = C.pos; for (let i = 0; i < G; i++) if (!cov[i]) ctx.fillRect(px(i), gy - 2, (x1 - x0) / G + 0.6, 18);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Các đoạn đọc' + (rows.length > maxRows ? ' (chỉ vẽ ' + maxRows + ' hàng đầu)' : ''), x0, 12);
      ctx.textBaseline = 'bottom'; ctx.fillText('Độ phủ (cao nhất ' + mx + '×)', x0, cy0 - 2);
      ctx.textBaseline = 'top'; ctx.fillText('Bộ gene vòng, 2000 base; đỏ: chưa được đọc', x0, gy + 18);
    }
    watchCanvas(cv, st, draw);
    rL.upd(); rN.upd();
  },
});
})();
