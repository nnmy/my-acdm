/* =====================================================================
   Không dây: minh họa "Dải 2,4 GHz chật chội" (id: ism-band, trang 4-bluetooth-wifi.html)
   Nhúng vào trang: <div class="demo" id="demoIsm" data-demo="ism-band"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=ism-band

   Thác nước (waterfall): trục ngang là tần số 2400–2484 MHz, trục dọc là thời gian (mới nhất ở trên).
   - Wi-Fi: kênh n có tâm 2407 + 5n MHz, rộng 20 MHz; phát từng đợt (gói tin) ngẫu nhiên.
   - Bluetooth Classic: 79 kênh 1 MHz (2402–2480 MHz), mỗi khe 625 µs nhảy sang kênh khác (1600 lần/giây).
     AFH (nhảy tần thích nghi): bỏ qua các kênh đang bị Wi-Fi chiếm.
   - BLE: 3 kênh quảng bá 37, 38, 39 (2402, 2426, 2480 MHz) nằm giữa các kênh Wi-Fi 1, 6, 11.
   - Lò vi sóng: nhiễu rộng quanh 2440–2475 MHz, bật/tắt theo nửa chu kỳ điện lưới 50 Hz (10 ms).
   Hình được làm chậm khoảng 50 lần so với thực tế.
   ===================================================================== */
(() => {
const { COLORS: C, num, watchCanvas, loopWhenVisible, FONT } = WL;
const F0 = 2398, F1 = 2486, ROWS = 90;
const wifiCenter = ch => 2407 + 5 * ch;

WL.demo('ism-band', {
  html: `<div class="demo-title"><h4>Dải 2,4 GHz chật chội</h4><span>Chọn kênh Wi-Fi, bật lò vi sóng, xem Bluetooth né nhau ra sao</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvIsm" class="ar" role="img" aria-label="Biểu đồ thác nước: trục ngang là tần số từ 2400 đến 2484 MHz, trục dọc là thời gian. Các cột đỏ là gói tin Wi-Fi, các ô đen nhỏ là Bluetooth nhảy tần, ô đỏ đậm là lúc Bluetooth đụng Wi-Fi."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="imA">Wi-Fi nhà bạn: kênh</label><select id="imA">${Array.from({ length: 13 }, (_, i) => `<option value="${i + 1}"${i === 5 ? ' selected' : ''}>${i + 1} (tâm ${wifiCenter(i + 1)} MHz)</option>`).join('')}</select></div>
      <div class="ctrl"><label for="imB">Wi-Fi nhà hàng xóm: kênh</label><select id="imB"><option value="0">không có</option>${Array.from({ length: 13 }, (_, i) => `<option value="${i + 1}"${i === 0 ? ' selected' : ''}>${i + 1} (tâm ${wifiCenter(i + 1)} MHz)</option>`).join('')}</select></div>
      <div class="checks"><label><input type="checkbox" id="imMw"> Bật lò vi sóng</label><label><input type="checkbox" id="imAfh" checked> Bluetooth né kênh bận (AFH)</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Bluetooth đụng nhiễu</dt><dd class="big" id="imCol">—</dd>
        <dt>Kênh Bluetooth được nhảy</dt><dd id="imN">—</dd>
      </dl>
      <p class="note-s" id="imNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvIsm'), st = {};
    const sA = document.getElementById('imA'), sB = document.getElementById('imB'), cMw = document.getElementById('imMw'), cAfh = document.getElementById('imAfh');
    const rows = [];                       // mỗi hàng: { wifi: [[lo, hi], ...], mw: bool, bt: kênh MHz, hit: bool }
    let tick = 0, acc = 0, busyA = false, busyB = false, hist = [];
    const nets = () => [+sA.value, +sB.value].filter(Boolean);
    function allowed() {
      const all = Array.from({ length: 79 }, (_, i) => 2402 + i);
      if (!cAfh.checked) return all;
      const bad = f => nets().some(ch => Math.abs(f - wifiCenter(ch)) <= 11) || (cMw.checked && f >= 2440 && f <= 2475);
      const ok = all.filter(f => !bad(f));
      return ok.length >= 20 ? ok : all;   // chuẩn Bluetooth yêu cầu giữ ít nhất 20 kênh
    }
    function step() {
      tick++;
      busyA = Math.random() < (busyA ? 0.8 : 0.25); busyB = sB.value !== '0' && Math.random() < (busyB ? 0.8 : 0.25);
      const wifi = [];
      if (busyA) wifi.push([wifiCenter(+sA.value) - 10, wifiCenter(+sA.value) + 10, 0]);
      if (busyB) wifi.push([wifiCenter(+sB.value) - 10, wifiCenter(+sB.value) + 10, 1]);
      const mw = cMw.checked && (Math.floor(tick / 16) % 2 === 0);
      const al = allowed(), bt = al[Math.floor(Math.random() * al.length)];
      const hit = wifi.some(([lo, hi]) => bt >= lo && bt <= hi) || (mw && bt >= 2440 && bt <= 2475);
      rows.unshift({ wifi, mw, bt, hit }); if (rows.length > ROWS) rows.pop();
      hist.push(hit); if (hist.length > 400) hist.shift();
    }
    function stats() {
      const rate = hist.length ? hist.filter(Boolean).length / hist.length : 0;
      const el = document.getElementById('imCol'); el.textContent = num(rate * 100, 2) + ' %'; el.className = 'big ' + (rate < 0.05 ? 'ok' : 'bad');
      document.getElementById('imN').textContent = allowed().length + '/79';
      const a = +sA.value, b = +sB.value, gap = Math.abs(a - b);
      let note;
      if (b && gap > 0 && gap < 5) note = 'Hai mạng Wi-Fi chồng lấn một phần (cách nhau dưới 5 kênh): chúng không \u201cnghe\u201d ra nhau để nhường lượt, mà chỉ thấy nhiễu. Tệ hơn cả trùng kênh. Nên xài các kênh 1, 6 hoặc 11.';
      else if (b && gap === 0) note = 'Hai mạng trùng kênh: chúng nghe được nhau nên thay phiên phát (nghe trước khi nói), mỗi bên chậm đi nhưng ít lỗi.';
      else if (!cAfh.checked) note = 'Bluetooth nhảy lung tung trên cả 79 kênh, nên cứ vài lần lại đụng gói tin Wi-Fi hay sóng lò vi sóng. Gói bị hỏng sẽ phải gửi lại.';
      else note = 'Với AFH, Bluetooth đánh dấu kênh nào hay bị nhiễu rồi bỏ qua, chỉ nhảy trong các khe trống. Vì vậy tai nghe Bluetooth vẫn chạy ổn cạnh router Wi-Fi.';
      document.getElementById('imNote').textContent = note;
    }
    [sA, sB, cMw, cAfh].forEach(el => el.addEventListener('change', () => {
      hist = [];
      if (WL.REDUCED) { rows.length = 0; for (let i = 0; i < ROWS; i++) step(); draw(); }   // không chạy hình: vẽ lại một lần
      stats();
    }));
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, x0 = 22, x1 = W - 22, X = f => x0 + (f - F0) / (F1 - F0) * (x1 - x0);
      const yTop = 64, yBot = H - 30, rh = (yBot - yTop) / ROWS;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      // hàng trên cùng: bản đồ kênh
      ctx.font = FONT(11, 600); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      [1, 6, 11].forEach(ch => { ctx.strokeStyle = C.line; ctx.lineWidth = 1; const xc = X(wifiCenter(ch)); ctx.beginPath(); ctx.moveTo(X(wifiCenter(ch) - 10), 34); ctx.quadraticCurveTo(xc, 10, X(wifiCenter(ch) + 10), 34); ctx.stroke(); });
      nets().forEach((ch, i) => {
        const xc = X(wifiCenter(ch)); ctx.strokeStyle = i ? '#e07b74' : C.pos; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(wifiCenter(ch) - 10), 34); ctx.quadraticCurveTo(xc, 10, X(wifiCenter(ch) + 10), 34); ctx.stroke();
        ctx.fillStyle = i ? '#c0524b' : C.pos; ctx.fillText(W < 520 ? (i ? 'h.xóm ' : 'nhà ') + ch : (i ? 'hàng xóm' : 'nhà bạn') + ' (k.' + ch + ')', xc, 9);
      });
      [[2402, '37'], [2426, '38'], [2480, '39']].forEach(([f, n]) => { ctx.fillStyle = C.sea; ctx.fillRect(X(f) - 3, 38, 6, 10); ctx.fillText(n, X(f), 55); });
      ctx.fillStyle = C.sea; ctx.textAlign = 'left'; ctx.fillText('← kênh quảng bá BLE', X(2426) + 6, 43);
      // khung waterfall
      ctx.fillStyle = '#fff'; ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
      rows.forEach((r, i) => {
        const y = Math.round(yTop + i * rh), yh = Math.round(yTop + (i + 1) * rh) - y;   // tọa độ nguyên: các hàng khít nhau, không chồng
        if (r.mw) { ctx.fillStyle = '#f8e3a3'; ctx.fillRect(X(2440), y, X(2475) - X(2440), yh); }
        r.wifi.forEach(([lo, hi, k]) => { ctx.fillStyle = k ? 'rgba(224,123,116,.45)' : 'rgba(216,49,42,.45)'; ctx.fillRect(X(lo), y, X(hi) - X(lo), yh); });
        ctx.fillStyle = r.hit ? C.pos : C.ink; const w = Math.max(3, X(r.bt + 1) - X(r.bt)); ctx.fillRect(X(r.bt) - w / 2, y, w, Math.max(1.5, rh - 0.5));
        if (r.hit) { ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.strokeRect(X(r.bt) - w / 2 - 2, y - 1, w + 4, rh + 1); }
      });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, yTop, x1 - x0, yBot - yTop);
      ctx.fillStyle = C.ink; ctx.font = FONT(11.5, 600); ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      [2400, 2420, 2440, 2460, 2480].forEach((f, i) => ctx.fillText(W < 520 ? (i === 4 ? f + ' MHz' : String(f)) : f + ' MHz', X(f) - (W < 520 && i === 4 ? 18 : 0), yBot + 6));
      const lbl = 'mới nhất ở trên, cũ dần xuống dưới'; ctx.font = FONT(11, 600); const lw = ctx.measureText(lbl).width + 8;
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x1 - lw - 2, yTop + 2, lw, 16); ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(lbl, x1 - 6, yTop + 4);
    }
    watchCanvas(cv, st, draw);
    for (let i = 0; i < ROWS; i++) step();
    loopWhenVisible(cv, dt => {
      acc += WL.REDUCED ? 0 : dt * 32;
      let changed = false; while (acc >= 1) { acc -= 1; step(); changed = true; }
      if (changed) { draw(); if (tick % 8 === 0) stats(); }
    });
    stats(); draw();
  },
});
})();
