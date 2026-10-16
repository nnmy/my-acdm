/* =====================================================================
   Không dây: minh họa "Định vị bằng thời gian" (id: trilateration, trang 6-ve-tinh.html)
   Nhúng vào trang: <div class="demo" id="demoTri" data-demo="trilateration"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=trilateration

   Mô hình 2D thu nhỏ (đơn vị km). Mỗi vệ tinh i cho một "giả khoảng cách":
     ρ_i = |p − s_i| + c·b + nhiễu_i
   b: sai lệch đồng hồ máy thu (giống nhau với mọi vệ tinh), c: tốc độ ánh sáng (1 µs ≈ 0,3 km).
   Máy thu giải (x, y, c·b) từ 3 phương trình bằng Gauss–Newton (bình phương tối thiểu).
   Ngoài đời là 3D nên cần 4 vệ tinh: 3 ẩn vị trí + 1 ẩn đồng hồ.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas, FONT } = WL;
const CKM = 0.299792458;          // km mỗi micro giây
const SCOL = ['#3787c4', '#d8312a', '#2e9d4f'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(r) { return Math.sqrt(-2 * Math.log(Math.max(1e-12, r()))) * Math.cos(2 * Math.PI * r()); }
// giải hệ tuyến tính nhỏ A·x = b (khử Gauss)
function solve(A, b) {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]]; if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
  return x;
}

WL.demo('trilateration', {
  html: `<div class="demo-title"><h4>Định vị bằng thời gian</h4><span>Kéo máy thu hoặc vệ tinh; chỉnh sai lệch đồng hồ và nhiễu</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvTri" class="ar grab" role="img" aria-label="Ba vệ tinh và một máy thu trên mặt phẳng. Quanh mỗi vệ tinh là một vòng tròn có bán kính bằng khoảng cách đo được; vị trí tính ra là chỗ ba vòng tròn gặp nhau."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="trB">Đồng hồ máy thu lệch</label><output for="trB"></output><input type="range" id="trB" min="-15" max="15" step="0.1" value="6"></div>
      <div class="ctrl"><label for="trN">Nhiễu đo (mỗi vệ tinh)</label><output for="trN"></output><input type="range" id="trN" min="0" max="1" step="0.01" value="0.1"></div>
      <div class="checks"><label><input type="checkbox" id="trSolve" checked> Máy thu tự giải luôn sai lệch đồng hồ</label></div>
      <div class="btnrow"><button type="button" class="btn" id="trNew">Đo lại</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Sai số vị trí</dt><dd class="big" id="trE">—</dd>
        <dt>Đồng hồ lệch (tính ra)</dt><dd id="trBe">—</dd>
      </dl>
      <p class="note-s" id="trNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvTri'), st = {};
    const sats = [{ x: -11, y: 10 }, { x: 2, y: 13 }, { x: 13, y: 8 }], rcv = { x: 1, y: -4 };
    let seed = 3, view = null, drag = null, est = null;
    const rB = range('trB', { show: v => num(v, 3) + ' µs (≈ ' + num(v * CKM * 1000, 3) + ' m)', onInput: draw });
    const rN = range('trN', { show: v => num(v * 1000, 3) + ' m', onInput: draw });
    const cS = document.getElementById('trSolve'); cS.addEventListener('change', draw);
    document.getElementById('trNew').addEventListener('click', () => { seed = (seed * 31 + 7) % 99991; draw(); });
    function measure() {
      const r = rng(seed), cb = rB.get() * CKM;
      return sats.map(s => Math.hypot(rcv.x - s.x, rcv.y - s.y) + cb + rN.get() * gauss(r));
    }
    function locate(rho) {
      let x = 0, y = 0, cb = 0;
      for (let it = 0; it < 30; it++) {
        const J = [], res = [];
        sats.forEach((s, i) => { const d = Math.max(1e-6, Math.hypot(x - s.x, y - s.y)); res.push(rho[i] - (d + cb)); J.push([(x - s.x) / d, (y - s.y) / d, 1]); });
        const n = cS.checked ? 3 : 2;
        const A = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => J.reduce((s, row) => s + row[a] * row[b], 0)));
        const g = Array.from({ length: n }, (_, a) => J.reduce((s, row, i) => s + row[a] * res[i], 0));
        const dx = solve(A, g); if (!dx) break;
        x += dx[0]; y += dx[1]; if (n === 3) cb += dx[2];
        if (Math.hypot(...dx) < 1e-7) break;
      }
      return { x, y, cb };
    }
    function draw() {
      const rho = measure(); est = locate(rho);
      const err = Math.hypot(est.x - rcv.x, est.y - rcv.y);
      const eEl = document.getElementById('trE'); eEl.textContent = fmt(err * 1000, 'm', 3); eEl.className = 'big ' + (err < 0.3 ? 'ok' : 'bad');
      document.getElementById('trBe').textContent = cS.checked ? num(est.cb / CKM, 3) + ' µs' : '(không tính)';
      // độ \u201cdàn trải\u201d hình học: vệ tinh càng chụm về một hướng thì sai số càng lớn
      const ang = sats.map(s => Math.atan2(s.y - rcv.y, s.x - rcv.x)).sort((a, b) => a - b);
      const spread = Math.max(...ang) - Math.min(...ang);
      document.getElementById('trNote').textContent = !cS.checked && Math.abs(rB.get()) > 0.05
        ? 'Đồng hồ máy thu lệch làm mọi khoảng cách cùng dài ra (hoặc ngắn lại) một đoạn như nhau: ba vòng tròn không còn gặp nhau ở một điểm, vị trí tính ra lệch cả cây số. Lệch 1 µs là sai 300 m.'
        : spread < 0.6 ? 'Các vệ tinh chụm về một phía: vòng tròn cắt nhau dưới góc rất hẹp, chút nhiễu cũng làm điểm giao trượt xa. Định vị chuẩn nhất khi vệ tinh rải đều khắp bầu trời.'
        : 'Coi sai lệch đồng hồ là một ẩn số nữa, máy thu tìm được cả vị trí lẫn giờ chuẩn. Nhờ vậy điện thoại không cần đồng hồ nguyên tử, chỉ cần thêm một vệ tinh.';
      if (!st.ctx) return;
      const { ctx, W, H } = st, span = 18, sc = Math.min(W, H) / (2 * span);
      view = { X: x => W / 2 + x * sc, Y: y => H / 2 + 2 * sc - y * sc, inv: (px, py) => [(px - W / 2) / sc, (H / 2 + 2 * sc - py) / sc] };
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      // vòng tròn giả khoảng cách
      sats.forEach((s, i) => {
        ctx.strokeStyle = SCOL[i]; ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(view.X(s.x), view.Y(s.y), Math.max(0, rho[i]) * sc, 0, 7); ctx.stroke();
        if (cS.checked) { ctx.globalAlpha = 0.35; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(view.X(s.x), view.Y(s.y), Math.max(0, rho[i] - est.cb) * sc, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        ctx.globalAlpha = 1;
      });
      // vệ tinh
      sats.forEach((s, i) => {
        const x = view.X(s.x), y = view.Y(s.y);
        ctx.fillStyle = SCOL[i]; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.fillRect(x - 13, y - 4, 8, 8); ctx.fillRect(x + 5, y - 4, 8, 8); ctx.strokeRect(x - 13, y - 4, 8, 8); ctx.strokeRect(x + 5, y - 4, 8, 8);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, y - 6, 10, 12); ctx.strokeRect(x - 5, y - 6, 10, 12);
        ctx.fillStyle = C.ink; ctx.font = FONT(11.5, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('VT ' + (i + 1), x, y - 9);
      });
      // máy thu thật + vị trí tính ra
      const rx = view.X(rcv.x), ry = view.Y(rcv.y);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(rx - 6, ry - 10, 12, 20); ctx.strokeRect(rx - 6, ry - 10, 12, 20);
      ctx.fillStyle = C.ink; ctx.font = FONT(11.5, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('vị trí thật', rx + 10, ry + 2);
      const ex = view.X(est.x), ey = view.Y(est.y);
      ctx.strokeStyle = C.pos; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 8, ey - 8); ctx.lineTo(ex + 8, ey + 8); ctx.moveTo(ex + 8, ey - 8); ctx.lineTo(ex - 8, ey + 8); ctx.stroke();
      ctx.fillStyle = C.pos; ctx.textAlign = 'right'; ctx.fillText('máy thu tính ra', ex - 12, ey - 10);
      ctx.font = FONT(11.5); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const cap = W < 520 ? 'liền: đo được' + (cS.checked ? '; đứt: đã trừ lệch đồng hồ' : '') : 'vòng liền: khoảng cách đo được' + (cS.checked ? '; vòng đứt: sau khi trừ sai lệch đồng hồ' : '');
      ctx.fillStyle = 'rgba(251,252,253,.9)'; ctx.fillRect(6, 5, ctx.measureText(cap).width + 8, 18);
      ctx.fillStyle = C.muted; ctx.fillText(cap, 10, 8);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, H - 14); ctx.lineTo(10 + 5 * sc, H - 14); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textBaseline = 'bottom'; ctx.fillText('5 km (mô hình 2D thu nhỏ)', 10, H - 18);
    }
    const pos = e => { const r = cv.getBoundingClientRect(); return view.inv(e.clientX - r.left, e.clientY - r.top); };
    cv.addEventListener('pointerdown', e => {
      if (!view) return; const [x, y] = pos(e), tol = 22 / (Math.min(st.W, st.H) / 36);
      const all = [rcv, ...sats]; drag = all.find(p => Math.hypot(p.x - x, p.y - y) < tol) || null;
      if (drag) { cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); }
    });
    cv.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = pos(e); drag.x = Math.max(-17, Math.min(17, x)); drag.y = Math.max(-15, Math.min(19, y)); draw(); });
    const up = () => { drag = null; cv.classList.remove('grabbing'); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    watchCanvas(cv, st, draw);
    rB.upd(); rN.upd();
  },
});
})();
