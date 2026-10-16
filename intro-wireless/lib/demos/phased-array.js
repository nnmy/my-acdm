/* =====================================================================
   Không dây: minh họa "Lái chùm sóng bằng mảng ăng-ten" (id: phased-array, trang 6-ve-tinh.html)
   Nhúng vào trang: <div class="demo" id="demoArray" data-demo="phased-array"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=phased-array

   N ăng-ten xếp hàng ngang, cách nhau d = λ/2. Ăng-ten thứ n phát trễ pha n·β.
   Muốn chùm sóng chỉ về góc θ0 (tính từ phương thẳng đứng): β = −k·d·sin θ0, với k = 2π/λ.
   Hệ số mảng: AF(θ) = | Σ_n e^{i·n·(k·d·sin θ + β)} | / N
   Nền: sóng tổng của N nguồn điểm (phần thực, giảm theo 1/√r), vẽ động.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, loopWhenVisible, FONT } = WL;

WL.demo('phased-array', {
  html: `<div class="demo-title"><h4>Lái chùm sóng bằng mảng ăng-ten</h4><span>Đổi góc lái và số ăng-ten; không có bộ phận nào cử động</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvArr" class="ar" role="img" aria-label="Một hàng ăng-ten ở đáy hình phát sóng lên trên. Sóng của các ăng-ten cộng lại thành một chùm mạnh theo một hướng; đường viền cho biết độ mạnh theo từng hướng."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="paA">Góc lái θ₀</label><output for="paA"></output><input type="range" id="paA" min="-60" max="60" step="1" value="20"></div>
      <div class="ctrl"><label for="paN">Số ăng-ten N</label><output for="paN"></output><input type="range" id="paN" min="1" max="16" step="1" value="8"></div>
      <dl class="readout" aria-live="polite">
        <dt>Trễ pha giữa 2 ăng-ten kề</dt><dd id="paB">—</dd>
        <dt>Bề rộng chùm (ước lượng)</dt><dd id="paW">—</dd>
        <dt>Mạnh hơn 1 ăng-ten</dt><dd class="big" id="paG">—</dd>
      </dl>
      <p class="note-s">Mỗi ô vuông ở đáy là một ăng-ten; vạch nhỏ bên trong cho biết nó phát trễ pha bao nhiêu. Chảo Starlink có hơn ngàn ăng-ten như vậy, xếp thành tấm phẳng, nên lái được chùm sóng theo cả hai chiều để bám vệ tinh đang bay vụt qua.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvArr'), st = {};
    let ph = 0;
    const rA = range('paA', { show: v => num(v, 3) + '°', onInput: () => { info(); draw(); } });
    const rN = range('paN', { show: v => String(v), onInput: () => { info(); draw(); } });
    const beta = () => -Math.PI * Math.sin(rA.get() * Math.PI / 180);       // k·d = π khi d = λ/2
    function info() {
      const N = rN.get(), b = beta() * 180 / Math.PI;
      document.getElementById('paB').textContent = num(b, 3) + '°';
      const bw = N > 1 ? 0.886 * 2 / (N * Math.cos(rA.get() * Math.PI / 180)) * 180 / Math.PI : 180;
      document.getElementById('paW').textContent = N > 1 ? 'cỡ ' + num(Math.min(180, bw), 3) + '°' : 'phát đều mọi hướng';
      document.getElementById('paG').textContent = '×' + num(N, 2) + ' · ' + num(10 * Math.log10(N), 3) + ' dB';
    }
    const AF = th => { const N = rN.get(), u = Math.PI * Math.sin(th) + beta(); let re = 0, im = 0; for (let n = 0; n < N; n++) { re += Math.cos(n * u); im += Math.sin(n * u); } return Math.hypot(re, im) / N; };
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, N = rN.get(), b = beta();
      const lamPx = Math.max(18, Math.min(42, W / 22)), dPx = lamPx / 2, k = 2 * Math.PI / lamPx;
      const ax = W / 2, ay = H - 30, xs = Array.from({ length: N }, (_, n) => ax + (n - (N - 1) / 2) * dPx);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      // sóng tổng (nền)
      const cell = 5;
      for (let y = 0; y < ay - 6; y += cell) for (let x = 0; x < W; x += cell) {
        let s = 0; for (let n = 0; n < N; n++) { const r = Math.hypot(x + cell / 2 - xs[n], y + cell / 2 - ay) + 1; s += Math.cos(k * r - ph - n * b) / Math.sqrt(r / lamPx); }
        const v = s / Math.sqrt(N) * 0.55;
        ctx.fillStyle = v > 0 ? `rgba(55,135,196,${Math.min(0.85, v).toFixed(3)})` : `rgba(216,49,42,${Math.min(0.55, -v * 0.65).toFixed(3)})`;
        ctx.fillRect(x, y, cell, cell);
      }
      // giản đồ hướng (đường viền)
      const Rp = Math.min(W * 0.45, ay - 24);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 360; i++) {
        const th = -Math.PI / 2 + i / 360 * Math.PI, g = AF(th), db = Math.max(-25, 20 * Math.log10(Math.max(1e-6, g))), rr = Rp * (1 + db / 25);
        const x = ax + rr * Math.sin(th), y = ay - rr * Math.cos(th); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      // hướng lái
      const th0 = rA.get() * Math.PI / 180;
      ctx.strokeStyle = C.ink; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Rp * 1.05 * Math.sin(th0), ay - Rp * 1.05 * Math.cos(th0)); ctx.stroke(); ctx.setLineDash([]);
      // mảng ăng-ten + chỉ thị pha
      ctx.fillStyle = C.ink; ctx.fillRect(xs[0] - dPx / 2 - 6, ay + 8, (N - 1) * dPx + dPx + 12, 6);
      xs.forEach((x, n) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.fillRect(x - 6, ay - 6, 12, 12); ctx.strokeRect(x - 6, ay - 6, 12, 12);
        const p = n * b; ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + 5 * Math.cos(p), ay - 5 * Math.sin(p)); ctx.stroke();
      });
      ctx.fillStyle = C.ink; ctx.font = FONT(11.5, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('đường viền đen: sóng mạnh cỡ nào theo từng hướng', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('nền xanh/đỏ: đỉnh và đáy của sóng tổng', 10, 24);
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => { if (!WL.REDUCED) { ph = (ph + dt * 5) % (2 * Math.PI); draw(); } });
    rA.upd(); rN.upd(); info();
  },
});
})();
