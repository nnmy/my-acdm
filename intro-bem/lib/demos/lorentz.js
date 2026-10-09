/* =====================================================================
   Sinh điện từ: minh họa "Hạt mang điện trong từ trường đều" (id: lorentz, trang 2-tu.html)
   Nhúng vào trang: <div class="demo" id="demoLorentz" data-demo="lorentz"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=lorentz
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const MU0 = 1.25663706e-6;           // T m / A
const WORLD_W = 0.20;                // khung rộng 20 cm (demo dây dẫn)
const xy = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
function pressGroup(btns, active) { btns.forEach(b => b.setAttribute('aria-pressed', b === active)); }
function dots(ctx, W, H) { ctx.fillStyle = C.line; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) ctx.fillRect(x - .75, y - .75, 1.5, 1.5); }
/* kim la bàn nhỏ: đầu đỏ chỉ theo (bx, by) */
function needle(ctx, x, y, bx, by, L, w = 3) {
  const n = Math.hypot(bx, by); if (!n) return;
  const ux = bx / n, uy = by / n, px = -uy, py = ux;
  ctx.fillStyle = C.pos; ctx.beginPath(); ctx.moveTo(x + ux * L, y + uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
  ctx.fillStyle = '#9DA4AD'; ctx.beginPath(); ctx.moveTo(x - ux * L, y - uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
}

BEM.demo('lorentz', {
  domId: 'demoLorentz',
  title: 'Hạt mang điện trong từ trường đều',
  page: '2-tu.html',
  html: `<div class="demo-title"><h4>Hạt mang điện trong từ trường đều</h4><span>Chọn hạt, chỉnh vận tốc và từ trường</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvLor" class="ar" role="img" aria-label="Hình động: hạt mang điện chuyển động tròn trong từ trường đều, kèm vector vận tốc và lực."></canvas>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="lP">Hạt</label>
            <select id="lP">
              <option value="e">Electron (e⁻)</option>
              <option value="p" selected>Proton (p⁺)</option>
              <option value="na">Ion natri (Na⁺)</option>
              <option value="cl">Ion clorua (Cl⁻)</option>
            </select></div>
          <div class="ctrl"><label for="lV">Vận tốc v</label><output for="lV"></output>
            <input type="range" id="lV" min="2" max="7" step="0.01" value="5"></div>
          <div class="ctrl"><label for="lB">Từ trường B</label><output for="lB"></output>
            <input type="range" id="lB" min="-5" max="1" step="0.01" value="0"></div>
          <div class="btnrow" role="group" aria-label="Chiều từ trường">
            <button class="btn" type="button" data-bdir="-1" aria-pressed="true">B đi vào ⊗</button>
            <button class="btn" type="button" data-bdir="1" aria-pressed="false">B đi ra ⊙</button>
          </div>
          <dl class="readout" aria-live="polite">
            <dt>Bán kính quỹ đạo r</dt><dd class="big" id="lR">—</dd>
            <dt>Tần số cyclotron f<sub>c</sub></dt><dd id="lF">—</dd>
            <dt>Chu kỳ T</dt><dd id="lT">—</dd>
            <dt>Lực F = |q|vB</dt><dd id="lFo">—</dd>
            <dt>Chiều quay</dt><dd id="lDir">—</dd>
          </dl>
          <p class="note-s">Hình không theo tỉ lệ: bán kính vẽ theo thang logarit để luôn vừa khung. Số liệu thật nằm trong ô bên trên.</p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 2: LỰC LORENTZ, hạt chuyển động tròn trong B đều (B vuông góc màn hình)
   ===================================================================== */
(function demoLorentz() {
  const cv = document.getElementById('cvLor'); if (!cv) return;
  const e0 = 1.602176634e-19, u = 1.66053907e-27;
  const PART = {
    e:  { q: -e0, m: 9.1093837e-31, name: 'e⁻' },
    p:  { q: e0,  m: 1.67262192e-27, name: 'p⁺' },
    na: { q: e0,  m: 22.99 * u, name: 'Na⁺' },
    cl: { q: -e0, m: 35.45 * u, name: 'Cl⁻' },
  };
  const st = {}; let part = PART.p, bdir = -1, th = 0;
  const sel = document.getElementById('lP');
  const sv = range('lV', { map: v => 10 ** v, show: v => fmt(v, 'm/s'), onInput: () => calc() });
  const sb = range('lB', { map: v => 10 ** v, show: v => fmt(v, 'T'), onInput: () => calc() });
  sel.addEventListener('change', () => { part = PART[sel.value]; calc(); });
  const bb = [...document.querySelectorAll('#demoLorentz [data-bdir]')];
  bb.forEach(b => b.addEventListener('click', () => { pressGroup(bb, b); bdir = +b.dataset.bdir; calc(); }));
  let R = 1, sense = 1;
  function calc() {
    const v = sv.get(), B = sb.get(), q = Math.abs(part.q);
    R = part.m * v / (q * B);
    const f = q * B / (2 * Math.PI * part.m);
    sense = Math.sign(part.q) * bdir > 0 ? 1 : -1;     // +1: cùng chiều kim đồng hồ (trên màn hình)
    setTxt('lR', fmt(R, 'm')); setTxt('lF', fmt(f, 'Hz')); setTxt('lT', fmt(1 / f, 's'));
    setTxt('lFo', fmt(q * v * B, 'N')); setTxt('lDir', sense > 0 ? 'cùng chiều kim đồng hồ' : 'ngược chiều kim đồng hồ');
    draw();
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    // ký hiệu B
    ctx.strokeStyle = '#B9C0C8'; ctx.fillStyle = '#B9C0C8'; ctx.lineWidth = 1.4;
    for (let y = 24; y < H; y += 40) for (let x = 24; x < W; x += 40) {
      if (bdir < 0) { ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(bdir < 0 ? 'B đi vào màn hình' : 'B đi ra khỏi màn hình', 10, 8);
    // bán kính hiển thị theo log
    const Rmax = Math.min(W, H) / 2 - 34, t = Math.max(0, Math.min(1, (Math.log10(R) + 11) / 14));
    const rp = 22 + (Rmax - 22) * t;
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(27,25,32,.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, rp, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(27,25,32,.35)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rp * Math.cos(-0.6), cy + rp * Math.sin(-0.6)); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.fillText('r', cx + rp * 0.5 * Math.cos(-0.6) + 4, cy + rp * 0.5 * Math.sin(-0.6) - 16);
    // hạt
    const x = cx + rp * Math.cos(th), y = cy + rp * Math.sin(th);
    const tx = -Math.sin(th) * sense, ty = Math.cos(th) * sense;       // tiếp tuyến theo chiều chuyển động
    const L = Math.min(56, rp * 0.9 + 18);
    arrow(ctx, x, y, x + tx * L, y + ty * L, C.ink, 2.6, 10);
    arrow(ctx, x, y, x - Math.cos(th) * L * 0.75, y - Math.sin(th) * L * 0.75, C.gold, 7, 13);
    arrow(ctx, x, y, x - Math.cos(th) * L * 0.75, y - Math.sin(th) * L * 0.75, C.ink, 2.6, 10);
    ctx.font = 'italic 600 15px Georgia, serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('v', x + tx * (L + 12), y + ty * (L + 12));
    ctx.fillText('F', x - Math.cos(th) * (L * 0.75 + 12) + tx * 10, y - Math.sin(th) * (L * 0.75 + 12) + ty * 10);
    const pos = part.q > 0;
    ctx.fillStyle = pos ? C.pos : C.neg; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); if (pos) { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); } ctx.stroke();
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.fillText(part.name, x, y - 22);
  }
  watchCanvas(cv, st, draw);
  sv.upd(); sb.upd(); calc();
  loopWhenVisible(cv, dt => { if (!REDUCED) { th += sense * dt * 1.4; draw(); } });
})();
  },
});
})();
