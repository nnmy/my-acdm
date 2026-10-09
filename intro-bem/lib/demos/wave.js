/* =====================================================================
   Sinh điện từ: minh họa "Sóng điện từ đi vào mô" (id: wave, trang 3-maxwell.html)
   Nhúng vào trang: <div class="demo" id="demoWave" data-demo="wave"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=wave
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, sci, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const K = 8.9875517923e9, EPS0 = 8.8541878128e-12, MU0 = 1.25663706e-6, nC = 1e-9;
const CL = 299792458, HPL = 6.62607015e-34, QE = 1.602176634e-19;
const xy = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
const pressGroup = (btns, a) => btns.forEach(b => b.setAttribute('aria-pressed', b === a));
const logLen = (v, ref, a, b, lo, hi) => Math.max(lo, Math.min(hi, a + b * Math.log10(Math.max(1e-30, v) / ref)));
const sgnTxt = q => (q > 0 ? '+' : q < 0 ? '−' : '') + Math.abs(q);
function bg(ctx, W, H) { ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.fillStyle = C.line; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) ctx.fillRect(x - .75, y - .75, 1.5, 1.5); }
function head(ctx, x, y, dx, dy, col) { const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x - dx * 4 - dy * 3.6, y - dy * 4 + dx * 3.6); ctx.lineTo(x - dx * 4 + dy * 3.6, y - dy * 4 - dx * 3.6); ctx.fill(); }
function drawCharge(ctx, x, y, q, label) {
  ctx.fillStyle = q > 0 ? C.pos : q < 0 ? C.neg : '#B9C0C8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (q) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 5.5, y); ctx.lineTo(x + 5.5, y); if (q > 0) { ctx.moveTo(x, y - 5.5); ctx.lineTo(x, y + 5.5); } ctx.stroke(); }
  if (label) { ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const w = ctx.measureText(label).width + 8; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x - w / 2, y - 35, w, 17); ctx.fillStyle = C.ink; ctx.fillText(label, x, y - 19); }
}
/* vòng tròn "mặt kín" + mũi tên thông lượng pháp tuyến (đỏ: đi ra, xanh: đi vào) */
function drawSurface(ctx, cx, cy, R, normalAt, ref) {
  ctx.strokeStyle = C.sea; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a), x = cx + R * nx, y = cy + R * ny;
    const fn = normalAt(x, y, nx, ny); if (!fn) continue;
    const L = logLen(Math.abs(fn), ref, 4, 5, 3, 22);
    if (fn > 0) arrow(ctx, x, y, x + nx * L, y + ny * L, C.pos, 2, 6);
    else arrow(ctx, x + nx * L, y + ny * L, x, y, C.neg, 2, 6);
  }
  ctx.fillStyle = C.sea; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
}


/* small helper: 2-band time plot (giống đồ thị ở phần 1) */
function bandPlot(sp, series, tNow, tSpan) {
  if (!sp.ctx) return;
  const { ctx, W, H } = sp; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const h = H / series.length;
  series.forEach((s, bi) => {
    const y0 = bi * h, mid = y0 + h / 2;
    const L = Math.max(s.floor || 1e-30, ...s.data.map(p => Math.abs(p[1]))) * 1.1;
    const ys = v => mid - v / L * (h / 2 - 6), xs = t => W - (tNow - t) / tSpan * W;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash(s.dash || []); ctx.beginPath();
    s.data.forEach(([t, v], i) => i ? ctx.lineTo(xs(t), ys(v)) : ctx.moveTo(xs(t), ys(v))); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const lab = `${s.name}   (±${fmt(L, s.unit, 2)})`, w = ctx.measureText(lab).width + 8;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(6, y0 + 4, w, 18); ctx.fillStyle = s.color; ctx.fillText(lab, 10, y0 + 5);
    if (bi) { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); }
  });
}

BEM.demo('wave', {
  domId: 'demoWave',
  title: 'Sóng điện từ đi vào mô',
  page: '3-maxwell.html',
  html: `<div class="demo-title"><h4>Sóng điện từ đi vào mô</h4><span>Chỉnh tần số; chọn môi trường ở nửa phải</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvWave" class="ar" role="img" aria-label="Hình động sóng điện từ: điện trường E thẳng đứng, từ trường B nằm ngang, đi từ không khí vào một môi trường khác."></canvas>
        </div>
        <div class="panel">
          <div class="ctrl"><label for="wvF">Tần số f</label><output for="wvF"></output><input type="range" id="wvF" min="0" max="20" step="0.01" value="9.39"></div>
          <div class="ctrl"><label for="wvM">Môi trường bên phải</label>
            <select id="wvM">
              <option value="1">Không khí (εᵣ = 1)</option>
              <option value="5.5">Mỡ, cỡ εᵣ ≈ 5,5</option>
              <option value="55" selected>Cơ, cỡ εᵣ ≈ 55</option>
              <option value="78">Nước, cỡ εᵣ ≈ 78</option>
            </select></div>
          <dl class="readout" aria-live="polite">
            <dt>Dải tần</dt><dd id="wvBand">—</dd>
            <dt>Bước sóng (chân không)</dt><dd class="big" id="wvL">—</dd>
            <dt>Cỡ của</dt><dd id="wvCmp">—</dd>
            <dt>Bước sóng trong môi trường</dt><dd id="wvL2">—</dd>
            <dt>Vận tốc trong môi trường</dt><dd id="wvV">—</dd>
            <dt>Năng lượng photon hf</dt><dd id="wvEn">—</dd>
          </dl>
          <p class="note-s" id="wvNote"></p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 5: SÓNG ĐIỆN TỪ đi từ không khí vào môi trường εr (bỏ qua hấp thụ và sóng phản xạ).
   Biên độ sóng truyền qua (tới vuông góc): E_t = 2/(1+n)·E_i, B_t = 2n/(1+n)·B_i.
   ===================================================================== */
const BANDS = [
  [300, 'ELF', 'Lưới điện 50/60 Hz. Tác động chính lên cơ thể: dòng điện cảm ứng có thể kích thích thần kinh và cơ.'],
  [3e5, 'VLF–LF', 'Bếp từ (20–100 kHz), xung TMS. Vẫn chủ yếu là kích thích; từ khoảng 100 kHz bắt đầu đốt nóng.'],
  [3e8, 'Sóng radio (RF)', 'Phát thanh, RFID, sóng RF của máy MRI (64 MHz ở 1,5 T; 128 MHz ở 3 T). Tác động chính: đốt nóng mô.'],
  [3e11, 'Vi sóng (microwave)', 'Điện thoại di động (0,7–6 GHz), Wi-Fi, lò vi sóng 2,45 GHz, 5G sóng milimet. Tác động chính: đốt nóng; SAR là đại lượng giới hạn (phần 5).'],
  [3e12, 'Terahertz', 'Bị nước hấp thụ rất mạnh; chỉ xuyên vào da khoảng vài trăm µm.'],
  [4e14, 'Hồng ngoại (IR)', 'Bức xạ nhiệt; hấp thụ ở lớp ngoài của da và mắt.'],
  [7.9e14, 'Ánh sáng nhìn thấy', 'Photon 1,6–3,3 eV đủ để kích thích electron trong sắc tố: thị giác, quang hợp.'],
  [3e16, 'Tử ngoại (UV)', 'UV-B và UV-C làm tổn thương DNA. Từ khoảng 10 eV trở lên, photon đủ năng lượng để ion hóa phân tử.'],
  [3e19, 'Tia X', 'Chụp X-quang, CT. Bức xạ ion hóa.'],
  [Infinity, 'Tia gamma', 'Xạ trị, y học hạt nhân. Bức xạ ion hóa.'],
];
const SIZES = [[1e-14, 'hạt nhân nguyên tử'], [1e-12, 'nhỏ hơn nguyên tử'], [1e-10, 'nguyên tử'], [1e-9, 'phân tử nhỏ'], [1e-8, 'protein'], [1e-7, 'virus'], [1e-6, 'vi khuẩn'], [1e-5, 'tế bào người'], [1e-4, 'bề dày sợi tóc'], [1e-3, 'hạt cát'], [1e-2, 'đồng xu'], [1e-1, 'bàn tay'], [1, 'chiều cao người'], [10, 'ngôi nhà'], [100, 'sân bóng đá'], [1e3, 'thị trấn nhỏ'], [1e4, 'thành phố'], [1e5, 'một tỉnh'], [1e6, 'một quốc gia'], [1e7, 'Trái Đất'], [1e8, 'khoảng cách Trái Đất–Mặt Trăng']];
(function demoWave() {
  const cv = document.getElementById('cvWave'); if (!cv) return;
  const st = {}, sel = document.getElementById('wvM'); let ph = 0;
  const sF = range('wvF', { map: v => 10 ** v, show: v => fmt(v, 'Hz'), onInput: () => info() });
  sel.addEventListener('change', () => info());
  const er = () => parseFloat(sel.value);
  function info() {
    const f = sF.get(), n = Math.sqrt(er()), lam = CL / f, eV = HPL * f / QE;
    const b = BANDS.find(x => f < x[0]);
    let best = SIZES[0], bd = Infinity; SIZES.forEach(s => { const d = Math.abs(Math.log10(lam / s[0])); if (d < bd) { bd = d; best = s; } });
    setTxt('wvBand', b[1]); setTxt('wvL', fmt(lam, 'm')); setTxt('wvCmp', 'cỡ ' + best[1]);
    setTxt('wvL2', fmt(lam / n, 'm')); setTxt('wvV', fmt(CL / n, 'm/s'));
    setTxt('wvEn', (eV >= 1e-3 ? fmt(eV, 'eV') : sci(eV, 3) + ' eV') + (eV > 10 ? ' (ion hóa)' : ''));
    setTxt('wvNote', b[2] + (er() > 1 && f > 3e12 ? ' Lưu ý: εᵣ trong demo là giá trị cỡ 1 GHz, không đúng ở tần số quang học.' : ''));
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st, n = Math.sqrt(er()), xb = W * 0.5, cy = H * 0.52;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    if (n > 1) { ctx.fillStyle = n > 5 ? '#FBE9E6' : '#FDF6DD'; ctx.fillRect(xb, 0, W - xb, H); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xb, 0); ctx.lineTo(xb, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Không khí', 10, 8); ctx.fillText(sel.options[sel.selectedIndex].text, xb + 10, 8);
    const L1 = W * 0.2, L2 = L1 / n, Ae = H * 0.26, Ab = H * 0.24, tE = 2 / (1 + n), tB = 2 * n / (1 + n);
    const dz = [0.55, -0.32];                     // hướng "chiều sâu" (trục B) khi chiếu xiên
    const field = x => x < xb ? Math.sin(2 * Math.PI * x / L1 - ph) : Math.sin(2 * Math.PI * xb / L1 + 2 * Math.PI * (x - xb) / L2 - ph);
    const ampE = x => x < xb ? Ae : Ae * tE, ampB = x => (x < xb ? Ab : Ab * Math.min(1.25, tB)) * 0.75;
    // trục lan truyền
    arrow(ctx, 6, cy, W - 6, cy, C.ink, 1.6, 9);
    // B (xanh, theo trục xiên)
    const stems = () => { const a = []; for (let x = 8; x < xb; x += 8) a.push(x); for (let x = xb + 2; x < W - 8; x += Math.max(4, L2 / 5)) a.push(x); return a; };
    ctx.strokeStyle = 'rgba(55,135,196,.3)'; ctx.lineWidth = 1;
    for (const x of stems().filter(x => x < xb)) { const v = field(x) * ampB(x); ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + dz[0] * v, cy + dz[1] * v); ctx.stroke(); }
    ctx.strokeStyle = C.sea; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let x = 0; x <= W; x += 2) { const v = field(x) * ampB(x); x ? ctx.lineTo(x + dz[0] * v, cy + dz[1] * v) : ctx.moveTo(x + dz[0] * v, cy + dz[1] * v); } ctx.stroke();
    // E (đỏ, thẳng đứng)
    ctx.strokeStyle = 'rgba(216,49,42,.35)'; ctx.lineWidth = 1;
    for (const x of stems()) { const v = field(x) * ampE(x); ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy - v); ctx.stroke(); }
    ctx.strokeStyle = C.pos; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let x = 0; x <= W; x += 2) { const v = field(x) * ampE(x); x ? ctx.lineTo(x, cy - v) : ctx.moveTo(x, cy - v); } ctx.stroke();
    // nhãn + thước λ
    ctx.font = 'italic 700 16px Georgia, serif'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.pos; ctx.fillText('E', 14, cy - Ae - 10); ctx.fillStyle = C.sea; ctx.fillText('B', 14 + dz[0] * Ab * 0.75 + 8, cy + dz[1] * Ab * 0.75 - 6);
    const bar = (x0, L, y, lab) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y - 5); ctx.lineTo(x0, y + 5); ctx.moveTo(x0, y); ctx.lineTo(x0 + L, y); ctx.moveTo(x0 + L, y - 5); ctx.lineTo(x0 + L, y + 5); ctx.stroke(); ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(lab, x0 + L / 2, y + 7); ctx.textAlign = 'left'; };
    bar(W * 0.08, L1, H - 40, 'λ₀');
    if (n > 1) bar(xb + 16, L2, H - 40, 'λ = λ₀/√εᵣ');
  }
  watchCanvas(cv, st, draw);
  sF.upd(); info(); draw();
  loopWhenVisible(cv, dt => { if (!REDUCED) { ph += dt * 2 * Math.PI * 0.5; draw(); } });
})();
  },
});
})();
