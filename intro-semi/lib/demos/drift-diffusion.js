/* =====================================================================
   Bán dẫn: minh họa "Trôi và khuếch tán: thí nghiệm Haynes–Shockley" (id: drift-diffusion, trang 2-ban-dan.html)
   Nhúng vào trang: <div class="demo" id="demoDrift" data-demo="drift-diffusion"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=drift-diffusion

   Một thanh Si dài 1 cm. Một xung ánh sáng tạo 1500 hạt tải thiểu số tại x = 2 mm, t = 0.
   Mỗi hạt: x(t+Δt) = x + v_d·Δt + √(2DΔt)·ξ (ξ ~ chuẩn tắc), và biến mất (tái hợp) với xác suất Δt/τ.
   v_d = μE (electron đi ngược chiều E, lỗ trống đi cùng chiều E), D = μ·kT/q (hệ thức Einstein, T = 300 K).
   μ_n = 1350, μ_p = 480 cm²/(V·s) (Si pha tạp nhẹ). Lý thuyết: đỉnh ở x₀ ± μEt, độ lệch chuẩn √(2Dt),
   số hạt còn lại N₀·e^(−t/τ).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas, loopWhenVisible, REDUCED } = SEMI;
const L = 1.0, X0 = 0.2, N0 = 1500, VT = 0.02585, TMAX = 60e-6;
const MU = { e: 1350, h: 480 };
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

SEMI.demo('drift-diffusion', {
  domId: 'demoDrift',
  title: 'Trôi và khuếch tán: thí nghiệm Haynes–Shockley',
  page: '2-ban-dan.html',
  html: `<div class="demo-title"><h4>Trôi và khuếch tán: thí nghiệm Haynes–Shockley</h4><span>Bơm một xung hạt tải, xem nó vừa trôi vừa nhòe ra</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvDr" class="ar" role="img" aria-label="Thanh Si nằm ngang với các hạt tải là chấm màu; bên dưới là biểu đồ phân bố hạt theo vị trí so với đường Gauss lý thuyết."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Loại hạt tải">
        <button class="btn" type="button" data-drk="e" aria-pressed="true">Electron</button>
        <button class="btn" type="button" data-drk="h" aria-pressed="false">Lỗ trống</button>
      </div>
      <div class="ctrl"><label for="drE">Điện trường (hướng sang phải)</label><output for="drE"></output><input type="range" id="drE" min="-20" max="20" step="1" value="-8"></div>
      <div class="ctrl"><label for="drTau">Thời gian sống τ</label><output for="drTau"></output><input type="range" id="drTau" min="5" max="200" step="5" value="40"></div>
      <div class="btnrow"><button class="btn" type="button" id="drGo">▶ Bơm xung</button></div>
      <dl class="readout" aria-live="polite">
        <dt>Thời gian t</dt><dd id="drT">—</dd>
        <dt>Vận tốc trôi μE</dt><dd id="drV">—</dd>
        <dt>Hệ số khuếch tán D</dt><dd id="drD">—</dd>
        <dt>Độ nhòe √(2Dt): lý thuyết; đo</dt><dd class="big" id="drS">—</dd>
        <dt>Số hạt còn lại: lý thuyết; đo</dt><dd id="drN">—</dd>
      </dl>
      <p class="note-s">Đặt điện trường bằng 0 thì xung chỉ nhòe ra tại chỗ (khuếch tán thuần). Đo tốc độ trôi của đỉnh và độ nhòe, ta tính được cả μ lẫn D: Haynes và Shockley (1949–1951) làm đúng như vậy với Ge và kiểm chứng hệ thức D = μkT/q. Hạt chạm hai đầu thanh bị loại khỏi phép đếm.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvDr'), st = {};
    let kind = 'e', xs = [], t = 0, run = false;
    const rE = range('drE', { show: v => v + ' V/cm', onInput: () => { info(); draw(); } });
    const rTau = range('drTau', { show: v => v + ' µs', onInput: () => { info(); } });
    const bs = [...document.querySelectorAll('#demoDrift [data-drk]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); kind = b.dataset.drk; reset(); }));
    document.getElementById('drGo').addEventListener('click', () => reset(true));
    const set = (id, s) => { document.getElementById(id).textContent = s; };
    const vd = () => (kind === 'e' ? -1 : 1) * MU[kind] * rE.get();   // cm/s
    function reset(go) { xs = Array.from({ length: N0 }, () => X0); t = 0; run = !!go; info(); draw(); }
    function info() {
      const D = MU[kind] * VT, tau = rTau.get() * 1e-6;
      set('drT', num(t * 1e6, 3) + ' µs');
      set('drV', num(Math.abs(vd()) / 100, 3) + ' m/s ' + (vd() > 0 ? '→' : vd() < 0 ? '←' : ''));
      set('drD', num(D, 3) + ' cm²/s');
      const m = xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0, sd = xs.length > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)) : 0;
      set('drS', t > 0 ? num(Math.sqrt(2 * D * t) * 1e4, 3) + '; ' + num(sd * 1e4, 3) + ' µm' : '0; 0 µm');
      set('drN', Math.round(N0 * Math.exp(-t / tau)) + '; ' + xs.length);
    }
    function step(dt) {
      const D = MU[kind] * VT, v = vd(), tau = rTau.get() * 1e-6, s = Math.sqrt(2 * D * dt), pr = dt / tau;
      xs = xs.filter(() => Math.random() > pr).map(x => x + v * dt + s * gauss()).filter(x => x > 0 && x < L);
      t += dt;
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 30, x1 = W - 20, px = x => x0 + x / L * (x1 - x0), by0 = 52, by1 = by0 + Math.min(80, H * 0.22);
      // thanh Si
      ctx.fillStyle = '#e9edf1'; ctx.fillRect(x0, by0, x1 - x0, by1 - by0); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x0, by0, x1 - x0, by1 - by0);
      const col = kind === 'e' ? C.neg : C.pos; let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      xs.slice(0, 600).forEach(x => { ctx.fillStyle = col; ctx.globalAlpha = 0.65; ctx.fillRect(px(x) - 1, by0 + 4 + r() * (by1 - by0 - 8), 2.2, 2.2); }); ctx.globalAlpha = 1;
      // điện cực và mũi tên E
      const E = rE.get(); ctx.fillStyle = C.ink; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Thanh Si dài 1 cm; xung sáng tại 2 mm', 10, 8);
      if (E !== 0) { const a = E > 0 ? 1 : -1, cx = W / 2; SEMI.arrow(ctx, cx - 50 * a, 38, cx + 50 * a, 38, C.ink, 2, 8); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('E', cx, 34); }
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(px(X0), by0 - 2); ctx.lineTo(px(X0) - 6, by0 - 12); ctx.lineTo(px(X0) + 6, by0 - 12); ctx.fill();
      // biểu đồ
      const hy0 = by1 + 30, hy1 = H - 26, nb = 100, bins = new Array(nb).fill(0);
      xs.forEach(x => { const k = Math.floor(x / L * nb); if (k >= 0 && k < nb) bins[k]++; });
      const D = MU[kind] * VT, sig = Math.sqrt(2 * D * Math.max(t, 1e-9)), mu = X0 + vd() * t, tau = rTau.get() * 1e-6;
      const theo = x => N0 * Math.exp(-t / tau) * (L / nb) / (sig * Math.sqrt(2 * Math.PI)) * Math.exp(-((x - mu) ** 2) / (2 * sig * sig));
      const ymax = Math.max(30, ...bins, t > 0 ? theo(mu) : 0) * 1.1, py = v => hy1 - v / ymax * (hy1 - hy0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, hy0); ctx.lineTo(x0, hy1); ctx.lineTo(x1, hy1); ctx.stroke();
      bins.forEach((b, k) => { if (!b) return; ctx.fillStyle = col; ctx.globalAlpha = 0.45; ctx.fillRect(px(k * L / nb), py(b), (x1 - x0) / nb, hy1 - py(b)); }); ctx.globalAlpha = 1;
      if (t > 0) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 300; k++) { const x = L * k / 300; k ? ctx.lineTo(px(x), py(theo(x))) : ctx.moveTo(px(x), py(theo(x))); } ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 2, 4, 6, 8, 10].forEach(mm => ctx.fillText(mm + ' mm', px(mm / 10), hy1 + 4));
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = C.ink; ctx.fillText('Số hạt theo vị trí (cột) và lý thuyết (đường đen)', x0, hy0 - 6);
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => {
      if (!run) return;
      const n = REDUCED ? 30 : 3; for (let k = 0; k < n; k++) step(0.1e-6 * (dt / 0.016 || 1) * 0.8);
      if (t > TMAX || !xs.length) run = false;
      info(); draw();
    });
    rE.upd(); rTau.upd(); reset(false);
  },
});
})();
