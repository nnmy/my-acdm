/* =====================================================================
   Không dây: minh họa "Chòm điểm QAM và nhiễu" (id: constellation, trang 2-dieu-che.html)
   Nhúng vào trang: <div class="demo" id="demoQam" data-demo="constellation"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=constellation

   Mỗi ký hiệu là một điểm trên mặt phẳng (biên độ + pha). M điểm -> log2(M) bit mỗi ký hiệu.
   Máy thu nhận điểm bị nhiễu đẩy lệch (nhiễu Gauss, phương sai mỗi chiều = Es / (2·SNR), Es = 1),
   rồi đoán điểm gốc là điểm lý tưởng gần nhất. Đoán sai = lỗi ký hiệu.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, FONT } = WL;
const MODES = [['BPSK', 2], ['QPSK', 4], ['16-QAM', 16], ['64-QAM', 64], ['256-QAM', 256], ['1024-QAM', 1024]];
const NSYM = 1500;

function points(M) {
  if (M === 2) return [[-1, 0], [1, 0]];
  const m = Math.round(Math.sqrt(M)), pts = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) pts.push([2 * i - m + 1, 2 * j - m + 1]);
  const es = pts.reduce((s, p) => s + p[0] * p[0] + p[1] * p[1], 0) / pts.length, k = 1 / Math.sqrt(es);
  return pts.map(p => [p[0] * k, p[1] * k]);
}
// số ngẫu nhiên có hạt giống (để hình không nhảy lung tung khi kéo SNR)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(r) { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

WL.demo('constellation', {
  html: `<div class="demo-title"><h4>Chòm điểm QAM và nhiễu</h4><span>Chọn kiểu điều chế, kéo tỉ số tín hiệu/nhiễu</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvQam" class="ar" role="img" aria-label="Mặt phẳng chòm điểm: các dấu cộng là điểm lý tưởng, các chấm là ký hiệu thu được sau khi bị nhiễu; chấm màu đỏ là ký hiệu bị đoán sai."></canvas></div>
    <div class="panel">
      <div class="seg-btns" id="qmM">${MODES.map((m, i) => `<button type="button" class="btn" data-i="${i}">${m[0]}</button>`).join('')}</div>
      <div class="ctrl"><label for="qmS">Tỉ số tín hiệu/nhiễu (SNR)</label><output for="qmS"></output><input type="range" id="qmS" min="0" max="40" step="0.5" value="18"></div>
      <dl class="readout" aria-live="polite">
        <dt>Số bit mỗi ký hiệu</dt><dd class="big" id="qmB">—</dd>
        <dt>Ký hiệu bị đoán sai</dt><dd id="qmE">—</dd>
        <dt>Kiểu nhanh nhất còn &lt; 1% lỗi</dt><dd id="qmBest">—</dd>
      </dl>
      <div class="btnrow"><button type="button" class="btn" id="qmNew">Phát lại chuỗi khác</button></div>
      <p class="note-s" id="qmNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvQam'), st = {};
    let mode = 2, seed = 7;
    const rS = range('qmS', { show: v => num(v, 3) + ' dB', onInput: draw });
    const mb = document.getElementById('qmM');
    mb.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; mode = +b.dataset.i; draw(); });
    document.getElementById('qmNew').addEventListener('click', () => { seed = (seed * 7 + 13) % 100000; draw(); });
    function simulate(M, snrDb, sd) {
      const P = points(M), r = rng(sd), sig = Math.sqrt(1 / (2 * Math.pow(10, snrDb / 10)));
      const rx = []; let err = 0;
      for (let n = 0; n < NSYM; n++) {
        const k = Math.floor(r() * M), p = P[k], x = p[0] + sig * gauss(r), y = (M === 2 ? 0 : p[1]) + sig * gauss(r);
        // điểm gần nhất: lưới vuông nên chỉ cần làm tròn từng trục
        let wrong;
        if (M === 2) wrong = (x >= 0 ? 1 : 0) !== k;
        else {
          const m = Math.round(Math.sqrt(M)), u = P[1][1] - P[0][1];          // u = khoảng cách 2 điểm kề nhau
          const near = v => Math.max(0, Math.min(m - 1, Math.round((v / u * 2 + m - 1) / 2)));
          wrong = near(x) * m + near(y) !== k;
        }
        if (wrong) err++;
        rx.push([x, y, wrong]);
      }
      return { P, rx, ser: err / NSYM };
    }
    function draw() {
      const M = MODES[mode][1], snr = rS.get(), sim = simulate(M, snr, seed);
      mb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === mode)));
      document.getElementById('qmB').textContent = Math.log2(M) + ' bit';
      const eEl = document.getElementById('qmE'); eEl.textContent = num(sim.ser * 100, 3) + ' %'; eEl.className = sim.ser < 0.01 ? 'ok' : 'bad';
      let best = null; for (let i = MODES.length - 1; i >= 0; i--) { if (simulate(MODES[i][1], snr, 99).ser < 0.01) { best = i; break; } }
      document.getElementById('qmBest').textContent = best === null ? 'không có (sóng quá yếu)' : MODES[best][0] + ' (' + Math.log2(MODES[best][1]) + ' bit)';
      document.getElementById('qmNote').textContent = sim.ser < 0.01
        ? 'Các đám chấm còn tách bạch nhau, máy thu đoán đúng gần hết. Thử chọn kiểu nhiều điểm hơn: mỗi ký hiệu chở nhiều bit hơn, nhưng các điểm khít lại nên dễ lẫn.'
        : 'Nhiễu làm các đám chấm lấn qua nhau: nhiều ký hiệu bị đoán sai (chấm đỏ). Wi-Fi và 4G sẽ tự hạ xuống kiểu ít điểm hơn để giữ kết nối, chấp nhận chậm hơn.';
      if (!st.ctx) return;
      const { ctx, W, H } = st, S = Math.min(W, H) - 40, cx = W / 2, cy = H / 2;
      const lim = 1.7, sc = S / 2 / lim, X = x => cx + x * sc, Y = y => cy - y * sc;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(-lim), cy); ctx.lineTo(X(lim), cy); ctx.moveTo(cx, Y(-lim)); ctx.lineTo(cx, Y(lim)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = FONT(11.5, 600); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('thành phần I', X(lim), cy + 4);
      ctx.textAlign = 'left'; ctx.fillText('thành phần Q', cx + 6, Y(lim));
      const dot = M >= 256 ? 1.4 : 2;
      sim.rx.forEach(p => { if (Math.abs(p[0]) > lim || Math.abs(p[1]) > lim) return; ctx.fillStyle = p[2] ? 'rgba(216,49,42,.85)' : 'rgba(55,135,196,.45)'; ctx.fillRect(X(p[0]) - dot / 2, Y(p[1]) - dot / 2, dot, dot); });
      const cs = M >= 256 ? 2.5 : 5;
      ctx.strokeStyle = C.ink; ctx.lineWidth = M >= 256 ? 1 : 2;
      sim.P.forEach(p => { ctx.beginPath(); ctx.moveTo(X(p[0]) - cs, Y(p[1])); ctx.lineTo(X(p[0]) + cs, Y(p[1])); ctx.moveTo(X(p[0]), Y(p[1]) - cs); ctx.lineTo(X(p[0]), Y(p[1]) + cs); ctx.stroke(); });
      ctx.fillStyle = C.ink; ctx.font = FONT(12.5, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(MODES[mode][0] + ': ' + M + ' điểm', 12, 10);
      ctx.font = FONT(11.5); ctx.fillStyle = C.muted; ctx.fillText(NSYM + ' ký hiệu, SNR ' + num(snr, 3) + ' dB', 12, 28);
    }
    watchCanvas(cv, st, draw);
    rS.upd();
  },
});
})();
