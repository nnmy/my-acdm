/* =====================================================================
   Toán học: minh họa "Từ cát tuyến đến tiếp tuyến" (id: der-tangent, trang 2-dao-ham.html)
   Cát tuyến qua (x₀, f(x₀)) và (x₀ + h, f(x₀ + h)); khi h → 0 nó tiến tới tiếp tuyến, hệ số góc → f'(x₀).
   Khung dưới vẽ đồ thị đạo hàm f'(x) với điểm đang xét.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt } = LT;
const F = {
  sq: { f: x => x * x, d: x => 2 * x, v: [-3, 3, -2, 9], dv: [-7, 7], name: 'f(x) = x²', dn: "f'(x) = 2x" },
  cub: { f: x => x * x * x - 3 * x, d: x => 3 * x * x - 3, v: [-3, 3, -6, 6], dv: [-5, 25], name: 'f(x) = x³ − 3x', dn: "f'(x) = 3x² − 3" },
  sin: { f: Math.sin, d: Math.cos, v: [-1, 7, -1.8, 1.8], dv: [-1.5, 1.5], name: 'f(x) = sin x', dn: "f'(x) = cos x" },
  exp: { f: Math.exp, d: Math.exp, v: [-3, 2.5, -1, 9], dv: [-1, 9], name: 'f(x) = eˣ', dn: "f'(x) = eˣ" },
  car: { f: t => t < 4 ? 2.5 * t * t : 40 + 20 * (t - 4), d: t => t < 4 ? 5 * t : 20, v: [0, 8, -5, 130], dv: [-2, 25], name: 'vị trí xe s(t) (m)', dn: 'vận tốc v(t) = s\'(t) (m/s)', car: true },
};
LT.demo('der-tangent', {
  deps: ['plot'],
  html: `<div class="demo-title"><h4>Từ cát tuyến đến tiếp tuyến</h4><span>Kéo x₀ để di chuyển, giảm h để cát tuyến thành tiếp tuyến</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvDer" class="ar" role="img" aria-label="Đồ thị hàm số với cát tuyến và tiếp tuyến"></canvas><canvas id="cvDer2" class="profile" role="img" aria-label="Đồ thị đạo hàm"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="derF">Hàm số</label><select id="derF">
        <option value="sq">f(x) = x²</option><option value="cub">f(x) = x³ − 3x</option><option value="sin">f(x) = sin x</option>
        <option value="exp">f(x) = eˣ</option><option value="car">Xe tăng tốc rồi chạy đều: s(t)</option></select></div>
      <div class="ctrl"><label for="derX">Điểm x₀</label><output for="derX"></output><input type="range" id="derX" min="0" max="1000" value="650"></div>
      <div class="ctrl"><label for="derH">Bước h</label><output for="derH"></output><input type="range" id="derH" min="0" max="100" value="20"></div>
      <dl class="readout" aria-live="polite">
        <dt>Hệ số góc cát tuyến</dt><dd id="derS">—</dd>
        <dt>Đạo hàm f'(x₀)</dt><dd class="big" id="derD">—</dd>
        <dt>Chênh lệch</dt><dd id="derE">—</dd>
      </dl>
      <p class="legend"><span><i style="background:${C.sea}"></i>đồ thị</span><span><i style="background:${C.gold}"></i>cát tuyến</span><span><i style="background:${C.pos}"></i>tiếp tuyến</span></p>
      <p class="note-s" id="derNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvDer'), cv2 = root.querySelector('#cvDer2'), st = {}, st2 = {};
    const sel = root.querySelector('#derF');
    const xOf = u => { const D = F[sel.value]; return D.v[0] + (D.v[1] - D.v[0]) * (0.05 + 0.85 * u / 1000); };
    const rX = range('derX', { map: xOf, show: x => num(x, 3), onInput: draw });
    const rH = range('derH', { map: s => 2 * Math.pow(10, -s / 25), show: h => num(h, 3), onInput: draw });
    sel.addEventListener('change', () => { rX.upd(); });
    function draw() {
      if (!st.ctx || !st2.ctx) return;
      const D = F[sel.value], x0 = rX.get(), h = rH.get();
      const [a, b, c, d] = D.v, P = LT.plot(st, { x0: a, x1: b, y0: c, y1: d });
      P.frame({ xname: D.car ? 't (giây)' : 'x', yname: D.car ? 's (m)' : 'y' });
      P.curve(D.f, C.sea, 3);
      const y0 = D.f(x0), y1 = D.f(x0 + h), m = (y1 - y0) / h, k = D.d(x0);
      P.curve(x => y0 + m * (x - x0), C.gold, 2);
      P.curve(x => y0 + k * (x - x0), C.pos, 2, [7, 5]);
      P.clip(() => {
        const ctx = P.ctx; ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath();
        ctx.moveTo(P.X(x0), P.Y(y0)); ctx.lineTo(P.X(x0 + h), P.Y(y0)); ctx.lineTo(P.X(x0 + h), P.Y(y1)); ctx.stroke(); ctx.setLineDash([]);
        P.dot(x0, y0, C.pos, 6); P.dot(x0 + h, y1, C.gold, 5);
      });
      P.text('h', (P.X(x0) + P.X(x0 + h)) / 2, P.Y(y0) + 16, C.muted, 'center');
      const Q = LT.plot(st2, { x0: a, x1: b, y0: D.dv[0], y1: D.dv[1], t: 8, b: 22 });
      Q.frame({ yname: D.dn });
      Q.curve(D.d, C.pos, 2.5); Q.clip(() => Q.dot(x0, k, C.pos, 5));
      setTxt('derS', num(m, 5)); setTxt('derD', num(k, 5)); setTxt('derE', num(Math.abs(m - k), 3));
      setTxt('derNote', D.car
        ? `Tại t = ${num(x0, 3)} s xe đang chạy ${num(k, 3)} m/s (${num(k * 3.6, 3)} km/h). Cát tuyến cho vận tốc trung bình trong h giây kế tiếp; đồng hồ tốc độ hiển thị giới hạn của nó khi h → 0.`
        : `Cát tuyến có hệ số góc (f(x₀ + h) − f(x₀))/h. Khi h → 0 nó tiến tới tiếp tuyến, hệ số góc tiến tới f'(x₀). ${k > 1e-9 ? 'Ở đây f\'(x₀) > 0: hàm đang tăng.' : k < -1e-9 ? 'Ở đây f\'(x₀) < 0: hàm đang giảm.' : 'Ở đây f\'(x₀) ≈ 0: đỉnh, đáy hoặc điểm dừng.'}`);
    }
    watchCanvas(cv, st, draw); watchCanvas(cv2, st2, draw); rX.upd(); rH.upd();
  },
});
})();
