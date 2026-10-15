/* =====================================================================
   Ảnh y khoa: minh họa "Một điểm, nhiều tọa độ" (id: coord-sys, trang 5-he-toa-do.html)
   Lát cắt ngang (axial) của đầu giả lập; lưới voxel có thể nghiêng so với trục cơ thể.
   Kéo dấu chữ thập: hiện chỉ số voxel (i, j, k), tọa độ RAS+ (NIfTI, MNI) và LPS+ (DICOM, ITK), cùng ma trận affine.
   Quy ước hiển thị: thần kinh (bên phải bệnh nhân ở bên phải màn hình) hoặc X quang (bên phải bệnh nhân ở bên trái màn hình).
   Trong khối giả định: i tăng về phía phải bệnh nhân, j về phía trước, k lên trên (khi góc nghiêng = 0).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt, drag, pressGroup } = LT;
const FOV = 220;   // mm, cạnh vùng nhìn
LT.demo('coord-sys', {
  html: `<div class="demo-title"><h4>Một điểm, nhiều tọa độ</h4><span>Kéo dấu chữ thập; đổi quy ước hiển thị, kích thước voxel, góc nghiêng</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCs" class="ar" role="img" aria-label="Lát cắt ngang của đầu với lưới voxel và dấu chữ thập"></canvas><span class="hint" style="top:8px;bottom:auto;left:auto;right:10px">Kéo để di chuyển dấu chữ thập</span></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Quy ước hiển thị">
        <button class="btn" type="button" data-cs="neuro" aria-pressed="false">Quy ước thần kinh</button><button class="btn" type="button" data-cs="radio" aria-pressed="true">Quy ước X quang</button>
      </div>
      <div class="ctrl"><label for="csV">Kích thước voxel (trong lát)</label><output for="csV"></output><input type="range" id="csV" min="2" max="12" step="0.5" value="8"></div>
      <div class="ctrl"><label for="csA">Góc nghiêng lưới voxel</label><output for="csA"></output><input type="range" id="csA" min="-30" max="30" value="0"></div>
      <div class="ctrl"><label for="csK">Lát k (dày 4 mm)</label><output for="csK"></output><input type="range" id="csK" min="0" max="39" value="22"></div>
      <dl class="readout" aria-live="polite">
        <dt>Voxel (i, j, k)</dt><dd class="big" id="csI">—</dd>
        <dt>RAS+ (mm)</dt><dd id="csR">—</dd><dt>LPS+ (mm)</dt><dd id="csL">—</dd>
      </dl>
      <div><p class="note-s" style="margin-bottom:4px">Ma trận affine (voxel → RAS+):</p><table class="mat" id="csM"></table></div>
      <p class="note-s" id="csNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvCs'), st = {};
    let conv = 'radio', P = [-35, 20], G = null;   // điểm đang chọn (RAS, mm); mặc định ở bán cầu TRÁI phía trước
    const bs = [...root.querySelectorAll('[data-cs]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); conv = b.dataset.cs; draw(); }));
    const rV = range('csV', { show: v => num(v, 3) + ' mm', onInput: draw }), rA = range('csA', { show: v => v + '°', onInput: draw }), rK = range('csK', { show: v => String(v), onInput: draw });
    drag(cv, { pick: (x, y) => G && x > G.ox && x < G.ox + G.S && y > G.oy && y < G.oy + G.S ? 1 : null,
      move: (o, x, y) => { P = [G.wx(x), G.wy(y)].map(v => Math.max(-FOV / 2, Math.min(FOV / 2, v))); draw(); } });
    function affine() {
      const d = rV.get(), a = rA.get() * Math.PI / 180, n = Math.ceil(FOV / d), c = (n - 1) / 2, dz = 4, nk = 40, ck = 20;
      const R = [[Math.cos(a), -Math.sin(a)], [Math.sin(a), Math.cos(a)]];
      const tx = -(R[0][0] * c * d + R[0][1] * c * d), ty = -(R[1][0] * c * d + R[1][1] * c * d);
      return { d, a, n, c, A: [[R[0][0] * d, R[0][1] * d, 0, tx], [R[1][0] * d, R[1][1] * d, 0, ty], [0, 0, dz, -ck * dz], [0, 0, 0, 1]] };
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, font = getComputedStyle(document.body).fontFamily, F = affine(), A = F.A, k = rK.get(), z = A[2][2] * k + A[2][3];
      const S = Math.min(W, H) - 60, ox = (W - S) / 2, oy = 30, flip = conv === 'radio' ? -1 : 1;
      const sx = x => ox + S / 2 + flip * x / FOV * S, sy = y => oy + S / 2 - y / FOV * S;   // RAS → màn hình (trước ở trên)
      G = { ox, oy, S, wx: px => flip * (px - ox - S / 2) / S * FOV, wy: py => -(py - oy - S / 2) / S * FOV };
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#111'; ctx.fillRect(ox, oy, S, S);
      // đầu: elip (kích thước theo z), mũi ở phía trước, tổn thương ở bán cầu trái
      const sc = Math.sqrt(Math.max(0, 1 - ((z - 10) / 95) ** 2));
      if (sc > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, S, S); ctx.clip();
        ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.ellipse(sx(0), sy(0), 75 * sc / FOV * S, 92 * sc / FOV * S, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.ellipse(sx(0), sy(0), 66 * sc / FOV * S, 83 * sc / FOV * S, 0, 0, 2 * Math.PI); ctx.fill();
        if (z < 20 && z > -40) { ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.moveTo(sx(-12), sy(88 * sc)); ctx.lineTo(sx(0), sy(108 * sc)); ctx.lineTo(sx(12), sy(88 * sc)); ctx.fill(); }
        ctx.fillStyle = '#555'; ctx.beginPath(); ctx.ellipse(sx(-6), sy(-5), 5 / FOV * S, 26 * sc / FOV * S, 0, 0, 2 * Math.PI); ctx.ellipse(sx(6), sy(-5), 5 / FOV * S, 26 * sc / FOV * S, 0, 0, 2 * Math.PI); ctx.fill();
        if (Math.abs(z - 15) < 22) { ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(sx(-38), sy(18), 12 * Math.sqrt(1 - ((z - 15) / 22) ** 2) / FOV * S, 0, 2 * Math.PI); ctx.fill(); }
        // lưới voxel
        if (F.d >= 3) {
          ctx.strokeStyle = 'rgba(123,205,232,.35)'; ctx.lineWidth = 1; ctx.beginPath();
          const vx = (i, j) => [A[0][0] * i + A[0][1] * j + A[0][3], A[1][0] * i + A[1][1] * j + A[1][3]];
          for (let i = -0.5; i <= F.n - 0.5; i++) { const p = vx(i, -0.5), q = vx(i, F.n - 0.5); ctx.moveTo(sx(p[0]), sy(p[1])); ctx.lineTo(sx(q[0]), sy(q[1])); }
          for (let j = -0.5; j <= F.n - 0.5; j++) { const p = vx(-0.5, j), q = vx(F.n - 0.5, j); ctx.moveTo(sx(p[0]), sy(p[1])); ctx.lineTo(sx(q[0]), sy(q[1])); }
          ctx.stroke();
          const o = vx(0, 0), ie = vx(4, 0), je = vx(0, 4);   // gốc voxel (0,0) và hướng i, j
          LT.arrow(ctx, sx(o[0]), sy(o[1]), sx(ie[0]), sy(ie[1]), C.gold, 2.5, 8); LT.arrow(ctx, sx(o[0]), sy(o[1]), sx(je[0]), sy(je[1]), '#3f9d6a', 2.5, 8);
          ctx.font = '600 12px ' + font; ctx.fillStyle = C.gold; ctx.fillText('i', sx(ie[0]) + 4, sy(ie[1]) - 4); ctx.fillStyle = '#3f9d6a'; ctx.fillText('j', sx(je[0]) + 4, sy(je[1]) - 4);
        }
        ctx.restore();
      }
      // dấu chữ thập
      ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx(P[0]), oy); ctx.lineTo(sx(P[0]), oy + S); ctx.moveTo(ox, sy(P[1])); ctx.lineTo(ox + S, sy(P[1])); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx(P[0]), sy(P[1]), 5, 0, 2 * Math.PI); ctx.fillStyle = C.pos; ctx.fill();
      // nhãn hướng
      ctx.font = '700 15px ' + font; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A (trước)', ox + S / 2, oy - 14); ctx.fillText('P (sau)', ox + S / 2, oy + S + 14);
      ctx.save(); ctx.translate(ox - 14, oy + S / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(flip < 0 ? 'R (phải bệnh nhân)' : 'L (trái bệnh nhân)', 0, 0); ctx.restore();
      ctx.save(); ctx.translate(ox + S + 14, oy + S / 2); ctx.rotate(Math.PI / 2); ctx.fillText(flip < 0 ? 'L (trái bệnh nhân)' : 'R (phải bệnh nhân)', 0, 0); ctx.restore();
      // tọa độ
      const det = A[0][0] * A[1][1] - A[0][1] * A[1][0], dx = P[0] - A[0][3], dy = P[1] - A[1][3];
      const fi = (A[1][1] * dx - A[0][1] * dy) / det, fj = (-A[1][0] * dx + A[0][0] * dy) / det;
      const inside = fi > -0.5 && fj > -0.5 && fi < F.n - 0.5 && fj < F.n - 0.5;
      const v = n => num(Math.round(n * 10) / 10, 4);
      setTxt('csI', inside ? `(${Math.round(fi)}, ${Math.round(fj)}, ${k})` : 'ngoài khối');
      setTxt('csR', `(${v(P[0])}, ${v(P[1])}, ${v(z)})`); setTxt('csL', `(${v(-P[0])}, ${v(-P[1])}, ${v(z)})`);
      root.querySelector('#csM').innerHTML = A.map(r => '<tr>' + r.map(x => `<td>${num(Math.round(x * 100) / 100, 4)}</td>`).join('') + '</tr>').join('');
      const side = P[0] < -2 ? 'bán cầu TRÁI' : P[0] > 2 ? 'bán cầu PHẢI' : 'đường giữa';
      setTxt('csNote', `Điểm đang chọn nằm ở ${side} của bệnh nhân (x RAS ${P[0] < 0 ? 'âm' : 'dương'}). ` + (conv === 'radio'
        ? 'Quy ước X quang: nhìn như đứng ở chân bệnh nhân nhìn lên, nên bên trái bệnh nhân hiện ở bên PHẢI màn hình.'
        : 'Quy ước thần kinh: nhìn như từ đỉnh đầu xuống, bên trái bệnh nhân ở bên TRÁI màn hình.') + ' Tọa độ RAS và LPS không đổi khi đổi quy ước hiển thị: chỉ hình ảnh bị lật.');
    }
    watchCanvas(cv, st, draw); rV.upd(); rA.upd(); rK.upd();
  },
});
})();
