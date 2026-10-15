/* =====================================================================
   Toán học: minh họa "Cộng các hình chữ nhật" (id: int-riemann, trang 3-tich-phan.html)
   Tổng Riemann (trái, phải, giữa) và quy tắc hình thang với n phần; so với giá trị đúng F(b) − F(a).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, pressGroup, setTxt } = LT;
const F = {
  sq: { f: x => x * x, F: x => x * x * x / 3, v: [-0.5, 3.2, -1, 10], ab: [0, 2], bMax: 3, name: 'x²' },
  sin: { f: Math.sin, F: x => -Math.cos(x), v: [-0.3, 6.6, -1.3, 1.3], ab: [0, Math.PI], bMax: 2 * Math.PI, name: 'sin x' },
  exp: { f: x => Math.exp(-x * x / 2), F: null, v: [-3.5, 3.5, -0.1, 1.2], ab: [-1, 1], bMax: 3, name: 'e^(−x²/2)' },
  car: { f: t => 15 + 10 * Math.sin(t / 2), F: t => 15 * t - 20 * Math.cos(t / 2), v: [0, 20, 0, 30], ab: [0, 12], bMax: 20, name: 'v(t) = 15 + 10 sin(t/2) (m/s)', car: true },
};
// tích phân số rất chính xác (Simpson 2000 khoảng) cho hàm không có nguyên hàm sơ cấp
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
LT.demo('int-riemann', {
  deps: ['plot'],
  html: `<div class="demo-title"><h4>Cộng các hình chữ nhật</h4><span>Tăng n: tổng diện tích các hình tiến tới tích phân</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvInt" class="ar" role="img" aria-label="Diện tích dưới đồ thị được xấp xỉ bằng các hình chữ nhật"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="intF">Hàm số</label><select id="intF">
        <option value="sq">f(x) = x² trên [0, 2]</option><option value="sin">f(x) = sin x trên [0, π]</option>
        <option value="exp">f(x) = e^(−x²/2) trên [−1, 1]</option><option value="car">Vận tốc xe → quãng đường</option></select></div>
      <div class="btnrow" role="group" aria-label="Cách lấy chiều cao">
        <button class="btn" type="button" data-im="left" aria-pressed="true">Trái</button><button class="btn" type="button" data-im="right" aria-pressed="false">Phải</button>
        <button class="btn" type="button" data-im="mid" aria-pressed="false">Giữa</button><button class="btn" type="button" data-im="trap" aria-pressed="false">Hình thang</button>
      </div>
      <div class="ctrl"><label for="intN">Số phần n</label><output for="intN"></output><input type="range" id="intN" min="1" max="100" value="4"></div>
      <div class="ctrl"><label for="intB">Cận trên b</label><output for="intB"></output><input type="range" id="intB" min="0" max="3000" value="2000"></div>
      <dl class="readout" aria-live="polite">
        <dt>Tổng xấp xỉ</dt><dd id="intA">—</dd>
        <dt>Giá trị đúng</dt><dd class="big" id="intE">—</dd>
        <dt>Sai số</dt><dd id="intR">—</dd>
      </dl>
      <p class="note-s" id="intNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvInt'), st = {}, sel = root.querySelector('#intF');
    let mode = 'left';
    const bs = [...root.querySelectorAll('[data-im]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); mode = b.dataset.im; draw(); }));
    const rN = range('intN', { show: v => String(v), onInput: draw });
    const bOf = u => { const D = F[sel.value], a = D.ab[0]; return a + Math.max(0.01, u / 3000) * (D.bMax - a); };
    const uOf = () => { const D = F[sel.value]; return Math.round((D.ab[1] - D.ab[0]) / (D.bMax - D.ab[0]) * 3000); };
    const rB = range('intB', { map: bOf, show: v => num(v, 3), onInput: draw });
    sel.addEventListener('change', () => rB.set(uOf()));
    function draw() {
      if (!st.ctx) return;
      const D = F[sel.value], a = D.ab[0], b = rB.get(), n = rN.get(), dx = (b - a) / n;
      const P = LT.plot(st, { x0: D.v[0], x1: D.v[1], y0: D.v[2], y1: D.v[3] });
      P.frame({ xname: D.car ? 't (s)' : 'x', yname: D.car ? 'v (m/s)' : 'y' });
      let S = 0; const ctx = P.ctx;
      P.clip(() => {
        for (let i = 0; i < n; i++) {
          const xl = a + i * dx, xr = xl + dx;
          ctx.beginPath();
          if (mode === 'trap') {
            const yl = D.f(xl), yr = D.f(xr); S += (yl + yr) / 2 * dx;
            ctx.moveTo(P.X(xl), P.Y(0)); ctx.lineTo(P.X(xl), P.Y(yl)); ctx.lineTo(P.X(xr), P.Y(yr)); ctx.lineTo(P.X(xr), P.Y(0)); ctx.closePath();
          } else {
            const xs = mode === 'left' ? xl : mode === 'right' ? xr : (xl + xr) / 2, y = D.f(xs); S += y * dx;
            ctx.rect(P.X(xl), Math.min(P.Y(0), P.Y(y)), P.X(xr) - P.X(xl), Math.abs(P.Y(y) - P.Y(0)));
          }
          ctx.fillStyle = 'rgba(123,205,232,.45)'; ctx.fill(); ctx.strokeStyle = C.sea; ctx.lineWidth = n > 60 ? 0.5 : 1; ctx.stroke();
        }
      });
      P.curve(D.f, C.ink, 2.5);
      const E = D.F ? D.F(b) - D.F(a) : simpson(D.f, a, b);
      setTxt('intA', num(S, 6) + (D.car ? ' m' : ''));
      setTxt('intE', num(E, 6) + (D.car ? ' m' : ''));
      setTxt('intR', num(Math.abs(S - E), 3) + ' (' + num(Math.abs(S - E) / Math.abs(E || 1) * 100, 2) + '%)');
      setTxt('intNote', D.car
        ? `Mỗi hình chữ nhật là "vận tốc × thời gian" của một khoảng nhỏ: quãng đường đi được trong khoảng đó. Cộng lại được quãng đường từ t = 0 tới t = ${num(b, 3)} s. Đồng hồ ODO của xe làm đúng việc này.`
        : mode === 'trap' ? 'Quy tắc hình thang nối thẳng hai đầu mỗi khoảng; sai số giảm theo 1/n²: tăng n gấp đôi, sai số còn khoảng 1/4.'
        : mode === 'mid' ? 'Lấy chiều cao ở giữa mỗi khoảng thường chính xác hơn hẳn lấy ở mép: sai số cũng giảm theo 1/n².'
        : 'Lấy chiều cao ở mép trái hoặc phải: sai số chỉ giảm theo 1/n (tăng n gấp đôi, sai số còn khoảng một nửa).');
    }
    watchCanvas(cv, st, draw); rN.upd(); rB.upd();
  },
});
})();
