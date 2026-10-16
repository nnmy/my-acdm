/* =====================================================================
   Không dây: minh họa "Gắn bit lên sóng mang" (id: modulation, trang 2-dieu-che.html)
   Nhúng vào trang: <div class="demo" id="demoMod" data-demo="modulation"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=modulation

   Ba kiểu điều chế cơ bản trên cùng một chuỗi bit:
     ASK: bit 1 = biên độ lớn, bit 0 = biên độ nhỏ
     FSK: bit 1 = tần số cao, bit 0 = tần số thấp (pha liên tục, không bị giật)
     PSK: bit 1 = pha 0°, bit 0 = pha 180° (sóng bị lật ngược)
   ===================================================================== */
(() => {
const { COLORS: C, watchCanvas, loopWhenVisible, FONT } = WL;
const KINDS = [
  ['ASK', 'Điều biên (ASK)', 'Bit 1 thì sóng lớn, bit 0 thì sóng nhỏ. Dễ làm nhất, nhưng nhiễu cũng làm thay đổi biên độ nên dễ đọc sai. Thẻ NFC trả lời đầu đọc theo kiểu gần giống vầy.'],
  ['FSK', 'Điều tần (FSK)', 'Bit 1 thì sóng dày (tần số cao), bit 0 thì sóng thưa. Biên độ giữ nguyên nên ít bị nhiễu ảnh hưởng. Bluetooth xài một biến thể của kiểu này (GFSK).'],
  ['PSK', 'Điều pha (PSK)', 'Tần số và biên độ y nguyên, chỉ có pha đổi: bit 0 thì sóng bị lật ngược 180°. Kiểu này bền nhất với nhiễu, là nền của QAM ở Wi-Fi và 4G.'],
];
const CYC = 3;   // số chu kỳ sóng mang trong một bit

WL.demo('modulation', {
  html: `<div class="demo-title"><h4>Gắn bit lên sóng mang</h4><span>Bấm vô từng bit để đổi 0/1, chọn kiểu điều chế</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvMod" class="ar" role="img" aria-label="Ba đồ thị chồng lên nhau: chuỗi bit dạng bậc thang, sóng mang hình sin, và sóng sau khi điều chế."></canvas></div>
    <div class="panel">
      <div><b style="font-size:15px">Chuỗi bit</b><div class="bitrow" id="mdBits" style="margin-top:6px"></div></div>
      <div class="seg-btns" id="mdKind">${KINDS.map((k, i) => `<button type="button" class="btn" data-i="${i}">${k[1]}</button>`).join('')}</div>
      <div class="btnrow"><button type="button" class="btn" id="mdRand">Bit ngẫu nhiên</button></div>
      <p class="note-s" id="mdNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvMod'), st = {};
    let bits = [1, 0, 1, 1, 0, 0, 1, 0], kind = 0, scan = 0;
    const bx = document.getElementById('mdBits');
    function drawBits() {
      bx.innerHTML = bits.map((b, i) => `<button type="button" data-i="${i}" class="${b ? 'on' : ''}" aria-label="Bit ${i + 1}: ${b}">${b}</button>`).join('');
    }
    bx.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; bits[+b.dataset.i] ^= 1; drawBits(); draw(); });
    document.getElementById('mdRand').addEventListener('click', () => { bits = bits.map(() => Math.random() < 0.5 ? 1 : 0); drawBits(); draw(); });
    const kb = document.getElementById('mdKind');
    kb.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; kind = +b.dataset.i; sync(); });
    function sync() {
      kb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === kind)));
      document.getElementById('mdNote').textContent = KINDS[kind][2]; draw();
    }
    // tín hiệu tại vị trí u (đơn vị: bit, 0..N)
    function sig(u) {
      const i = Math.min(bits.length - 1, Math.floor(u)), b = bits[i];
      if (kind === 0) return (b ? 1 : 0.25) * Math.sin(2 * Math.PI * CYC * u);
      if (kind === 2) return (b ? 1 : -1) * Math.sin(2 * Math.PI * CYC * u);
      // FSK pha liên tục: cộng dồn pha qua các bit trước
      let ph = 0; for (let k = 0; k < i; k++) ph += 2 * Math.PI * (bits[k] ? CYC + 1 : CYC - 1);
      return Math.sin(ph + 2 * Math.PI * (b ? CYC + 1 : CYC - 1) * (u - i));
    }
    function lane(ctx, y, h, label, f, x0, x1, N, col, bitsStep) {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = FONT(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, x0, y - h - 4);
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
      const n = bitsStep ? N * 2 : 900;
      if (bitsStep) {
        bits.forEach((b, i) => { const xa = x0 + i / N * (x1 - x0), xb = x0 + (i + 1) / N * (x1 - x0), yy = y - (b ? h : 0) + (b ? 0 : 0); if (i === 0) ctx.moveTo(xa, yy); else ctx.lineTo(xa, yy); ctx.lineTo(xb, yy); });
      } else for (let k = 0; k <= n; k++) { const u = k / n * N, x = x0 + u / N * (x1 - x0), yy = y - h * f(u); k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, N = bits.length, x0 = 18, x1 = W - 18;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      // vạch chia bit
      for (let i = 0; i <= N; i++) { const x = x0 + i / N * (x1 - x0); ctx.strokeStyle = i % N ? C.line : C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - 8); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.font = FONT(14, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink;
      bits.forEach((b, i) => ctx.fillText(b, x0 + (i + 0.5) / N * (x1 - x0), 12));
      const hh = Math.min(28, H * 0.075);
      lane(ctx, H * 0.24, hh, 'Dữ liệu (bit)', null, x0, x1, N, C.ink, true);
      lane(ctx, H * 0.52, hh, 'Sóng mang (chưa có dữ liệu)', u => Math.sin(2 * Math.PI * CYC * u), x0, x1, N, C.muted, false);
      lane(ctx, H * 0.84, hh * 1.6, 'Sóng sau khi điều chế: ' + KINDS[kind][1], sig, x0, x1, N, C.sea, false);
      // vạch quét: bit đang phát
      if (!WL.REDUCED) { const x = x0 + scan / N * (x1 - x0); ctx.fillStyle = 'rgba(123,205,232,.22)'; const i = Math.floor(scan); ctx.fillRect(x0 + i / N * (x1 - x0), 30, (x1 - x0) / N, H - 38); }
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => { if (WL.REDUCED) return; const old = Math.floor(scan); scan = (scan + dt * 1.2) % bits.length; if (Math.floor(scan) !== old) draw(); });
    drawBits(); sync();
  },
});
})();
