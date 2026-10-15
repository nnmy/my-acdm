/* =====================================================================
   Ảnh y khoa: minh họa "TR, TE và tương phản" (id: mri-contrast, trang 1-mri.html)
   Ảnh não giả lập (phantom) theo công thức spin echo: S = PD · (1 − e^(−TR/T1)) · e^(−TE/T2).
   T1, T2, PD gần đúng ở 1,5 T (dao động theo nghiên cứu, xem mục Cơ sở của trang).
   Bên phải: đường hồi phục T1 (theo thời gian, vạch TR) và suy giảm T2 (vạch TE) của từng mô.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, setTxt, rng } = LT;
const T = [   // tên, T1 (ms), T2 (ms), PD (tương đối), màu đường
  { k: 'fat', n: 'Mỡ', T1: 260, T2: 80, PD: 0.9, c: '#e8873a' },
  { k: 'wm', n: 'Chất trắng', T1: 600, T2: 80, PD: 0.69, c: '#8f63c9' },
  { k: 'gm', n: 'Chất xám', T1: 950, T2: 100, PD: 0.8, c: '#3f9d6a' },
  { k: 'csf', n: 'Dịch não tủy', T1: 4000, T2: 2000, PD: 1.0, c: '#3787c4' },
];
const PRE = { t1: [500, 15, 'T1'], t2: [4000, 100, 'T2'], pd: [3000, 15, 'PD'] };
const sig = (t, TR, TE) => t.PD * (1 - Math.exp(-TR / t.T1)) * Math.exp(-TE / t.T2);
// bản đồ mô của phantom (tọa độ chuẩn hóa −1…1): 0 nền, 1 mỡ da đầu, 5 xương sọ, 2 chất xám, 3 chất trắng, 4 dịch não tủy
function tissue(x, y) {
  const e = (a, b, cx = 0, cy = 0) => ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2;
  const ang = Math.atan2(y, x), wob = 0.025 * Math.sin(ang * 14) + 0.015 * Math.sin(ang * 23 + 1);
  if (e(0.86, 0.96) > 1) return 0;
  if (e(0.8, 0.9) > 1) return 1;
  if (e(0.74, 0.84) > 1) return 5;
  if (e(0.71, 0.81) > 1) return 4;
  if (e(0.71 - 0.12 + wob, 0.81 - 0.12 + wob) > 1) return 2;
  // não thất bên (hai hình lưỡi liềm) và rãnh liên bán cầu
  if (Math.abs(x) < 0.02 && Math.abs(y) > 0.35) return 4;
  if (e(0.07, 0.28, -0.13, -0.02) < 1 || e(0.07, 0.28, 0.13, -0.02) < 1) return 4;
  if (e(0.13, 0.13, -0.3, 0.05) < 1 || e(0.13, 0.13, 0.3, 0.05) < 1) return 2;   // nhân xám sâu
  return 3;
}
LT.demo('mri-contrast', {
  html: `<div class="demo-title"><h4>TR, TE và tương phản</h4><span>Cùng một bộ não, đổi TR và TE thì mô nào sáng mô nào tối thay đổi</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvMri" class="ar" role="img" aria-label="Ảnh não giả lập và đường hồi phục T1, suy giảm T2"></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Kiểu ảnh">
        <button class="btn" type="button" data-mp="t1">Ảnh T1 (TR ngắn, TE ngắn)</button><button class="btn" type="button" data-mp="t2">Ảnh T2 (TR dài, TE dài)</button><button class="btn" type="button" data-mp="pd">Ảnh PD (TR dài, TE ngắn)</button>
      </div>
      <div class="ctrl"><label for="mrTR">TR: thời gian lặp lại</label><output for="mrTR"></output><input type="range" id="mrTR" min="100" max="6000" step="20" value="500"></div>
      <div class="ctrl"><label for="mrTE">TE: thời gian vọng</label><output for="mrTE"></output><input type="range" id="mrTE" min="5" max="250" step="1" value="15"></div>
      <table class="mini" aria-live="polite"><thead><tr><th>Mô</th><th>T1</th><th>T2</th><th>Tín hiệu</th></tr></thead><tbody id="mrTab"></tbody></table>
      <p class="note-s" id="mrNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvMri'), st = {}, N = 150;
    const map = new Uint8Array(N * N), noise = new Float32Array(N * N), r = rng(7);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { map[j * N + i] = tissue((i + 0.5) / N * 2 - 1, (j + 0.5) / N * 2 - 1); noise[j * N + i] = r.gauss(); }
    const off = document.createElement('canvas'); off.width = off.height = N; const octx = off.getContext('2d'), img = octx.createImageData(N, N);
    const bs = [...root.querySelectorAll('[data-mp]')];
    const rTR = range('mrTR', { show: v => v + ' ms', onInput: draw }), rTE = range('mrTE', { show: v => v + ' ms', onInput: draw });
    bs.forEach(b => b.addEventListener('click', () => { const p = PRE[b.dataset.mp]; rTR.el.value = p[0]; rTE.el.value = p[1]; rTR.upd(); rTE.upd(); }));
    function draw() {
      if (!st.ctx) return;
      const TR = rTR.get(), TE = rTE.get(), S = T.map(t => sig(t, TR, TE)), mx = Math.max(...S, 1e-6);
      const val = [0, S[0], S[2], S[1], S[3], 0];   // theo mã mô
      for (let p = 0; p < N * N; p++) { const v = Math.max(0, Math.min(1, val[map[p]] / mx + 0.02 * noise[p])) * 255; img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v; img.data[p * 4 + 3] = 255; }
      octx.putImageData(img, 0, 0);
      const { ctx, W, H } = st; ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const wide = W > 520, side = wide ? Math.min(H - 44, W * 0.56) : Math.min(W - 20, H * 0.5);
      ctx.fillStyle = '#000'; ctx.fillRect(10, 10, side, side); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 10, 10, side, side);
      const font = getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = C.ink; ctx.font = '600 13px ' + font; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`Ảnh giả lập: TR ${TR} ms, TE ${TE} ms`, 10, side + 16);
      // đồ thị T1 và T2
      const gx = wide ? side + 24 : 10, gy = wide ? 10 : side + 40, gw = wide ? W - gx - 12 : W - 20, gh = wide ? (H - 30) / 2 : (H - gy - 20) / 2;
      const graph = (y0, title, xmax, fx, mark, lab) => {
        ctx.fillStyle = '#fff'; ctx.fillRect(gx, y0, gw, gh - 6); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(gx + .5, y0 + .5, gw - 1, gh - 7);
        ctx.fillStyle = C.ink; ctx.font = '600 12.5px ' + font; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(title, gx + 6, y0 + 4);
        const X = t => gx + 4 + t / xmax * (gw - 8), Y = v => y0 + gh - 12 - v * (gh - 34);
        T.forEach(t => { ctx.strokeStyle = t.c; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const tt = i / 120 * xmax, v = fx(t, tt); i ? ctx.lineTo(X(tt), Y(v)) : ctx.moveTo(X(tt), Y(v)); } ctx.stroke(); });
        ctx.strokeStyle = C.pos; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(mark), y0 + 20); ctx.lineTo(X(mark), y0 + gh - 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.pos; ctx.font = '600 12px ' + font; ctx.textAlign = X(mark) > gx + gw - 40 ? 'right' : 'left'; ctx.fillText(lab, X(mark) + (ctx.textAlign === 'right' ? -4 : 4), y0 + 20);
        ctx.fillStyle = C.muted; ctx.font = '11px ' + font; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xmax + ' ms', gx + gw - 4, y0 + gh - 8);
      };
      graph(gy, 'Hồi phục T1 (đọc ở TR)', 6000, (t, tt) => t.PD * (1 - Math.exp(-tt / t.T1)), TR, 'TR');
      graph(gy + gh, 'Suy giảm T2 (đọc ở TE)', 300, (t, tt) => t.PD * (1 - Math.exp(-TR / t.T1)) * Math.exp(-tt / t.T2), TE, 'TE');
      root.querySelector('#mrTab').innerHTML = T.map((t, i) => `<tr><td><i style="display:inline-block;width:10px;height:10px;background:${t.c};margin-right:5px"></i>${t.n}</td><td>${t.T1}</td><td>${t.T2}</td><td>${num(S[i] / mx * 100, 3)}%</td></tr>`).join('');
      const order = T.map((t, i) => [t.n, S[i]]).sort((a, b) => b[1] - a[1]).map(x => x[0].toLowerCase());
      const kind = TR <= 800 && TE <= 30 ? 'Đây là ảnh T1: mỡ sáng, chất trắng sáng hơn chất xám, dịch não tủy tối. Hợp để xem giải phẫu và thuốc cản từ.'
        : TR >= 2500 && TE >= 80 ? 'Đây là ảnh T2: dịch (nước) sáng, chất xám sáng hơn chất trắng. Phù nề, viêm, nhiều loại u chứa nhiều nước nên sáng trên T2.'
        : TR >= 2500 && TE <= 30 ? 'Đây là ảnh mật độ proton (PD): độ sáng chủ yếu theo lượng proton, tương phản giữa các mô thấp.'
        : 'Ảnh lai: tương phản trộn giữa T1, T2 và PD.';
      setTxt('mrNote', kind + ' Thứ tự sáng → tối: ' + order.join(', ') + '.');
      bs.forEach(b => { const p = PRE[b.dataset.mp]; b.setAttribute('aria-pressed', p[0] === TR && p[1] === TE); });
    }
    watchCanvas(cv, st, draw); rTR.upd(); rTE.upd();
  },
});
})();
