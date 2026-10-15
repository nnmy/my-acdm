/* =====================================================================
   Toán học: minh họa "Quy luật thay đổi" (id: ode-models, trang 4-phuong-trinh-vi-phan.html)
   Bốn mô hình: phân rã/tăng trưởng mũ, logistic, làm nguội Newton, dao động tắt dần.
   - Mô hình bậc một: vẽ trường hướng (mỗi gạch nhỏ có hệ số góc = y' tại điểm đó). Bấm/kéo trên đồ thị để đổi giá trị ban đầu.
   - Nghiệm "đúng": Runge–Kutta bậc 4 bước rất nhỏ. Tùy chọn hiện phương pháp Euler với bước h để thấy sai số.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt, drag } = LT;
const M = {
  exp: { v: [0, 10, 0, 10], y0: 6, p: { lab: 'Hệ số k (1/giờ)', min: -1, max: 0.5, val: -0.3, step: 0.01 },
    f: (t, y, k) => k * y, yname: 'lượng y', tname: 't (giờ)',
    info: (k, y0) => k < 0 ? `Phân rã: y = y₀·e^(kt). Thời gian bán thải = ln 2 / |k| = ${num(Math.log(2) / -k, 3)} giờ.` : k > 0 ? `Tăng trưởng: y = y₀·e^(kt). Thời gian nhân đôi = ln 2 / k = ${num(Math.log(2) / k, 3)} giờ.` : 'k = 0: không đổi.' },
  logi: { v: [0, 20, 0, 12], y0: 0.5, p: { lab: 'Tốc độ tăng r (1/ngày)', min: 0.1, max: 1.5, val: 0.6, step: 0.01 },
    f: (t, y, r) => r * y * (1 - y / 10), yname: 'quần thể P', tname: 't (ngày)',
    info: (r) => `Logistic với sức chứa K = 10: lúc đầu tăng gần như mũ, rồi chậm lại và bão hòa ở K. Tăng nhanh nhất khi P = K/2.` },
  cool: { v: [0, 60, 0, 100], y0: 90, p: { lab: 'Hệ số k (1/phút)', min: 0.01, max: 0.2, val: 0.037, step: 0.001 },
    f: (t, y, k) => -k * (y - 25), yname: 'nhiệt độ T (°C)', tname: 't (phút)',
    info: (k, y0) => y0 > 50 ? `Cà phê ${num(y0, 3)}°C trong phòng 25°C: nguội còn 50°C sau ${num(Math.log((y0 - 25) / 25) / k, 3)} phút.` : 'Vật lạnh hơn phòng thì ấm dần lên, cũng tiến về 25°C.' },
  osc: { v: [0, 20, -2.2, 2.2], y0: 1.5, p: { lab: 'Hệ số tắt dần ζ', min: 0, max: 1.6, val: 0.15, step: 0.01 }, second: true,
    f: (t, s, z) => [s[1], -2 * z * 1.5 * s[1] - 1.5 * 1.5 * s[0]], yname: 'li độ x', tname: 't (s)',
    info: (z) => z === 0 ? 'ζ = 0: dao động mãi không tắt.' : z < 1 ? `ζ < 1 (tắt dần dưới tới hạn): dao động với biên độ giảm dần, như xích đu hay lò xo nhún.` : z === 1 ? 'ζ = 1: tắt dần tới hạn, về vị trí cân bằng nhanh nhất mà không vượt qua.' : 'ζ > 1 (quá tắt): bò chậm về vị trí cân bằng, không dao động.' },
};
const rk4 = (f, t, y, h, p) => {
  if (Array.isArray(y)) {
    const add = (a, b, c) => a.map((v, i) => v + c * b[i]);
    const k1 = f(t, y, p), k2 = f(t + h / 2, add(y, k1, h / 2), p), k3 = f(t + h / 2, add(y, k2, h / 2), p), k4 = f(t + h, add(y, k3, h), p);
    return y.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  const k1 = f(t, y, p), k2 = f(t + h / 2, y + h / 2 * k1, p), k3 = f(t + h / 2, y + h / 2 * k2, p), k4 = f(t + h, y + h * k3, p);
  return y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
};
LT.demo('ode-models', {
  deps: ['plot'],
  html: `<div class="demo-title"><h4>Quy luật thay đổi</h4><span>Chọn mô hình, đổi tham số; bấm vào đồ thị để đổi giá trị ban đầu</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvOde" class="ar" role="img" aria-label="Trường hướng và đường nghiệm của phương trình vi phân"></canvas><span class="hint" style="top:8px;bottom:auto;left:auto;right:10px">Bấm hoặc kéo trên đồ thị để đặt giá trị ban đầu</span></div>
    <div class="panel">
      <div class="ctrl"><label for="odeM">Mô hình</label><select id="odeM">
        <option value="exp">Phân rã / tăng trưởng mũ: y' = ky</option><option value="logi">Logistic: P' = rP(1 − P/K)</option>
        <option value="cool" selected>Làm nguội Newton: T' = −k(T − 25)</option><option value="osc">Dao động tắt dần: x'' + 2ζωx' + ω²x = 0</option></select></div>
      <div class="ctrl"><label for="odeP" id="odePL">Tham số</label><output for="odeP"></output><input type="range" id="odeP"></div>
      <div class="checks"><label><input type="checkbox" id="odeEu"> Hiện phương pháp Euler</label></div>
      <div class="ctrl" id="odeHw"><label for="odeH">Bước Euler h</label><output for="odeH"></output><input type="range" id="odeH" min="1" max="100" value="25"></div>
      <dl class="readout" aria-live="polite"><dt>Giá trị ban đầu</dt><dd id="odeY0">—</dd><dt>Sai số Euler cuối</dt><dd id="odeErr">—</dd></dl>
      <p class="note-s" id="odeNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvOde'), st = {}, sel = root.querySelector('#odeM'), eu = root.querySelector('#odeEu'), pIn = root.querySelector('#odeP');
    let y0 = M.cool.y0, P = null;
    const rP = range('odeP', { show: v => num(v, 3), onInput: draw });
    const rH = range('odeH', { map: u => { const D = M[sel.value]; return (D.v[1] - D.v[0]) * u / 1000; }, show: v => num(v, 3), onInput: draw });
    function setModel() { const D = M[sel.value]; Object.assign(pIn, { min: D.p.min, max: D.p.max, step: D.p.step }); pIn.value = D.p.val; root.querySelector('#odePL').textContent = D.p.lab; y0 = D.y0; rP.upd(); rH.upd(); }
    sel.addEventListener('change', setModel); eu.addEventListener('change', draw);
    drag(cv, { pick: (x, y) => P && x > P.l && x < P.l + P.pw && y > P.t && y < P.t + P.ph ? 1 : null, move: (o, x, y) => { const D = M[sel.value]; y0 = Math.max(D.v[2], Math.min(D.v[3], P.iy(y))); draw(); } });
    function draw() {
      if (!st.ctx) return;
      const D = M[sel.value], k = rP.get(), h = rH.get(), [t0, t1, ya, yb] = D.v;
      P = LT.plot(st, { x0: t0, x1: t1, y0: ya, y1: yb });
      P.frame({ xname: D.tname, yname: D.yname });
      const ctx = P.ctx;
      if (!D.second) P.clip(() => {   // trường hướng
        ctx.strokeStyle = '#A9C6DA'; ctx.lineWidth = 1.2;
        const nx = 22, ny = 15, sx = (P.ph / (yb - ya)) / (P.pw / (t1 - t0));
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
          const t = t0 + (t1 - t0) * (i + 0.5) / (nx + 1), y = ya + (yb - ya) * (j + 0.5) / (ny + 1), s = D.f(t, y, k);
          const ang = Math.atan(s * sx), L = 9, cx = P.X(t), cy = P.Y(y);
          ctx.beginPath(); ctx.moveTo(cx - L * Math.cos(ang), cy + L * Math.sin(ang)); ctx.lineTo(cx + L * Math.cos(ang), cy - L * Math.sin(ang)); ctx.stroke();
        }
      });
      // nghiệm RK4
      const N = 1200, dt = (t1 - t0) / N; let y = D.second ? [y0, 0] : y0; const pts = [[t0, D.second ? y0 : y0]];
      for (let i = 0; i < N; i++) { y = rk4(D.f, t0 + i * dt, y, dt, k); pts.push([t0 + (i + 1) * dt, D.second ? y[0] : y]); }
      P.clip(() => { ctx.strokeStyle = C.sea; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([t, v], i) => i ? ctx.lineTo(P.X(t), P.Y(v)) : ctx.moveTo(P.X(t), P.Y(v))); ctx.stroke(); });
      if (sel.value === 'cool' || sel.value === 'logi') P.clip(() => { const ref = sel.value === 'cool' ? 25 : 10; ctx.setLineDash([6, 4]); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.l, P.Y(ref)); ctx.lineTo(P.l + P.pw, P.Y(ref)); ctx.stroke(); ctx.setLineDash([]); P.text(sel.value === 'cool' ? 'nhiệt độ phòng 25°C' : 'sức chứa K = 10', P.l + P.pw - 6, P.Y(ref) - 4, '#9A7A00', 'right'); });
      let err = null;
      root.querySelector('#odeHw').style.opacity = eu.checked ? 1 : .4;
      if (eu.checked) {   // Euler
        let ye = D.second ? [y0, 0] : y0, t = t0; const ep = [[t, y0]];
        while (t < t1 - 1e-9) { const hh = Math.min(h, t1 - t), d = D.f(t, ye, k); ye = D.second ? ye.map((v, i) => v + hh * d[i]) : ye + hh * d; t += hh; ep.push([t, D.second ? ye[0] : ye]); }
        P.clip(() => { ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.beginPath(); ep.forEach(([tt, v], i) => i ? ctx.lineTo(P.X(tt), P.Y(v)) : ctx.moveTo(P.X(tt), P.Y(v))); ctx.stroke(); ep.forEach(([tt, v]) => P.dot(tt, v, C.pos, 3)); });
        err = Math.abs(ep[ep.length - 1][1] - pts[pts.length - 1][1]);
      }
      P.clip(() => P.dot(t0, y0, C.sea, 6));
      setTxt('odeY0', num(y0, 4)); setTxt('odeErr', err === null ? '—' : num(err, 3));
      setTxt('odeNote', D.info(k, y0) + (eu.checked ? ' Đường đỏ: Euler đi từng bước theo hệ số góc tại đầu bước; bước càng lớn càng lệch.' : ''));
    }
    watchCanvas(cv, st, draw); setModel();
  },
});
})();
