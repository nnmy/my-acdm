/* =====================================================================
   Sinh điện từ: minh họa "Debye và Cole–Cole: một vùng tán sắc" (id: debye-cole, trang 4-dien-moi.html)
   Nhúng vào trang: <div class="demo" id="demoDebye" data-demo="debye-cole"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=debye-cole
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, watchCanvas } = BEM;
const EPS0 = 8.8541878128e-12;
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

/* ε* = ε∞ + Δε / (1 + (jωτ)^(1−α)) + σ/(jωε0); trả về [ε', ε''] (ε'' > 0) */
function cc(f, P, withSigma = true) {
  const w = 2 * Math.PI * f, b = 1 - P.alpha, m = Math.pow(w * P.tau, b);
  const ar = 1 + m * Math.cos(Math.PI * b / 2), ai = m * Math.sin(Math.PI * b / 2), d = ar * ar + ai * ai;
  let re = P.einf + P.de * ar / d, im = P.de * ai / d;
  if (withSigma && P.sigma) im += P.sigma / (w * EPS0);
  return [re, im];
}

BEM.demo('debye-cole', {
  domId: 'demoDebye',
  title: 'Debye và Cole–Cole: một vùng tán sắc',
  page: '4-dien-moi.html',
  html: `<div class="demo-title"><h4>Debye và Cole–Cole: một vùng tán sắc</h4><span>Chỉnh tham số, so sánh với đường Debye</span></div>
  <div class="demo-body">
    <div class="stagebox">
      <canvas id="cvDbF" class="ar" role="img" aria-label="Đồ thị ε' và ε'' theo tần số (thang log)."></canvas>
      <canvas id="cvDbC" class="profile" style="height:230px" role="img" aria-label="Giản đồ Cole–Cole: ε'' theo ε'."></canvas>
    </div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Cấu hình mẫu">
        <button class="btn" type="button" data-dpre="water" aria-pressed="true">Nước, 37 °C</button>
        <button class="btn" type="button" data-dpre="beta" aria-pressed="false">Vùng β của cơ</button>
      </div>
      <div class="ctrl"><label for="dbDe">Mức tụt Δε</label><output for="dbDe"></output><input type="range" id="dbDe" min="0" max="4" step="0.01" value="1.84"></div>
      <div class="ctrl"><label for="dbEi">ε∞</label><output for="dbEi"></output><input type="range" id="dbEi" min="1" max="60" step="0.1" value="5"></div>
      <div class="ctrl"><label for="dbFc">Tần số đặc trưng f<sub>c</sub></label><output for="dbFc"></output><input type="range" id="dbFc" min="2" max="11" step="0.01" value="10.38"></div>
      <div class="ctrl"><label for="dbA">Độ trải rộng α</label><output for="dbA"></output><input type="range" id="dbA" min="0" max="0.6" step="0.01" value="0"></div>
      <div class="ctrl"><label for="dbS">Độ dẫn ion σ<sub>i</sub></label><output for="dbS"></output><input type="range" id="dbS" min="0" max="2" step="0.01" value="0"></div>
      <div class="ctrl"><label for="dbF">Tần số đọc giá trị f</label><output for="dbF"></output><input type="range" id="dbF" min="1" max="12" step="0.01" value="9.39"></div>
      <div class="checks"><label><input type="checkbox" id="dbRef" checked> Hiện đường Debye (α = 0)</label></div>
      <dl class="readout" aria-live="polite">
        <dt>τ = 1/(2πf<sub>c</sub>)</dt><dd id="dbTau">—</dd>
        <dt>ε′(f)</dt><dd class="big" id="dbE1">—</dd>
        <dt>ε″(f)</dt><dd class="big" id="dbE2">—</dd>
        <dt>σ(f) = ωε₀ε″</dt><dd id="dbSig">—</dd>
        <dt>tan δ</dt><dd id="dbTan">—</dd>
      </dl>
      <p class="note-s">Giản đồ Cole–Cole bên dưới chỉ vẽ phần hồi phục (không tính σᵢ, vì số hạng đó làm ε″ tăng vô hạn ở tần số thấp). Hai trục cùng tỉ lệ, nên đường Debye là nửa đường tròn.</p>
    </div>
  </div>`,
  init() {
    const cvF = document.getElementById('cvDbF'), cvC = document.getElementById('cvDbC'), sF = {}, sC = {};
    let showRef = true;
    const P = {};
    const rDe = range('dbDe', { map: v => 10 ** v, show: v => num(v, 3), onInput: () => upd() });
    const rEi = range('dbEi', { show: v => num(v, 3), onInput: () => upd() });
    const rFc = range('dbFc', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => upd() });
    const rA = range('dbA', { show: v => num(v, 2), onInput: () => upd() });
    const rS = range('dbS', { show: v => num(v, 3) + ' S/m', onInput: () => upd() });
    const rF = range('dbF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => upd() });
    document.getElementById('dbRef').addEventListener('change', e => { showRef = e.target.checked; upd(); });
    const PRE = {
      water: { de: Math.log10(69), ei: 5, fc: Math.log10(24e9), a: 0, s: 0 },            // nước ~37 °C: εs ≈ 74, τ ≈ 6,6 ps
      beta: { de: Math.log10(7000), ei: 54, fc: Math.log10(450e3), a: 0.1, s: 0.2 },    // số hạng 2 của cơ (Gabriel 1996), ε∞ gộp phần còn lại ở trên
    };
    const bb = [...document.querySelectorAll('#demoDebye [data-dpre]')];
    bb.forEach(b => b.addEventListener('click', () => {
      bb.forEach(x => x.setAttribute('aria-pressed', x === b));
      const p = PRE[b.dataset.dpre];
      rDe.set(p.de); rEi.set(p.ei); rFc.set(p.fc); rA.set(p.a); rS.set(p.s);
      rF.set(p.fc + 0.0);
    }));
    const X0 = 1, X1 = 12;                      // log10 f: 10 Hz .. 1 THz
    function upd() {
      Object.assign(P, { de: rDe.get(), einf: rEi.get(), tau: 1 / (2 * Math.PI * rFc.get()), alpha: rA.get(), sigma: rS.get() });
      const f = rF.get(), [e1, e2] = cc(f, P);
      setTxt('dbTau', fmt(P.tau, 's')); setTxt('dbE1', num(e1, 4)); setTxt('dbE2', num(e2, 4));
      setTxt('dbSig', fmt(2 * Math.PI * f * EPS0 * e2, 'S/m')); setTxt('dbTan', num(e2 / e1, 3));
      drawF(); drawC();
    }
    function drawF() {
      if (!sF.ctx) return;
      const { ctx, W, H } = sF, L = 52, R = 14, T = 16, B = 34, pw = W - L - R, ph = H - T - B;
      const ymax = (P.einf + P.de) * 1.1;
      const xs = lf => L + (lf - X0) / (X1 - X0) * pw, ys = v => T + ph - Math.min(1.05, v / ymax) * ph;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = '12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let d = X0; d <= X1; d++) { ctx.beginPath(); ctx.moveTo(xs(d), T); ctx.lineTo(xs(d), T + ph); ctx.stroke(); if (d % 2 === 0 || d === X1) ctx.fillText(fmt(10 ** d, 'Hz', 1), xs(d), T + ph + 6); }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let k = 0; k <= 4; k++) { const v = ymax / 1.1 * k / 4; ctx.beginPath(); ctx.moveTo(L, ys(v)); ctx.lineTo(L + pw, ys(v)); ctx.stroke(); ctx.fillText(num(v, 3), L - 6, ys(v)); }
      const curve = (fn, col, w, dash) => {
        ctx.save(); ctx.beginPath(); ctx.rect(L, T - 4, pw, ph + 4); ctx.clip();
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath();
        for (let k = 0; k <= 400; k++) { const lf = X0 + (X1 - X0) * k / 400, v = fn(10 ** lf); k ? ctx.lineTo(xs(lf), ys(v)) : ctx.moveTo(xs(lf), ys(v)); }
        ctx.stroke(); ctx.restore();
      };
      if (showRef && P.alpha > 0) {
        const D = Object.assign({}, P, { alpha: 0 });
        curve(f => cc(f, D)[0], C.sea, 1.4, [5, 4]); curve(f => cc(f, D)[1], C.pos, 1.4, [5, 4]);
      }
      curve(f => cc(f, P)[0], C.sea, 2.6); curve(f => cc(f, P)[1], C.pos, 2.6);
      const lfc = Math.log10(rFc.get()), lf = Math.log10(rF.get());
      ctx.setLineDash([3, 4]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(xs(lfc), T); ctx.lineTo(xs(lfc), T + ph); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs(lf), T); ctx.lineTo(xs(lf), T + ph); ctx.stroke();
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.sea; ctx.fillText('ε′(f)', L + 8, T + 4); ctx.fillStyle = C.pos; ctx.fillText('ε″(f)', L + 60, T + 4);
      ctx.fillStyle = C.muted; ctx.fillText('fc', xs(lfc) + 4, T + 4);
      if (showRef && P.alpha > 0) ctx.fillText('nét đứt: Debye', L + 112, T + 4);
    }
    function drawC() {
      if (!sC.ctx) return;
      const { ctx, W, H } = sC, pad = 30;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const s = Math.min((W - 2 * pad) / P.de, (H - 2 * pad) / (P.de / 2) * 0.95);
      const x0 = (W - P.de * s) / 2, y0 = H - pad;
      const xs = e1 => x0 + (e1 - P.einf) * s, ys = e2 => y0 - e2 * s;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 16, y0); ctx.lineTo(x0 + P.de * s + 16, y0); ctx.stroke();
      ctx.font = '12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('ε∞ = ' + num(P.einf, 3), x0, y0 + 6); ctx.fillText('εₛ = ' + num(P.einf + P.de, 4), x0 + P.de * s, y0 + 6);
      ctx.textAlign = 'right'; ctx.fillText('ε′ →', W - 6, y0 + 6);
      ctx.textAlign = 'left'; ctx.fillText('ε″ ↑', 8, 8);
      if (showRef) { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.arc(x0 + P.de * s / 2, y0, P.de * s / 2, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]); }
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let k = 0; k <= 300; k++) { const f = 10 ** (-2 + 18 * k / 300), [a, b] = cc(f, P, false); k ? ctx.lineTo(xs(a), ys(b)) : ctx.moveTo(xs(a), ys(b)); }
      ctx.stroke();
      const [fa, fb] = cc(rFc.get(), P, false), [ca, cb] = cc(rF.get(), P, false);
      ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(xs(fa), ys(fb), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('fc', xs(fa), ys(fb) - 6);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(xs(ca), ys(cb), 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.muted;
      ctx.fillText('tần số tăng: từ phải sang trái', 8, 26);
    }
    watchCanvas(cvF, sF, drawF); watchCanvas(cvC, sC, drawC);
    [rDe, rEi, rFc, rA, rS, rF].forEach(r => r.upd());
  },
});
})();
