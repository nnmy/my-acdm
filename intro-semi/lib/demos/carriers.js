/* =====================================================================
   Bán dẫn: minh họa "Electron, lỗ trống và pha tạp trong Si" (id: carriers, trang 2-ban-dan.html)
   Nhúng vào trang: <div class="demo" id="demoCarriers" data-demo="carriers"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=carriers

   Bên trái: mạng Si 2D (minh họa, mỗi liên kết = 2 electron). Bên phải: giản đồ vùng với mức Fermi.
   Số liệu Si (Sze & Ng):
   - E_g(T) = 1,17 − 4,73e-4·T²/(T + 636) eV (Varshni)
   - n_i = √(N_c N_v)·(T/300)^1,5·exp(−E_g/2kT), N_c = 2,86e19, N_v = 2,66e19 cm⁻³ (ở 300 K) → n_i(300 K) ≈ 1e10 cm⁻³
   - Giả sử chất pha tạp ion hóa hoàn toàn và thống kê Boltzmann (bán dẫn không suy biến):
     n = N_D/2 + √(N_D²/4 + n_i²), p = n_i²/n (loại p tương tự). Hai giả định này đúng khá tốt ở 200–650 K
     với N ≤ 1e18 cm⁻³, nên thanh trượt dừng ở 1e18 (trên mức đó cần thêm suy biến, thu hẹp vùng cấm).
   - Độ linh động (Caughey–Thomas, 300 K): μ_n = 65 + 1265/(1 + (N/8,5e16)^0,72), μ_p = 48 + 447/(1 + (N/6,3e16)^0,76) cm²/(V·s);
     nhân thêm (T/300)^−2,2 (gần đúng). ρ = 1 / (q(nμ_n + pμ_p)).
   Số chấm trên hình KHÔNG tỉ lệ với nồng độ thật (chỉ minh họa xu hướng).
   ===================================================================== */
(() => {
const { COLORS: C, num, sci, range, watchCanvas, loopWhenVisible, REDUCED } = SEMI;
const KB = 8.617e-5, Q = 1.602e-19;
const eg = T => 1.17 - 4.73e-4 * T * T / (T + 636);
const ni = T => Math.sqrt(2.86e19 * 2.66e19) * Math.pow(T / 300, 1.5) * Math.exp(-eg(T) / (2 * KB * T));
const COLS = 7, ROWS = 5;
const DOP = [[1, 1], [5, 1], [3, 3], [1, 4]];   // vị trí nguyên tử pha tạp (cột, hàng)

SEMI.demo('carriers', {
  domId: 'demoCarriers',
  title: 'Electron, lỗ trống và pha tạp trong Si',
  page: '2-ban-dan.html',
  html: `<div class="demo-title"><h4>Electron, lỗ trống và pha tạp trong Si</h4><span>Chọn loại pha tạp, nồng độ và nhiệt độ</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCar" class="ar tall-m" role="img" aria-label="Bên trái: mạng tinh thể Si phẳng với liên kết, electron tự do màu xanh và lỗ trống màu đỏ. Bên phải: giản đồ vùng năng lượng với mức Fermi."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Pha tạp">
        <button class="btn" type="button" data-cdp="i" aria-pressed="true">Tinh khiết</button>
        <button class="btn" type="button" data-cdp="n" aria-pressed="false">Loại n (P)</button>
        <button class="btn" type="button" data-cdp="p" aria-pressed="false">Loại p (B)</button>
      </div>
      <div class="ctrl"><label for="cdN">Nồng độ pha tạp</label><output for="cdN"></output><input type="range" id="cdN" min="13" max="18" step="0.1" value="16"></div>
      <div class="ctrl"><label for="cdT">Nhiệt độ</label><output for="cdT"></output><input type="range" id="cdT" min="200" max="650" step="5" value="300"></div>
      <dl class="readout" aria-live="polite">
        <dt>Nồng độ nội tại nᵢ</dt><dd id="cdNi">—</dd>
        <dt>Electron n</dt><dd class="big" id="cdNn">—</dd>
        <dt>Lỗ trống p</dt><dd class="big" id="cdNp">—</dd>
        <dt>E_F − Eᵢ</dt><dd id="cdEf">—</dd>
        <dt>Điện trở suất</dt><dd id="cdRho">—</dd>
      </dl>
      <p class="note-s" id="cdNote"></p>
      <p class="note-s">Giả định: mọi nguyên tử pha tạp đều đã ion hóa. Ở nhiệt độ rất thấp (dưới khoảng 150 K) electron bị "đóng băng" lại quanh nguyên tử P, và mô hình này không còn đúng.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvCar'), st = {};
    let dop = 'i', R = null, parts = [], tAcc = 0;
    const rN = range('cdN', { map: v => 10 ** v, show: v => sci(v, 2) + ' cm⁻³', onInput: () => calc() });
    const rT = range('cdT', { show: v => v + ' K (' + Math.round(v - 273) + ' °C)', onInput: () => calc() });
    const bs = [...document.querySelectorAll('#demoCarriers [data-cdp]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); dop = b.dataset.cdp; document.getElementById('cdN').disabled = dop === 'i'; calc(); }));
    document.getElementById('cdN').disabled = true;
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function calc() {
      const T = rT.get(), N = dop === 'i' ? 0 : rN.get(), n_i = ni(T);
      const maj = N / 2 + Math.sqrt(N * N / 4 + n_i * n_i), min = n_i * n_i / maj;
      const n = dop === 'p' ? min : maj, p = dop === 'p' ? maj : min;
      const s = Math.pow(T / 300, -2.2), mn = (65 + 1265 / (1 + Math.pow(N / 8.5e16, 0.72))) * s, mp = (48 + 447 / (1 + Math.pow(N / 6.3e16, 0.76))) * s;
      const rho = 1 / (Q * (n * mn + p * mp)), ef = KB * T * Math.log(n / n_i);
      R = { T, N, n_i, n, p, ef, eg: eg(T) };
      set('cdNi', sci(n_i, 3) + ' cm⁻³'); set('cdNn', sci(n, 3) + ' cm⁻³'); set('cdNp', sci(p, 3) + ' cm⁻³');
      set('cdEf', Math.abs(ef) < 5e-4 ? '0 eV' : (ef > 0 ? '+' : '−') + num(Math.abs(ef), 3) + ' eV'); set('cdRho', sci(rho, 3) + ' Ω·cm');
      const note = dop === 'i' ? 'Si tinh khiết: mỗi electron nhảy lên vùng dẫn để lại đúng một lỗ trống, nên n = p = nᵢ. Từ 300 K lên 400 K, nᵢ tăng khoảng 500 lần.'
        : (dop === 'n' ? 'Mỗi nguyên tử P có 5 electron hóa trị: 4 dùng để liên kết, electron thứ 5 gần như tự do. Electron là hạt tải đa số; lỗ trống bị lấn át.'
          : 'Mỗi nguyên tử B chỉ có 3 electron hóa trị: một liên kết bị thiếu electron, tạo ra một lỗ trống. Lỗ trống là hạt tải đa số.')
        + (dop !== 'i' && R.n_i > R.N * 0.5 ? ' Ở nhiệt độ này nᵢ đã vượt nồng độ pha tạp: Si trở lại gần như tinh khiết, linh kiện mất tác dụng.' : '');
      set('cdNote', note);
      spawn(); draw();
    }
    // các hạt minh họa: e (electron tự do), h (lỗ trống)
    function spawn() {
      const pairs = Math.max(0, Math.min(8, Math.round(Math.log10(R.n_i) - 8)));
      const want = { e: pairs + (dop === 'n' ? DOP.length : 0), h: pairs + (dop === 'p' ? DOP.length : 0) };
      ['e', 'h'].forEach(k => {
        let have = parts.filter(q => q.k === k);
        while (have.length > want[k]) { parts.splice(parts.indexOf(have.pop()), 1); }
        while (have.length < want[k]) { const q = k === 'h' ? { k, c: Math.floor(Math.random() * (COLS - 1)) + 0.5, r: Math.floor(Math.random() * ROWS), vx: 0, vy: 0 } : { k, c: Math.random() * (COLS - 1), r: Math.random() * (ROWS - 1), vx: 0, vy: 0 }; parts.push(q); have.push(q); }   // lỗ trống nằm trên liên kết
      });
    }
    function draw() {
      if (!st.ctx || !R) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const wide = W > 520, lw = wide ? W * 0.66 : W, lh = wide ? H : H * 0.62;
      const g = Math.max(12, Math.min((lw - 40) / (COLS - 1), (lh - 70) / (ROWS - 1))), ox = (lw - g * (COLS - 1)) / 2, oy = 52 + (lh - 70 - g * (ROWS - 1)) / 2;
      const P = (c, r) => [ox + c * g, oy + r * g], isDop = (c, r) => dop !== 'i' && DOP.some(([a, b]) => a === c && b === r);
      // liên kết
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        [[1, 0], [0, 1]].forEach(([dc, dr]) => {
          if (c + dc >= COLS || r + dr >= ROWS) return;
          const [x0, y0] = P(c, r), [x1, y1] = P(c + dc, r + dr);
          ctx.strokeStyle = '#c9d2da'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          const missing = dop === 'p' && dc === 1 && isDop(c, r);
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ux = (x1 - x0) / g, uy = (y1 - y0) / g;
          [[-1], [1]].forEach(([sg], k) => {
            const ex = mx + ux * sg * 6, ey = my + uy * sg * 6;
            if (missing && k === 1) { ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, 7); ctx.fill(); ctx.stroke(); }
            else { ctx.fillStyle = C.neg; ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, 7); ctx.fill(); }
          });
        });
      }
      // nguyên tử
      ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const [x, y] = P(c, r), d = isDop(c, r);
        ctx.fillStyle = d ? (dop === 'n' ? '#fde3b3' : '#e3d5f5') : '#eef1f4'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, Math.min(16, g * 0.28), 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.fillText(d ? (dop === 'n' ? 'P' : 'B') : 'Si', x, y + 0.5);
      }
      // hạt tải tự do
      parts.forEach(q => {
        const [x, y] = P(q.c, q.r);
        if (q.k === 'e') { ctx.fillStyle = C.neg; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillText('−', x, y); }
        else { ctx.fillStyle = '#fff'; ctx.strokeStyle = C.pos; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.pos; ctx.fillText('+', x, y); }
      });
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink;
      ctx.fillText(dop === 'i' ? 'Si tinh khiết' : dop === 'n' ? 'Si pha phốt pho (loại n)' : 'Si pha bo (loại p)', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('chấm xanh nhỏ: electron liên kết; ● electron tự do; ○ lỗ trống (không theo tỉ lệ)', 10, 26);
      // giản đồ vùng
      const bx0 = wide ? lw + 10 : 50, bx1 = W - 16, by0 = wide ? 60 : lh + 20, by1 = H - 18;
      const Emin = -0.85, Emax = 0.85, ey = e => by1 - (e - Emin) / (Emax - Emin) * (by1 - by0), hg = R.eg / 2;
      ctx.fillStyle = 'rgba(216,49,42,.08)'; ctx.fillRect(bx0, ey(Emax), bx1 - bx0, ey(hg) - ey(Emax));
      ctx.fillStyle = 'rgba(55,135,196,.2)'; ctx.fillRect(bx0, ey(-hg), bx1 - bx0, ey(Emin) - ey(-hg));
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; [hg, -hg].forEach(e => { ctx.beginPath(); ctx.moveTo(bx0, ey(e)); ctx.lineTo(bx1, ey(e)); ctx.stroke(); });
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx0, ey(0)); ctx.lineTo(bx1, ey(0)); ctx.stroke(); ctx.setLineDash([]);
      const efc = Math.max(-hg + 0.01, Math.min(hg - 0.01, R.ef));
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx0, ey(efc)); ctx.lineTo(bx1, ey(efc)); ctx.stroke();
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = C.ink; ctx.fillText('E_C', bx1 - 2, ey(hg) - 2); ctx.textBaseline = 'top'; ctx.fillText('E_V', bx1 - 2, ey(-hg) + 2);
      ctx.fillStyle = '#9a7a12'; ctx.textBaseline = efc > 0 ? 'top' : 'bottom'; ctx.fillText('E_F', bx1 - 2, ey(efc) + (efc > 0 ? 3 : -3));
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = efc >= 0 ? 'top' : 'bottom'; ctx.fillText('Eᵢ', bx0 + 2, ey(0) + (efc >= 0 ? 3 : -3));
      ctx.fillStyle = C.ink; ctx.textBaseline = 'bottom'; ctx.fillText('Giản đồ vùng', bx0, by0 - 4);
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => {
      if (REDUCED) return; tAcc += dt; if (tAcc < 0.05) return; tAcc = 0;
      parts.forEach(q => {
        if (q.k === 'e') { q.vx += (Math.random() - 0.5) * 0.12; q.vy += (Math.random() - 0.5) * 0.12; q.vx *= 0.9; q.vy *= 0.9; q.c += q.vx; q.r += q.vy; }
        else if (Math.random() < 0.25) { const dir = Math.floor(Math.random() * 4); q.c = Math.round(q.c * 2) / 2 + [0.5, -0.5, 0, 0][dir]; q.r = Math.round(q.r * 2) / 2 + [0, 0, 0.5, -0.5][dir]; if ((q.c * 2 + q.r * 2) % 2 === 0) q.c += 0.5; }
        q.c = Math.max(0, Math.min(COLS - 1, q.c)); q.r = Math.max(0, Math.min(ROWS - 1, q.r));
        if (q.c <= 0 || q.c >= COLS - 1) q.vx = -q.vx; if (q.r <= 0 || q.r >= ROWS - 1) q.vy = -q.vy;
      });
      draw();
    });
    rN.upd(); rT.upd();
  },
});
})();
