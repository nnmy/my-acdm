/* =====================================================================
   Toán học: minh họa "Mặt phẳng phức" (id: cx-plane, trang 6-so-phuc.html)
   Kéo z (xanh) và w (đỏ); chọn phép toán, kết quả màu vàng. Phép nhân: mô đun nhân nhau, góc cộng nhau.
   ===================================================================== */
(() => {
const { COLORS: C, num, watchCanvas, setTxt, drag, pressGroup } = LT;
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return d < 1e-12 ? [NaN, NaN] : [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const abs = z => Math.hypot(z[0], z[1]), arg = z => Math.atan2(z[1], z[0]);
const deg = a => num(Math.round(a * 180 / Math.PI * 10) / 10, 4) + '°';
const fmt = z => { if (!isFinite(z[0])) return 'không xác định'; const r = v => Math.abs(v) < 5e-4 ? 0 : v; const a = r(z[0]), b = r(z[1]); return num(a, 3) + (b < 0 ? ' − ' : ' + ') + num(Math.abs(b), 3) + 'i'; };
const pol = z => !isFinite(z[0]) ? '—' : num(abs(z), 3) + ' ∠ ' + deg(arg(z));
const OPS = {
  add: { f: (z, w) => [z[0] + w[0], z[1] + w[1]], lab: 'z + w', note: 'Cộng số phức = cộng vectơ: tịnh tiến z theo w (quy tắc hình bình hành).' },
  mul: { f: mul, lab: 'z · w', note: 'Nhân: mô đun nhân nhau, góc cộng nhau. Nhân với một số có mô đun 1 là phép quay thuần túy; nhân với i là quay 90°.' },
  div: { f: div, lab: 'z / w', note: 'Chia: mô đun chia nhau, góc trừ nhau.' },
  conj: { f: z => [z[0], -z[1]], lab: 'z̄', note: 'Số phức liên hợp z̄ = a − bi: lật z qua trục thực. z · z̄ = |z|² luôn là số thực.' },
  sq: { f: z => mul(z, z), lab: 'z²', note: 'Bình phương: mô đun bình phương, góc gấp đôi. Đi một vòng quanh gốc thì z² đi hai vòng.' },
};
LT.demo('cx-plane', {
  html: `<div class="demo-title"><h4>Mặt phẳng phức</h4><span>Kéo z và w, chọn phép toán</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCx" class="ar" role="img" aria-label="Mặt phẳng phức với các số z, w và kết quả phép toán"></canvas><span class="hint" style="top:8px;bottom:auto;left:auto;right:10px">Kéo điểm xanh (z) và đỏ (w)</span></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Phép toán">
        <button class="btn" type="button" data-cx="add" aria-pressed="false">z + w</button><button class="btn" type="button" data-cx="mul" aria-pressed="true">z · w</button>
        <button class="btn" type="button" data-cx="div" aria-pressed="false">z / w</button><button class="btn" type="button" data-cx="conj" aria-pressed="false">z̄</button><button class="btn" type="button" data-cx="sq" aria-pressed="false">z²</button>
      </div>
      <div class="btnrow"><button class="btn" type="button" id="cxI">Đặt w = i</button><button class="btn" type="button" id="cxR">Đặt lại</button></div>
      <dl class="readout" aria-live="polite">
        <dt>z</dt><dd id="cxZ">—</dd><dt></dt><dd id="cxZp">—</dd>
        <dt>w</dt><dd id="cxW">—</dd><dt></dt><dd id="cxWp">—</dd>
        <dt id="cxOl">kết quả</dt><dd class="big" id="cxO">—</dd><dt></dt><dd id="cxOp">—</dd>
      </dl>
      <p class="note-s" id="cxNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvCx'), st = {};
    let z = [2, 1], w = [1, 1.5], op = 'mul', G = null;
    const bs = [...root.querySelectorAll('[data-cx]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); op = b.dataset.cx; draw(); }));
    root.querySelector('#cxI').addEventListener('click', () => { w = [0, 1]; draw(); });
    root.querySelector('#cxR').addEventListener('click', () => { z = [2, 1]; w = [1, 1.5]; draw(); });
    const snap = v => Math.round(v * 4) / 4;
    drag(cv, {
      pick: (x, y) => { if (!G) return null; const d = p => Math.hypot(x - G.X(p[0]), y - G.Y(p[1])); const dz = d(z), dw = d(w); return Math.min(dz, dw) < 22 ? (dz <= dw ? 'z' : 'w') : null; },
      move: (o, x, y) => { const p = [snap(G.ix(x)), snap(G.iy(y))].map(v => Math.max(-4.5, Math.min(4.5, v))); if (o === 'z') z = p; else w = p; draw(); },
    });
    function vec(p, col, lab, wd = 3) {
      const { ctx } = st; LT.arrow(ctx, G.X(0), G.Y(0), G.X(p[0]), G.Y(p[1]), col, wd, 11);
      ctx.beginPath(); ctx.arc(G.X(p[0]), G.Y(p[1]), 7, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '600 14px ' + getComputedStyle(document.body).fontFamily; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(lab, G.X(p[0]) + 9, G.Y(p[1]) - 6);
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, s = Math.min(W, H) / 10.4, ox = W / 2, oy = H / 2;
      G = { X: x => ox + x * s, Y: y => oy - y * s, ix: px => (px - ox) / s, iy: py => (oy - py) / s };
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#E3EAF0'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = -12; k <= 12; k++) { ctx.moveTo(G.X(k), 0); ctx.lineTo(G.X(k), H); ctx.moveTo(0, G.Y(k)); ctx.lineTo(W, G.Y(k)); } ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();
      ctx.strokeStyle = '#C9D3DA'; ctx.beginPath(); ctx.arc(ox, oy, s, 0, 2 * Math.PI); ctx.stroke();
      const font = getComputedStyle(document.body).fontFamily; ctx.font = '12px ' + font; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let k = -4; k <= 4; k++) if (k) { ctx.fillText(String(k).replace('-', '−'), G.X(k), oy + 4); ctx.textAlign = 'right'; ctx.fillText(String(k).replace('-', '−') + 'i', ox - 5, G.Y(k) - 6); ctx.textAlign = 'center'; }
      ctx.textAlign = 'right'; ctx.fillText('Thực', W - 6, oy + 18); ctx.textAlign = 'left'; ctx.fillText('Ảo', ox + 6, 6);
      const O = OPS[op], r = O.f(z, w);
      if (op === 'add' && isFinite(r[0])) { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(G.X(z[0]), G.Y(z[1])); ctx.lineTo(G.X(r[0]), G.Y(r[1])); ctx.lineTo(G.X(w[0]), G.Y(w[1])); ctx.stroke(); ctx.setLineDash([]); }
      if ((op === 'mul' || op === 'sq' || op === 'div') && isFinite(r[0])) {   // cung góc
        const arcs = op === 'mul' ? [[0, arg(z), C.sea, 0.7], [arg(z), arg(z) + arg(w), C.pos, 0.9]] : op === 'sq' ? [[0, arg(z), C.sea, 0.7], [arg(z), 2 * arg(z), C.sea, 0.9]] : [[0, arg(r), C.gold, 0.8]];
        arcs.forEach(([a0, a1, col, rr]) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oy, s * rr, -a0, -a1, a1 > a0); ctx.stroke(); });
      }
      if (op !== 'conj' && op !== 'sq') vec(w, C.pos, 'w');
      vec(z, C.sea, 'z');
      if (isFinite(r[0])) vec(r, C.gold, O.lab, 3.5);
      setTxt('cxZ', fmt(z)); setTxt('cxZp', pol(z)); setTxt('cxW', op === 'conj' || op === 'sq' ? '(không dùng)' : fmt(w)); setTxt('cxWp', op === 'conj' || op === 'sq' ? '' : pol(w));
      setTxt('cxOl', O.lab); setTxt('cxO', fmt(r)); setTxt('cxOp', pol(r));
      setTxt('cxNote', O.note + (op === 'mul' ? ` Ở đây: ${num(abs(z), 3)} × ${num(abs(w), 3)} = ${num(abs(z) * abs(w), 3)}; ${deg(arg(z))} + ${deg(arg(w))} = ${deg(arg(z) + arg(w))}.` : ''));
    }
    watchCanvas(cv, st, draw);
  },
});
})();
