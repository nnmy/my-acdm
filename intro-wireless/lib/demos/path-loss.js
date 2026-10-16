/* =====================================================================
   Không dây: minh họa "Sóng yếu đi theo khoảng cách" (id: path-loss, trang 1-song-vo-tuyen.html)
   Nhúng vào trang: <div class="demo" id="demoLoss" data-demo="path-loss"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=path-loss

   Mô hình suy hao theo khoảng cách (log-distance), mốc 1 m:
     PL(d) = 20·log10(4π·1m·f/c) + 10·n·log10(d / 1m)   (dB)
   n = 2: không gian trống (đúng công thức Friis); n ≈ 3: trong nhà; n ≈ 3,5: phố xá.
   Suy hao vật cản: ước lượng thô ở 2,4 GHz, tăng dần theo tần số (nhân (f/2,4 GHz)^0,6).
   Các con số công suất, độ nhạy là giá trị tiêu biểu, đủ để so sánh chứ không để thiết kế.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas, FONT, hz, wFromDBm } = WL;
const c0 = 299792458;
// [tên, f, công suất phát + độ lợi ăng-ten (dBm), độ nhạy máy thu (dBm), d min, d max (m), d mặc định, môi trường cố định]
const TECH = [
  ['Bluetooth LE', 2.44e9, 0, -95, 0.3, 3000, 10, null],
  ['Wi-Fi 2,4 GHz', 2.44e9, 20, -82, 0.3, 3000, 15, null],
  ['Wi-Fi 5 GHz', 5.5e9, 20, -82, 0.3, 3000, 15, null],
  ['4G (trạm → điện thoại)', 1.8e9, 58, -100, 10, 50000, 800, null],
  ['GPS (vệ tinh → điện thoại)', 1.57542e9, 57, -150, 1e5, 4e7, 2.02e7, 0],
];
const ENV = [['Không gian trống', 2], ['Trong nhà', 3], ['Phố xá', 3.5]];
// [tên, suy hao ở 2,4 GHz (dB)]
const OBS = [['Tường gạch', 7], ['Tường bê tông', 13], ['Kính cửa sổ', 2], ['Cơ thể người', 5]];

WL.demo('path-loss', {
  html: `<div class="demo-title"><h4>Sóng yếu đi theo khoảng cách</h4><span>Chọn công nghệ, kéo khoảng cách, thêm vật cản</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvLoss" class="ar" role="img" aria-label="Đồ thị công suất nhận được (dBm) theo khoảng cách (thang log). Một đường ngang là độ nhạy máy thu; dưới đường đó là vùng mất kết nối."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="plT">Công nghệ</label><select id="plT">${TECH.map((t, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${t[0]}</option>`).join('')}</select></div>
      <div class="ctrl"><label for="plE">Môi trường</label><select id="plE">${ENV.map((e, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${e[0]} (n = ${num(e[1], 2)})</option>`).join('')}</select></div>
      <div class="ctrl"><label for="plD">Khoảng cách d</label><output for="plD"></output><input type="range" id="plD" min="0" max="1" step="0.001" value="0.5"></div>
      <div class="checks" id="plO">${OBS.map((o, i) => `<label><input type="checkbox" data-i="${i}"> ${o[0]}</label>`).join('')}</div>
      <dl class="readout" aria-live="polite">
        <dt>Suy hao đường truyền</dt><dd id="plPL">—</dd>
        <dt>Công suất nhận</dt><dd class="big" id="plPr">—</dd>
        <dt>Tức là</dt><dd id="plW">—</dd>
        <dt>Dư so với độ nhạy</dt><dd id="plM">—</dd>
      </dl>
      <p class="note-s" id="plNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvLoss'), st = {}, selT = document.getElementById('plT'), selE = document.getElementById('plE');
    let t = TECH[1];
    const dOf = v => Math.pow(10, Math.log10(t[4]) + v * (Math.log10(t[5]) - Math.log10(t[4])));
    const vOf = d => (Math.log10(d) - Math.log10(t[4])) / (Math.log10(t[5]) - Math.log10(t[4]));
    const rD = range('plD', { map: dOf, show: d => fmt(d, 'm', 3), onInput: draw });
    const nOf = () => ENV[t[7] !== null ? t[7] : +selE.value][1];
    const obsLoss = () => [...document.querySelectorAll('#plO input:checked')].reduce((s, el) => s + OBS[+el.dataset.i][1] * Math.pow(t[1] / 2.44e9, 0.6), 0);
    const pl = d => 20 * Math.log10(4 * Math.PI * 1 * t[1] / c0) + 10 * nOf() * Math.log10(d) + obsLoss();
    selT.addEventListener('change', () => {
      t = TECH[+selT.value]; selE.disabled = t[7] !== null;
      if (t[7] !== null) selE.value = String(t[7]);
      rD.set(vOf(t[6]));
    });
    selE.addEventListener('change', draw);
    document.getElementById('plO').addEventListener('change', draw);
    const set = (id, v, cls) => { const el = document.getElementById(id); el.textContent = v; if (cls !== undefined) el.className = cls; };
    function draw() {
      const d = rD.get(), L = pl(d), pr = t[2] - L, m = pr - t[3];
      set('plPL', num(L, 3) + ' dB');
      set('plPr', num(pr, 3) + ' dBm', 'big ' + (m >= 0 ? 'ok' : 'bad'));
      set('plW', fmt(wFromDBm(pr), 'W', 2));
      set('plM', (m >= 0 ? '+' : '') + num(m, 3) + ' dB', m >= 10 ? 'ok' : m >= 0 ? '' : 'bad');
      set('plNote', t[7] !== null
        ? 'Tín hiệu GPS tới mặt đất còn yếu hơn cả tiếng ồn nền. Máy thu vẫn bắt được nhờ biết trước \u201cmã\u201d của từng vệ tinh và cộng dồn tín hiệu trong thời gian dài (phần 6).'
        : m < 0 ? 'Công suất nhận thấp hơn độ nhạy máy thu: mất kết nối. Thử lại gần hơn hoặc bỏ bớt vật cản.'
        : m < 10 ? 'Còn kết nối nhưng sát ngưỡng: tốc độ sẽ phải hạ xuống để bớt lỗi (phần 2).'
        : 'Dư nhiều so với ngưỡng: kết nối ổn, thiết bị có thể xài kiểu điều chế nhanh hơn.');
      if (!st.ctx) return;
      const { ctx, W, H } = st;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 58, x1 = W - 18, y0 = 18, y1 = H - 44;
      const lmin = Math.log10(t[4]), lmax = Math.log10(t[5]);
      const prOf = dd => t[2] - pl(dd);
      const top = Math.ceil((prOf(t[4]) + 5) / 10) * 10, bot = Math.floor((Math.min(t[3], prOf(t[5])) - 10) / 10) * 10;
      const X = dd => x0 + (Math.log10(dd) - lmin) / (lmax - lmin) * (x1 - x0), Y = p => y0 + (top - p) / (top - bot) * (y1 - y0);
      // vùng mất kết nối
      ctx.fillStyle = 'rgba(216,49,42,.08)'; ctx.fillRect(x0, Y(t[3]), x1 - x0, y1 - Y(t[3]));
      // lưới
      ctx.font = FONT(11.5); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted;
      const step = (top - bot) > 120 ? 20 : 10;
      for (let p = Math.floor(top / step) * step; p >= bot; p -= step) { ctx.beginPath(); ctx.moveTo(x0, Y(p)); ctx.lineTo(x1, Y(p)); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(p).replace('-', '−'), x0 - 6, Y(p)); }
      for (let e = Math.ceil(lmin); e <= Math.floor(lmax); e++) { const x = X(Math.pow(10, e)); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(fmt(Math.pow(10, e), 'm', 2), x, y1 + 6); }
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = FONT(12, 600);
      ctx.fillText('công suất nhận (dBm)', x0 + 4, y0 + 2);
      ctx.textAlign = 'right'; ctx.fillText('khoảng cách (thang log)', x1, y1 + 22);
      // ngưỡng
      ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x0, Y(t[3])); ctx.lineTo(x1, Y(t[3])); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.pos; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('độ nhạy máy thu ' + String(t[3]).replace('-', '−') + ' dBm', x1 - 4, Y(t[3]) - 3);
      ctx.textBaseline = 'top'; ctx.fillText('mất kết nối', x1 - 4, Y(t[3]) + 4);
      // đường cong
      ctx.strokeStyle = C.sea; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const dd = Math.pow(10, lmin + i / 200 * (lmax - lmin)), x = X(dd), y = Y(prOf(dd)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // điểm hiện tại
      const xd = X(d), yd = Y(pr);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xd, y1); ctx.lineTo(xd, yd); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = m >= 0 ? C.sea : C.pos; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xd, yd, 7, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = FONT(12, 700); ctx.textAlign = xd > W * 0.7 ? 'right' : 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(num(pr, 3) + ' dBm', xd + (xd > W * 0.7 ? -10 : 10), yd - 6);
      ctx.font = FONT(11.5); ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(hz(t[1], 3) + ' · mỗi lần xa gấp đôi: mất thêm ' + num(3.01 * nOf(), 2) + ' dB', x0 + 4, y1 - 4);
    }
    watchCanvas(cv, st, draw);
    rD.set(vOf(t[6]));
  },
});
})();
