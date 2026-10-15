/* =====================================================================
   Toán học: minh họa "Tiến về một điểm" (id: lim-approach, trang 1-gioi-han.html)
   Chọn một hàm và điểm a; kéo thanh h (thang log) để lấy x = a − h và x = a + h ngày càng gần a.
   Có tùy chọn phóng to quanh (a, L) để thấy hàm có "ổn định" về một giá trị hay không.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, pressGroup, setTxt } = LT;
const F = {
  hole: { f: x => (x * x - 1) / (x - 1), a: 1, L: 2, v: [-1, 3, -1, 5], name: '(x² − 1)/(x − 1), x → 1',
    note: 'Tại x = 1 hàm không xác định (0/0), nhưng với x ≠ 1 thì f(x) = x + 1, nên f(x) → 2. Giới hạn không quan tâm f(a) bằng bao nhiêu, chỉ quan tâm f(x) khi x tới gần a.' },
  sinc: { f: x => Math.sin(x) / x, a: 0, L: 1, v: [-8, 8, -0.5, 1.4], name: 'sin x / x, x → 0',
    note: 'Một giới hạn quan trọng: sin x / x → 1 khi x → 0 (x tính bằng radian). Nhờ nó mà đạo hàm của sin x là cos x.' },
  e: { f: x => Math.pow(1 + x, 1 / x), a: 0, L: Math.E, v: [-0.9, 3, 0, 4.5], name: '(1 + x)^(1/x), x → 0',
    note: 'Giới hạn này bằng số e ≈ 2,71828: lãi suất 100% ghép liên tục làm tiền tăng gấp e lần, không phải vô hạn.' },
  jump: { f: x => Math.abs(x) / x, a: 0, L: null, v: [-3, 3, -2, 2], name: '|x| / x, x → 0',
    note: 'Bên trái hàm luôn bằng −1, bên phải luôn bằng +1: hai giới hạn một phía khác nhau, nên giới hạn tại 0 không tồn tại.' },
  inf: { f: x => 1 / (x * x), a: 0, L: Infinity, v: [-3, 3, -1, 12], name: '1 / x², x → 0',
    note: 'f(x) lớn lên không giới hạn khi x → 0: ta viết lim = +∞. Đây không phải một số, mà là cách nói "tăng vượt mọi ngưỡng". Đường x = 0 là tiệm cận đứng.' },
  osc: { f: x => Math.sin(1 / x), a: 0, L: null, v: [-1, 1, -1.5, 1.5], name: 'sin(1/x), x → 0',
    note: 'Càng gần 0 hàm dao động càng nhanh giữa −1 và 1, không dừng ở giá trị nào: giới hạn không tồn tại. Thử phóng to: hình không bao giờ "phẳng" lại.' },
};
LT.demo('lim-approach', {
  deps: ['plot'],
  html: `<div class="demo-title"><h4>Tiến về một điểm</h4><span>Kéo h nhỏ dần: f(a − h) và f(a + h) có tiến về cùng một số?</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvLim" class="ar" role="img" aria-label="Đồ thị hàm số với hai điểm ở hai bên điểm a"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="limF">Hàm số</label><select id="limF">
        <option value="hole">(x² − 1)/(x − 1) khi x → 1</option><option value="sinc">sin x / x khi x → 0</option>
        <option value="e">(1 + x)^(1/x) khi x → 0</option><option value="jump">|x| / x khi x → 0</option>
        <option value="inf">1 / x² khi x → 0</option><option value="osc">sin(1/x) khi x → 0</option></select></div>
      <div class="ctrl"><label for="limH">Khoảng cách h tới a</label><output for="limH"></output><input type="range" id="limH" min="0" max="6" step="0.05" value="0"></div>
      <div class="checks"><label><input type="checkbox" id="limZoom"> Phóng to quanh a</label></div>
      <dl class="readout" aria-live="polite">
        <dt>f(a − h)</dt><dd id="limL">—</dd>
        <dt>f(a + h)</dt><dd id="limR">—</dd>
        <dt>Giới hạn</dt><dd class="big" id="limV">—</dd>
      </dl>
      <p class="note-s" id="limNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvLim'), st = {};
    const sel = root.querySelector('#limF'), zoom = root.querySelector('#limZoom');
    const rH = range('limH', { map: s => Math.pow(10, -s), show: h => 'h = ' + (h >= 1e-3 ? num(h, 3) : h.toExponential(1).replace('.', ',').replace('e-', ' × 10⁻').replace(/(\d)$/, '$1')), onInput: draw });
    sel.addEventListener('change', draw); zoom.addEventListener('change', draw);
    const fv = y => !isFinite(y) ? (y > 0 ? '+∞' : '—') : num(y, 7);
    function draw() {
      if (!st.ctx) return;
      const D = F[sel.value], h = rH.get(), a = D.a;
      let [x0, x1, y0, y1] = D.v;
      if (zoom.checked) {
        const w = Math.max(h * 4, 1e-6), cy = D.L !== null && isFinite(D.L) ? D.L : 0;
        x0 = a - w; x1 = a + w;
        const ys = [D.f(a - h), D.f(a + h)].filter(isFinite);
        let span = Math.max(1e-6, ...ys.map(y => Math.abs(y - cy) * 2.5));
        if (sel.value === 'jump' || sel.value === 'osc') span = 2;
        if (sel.value === 'inf') { y0 = -0.1 * D.f(a + h) - 1; y1 = D.f(a + h) * 1.6 + 1; } else { y0 = cy - span; y1 = cy + span; }
      }
      const P = LT.plot(st, { x0, x1, y0, y1 });
      P.frame();
      P.clip(() => {
        if (D.L !== null && isFinite(D.L)) { P.ctx.strokeStyle = C.gold; P.ctx.lineWidth = 1.5; P.ctx.setLineDash([6, 4]); P.ctx.beginPath(); P.ctx.moveTo(P.l, P.Y(D.L)); P.ctx.lineTo(P.l + P.pw, P.Y(D.L)); P.ctx.stroke(); P.ctx.setLineDash([]); }
        P.ctx.strokeStyle = C.muted; P.ctx.lineWidth = 1; P.ctx.setLineDash([3, 3]); P.ctx.beginPath(); P.ctx.moveTo(P.X(a), P.t); P.ctx.lineTo(P.X(a), P.t + P.ph); P.ctx.stroke(); P.ctx.setLineDash([]);
      });
      if (sel.value === 'jump') { P.curve(D.f, C.sea, 2.5, null, x0, a - 1e-12); P.curve(D.f, C.sea, 2.5, null, a + 1e-12, x1); }
      else P.curve(D.f, C.sea);
      if (D.L !== null && isFinite(D.L)) P.dot(a, D.L, C.sea, 5, true);
      if (sel.value === 'jump') { P.dot(a, -1, C.sea, 5, true); P.dot(a, 1, C.sea, 5, true); }
      const yl = D.f(a - h), yr = D.f(a + h);
      [[a - h, yl, C.pos], [a + h, yr, C.pos]].forEach(([x, y, c]) => { if (isFinite(y) && x >= x0 && x <= x1) P.clip(() => P.dot(x, Math.max(y0 - 1e9, Math.min(y1 + 1e9, y)), c, 6)); });
      P.text('a', P.X(a) + 4, P.t + P.ph - 4, C.muted);
      if (D.L !== null && isFinite(D.L)) P.text('L = ' + num(D.L, 6), P.l + 6, P.Y(D.L) - 4, '#9A7A00');
      setTxt('limL', fv(yl)); setTxt('limR', fv(yr));
      setTxt('limV', D.L === null ? 'không tồn tại' : !isFinite(D.L) ? '+∞' : num(D.L, 6));
      setTxt('limNote', D.note);
    }
    watchCanvas(cv, st, draw); rH.upd();
  },
});
})();
