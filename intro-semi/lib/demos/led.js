/* =====================================================================
   Bán dẫn: minh họa "Màu của LED theo vùng cấm" (id: led, trang 3-diode.html)
   Nhúng vào trang: <div class="demo" id="demoLed" data-demo="led"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=led

   Photon phát ra khi electron ở đáy vùng dẫn tái hợp với lỗ trống ở đỉnh vùng hóa trị: E_photon ≈ E_g,
   λ (nm) ≈ 1240 / E_g (eV). Giá trị E_g ở 300 K (làm tròn); hợp kim (AlGaInP, InGaN) đổi E_g theo thành phần.
   Si và Ge có vùng cấm xiên: phát sáng rất kém, nên không dùng làm LED.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = SEMI;
const MATS = [
  ['Si', 1.12, 'xiên', 'Vùng cấm xiên: electron và lỗ trống khó tái hợp bằng cách phát photon. Si dùng làm pin mặt trời, cảm biến ảnh, nhưng không làm LED.'],
  ['GaAs', 1.42, 'thẳng', 'Hồng ngoại gần: LED trong điều khiển từ xa, cảm biến, cáp quang ngắn.'],
  ['AlGaInP (đỏ)', 1.97, 'thẳng', 'LED đỏ, cam, vàng hổ phách: đèn giao thông, đèn hậu xe hơi.'],
  ['AlGaInP (hổ phách)', 2.1, 'thẳng', 'Thay đổi tỉ lệ Al, Ga, In để chỉnh màu từ đỏ sang vàng.'],
  ['InGaN (xanh lá)', 2.35, 'thẳng', 'LED xanh lá: khó đạt hiệu suất cao hơn LED xanh lam và đỏ ("green gap").'],
  ['InGaN (xanh lam)', 2.7, 'thẳng', 'LED xanh lam (giải Nobel Vật lý 2014). Phủ thêm lớp phốt pho vàng ta có LED trắng.'],
  ['GaN', 3.4, 'thẳng', 'Tử ngoại gần: khử trùng, đèn soi tiền; cũng là vật liệu cho transistor công suất, sạc nhanh.'],
];

SEMI.demo('led', {
  domId: 'demoLed',
  title: 'Màu của LED theo vùng cấm',
  page: '3-diode.html',
  html: `<div class="demo-title"><h4>Màu của LED theo vùng cấm</h4><span>Chọn vật liệu hoặc kéo độ rộng vùng cấm</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvLed" class="ar" role="img" aria-label="Một bóng LED phát sáng với màu ứng với độ rộng vùng cấm; bên cạnh là giản đồ electron rơi từ vùng dẫn xuống vùng hóa trị và dải phổ ánh sáng với vị trí bước sóng phát ra."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="ldMat">Vật liệu</label><select id="ldMat">${MATS.map((m, i) => `<option value="${i}"${i === 5 ? ' selected' : ''}>${m[0]}: ${num(m[1], 3)} eV</option>`).join('')}<option value="-1">Tự chọn E_g</option></select></div>
      <div class="ctrl"><label for="ldEg">Độ rộng vùng cấm E_g</label><output for="ldEg"></output><input type="range" id="ldEg" min="1.0" max="3.6" step="0.01" value="2.7"></div>
      <dl class="readout" aria-live="polite">
        <dt>Bước sóng</dt><dd class="big" id="ldL">—</dd>
        <dt>Vùng phổ</dt><dd id="ldR">—</dd>
        <dt>Loại vùng cấm</dt><dd id="ldT">—</dd>
      </dl>
      <p class="note-s" id="ldNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvLed'), st = {}, sel = document.getElementById('ldMat');
    let mat = MATS[5];
    const rEg = range('ldEg', { show: v => num(v, 3) + ' eV', onInput: () => { if (+sel.value >= 0 && Math.abs(rEg.get() - MATS[+sel.value][1]) > 0.005) sel.value = '-1'; mat = +sel.value >= 0 ? MATS[+sel.value] : null; upd(); } });
    sel.addEventListener('change', () => { const i = +sel.value; if (i >= 0) { mat = MATS[i]; rEg.el.value = MATS[i][1]; rEg.upd(); } else { mat = null; upd(); } });
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function upd() {
      const eg = rEg.get(), lam = 1240 / eg;
      set('ldL', num(lam, 4) + ' nm'); set('ldR', lam < 380 ? 'tử ngoại' : lam > 750 ? 'hồng ngoại' : 'ánh sáng nhìn thấy');
      set('ldT', mat ? mat[2] : '—'); set('ldNote', mat ? mat[3] : 'Vùng cấm càng rộng, mỗi photon mang năng lượng càng lớn và bước sóng càng ngắn (về phía xanh, tím).');
      draw();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, eg = rEg.get(), lam = 1240 / eg, col = SEMI.rgbFromWavelength(lam);
      const indirect = mat && mat[2] === 'xiên';
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#1d1f24'; ctx.fillRect(0, 0, W, H);
      const cx = W * 0.27, cy = H * 0.34, r = Math.min(W * 0.13, H * 0.16);
      if (col && !indirect) { const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3.2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.fillStyle = col && !indirect ? col : '#5a5f68'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r * 1.1); ctx.lineTo(cx - r, cy + r * 1.1); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#d6dae0'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#aab0b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - r * 0.4, cy + r * 1.1); ctx.lineTo(cx - r * 0.4, cy + r * 2.2); ctx.moveTo(cx + r * 0.4, cy + r * 1.1); ctx.lineTo(cx + r * 0.4, cy + r * 1.9); ctx.stroke();
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#e6e9ed'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(col && !indirect ? 'ánh sáng nhìn thấy' : indirect ? 'gần như không sáng' : lam < 380 ? 'tử ngoại (mắt không thấy)' : 'hồng ngoại (mắt không thấy)', cx, cy + r * 2.35);
      // giản đồ vùng
      const bx0 = W * 0.55, bx1 = W - 24, ey = e => H * 0.72 - e / 3.8 * H * 0.55, ec = eg, ev = 0;
      ctx.fillStyle = 'rgba(216,49,42,.25)'; ctx.fillRect(bx0, ey(ec) - 40, bx1 - bx0, 40);
      ctx.fillStyle = 'rgba(55,135,196,.45)'; ctx.fillRect(bx0, ey(ev), bx1 - bx0, 40);
      ctx.strokeStyle = '#e6e9ed'; ctx.lineWidth = 2; [ec, ev].forEach(e => { ctx.beginPath(); ctx.moveTo(bx0, ey(e)); ctx.lineTo(bx1, ey(e)); ctx.stroke(); });
      const xm = (bx0 + bx1) / 2;
      ctx.fillStyle = '#7bcde8'; ctx.beginPath(); ctx.arc(xm - 30, ey(ec) - 8, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = C.pos; ctx.fillStyle = '#1d1f24'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(xm - 30, ey(ev) + 8, 6, 0, 7); ctx.fill(); ctx.stroke();
      SEMI.arrow(ctx, xm - 30, ey(ec) - 2, xm - 30, ey(ev) + 2, '#e6e9ed', 2, 8);
      ctx.strokeStyle = col || '#9aa0a8'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k <= 50; k++) { const x = xm - 20 + k * 1.4, y = (ey(ec) + ey(ev)) / 2 + Math.sin(k * 0.9) * 6; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.fillStyle = '#e6e9ed'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('vùng dẫn', bx0 + 4, ey(ec) - 20); ctx.fillText('vùng hóa trị', bx0 + 4, ey(ev) + 22);
      ctx.fillText('E_g = ' + num(eg, 3) + ' eV', xm + 56, (ey(ec) + ey(ev)) / 2);
      // dải phổ
      const sx0 = 20, sx1 = W - 20, sy = H - 34, lx = l => sx0 + (l - 300) / (1300 - 300) * (sx1 - sx0);
      for (let l = 380; l < 750; l += 2) { ctx.fillStyle = SEMI.rgbFromWavelength(l); ctx.fillRect(lx(l), sy, lx(l + 2) - lx(l) + 0.5, 12); }
      ctx.strokeStyle = '#6b717a'; ctx.lineWidth = 1; ctx.strokeRect(sx0, sy, sx1 - sx0, 12);
      const lm = Math.max(300, Math.min(1300, lam)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(lx(lm), sy - 2); ctx.lineTo(lx(lm) - 6, sy - 12); ctx.lineTo(lx(lm) + 6, sy - 12); ctx.fill();
      ctx.fillStyle = '#c9ced6'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; [400, 700, 1000, 1240].forEach(l => ctx.fillText(l + ' nm', lx(l), sy + 15));
    }
    watchCanvas(cv, st, draw);
    rEg.el.value = MATS[5][1]; rEg.upd();
  },
});
})();
