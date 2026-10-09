/* =====================================================================
   Sinh điện từ: minh họa "SAR, SA và nhiệt độ" (id: sar-heat, trang 5-do-lieu.html)
   Nhúng vào trang: <div class="demo" id="demoSar" data-demo="sar-heat"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=sar-heat
   Cần: lib/demos/gabriel-data.js (σ của mô theo tần số)
   Nhiệt: phương trình Pennes thu gọn (bỏ dẫn nhiệt): dT/dt = SAR/c − (T−Tb)/τ,  τ = c/(w·cb)
   c (J/kg/K) và lưu lượng máu (ml/min/kg) là giá trị cỡ, theo IT'IS Foundation.
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas } = BEM;
const TIS = [
  { k: 'muscle', c: 3421, perf: 40 },
  { k: 'fat', c: 2348, perf: 30 },
  { k: 'skinw', c: 3391, perf: 100 },
  { k: 'grey', c: 3696, perf: 600 },
];
const CB = 3617, RHO_B = 1050;     // nhiệt dung riêng (J/kg/K) và khối lượng riêng của máu

BEM.demo('sar-heat', {
  domId: 'demoSar',
  title: 'SAR, SA và nhiệt độ',
  page: '5-do-lieu.html',
  deps: ['gabriel-data'],
  html: `<div class="demo-title"><h4>SAR, SA và nhiệt độ</h4><span>Chọn mô, tần số, cường độ trường trong mô và thời gian</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSar" class="ar" role="img" aria-label="Đồ thị độ tăng nhiệt độ theo thời gian, có và không có máu tưới."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="saT">Mô</label><select id="saT"></select></div>
      <div class="ctrl"><label for="saF">Tần số f</label><output for="saF"></output><input type="range" id="saF" min="6" max="10" step="0.01" value="8.95"></div>
      <div class="ctrl"><label for="saE">E trong mô (rms)</label><output for="saE"></output><input type="range" id="saE" min="0" max="2.7" step="0.01" value="1.5"></div>
      <div class="ctrl"><label for="saD">Thời gian phơi nhiễm</label><output for="saD"></output><input type="range" id="saD" min="1" max="60" step="1" value="30"></div>
      <div class="ctrl"><label for="saW">Lưu lượng máu tưới</label><output for="saW"></output><input type="range" id="saW" min="0" max="800" step="5" value="40"></div>
      <dl class="readout" aria-live="polite">
        <dt>σ của mô ở f</dt><dd id="saS">—</dd>
        <dt>SAR</dt><dd class="big" id="saSar">—</dd>
        <dt>SA sau thời gian trên</dt><dd id="saSa">—</dd>
        <dt>dT/dt ban đầu</dt><dd id="saDt">—</dd>
        <dt>ΔT không có máu tưới</dt><dd id="saT0">—</dd>
        <dt>ΔT có máu tưới</dt><dd class="big" id="saT1">—</dd>
        <dt>ΔT ổn định (t → ∞)</dt><dd id="saTi">—</dd>
      </dl>
      <p class="note-s">Mô hình bỏ qua dẫn nhiệt sang mô xung quanh, nên ước lượng cao hơn thực tế với vùng nóng nhỏ. Vạch ngang trên đồ thị: các mức SAR tham khảo quy đổi ra nhiệt độ ổn định cho cùng mô.</p>
    </div>
  </div>`,
  init() {
    const G = BEM.GABRIEL, cv = document.getElementById('cvSar'), st = {}, sel = document.getElementById('saT');
    TIS.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `${G.T[t.k].vi} (${G.T[t.k].en})`; sel.appendChild(o); });
    const rF = range('saF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => calc() });
    const rE = range('saE', { map: v => 10 ** v, show: v => fmt(v, 'V/m'), onInput: () => calc() });
    const rD = range('saD', { show: v => v + ' phút', onInput: () => calc() });
    const rW = range('saW', { show: v => v + ' ml/phút/kg', onInput: () => calc() });
    sel.addEventListener('change', () => { rW.set(TIS[+sel.value].perf); });
    let S = {};
    function calc() {
      const t = TIS[+sel.value], f = rF.get(), E = rE.get(), D = rD.get() * 60;
      const sig = G.eps(t.k, f).sigma, rho = G.T[t.k].rho, sar = sig * E * E / rho;
      const w = rW.get() * 1e-6 * RHO_B / 60;            // kg máu / (kg mô · s)
      const tau = w > 0 ? t.c / (w * CB) : Infinity;
      const dT = tt => tau === Infinity ? sar * tt / t.c : sar * tau / t.c * (1 - Math.exp(-tt / tau));
      S = { sar, c: t.c, tau, D, dT };
      const set = (id, v) => { document.getElementById(id).textContent = v; };
      set('saS', num(sig, 3) + ' S/m'); set('saSar', fmt(sar, 'W/kg')); set('saSa', fmt(sar * D, 'J/kg'));
      set('saDt', fmt(sar / t.c * 60, '°C/phút')); set('saT0', num(sar * D / t.c, 3) + ' °C'); set('saT1', num(dT(D), 3) + ' °C');
      set('saTi', tau === Infinity ? 'không giới hạn' : num(sar * tau / t.c, 3) + ' °C');
      draw();
    }
    function draw() {
      if (!st.ctx || !S.c) return;
      const { ctx, W, H } = st, L = 56, R = 16, T = 18, B = 34, pw = W - L - R, ph = H - T - B, D = S.D;
      const ymax = Math.max(0.05, S.sar * D / S.c * 1.05, S.dT(D) * 1.2);
      const xs = t => L + t / D * pw, ys = v => T + ph - Math.min(1.02, v / ymax) * ph;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let k = 0; k <= 4; k++) { const v = ymax * k / 4; ctx.beginPath(); ctx.moveTo(L, ys(v)); ctx.lineTo(L + pw, ys(v)); ctx.stroke(); ctx.fillText(num(v, 2) + ' °C', L - 6, ys(v)); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let k = 0; k <= 6; k++) { const t = D * k / 6; ctx.fillText(num(t / 60, 3) + ' ph', xs(t), T + ph + 6); }
      ctx.strokeStyle = C.ink; ctx.strokeRect(L, T, pw, ph);
      // mức tham khảo (ΔT ổn định nếu SAR = mức đó, cùng τ)
      if (S.tau !== Infinity) [[2, 'SAR 2 W/kg (giới hạn cục bộ, công chúng)'], [10, 'SAR 10 W/kg (cục bộ, lao động)']].forEach(([s, n]) => {
        const v = s * S.tau / S.c; if (v > ymax) return;
        ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(L, ys(v)); ctx.lineTo(L + pw, ys(v)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(n, L + pw - 4, ys(v) - 2);
      });
      const curve = (fn, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let k = 0; k <= 200; k++) { const t = D * k / 200; k ? ctx.lineTo(xs(t), ys(fn(t))) : ctx.moveTo(xs(t), ys(fn(t))); } ctx.stroke(); };
      ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      curve(t => S.sar * t / S.c, C.pos, 2); curve(S.dT, C.sea, 3); ctx.restore();
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.pos; ctx.fillText('không có máu tưới', L + 8, T + 6); ctx.fillStyle = C.sea; ctx.fillText('có máu tưới', L + 8, T + 24);
      ctx.fillStyle = C.ink; ctx.fillText('ΔT', L + 8, T + 42);
    }
    watchCanvas(cv, st, draw);
    sel.value = 0; rF.upd(); rE.upd(); rD.upd(); rW.upd(); calc();
  },
});
})();
