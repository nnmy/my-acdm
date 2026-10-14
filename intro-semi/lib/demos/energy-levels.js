/* =====================================================================
   Bán dẫn: minh họa "Mức năng lượng và ánh sáng" (id: energy-levels, trang 1-vat-chat.html)
   Nhúng vào trang: <div class="demo" id="demoLevels" data-demo="energy-levels"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=energy-levels

   Nguyên tử hiđrô: E_n = −13,6 eV / n², n = 1…6. Bấm một mức để electron nhảy tới đó.
   Nhảy xuống: phát photon có bước sóng λ = hc/ΔE = 1239,84 nm·eV / ΔE.
   Nhảy lên: phải hấp thụ đúng năng lượng ΔE (photon hoặc va chạm).
   Dãy Lyman (về n = 1): tử ngoại; Balmer (về n = 2): khả kiến; Paschen (về n = 3): hồng ngoại.
   ===================================================================== */
(() => {
const { COLORS: C, num, watchCanvas, loopWhenVisible, REDUCED } = SEMI;
const NMAX = 6, En = n => -13.6 / (n * n), HC = 1239.84;
const SERIES = { 1: 'Lyman', 2: 'Balmer', 3: 'Paschen', 4: 'Brackett', 5: 'Pfund' };
const rgb = SEMI.rgbFromWavelength;   // định nghĩa trong lib/semi.js

SEMI.demo('energy-levels', {
  domId: 'demoLevels',
  title: 'Mức năng lượng và ánh sáng',
  page: '1-vat-chat.html',
  html: `<div class="demo-title"><h4>Mức năng lượng và ánh sáng</h4><span>Bấm vào một mức năng lượng để electron nhảy tới đó</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvLev" class="ar" role="img" aria-label="Các mức năng lượng của nguyên tử hiđrô dưới dạng các vạch ngang; electron ở một mức; khi nhảy xuống phát ra photon có màu theo bước sóng. Bên dưới là dải phổ các vạch đã phát."></canvas><canvas id="cvLevP" class="profile" aria-hidden="true"></canvas></div>
    <div class="panel">
      <div class="btnrow"><button class="btn" type="button" id="lvHit">Va chạm ngẫu nhiên (kích thích)</button><button class="btn" type="button" id="lvClr">Xóa phổ</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Mức hiện tại</dt><dd id="lvN">—</dd>
        <dt>Bước nhảy vừa rồi</dt><dd id="lvJ">—</dd>
        <dt>Năng lượng ΔE</dt><dd id="lvE">—</dd>
        <dt>Bước sóng photon</dt><dd class="big" id="lvL">—</dd>
        <dt>Vùng phổ</dt><dd id="lvR">—</dd>
      </dl>
      <p class="note-s">Electron chỉ được ở những mức nhất định, không ở giữa hai mức. Vì vậy mỗi nguyên tố phát ra một bộ vạch màu riêng, như "vân tay": đó là cách người ta biết thành phần của các ngôi sao.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvLev'), cvP = document.getElementById('cvLevP'), st = {}, stP = {};
    let n = 1, lines = [], photon = null, geo = null;
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function jump(to) {
      if (to === n) return;
      const dE = En(to) - En(n), lam = HC / Math.abs(dE), from = n; n = to;
      set('lvN', 'n = ' + n + ' (' + num(En(n), 3) + ' eV)');
      set('lvJ', from + ' → ' + to + (dE < 0 ? ' (phát sáng)' : ' (hấp thụ)'));
      set('lvE', num(Math.abs(dE), 3) + ' eV');
      set('lvL', num(lam, 4) + ' nm');
      const reg = lam < 380 ? 'tử ngoại' : lam > 750 ? 'hồng ngoại' : 'khả kiến';
      set('lvR', reg + (dE < 0 && SERIES[to] ? ', dãy ' + SERIES[to] : ''));
      if (dE < 0) { lines.push({ lam, col: rgb(lam) }); photon = { t: 0, lam, col: rgb(lam), from, to }; }
      draw(); drawP();
    }
    document.getElementById('lvHit').addEventListener('click', () => { const up = n + 1 + Math.floor(Math.random() * (NMAX - n)); if (n < NMAX) jump(Math.min(NMAX, up)); });
    document.getElementById('lvClr').addEventListener('click', () => { lines = []; drawP(); });
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 70, x1 = W * 0.62, y0 = 52, y1 = H - 24, ey = e => y1 - (e - En(1)) / (0.6 - En(1)) * (y1 - y0);
      geo = { x0, x1, ey };
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      for (let k = 1; k <= NMAX; k++) {
        const y = ey(En(k)); ctx.strokeStyle = k === n ? C.ink : '#8b929b'; ctx.lineWidth = k === n ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
        if (k <= 4) { ctx.textAlign = 'right'; ctx.fillText(num(En(k), 3) + ' eV', x0 - 6, y); ctx.textAlign = 'left'; ctx.fillText('n = ' + k, x1 + 6, y); }
        else if (k === 5) { ctx.textAlign = 'left'; ctx.fillText('n = 5, 6', x1 + 6, y - 4); }
      }
      const yi = ey(0); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, yi); ctx.lineTo(x1, yi); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('0 eV: electron thoát khỏi nguyên tử (ion hóa)', x0, yi - 4);
      // electron
      const ex = (x0 + x1) / 2, eyy = ey(En(n));
      ctx.fillStyle = C.neg; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, eyy, 8, 0, 7); ctx.fill(); ctx.stroke();
      // photon
      if (photon) {
        const t = photon.t, px = ex + 20 + t * (W - ex - 30), py = (ey(En(photon.from)) + ey(En(photon.to))) / 2, col = photon.col || (photon.lam < 380 ? '#7b4fbf' : '#8b3a3a');
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let k = 0; k <= 60; k++) { const xx = ex + 20 + (px - ex - 20) * k / 60, yy = py + Math.sin(k * 0.9) * 6; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
        ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('photon ' + num(photon.lam, 3) + ' nm' + (photon.col ? '' : photon.lam < 380 ? ' (tử ngoại, không thấy)' : ' (hồng ngoại, không thấy)'), Math.min(px, W - 210), py - 10);
      }
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Các mức năng lượng của nguyên tử hiđrô', 10, 8);
    }
    function drawP() {
      if (!stP.ctx) return;
      const { ctx, W, H } = stP; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const l0 = 80, l1 = 1900, x0 = 14, x1 = W - 14, y0 = 26, y1 = H - 26;
      const lx = l => x0 + Math.log(l / l0) / Math.log(l1 / l0) * (x1 - x0);
      for (let l = 380; l <= 750; l += 2) { ctx.fillStyle = rgb(l); ctx.globalAlpha = 0.25; ctx.fillRect(lx(l), y0, lx(l + 2) - lx(l) + 0.5, y1 - y0); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#20232a'; ctx.globalAlpha = 0.06; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1;
      lines.forEach(L => { ctx.fillStyle = L.col || '#59606B'; ctx.fillRect(lx(L.lam) - 1.5, y0, 3, y1 - y0); });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Phổ phát xạ đã ghi (thang log bước sóng)', x0, 6);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      [[100, '100 nm'], [380, '380'], [750, '750'], [1875, '1875 nm']].forEach(([l, t]) => ctx.fillText(t, lx(l), y1 + 4));
      ctx.fillText('tử ngoại', (lx(l0) + lx(380)) / 2, y1 + 4); ctx.fillText('hồng ngoại', (lx(750) + lx(1700)) / 2, y1 + 4);
    }
    cv.addEventListener('click', ev => {
      if (!geo) return; const r = cv.getBoundingClientRect(), y = ev.clientY - r.top;
      let best = 1, bd = 1e9; for (let k = 1; k <= NMAX; k++) { const d = Math.abs(geo.ey(En(k)) - y); if (d < bd) { bd = d; best = k; } }
      if (bd < 24) jump(best);
    });
    watchCanvas(cv, st, draw); watchCanvas(cvP, stP, drawP);
    loopWhenVisible(cv, dt => { if (photon) { photon.t += dt * (REDUCED ? 10 : 0.7); if (photon.t >= 1) photon = null; draw(); } });
    set('lvN', 'n = 1 (−13,6 eV)');
    jump(3); jump(2);
  },
});
})();
