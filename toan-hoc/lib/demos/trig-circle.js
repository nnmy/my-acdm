/* =====================================================================
   Toán học: minh họa "Vòng tròn lượng giác" (id: trig-circle, trang 5-luong-giac.html)
   Kéo điểm trên vòng tròn đơn vị (hoặc bấm Chạy); bên phải là đồ thị sin, cos theo góc.
   ===================================================================== */
(() => {
const { COLORS: C, num, watchCanvas, setTxt, drag, xy, loopWhenVisible, REDUCED } = LT;
const piStr = t => { const q = t / Math.PI; for (const d of [1, 2, 3, 4, 6]) { const n = Math.round(q * d); if (Math.abs(q * d - n) < 1e-3) { if (n === 0) return '0'; const nn = n === 1 ? '' : n === -1 ? '−' : String(n).replace('-', '−'); return d === 1 ? nn + 'π' : nn + 'π/' + d; } } return num(q, 3) + 'π'; };
LT.demo('trig-circle', {
  html: `<div class="demo-title"><h4>Vòng tròn lượng giác</h4><span>Kéo điểm trên vòng tròn: sin là độ cao, cos là độ ngang</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvTrig" class="ar" role="img" aria-label="Vòng tròn đơn vị và đồ thị sin, cos"></canvas><span class="hint" style="top:8px;bottom:auto;left:auto;right:10px">Kéo điểm đỏ trên vòng tròn</span></div>
    <div class="panel">
      <div class="btnrow"><button class="btn" type="button" id="trPlay" aria-pressed="false">▶ Chạy</button>
        <button class="btn" type="button" data-ta="30">30°</button><button class="btn" type="button" data-ta="45">45°</button><button class="btn" type="button" data-ta="60">60°</button><button class="btn" type="button" data-ta="90">90°</button></div>
      <div class="checks"><label><input type="checkbox" id="trSin" checked> sin</label><label><input type="checkbox" id="trCos" checked> cos</label><label><input type="checkbox" id="trTan"> tan</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Góc (độ)</dt><dd id="trDeg">—</dd><dt>Góc (radian)</dt><dd id="trRad">—</dd>
        <dt>sin θ</dt><dd class="big" id="trS">—</dd><dt>cos θ</dt><dd class="big" id="trC">—</dd><dt>tan θ</dt><dd id="trT">—</dd>
        <dt>sin²θ + cos²θ</dt><dd id="trP">—</dd>
      </dl>
      <p class="note-s">Một vòng là 360° = 2π radian. Radian là độ dài cung trên vòng tròn bán kính 1, nên π radian = nửa vòng = 180°.</p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvTrig'), st = {};
    let th = Math.PI / 6, play = false, G = null;
    const cS = root.querySelector('#trSin'), cC = root.querySelector('#trCos'), cT = root.querySelector('#trTan'), bP = root.querySelector('#trPlay');
    [cS, cC, cT].forEach(c => c.addEventListener('change', draw));
    root.querySelectorAll('[data-ta]').forEach(b => b.addEventListener('click', () => { th = +b.dataset.ta * Math.PI / 180; draw(); }));
    bP.addEventListener('click', () => { play = !play; bP.setAttribute('aria-pressed', play); bP.textContent = play ? '❚❚ Dừng' : '▶ Chạy'; });
    drag(cv, { pick: (x, y) => G && Math.hypot(x - G.cx, y - G.cy) < G.R + 30 && x < G.cx + G.R + 30 ? 1 : null,
      move: (o, x, y) => { let a = Math.atan2(G.cy - y, x - G.cx); if (a < 0) a += 2 * Math.PI; th = a; draw(); } });
    if (!REDUCED) loopWhenVisible(cv, dt => { if (play) { th = (th + dt * 0.8) % (2 * Math.PI); draw(); } });
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const R = Math.min(H * 0.36, W * 0.17), cx = R + 34, cy = H / 2; G = { cx, cy, R };
      const s = Math.sin(th), c = Math.cos(th), font = getComputedStyle(document.body).fontFamily;
      // trục
      ctx.strokeStyle = '#C9D3DA'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - R - 20, cy); ctx.lineTo(cx + R + 20, cy); ctx.moveTo(cx, cy - R - 20); ctx.lineTo(cx, cy + R + 20); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      const px = cx + R * c, py = cy - R * s;
      // cung góc
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, 0, -th, true); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      if (cC.checked) { ctx.strokeStyle = C.sea; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke(); }
      if (cS.checked) { ctx.strokeStyle = C.pos; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke(); }
      if (cT.checked && Math.abs(c) > 0.05) {   // tan: đoạn trên tiếp tuyến x = 1
        const ty = cy - R * s / c; ctx.strokeStyle = '#3f9d6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + R, cy); ctx.lineTo(cx + R, ty); ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, ty); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(px, py, 7, 0, 2 * Math.PI); ctx.fillStyle = C.pos; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '600 13px ' + font; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('θ', cx + R * 0.26 * Math.cos(th / 2), cy - R * 0.26 * Math.sin(th / 2));
      ctx.fillStyle = C.muted; ctx.font = '12px ' + font; ctx.fillText('(cos θ, sin θ)', px + 10, py - 10);
      // đồ thị sóng bên phải
      const gx0 = cx + R + 50, gx1 = W - 14, gw = gx1 - gx0, X = t => gx0 + t / (2 * Math.PI) * gw, Y = v => cy - v * R;
      ctx.strokeStyle = '#C9D3DA'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, cy); ctx.lineTo(gx1, cy); ctx.moveTo(gx0, cy - R); ctx.lineTo(gx1, cy - R); ctx.moveTo(gx0, cy + R); ctx.lineTo(gx1, cy + R); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      [[0, '0'], [Math.PI / 2, 'π/2'], [Math.PI, 'π'], [1.5 * Math.PI, '3π/2'], [2 * Math.PI, '2π']].forEach(([t, l]) => { ctx.fillText(l, X(t), cy + R + 18); ctx.beginPath(); ctx.moveTo(X(t), cy - 3); ctx.lineTo(X(t), cy + 3); ctx.strokeStyle = C.ink; ctx.stroke(); });
      ctx.textAlign = 'right'; ctx.fillText('1', gx0 - 6, cy - R + 4); ctx.fillText('−1', gx0 - 6, cy + R + 4);
      const wave = (f, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 300; i++) { const t = i / 300 * 2 * Math.PI, v = f(t); i ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); } ctx.stroke(); };
      ctx.save(); ctx.beginPath(); ctx.rect(gx0, cy - R - 24, gw, 2 * R + 48); ctx.clip();
      if (cC.checked) wave(Math.cos, C.sea);
      if (cS.checked) wave(Math.sin, C.pos);
      if (cT.checked) { ctx.strokeStyle = '#3f9d6a'; ctx.lineWidth = 2; ctx.beginPath(); let pen = false; for (let i = 0; i <= 600; i++) { const t = i / 600 * 2 * Math.PI, v = Math.tan(t); if (Math.abs(v) > 3) { pen = false; continue; } pen ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)); pen = true; } ctx.stroke(); }
      ctx.restore();
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(X(th), Y(s)); ctx.moveTo(X(th), cy - R - 20); ctx.lineTo(X(th), cy + R + 6); ctx.stroke(); ctx.setLineDash([]);
      if (cS.checked) { ctx.beginPath(); ctx.arc(X(th), Y(s), 5, 0, 2 * Math.PI); ctx.fillStyle = C.pos; ctx.fill(); }
      if (cC.checked) { ctx.beginPath(); ctx.arc(X(th), Y(c), 5, 0, 2 * Math.PI); ctx.fillStyle = C.sea; ctx.fill(); }
      const deg = th * 180 / Math.PI;
      setTxt('trDeg', num(Math.round(deg * 10) / 10, 4) + '°'); setTxt('trRad', piStr(th) + ' ≈ ' + num(th, 4));
      setTxt('trS', num(Math.abs(s) < 1e-12 ? 0 : s, 4)); setTxt('trC', num(Math.abs(c) < 1e-12 ? 0 : c, 4));
      setTxt('trT', Math.abs(c) < 1e-9 ? 'không xác định' : num(s / c, 4)); setTxt('trP', num(s * s + c * c, 4));
    }
    watchCanvas(cv, st, draw);
  },
});
})();
