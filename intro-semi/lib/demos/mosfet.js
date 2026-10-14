/* =====================================================================
   Bán dẫn: minh họa "MOSFET kênh n" (id: mosfet, trang 4-transistor.html)
   Nhúng vào trang: <div class="demo" id="demoMos" data-demo="mosfet"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=mosfet

   Mô hình bình phương (kênh dài), NMOS: V_T = 0,7 V, k = μ_n C_ox W/L = 2 mA/V², λ = 0,05 V⁻¹.
   Tắt: V_GS < V_T → I_D = 0 (bỏ qua dòng dưới ngưỡng).
   Tuyến tính: V_DS < V_ov = V_GS − V_T → I_D = k[(V_ov)V_DS − V_DS²/2](1 + λV_DS).
   Bão hòa:   V_DS ≥ V_ov → I_D = (k/2)V_ov²(1 + λV_DS).
   Mặt cắt: mật độ điện tích kênh ∝ V_ov − V(x), với V(x) lấy từ nghiệm của mô hình kênh dài.
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, watchCanvas, loopWhenVisible, REDUCED } = SEMI;
const VT = 0.7, K = 2e-3, LAM = 0.05;
const id = (vgs, vds) => { const vo = vgs - VT; if (vo <= 0) return 0; return vds < vo ? K * (vo * vds - vds * vds / 2) * (1 + LAM * vds) : K / 2 * vo * vo * (1 + LAM * vds); };

SEMI.demo('mosfet', {
  domId: 'demoMos',
  title: 'MOSFET kênh n',
  page: '4-transistor.html',
  html: `<div class="demo-title"><h4>MOSFET kênh n</h4><span>Điện áp cổng mở kênh; điện áp máng đẩy electron chạy qua</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvMos" class="ar" role="img" aria-label="Mặt cắt MOSFET: cổng nằm trên lớp oxit mỏng, nguồn và máng là hai vùng n+, kênh electron hình thành dưới cổng; bên dưới là họ đặc tuyến dòng máng theo điện áp máng–nguồn."></canvas><canvas id="cvMosIV" class="profile" aria-hidden="true"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="msG">Điện áp cổng V_GS</label><output for="msG"></output><input type="range" id="msG" min="0" max="3" step="0.05" value="1.8"></div>
      <div class="ctrl"><label for="msD">Điện áp máng V_DS</label><output for="msD"></output><input type="range" id="msD" min="0" max="3" step="0.05" value="0.6"></div>
      <dl class="readout" aria-live="polite">
        <dt>Vùng hoạt động</dt><dd class="big" id="msReg">—</dd>
        <dt>V_GS − V_T</dt><dd id="msOv">—</dd>
        <dt>Dòng máng I_D</dt><dd class="big" id="msId">—</dd>
      </dl>
      <p class="note-s">V_GS dưới ngưỡng V_T = 0,7 V: không có kênh, transistor tắt như công tắc hở (bỏ qua dòng rò dưới ngưỡng). V_GS trên ngưỡng: lớp electron mỏng hình thành dưới cổng, transistor dẫn như công tắc đóng. Khi V_DS lớn, kênh bị "thắt" ở phía máng và dòng gần như không tăng nữa: vùng bão hòa.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvMos'), cvI = document.getElementById('cvMosIV'), st = {}, stI = {};
    let flow = 0;
    const rG = range('msG', { show: v => num(v, 3) + ' V', onInput: () => upd() });
    const rD = range('msD', { show: v => num(v, 3) + ' V', onInput: () => upd() });
    const set = (k, t) => { document.getElementById(k).textContent = t; };
    function upd() {
      const vg = rG.get(), vd = rD.get(), vo = vg - VT;
      set('msReg', vo <= 0 ? 'tắt' : vd < vo ? 'tuyến tính' : 'bão hòa');
      set('msOv', (vo < 0 ? '−' : '') + num(Math.abs(vo), 3) + ' V'); set('msId', fmt(id(vg, vd), 'A'));
      draw(); drawIV();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, vg = rG.get(), vd = rD.get(), vo = vg - VT;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const m = 30, sx0 = m, sx1 = W - m, ys = H * 0.45, yb = H - 16, wS = (sx1 - sx0) * 0.24, cx0 = sx0 + wS, cx1 = sx1 - wS, dep = 34;
      // đế p
      ctx.fillStyle = '#f6e2e1'; ctx.fillRect(sx0, ys, sx1 - sx0, yb - ys); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(sx0, ys, sx1 - sx0, yb - ys);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.pos; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('đế Si loại p (lỗ trống là đa số)', (sx0 + sx1) / 2, yb - 6);
      // nguồn, máng n+
      [[sx0 + 8, cx0 + 8, 'nguồn n⁺'], [cx1 - 8, sx1 - 8, 'máng n⁺']].forEach(([a, b, t]) => {
        ctx.fillStyle = '#d6e8f6'; ctx.beginPath(); ctx.moveTo(a, ys); ctx.lineTo(b, ys); ctx.quadraticCurveTo(b, ys + dep * 1.6, (a + b) / 2, ys + dep * 1.6); ctx.quadraticCurveTo(a, ys + dep * 1.6, a, ys); ctx.fill(); ctx.strokeStyle = C.sea; ctx.stroke();
        ctx.fillStyle = C.sea; ctx.textBaseline = 'middle'; ctx.fillText(t, (a + b) / 2, ys + dep * 0.8);
      });
      // vùng nghèo dưới cổng
      if (vg > 0.1) { ctx.fillStyle = 'rgba(160,165,172,.25)'; ctx.fillRect(cx0 + 8, ys, cx1 - cx0 - 16, Math.min(40, 10 + vg * 9)); }
      // kênh
      if (vo > 0) {
        const vds = Math.min(vd, vo), pinch = vd >= vo, xe = pinch ? cx1 - 8 - Math.min(30, (vd - vo) * 18) : cx1 - 8;
        ctx.fillStyle = 'rgba(55,135,196,.85)'; ctx.beginPath(); ctx.moveTo(cx0 + 4, ys);
        const qx = f => Math.sqrt(Math.max(0, vo * vo - (vo * vo - (vo - vds) ** 2) * f)) * 7;
        for (let k = 0; k <= 40; k++) { const f = k / 40, x = cx0 + 4 + (xe - cx0 - 4) * f; ctx.lineTo(x, ys + Math.max(pinch && k === 40 ? 0 : 1.2, qx(f))); }
        ctx.lineTo(xe, ys); ctx.closePath(); ctx.fill();
        // electron chạy
        const n = 10; ctx.fillStyle = '#fff';
        for (let k = 0; k < n; k++) { const f = ((k / n) + flow) % 1, x = cx0 + 4 + (cx1 - cx0 - 8) * f; ctx.beginPath(); ctx.arc(x, ys + 3, 2.2, 0, 7); ctx.fill(); }
      }
      // oxit + cổng
      const ox = 7, gh = 24;
      ctx.fillStyle = '#fff6d6'; ctx.fillRect(cx0, ys - ox, cx1 - cx0, ox); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(cx0, ys - ox, cx1 - cx0, ox);
      ctx.fillStyle = '#9aa1aa'; ctx.fillRect(cx0, ys - ox - gh, cx1 - cx0, gh); ctx.strokeRect(cx0, ys - ox - gh, cx1 - cx0, gh);
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText('cổng', (cx0 + cx1) / 2, ys - ox - gh / 2);
      ctx.fillStyle = '#9a7a12'; ctx.textAlign = 'left'; ctx.fillText('oxit cổng', cx1 + 4, ys - ox / 2 - 6);
      // tiếp xúc + điện áp
      const term = (x, y, lab, v) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, 34); ctx.stroke(); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(lab + ' = ' + v, x, 30); };
      term((sx0 + cx0) / 2 + 4, ys, 'S', '0 V'); term((cx0 + cx1) / 2, ys - ox - gh, 'G', num(vg, 3) + ' V'); term((cx1 + sx1) / 2 - 4, ys, 'D', num(vd, 3) + ' V');
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(vo <= 0 ? 'chưa có kênh: transistor tắt' : vd >= vo ? 'kênh bị thắt ở phía máng (bão hòa)' : 'kênh electron nối nguồn với máng', (cx0 + cx1) / 2, ys + 46);
    }
    function drawIV() {
      if (!stI.ctx) return;
      const { ctx, W, H } = stI; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x0 = 50, x1 = W - 70, y0 = 22, y1 = H - 22, imax = id(3, 3) * 1.05, px = v => x0 + v / 3 * (x1 - x0), py = i => y1 - i / imax * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.font = '500 11px "Be Vietnam Pro", system-ui, sans-serif';
      [1, 1.5, 2, 2.5, 3].forEach(vg => { ctx.strokeStyle = '#c3c8ce'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = 0; k <= 120; k++) { const v = 3 * k / 120; k ? ctx.lineTo(px(v), py(id(vg, v))) : ctx.moveTo(px(v), py(id(vg, v))); } ctx.stroke();
        if (vg > 1) { ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('V_GS = ' + num(vg, 2), x1 + 4, py(id(vg, 3))); } });
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.beginPath(); for (let k = 0; k <= 60; k++) { const vo = 2.3 * k / 60; k ? ctx.lineTo(px(vo), py(id(vo + VT, vo))) : ctx.moveTo(px(vo), py(id(vo + VT, vo))); } ctx.stroke(); ctx.setLineDash([]);
      const vg = rG.get(), vd = rD.get();
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.4; ctx.beginPath(); for (let k = 0; k <= 120; k++) { const v = 3 * k / 120; k ? ctx.lineTo(px(v), py(id(vg, v))) : ctx.moveTo(px(v), py(id(vg, v))); } ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px(vd), py(id(vg, vd)), 5, 0, 7); ctx.fill();
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink;
      ctx.fillText('Đặc tuyến ra I_D theo V_DS (nét đứt: ranh giới tuyến tính / bão hòa)', x0 + 6, 3);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [0, 1, 2, 3].forEach(v => ctx.fillText(v + ' V', px(v), y1 + 4));
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(imax, 'A', 2), x0 - 4, y0 + 4);
    }
    watchCanvas(cv, st, draw); watchCanvas(cvI, stI, drawIV);
    loopWhenVisible(cv, dt => { if (REDUCED) return; const i = id(rG.get(), rD.get()); if (i > 0) { flow = (flow + dt * Math.min(1.2, 0.08 + i / 4e-3)) % 1; draw(); } });
    rG.upd(); rD.upd();
  },
});
})();
