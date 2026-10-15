/* =====================================================================
   Ảnh y khoa: minh họa "Dựng ảnh CT từ các phép chiếu" (id: ct-recon, trang 2-ct.html)
   - Phantom Shepp–Logan cải tiến (10 elip). Phép chiếu tính chính xác bằng công thức tích phân đường của elip.
   - Sinogram: mỗi hàng là một góc chiếu (0° … 180°), mỗi cột là một vị trí đầu thu.
   - Tái tạo: chiếu ngược (backprojection), có hoặc không lọc ramp (Ram-Lak, dạng không gian).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt } = LT;
const SL = [ // A, a, b, x0, y0, phi(độ)
  [1, .69, .92, 0, 0, 0], [-.8, .6624, .874, 0, -.0184, 0], [-.2, .11, .31, .22, 0, -18], [-.2, .16, .41, -.22, 0, 18],
  [.1, .21, .25, 0, .35, 0], [.1, .046, .046, 0, .1, 0], [.1, .046, .046, 0, -.1, 0], [.1, .046, .023, -.08, -.605, 0],
  [.1, .023, .023, 0, -.606, 0], [.1, .023, .046, .06, -.605, 0]];
const N = 96, ND = 137, D = 2 * Math.SQRT2 / (ND - 1);   // ảnh N×N trên [−1,1]²; ND vị trí đầu thu trên [−√2, √2]
const tPos = d => -Math.SQRT2 + d * D;
function phantom() {
  const f = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N * 2 - 1, y = 1 - (j + 0.5) / N * 2; let v = 0;
    for (const [A, a, b, x0, y0, ph] of SL) { const p = ph * Math.PI / 180, dx = x - x0, dy = y - y0, u = dx * Math.cos(p) + dy * Math.sin(p), w = -dx * Math.sin(p) + dy * Math.cos(p); if ((u / a) ** 2 + (w / b) ** 2 <= 1) v += A; }
    f[j * N + i] = v;
  }
  return f;
}
function project(th) {   // tích phân đường chính xác của các elip tại góc th
  const p = new Float32Array(ND), c = Math.cos(th), s = Math.sin(th);
  for (const [A, a, b, x0, y0, ph] of SL) {
    const q = th - ph * Math.PI / 180, s2 = a * a * Math.cos(q) ** 2 + b * b * Math.sin(q) ** 2, sh = x0 * c + y0 * s;
    for (let d = 0; d < ND; d++) { const t = tPos(d) - sh; if (t * t < s2) p[d] += 2 * A * a * b * Math.sqrt(s2 - t * t) / s2; }
  }
  return p;
}
const KER = (() => { const h = new Float32Array(2 * ND - 1); for (let n = -(ND - 1); n < ND; n++) h[n + ND - 1] = n === 0 ? 1 / (4 * D * D) : n % 2 ? -1 / (n * n * Math.PI * Math.PI * D * D) : 0; return h; })();
const filt = p => { const q = new Float32Array(ND); for (let d = 0; d < ND; d++) { let s = 0; for (let k = 0; k < ND; k++) s += p[k] * KER[d - k + ND - 1]; q[d] = s * D; } return q; };
LT.demo('ct-recon', {
  html: `<div class="demo-title"><h4>Dựng ảnh CT từ các phép chiếu</h4><span>Vật thể → sinogram → ảnh tái tạo; thêm góc chiếu, bật/tắt bộ lọc</span></div>
  <div class="demo-body stack">
    <div class="stagebox"><div class="tri">
      <div><canvas id="ctA" role="img" aria-label="Phantom Shepp-Logan"></canvas><div class="cap">Vật thể thật (phantom)</div></div>
      <div><canvas id="ctB" role="img" aria-label="Sinogram"></canvas><div class="cap">Sinogram (hàng = góc 0°→180°, cột = đầu thu); hàng đậm là các góc đã chiếu</div></div>
      <div><canvas id="ctC" role="img" aria-label="Ảnh tái tạo"></canvas><div class="cap" id="ctCap">Ảnh tái tạo</div></div>
    </div></div>
    <div class="panel" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 24px">
      <div class="ctrl"><label for="ctK">Số góc chiếu (trong 180°)</label><output for="ctK"></output><input type="range" id="ctK" min="0" max="8" step="1" value="3"></div>
      <div>
        <div class="checks"><label><input type="checkbox" id="ctF" checked> Lọc ramp trước khi chiếu ngược</label><label><input type="checkbox" id="ctW" checked> Cửa sổ "não" (làm rõ mô mềm)</label></div>
        <p class="note-s" style="margin-top:6px">Sai số so với vật thể thật (RMSE): <b id="ctE" class="kv">—</b></p>
      </div>
      <p class="note-s" id="ctNote" style="grid-column:1/-1"></p>
    </div>
  </div>`,
  init(root) {
    const KS = [1, 2, 4, 8, 16, 32, 60, 90, 180];
    const truth = phantom(), sino = [], ang = [];
    for (let a = 0; a < 180; a++) { ang.push(a * Math.PI / 180); sino.push(project(a * Math.PI / 180)); }
    const filtered = sino.map(filt);
    const cvs = ['ctA', 'ctB', 'ctC'].map(id => root.querySelector('#' + id));
    const fC = root.querySelector('#ctF'), wC = root.querySelector('#ctW');
    const rK = range('ctK', { map: v => KS[v], show: v => v + ' góc', onInput: draw });
    fC.addEventListener('change', draw); wC.addEventListener('change', draw);
    const put = (cv, w, h, val) => { cv.width = w; cv.height = h; const g = cv.getContext('2d'), im = g.createImageData(w, h); for (let p = 0; p < w * h; p++) { const v = Math.max(0, Math.min(255, val(p) * 255)); im.data[p * 4] = im.data[p * 4 + 1] = im.data[p * 4 + 2] = v; im.data[p * 4 + 3] = 255; } g.putImageData(im, 0, 0); };
    function draw() {
      const K = rK.get(), step = 180 / K, idx = []; for (let k = 0; k < K; k++) idx.push(Math.round(k * step));
      const win = wC.checked ? v => (v - 0.05) / 0.3 : v => v;   // cửa sổ: 0,05…0,35 (mô mềm) hoặc 0…1
      put(cvs[0], N, N, p => win(truth[p]));
      // sinogram: chỉ hiện các hàng đã chiếu
      let smax = 0; sino.forEach(r => r.forEach(v => { if (v > smax) smax = v; }));
      const used = new Set(idx);
      put(cvs[1], ND, 180, p => { const a = Math.floor(p / ND), d = p % ND; return used.has(a) ? sino[a][d] / smax : 0.82 + 0.16 * sino[a][d] / smax; });
      // chiếu ngược
      const rec = new Float32Array(N * N), src = fC.checked ? filtered : sino;
      for (const a of idx) {
        const c = Math.cos(ang[a]), s = Math.sin(ang[a]), q = src[a];
        for (let j = 0; j < N; j++) { const y = 1 - (j + 0.5) / N * 2; for (let i = 0; i < N; i++) {
          const x = (i + 0.5) / N * 2 - 1, t = (x * c + y * s + Math.SQRT2) / D, d0 = Math.floor(t), fr = t - d0;
          if (d0 >= 0 && d0 < ND - 1) rec[j * N + i] += q[d0] * (1 - fr) + q[d0 + 1] * fr;
        } }
      }
      let scale;
      if (fC.checked) scale = Math.PI / K;   // FBP: đúng thang giá trị
      else { let m = 0, mt = 0; for (let p = 0; p < N * N; p++) { if (rec[p] > m) m = rec[p]; if (truth[p] > mt) mt = truth[p]; } scale = mt / (m || 1); }   // chiếu ngược thường: chỉ chuẩn hóa để xem
      let se = 0; for (let p = 0; p < N * N; p++) { rec[p] *= scale; se += (rec[p] - truth[p]) ** 2; }
      put(cvs[2], N, N, p => win(rec[p]));
      setTxt('ctE', num(Math.sqrt(se / (N * N)), 3));
      root.querySelector('#ctCap').textContent = (fC.checked ? 'Chiếu ngược có lọc (FBP)' : 'Chiếu ngược không lọc') + ', ' + K + ' góc';
      setTxt('ctNote', !fC.checked
        ? 'Không lọc: mỗi phép chiếu bị "trải" đều ngược lại trên đường đi của tia, nên ảnh bị mờ như nhòe sương (độ mờ giảm theo 1/r quanh mỗi điểm). Bật lọc ramp để khử mờ.'
        : K < 16 ? 'Quá ít góc: ảnh có vệt sọc hình nan quạt theo hướng các tia. Máy CT thật lấy khoảng 1000 góc mỗi vòng quay.'
        : 'Lọc ramp khuếch đại chi tiết (tần số cao) trước khi chiếu ngược, bù cho độ mờ của phép chiếu ngược. Đây là thuật toán FBP, nền tảng của CT suốt nhiều thập kỷ.');
    }
    rK.upd();
  },
});
})();
