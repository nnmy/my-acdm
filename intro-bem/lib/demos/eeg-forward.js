/* =====================================================================
   Bioelectromagnetics: minh họa "Bài toán thuận EEG: lưỡng cực trong đầu" (id: eeg-forward, trang 6-fem.html)
   Nhúng vào trang: <div class="demo" id="demoEeg" data-demo="eeg-forward"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=eeg-forward

   Giải ∇·(σ∇V) = ∇·J_p trên mặt cắt đầu 2D bốn lớp (cùng hình học với demo fem ở phần 5),
   phần tử tam giác tuyến tính, biên ngoài cách điện (Neumann thuần).
   - Nguồn: lưỡng cực dòng = hai nguồn điểm ±I cách nhau 4 mm; mỗi nguồn điểm được chia cho ba đỉnh
     của tam giác chứa nó theo hàm dạng (cách "tiếp cận trực tiếp", partial integration / Venant gần đúng).
   - Neumann thuần nên K suy biến: cố định điện thế nút tâm = 0, rồi lấy tham chiếu trung bình trên da đầu.
   - So sánh: mô hình 4 lớp (σ sọ chỉnh được) với mô hình đồng nhất (σ = 0,33 S/m khắp nơi).
   - Đơn vị: chỉ báo giá trị tương đối (mô hình 2D không cho được µV thật).
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = BEM;
const RB = 0.076, RC = 0.079, RS = 0.085, RH = 0.090;
const SIG4 = [0.276, 1.654, null, 0.465], SIG_H = 0.33, ND = 0.004;
const P = { ns: 120, nb: 20, nc: 2, nk: 3, nsk: 3 };

function buildMesh() {
  const radii = [], seg = (a, b, n) => { for (let k = 1; k <= n; k++) radii.push(a + (b - a) * k / n); };
  // não: lưới mịn dần ra ngoài (nguồn EEG ở vỏ não)
  for (let k = 1; k <= P.nb; k++) radii.push(RB * Math.pow(k / P.nb, 0.75));
  seg(RB, RC, P.nc); seg(RC, RS, P.nk); seg(RS, RH, P.nsk);
  const ns = P.ns, K = radii.length, X = [0], Y = [0];
  radii.forEach(r => { for (let s = 0; s < ns; s++) { const a = 2 * Math.PI * s / ns; X.push(r * Math.sin(a)); Y.push(-r * Math.cos(a)); } });
  const id = (k, s) => 1 + (k - 1) * ns + ((s % ns) + ns) % ns, T = [];
  for (let s = 0; s < ns; s++) T.push([0, id(1, s), id(1, s + 1)]);
  for (let k = 1; k < K; k++) for (let s = 0; s < ns; s++) {
    const a = id(k, s), b = id(k + 1, s), c = id(k + 1, s + 1), d = id(k, s + 1);
    if ((s + k) % 2) { T.push([a, b, c]); T.push([a, c, d]); } else { T.push([a, b, d]); T.push([b, c, d]); }
  }
  const layer = T.map(t => { const r = Math.hypot((X[t[0]] + X[t[1]] + X[t[2]]) / 3, (Y[t[0]] + Y[t[1]] + Y[t[2]]) / 3); return r < RB ? 0 : r < RC ? 1 : r < RS ? 2 : 3; });
  const geo = T.map(t => { const [i, j, k] = t, b = [Y[j] - Y[k], Y[k] - Y[i], Y[i] - Y[j]], c = [X[k] - X[j], X[i] - X[k], X[j] - X[i]]; return { b, c, A: Math.abs(b[0] * c[1] - b[1] * c[0]) / 2 }; });
  return { X, Y, T, layer, geo, ns, K, outer: [...Array(ns)].map((_, s) => id(K, s)) };
}
/* Ma trận CSR (đã bỏ hàng/cột của nút 0 cố định) cho một bộ σ theo lớp */
function assemble(M, sig) {
  const { X, T, layer, geo } = M, N = X.length, rows = [...Array(N)].map(() => new Map());
  T.forEach((t, e) => {
    const g = geo[e], s = sig[layer[e]] / (4 * g.A);
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) { const m = rows[t[p]]; m.set(t[q], (m.get(t[q]) || 0) + s * (g.b[p] * g.b[q] + g.c[p] * g.c[q])); }
  });
  const n = N - 1, cols = [], vals = [], diag = new Float64Array(n);
  for (let r = 0; r < n; r++) {
    const cs = [], vs = []; rows[r + 1].forEach((v, gj) => { if (gj === 0) return; cs.push(gj - 1); vs.push(v); if (gj === r + 1) diag[r] = v; });
    cols.push(Int32Array.from(cs)); vals.push(Float64Array.from(vs));
  }
  return { n, cols, vals, diag };
}
function pcg(S, rhs, x0) {
  const { n, cols, vals, diag } = S, x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const mul = (u, y) => { for (let r = 0; r < n; r++) { let s = 0; const c = cols[r], v = vals[r]; for (let q = 0; q < c.length; q++) s += v[q] * u[c[q]]; y[r] = s; } };
  const r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), Ap = new Float64Array(n);
  mul(x, Ap); for (let i = 0; i < n; i++) { r[i] = rhs[i] - Ap[i]; z[i] = r[i] / diag[i]; p[i] = z[i]; }
  let rz = 0; for (let i = 0; i < n; i++) rz += r[i] * z[i];
  const bn = Math.sqrt(rhs.reduce((s, v) => s + v * v, 0)) || 1; let it = 0;
  for (; it < 6000; it++) {
    let rn0 = 0; for (let i = 0; i < n; i++) rn0 += r[i] * r[i]; if (Math.sqrt(rn0) / bn < 1e-8) break;
    mul(p, Ap); let pAp = 0; for (let i = 0; i < n; i++) pAp += p[i] * Ap[i];
    const al = rz / pAp; for (let i = 0; i < n; i++) { x[i] += al * p[i]; r[i] -= al * Ap[i]; }
    let rz2 = 0; for (let i = 0; i < n; i++) { z[i] = r[i] / diag[i]; rz2 += r[i] * z[i]; }
    const be = rz2 / rz; rz = rz2; for (let i = 0; i < n; i++) p[i] = z[i] + be * p[i];
  }
  return { x, it };
}
function locate(M, px, py) {
  const { X, Y, T } = M;
  for (let e = 0; e < T.length; e++) {
    const [i, j, k] = T[e], d = (X[j] - X[i]) * (Y[k] - Y[i]) - (X[k] - X[i]) * (Y[j] - Y[i]);
    const l1 = ((X[j] - px) * (Y[k] - py) - (X[k] - px) * (Y[j] - py)) / d, l2 = ((X[k] - px) * (Y[i] - py) - (X[i] - px) * (Y[k] - py)) / d, l3 = 1 - l1 - l2;
    if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) return { e, l: [l1, l2, l3] };
  }
  return null;
}

BEM.demo('eeg-forward', {
  domId: 'demoEeg',
  title: 'Bài toán thuận EEG: lưỡng cực trong đầu',
  page: '6-fem.html',
  html: `<div class="demo-title"><h4>Bài toán thuận EEG: lưỡng cực trong đầu</h4><span>Kéo lưỡng cực; so sánh mô hình 4 lớp với mô hình đồng nhất</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvEeg" class="ar grab" role="img" aria-label="Mặt cắt đầu bốn lớp với một lưỡng cực dòng trong não; màu chỉ điện thế. Bên dưới là đồ thị điện thế trên da đầu theo góc."></canvas><canvas id="cvEegP" class="profile" aria-hidden="true"></canvas><span class="hint" style="bottom:auto;top:46px">Kéo lưỡng cực để di chuyển</span></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Mô hình hiển thị">
        <button class="btn" type="button" data-eem="4" aria-pressed="true">Mô hình 4 lớp</button>
        <button class="btn" type="button" data-eem="1" aria-pressed="false">Đồng nhất</button>
      </div>
      <div class="ctrl"><label for="eeAng">Hướng lưỡng cực</label><output for="eeAng"></output><input type="range" id="eeAng" min="-180" max="180" step="5" value="0"></div>
      <div class="btnrow"><button class="btn" type="button" id="eeRad">Hướng xuyên tâm</button><button class="btn" type="button" id="eeTan">Hướng tiếp tuyến</button></div>
      <div class="ctrl"><label for="eeSk">σ của xương sọ</label><output for="eeSk"></output><input type="range" id="eeSk" min="-2.7" max="-0.5" step="0.01" value="-2"></div>
      <dl class="readout" aria-live="polite">
        <dt>Độ sâu (từ da đầu)</dt><dd id="eeDep">—</dd>
        <dt>Đỉnh–đỉnh: 4 lớp so với đồng nhất</dt><dd class="big" id="eeRat">—</dd>
        <dt>Độ rộng cực dương, 4 lớp</dt><dd id="eeW4">—</dd>
        <dt>Độ rộng cực dương, đồng nhất</dt><dd id="eeW1">—</dd>
        <dt>Vòng lặp CG</dt><dd id="eeIt">—</dd>
      </dl>
      <p class="note-s">Đường đỏ (4 lớp) và đường đen đứt (đồng nhất) ở dưới đều đã chuẩn hóa theo đỉnh của mô hình đồng nhất. Xương sọ dẫn điện kém làm tín hiệu yếu đi và nhòe ra: hai nguồn gần nhau khó tách hơn trên da đầu.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvEeg'), cvP = document.getElementById('cvEegP'), st = {}, stP = {};
    const M = buildMesh(), N = M.X.length;
    let show = '4', pos = [0.014, -0.066], R4 = null, R1 = null, S1 = assemble(M, [SIG_H, SIG_H, SIG_H, SIG_H]), S4 = null, x4 = null, x1 = null, pend = false, geo = null, drag = false;
    const rAng = range('eeAng', { show: v => v + '°', onInput: () => schedule() });
    const rSk = range('eeSk', { map: v => 10 ** v, show: v => num(v, 3) + ' S/m', onInput: () => { S4 = null; schedule(); } });
    const group = (sel, fn) => { const bs = [...document.querySelectorAll(sel)]; bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b); })); };
    group('#demoEeg [data-eem]', b => { show = b.dataset.eem; draw(); });
    const radialAngle = () => Math.round(Math.atan2(pos[0], -pos[1]) * 180 / Math.PI / 5) * 5;
    const wrap = a => ((a + 540) % 360) - 180;
    document.getElementById('eeRad').addEventListener('click', () => rAng.set(radialAngle()));
    document.getElementById('eeTan').addEventListener('click', () => rAng.set(wrap(radialAngle() + 90)));
    function schedule() { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; solve(); }); }

    function rhs() {
      const a = rAng.get() * Math.PI / 180, ux = Math.sin(a), uy = -Math.cos(a), b = new Float64Array(N);
      [[1, pos[0] + ux * ND / 2, pos[1] + uy * ND / 2], [-1, pos[0] - ux * ND / 2, pos[1] - uy * ND / 2]].forEach(([q, x, y]) => {
        const L = locate(M, x, y); if (!L) return; M.T[L.e].forEach((v, k) => { b[v] += q * L.l[k]; });
      });
      return b.subarray(1);
    }
    function scalp(S, x) {
      const V = new Float64Array(N); V.set(x, 1);
      const sc = M.outer.map(n => V[n]), mean = sc.reduce((s, v) => s + v, 0) / sc.length;
      return { V: V.map(v => v - mean), sc: sc.map(v => v - mean) };
    }
    function width(sc) {       // độ rộng góc (độ) của vùng quanh cực dương có V > V_max/2
      const ns = sc.length; let im = 0; for (let i = 1; i < ns; i++) if (sc[i] > sc[im]) im = i;
      const h = sc[im] / 2; let l = 0, r = 0;
      while (l < ns / 2 && sc[(im - l - 1 + ns) % ns] > h) l++;
      while (r < ns / 2 && sc[(im + r + 1) % ns] > h) r++;
      return (l + r + 1) * 360 / ns;
    }
    function solve() {
      if (!S4) { const s = SIG4.slice(); s[2] = rSk.get(); S4 = assemble(M, s); x4 = null; }
      const b = rhs(), a = pcg(S4, b, x4), c = pcg(S1, b, x1);
      x4 = a.x; x1 = c.x; R4 = scalp(S4, a.x); R1 = scalp(S1, c.x);
      const pp = s => Math.max(...s) - Math.min(...s);
      const set = (id, t) => { document.getElementById(id).textContent = t; };
      set('eeDep', num((RH - Math.hypot(pos[0], pos[1])) * 1000, 3) + ' mm');
      set('eeRat', num(pp(R4.sc) / pp(R1.sc) * 100, 3) + '%');
      set('eeW4', num(width(R4.sc), 3) + '°'); set('eeW1', num(width(R1.sc), 3) + '°');
      set('eeIt', a.it + '; ' + c.it);
      draw(); drawP();
    }
    function draw() {
      if (!st.ctx || !R4) return;
      const { ctx, W, H } = st, s = Math.min(W, H) * 0.45 / RH, cx = W / 2, cy = H / 2 + 4; geo = { s, cx, cy };
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const R = show === '4' ? R4 : R1, ref = Math.max(...R1.sc.map(Math.abs)) * 2.2;
      M.T.forEach(t => {
        const v = (R.V[t[0]] + R.V[t[1]] + R.V[t[2]]) / 3 / ref, a = Math.min(1, Math.abs(v)) ** 0.6;
        const col = v > 0 ? `rgb(${251 - 35 * a | 0},${252 - 203 * a | 0},${253 - 211 * a | 0})` : `rgb(${251 - 196 * a | 0},${252 - 117 * a | 0},${253 - 57 * a | 0})`;
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.beginPath();
        t.forEach((v, q) => { const x = cx + M.X[v] * s, y = cy + M.Y[v] * s; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1;
      (show === '4' ? [RB, RC, RS, RH] : [RH]).forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, 7); ctx.stroke(); });
      // lưỡng cực
      const a = rAng.get() * Math.PI / 180, ux = Math.sin(a), uy = -Math.cos(a), px = cx + pos[0] * s, py = cy + pos[1] * s, Ls = 26;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); ctx.stroke();
      BEM.arrow(ctx, px - ux * Ls / 2, py - uy * Ls / 2, px + ux * Ls / 2 + ux * 4, py + uy * Ls / 2 + uy * 4, C.ink, 3, 10);
      // điểm đo trên da đầu (mỗi 15°)
      ctx.fillStyle = C.ink; for (let k = 0; k < 24; k++) { const g = k * Math.PI / 12; ctx.beginPath(); ctx.arc(cx + (RH * s + 7) * Math.sin(g), cy - (RH * s + 7) * Math.cos(g), 2.2, 0, 7); ctx.fill(); }
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink;
      ctx.fillText(show === '4' ? 'Điện thế, mô hình 4 lớp' : 'Điện thế, mô hình đồng nhất', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('đỏ: dương; xanh: âm (tham chiếu trung bình)', 10, 26);
    }
    function drawP() {
      if (!stP.ctx || !R4) return;
      const { ctx, W, H } = stP; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
      const ns = M.ns, ref = Math.max(...R1.sc.map(Math.abs)), x0 = 40, x1 = W - 12, y0 = 24, y1 = H - 28, ym = (y0 + y1) / 2;
      const py = v => ym - v / ref * (y1 - y0) / 2;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke();
      const curve = (sc, col, dash) => {
        const pts = sc.map((v, i) => [((i / ns * 360 + 180) % 360), v]).sort((a, b) => a[0] - b[0]);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash); ctx.beginPath();
        pts.forEach(([g, v], k) => { const x = x0 + g / 360 * (x1 - x0), y = py(v); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
      };
      curve(R1.sc, C.ink, [5, 4]); curve(R4.sc, C.pos, []);
      ctx.font = '600 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      [-180, -90, 0, 90, 180].forEach(g => ctx.fillText(g + '°', x0 + (g + 180) / 360 * (x1 - x0), y1 + 4));
      ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.fillText('Điện thế trên da đầu theo góc (0° = đỉnh đầu)', x0, 4);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle'; ctx.fillText('+1', x0 - 5, py(ref)); ctx.fillText('0', x0 - 5, ym); ctx.fillText('−1', x0 - 5, py(-ref));
    }
    // kéo lưỡng cực
    const toModel = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left - geo.cx) / geo.s, (ev.clientY - r.top - geo.cy) / geo.s]; };
    cv.addEventListener('pointerdown', ev => { if (!geo) return; drag = true; cv.setPointerCapture(ev.pointerId); cv.classList.add('grabbing'); move(ev); });
    cv.addEventListener('pointermove', ev => { if (drag) move(ev); });
    const end = () => { drag = false; cv.classList.remove('grabbing'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    function move(ev) {
      let [x, y] = toModel(ev); const r = Math.hypot(x, y), rmax = RB - ND / 2 - 0.0015;
      if (r > rmax) { x *= rmax / r; y *= rmax / r; }
      pos = [x, y]; schedule();
    }
    watchCanvas(cv, st, draw); watchCanvas(cvP, stP, drawP);
    rAng.upd(); rSk.upd();          // cả hai gọi schedule(): giải một lần ở khung hình kế tiếp
  },
});
})();
