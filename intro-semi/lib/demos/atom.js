/* =====================================================================
   Bán dẫn: minh họa "Mô hình nguyên tử" (id: atom, trang 1-vat-chat.html)
   Nhúng vào trang: <div class="demo" id="demoAtom" data-demo="atom"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=atom

   Mô hình lớp vỏ kiểu Bohr (minh họa, không đúng tỉ lệ): hạt nhân gồm Z proton và N neutron
   (N của đồng vị phổ biến nhất: B-11, Ne-20, Si-28, P-31, Cu-63), electron xếp theo lớp K, L, M, N.
   Lớp ngoài cùng (hóa trị) tô vàng; nếu lớp ngoài cùng đã đủ (2 với lớp K, 8 với các lớp khác)
   thì có dấu tích xanh lá cạnh tên lớp.
   Điện trở suất ở 20 °C (Ω·m), làm tròn (CRC Handbook): Cu 1,7e-8; Si tinh khiết ~2,3e3.
   EDIT: danh sách nguyên tố ở mảng EL (5 nguyên tố).
   ===================================================================== */
(() => {
const { COLORS: C, sci, REDUCED, watchCanvas, loopWhenVisible } = SEMI;
const EL = [
  ['B', 'Bo', 5, 6, [2, 3], 'Á kim', null, '3 electron hóa trị, thiếu 1 so với Si: pha vào Si tạo bán dẫn loại p.'],
  ['Ne', 'Neon', 10, 10, [2, 8], 'Khí hiếm', null, 'Lớp ngoài đã đủ 8 electron: rất bền, gần như không phản ứng hóa học và không dẫn điện ở điều kiện thường.'],
  ['Si', 'Silic', 14, 14, [2, 8, 4], 'Á kim (bán dẫn)', 2.3e3, '4 electron hóa trị, mỗi nguyên tử liên kết với 4 nguyên tử bên cạnh: vật liệu nền của gần như mọi con chip.'],
  ['P', 'Phốt pho', 15, 16, [2, 8, 5], 'Phi kim', null, '5 electron hóa trị, dư 1 so với Si: pha vào Si tạo bán dẫn loại n.'],
  ['Cu', 'Đồng', 29, 34, [2, 8, 18, 1], 'Kim loại', 1.7e-8, 'Chỉ 1 electron ở lớp ngoài cùng, bị giữ rất lỏng: một trong những chất dẫn điện tốt nhất, làm dây nối trong chip hiện đại.'],
];
/* Lớp ngoài cùng "đủ": lớp K có 2 electron, các lớp khác có 8 electron (quy tắc bát tử cho lớp hóa trị). */
const outerFull = sh => sh[sh.length - 1] === (sh.length === 1 ? 2 : 8);
const SHELL = ['K', 'L', 'M', 'N'];

SEMI.demo('atom', {
  domId: 'demoAtom',
  title: 'Mô hình nguyên tử',
  page: '1-vat-chat.html',
  html: `<div class="demo-title"><h4>Mô hình nguyên tử</h4><span>Chọn một nguyên tố để xem hạt nhân và các lớp electron</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvAtom" class="ar" role="img" aria-label="Mô hình nguyên tử: hạt nhân gồm proton và neutron ở giữa, electron trên các lớp vỏ tròn đồng tâm; lớp ngoài cùng được tô vàng."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="atEl">Nguyên tố</label><select id="atEl">${EL.map((e, i) => `<option value="${i}"${e[0] === 'Si' ? ' selected' : ''}>${e[0]}: ${e[1]} (Z = ${e[2]})</option>`).join('')}</select></div>
      <div class="checks"><label><input type="checkbox" id="atSpin" ${REDUCED ? '' : 'checked'}> Electron chuyển động</label></div>
      <dl class="readout" aria-live="polite">
        <dt>Proton; neutron</dt><dd id="atPN">—</dd>
        <dt>Electron theo lớp</dt><dd id="atSh">—</dd>
        <dt>Electron hóa trị</dt><dd class="big" id="atVal">—</dd>
        <dt>Lớp ngoài cùng</dt><dd id="atFull">—</dd>
        <dt>Loại</dt><dd id="atCat">—</dd>
        <dt>Điện trở suất (rắn, 20 °C)</dt><dd id="atRho">—</dd>
      </dl>
      <p class="note-s" id="atNote"></p>
      <p class="note-s">Dấu tích xanh lá: lớp ngoài cùng đã đủ electron (2 với lớp K, 8 với các lớp khác), nguyên tử rất bền. Hình không đúng tỉ lệ: nếu hạt nhân to bằng hạt đậu thì nguyên tử rộng cỡ một sân vận động.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvAtom'), st = {}, sel = document.getElementById('atEl');
    let el = EL[+sel.value], spin = !REDUCED, phase = 0, nuc = [];
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function pick() {
      el = EL[+sel.value];
      const [sym, , Z, N, sh, cat, rho, note] = el;
      set('atPN', Z + '; ' + N);
      set('atSh', sh.map((n, i) => SHELL[i] + ': ' + n).join(', '));
      set('atVal', String(sh[sh.length - 1]));
      set('atFull', outerFull(sh) ? 'đã đủ ✓' : 'chưa đủ (' + sh[sh.length - 1] + '/' + (sh.length === 1 ? 2 : 8) + ')');
      set('atCat', cat);
      set('atRho', rho ? sci(rho, 2) + ' Ω·m' : '—');
      set('atNote', note);
      // xếp proton + neutron thành một cụm (tối đa 60 hạt vẽ ra)
      const tot = Z + N, k = Math.min(1, 60 / tot), np = Math.max(1, Math.round(Z * k)), nn = Math.round(N * k), parts = [];
      for (let i = 0; i < np; i++) parts.push(1); for (let i = 0; i < nn; i++) parts.push(0);
      let s = Z * 7 + 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = parts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [parts[i], parts[j]] = [parts[j], parts[i]]; }
      nuc = parts.map((p, i) => { const a = i * 2.39996, rr = Math.sqrt(i + 0.5); return { p, x: Math.cos(a) * rr, y: Math.sin(a) * rr }; });
      void sym; draw();
    }
    sel.addEventListener('change', pick);
    document.getElementById('atSpin').addEventListener('change', e => { spin = e.target.checked; draw(); });
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, cx = W / 2, cy = H / 2 + 22, sh = el[4];
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const Rmax = Math.max(40, Math.min(W, H - 44) * 0.46), r0 = Math.max(18, Rmax * 0.18), step = (Rmax - r0) / Math.max(1, sh.length);
      sh.forEach((n, i) => {
        const R = r0 + step * (i + 1), val = i === sh.length - 1;
        ctx.strokeStyle = val ? C.gold : C.line; ctx.lineWidth = val ? 3 : 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
        ctx.fillStyle = C.muted; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const lx = cx + R * 0.71 + 4, ly = cy - R * 0.71 - 4;
        ctx.fillText(SHELL[i], lx, ly);
        if (val && outerFull(sh)) {            // dấu tích xanh lá: lớp ngoài cùng đã đủ
          const bx = lx + ctx.measureText(SHELL[i]).width + 12, r = 8;
          ctx.fillStyle = '#2e9d4f'; ctx.beginPath(); ctx.arc(bx, ly, r, 0, 7); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(bx - 4, ly + 0.5); ctx.lineTo(bx - 1, ly + 3.5); ctx.lineTo(bx + 4.5, ly - 3); ctx.stroke();
          ctx.fillStyle = '#2e9d4f'; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText('đủ', bx + r + 4, ly);
          ctx.fillStyle = C.muted;
        }
        for (let k = 0; k < n; k++) {
          const a = (2 * Math.PI * k) / n + phase * (1.6 / (i + 1)) + i * 0.4, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          ctx.fillStyle = C.neg; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, val ? 6 : 4.5, 0, 7); ctx.fill(); ctx.stroke();
          if (val) { ctx.fillStyle = '#fff'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('−', x, y + 0.5); }
        }
      });
      const pr = Math.max(3, Math.min(7, r0 / (Math.sqrt(nuc.length) * 1.15)));
      nuc.forEach(q => {
        ctx.fillStyle = q.p ? C.pos : '#b9bec5'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx + q.x * pr * 1.9, cy + q.y * pr * 1.9, pr, 0, 7); ctx.fill(); ctx.stroke();
      });
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.ink; ctx.fillText(el[0] + ': ' + el[1], 10, 8);
      const lg = [['proton (+)', C.pos], ['neutron', '#b9bec5'], ['electron (−)', C.neg], ['lớp hóa trị', C.gold]];
      let x = 10; ctx.font = '500 12px "Be Vietnam Pro", system-ui, sans-serif';
      lg.forEach(([t, c]) => { ctx.fillStyle = c; ctx.fillRect(x, 30, 10, 10); ctx.strokeStyle = C.ink; ctx.strokeRect(x, 30, 10, 10); ctx.fillStyle = C.muted; ctx.fillText(t, x + 14, 28); x += ctx.measureText(t).width + 28; });
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => { if (spin) { phase += dt * 0.9; draw(); } });
    pick();
  },
});
})();
