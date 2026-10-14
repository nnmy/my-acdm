/* =====================================================================
   Omics: minh họa "Công tắc gene: yếu tố phiên mã điều khiển biểu hiện" (id: gene-switch, trang 2-dna-protein.html)
   Nhúng vào trang: <div class="demo" id="demoSwitch" data-demo="gene-switch"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=gene-switch

   Tốc độ phiên mã theo nồng độ yếu tố phiên mã X (hàm Hill):
     hoạt hóa: f = Xⁿ / (Kⁿ + Xⁿ);  ức chế: f = Kⁿ / (Kⁿ + Xⁿ)
   Động học: dm/dt = α·f − γ_m·m,  dp/dt = β·m − γ_p·p.
   Thời gian bán hủy trung vị ở tế bào động vật có vú (Schwanhäusser et al., Nature 2011):
   mRNA ~9 giờ, protein ~46 giờ → γ = ln2 / t½. Đồ thị thời gian chuẩn hóa theo giá trị dừng.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const TM = 9, TP = 46, GM = Math.LN2 / TM, GP = Math.LN2 / TP, TMAX = 250;

OMICS.demo('gene-switch', {
  domId: 'demoSwitch',
  title: 'Công tắc gene',
  page: '2-dna-protein.html',
  html: `<div class="demo-title"><h4>Công tắc gene</h4><span>Yếu tố phiên mã bật, tắt một gene; mRNA và protein đáp ứng theo thời gian</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSw" class="ar" role="img" aria-label="Đồ thị tốc độ phiên mã theo nồng độ yếu tố phiên mã (hàm Hill), và bên dưới là nồng độ mRNA và protein theo thời gian sau khi bật gene."></canvas><canvas id="cvSwT" class="profile" aria-hidden="true"></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Kiểu điều hòa">
        <button class="btn" type="button" data-swm="act" aria-pressed="true">Hoạt hóa</button>
        <button class="btn" type="button" data-swm="rep" aria-pressed="false">Ức chế</button>
      </div>
      <div class="ctrl"><label for="swX">Nồng độ yếu tố phiên mã X (theo K)</label><output for="swX"></output><input type="range" id="swX" min="0" max="3" step="0.01" value="1.5"></div>
      <div class="ctrl"><label for="swN">Hệ số hợp tác n (Hill)</label><output for="swN"></output><input type="range" id="swN" min="1" max="6" step="0.5" value="2"></div>
      <dl class="readout" aria-live="polite">
        <dt>Tốc độ phiên mã (so với tối đa)</dt><dd class="big" id="swF">—</dd>
        <dt>Thời gian mRNA đạt 50%</dt><dd id="swTm">—</dd>
        <dt>Thời gian protein đạt 50%</dt><dd id="swTp">—</dd>
      </dl>
      <p class="note-s">n càng lớn (nhiều phân tử yếu tố phiên mã phải cùng gắn), đường cong càng dốc: gene hoạt động như công tắc bật–tắt thay vì núm vặn. Protein bền hơn mRNA nhiều nên phản ứng chậm hơn: đo mRNA (RNA-seq) chưa chắc phản ánh ngay lượng protein trong tế bào.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSw'), cvT = document.getElementById('cvSwT'), st = {}, stT = {};
    let mode = 'act';
    const rX = range('swX', { show: v => num(v, 3) + ' K', onInput: () => upd() });
    const rN = range('swN', { show: v => num(v, 2), onInput: () => upd() });
    const bs = [...document.querySelectorAll('#demoSwitch [data-swm]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); mode = b.dataset.swm; upd(); }));
    const f = (x, n) => { const a = Math.pow(x, n); return mode === 'act' ? a / (1 + a) : 1 / (1 + a); };
    // nghiệm giải tích khi bật từ m = p = 0 (chuẩn hóa theo giá trị dừng)
    const mt = t => 1 - Math.exp(-GM * t);
    const pt = t => 1 - (GP * Math.exp(-GM * t) - GM * Math.exp(-GP * t)) / (GP - GM);
    const half = g => { let lo = 0, hi = 1000; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (g(m) < 0.5) lo = m; else hi = m; } return lo; };
    function upd() {
      document.getElementById('swF').textContent = num(f(rX.get(), rN.get()) * 100, 3) + '%';
      document.getElementById('swTm').textContent = num(half(mt), 3) + ' giờ';
      document.getElementById('swTp').textContent = num(half(pt), 3) + ' giờ';
      draw(); drawT();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 56, x1 = W - 20, y0 = 56, y1 = H - 36, px = x => x0 + x / 3 * (x1 - x0), py = v => y1 - v * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(px(1), y0); ctx.lineTo(px(1), y1); ctx.moveTo(x0, py(0.5)); ctx.lineTo(x1, py(0.5)); ctx.stroke(); ctx.setLineDash([]);
      [1, 2, 4].forEach(n => { if (n === rN.get()) return; ctx.strokeStyle = '#c3c8ce'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k <= 200; k++) { const x = 3 * k / 200; k ? ctx.lineTo(px(x), py(f(x, n))) : ctx.moveTo(px(x), py(f(x, n))); } ctx.stroke(); });
      const n = rN.get(); ctx.strokeStyle = C.sea; ctx.lineWidth = 2.6; ctx.beginPath(); for (let k = 0; k <= 300; k++) { const x = 3 * k / 300; k ? ctx.lineTo(px(x), py(f(x, n))) : ctx.moveTo(px(x), py(f(x, n))); } ctx.stroke();
      const X = rX.get(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px(X), py(f(X, n)), 6, 0, 7); ctx.fill();
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Tốc độ phiên mã f theo nồng độ yếu tố phiên mã X (' + (mode === 'act' ? 'hoạt hóa' : 'ức chế') + ')', 10, 10);
      ctx.fillStyle = C.muted; ctx.fillText('đường xám: n = 1, 2, 4 để so sánh', 10, 26);
      ctx.textAlign = 'center'; [0, 1, 2, 3].forEach(x => ctx.fillText(x === 1 ? 'K' : x + 'K', px(x), y1 + 6));
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [0, 0.5, 1].forEach(v => ctx.fillText(num(v * 100, 3) + '%', x0 - 6, py(v)));
      // sơ đồ gene nhỏ
      const gx = x1 - 170, gy = mode === 'act' ? y1 - 50 : y0 + 30;
      ctx.fillStyle = '#e9e4f5'; ctx.fillRect(gx, gy, 150, 16); ctx.strokeStyle = C.ink; ctx.strokeRect(gx, gy, 150, 16);
      ctx.fillStyle = '#c9dcf3'; ctx.fillRect(gx, gy, 34, 16); ctx.strokeRect(gx, gy, 34, 16);
      ctx.fillStyle = C.ink; ctx.font = '500 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('promoter', gx + 17, gy + 27); ctx.fillText('gene', gx + 92, gy + 8.5);
      const nb = Math.min(4, Math.round(X * 1.4)); for (let k = 0; k < nb; k++) { ctx.fillStyle = mode === 'act' ? '#2e9d4f' : C.pos; ctx.beginPath(); ctx.arc(gx + 8 + k * 7, gy - 6, 4, 0, 7); ctx.fill(); }
    }
    function drawT() {
      if (!stT.ctx) return;
      const { ctx, W, H } = stT; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x0 = 46, x1 = W - 12, y0 = 22, y1 = H - 22, px = t => x0 + t / TMAX * (x1 - x0), py = v => y1 - v * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      [[mt, C.sea, 'mRNA'], [pt, C.pos, 'protein']].forEach(([g, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); for (let k = 0; k <= 200; k++) { const t = TMAX * k / 200; k ? ctx.lineTo(px(t), py(g(t))) : ctx.moveTo(px(t), py(g(t))); } ctx.stroke(); });
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.ink; ctx.fillText('Sau khi bật gene (chuẩn hóa):', x0 + 4, 3);
      { let lx = x0 + 4 + ctx.measureText('Sau khi bật gene (chuẩn hóa):').width + 14; [['— mRNA (t½ = 9 giờ)', C.sea], ['— protein (t½ = 46 giờ)', C.pos]].forEach(([t, c]) => { if (lx + ctx.measureText(t).width > W - 8) return; ctx.fillStyle = c; ctx.fillText(t, lx, 3); lx += ctx.measureText(t).width + 14; }); }
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [0, 50, 100, 150, 200, 250].forEach(t => ctx.fillText(t + ' giờ', px(t), y1 + 4));
    }
    watchCanvas(cv, st, draw); watchCanvas(cvT, stT, drawT);
    rX.upd(); rN.upd();
  },
});
})();
