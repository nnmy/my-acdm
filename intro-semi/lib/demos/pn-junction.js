/* =====================================================================
   Bán dẫn: minh họa "Tiếp giáp p–n" (id: pn-junction, trang 3-diode.html)
   Nhúng vào trang: <div class="demo" id="demoPn" data-demo="pn-junction"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=pn-junction

   Tiếp giáp p–n Si đột ngột, 300 K, gần đúng vùng nghèo (depletion approximation):
   V_bi = V_T·ln(N_A N_D / n_i²), W = √(2ε_s(V_bi − V)/q · (N_A + N_D)/(N_A N_D)),
   x_p = W·N_D/(N_A + N_D), x_n = W·N_A/(N_A + N_D), E_max = q N_A x_p / ε_s.
   Đặc tuyến diode lý tưởng (Shockley): I = I_0 (e^(V/V_T) − 1), I_0 = qA n_i² (D_n/(L_n N_A) + D_p/(L_p N_D)),
   L = √(Dτ), τ = 1 µs, A = 1 mm², độ linh động theo Caughey–Thomas. n_i = 1e10 cm⁻³, ε_s = 11,7 ε₀.
   Bỏ qua: đánh thủng, dòng phát sinh trong vùng nghèo, điện trở nối tiếp, phun mạnh.
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, watchCanvas } = SEMI;
const VT = 0.02585, Q = 1.602e-19, NI = 1e10, ES = 11.7 * 8.854e-14, TAU = 1e-6, AREA = 0.01, HG = 0.56;
const mun = N => 65 + 1265 / (1 + Math.pow(N / 8.5e16, 0.72)), mup = N => 48 + 447 / (1 + Math.pow(N / 6.3e16, 0.76));

SEMI.demo('pn-junction', {
  domId: 'demoPn',
  title: 'Tiếp giáp p–n',
  page: '3-diode.html',
  html: `<div class="demo-title"><h4>Tiếp giáp p–n</h4><span>Kéo điện áp để phân cực thuận hoặc ngược</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvPn" class="ar tall-m" role="img" aria-label="Giản đồ vùng năng lượng của tiếp giáp p–n theo vị trí, với vùng nghèo tô màu; bên dưới là mật độ điện tích và điện trường. Dưới cùng là đặc tuyến dòng–áp của diode."></canvas><canvas id="cvPnIV" class="profile" aria-hidden="true"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="pnV">Điện áp V (p so với n)</label><output for="pnV"></output><input type="range" id="pnV" class="pos" min="-5" max="0.75" step="0.01" value="0"></div>
      <div class="ctrl"><label for="pnNa">Pha tạp bên p, N_A</label><output for="pnNa"></output><input type="range" id="pnNa" min="14" max="18" step="0.1" value="16"></div>
      <div class="ctrl"><label for="pnNd">Pha tạp bên n, N_D</label><output for="pnNd"></output><input type="range" id="pnNd" min="14" max="18" step="0.1" value="16"></div>
      <div class="checks"><label><input type="checkbox" id="pnLog"> Trục dòng theo thang log</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Thế tiếp xúc V_bi</dt><dd id="pnVbi">—</dd>
        <dt>Bề rộng vùng nghèo W</dt><dd class="big" id="pnW">—</dd>
        <dt>Điện trường lớn nhất</dt><dd id="pnE">—</dd>
        <dt>Dòng điện I</dt><dd class="big" id="pnI">—</dd>
        <dt>Dòng bão hòa ngược I₀</dt><dd id="pnI0">—</dd>
      </dl>
      <p class="note-s" id="pnClamp" hidden>* Điện áp đặt vượt V_bi − 0,04 V: gần đúng vùng nghèo và phương trình Shockley không còn dùng được (dòng thật bị giới hạn bởi điện trở nối tiếp và phun mạnh), nên mô hình giữ V ở mức đó.</p>
      <p class="note-s">Phân cực thuận (V &gt; 0) hạ thấp "bức tường" năng lượng, dòng tăng theo hàm mũ: cứ thêm khoảng 60 mV thì dòng tăng 10 lần. Phân cực ngược nâng bức tường lên, vùng nghèo rộng ra, chỉ còn dòng rất nhỏ I₀. Mô hình bỏ qua đánh thủng ở điện áp ngược lớn.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvPn'), cvI = document.getElementById('cvPnIV'), st = {}, stI = {};
    let R = null, logI = false;
    const rV = range('pnV', { show: v => (v >= 0 ? '+' : '−') + num(Math.abs(v), 3) + ' V', onInput: () => calc() });
    const rA = range('pnNa', { map: v => 10 ** v, show: v => sci(v, 2) + ' cm⁻³', onInput: () => calc() });
    const rD = range('pnNd', { map: v => 10 ** v, show: v => sci(v, 2) + ' cm⁻³', onInput: () => calc() });
    document.getElementById('pnLog').addEventListener('change', e => { logI = e.target.checked; drawIV(); });
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    const geom = (NA, ND, vbi, V) => { const W = Math.sqrt(2 * ES * Math.max(vbi - V, 1e-4) / Q * (NA + ND) / (NA * ND)); return { W, xp: W * ND / (NA + ND), xn: W * NA / (NA + ND) }; };
    function calc() {
      const NA = rA.get(), ND = rD.get(), vbi = VT * Math.log(NA * ND / (NI * NI));
      const V = Math.min(rV.get(), vbi - 0.04);
      const g = geom(NA, ND, vbi, V), Em = Q * NA * g.xp / ES;
      const Dn = mun(NA) * VT, Dp = mup(ND) * VT, I0 = Q * AREA * NI * NI * (Dn / (Math.sqrt(Dn * TAU) * NA) + Dp / (Math.sqrt(Dp * TAU) * ND));
      const I = I0 * (Math.exp(V / VT) - 1);
      const win = 1.25 * geom(NA, ND, vbi, -5).W;
      R = { NA, ND, vbi, V, ...g, Em, I0, I, win };
      set('pnVbi', num(vbi, 3) + ' V'); set('pnW', num(g.W * 1e4, 3) + ' µm'); set('pnE', fmt(Em * 100, 'V/m'));
      set('pnI', (I < 0 ? '−' : '') + fmt(Math.abs(I), 'A') + (rV.get() > V + 1e-6 ? ' *' : '')); set('pnI0', fmt(I0, 'A'));
      document.getElementById('pnClamp').hidden = !(rV.get() > V + 1e-6);
      draw(); drawIV();
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st, { NA, ND, vbi, V, xp, xn, Em, win } = R;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 48, x1 = W - 16, px = x => x0 + (x + win) / (2 * win) * (x1 - x0);
      const y0 = 30, y1 = H * 0.55, phi = x => x <= -xp ? 0 : x <= 0 ? Q * NA * (x + xp) ** 2 / (2 * ES) : x < xn ? (vbi - V) - Q * ND * (xn - x) ** 2 / (2 * ES) : vbi - V;
      const efn = 0, efp = -V, eip = efp + VT * Math.log(NA / NI), ei = x => eip - phi(x);
      const lo = Math.min(ei(win) - HG, efp, efn) - 0.15, hi = Math.max(eip + HG, efn) + 0.15, ey = e => y1 - (e - lo) / (hi - lo) * (y1 - y0);
      // vùng nghèo
      ctx.fillStyle = 'rgba(242,194,48,.18)'; ctx.fillRect(px(-xp), y0, px(xn) - px(-xp), H - y0 - 8);
      ctx.fillStyle = 'rgba(216,49,42,.06)'; ctx.fillRect(x0, y0, px(-xp) - x0, y1 - y0);
      ctx.fillStyle = 'rgba(55,135,196,.06)'; ctx.fillRect(px(xn), y0, x1 - px(xn), y1 - y0);
      const curve = (f, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); for (let k = 0; k <= 300; k++) { const x = -win + 2 * win * k / 300; k ? ctx.lineTo(px(x), ey(f(x))) : ctx.moveTo(px(x), ey(f(x))); } ctx.stroke(); ctx.setLineDash([]); };
      curve(x => ei(x) + HG, C.ink, 2.5); curve(x => ei(x) - HG, C.ink, 2.5); curve(ei, '#9DA4AD', 1, [3, 3]);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, ey(efp)); ctx.lineTo(px(-xp), ey(efp)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px(xn), ey(efn)); ctx.lineTo(x1, ey(efn)); ctx.stroke();
      if (Math.abs(V) > 0.005) { ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px(-xp), ey(efp)); ctx.lineTo(px(xn), ey(efp)); ctx.moveTo(px(-xp), ey(efn)); ctx.lineTo(px(xn), ey(efn)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
      ctx.fillStyle = C.ink; ctx.fillText('E_C', x0 + 4, ey(eip + HG) - 3); ctx.fillText('E_V', x0 + 4, ey(eip - HG) - 3);
      ctx.fillStyle = '#9a7a12'; ctx.textAlign = 'right'; ctx.fillText('E_F', x1 - 4, ey(efn) - 3);
      ctx.fillStyle = C.pos; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('bên p', x0 + 4, 10);
      ctx.fillStyle = C.neg; ctx.textAlign = 'right'; ctx.fillText('bên n', x1 - 4, 10);
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText('vùng nghèo', (px(-xp) + px(xn)) / 2, 10);
      // hạt tải minh họa ở hai bên
      for (let k = 0; k < 6; k++) { const xa = x0 + 10 + k * (px(-xp) - x0 - 20) / 6, xb = px(xn) + 14 + k * (x1 - px(xn) - 24) / 6;
        if (xa < px(-xp) - 6) { ctx.strokeStyle = C.pos; ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xa, ey(eip - HG) + 8, 3.5, 0, 7); ctx.fill(); ctx.stroke(); }
        if (xb < x1 - 6) { ctx.fillStyle = C.neg; ctx.beginPath(); ctx.arc(xb, ey(efn - VT * Math.log(ND / NI) + HG) - 8, 3.5, 0, 7); ctx.fill(); } }
      // mật độ điện tích và điện trường
      const z0 = y1 + 44, z1 = H - 10, zm = (z0 + z1) / 2, half = (z1 - z0) / 2 - 4;
      const qmax = Math.max(NA, ND), pq = v => zm - v / qmax * half * 0.9;
      ctx.fillStyle = 'rgba(216,49,42,.5)'; ctx.fillRect(px(-xp), zm, px(0) - px(-xp), pq(-NA) - zm);
      ctx.fillStyle = 'rgba(55,135,196,.5)'; ctx.fillRect(px(0), pq(ND), px(xn) - px(0), zm - pq(ND));
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, zm); ctx.lineTo(x1, zm); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, zm); ctx.lineTo(px(-xp), zm); ctx.lineTo(px(0), zm + half * 0.95); ctx.lineTo(px(xn), zm); ctx.lineTo(x1, zm); ctx.stroke();
      ctx.font = '500 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('Điện tích (cột: ion âm bên p, ion dương bên n) và độ lớn điện trường (đường đen, chỉ từ n sang p)', x0, z0 - 4);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('−' + num(win * 1e4, 2) + ' µm', x0 + 24, y1 + 14); ctx.fillText('0', px(0), y1 + 14); ctx.fillText('+' + num(win * 1e4, 2) + ' µm', x1 - 24, y1 + 14);
      void Em;
    }
    function drawIV() {
      if (!stI.ctx || !R) return;
      const { ctx, W, H } = stI; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const x0 = 56, x1 = W - 12, y0 = 20, y1 = H - 22, va = -2, vb = 0.8, px = v => x0 + (v - va) / (vb - va) * (x1 - x0);
      const I = v => R.I0 * (Math.exp(Math.min(v, R.vbi - 0.04) / VT) - 1);
      let py, labels;
      if (logI) { const lmin = Math.log10(R.I0) - 1, lmax = -1; py = v => y1 - (Math.log10(Math.max(Math.abs(I(v)), 10 ** lmin)) - lmin) / (lmax - lmin) * (y1 - y0); labels = [[lmax, '100 mA'], [lmin, fmt(10 ** lmin, 'A', 2)]]; }
      else { const imax = 0.1; py = v => { const i = Math.max(-0.005, Math.min(imax, I(v))); return y1 - 6 - i / imax * (y1 - y0 - 6); }; labels = null; }
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(0), y0); ctx.lineTo(px(0), y1); ctx.stroke();
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.2; ctx.beginPath(); for (let k = 0; k <= 400; k++) { const v = va + (vb - va) * k / 400; k ? ctx.lineTo(px(v), py(v)) : ctx.moveTo(px(v), py(v)); } ctx.stroke();
      const vv = Math.max(va, Math.min(vb, R.V)); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px(vv), py(vv), 5, 0, 7); ctx.fill();
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(logI ? 'Đặc tuyến I–V, |I| thang log' : 'Đặc tuyến I–V (trục dòng tới 100 mA)', x0, 3);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [-2, -1, 0, 0.4, 0.8].forEach(v => ctx.fillText(String(v).replace('.', ',').replace('-', '−') + ' V', px(v), y1 + 5));
      if (labels) { ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(labels[0][1], x0 - 4, y0); ctx.fillText(labels[1][1], x0 - 4, y1); }
    }
    watchCanvas(cv, st, draw); watchCanvas(cvI, stI, drawIV);
    rA.upd(); rD.upd(); rV.upd();
  },
});
})();
