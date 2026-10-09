/* =====================================================================
   Sinh điện từ: minh họa "Điện trường cảm ứng trong đĩa mô" (id: induced, trang 5-do-lieu.html)
   Nhúng vào trang: <div class="demo" id="demoInduced" data-demo="induced"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=induced
   Mô hình: đĩa đồng nhất bán kính R trong từ trường đều B (rms) vuông góc, E(r) = π f B r.
   Giới hạn cơ bản ICNIRP 2010 (E nội, rms), công chúng:
     mô thần kinh trung ương ở đầu: 1–10 Hz 0,1/f; 10–25 Hz 0,01; 25 Hz–1 kHz 4e-4·f; 1–3 kHz 0,4; 3 kHz–10 MHz 1,35e-4·f
     mọi mô của đầu và thân:        1 Hz–3 kHz 0,4; 3 kHz–10 MHz 1,35e-4·f
   (người lao động: gấp 5 lần, trừ CNS 10–25 Hz gấp 5 và 400 Hz–3 kHz là 0,8; ở đây chỉ hiện mức công chúng)
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const SIG = [['brain', 'Chất xám (não)', 0.1], ['muscle', 'Cơ', 0.35], ['body', 'Trung bình toàn thân', 0.2], ['fat', 'Mỡ', 0.04], ['blood', 'Máu', 0.7], ['csf', 'Dịch não tủy', 2]];
const PRESETS = {
  line: { B: 10e-6, f: 50, R: 0.15, n: 'Gần đường dây điện 50 Hz: cỡ 1–10 µT ngay dưới đường dây cao thế.' },
  ref: { B: 200e-6, f: 50, R: 0.09, n: 'Đúng bằng mức tham chiếu ICNIRP cho công chúng ở 50 Hz (200 µT). Mức tham chiếu được chọn có biên an toàn (khoảng 3 lần) so với giới hạn cơ bản trong não.' },
  ind: { B: 6e-6, f: 25000, R: 0.15, n: 'Bếp từ, cách mặt bếp khoảng 30 cm: cỡ vài µT ở 20–50 kHz. Từ 3 kHz trở lên, giới hạn tăng tỉ lệ với f vì thần kinh khó bị kích thích hơn.' },
  mri: { B: 20e-3, f: 1000, R: 0.15, n: 'Cuộn gradient của MRI chuyển mạch nhanh: dB/dt cỡ 100 T/s. E cảm ứng vài V/m có thể gây kích thích thần kinh ngoại biên (cảm giác giật), nên máy MRI có giới hạn dB/dt riêng.' },
};
function limCNS(f) { return f < 10 ? 0.1 / f : f < 25 ? 0.01 : f < 1000 ? 4e-4 * f : f < 3000 ? 0.4 : 1.35e-4 * f; }
function limBody(f) { return f < 3000 ? 0.4 : 1.35e-4 * f; }

BEM.demo('induced', {
  domId: 'demoInduced',
  title: 'Điện trường cảm ứng trong đĩa mô',
  page: '5-do-lieu.html',
  html: `<div class="demo-title"><h4>Điện trường cảm ứng trong đĩa mô</h4><span>Chọn nguồn từ trường, tần số và kích thước</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvInd" class="ar" role="img" aria-label="Đĩa mô trong từ trường đều; mũi tên chỉ điện trường cảm ứng xoay vòng, màu chỉ mật độ dòng."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Nguồn mẫu">
        <button class="btn" type="button" data-ipre="line" aria-pressed="false">Đường dây điện</button>
        <button class="btn" type="button" data-ipre="ref" aria-pressed="true">Mức tham chiếu</button>
        <button class="btn" type="button" data-ipre="ind" aria-pressed="false">Bếp từ</button>
        <button class="btn" type="button" data-ipre="mri" aria-pressed="false">Gradient MRI</button>
      </div>
      <div class="ctrl"><label for="inB">Từ trường B (rms)</label><output for="inB"></output><input type="range" id="inB" min="-7" max="-1" step="0.01" value="-3.7"></div>
      <div class="ctrl"><label for="inF">Tần số f</label><output for="inF"></output><input type="range" id="inF" min="0" max="6" step="0.01" value="1.7"></div>
      <div class="ctrl"><label for="inR">Bán kính đĩa R</label><output for="inR"></output><input type="range" id="inR" min="3" max="20" step="0.5" value="9"></div>
      <div class="ctrl"><label for="inS">Mô</label><select id="inS"></select></div>
      <dl class="readout" aria-live="polite">
        <dt>dB/dt (biên độ)</dt><dd id="inDb">—</dd>
        <dt>E cảm ứng ở mép đĩa</dt><dd class="big" id="inE">—</dd>
        <dt>J ở mép đĩa</dt><dd id="inJ">—</dd>
        <dt>Giới hạn E, não (công chúng)</dt><dd id="inL1">—</dd>
        <dt>Giới hạn E, toàn thân (công chúng)</dt><dd id="inL2">—</dd>
      </dl>
      <p class="note-s" id="inNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvInd'), st = {}, sel = document.getElementById('inS');
    SIG.forEach(([k, n, s], i) => { const o = document.createElement('option'); o.value = i; o.textContent = `${n}: σ ≈ ${num(s, 2)} S/m`; sel.appendChild(o); });
    let note = PRESETS.ref.n, ph = 0;
    const rB = range('inB', { map: v => 10 ** v, show: v => fmt(v, 'T'), onInput: () => calc() });
    const rF = range('inF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => calc() });
    const rR = range('inR', { show: v => num(v, 3) + ' cm', onInput: () => calc() });
    sel.addEventListener('change', () => calc());
    const bb = [...document.querySelectorAll('#demoInduced [data-ipre]')];
    bb.forEach(b => b.addEventListener('click', () => {
      bb.forEach(x => x.setAttribute('aria-pressed', x === b)); const p = PRESETS[b.dataset.ipre];
      note = p.n; rB.set(Math.log10(p.B)); rF.set(Math.log10(p.f)); rR.set(p.R * 100);
      sel.value = b.dataset.ipre === 'ref' ? 0 : 2; calc();
    }));
    let S = {};
    function calc() {
      const B = rB.get(), f = rF.get(), R = rR.get() / 100, sig = SIG[+sel.value][2];
      const E = Math.PI * f * B * R, J = sig * E, l1 = limCNS(f), l2 = limBody(f);
      S = { B, f, R, sig, E, J, l1, l2 };
      const tag = (v, l) => fmt(l, 'V/m') + (v > l ? '  (vượt ' + num(v / l, 2) + '×)' : '  (' + num(v / l * 100, 2) + '%)');
      document.getElementById('inDb').textContent = fmt(2 * Math.PI * f * B * Math.SQRT2, 'T/s');
      document.getElementById('inE').textContent = fmt(E, 'V/m'); document.getElementById('inJ').textContent = fmt(J, 'A/m²');
      document.getElementById('inL1').textContent = tag(E, l1); document.getElementById('inL2').textContent = tag(E, l2);
      document.getElementById('inNote').textContent = note + ' Mức "não" chỉ áp dụng nếu đĩa là mặt cắt của đầu.';
      draw();
    }
    function draw() {
      if (!st.ctx || !S.R) return;
      const { ctx, W, H } = st, cx = W / 2, cy = H / 2, Rp = Math.min(W, H) * 0.4;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#B9C0C8'; ctx.lineWidth = 1.3;
      for (let y = 20; y < H; y += 36) for (let x = 20; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
      // màu theo |J| (∝ r): trắng ở tâm, đỏ ở mép
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rp);
      const k = Math.min(1, S.E / Math.max(S.l2, 1e-12));
      g.addColorStop(0, '#FBEBE8'); g.addColorStop(1, `rgb(${Math.round(251 - 35 * k - 20)},${Math.round(200 - 151 * k)},${Math.round(195 - 153 * k)})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Rp, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
      // vòng E: chiều đổi theo pha của B (sin), độ dài ∝ r
      const s = Math.cos(ph);
      for (const fr of [0.3, 0.6, 0.92]) {
        const r = Rp * fr, n = Math.round(6 + 10 * fr), L = 26 * fr * Math.abs(s);
        ctx.strokeStyle = 'rgba(27,25,32,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        if (L < 3) continue;
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), tx = -Math.sin(a) * Math.sign(s), ty = Math.cos(a) * Math.sign(s);
          arrow(ctx, x - tx * L / 2, y - ty * L / 2, x + tx * L / 2, y + ty * L / 2, C.sea, 2.2, 8);
        }
      }
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('B ⊗ (biến thiên ' + fmt(S.f, 'Hz') + ')', 10, 8);
      ctx.fillStyle = C.sea; ctx.fillText('mũi tên: E cảm ứng (∝ r)', 10, 26);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('R = ' + num(S.R * 100, 3) + ' cm', cx, cy + Rp + 8);
    }
    watchCanvas(cv, st, draw);
    sel.value = 0; rB.upd(); rF.upd(); rR.upd(); calc();
    loopWhenVisible(cv, dt => { if (!REDUCED) { ph += dt * 2.2; draw(); } });
  },
});
})();
