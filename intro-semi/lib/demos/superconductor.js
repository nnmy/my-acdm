/* =====================================================================
   Bán dẫn: minh họa "Siêu dẫn: điện trở bằng 0 và hiệu ứng Meissner" (id: superconductor, trang sieu-dan.html)
   Nhúng vào trang: <div class="demo" id="demoSc" data-demo="superconductor"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=superconductor

   - Trái: điện trở (tương đối) theo nhiệt độ. Trên T_c: R tăng gần tuyến tính theo T (vẽ minh họa, không theo số đo
     của từng vật liệu); dưới T_c: R = 0. Đường đứng: nhiệt độ sôi của heli lỏng (4,2 K) và nitơ lỏng (77 K).
   - Phải: mẫu vật đặt trong từ trường đều. Trên T_c: đường sức đi xuyên qua. Dưới T_c: đường sức bị đẩy ra ngoài
     (hiệu ứng Meissner), một nam châm nhỏ đặt phía trên lơ lửng.
   - T_c lấy từ tài liệu (làm tròn): Hg 4,15 K; Pb 7,2 K; Nb 9,3 K; NbTi ≈ 9,5 K; Nb3Sn ≈ 18 K; MgB2 39 K;
     YBCO (YBa2Cu3O7) 92 K; Bi-2223 ≈ 110 K; đồng (Cu) không siêu dẫn.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = SEMI;
const MATS = [
  ['Đồng (Cu)', 0, 'Kim loại thường: lạnh tới đâu vẫn còn một điện trở dư nhỏ, không bao giờ về 0.'],
  ['Thủy ngân (Hg)', 4.15, 'Chất siêu dẫn đầu tiên được phát hiện (Onnes, 1911). Cần heli lỏng.'],
  ['Chì (Pb)', 7.2, 'Siêu dẫn loại I: đẩy hoàn toàn từ trường cho tới một từ trường tới hạn khá thấp.'],
  ['Niobi (Nb)', 9.3, 'Kim loại nguyên tố có T_c cao nhất ở áp suất thường; dùng trong hốc cộng hưởng của máy gia tốc.'],
  ['NbTi', 9.5, 'Hợp kim dễ kéo sợi: dây quấn nam châm MRI và máy gia tốc LHC.'],
  ['Nb₃Sn', 18, 'Chịu được từ trường mạnh hơn NbTi: nam châm của lò phản ứng nhiệt hạch ITER.'],
  ['MgB₂', 39, 'Phát hiện năm 2001; rẻ, nhẹ, làm lạnh bằng máy lạnh khép kín không cần heli lỏng.'],
  ['YBCO', 92, 'Siêu dẫn nhiệt độ cao (1987), T_c vượt mốc 77 K của nitơ lỏng.'],
  ['Bi-2223', 110, 'Gốm siêu dẫn nhiệt độ cao, làm băng dẫn cho cáp điện siêu dẫn.'],
];
const TMAX = 130;

SEMI.demo('superconductor', {
  domId: 'demoSc',
  title: 'Siêu dẫn: điện trở bằng 0 và hiệu ứng Meissner',
  page: 'sieu-dan.html',
  html: `<div class="demo-title"><h4>Điện trở bằng 0 và hiệu ứng Meissner</h4><span>Chọn vật liệu, kéo nhiệt độ</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvSc" class="ar" role="img" aria-label="Bên trái: đồ thị điện trở theo nhiệt độ, điện trở tụt về 0 dưới nhiệt độ tới hạn. Bên phải: mẫu vật trong từ trường; dưới nhiệt độ tới hạn các đường sức bị đẩy ra ngoài và một nam châm nhỏ lơ lửng phía trên."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="scMat">Vật liệu</label><select id="scMat">${MATS.map((m, i) => `<option value="${i}"${i === 7 ? ' selected' : ''}>${m[0]}${m[1] ? ': T_c ≈ ' + num(m[1], 3) + ' K' : ''}</option>`).join('')}</select></div>
      <div class="ctrl"><label for="scT">Nhiệt độ T</label><output for="scT"></output><input type="range" id="scT" min="1" max="${TMAX}" step="0.5" value="77"></div>
      <div class="btnrow"><button type="button" class="btn" data-sct="4.2">Heli lỏng 4,2 K</button><button type="button" class="btn" data-sct="77">Nitơ lỏng 77 K</button><button type="button" class="btn" data-sct="120">120 K</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Trạng thái</dt><dd class="big" id="scState">—</dd>
        <dt>Điện trở</dt><dd id="scR">—</dd>
        <dt>Từ trường bên trong</dt><dd id="scB">—</dd>
      </dl>
      <p class="note-s" id="scNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvSc'), st = {}, sel = document.getElementById('scMat');
    const rT = range('scT', { show: v => num(v, 3) + ' K', onInput: () => upd() });
    sel.addEventListener('change', () => upd());
    document.querySelectorAll('[data-sct]').forEach(b => b.addEventListener('click', () => rT.set(+b.dataset.sct)));
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    const mat = () => MATS[+sel.value];
    const rel = (T, Tc) => Tc && T < Tc ? 0 : (Tc ? 0.06 : 0.03) + 0.94 * T / TMAX;   // điện trở tương đối (minh họa)
    let lev = 0;   // độ cao nam châm (0..1), chạy mượt
    function upd() {
      const [name, Tc, note] = mat(), T = rT.get(), sc = Tc > 0 && T < Tc;
      set('scState', sc ? 'siêu dẫn' : 'thường');
      set('scR', sc ? '0 (đúng bằng 0)' : 'khác 0');
      set('scB', sc ? '≈ 0 (bị đẩy ra ngoài)' : 'bằng từ trường bên ngoài');
      set('scNote', note + (Tc ? (Tc > 77 ? ' Siêu dẫn được khi ngâm trong nitơ lỏng, rẻ hơn heli rất nhiều.' : ' Cần làm lạnh dưới ' + num(Tc, 3) + ' K, thường bằng heli lỏng hoặc máy lạnh.') : ''));
      draw();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, [name, Tc] = mat(), T = rT.get(), sc = Tc > 0 && T < Tc;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      // ---- đồ thị R(T) ----
      const x0 = 46, x1 = W * 0.52, y0 = 28, y1 = H - 36, px = t => x0 + t / TMAX * (x1 - x0), py = r => y1 - r * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0 - 6); ctx.lineTo(x0, y1); ctx.lineTo(x1 + 6, y1); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 25, 50, 75, 100, 125].forEach(t => ctx.fillText(t, px(t), y1 + 4));
      ctx.fillText('nhiệt độ (K)', (x0 + x1) / 2, y1 + 18);
      ctx.save(); ctx.translate(14, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('điện trở', 0, -6); ctx.restore();
      [[4.2, 'He lỏng'], [77, 'N₂ lỏng']].forEach(([t, l]) => {
        ctx.strokeStyle = 'rgba(55,135,196,.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px(t), y0); ctx.lineTo(px(t), y1); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.sea; ctx.textAlign = 'left'; ctx.fillText(l, px(t) + 3, y0);
      });
      ctx.strokeStyle = C.pos; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k = 0; k <= 400; k++) { const t = TMAX * k / 400, x = px(t), y = py(rel(t, Tc)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      if (Tc) { ctx.fillStyle = C.pos; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('T_c', px(Tc) - 5, (py(0) + py(rel(Tc + 0.01, Tc))) / 2); ctx.textBaseline = 'top'; }
      ctx.fillStyle = C.gold; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px(T), py(rel(T, Tc)), 6, 0, 7); ctx.fill(); ctx.stroke();
      // ---- mẫu vật trong từ trường ----
      const cx = W * 0.77, cy = H * 0.62, rw = Math.min(W * 0.11, 90), rh = rw * 0.5, top = 22, bot = H - 14;
      ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(55,135,196,.75)';
      const N = 9, span = W * 0.4;
      for (let i = 0; i < N; i++) {
        const xi = cx - span / 2 + span * (i + 0.5) / N, d = (xi - cx) / rw;
        ctx.beginPath();
        for (let k = 0; k <= 60; k++) {
          const y = top + (bot - top) * k / 60, u = (y - cy) / (rh * 1.6);
          let x = xi;
          if (sc) { const push = Math.exp(-u * u) * (Math.abs(d) < 1.25 ? (1.25 - Math.abs(d)) * rw * 0.95 : 0) * Math.sign(d || (i < N / 2 ? -1 : 1)); x = xi + push; }
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      // mẫu vật
      ctx.fillStyle = sc ? '#cfe9f5' : '#e3e5e8'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name.split(' ')[0], cx, cy);
      if (sc) { ctx.fillStyle = 'rgba(123,205,232,.35)'; for (let k = 0; k < 6; k++) ctx.fillRect(cx - rw * 0.9 + k * rw * 0.33, cy + rh + 4 + (k % 2) * 3, 10, 3); }
      // nam châm nhỏ
      const target = sc ? 1 : 0; lev += (target - lev) * 0.25;
      const my = cy - rh - 10 - lev * rh * 1.3, mw = rw * 0.55, mh = 14;
      ctx.fillStyle = C.pos; ctx.fillRect(cx - mw / 2, my - mh, mw / 2, mh); ctx.fillStyle = C.neg; ctx.fillRect(cx, my - mh, mw / 2, mh);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(cx - mw / 2, my - mh, mw, mh);
      ctx.fillStyle = '#fff'; ctx.font = '700 10px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText('N', cx - mw / 4, my - mh / 2); ctx.fillText('S', cx + mw / 4, my - mh / 2);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textBaseline = 'top';
      ctx.fillText(sc ? 'từ trường bị đẩy ra, nam châm lơ lửng' : 'từ trường đi xuyên qua', cx, 4);
      if (Math.abs(target - lev) > 0.01) requestAnimationFrame(draw);
    }
    watchCanvas(cv, st, draw);
    upd();
  },
});
})();
