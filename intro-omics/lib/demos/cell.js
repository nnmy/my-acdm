/* =====================================================================
   Omics: minh họa "Bên trong một tế bào" (id: cell, trang 1-te-bao.html)
   Nhúng vào trang: <div class="demo" id="demoCell" data-demo="cell"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=cell

   Sơ đồ (không đúng tỉ lệ) tế bào động vật, thực vật và vi khuẩn. Bấm vào một bào quan để xem chức năng.
   Kích thước điển hình lấy từ Alberts et al., Molecular Biology of the Cell (6th ed.) và Milo & Phillips,
   Cell Biology by the Numbers: tế bào người ~10–30 µm, nhân ~5–10 µm, ty thể ~0,5–1 µm rộng, dài tới vài µm,
   ribosome nhân thực ~25–30 nm, vi khuẩn E. coli ~1 × 2 µm, bộ gene E. coli ~4,6 triệu cặp base,
   DNA ty thể người 16 569 cặp base.
   ===================================================================== */
(() => {
const { COLORS: C, watchCanvas } = OMICS;
const INFO = {
  membrane: ['Màng tế bào', 'cell membrane', 'dày ~5–10 nm', 'Lớp kép phospholipid có gắn protein. Kiểm soát chất nào được vào, ra; nhận tín hiệu từ bên ngoài.'],
  nucleus: ['Nhân', 'nucleus', 'đường kính ~5–10 µm', 'Chứa gần như toàn bộ DNA của tế bào, xếp thành nhiễm sắc thể. Màng nhân kép có các lỗ cho mRNA đi ra tế bào chất.'],
  nucleolus: ['Hạch nhân', 'nucleolus', '~1–2 µm', 'Vùng đậm trong nhân, nơi phiên mã RNA ribosome và lắp ráp các tiểu đơn vị ribosome.'],
  mito: ['Ty thể', 'mitochondrion', 'rộng ~0,5–1 µm', 'Nhà máy năng lượng: tạo ATP bằng hô hấp tế bào. Có DNA riêng (ở người 16 569 cặp base), di truyền theo dòng mẹ.'],
  rer: ['Lưới nội chất hạt', 'rough endoplasmic reticulum', 'mạng màng nối với màng nhân', 'Bề mặt gắn ribosome; tổng hợp các protein sẽ được tiết ra ngoài hoặc gắn vào màng.'],
  ser: ['Lưới nội chất trơn', 'smooth endoplasmic reticulum', 'ống màng', 'Không có ribosome; tổng hợp lipid, khử độc (nhiều ở tế bào gan), dự trữ ion Ca²⁺.'],
  golgi: ['Bộ Golgi', 'Golgi apparatus', '~1–3 µm', 'Chồng túi dẹt: chỉnh sửa, gắn đường, đóng gói protein vào túi và gửi tới đúng nơi.'],
  lyso: ['Lysosome', 'lysosome', '~0,1–1 µm', 'Túi chứa enzyme tiêu hóa trong môi trường acid (pH ~4,5–5): phân hủy bào quan hư, vi khuẩn bị nuốt vào.'],
  ribo: ['Ribosome', 'ribosome', '~25–30 nm (vi khuẩn ~20 nm)', 'Cỗ máy dịch mã: đọc mRNA và nối các amino acid thành protein. Một tế bào người có hàng triệu ribosome.'],
  wall: ['Thành tế bào', 'cell wall', '~0,1–10 µm', 'Lớp vỏ cứng bên ngoài màng (cellulose ở thực vật, peptidoglycan ở vi khuẩn): giữ hình dạng, chống vỡ do áp suất nước.'],
  chloro: ['Lục lạp', 'chloroplast', '~5–10 µm', 'Quang hợp: dùng ánh sáng biến CO₂ và nước thành đường. Có DNA riêng; giống ty thể, có nguồn gốc từ vi khuẩn sống cộng sinh.'],
  vacuole: ['Không bào trung tâm', 'central vacuole', 'có thể chiếm tới ~80% thể tích', 'Túi lớn chứa nước, ion, chất dự trữ; tạo áp suất trương giữ cho cây đứng thẳng.'],
  nucleoid: ['Vùng nhân', 'nucleoid', 'không có màng bao', 'Vi khuẩn không có nhân thật: một phân tử DNA vòng (E. coli: ~4,6 triệu cặp base) cuộn lại trong tế bào chất.'],
  plasmid: ['Plasmid', 'plasmid', 'vài nghìn tới vài trăm nghìn cặp base', 'DNA vòng nhỏ, tự nhân đôi độc lập; thường mang gene kháng kháng sinh và truyền được giữa các vi khuẩn. Là công cụ chính của kỹ thuật di truyền.'],
  flag: ['Roi', 'flagellum', 'dài ~5–10 µm', 'Sợi protein quay như chân vịt, giúp vi khuẩn bơi.'],
};
const TYPES = { animal: 'Tế bào động vật', plant: 'Tế bào thực vật', bact: 'Vi khuẩn' };

OMICS.demo('cell', {
  domId: 'demoCell',
  title: 'Bên trong một tế bào',
  page: '1-te-bao.html',
  html: `<div class="demo-title"><h4>Bên trong một tế bào</h4><span>Bấm vào một bào quan để xem nó làm gì</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCell" class="ar" role="img" aria-label="Sơ đồ tế bào với các bào quan: nhân, ty thể, lưới nội chất, bộ Golgi, ribosome, lysosome; tế bào thực vật có thêm thành tế bào, lục lạp, không bào; vi khuẩn có vùng nhân, plasmid và roi."></canvas><span class="hint">Bấm vào bào quan</span></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Loại tế bào">
        <button class="btn" type="button" data-clt="animal" aria-pressed="true">Động vật</button>
        <button class="btn" type="button" data-clt="plant" aria-pressed="false">Thực vật</button>
        <button class="btn" type="button" data-clt="bact" aria-pressed="false">Vi khuẩn</button>
      </div>
      <h4 id="clName" style="margin:0;font-size:20px"></h4>
      <dl class="readout"><dt>Kích thước</dt><dd id="clSize" style="font:500 14px var(--body)"></dd></dl>
      <p id="clFn" style="margin:0;font-size:15px"></p>
      <p class="note-s" id="clNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvCell'), st = {};
    let type = 'animal', sel = 'nucleus', hits = [];
    const bs = [...document.querySelectorAll('#demoCell [data-clt]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); type = b.dataset.clt; sel = type === 'bact' ? 'nucleoid' : 'nucleus'; show(); }));
    const NOTES = {
      animal: 'Tế bào nhân thực: DNA nằm trong nhân có màng bao, có nhiều bào quan có màng. Tế bào người thường rộng 10–30 µm; cơ thể người có khoảng 37 nghìn tỉ tế bào.',
      plant: 'Thực vật cũng là nhân thực, nhưng có thêm thành cellulose, lục lạp và không bào lớn. Tế bào thực vật thường to hơn tế bào động vật (10–100 µm).',
      bact: 'Tế bào nhân sơ: không có nhân và không có bào quan có màng. Một vi khuẩn E. coli chỉ dài khoảng 2 µm, nhỏ hơn tế bào người khoảng 10 lần về chiều dài (hình không cùng tỉ lệ).',
    };
    function show() {
      const I = INFO[sel];
      document.getElementById('clName').innerHTML = I[0] + ' <span class="en">(' + I[1] + ')</span>';
      document.getElementById('clSize').textContent = I[2];
      document.getElementById('clFn').textContent = I[3];
      document.getElementById('clNote').textContent = NOTES[type];
      draw();
    }
    function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); } }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      hits = [];
      const cx = W / 2, cy = H / 2 + 6, hl = k => k === sel;
      const reg = (k, test) => hits.push([k, test]);
      const inE = (x0, y0, rx, ry, rot = 0) => (x, y) => { const dx = x - x0, dy = y - y0, c = Math.cos(-rot), s = Math.sin(-rot), u = dx * c - dy * s, v = dx * s + dy * c; return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1; };
      let rs = 6; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
      if (type === 'bact') {
        const rx = Math.min(W * 0.36, H * 0.62), ry = Math.min(H * 0.26, rx * 0.45);
        // roi
        ctx.strokeStyle = hl('flag') ? C.pos : '#8b929b'; ctx.lineWidth = hl('flag') ? 3 : 2; ctx.beginPath(); ctx.moveTo(cx + rx, cy);
        for (let k = 1; k <= 60; k++) ctx.lineTo(cx + rx + k * 2.2, cy + Math.sin(k * 0.35) * 10); ctx.stroke();
        reg('flag', (x, y) => x > cx + rx && x < cx + rx + 135 && Math.abs(y - cy) < 16);
        // thành + màng (hình viên thuốc)
        const pill = (pad, fill, stroke, lw) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx + pad, ry + pad, 0, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); };
        pill(10, hl('wall') ? '#f6dccb' : '#efe6d6', hl('wall') ? C.pos : '#a08a5c', hl('wall') ? 3 : 2);
        pill(0, '#f7fbf4', hl('membrane') ? C.pos : C.ink, hl('membrane') ? 3 : 1.5);
        reg('wall', (x, y) => inE(cx, cy, rx + 12, ry + 12)(x, y) && !inE(cx, cy, rx + 2, ry + 2)(x, y));
        reg('membrane', (x, y) => inE(cx, cy, rx + 3, ry + 3)(x, y) && !inE(cx, cy, rx - 4, ry - 4)(x, y));
        // vùng nhân: sợi DNA rối
        ctx.strokeStyle = hl('nucleoid') ? C.pos : C.sea; ctx.lineWidth = hl('nucleoid') ? 2.2 : 1.6; ctx.beginPath();
        for (let k = 0; k <= 220; k++) { const a = k * 0.29, r = 0.35 + 0.25 * Math.sin(k * 0.13); const x = cx - rx * 0.1 + Math.cos(a) * rx * 0.32 * r * 1.6, y = cy + Math.sin(a * 1.3) * ry * 0.45 * r * 1.4; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); reg('nucleoid', inE(cx - rx * 0.1, cy, rx * 0.36, ry * 0.5));
        // plasmid
        [[0.55, -0.45], [0.62, 0.35]].forEach(([u, v]) => { ell(ctx, cx + u * rx, cy + v * ry, 10, 7, 0, null, hl('plasmid') ? C.pos : C.sea, hl('plasmid') ? 2.5 : 1.8); reg('plasmid', inE(cx + u * rx, cy + v * ry, 14, 11)); });
        // ribosome
        const rib = []; for (let k = 0; k < 70; k++) { const a = rnd() * 7, r = Math.sqrt(rnd()) * 0.92, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r; if (!inE(cx - rx * 0.1, cy, rx * 0.36, ry * 0.5)(x, y)) rib.push([x, y]); }
        rib.forEach(([x, y]) => { ctx.fillStyle = hl('ribo') ? C.pos : '#5a4a8a'; ctx.beginPath(); ctx.arc(x, y, hl('ribo') ? 2.6 : 2, 0, 7); ctx.fill(); });
        hits.unshift(['ribo', (x, y) => rib.some(([a, b]) => Math.hypot(a - x, b - y) < 5)]);
      } else {
        const plant = type === 'plant';
        const rx = Math.min(W * 0.44, H * 0.7), ry = H * 0.42;
        if (plant) {
          ctx.fillStyle = hl('wall') ? '#d9efc9' : '#e3f0d6'; ctx.strokeStyle = hl('wall') ? C.pos : '#5f8f3c'; ctx.lineWidth = hl('wall') ? 4 : 3;
          ctx.beginPath(); ctx.roundRect(cx - rx - 10, cy - ry - 10, 2 * rx + 20, 2 * ry + 20, 18); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fbfdf7'; ctx.strokeStyle = hl('membrane') ? C.pos : C.ink; ctx.lineWidth = hl('membrane') ? 3 : 1.5; ctx.beginPath(); ctx.roundRect(cx - rx, cy - ry, 2 * rx, 2 * ry, 12); ctx.fill(); ctx.stroke();
          reg('wall', (x, y) => Math.abs(x - cx) < rx + 12 && Math.abs(y - cy) < ry + 12 && !(Math.abs(x - cx) < rx - 1 && Math.abs(y - cy) < ry - 1));
          reg('membrane', (x, y) => Math.abs(x - cx) < rx + 2 && Math.abs(y - cy) < ry + 2 && !(Math.abs(x - cx) < rx - 6 && Math.abs(y - cy) < ry - 6));
          // không bào
          ctx.fillStyle = hl('vacuole') ? 'rgba(216,49,42,.12)' : 'rgba(123,205,232,.25)'; ctx.strokeStyle = hl('vacuole') ? C.pos : C.sea; ctx.lineWidth = hl('vacuole') ? 2.5 : 1.5;
          ctx.beginPath(); ctx.roundRect(cx - rx * 0.15, cy - ry * 0.72, rx * 1.0, ry * 1.44, 30); ctx.fill(); ctx.stroke();
          reg('vacuole', (x, y) => x > cx - rx * 0.15 && x < cx + rx * 0.85 && Math.abs(y - cy) < ry * 0.72);
        } else {
          ell(ctx, cx, cy, rx, ry, 0, '#fdf8f3', hl('membrane') ? C.pos : C.ink, hl('membrane') ? 3 : 1.5);
          reg('membrane', (x, y) => inE(cx, cy, rx + 3, ry + 3)(x, y) && !inE(cx, cy, rx - 6, ry - 6)(x, y));
        }
        const nx = plant ? cx - rx * 0.55 : cx - rx * 0.12, ny = plant ? cy - ry * 0.35 : cy, nr = Math.min(rx, ry) * (plant ? 0.3 : 0.36);
        // lưới nội chất hạt: các cung quanh nhân
        for (let k = 0; k < 3; k++) { const r = nr + 10 + k * 9; ctx.strokeStyle = hl('rer') ? C.pos : '#7d6bb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nx, ny, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
          for (let a = 0.18; a < 0.85; a += 0.07) { ctx.fillStyle = hl('rer') ? C.pos : '#5a4a8a'; ctx.beginPath(); ctx.arc(nx + Math.cos(a * Math.PI) * (r + 3), ny + Math.sin(a * Math.PI) * (r + 3), 1.6, 0, 7); ctx.fill(); } }
        reg('rer', (x, y) => { const d = Math.hypot(x - nx, y - ny), a = Math.atan2(y - ny, x - nx); return d > nr + 5 && d < nr + 34 && a > 0.4 && a < 2.7; });
        // lưới nội chất trơn
        ctx.strokeStyle = hl('ser') ? C.pos : '#9a83c9'; ctx.lineWidth = 3; ctx.beginPath();
        const sx = nx - nr - 30, sy = ny - nr * 0.6; for (let k = 0; k <= 30; k++) { const x = sx - 30 + k * 2, y = sy + Math.sin(k * 0.6) * 7; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
        reg('ser', (x, y) => x > sx - 34 && x < sx + 34 && Math.abs(y - sy) < 14);
        // nhân
        ell(ctx, nx, ny, nr, nr, 0, hl('nucleus') ? '#f6dede' : '#e9e4f5', hl('nucleus') ? C.pos : '#5a4a8a', hl('nucleus') ? 3.5 : 2.5);
        ctx.strokeStyle = 'rgba(90,74,138,.35)'; ctx.lineWidth = 1; for (let k = 0; k < 6; k++) { ctx.beginPath(); const a0 = k; ctx.moveTo(nx + Math.cos(a0) * nr * 0.7, ny + Math.sin(a0) * nr * 0.7); ctx.quadraticCurveTo(nx + Math.cos(a0 + 1) * nr * 0.2, ny + Math.sin(a0 + 2) * nr * 0.3, nx + Math.cos(a0 + 2.2) * nr * 0.65, ny + Math.sin(a0 + 2.2) * nr * 0.65); ctx.stroke(); }
        ell(ctx, nx + nr * 0.25, ny - nr * 0.2, nr * 0.28, nr * 0.25, 0, hl('nucleolus') ? C.pos : '#5a4a8a', null);
        hits.unshift(['nucleolus', inE(nx + nr * 0.25, ny - nr * 0.2, nr * 0.3, nr * 0.27)]);
        reg('nucleus', inE(nx, ny, nr, nr));
        // Golgi
        const gx = plant ? cx - rx * 0.5 : cx + rx * 0.45, gy = plant ? cy + ry * 0.45 : cy + ry * 0.25;
        for (let k = 0; k < 4; k++) { ctx.strokeStyle = hl('golgi') ? C.pos : '#c27b2a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(gx, gy + 30 + k * 7, 26 - k * 2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
        ctx.lineCap = 'butt'; reg('golgi', (x, y) => Math.abs(x - gx) < 26 && y > gy + 2 && y < gy + 30);
        // ty thể
        const mitos = plant ? [[-0.6, 0.62, 0.3], [-0.2, 0.75, -0.2]] : [[0.4, -0.45, 0.4], [0.6, 0.05, -0.6], [-0.45, 0.55, 0.2], [0.15, 0.62, -0.1]];
        mitos.forEach(([u, v, rot]) => { const x = cx + u * rx, y = cy + v * ry, a = 22, b = 10;
          ell(ctx, x, y, a, b, rot, hl('mito') ? '#f8d0cd' : '#f5d9b8', hl('mito') ? C.pos : '#b05d1e', hl('mito') ? 2.5 : 1.6);
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.strokeStyle = '#b05d1e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-a + 5, 0); for (let k = 0; k < 7; k++) ctx.lineTo(-a + 8 + k * 5, k % 2 ? -b + 3 : b - 3); ctx.stroke(); ctx.restore();
          hits.unshift(['mito', inE(x, y, a + 2, b + 3, rot)]); });
        // lục lạp
        if (plant) [[0.45, -0.85], [-0.75, 0.25], [0.95, 0.85], [-0.85, -0.85]].forEach(([u, v]) => { const x = cx + u * rx * 0.9, y = cy + v * ry * 0.85;
          ell(ctx, x, y, 22, 12, 0.3, hl('chloro') ? '#f8d0cd' : '#9fd27e', hl('chloro') ? C.pos : '#3f7a25', hl('chloro') ? 2.5 : 1.6);
          ctx.fillStyle = '#3f7a25'; for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 7 - 2, y - 4, 4, 8);
          hits.unshift(['chloro', inE(x, y, 24, 14, 0.3)]); });
        // lysosome
        if (!plant) [[0.75, -0.2], [-0.6, -0.55], [0.3, 0.35]].forEach(([u, v]) => { const x = cx + u * rx, y = cy + v * ry; ell(ctx, x, y, 7, 7, 0, hl('lyso') ? C.pos : '#d9a441', '#7a5a12', 1.2); hits.unshift(['lyso', inE(x, y, 10, 10)]); });
        // ribosome tự do
        const rib = []; for (let k = 0; k < 60; k++) { const a = rnd() * 7, r = 0.3 + rnd() * 0.62, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r; if (Math.hypot(x - nx, y - ny) > nr + 40) rib.push([x, y]); }
        rib.forEach(([x, y]) => { ctx.fillStyle = hl('ribo') ? C.pos : '#5a4a8a'; ctx.beginPath(); ctx.arc(x, y, hl('ribo') ? 2.4 : 1.8, 0, 7); ctx.fill(); });
        hits.unshift(['ribo', (x, y) => rib.some(([a, b]) => Math.hypot(a - x, b - y) < 5)]);
      }
      ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(TYPES[type] + ' (sơ đồ, không đúng tỉ lệ)', 10, 8);
    }
    cv.addEventListener('click', ev => {
      const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      const h = hits.find(([, t]) => t(x, y)); if (h) { sel = h[0]; show(); }
    });
    watchCanvas(cv, st, draw);
    show();
  },
});
})();
