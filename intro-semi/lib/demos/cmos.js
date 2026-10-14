/* =====================================================================
   Bán dẫn: minh họa "Cổng đảo CMOS" (id: cmos, trang 4-transistor.html)
   Nhúng vào trang: <div class="demo" id="demoCmos" data-demo="cmos"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=cmos

   V_DD = 1,8 V; nMOS: V_Tn = 0,5 V, k_n = 1 mA/V²; pMOS: V_Tp = −0,5 V, k_p = k_n·(W_p/W_n)/2,5
   (lỗ trống chạy chậm hơn electron khoảng 2,5 lần). Mô hình bình phương, λ = 0,05 V⁻¹.
   V_out tìm bằng chia đôi sao cho I_n(V_in, V_out) = I_p(V_in, V_out).
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas } = SEMI;
const VDD = 1.8, VTN = 0.5, VTP = 0.5, KN = 1e-3, LAM = 0.05;
const sq = (vgs, vds, vt, k) => { const vo = vgs - vt; if (vo <= 0 || vds <= 0) return 0; return (vds < vo ? k * (vo * vds - vds * vds / 2) : k / 2 * vo * vo) * (1 + LAM * vds); };
function solve(vin, kp) {
  let lo = 0, hi = VDD;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, f = sq(vin, m, VTN, KN) - sq(VDD - vin, VDD - m, VTP, kp); if (f > 0) hi = m; else lo = m; }
  const vo = (lo + hi) / 2; return { vo, i: sq(vin, vo, VTN, KN) };
}

SEMI.demo('cmos', {
  domId: 'demoCmos',
  title: 'Cổng đảo CMOS',
  page: '4-transistor.html',
  html: `<div class="demo-title"><h4>Cổng đảo CMOS</h4><span>Một pMOS và một nMOS: vào 0 ra 1, vào 1 ra 0</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCm" class="ar tall-m" role="img" aria-label="Sơ đồ cổng đảo CMOS gồm pMOS nối với nguồn và nMOS nối đất; bên cạnh là đặc tuyến truyền đạt điện áp ra theo điện áp vào và dòng tiêu thụ."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="cmIn">Điện áp vào V_in</label><output for="cmIn"></output><input type="range" id="cmIn" min="0" max="1.8" step="0.01" value="0"></div>
      <div class="ctrl"><label for="cmR">Tỉ lệ bề rộng W_p / W_n</label><output for="cmR"></output><input type="range" id="cmR" min="1" max="5" step="0.1" value="2.5"></div>
      <dl class="readout" aria-live="polite">
        <dt>Điện áp ra V_out</dt><dd class="big" id="cmOut">—</dd>
        <dt>Mức logic ra</dt><dd id="cmLog">—</dd>
        <dt>Dòng từ nguồn xuống đất</dt><dd id="cmI">—</dd>
        <dt>Ngưỡng chuyển mạch V_M</dt><dd id="cmVm">—</dd>
      </dl>
      <p class="note-s">Ở cả hai trạng thái ổn định, luôn có một transistor tắt, nên gần như không có dòng chạy thẳng từ nguồn xuống đất. Dòng chỉ xuất hiện thoáng qua lúc chuyển mạch: đó là lý do CMOS tiết kiệm điện và thống trị mọi con chip số từ thập niên 1980.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvCm'), st = {};
    const rIn = range('cmIn', { show: v => num(v, 3) + ' V', onInput: () => upd() });
    const rR = range('cmR', { show: v => num(v, 2), onInput: () => upd() });
    const set = (k, t) => { document.getElementById(k).textContent = t; };
    let S = null;
    function upd() {
      const kp = KN * rR.get() / 2.5, vin = rIn.get(), r = solve(vin, kp);
      let lo = 0, hi = VDD; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (solve(m, kp).vo > m) lo = m; else hi = m; }
      S = { kp, vin, ...r, vm: (lo + hi) / 2 };
      set('cmOut', num(r.vo, 3) + ' V'); set('cmLog', r.vo > 0.8 * VDD ? '1 (cao)' : r.vo < 0.2 * VDD ? '0 (thấp)' : 'vùng chuyển tiếp');
      set('cmI', fmt(r.i, 'A')); set('cmVm', num(S.vm, 3) + ' V');
      draw();
    }
    function draw() {
      if (!st.ctx || !S) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const wide = W > 520, sw = wide ? W * 0.42 : W, sh = wide ? H : H * 0.48;
      // sơ đồ
      const xm = sw * 0.55, yt = 40, yb = sh - 30, ym = (yt + yb) / 2, pOn = VDD - S.vin > VTP, nOn = S.vin > VTN;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm - 40, yt); ctx.lineTo(xm + 40, yt); ctx.stroke();
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('V_DD = 1,8 V', xm, yt - 4);
      ctx.beginPath(); ctx.moveTo(xm - 30, yb); ctx.lineTo(xm + 30, yb); ctx.moveTo(xm - 20, yb + 6); ctx.lineTo(xm + 20, yb + 6); ctx.moveTo(xm - 10, yb + 12); ctx.lineTo(xm + 10, yb + 12); ctx.stroke();
      const tr = (y0, y1, on, lab, p) => {
        const yc = (y0 + y1) / 2, h = (y1 - y0) * 0.45;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xm, y0); ctx.lineTo(xm, yc - h / 2); ctx.moveTo(xm, yc + h / 2); ctx.lineTo(xm, y1); ctx.stroke();
        ctx.fillStyle = on ? (p ? 'rgba(216,49,42,.85)' : 'rgba(55,135,196,.9)') : '#d3d7dc'; ctx.fillRect(xm - 8, yc - h / 2, 16, h); ctx.strokeRect(xm - 8, yc - h / 2, 16, h);
        ctx.beginPath(); ctx.moveTo(xm - 16, yc - h / 2); ctx.lineTo(xm - 16, yc + h / 2); ctx.stroke();
        if (p) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xm - 21, yc, 4, 0, 7); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(p ? xm - 25 : xm - 16, yc); ctx.lineTo(xm - 60, yc); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab + (on ? ': dẫn' : ': tắt'), xm + 14, yc);
        return yc;
      };
      const yp = tr(yt, ym, pOn, 'pMOS', true), yn = tr(ym, yb, nOn, 'nMOS', false);
      ctx.beginPath(); ctx.moveTo(xm - 60, yp); ctx.lineTo(xm - 60, yn); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xm - 60, ym); ctx.lineTo(xm - 90, ym); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xm, ym); ctx.lineTo(xm + 50, ym); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('vào ' + num(S.vin, 2) + ' V', xm - 64, ym - 4);
      ctx.textAlign = 'left'; ctx.fillText('ra ' + num(S.vo, 2) + ' V', xm + 18, ym - 4);
      // đặc tuyến truyền đạt
      const gx0 = wide ? sw + 40 : 46, gx1 = W - 16, gy0 = wide ? 30 : sh + 24, gy1 = H - 28;
      const px = v => gx0 + v / VDD * (gx1 - gx0), py = v => gy1 - v / VDD * (gy1 - gy0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
      const pts = []; for (let k = 0; k <= 180; k++) { const v = VDD * k / 180, r = solve(v, S.kp); pts.push([v, r.vo, r.i]); }
      const imax = Math.max(...pts.map(p => p[2])) || 1;
      ctx.fillStyle = 'rgba(242,194,48,.35)'; ctx.beginPath(); ctx.moveTo(px(0), gy1); pts.forEach(([v, , i]) => ctx.lineTo(px(v), gy1 - i / imax * (gy1 - gy0) * 0.5)); ctx.lineTo(px(VDD), gy1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.sea; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach(([v, vo], k) => k ? ctx.lineTo(px(v), py(vo)) : ctx.moveTo(px(v), py(vo))); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(VDD), py(VDD)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px(S.vin), py(S.vo), 5, 0, 7); ctx.fill();
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = C.sea; ctx.fillText('V_out theo V_in', gx0, gy0 - 4); ctx.fillStyle = '#9a7a12'; ctx.textAlign = 'right'; ctx.fillText('vùng vàng: dòng tiêu thụ', gx1, gy0 - 4);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [0, 0.9, 1.8].forEach(v => ctx.fillText(num(v, 2) + ' V', px(v), gy1 + 4));
    }
    watchCanvas(cv, st, draw);
    rR.upd(); rIn.upd();
  },
});
})();
