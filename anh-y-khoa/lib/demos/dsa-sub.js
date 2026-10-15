/* =====================================================================
   Ảnh y khoa: minh họa "Chụp mạch xóa nền (DSA)" (id: dsa-sub, trang 3-angiography.html)
   Mô hình đơn giản: ảnh truyền qua I = exp(−(A_nền + A_mạch)) + nhiễu.
   - A_nền: mô mềm, cột sống, xương sườn (không đổi theo thời gian).
   - A_mạch: cây động mạch giả lập; nồng độ thuốc cản quang tại mỗi đoạn = hàm gamma theo (t − thời điểm thuốc tới đoạn đó).
   - DSA = ln(mask) − ln(live): chỉ còn A_mạch. Bệnh nhân cử động → mask và live lệch nhau → vệt nhiễu (misregistration).
   Mạch hẹp: một đoạn bị thu nhỏ bán kính ở giữa. Giá trị chỉ để minh họa, không theo đơn vị thật.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, setTxt, rng } = LT;
const N = 140;
function buildTree() {   // cây nhánh tất định: mỗi đoạn {x0,y0,x1,y1,r,t0,t1}
  const segs = [], r = rng(3), V = 70;   // V: tốc độ dòng (pixel/giây) để tính thời điểm thuốc tới
  const grow = (x, y, ang, len, rad, t, depth) => {
    if (depth > 6 || rad < 0.6) return;
    const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len, t1 = t + len / V;
    segs.push({ x0: x, y0: y, x1, y1, r: rad, t0: t, t1, sten: false });
    const sp = 0.32 + r() * 0.22, k = 0.76 + r() * 0.08;
    grow(x1, y1, ang - sp, len * k, rad * 0.78, t1, depth + 1);
    grow(x1, y1, ang + sp * (0.8 + r() * 0.4), len * k * 0.9, rad * 0.7, t1, depth + 1);
  };
  segs.push({ x0: N * 0.5, y0: -2, x1: N * 0.5, y1: N * 0.14, r: 4.4, t0: 0, t1: N * 0.16 / V, sten: false });
  grow(N * 0.5, N * 0.14, Math.PI / 2 - 0.5, N * 0.24, 3.4, N * 0.16 / V, 1);
  grow(N * 0.5, N * 0.14, Math.PI / 2 + 0.45, N * 0.23, 3.2, N * 0.16 / V, 1);
  segs[2].sten = true;   // hẹp ở một nhánh lớn
  return segs;
}
const bolus = dt => dt <= 0 ? 0 : Math.pow(dt / 1.2, 2) * Math.exp(2 - 2 * dt / 1.2);   // hàm gamma, đỉnh = 1 tại dt = 1,2 s
LT.demo('dsa-sub', {
  html: `<div class="demo-title"><h4>Chụp mạch xóa nền (DSA)</h4><span>Ảnh mask trước tiêm, ảnh khi có thuốc, và ảnh trừ</span></div>
  <div class="demo-body stack">
    <div class="stagebox"><div class="tri">
      <div><canvas id="dsA" role="img" aria-label="Ảnh mask trước khi tiêm thuốc"></canvas><div class="cap">Mask: chụp trước khi bơm thuốc</div></div>
      <div><canvas id="dsB" role="img" aria-label="Ảnh có thuốc cản quang"></canvas><div class="cap" id="dsBc">Live: đang có thuốc cản quang</div></div>
      <div><canvas id="dsC" role="img" aria-label="Ảnh trừ nền"></canvas><div class="cap">DSA = ln(mask) − ln(live)</div></div>
    </div></div>
    <div class="panel" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 24px">
      <div class="ctrl"><label for="dsT">Thời gian sau khi bơm thuốc</label><output for="dsT"></output><input type="range" id="dsT" min="0" max="60" value="16"></div>
      <div class="checks" style="flex-direction:column;align-items:flex-start;gap:6px">
        <label><input type="checkbox" id="dsM"> Bệnh nhân cử động (lệch 3 pixel)</label>
        <label><input type="checkbox" id="dsP"> Dịch chỉnh mask (pixel shift)</label>
      </div>
      <p class="note-s" id="dsNote" style="grid-column:1/-1"></p>
    </div>
  </div>`,
  init(root) {
    const segs = buildTree(), r = rng(11);
    const bg = new Float32Array((N + 8) * (N + 8)), M = N + 8;   // nền rộng hơn ảnh để dịch chuyển
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
      const x = i - 4, y = j - 4;
      let a = 0.8 + 0.25 * Math.exp(-(((x - N / 2) / (N * 0.45)) ** 2));                        // mô mềm, dày ở giữa
      const sx = Math.abs(x - N * 0.5); if (sx < 11) a += 0.9 * (1 - (sx / 11) ** 2) * (0.85 + 0.15 * Math.cos(y / 6.5)); // cột sống, đốt sống
      for (let k = -2; k < 6; k++) { const yy = N * 0.12 + k * 22 + 0.004 * (x - N / 2) ** 2; const d = Math.abs(y - yy); if (d < 3.2 && sx > 12) a += 0.45 * (1 - d / 3.2); } // xương sườn
      bg[j * M + i] = a;
    }
    const nz1 = new Float32Array(N * N), nz2 = new Float32Array(N * N); for (let p = 0; p < N * N; p++) { nz1[p] = r.gauss(); nz2[p] = r.gauss(); }
    const vessel = t => {   // A_mạch tại thời điểm t
      const A = new Float32Array(N * N);
      for (const s of segs) {
        const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L2 = dx * dx + dy * dy;
        const x0 = Math.max(0, Math.floor(Math.min(s.x0, s.x1) - s.r - 1)), x1 = Math.min(N - 1, Math.ceil(Math.max(s.x0, s.x1) + s.r + 1));
        const y0 = Math.max(0, Math.floor(Math.min(s.y0, s.y1) - s.r - 1)), y1 = Math.min(N - 1, Math.ceil(Math.max(s.y0, s.y1) + s.r + 1));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const u = Math.max(0, Math.min(1, ((x - s.x0) * dx + (y - s.y0) * dy) / L2)), px = s.x0 + u * dx - x, py = s.y0 + u * dy - y, d2 = px * px + py * py;
          let rr = s.r; if (s.sten) rr *= 1 - 0.65 * Math.exp(-(((u - 0.5) / 0.08) ** 2));
          if (d2 < rr * rr) { const c = bolus(t - (s.t0 + u * (s.t1 - s.t0))); const v = 0.09 * c * 2 * Math.sqrt(rr * rr - d2); if (v > A[y * N + x]) A[y * N + x] = v; }
        }
      }
      return A;
    };
    const cvs = ['dsA', 'dsB', 'dsC'].map(id => root.querySelector('#' + id));
    const mC = root.querySelector('#dsM'), pC = root.querySelector('#dsP');
    const rT = range('dsT', { map: v => v / 10, show: v => num(v, 2) + ' s', onInput: draw });
    mC.addEventListener('change', draw); pC.addEventListener('change', draw);
    const put = (cv, val) => { cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N); for (let p = 0; p < N * N; p++) { const v = Math.max(0, Math.min(255, val(p) * 255)); im.data[p * 4] = im.data[p * 4 + 1] = im.data[p * 4 + 2] = v; im.data[p * 4 + 3] = 255; } g.putImageData(im, 0, 0); };
    const B = (x, y, ox, oy) => bg[(y + 4 + oy) * M + (x + 4 + ox)];
    function draw() {
      const t = rT.get(), A = vessel(t), mv = mC.checked ? 3 : 0, fix = pC.checked && mC.checked;
      const mask = new Float32Array(N * N), live = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const p = y * N + x;
        mask[p] = Math.exp(-B(x, y, fix ? mv : 0, fix ? 1 : 0)) * (1 + 0.012 * nz1[p]);
        live[p] = Math.exp(-(B(x, y, mv, mv ? 1 : 0) + A[p])) * (1 + 0.012 * nz2[p]);
      }
      const disp = I => (I - 0.08) / 0.4;   // hiển thị kiểu X-quang: mô đặc thì tối hơn
      put(cvs[0], p => disp(mask[p])); put(cvs[1], p => disp(live[p]));
      put(cvs[2], p => 0.85 - 1.6 * (Math.log(mask[p]) - Math.log(live[p])));
      const phase = t < 0.3 ? 'Thuốc chưa tới: ảnh trừ gần như trống.' : t < 2.2 ? 'Pha động mạch: thuốc đang lan dần từ gốc ra các nhánh.' : t < 4 ? 'Thuốc đã tới các nhánh nhỏ; ở nhánh lớn thuốc bắt đầu bị rửa trôi.' : 'Thuốc đang rút khỏi động mạch (thực tế sẽ sang pha mao mạch rồi tĩnh mạch).';
      setTxt('dsNote', (mC.checked && !fix ? 'Bệnh nhân cử động giữa hai lần chụp: nền không trừ hết, bờ xương sườn và cột sống hiện thành vệt sáng tối. Bật "Dịch chỉnh mask" để dời mask cho khớp lại. ' : '')
        + phase + ' Nhìn kỹ nhánh lớn bên phải: có một đoạn thắt hẹp lại (hẹp mạch).');
    }
    rT.upd();
  },
});
})();
