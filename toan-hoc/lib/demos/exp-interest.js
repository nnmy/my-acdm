/* =====================================================================
   Toán học: minh họa "Lãi kép" (id: exp-interest, trang 7-mu-logarit.html)
   A(t) = P(1 + r/n)^(nt), hoặc ghép liên tục A = P·e^(rt); so với lãi đơn P(1 + rt).
   Tùy chọn trục tung thang logarit: đường mũ thành đường thẳng.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt, pressGroup } = LT;
const N = { 1: 'năm', 4: 'quý', 12: 'tháng', 365: 'ngày', 0: 'liên tục' };
const money = v => v >= 1000 ? num(v / 1000, 4) + ' tỷ' : num(v, 4) + ' triệu';
LT.demo('exp-interest', {
  deps: ['plot'],
  html: `<div class="demo-title"><h4>Lãi kép</h4><span>Tiền tăng theo tỷ lệ: mỗi kỳ nhân thêm một hệ số</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvExp" class="ar" role="img" aria-label="Đồ thị số tiền theo thời gian với lãi kép và lãi đơn"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="exP">Số tiền gửi</label><output for="exP"></output><input type="range" id="exP" min="10" max="1000" step="10" value="100"></div>
      <div class="ctrl"><label for="exR">Lãi suất mỗi năm</label><output for="exR"></output><input type="range" id="exR" min="0.5" max="20" step="0.5" value="6"></div>
      <div class="ctrl"><label for="exT">Số năm</label><output for="exT"></output><input type="range" id="exT" min="1" max="50" value="30"></div>
      <div class="btnrow" role="group" aria-label="Ghép lãi">
        <button class="btn" type="button" data-en="1" aria-pressed="true">Năm</button><button class="btn" type="button" data-en="12" aria-pressed="false">Tháng</button>
        <button class="btn" type="button" data-en="365" aria-pressed="false">Ngày</button><button class="btn" type="button" data-en="0" aria-pressed="false">Liên tục</button>
      </div>
      <div class="checks"><label><input type="checkbox" id="exLog"> Trục tung thang logarit</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Cuối kỳ (lãi kép)</dt><dd class="big" id="exA">—</dd><dt>Nếu lãi đơn</dt><dd id="exS">—</dd>
        <dt>Thời gian nhân đôi</dt><dd id="exD">—</dd><dt>Quy tắc 72</dt><dd id="ex72">—</dd>
      </dl>
      <p class="note-s" id="exNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvExp'), st = {}, lg = root.querySelector('#exLog');
    let n = 1;
    const bs = [...root.querySelectorAll('[data-en]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); n = +b.dataset.en; draw(); }));
    const rP = range('exP', { show: v => money(v), onInput: draw }), rR = range('exR', { show: v => num(v, 3) + '%', onInput: draw }), rT = range('exT', { show: v => v + ' năm', onInput: draw });
    lg.addEventListener('change', draw);
    function draw() {
      if (!st.ctx) return;
      const P0 = rP.get(), r = rR.get() / 100, T = rT.get();
      const A = t => n ? P0 * Math.pow(1 + r / n, n * t) : P0 * Math.exp(r * t), S = t => P0 * (1 + r * t);
      const top = A(T) * 1.08;
      let P;
      if (lg.checked) {
        const L = Math.log10, y0 = Math.floor(L(P0 * 0.8)), y1 = Math.ceil(L(top));
        P = LT.plot(st, { x0: 0, x1: T, y0, y1, l: 56 });
        P.frame({ ystep: 1, ylab: v => money(Math.pow(10, v)), xname: 'năm', yname: 'thang log: mỗi vạch ×10' });
        P.curve(t => L(S(t)), C.muted, 2, [6, 4]); P.curve(t => L(A(t)), C.sea, 3);
        for (let k = 1; P0 * Math.pow(2, k) < top; k++) P.clip(() => { const y = L(P0 * Math.pow(2, k)); P.ctx.strokeStyle = 'rgba(242,194,48,.6)'; P.ctx.lineWidth = 1; P.ctx.beginPath(); P.ctx.moveTo(P.l, P.Y(y)); P.ctx.lineTo(P.l + P.pw, P.Y(y)); P.ctx.stroke(); });
      } else {
        P = LT.plot(st, { x0: 0, x1: T, y0: 0, y1: top, l: 56 });
        P.frame({ ylab: v => money(v), xname: 'năm', yname: 'triệu đồng' });
        P.curve(S, C.muted, 2, [6, 4]); P.curve(A, C.sea, 3);
      }
      P.text('lãi kép', P.X(T) - 6, (lg.checked ? P.Y(Math.log10(A(T))) : P.Y(A(T))) + 16, C.sea, 'right', 'bottom', true);
      P.text('lãi đơn', P.X(T) - 6, (lg.checked ? P.Y(Math.log10(S(T))) : P.Y(S(T))) + 16, C.muted, 'right', 'bottom', true);
      const td = n ? Math.log(2) / (n * Math.log(1 + r / n)) : Math.log(2) / r;
      setTxt('exA', money(A(T))); setTxt('exS', money(S(T)));
      setTxt('exD', num(td, 3) + ' năm'); setTxt('ex72', '72 / ' + num(r * 100, 3) + ' ≈ ' + num(72 / (r * 100), 3) + ' năm');
      setTxt('exNote', lg.checked
        ? 'Trên thang logarit, mỗi lần nhân đôi cách nhau đều (vạch vàng): đường lãi kép thành đường thẳng. Đó là dấu hiệu nhận ra tăng trưởng mũ trong dữ liệu thật.'
        : `Ghép lãi theo ${N[n]}. Lãi đơn tăng đều một khoản mỗi năm (đường thẳng); lãi kép tăng theo tỷ lệ nên càng về sau càng dốc. Ghép càng dày, kết quả càng tiến gần P·e^(rt) nhưng không tăng mãi.`);
    }
    watchCanvas(cv, st, draw); rP.upd(); rR.upd(); rT.upd();
  },
});
})();
