/* =====================================================================
   Không dây: minh họa "Quỹ đạo thấp, trung bình, địa tĩnh" (id: orbits, trang 6-ve-tinh.html)
   Nhúng vào trang: <div class="demo" id="demoOrbits" data-demo="orbits"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=orbits

   Vẽ đúng tỉ lệ bán kính. Quỹ đạo tròn, nằm trong mặt phẳng xích đạo (đơn giản hóa).
     Chu kỳ  T = 2π·√(r³ / GM),  tốc độ v = √(GM / r),  r = R + h
     Độ trễ tối thiểu một lượt hỏi–đáp đi qua vệ tinh (người dùng ↔ vệ tinh ↔ trạm mặt đất, hai chiều): 4h / c
     Vùng nhìn thấy vệ tinh với góc ngẩng tối thiểu ε: góc tâm λ = arccos(R/r · cos ε) − ε
     Số vệ tinh tối thiểu (lý thuyết) để phủ kín: N ≈ 2 / (1 − cos λ)  (diện tích Trái Đất / diện tích một vùng phủ)
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, watchCanvas, loopWhenVisible, FONT } = WL;
const R = 6371e3, GM = 3.986004418e14, c0 = 299792458, DAY = 86164;
const ORB = [
  { key: 'leo', name: 'Quỹ đạo thấp (Starlink)', h: 550e3, eps: 25, col: '#f08a24', n: 12, note: 'Gần mặt đất nên độ trễ chỉ vài chục mili giây, gần bằng cáp quang. Đổi lại mỗi vệ tinh chỉ phủ một vùng nhỏ và vụt qua đầu trong vài phút, nên cần cả ngàn vệ tinh nối tiếp nhau.' },
  { key: 'meo', name: 'Quỹ đạo trung bình (GPS)', h: 20200e3, eps: 10, col: '#7b4fc4', n: 6, note: 'Cao vừa phải: mỗi vệ tinh thấy được gần nửa Trái Đất và ở trên trời vài tiếng, nên khoảng 30 vệ tinh GPS là đủ để đâu đâu cũng thấy ít nhất 4 cái.' },
  { key: 'geo', name: 'Quỹ đạo địa tĩnh (GEO)', h: 35786e3, eps: 10, col: '#3787c4', n: 3, note: 'Bay một vòng đúng bằng thời gian Trái Đất tự quay, nên đứng yên trên trời: chảo thu không cần xoay. Nhưng xa quá, mỗi lượt hỏi–đáp mất hơn nửa giây, gọi video thấy rõ độ trễ.' },
];

WL.demo('orbits', {
  html: `<div class="demo-title"><h4>Quỹ đạo thấp, trung bình, địa tĩnh</h4><span>Chọn một loại quỹ đạo; hình vẽ đúng tỉ lệ khoảng cách</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvOrb" class="ar" role="img" aria-label="Trái Đất và ba quỹ đạo vẽ đúng tỉ lệ: quỹ đạo thấp sát mặt đất, quỹ đạo GPS và quỹ đạo địa tĩnh xa gấp nhiều lần bán kính Trái Đất. Các vệ tinh bay quanh, vùng phủ sóng được tô màu."></canvas></div>
    <div class="panel">
      <div class="seg-btns" id="obK">${ORB.map((o, i) => `<button type="button" class="btn" data-i="${i}">${o.name}</button>`).join('')}</div>
      <div class="checks"><label><input type="checkbox" id="obZ"> Phóng to vừa quỹ đạo đang chọn</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Độ cao</dt><dd id="obH">—</dd>
        <dt>Bay một vòng mất</dt><dd id="obT">—</dd>
        <dt>Tốc độ bay</dt><dd id="obV">—</dd>
        <dt>Sóng bay một lượt hỏi–đáp</dt><dd class="big" id="obL">—</dd>
        <dt>Thấy một vệ tinh trong</dt><dd id="obP">—</dd>
        <dt>Phủ kín cần ít nhất (lý thuyết)</dt><dd id="obN">—</dd>
      </dl>
      <p class="note-s" id="obNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvOrb'), st = {};
    let sel = 0, t = 0;
    const kb = document.getElementById('obK');
    kb.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { sel = +b.dataset.i; info(); draw(); } });
    const cZ = document.getElementById('obZ'); cZ.addEventListener('change', draw);
    const calc = o => {
      const r = R + o.h, T = 2 * Math.PI * Math.sqrt(r * r * r / GM), v = Math.sqrt(GM / r);
      const e = o.eps * Math.PI / 180, lam = Math.acos(R / r * Math.cos(e)) - e;
      return { r, T, v, lam, lat: 4 * o.h / c0, N: Math.ceil(2 / (1 - Math.cos(lam))), pass: o.key === 'geo' ? Infinity : lam * T / Math.PI };
    };
    const dur = s => s >= 7200 ? num(s / 3600, 3) + ' giờ' : num(s / 60, 3) + ' phút';
    function info() {
      const o = ORB[sel], k = calc(o);
      kb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === sel)));
      document.getElementById('obH').textContent = num(o.h / 1000, 5) + ' km';
      document.getElementById('obT').textContent = dur(k.T);
      document.getElementById('obV').textContent = num(k.v * 3.6, 3) + ' km/h';
      document.getElementById('obL').textContent = fmt(k.lat, 's', 3);
      document.getElementById('obP').textContent = k.pass === Infinity ? 'luôn luôn (đứng yên)' : 'cỡ ' + dur(k.pass);
      document.getElementById('obN').textContent = String(k.N);
      document.getElementById('obNote').textContent = o.note;
    }
    function draw() {
      if (!st.ctx || Math.min(st.W, st.H) < 60) return;
      const { ctx, W, H } = st, cx = W / 2, cy = H / 2, rFit = cZ.checked ? (R + ORB[sel].h) * 1.08 : R + ORB[2].h, sc = (Math.min(W, H) / 2 - 16) / rFit;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#10151c'; ctx.fillRect(0, 0, W, H);
      // các quỹ đạo
      ORB.forEach((o, i) => { ctx.strokeStyle = o.col; ctx.globalAlpha = i === sel ? 0.9 : 0.3; ctx.lineWidth = i === sel ? 1.8 : 1; ctx.beginPath(); ctx.arc(cx, cy, (R + o.h) * sc, 0, 7); ctx.stroke(); });
      ctx.globalAlpha = 1;
      const o = ORB[sel], k = calc(o), earthAng = -2 * Math.PI * t / DAY;
      // vệ tinh của quỹ đạo đang chọn + vùng phủ
      for (let j = 0; j < o.n; j++) {
        const a = -2 * Math.PI * t / k.T + j * 2 * Math.PI / o.n, sx = cx + Math.cos(a) * k.r * sc, sy = cy + Math.sin(a) * k.r * sc;
        ctx.fillStyle = o.col; ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(cx, cy, R * sc, a - k.lam, a + k.lam); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = o.col; ctx.fillRect(sx - 3, sy - 3, 6, 6);
      }
      // Trái Đất
      ctx.fillStyle = '#2a6fa8'; ctx.beginPath(); ctx.arc(cx, cy, R * sc, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7bcde8'; ctx.lineWidth = 1; ctx.stroke();
      // người dùng trên mặt đất (quay theo Trái Đất)
      const ux = cx + Math.cos(earthAng) * R * sc, uy = cy + Math.sin(earthAng) * R * sc;
      ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(ux, uy, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#e6e9ed'; ctx.font = FONT(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Trái Đất (bán kính 6371 km), các quỹ đạo vẽ đúng tỉ lệ; góc ngẩng tối thiểu ' + ORB[sel].eps + '°', 10, 8);
      ctx.fillStyle = '#9aa4ae'; ctx.font = FONT(11.5);
      ctx.fillText('thời gian tua nhanh: 1 giây ≈ ' + num(TS / 60, 3) + ' phút', 10, 26);
      ctx.fillStyle = '#f2c230'; ctx.fillText('● người dùng (quay theo Trái Đất)', 10, H - 22);
    }
    const TS = 1200;      // tua nhanh 1200 lần: quỹ đạo thấp ~5 giây một vòng, GEO ~72 giây
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => { if (!WL.REDUCED) { t += dt * TS; draw(); } });
    info(); draw();
  },
});
})();
