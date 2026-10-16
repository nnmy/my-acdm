/* =====================================================================
   Không dây: minh họa "Sóng đi xuyên cơ thể" (id: tissue, trang 7-y-te.html)
   Nhúng vào trang: <div class="demo" id="demoTissue" data-demo="tissue"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=tissue

   Mô (cơ) coi như môi trường đồng nhất có hằng số điện môi tương đối εr và độ dẫn điện σ.
   Hệ số suy giảm biên độ:  α = ω·√(μ0·ε/2) · √( √(1 + (σ/(ω·ε))²) − 1 )   (Np/m), ε = εr·ε0
   Công suất còn lại sau quãng z:  P(z)/P0 = e^(−2αz)  ->  suy hao (dB) = 8,686 · α · z
   Bước sóng trong mô = 2π/β, β = ω·√(μ0·ε/2) · √( √(1 + (σ/(ω·ε))²) + 1 )  (≈ λ0/√εr khi mô ít dẫn điện).
   Giá trị εr, σ của cơ: làm tròn từ bộ số liệu Gabriel (1996) / IT'IS. Chỉ tính hấp thụ;
   bỏ qua phản xạ ở mặt da và phần sóng tỏa ra theo khoảng cách.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas, FONT, hz } = WL;
const MU0 = 4e-7 * Math.PI, E0 = 8.854e-12, c0 = 299792458;
// [tên, f (Hz), εr, σ (S/m), màu]
const FREQ = [
  ['13,56 MHz (NFC)', 13.56e6, 138, 0.63, '#9DA4AD'],
  ['403 MHz (MedRadio)', 403e6, 57.1, 0.80, '#2e9d4f'],
  ['915 MHz', 915e6, 55.0, 0.95, '#f2c230'],
  ['2,45 GHz (Bluetooth)', 2.45e9, 52.7, 1.74, '#3787c4'],
  ['5,8 GHz (Wi-Fi)', 5.8e9, 48.5, 4.96, '#d8312a'],
];
const alpha = ([, f, er, s]) => { const w = 2 * Math.PI * f, e = er * E0, x = s / (w * e); return w * Math.sqrt(MU0 * e / 2) * Math.sqrt(Math.sqrt(1 + x * x) - 1); };
// hệ số pha β: bước sóng trong mô = 2π / β (đúng cả khi mô dẫn điện mạnh)
const betaOf = ([, f, er, s]) => { const w = 2 * Math.PI * f, e = er * E0, x = s / (w * e); return w * Math.sqrt(MU0 * e / 2) * Math.sqrt(Math.sqrt(1 + x * x) + 1); };

WL.demo('tissue', {
  html: `<div class="demo-title"><h4>Sóng đi xuyên cơ thể</h4><span>Chọn tần số, kéo độ sâu của thiết bị cấy ghép</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvTis" class="ar" role="img" aria-label="Đồ thị phần công suất còn lại (dB) theo độ sâu trong mô cơ, mỗi tần số một đường; tần số càng cao đường càng dốc xuống."></canvas></div>
    <div class="panel">
      <div class="techlist" id="tsF">${FREQ.map((f, i) => `<button type="button" data-i="${i}">${f[0]}</button>`).join('')}</div>
      <div class="ctrl"><label for="tsD">Độ sâu trong mô cơ</label><output for="tsD"></output><input type="range" id="tsD" min="0.5" max="10" step="0.1" value="3"></div>
      <dl class="readout" aria-live="polite">
        <dt>Mất đi khi xuyên qua</dt><dd class="big" id="tsL">—</dd>
        <dt>Công suất còn lại</dt><dd id="tsR">—</dd>
        <dt>Độ sâu xuyên thấu δ = 1/α</dt><dd id="tsP">—</dd>
        <dt>Bước sóng trong mô</dt><dd id="tsW">—</dd>
      </dl>
      <p class="note-s" id="tsNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvTis'), st = {};
    let sel = 1;
    const rD = range('tsD', { show: v => num(v, 3) + ' cm', onInput: draw });
    const fl = document.getElementById('tsF');
    fl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { sel = +b.dataset.i; draw(); } });
    function draw() {
      const f = FREQ[sel], a = alpha(f), z = rD.get() / 100, L = 8.686 * a * z;
      fl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === sel)));
      document.getElementById('tsL').textContent = num(L, 3) + ' dB';
      document.getElementById('tsR').textContent = num(100 * Math.pow(10, -L / 10), 3) + ' %';
      document.getElementById('tsP').textContent = num(100 / a, 3) + ' cm';
      document.getElementById('tsW').textContent = fmt(2 * Math.PI / betaOf(f), 'm', 3) + ' (ngoài không khí ' + fmt(c0 / f[1], 'm', 3) + ')';
      document.getElementById('tsNote').textContent = sel === 1
        ? 'Ở 403 MHz sóng mất ít hơn nhiều so với 2,45 GHz, mà bước sóng trong mô chỉ cỡ 10 cm nên ăng-ten nhét vừa vỏ máy tạo nhịp. Đó là lý do dải MICS/MedRadio được chọn quanh 400 MHz.'
        : sel === 0 ? 'Tần số thấp xuyên mô rất tốt, nhưng ở đây cơ thể nằm trong vùng trường gần: thích hợp để sạc pin hoặc đọc dữ liệu bằng cuộn dây áp sát da, như NFC, chứ không phát xa được.'
        : f[1] >= 2e9 ? 'Tần số càng cao, nước trong mô hấp thụ càng mạnh (cùng lý do lò vi sóng hâm nóng được thức ăn). Thiết bị cấy sâu khó xài Bluetooth; các thiết bị đeo hoặc cấy nông dưới da thì vẫn được.'
        : 'Một tần số trung gian: suy hao vừa phải, ăng-ten nhỏ hơn so với 403 MHz.';
      if (!st.ctx) return;
      const { ctx, W, H } = st, x0 = 54, x1 = W - 16, y0 = 30, y1 = H - 42, zMax = 10, dbMin = -60;
      const X = cm => x0 + cm / zMax * (x1 - x0), Y = db => y0 + db / dbMin * (y1 - y0);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(216,49,42,.06)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.font = FONT(11.5); ctx.fillStyle = C.muted;
      for (let d = 0; d >= dbMin; d -= 10) { ctx.beginPath(); ctx.moveTo(x0, Y(d)); ctx.lineTo(x1, Y(d)); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(d).replace('-', '−') + ' dB', x0 - 6, Y(d)); }
      for (let cm = 0; cm <= zMax; cm += 2) { ctx.beginPath(); ctx.moveTo(X(cm), y0); ctx.lineTo(X(cm), y1); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(cm + ' cm', X(cm), y1 + 6); }
      ctx.fillStyle = C.ink; ctx.font = FONT(12, 600); ctx.textAlign = 'right'; ctx.fillText('độ sâu trong mô cơ', x1, y1 + 22);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(W < 520 ? 'công suất còn lại (dB)' : 'công suất còn lại so với lúc vào (dB; −10 dB = còn 1/10)', 8, 8);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
      FREQ.forEach((g, i) => {
        const aa = alpha(g); ctx.strokeStyle = g[4]; ctx.lineWidth = i === sel ? 4 : 2; ctx.globalAlpha = i === sel ? 1 : 0.55;
        ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(zMax), Y(-8.686 * aa * zMax / 100)); ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.restore();
      // nhãn cuối đường
      FREQ.forEach((g, i) => {
        const aa = alpha(g), dEnd = -8.686 * aa * zMax / 100;
        let x, y; if (dEnd >= dbMin) { x = X(zMax) - 4; y = Y(dEnd); } else { const zc = dbMin / (-8.686 * aa) * 100; x = X(zc); y = Y(dbMin) - 4; }
        ctx.fillStyle = g[4]; ctx.font = FONT(11.5, i === sel ? 700 : 500); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(hz(g[1], 3), x - 2, y - 2);
      });
      // điểm thiết bị
      const xd = X(rD.get()), yd = Y(Math.max(dbMin, -L));
      ctx.strokeStyle = C.ink; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xd, y0); ctx.lineTo(xd, y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = f[4]; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xd, yd, 7, 0, 7); ctx.fill(); ctx.stroke();
    }
    watchCanvas(cv, st, draw);
    rD.upd();
  },
});
})();
