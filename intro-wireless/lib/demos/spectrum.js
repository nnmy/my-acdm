/* =====================================================================
   Không dây: minh họa "Bản đồ phổ tần" (id: spectrum, trang 1-song-vo-tuyen.html)
   Nhúng vào trang: <div class="demo" id="demoSpectrum" data-demo="spectrum"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=spectrum

   Trục tần số theo thang log (mỗi vạch = gấp 10 lần). Các dải tần là giá trị tiêu biểu, làm tròn;
   dải cụ thể được cấp phép khác nhau giữa các nước và các nhà mạng.
   ===================================================================== */
(() => {
const { COLORS: C, range, watchCanvas, FONT, hz } = WL;
// [tên, f thấp, f cao, hàng, màu, ghi chú]
const BANDS = [
  ['Sạc Qi', 87e3, 205e3, 0, '#f2c230', 'Khoảng 87–205 kHz. Không phải sóng truyền đi xa: hai cuộn dây trao năng lượng qua từ trường ở sát nhau (phần 3).'],
  ['NFC', 13.553e6, 13.567e6, 0, '#d8312a', 'Đúng 13,56 MHz, một dải ISM rất hẹp. Cũng là trường gần, nên chỉ chạy trong vài cm (phần 3).'],
  ['Radio FM', 87.5e6, 108e6, 4, '#9DA4AD', 'Khoảng 87,5–108 MHz. Để so sánh: radio FM có từ thế kỷ trước, bước sóng cỡ 3 m.'],
  ['MedRadio', 401e6, 406e6, 3, '#2e9d4f', 'Lõi 401–406 MHz (MICS cũ là 402–405 MHz), dành cho thiết bị cấy ghép như máy tạo nhịp tim. Công suất cực nhỏ (phần 7).'],
  ['4G (B8)', 880e6, 960e6, 2, '#3787c4', 'Băng 900 MHz: tần thấp, phủ xa, xuyên tường tốt. Các băng 4G ở Việt Nam thường nằm quanh 900, 1800, 2100, 2600 MHz (phần 5).'],
  ['GPS L5', 1164e6, 1189e6, 3, '#7b4fc4', 'Quanh 1176,45 MHz: tín hiệu định vị thứ hai, giúp máy thu khử sai số do tầng điện ly (phần 6).'],
  ['GPS L1', 1563e6, 1587e6, 3, '#7b4fc4', 'Quanh 1575,42 MHz: tín hiệu định vị quen thuộc nhất. Galileo, BeiDou cũng phát ở gần đây (phần 6).'],
  ['4G (B3)', 1710e6, 1880e6, 2, '#3787c4', 'Băng 1800 MHz: băng 4G chủ lực ở nhiều nước, kể cả Việt Nam.'],
  ['4G (B1)', 1920e6, 2170e6, 2, '#3787c4', 'Băng 2100 MHz: trước xài cho 3G, nay nhiều nhà mạng chuyển qua 4G.'],
  ['Bluetooth', 2400e6, 2483.5e6, 0, '#1B1920', '2400–2483,5 MHz: dải ISM 2,4 GHz, ai cũng được xài không cần giấy phép, miễn giữ công suất thấp (phần 4).'],
  ['Wi-Fi 2,4', 2400e6, 2483.5e6, 1, '#d8312a', 'Cùng dải ISM với Bluetooth và lò vi sóng (2,45 GHz), nên chật chội nhất (phần 4).'],
  ['4G (B7)', 2500e6, 2690e6, 2, '#3787c4', 'Băng 2600 MHz: tần cao, băng thông rộng, phủ gần hơn. Hợp với khu đông người.'],
  ['5G (C)', 3300e6, 3800e6, 2, '#1d6fa5', 'Quanh 3,3–3,8 GHz: \u201cbăng giữa\u201d của 5G, cân bằng giữa tốc độ và tầm phủ.'],
  ['Wi-Fi 5 GHz', 5150e6, 5850e6, 1, '#d8312a', 'Khoảng 5,15–5,85 GHz: rộng hơn nhiều so với 2,4 GHz, nhiều kênh hơn, nhanh hơn nhưng xuyên tường kém hơn.'],
  ['Wi-Fi 6 GHz', 5925e6, 7125e6, 1, '#d8312a', '5,925–7,125 GHz (Wi-Fi 6E, Wi-Fi 7). Nhiều nước chỉ mở một phần dải này cho Wi-Fi.'],
  ['Starlink ↓', 10.7e9, 12.7e9, 3, '#f08a24', 'Khoảng 10,7–12,7 GHz (băng Ku): vệ tinh phát xuống chảo thu (phần 6).'],
  ['Starlink ↑', 14.0e9, 14.5e9, 3, '#f08a24', 'Khoảng 14,0–14,5 GHz: chảo phát ngược lên vệ tinh.'],
  ['5G mmWave', 24.25e9, 29.5e9, 2, '#1d6fa5', 'Sóng milimet (bước sóng ~1 cm): rất nhanh nhưng đi gần, bị cơ thể, lá cây, kính cản. Ít phổ biến ở Việt Nam.'],
];
const ROWS = ['Tầm gần, cá nhân', 'Wi-Fi', 'Di động', 'Vệ tinh, y tế', 'Tham khảo'];
const FMIN = 3e4, FMAX = 4e10;

WL.demo('spectrum', {
  html: `<div class="demo-title"><h4>Bản đồ phổ tần</h4><span>Bấm vào một dải tần để đọc ghi chú; kéo thanh “Vùng xem” để phóng to</span></div>
  <div class="demo-body stack">
    <div class="stagebox"><canvas id="cvSpec" class="ar-wide" style="min-height:340px" role="img" aria-label="Trục tần số theo thang log từ 30 kHz tới 40 GHz, trên đó là các dải tần của sạc Qi, NFC, MedRadio, 4G, 5G, GPS, Bluetooth, Wi-Fi và Starlink."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="spZ">Vùng xem</label><output for="spZ"></output><input type="range" id="spZ" min="0" max="1" step="0.001" value="0"></div>
      <div class="techlist" id="spList">${BANDS.map((b, i) => `<button type="button" data-i="${i}">${b[0]}</button>`).join('')}</div>
      <dl class="readout" aria-live="polite"><dt>Dải tần</dt><dd class="big" id="spName">—</dd><dt>Tần số</dt><dd id="spF">—</dd></dl>
      <p class="note-s" id="spNote">Bấm một dải tần trên hình hoặc một nút ở trên.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSpec'), st = {}, list = document.getElementById('spList');
    let sel = 9, lo = Math.log10(FMIN), hi = Math.log10(FMAX), hit = [];
    // \u201cVùng xem\u201d: 0 = toàn bộ; 1 = phóng quanh 0,3–8 GHz, nơi chen chúc nhất
    const rZ = range('spZ', { show: z => z < 0.02 ? 'toàn bộ' : hz(Math.pow(10, view(z)[0]), 2) + ' – ' + hz(Math.pow(10, view(z)[1]), 2), onInput: draw });
    function view(z) { return [Math.log10(FMIN) + z * (Math.log10(3e8) - Math.log10(FMIN)), Math.log10(FMAX) + z * (Math.log10(8e9) - Math.log10(FMAX))]; }
    function pick(i) {
      sel = i; const b = BANDS[i];
      document.getElementById('spName').textContent = b[0];
      document.getElementById('spF').textContent = b[2] / b[1] < 1.01 ? hz((b[1] + b[2]) / 2, 4) : hz(b[1], 3) + ' – ' + hz(b[2], 3);
      document.getElementById('spNote').textContent = b[5];
      list.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.i === i)));
      draw();
    }
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(+b.dataset.i); });
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const h = hit.find(q => x >= q[0] - 4 && x <= q[2] + 4 && y >= q[1] && y <= q[3]);
      if (h) pick(h[4]);
    });
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st;
      [lo, hi] = view(rZ.get());
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const left = W < 520 ? 74 : Math.min(150, W * 0.26), x0 = left, x1 = W - 16, X = f => x0 + (Math.log10(f) - lo) / (hi - lo) * (x1 - x0);
      const top = 16, axisY = H - 40, rowH = (axisY - top - 10) / ROWS.length;
      // nền các hàng
      ROWS.forEach((name, i) => {
        const y = top + i * rowH;
        ctx.fillStyle = i % 2 ? '#fff' : C.mist; ctx.fillRect(0, y, W, rowH);
        ctx.fillStyle = C.muted; ctx.font = FONT(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = FONT(W < 520 ? 10.5 : 12, 600); ctx.fillText(name, 6, y + rowH / 2, left - 10);
      });
      // vạch thập phân
      ctx.font = FONT(12, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const every = X(10) - X(1) < 46 ? 2 : 1;          // màn hình hẹp: chỉ ghi nhãn cách một vạch
      for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) {
        const x = X(Math.pow(10, e));
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, axisY); ctx.stroke();
        ctx.fillStyle = C.ink; if (e % every === 0) ctx.fillText(hz(Math.pow(10, e), 2), x, axisY + 6);
        for (let m = 2; m < 10; m++) { const xm = X(m * Math.pow(10, e)); if (xm > x0 && xm < x1) { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(xm, axisY); ctx.lineTo(xm, axisY + 3); ctx.stroke(); } }
      }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, axisY); ctx.lineTo(x1, axisY); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = FONT(11.5, 500);
      ctx.fillText(W < 520 ? 'tần số (thang log)' : 'tần số (thang log: mỗi vạch đậm gấp 10 lần vạch trước)', x0, axisY + 22);
      // các dải
      hit = [];
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
      BANDS.forEach((b, i) => {
        let xa = X(b[1]), xb = X(b[2]); if (xb - xa < 5) { const m = (xa + xb) / 2; xa = m - 2.5; xb = m + 2.5; }
        const y = top + b[3] * rowH + rowH * 0.42, h = rowH * 0.46;
        ctx.fillStyle = b[4]; ctx.globalAlpha = i === sel ? 1 : 0.75; ctx.fillRect(xa, y, xb - xa, h); ctx.globalAlpha = 1;
        if (i === sel) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.strokeRect(xa - 2, y - 2, xb - xa + 4, h + 4); }
        hit.push([xa, y, xb, y + h, i]);
      });
      // nhãn: đặt phía trên dải, tránh đè lên nhau trong cùng một hàng
      ctx.font = FONT(11.5, 700); ctx.textBaseline = 'bottom'; ctx.textAlign = 'center';
      const used = ROWS.map(() => []);
      BANDS.forEach((b, i) => {
        const xa = X(b[1]), xb = X(b[2]), w = ctx.measureText(b[0]).width + 6, xm = Math.max(x0 + w / 2, Math.min(x1 - w / 2, (xa + xb) / 2));
        const y = top + b[3] * rowH + rowH * 0.42 - 2;
        if (used[b[3]].some(([a, c]) => xm - w / 2 < c && xm + w / 2 > a) && i !== sel) return;
        used[b[3]].push([xm - w / 2, xm + w / 2]);
        ctx.fillStyle = i === sel ? C.ink : C.muted; ctx.fillText(b[0], xm, y);
      });
      ctx.restore();
    }
    watchCanvas(cv, st, draw);
    rZ.upd(); pick(sel);
  },
});
})();
