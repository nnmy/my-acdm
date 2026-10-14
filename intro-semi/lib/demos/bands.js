/* =====================================================================
   Bán dẫn: minh họa "Từ mức năng lượng đến vùng năng lượng" (id: bands, trang 1-vat-chat.html)
   Nhúng vào trang: <div class="demo" id="demoBands" data-demo="bands"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=bands

   Chế độ 1 (minh họa định tính): chuỗi N nguyên tử giống nhau, mỗi nguyên tử có hai mức (−8 eV và −4 eV).
   Khi các nguyên tử lại gần, mỗi mức tách thành N mức: E_k = E_a − 2t·cos(kπ/(N+1)), k = 1…N
   (mô hình liên kết chặt). t giảm theo hàm mũ khi khoảng cách tăng. Với N lớn, N mức sát nhau thành một vùng.
   Chế độ 2: so sánh kim loại / bán dẫn (Si, E_g = 1,12 eV) / cách điện (kim cương, E_g ≈ 5,5 eV).
   Tỉ lệ electron được nhiệt đẩy qua vùng cấm ∝ exp(−E_g / 2kT) (thứ bậc độ lớn);
   số chấm vẽ ra theo thang log, chỉ để so sánh.
   ===================================================================== */
(() => {
const { COLORS: C, num, sci, range, watchCanvas } = SEMI;
const KB = 8.617e-5;
const MAT = [
  { name: 'Kim loại (Cu)', eg: null }, { name: 'Bán dẫn (Si)', eg: 1.12 }, { name: 'Cách điện (kim cương)', eg: 5.5 },
];

SEMI.demo('bands', {
  domId: 'demoBands',
  title: 'Từ mức năng lượng đến vùng năng lượng',
  page: '1-vat-chat.html',
  html: `<div class="demo-title"><h4>Từ mức năng lượng đến vùng năng lượng</h4><span>Ghép nhiều nguyên tử; so sánh kim loại, bán dẫn và chất cách điện</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvBand" class="ar tall-m" role="img" aria-label="Giản đồ năng lượng: các mức của từng nguyên tử tách ra thành nhiều mức sát nhau khi ghép nhiều nguyên tử, tạo thành vùng; hoặc ba cột so sánh vùng năng lượng của kim loại, bán dẫn và chất cách điện."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Chế độ">
        <button class="btn" type="button" data-bdm="1" aria-pressed="true">Từ mức đến vùng</button>
        <button class="btn" type="button" data-bdm="2" aria-pressed="false">Dẫn điện hay không?</button>
      </div>
      <div id="bdC1">
        <div class="ctrl"><label for="bdN">Số nguyên tử</label><output for="bdN"></output><input type="range" id="bdN" min="1" max="40" step="1" value="6"></div>
        <div class="ctrl"><label for="bdD">Khoảng cách giữa các nguyên tử (1 = bình thường)</label><output for="bdD"></output><input type="range" id="bdD" min="0.55" max="2.2" step="0.01" value="1"></div>
      </div>
      <div id="bdC2" hidden>
        <div class="ctrl"><label for="bdT">Nhiệt độ</label><output for="bdT"></output><input type="range" id="bdT" min="0" max="1000" step="10" value="300"></div>
      </div>
      <dl class="readout" aria-live="polite" id="bdR"></dl>
      <p class="note-s" id="bdNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvBand'), st = {};
    let mode = 1;
    const rN = range('bdN', { show: v => String(v), onInput: () => draw() });
    const rD = range('bdD', { show: v => num(v, 3) + ' (tương đối)', onInput: () => draw() });
    const rT = range('bdT', { show: v => v + ' K', onInput: () => draw() });
    const bs = [...document.querySelectorAll('#demoBands [data-bdm]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); mode = +b.dataset.bdm; document.getElementById('bdC1').hidden = mode !== 1; document.getElementById('bdC2').hidden = mode !== 2; draw(); }));
    const R = document.getElementById('bdR'), note = document.getElementById('bdNote');
    const row = (a, b, big) => `<dt>${a}</dt><dd${big ? ' class="big"' : ''}>${b}</dd>`;

    function levels() {
      const N = rN.get(), d = rD.get(), t1 = 0.55 * Math.exp(-2.6 * (d - 1)), t2 = 1.1 * Math.exp(-2.2 * (d - 1));
      const L = (Ea, t) => Array.from({ length: N }, (_, k) => Ea - 2 * t * Math.cos((k + 1) * Math.PI / (N + 1)));
      return { N, d, lo: L(-8, t1), hi: L(-4, t2), t1, t2 };
    }
    function draw() { if (!st.ctx) return; mode === 1 ? draw1() : draw2(); }
    function draw1() {
      const { ctx, W, H } = st, { N, d, lo, hi, t1, t2 } = levels();
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      // hàng nguyên tử
      const ay = 58, sp = Math.min(40, (W - 60) / Math.max(1, N) * Math.min(1, d / 1.2)), ax0 = W / 2 - sp * (N - 1) / 2, ar = Math.max(3, Math.min(12, sp * 0.32));
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(N + ' nguyên tử xếp thành hàng', 10, 8);
      for (let i = 0; i < N; i++) { ctx.fillStyle = '#e8ecf0'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ax0 + i * sp, ay, ar, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.pos; ctx.beginPath(); ctx.arc(ax0 + i * sp, ay, Math.max(1.5, ar * 0.3), 0, 7); ctx.fill(); }
      // giản đồ năng lượng
      const y0 = 92, y1 = H - 20, Emin = -11.5, Emax = -0.5, ey = e => y1 - (e - Emin) / (Emax - Emin) * (y1 - y0);
      const xa = 70, xb = W - 30, xm = (xa + xb) / 2;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xa - 10, y1); ctx.lineTo(xa - 10, y0); ctx.stroke();
      ctx.save(); ctx.translate(18, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = C.muted; ctx.fillText('Năng lượng của electron (eV)', 0, 0); ctx.restore();
      const band = (ls, col, label, filled) => {
        const top = Math.max(...ls), bot = Math.min(...ls);
        if (N > 1) { ctx.fillStyle = col; ctx.globalAlpha = 0.14; ctx.fillRect(xa, ey(top) - 2, xb - xa, ey(bot) - ey(top) + 4); ctx.globalAlpha = 1; }
        ls.forEach(e => { ctx.strokeStyle = col; ctx.lineWidth = N > 25 ? 1 : 2; ctx.beginPath(); ctx.moveTo(xm - 70, ey(e)); ctx.lineTo(xm + 70, ey(e)); ctx.stroke();
          if (filled && N <= 25) { ctx.fillStyle = C.neg; [-12, 12].forEach(dx => { ctx.beginPath(); ctx.arc(xm + dx, ey(e), 3, 0, 7); ctx.fill(); }); } });
        ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, xm + 80, (ey(top) + ey(bot)) / 2);
      };
      const nar = W < 520;
      band(hi, C.pos, N > 1 ? (nar ? 'vùng trên' : 'vùng từ mức trên (trống)') : 'mức trên', false);
      band(lo, C.sea, N > 1 ? (nar ? 'vùng dưới' : 'vùng từ mức dưới (đầy electron)') : 'mức dưới', true);
      const gap = Math.min(...hi) - Math.max(...lo);
      if (gap > 0 && N > 1) { const yA = ey(Math.max(...lo)), yB = ey(Math.min(...hi)); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xm - 110, yA); ctx.lineTo(xm - 110, yB); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.fillText('vùng cấm', xm - 116, (yA + yB) / 2); }
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; [-10, -8, -6, -4, -2].forEach(e => ctx.fillText(String(e).replace('-', '−'), xa - 14, ey(e)));
      const w1 = Math.max(...lo) - Math.min(...lo), w2 = Math.max(...hi) - Math.min(...hi);
      R.innerHTML = row('Số mức trong mỗi vùng', String(N)) + row('Bề rộng vùng dưới; vùng trên', num(w1, 3) + '; ' + num(w2, 3) + ' eV') +
        row('Vùng cấm', gap > 0 ? num(gap, 3) + ' eV' : 'không có (hai vùng chồng nhau)', true);
      note.textContent = gap > 0
        ? 'Mỗi mức chứa được 2 electron, và mỗi nguyên tử góp 2 electron vào vùng dưới: vùng dưới vừa đủ đầy. Vùng đầy thì electron không có chỗ trống để di chuyển: muốn dẫn điện, electron phải nhảy qua vùng cấm lên vùng trên. Thử kéo các nguyên tử lại gần nhau hơn. (Mô hình hai mức để minh họa; vùng năng lượng thật của Si phức tạp hơn.)'
        : 'Khi nguyên tử rất gần nhau, hai vùng chồng lên nhau: electron ở trên cùng có ngay chỗ trống sát bên để chuyển động, giống như trong kim loại.';
    }
    function draw2() {
      const { ctx, W, H } = st, T = rT.get();
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const cw = W / 3, y0 = 50, y1 = H - 40, Emin = -7, Emax = 4, ey = e => y1 - (e - Emin) / (Emax - Emin) * (y1 - y0);
      let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const out = [];
      MAT.forEach((m, i) => {
        const x0 = i * cw + 18, x1 = (i + 1) * cw - 18;
        ctx.font = '700 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(m.name, (x0 + x1) / 2, 12);
        if (m.eg === null) {
          const bb = -6, bt = 2.5, ef = 0;
          ctx.fillStyle = 'rgba(55,135,196,.75)'; ctx.fillRect(x0, ey(ef), x1 - x0, ey(bb) - ey(ef));
          ctx.fillStyle = 'rgba(55,135,196,.12)'; ctx.fillRect(x0, ey(bt), x1 - x0, ey(ef) - ey(bt));
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.strokeRect(x0, ey(bt), x1 - x0, ey(bb) - ey(bt));
          ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x0 - 6, ey(ef)); ctx.lineTo(x1 + 6, ey(ef)); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = '500 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textBaseline = 'bottom'; ctx.fillText('vùng chỉ đầy một phần', (x0 + x1) / 2, ey(ef) - 4);
          out.push(['Kim loại', 'luôn có chỗ trống ngay trên electron cao nhất']);
          return;
        }
        const vt = -m.eg / 2, cb = m.eg / 2;
        ctx.fillStyle = 'rgba(55,135,196,.75)'; ctx.fillRect(x0, ey(vt), x1 - x0, ey(-6.5) - ey(vt));
        ctx.fillStyle = 'rgba(216,49,42,.08)'; ctx.fillRect(x0, ey(3.5), x1 - x0, ey(cb) - ey(3.5));
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.strokeRect(x0, ey(vt), x1 - x0, ey(-6.5) - ey(vt)); ctx.strokeRect(x0, ey(3.5), x1 - x0, ey(cb) - ey(3.5));
        ctx.font = '500 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textBaseline = 'middle';
        ctx.fillText('vùng dẫn', (x0 + x1) / 2, ey(3.0)); ctx.fillStyle = '#fff'; ctx.fillText('vùng hóa trị', (x0 + x1) / 2, ey(-5.5));
        ctx.fillStyle = C.muted; ctx.fillText('E_g = ' + num(m.eg, 3) + ' eV', (x0 + x1) / 2, ey(0));
        const f = T > 0 ? Math.exp(-m.eg / (2 * KB * T)) : 0, dots = f > 0 ? Math.max(0, Math.min(14, Math.round((Math.log10(f) + 12) * 1.3))) : 0;
        for (let k = 0; k < dots; k++) {
          const x = x0 + 8 + rnd() * (x1 - x0 - 16), yc = ey(cb) - 6 - rnd() * (ey(cb) - ey(3.5) - 22), yv = ey(vt) + 6 + rnd() * 18;
          ctx.fillStyle = C.neg; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, yc, 4, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, yv, 4, 0, 7); ctx.fill(); ctx.stroke();
        }
        out.push([m.name.split(' (')[0], f > 0 ? '~' + sci(f, 2) : '0']);
      });
      ctx.font = '500 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('chấm xanh: electron trên vùng dẫn; vòng đỏ: lỗ trống để lại (số chấm theo thang log)', 10, H - 10);
      R.innerHTML = row('Hệ số exp(−E_g/2kT), Si', out[1][1], true) + row('Hệ số exp(−E_g/2kT), kim cương', out[2][1]) + row('Kim loại', 'không cần vượt vùng cấm');
      note.textContent = 'Số electron nhảy lên vùng dẫn tỉ lệ với hệ số exp(−E_g/2kT). Ở nhiệt độ phòng, 1 cm³ Si có khoảng 5 × 10²² nguyên tử nhưng chỉ khoảng 10¹⁰ electron trên vùng dẫn: ít, nhưng đủ để Si dẫn điện kém. Với kim cương, con số này coi như bằng 0. Mỗi electron nhảy lên để lại một lỗ trống ở vùng hóa trị.';
    }
    watchCanvas(cv, st, draw);
    rN.upd(); rD.upd(); rT.upd();
  },
});
})();
