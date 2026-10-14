/* =====================================================================
   Bán dẫn: minh họa "Pin mặt trời: đặc tuyến và điểm công suất cực đại" (id: solar, trang 3-diode.html)
   Nhúng vào trang: <div class="demo" id="demoSolar" data-demo="solar"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=solar

   Mô hình một diode cho 1 cm² pin Si:
   J = J_L − J_0·(e^(V_j/V_T) − 1),  V = V_j − J·R_s,
   J_L = 40 mA/cm² × G / 1000 W/m², J_0(25 °C) = 1e-12 A/cm²,
   J_0(T) = J_0(25 °C)·(T/298)³·exp(E_g/k·(1/298 − 1/T)), E_g = 1,12 eV.
   Ở điều kiện chuẩn (1000 W/m², 25 °C, R_s = 0): V_oc ≈ 0,63 V, hiệu suất ≈ 20 %, cỡ pin Si thương mại.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = SEMI;
const KB = 8.617e-5;

SEMI.demo('solar', {
  domId: 'demoSolar',
  title: 'Pin mặt trời: đặc tuyến và điểm công suất cực đại',
  page: '3-diode.html',
  html: `<div class="demo-title"><h4>Pin mặt trời: đặc tuyến và công suất</h4><span>Đổi cường độ nắng, nhiệt độ và điện trở nối tiếp</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSol" class="ar" role="img" aria-label="Đồ thị mật độ dòng theo điện áp của pin mặt trời và đường công suất; điểm công suất cực đại được đánh dấu."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="soG">Cường độ nắng</label><output for="soG"></output><input type="range" id="soG" min="0" max="1200" step="10" value="1000"></div>
      <div class="ctrl"><label for="soT">Nhiệt độ pin</label><output for="soT"></output><input type="range" id="soT" min="0" max="80" step="1" value="25"></div>
      <div class="ctrl"><label for="soRs">Điện trở nối tiếp</label><output for="soRs"></output><input type="range" id="soRs" min="0" max="3" step="0.05" value="0.5"></div>
      <dl class="readout" aria-live="polite">
        <dt>Dòng ngắn mạch J_sc</dt><dd id="soJ">—</dd>
        <dt>Điện áp hở mạch V_oc</dt><dd id="soV">—</dd>
        <dt>Công suất cực đại</dt><dd class="big" id="soP">—</dd>
        <dt>Hệ số lấp đầy FF</dt><dd id="soFF">—</dd>
        <dt>Hiệu suất</dt><dd class="big" id="soEta">—</dd>
      </dl>
      <p class="note-s">Nắng yếu đi thì dòng giảm theo tỉ lệ, còn điện áp giảm rất ít. Nhiệt độ tăng làm V_oc giảm khoảng 2 mV mỗi độ C: pin nóng thì sinh điện kém hơn, nên tấm pin trên mái nhà mùa hè thường không đạt công suất danh định.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSol'), st = {};
    let R = null;
    const up = () => calc();
    const rG = range('soG', { show: v => v + ' W/m²', onInput: up });
    const rT = range('soT', { show: v => v + ' °C', onInput: up });
    const rRs = range('soRs', { show: v => num(v, 3) + ' Ω·cm²', onInput: up });
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function calc() {
      const G = rG.get(), T = rT.get() + 273.15, Rs = rRs.get(), vt = KB * T;
      const JL = 0.040 * G / 1000, J0 = 1e-12 * Math.pow(T / 298.15, 3) * Math.exp(1.12 / KB * (1 / 298.15 - 1 / T));
      const pts = []; const vjMax = JL > 0 ? vt * Math.log(JL / J0 + 1) : 0;
      for (let k = 0; k <= 400; k++) { const vj = vjMax * k / 400, J = JL - J0 * (Math.exp(vj / vt) - 1), V = vj - J * Rs; if (V >= 0) pts.push([V, J]); }
      let pm = [0, 0, 0]; pts.forEach(([V, J]) => { if (V * J > pm[2]) pm = [V, J, V * J]; });
      const Jsc = (() => { let lo = 0, hi = vjMax; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, J = JL - J0 * (Math.exp(m / vt) - 1); if (m - J * Rs > 0) hi = m; else lo = m; } return JL - J0 * (Math.exp(lo / vt) - 1); })();
      const Voc = vjMax, FF = Jsc > 0 && Voc > 0 ? pm[2] / (Jsc * Voc) : 0, eta = G > 0 ? pm[2] / (G / 1e4) : 0;
      R = { pts, pm, Jsc, Voc, FF, eta, G };
      set('soJ', num(Jsc * 1000, 3) + ' mA/cm²'); set('soV', num(Voc, 3) + ' V'); set('soP', num(pm[2] * 1000, 3) + ' mW/cm²');
      set('soFF', num(FF * 100, 3) + '%'); set('soEta', G > 0 ? num(eta * 100, 3) + '%' : '—');
      draw();
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 56, x1 = W - 56, y0 = 40, y1 = H - 40, vmax = 0.75, jmax = 0.05, pmax = 0.03;
      const px = v => x0 + v / vmax * (x1 - x0), pj = j => y1 - j / jmax * (y1 - y0), pp = p => y1 - p / pmax * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = C.line; [0.2, 0.4, 0.6].forEach(v => { ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke(); });
      if (R.pts.length > 1) {
        ctx.fillStyle = 'rgba(242,194,48,.25)'; ctx.fillRect(px(0), pj(R.pm[1]), px(R.pm[0]) - px(0), y1 - pj(R.pm[1]));
        ctx.strokeStyle = C.sea; ctx.lineWidth = 2.5; ctx.beginPath(); R.pts.forEach(([v, j], k) => k ? ctx.lineTo(px(v), pj(j)) : ctx.moveTo(px(v), pj(j))); ctx.stroke();
        ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); R.pts.forEach(([v, j], k) => k ? ctx.lineTo(px(v), pp(v * j)) : ctx.moveTo(px(v), pp(v * j))); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px(R.pm[0]), pj(R.pm[1]), 5, 0, 7); ctx.fill();
        ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('công suất cực đại', px(R.pm[0]) + 8, pj(R.pm[1]) - 4);
      }
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillStyle = C.sea; ctx.fillText('— mật độ dòng J (mA/cm²)', x0, 10); ctx.fillStyle = C.pos; ctx.textAlign = 'right'; ctx.fillText('- - công suất P (mW/cm²)', x1, 10);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [0, 0.2, 0.4, 0.6].forEach(v => ctx.fillText(num(v, 2) + ' V', px(v), y1 + 6));
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [0, 20, 40].forEach(j => ctx.fillText(String(j), x0 - 6, pj(j / 1000)));
      ctx.textAlign = 'left'; [0, 10, 20, 30].forEach(p => ctx.fillText(String(p), x1 + 6, pp(p / 1000)));
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('Điện áp V', (x0 + x1) / 2, H - 2);
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('ô vàng: diện tích V·J tại điểm công suất cực đại', x0 + 8, y0 + 6);
    }
    watchCanvas(cv, st, draw);
    rG.upd(); rT.upd(); rRs.upd();
  },
});
})();
