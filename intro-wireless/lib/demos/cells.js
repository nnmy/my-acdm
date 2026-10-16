/* =====================================================================
   Không dây: minh họa "Ô mạng di động và chuyển vùng" (id: cells, trang 5-di-dong.html)
   Nhúng vào trang: <div class="demo" id="demoCells" data-demo="cells"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=cells

   19 trạm xếp lưới lục giác, cách nhau 1 km. Mỗi trạm phát 43 dBm (20 W).
   Suy hao kiểu đô thị (mô hình 3GPP ở ~2 GHz): PL = 128,1 + 37,6·log10(d / 1 km)  (dB).
   SINR = tín hiệu trạm đang phục vụ / (nhiễu từ các trạm CÙNG tần số + nhiễu nhiệt).
   Nhiễu nhiệt trong 20 MHz, máy thu NF = 7 dB: −174 + 73 + 7 = −94 dBm.
   Tốc độ ước lượng: 0,6 · B · log2(1 + SINR), trần 5,5 bit/s/Hz (≈ giới hạn 64-QAM có mã sửa lỗi).
   Chuyển vùng (handover): đổi trạm khi trạm khác mạnh hơn trạm hiện tại ít nhất 3 dB.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, watchCanvas, loopWhenVisible, FONT, unDB, dB } = WL;
const ISD = 1, PT = 43, NOISE20 = -94, HYST = 3;
const TINT = ['#3787c4', '#d8312a', '#2e9d4f'];
const SITES = [];
for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) SITES.push({ q, r, x: ISD * (q + r / 2), y: ISD * Math.sqrt(3) / 2 * r, col: (((q - r) % 3) + 3) % 3 });

WL.demo('cells', {
  html: `<div class="demo-title"><h4>Ô mạng di động và chuyển vùng</h4><span>Kéo cái điện thoại, hoặc bấm \u201cĐi bộ\u201d</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCells" class="ar grab" role="img" aria-label="Bản đồ 19 trạm phát sóng xếp thành lưới tổ ong. Một điện thoại có thể kéo đi khắp nơi; đường nối cho biết trạm đang phục vụ, nền tô màu theo chất lượng tín hiệu."></canvas></div>
    <div class="panel">
      <div class="seg-btns" id="clR"><button type="button" class="btn" data-r="1">Mọi trạm chung tần số</button><button type="button" class="btn" data-r="3">Chia 3 nhóm tần số</button></div>
      <div class="btnrow"><button type="button" class="btn" id="clWalk" aria-pressed="false">Đi bộ</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Trạm đang phục vụ</dt><dd id="clS">—</dd>
        <dt>Tín hiệu nhận</dt><dd id="clP">—</dd>
        <dt>SINR</dt><dd id="clI">—</dd>
        <dt>Tốc độ ước lượng</dt><dd class="big" id="clT">—</dd>
        <dt>Số lần chuyển vùng</dt><dd id="clH">0</dd>
      </dl>
      <p class="note-s" id="clNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvCells'), st = {};
    let reuse = 1, phone = { x: 0.35, y: 0.1 }, serving = null, hand = 0, flash = 0, walk = false, wt = 0, map = null, view = null;
    const rb = document.getElementById('clR');
    rb.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; reuse = +b.dataset.r; map = null; sync(); });
    const wb = document.getElementById('clWalk');
    wb.addEventListener('click', () => { walk = !walk; wb.setAttribute('aria-pressed', String(walk)); wb.textContent = walk ? 'Dừng lại' : 'Đi bộ'; });
    const rx = (s, x, y) => PT - (128.1 + 37.6 * Math.log10(Math.max(0.035, Math.hypot(x - s.x, y - s.y)) / 1));
    function evalAt(x, y, cur) {
      const p = SITES.map(s => rx(s, x, y));
      let best = 0; p.forEach((v, i) => { if (v > p[best]) best = i; });
      let sv = cur === null || cur === undefined ? best : cur;
      if (p[best] > p[sv] + HYST) sv = best;
      const B = reuse === 1 ? 20e6 : 20e6 / 3, noise = NOISE20 + dB(B / 20e6);
      let I = unDB(noise);
      SITES.forEach((s, i) => { if (i !== sv && (reuse === 1 || s.col === SITES[sv].col)) I += unDB(p[i]); });
      const sinr = p[sv] - dB(I), se = Math.min(5.5, Math.log2(1 + unDB(sinr)));
      return { sv, p: p[sv], sinr, rate: 0.6 * B * se, best };
    }
    function sync() {
      rb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.r === reuse)));
      update(); draw();
    }
    function update() {
      const r = evalAt(phone.x, phone.y, serving);
      if (serving !== null && r.sv !== serving) { hand++; flash = 1; }
      serving = r.sv;
      const s = SITES[r.sv];
      document.getElementById('clS').textContent = 'trạm ' + (SITES.indexOf(s) + 1) + (reuse === 3 ? ' (nhóm ' + 'ABC'[s.col] + ')' : '');
      document.getElementById('clP').textContent = num(r.p, 3) + ' dBm';
      const iEl = document.getElementById('clI'); iEl.textContent = num(r.sinr, 3) + ' dB'; iEl.className = r.sinr > 10 ? 'ok' : r.sinr < 0 ? 'bad' : '';
      document.getElementById('clT').textContent = fmt(r.rate, 'bit/s', 3);
      document.getElementById('clH').textContent = hand;
      const dist = Math.hypot(phone.x - s.x, phone.y - s.y);
      document.getElementById('clNote').textContent = reuse === 1
        ? (dist > 0.4 ? 'Ở rìa ô, tín hiệu trạm mình yếu mà trạm bên cạnh (cùng tần số) lại mạnh: nhiễu lấn tín hiệu, SINR tụt, tốc độ giảm mạnh. Các nhà mạng 4G khắc phục bằng cách cho trạm phối hợp lịch phát với nhau.'
          : 'Gần trạm, tín hiệu mạnh át hẳn nhiễu. Cả 20 MHz băng thông dành hết cho mỗi ô, nên tốc độ cao.')
        : 'Mỗi ô chỉ xài 1/3 băng thông, các ô sát nhau khác tần số nên ít nhiễu: rìa ô dễ thở hơn, nhưng tốc độ gần trạm chỉ còn cỡ 1/3. Mạng 2G ngày xưa làm kiểu này; 4G thường cho mọi ô xài chung tần số.';
    }
    function buildMap(W, H) {
      const cell = 8, img = [];
      for (let py = 0; py < H; py += cell) for (let px = 0; px < W; px += cell) {
        const [x, y] = view.inv(px + cell / 2, py + cell / 2), r = evalAt(x, y, null);
        const q = Math.max(0, Math.min(1, (r.sinr + 5) / 30));
        img.push([px, py, reuse === 1 ? 0 : SITES[r.best].col, q]);
      }
      return { W, H, cell, img };
    }
    function draw() {
      if (!st.ctx || serving === null) return;
      const { ctx, W, H } = st, span = 2.6, sc = Math.min(W, H) / (2 * span);
      view = { X: x => W / 2 + x * sc, Y: y => H / 2 - y * sc, inv: (px, py) => [(px - W / 2) / sc, (H / 2 - py) / sc] };
      if (!map || map.W !== W || map.H !== H) map = buildMap(W, H);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      map.img.forEach(([px, py, col, q]) => { ctx.fillStyle = TINT[col]; ctx.globalAlpha = 0.08 + 0.42 * q; ctx.fillRect(px, py, map.cell, map.cell); });
      ctx.globalAlpha = 1;
      // trạm
      SITES.forEach((s, i) => {
        const x = view.X(s.x), y = view.Y(s.y);
        // cột ăng-ten hình tháp + hai vạch sóng
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath();
        ctx.moveTo(x, y - 9); ctx.lineTo(x - 6, y + 11); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y + 11);
        ctx.moveTo(x - 3.5, y + 3); ctx.lineTo(x + 3.5, y + 3); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y - 3); ctx.stroke();
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 9, 6, -2.4, -0.74); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - 9, 10, -2.4, -0.74); ctx.stroke();
        ctx.fillStyle = reuse === 3 ? TINT[s.col] : C.ink; ctx.beginPath(); ctx.arc(x, y - 9, 3, 0, 7); ctx.fill();
        if (i === serving) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke(); }
      });
      // điện thoại + đường nối
      const px = view.X(phone.x), py = view.Y(phone.y), s = SITES[serving];
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(view.X(s.x), view.Y(s.y)); ctx.stroke(); ctx.setLineDash([]);
      if (flash > 0) { ctx.strokeStyle = `rgba(242,194,48,${flash})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(px, py, 26 - 10 * flash, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(px - 7, py - 12, 14, 24); ctx.strokeRect(px - 7, py - 12, 14, 24);
      ctx.fillStyle = C.sky; ctx.fillRect(px - 5, py - 9, 10, 15);
      // thước
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, H - 14); ctx.lineTo(12 + sc, H - 14); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = FONT(11.5, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('1 km', 12, H - 18);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText('nền đậm = SINR cao (sóng sạch)', W - 10, H - 8);
    }
    let drag = false;
    const pos = e => { const r = cv.getBoundingClientRect(); return view.inv(e.clientX - r.left, e.clientY - r.top); };
    cv.addEventListener('pointerdown', e => { if (!view) return; drag = true; cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); [phone.x, phone.y] = pos(e); update(); draw(); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = pos(e); phone.x = Math.max(-2.5, Math.min(2.5, x)); phone.y = Math.max(-2.5, Math.min(2.5, y)); update(); draw(); });
    const up = () => { drag = false; cv.classList.remove('grabbing'); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    watchCanvas(cv, st, () => { map = null; draw(); });
    loopWhenVisible(cv, dt => {
      let dirty = false;
      if (flash > 0) { flash = Math.max(0, flash - dt * 1.5); dirty = true; }
      if (walk && !drag) { wt += dt * 0.12; phone.x = 2 * Math.cos(wt * 1.3); phone.y = 1.6 * Math.sin(wt * 2.1); update(); dirty = true; }
      if (dirty) draw();
    });
    sync();
  },
});
})();
