/* =====================================================================
   Bioelectromagnetics: minh họa "Lắp ráp ma trận độ cứng và tính thưa" (id: fem-assembly, trang 6-fem.html)
   Nhúng vào trang: <div class="demo" id="demoFemAsm" data-demo="fem-assembly"></div> + lib/bem.js
   Chạy độc lập:    lib/demos/run.html?demo=fem-assembly

   Lưới nhỏ (1 nút tâm + 3 vòng × 8 nút = 25 nút, 40 tam giác) trên mặt cắt hai lớp:
   vòng trong là "não" (σ = 0,33 S/m), vòng ngoài là "xương sọ" (σ = 0,01 S/m).
   - Bấm một tam giác: xem ma trận phần tử 3×3 và 9 ô nó cộng vào ma trận toàn cục K.
   - Bấm một ô K_ij: xem các phần tử đóng góp vào ô đó (K_ij ≠ 0 chỉ khi i, j chung một phần tử).
   - Đổi cách đánh số nút: theo vòng / ngẫu nhiên / Cuthill–McKee ngược (RCM) để thấy băng thông đổi.
   ===================================================================== */
(() => {
const { COLORS: C, num, REDUCED, watchCanvas } = BEM;
const NS = 8, NR = 3, SIG = [0.33, 0.33, 0.01];
const NAMES = ['não', 'não', 'xương sọ'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildMesh() {
  const r = rng(7), X = [0], Y = [0];
  for (let k = 1; k <= NR; k++) for (let s = 0; s < NS; s++) {
    const jit = k < NR ? 0.22 : 0.08, a = 2 * Math.PI * (s + (k % 2) * 0.5) / NS + (r() - 0.5) * jit, rad = k + (k < NR ? (r() - 0.5) * 0.18 : 0);
    X.push(rad * Math.sin(a)); Y.push(-rad * Math.cos(a));
  }
  const id = (k, s) => 1 + (k - 1) * NS + ((s % NS) + NS) % NS, T = [], layer = [];
  for (let s = 0; s < NS; s++) { T.push([0, id(1, s), id(1, s + 1)]); layer.push(0); }
  for (let k = 1; k < NR; k++) for (let s = 0; s < NS; s++) {
    // vòng k+1 lệch nửa ô khi k+1 lẻ / chẵn; nối theo góc gần nhất
    const odd = (k % 2) === 1;          // vòng k lệch 0,5 nếu k lẻ
    const a = id(k, s), b = id(k, s + 1), c = odd ? id(k + 1, s + 1) : id(k + 1, s), d = odd ? id(k + 1, s) : id(k + 1, s - 1);
    // tam giác "nhìn ra" và "nhìn vào"
    T.push([a, b, c]); layer.push(k);
    T.push([a, c, d]); layer.push(k);
  }
  return { X, Y, T, layer };
}
function stiffness(M) {
  const { X, Y, T, layer } = M;
  return T.map((t, e) => {
    const [i, j, k] = t, b = [Y[j] - Y[k], Y[k] - Y[i], Y[i] - Y[j]], c = [X[k] - X[j], X[i] - X[k], X[j] - X[i]];
    const A = Math.abs(b[0] * c[1] - b[1] * c[0]) / 2, s = SIG[layer[e]] / (4 * A);
    return [0, 1, 2].map(p => [0, 1, 2].map(q => s * (b[p] * b[q] + c[p] * c[q])));
  });
}
function adjacency(M) {
  const n = M.X.length, adj = [...Array(n)].map(() => new Set());
  M.T.forEach(t => t.forEach(a => t.forEach(b => { if (a !== b) adj[a].add(b); })));
  return adj.map(s => [...s]);
}
function rcm(adj) {
  const n = adj.length, deg = adj.map(a => a.length), seen = new Uint8Array(n), order = [];
  while (order.length < n) {
    let start = -1; for (let i = 0; i < n; i++) if (!seen[i] && (start < 0 || deg[i] < deg[start])) start = i;
    const q = [start]; seen[start] = 1;
    while (q.length) { const v = q.shift(); order.push(v); adj[v].filter(w => !seen[w]).sort((a, b) => deg[a] - deg[b]).forEach(w => { seen[w] = 1; q.push(w); }); }
  }
  order.reverse(); const perm = new Int32Array(n); order.forEach((v, i) => { perm[v] = i; }); return perm;
}

BEM.demo('fem-assembly', {
  domId: 'demoFemAsm',
  title: 'Lắp ráp ma trận độ cứng và tính thưa',
  page: '6-fem.html',
  html: `<div class="demo-title"><h4>Lắp ráp ma trận độ cứng và tính thưa</h4><span>Bấm vào một tam giác hoặc một ô của ma trận</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvAsm" class="ar tall-m" role="img" aria-label="Bên trái: lưới tam giác 25 nút gồm hai lớp mô. Bên phải: ma trận độ cứng 25 × 25, ô có màu là ô khác không."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Đánh số nút">
        <button class="btn" type="button" data-asn="ring" aria-pressed="true">Theo vòng</button>
        <button class="btn" type="button" data-asn="rand" aria-pressed="false">Ngẫu nhiên</button>
        <button class="btn" type="button" data-asn="rcm" aria-pressed="false">RCM</button>
      </div>
      <div class="btnrow">
        <button class="btn" type="button" id="asPlay">▶ Lắp ráp từng phần tử</button>
        <button class="btn" type="button" id="asAll">Hiện đủ</button>
      </div>
      <dl class="readout" aria-live="polite">
        <dt>Số nút; số phần tử</dt><dd id="asN">—</dd>
        <dt>Ô khác 0 (nnz)</dt><dd class="big" id="asNnz">—</dd>
        <dt>Băng thông</dt><dd id="asBw">—</dd>
        <dt id="asSelL">Đang chọn</dt><dd id="asSel">—</dd>
      </dl>
      <div id="asKe"></div>
      <p class="note-s">Mỗi hàng của ma trận phần tử có tổng bằng 0: nếu cả ba đỉnh cùng điện thế thì không có dòng chạy. Hệ số của phần tử xương sọ nhỏ hơn của não khoảng 33 lần (tỉ số σ), nên ô của chúng nhạt hơn.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvAsm'), st = {}, M = buildMesh(), KE = stiffness(M), adj = adjacency(M), n = M.X.length, ne = M.T.length;
    const ring = Int32Array.from({ length: n }, (_, i) => i), rcmP = rcm(adj);
    let perm = ring, seed = 11, step = ne, sel = { type: 'el', e: 13 }, timer = null, geo = null;
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    const group = (sel, fn) => { const bs = [...document.querySelectorAll(sel)]; bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); fn(b); })); };
    group('#demoFemAsm [data-asn]', b => {
      if (b.dataset.asn === 'ring') perm = ring;
      else if (b.dataset.asn === 'rcm') perm = rcmP;
      else { const r = rng(seed += 13), p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } perm = Int32Array.from(p); }
      update();
    });
    const playBtn = document.getElementById('asPlay');
    const stop = () => { if (timer) clearInterval(timer); timer = null; playBtn.textContent = '▶ Lắp ráp từng phần tử'; };
    playBtn.addEventListener('click', () => {
      if (timer) { stop(); return; }
      if (REDUCED) { step = ne; update(); return; }
      if (step >= ne) step = 0;
      playBtn.textContent = '❚❚ Tạm dừng';
      timer = setInterval(() => { step++; sel = { type: 'el', e: step - 1 }; if (step >= ne) stop(); update(); }, 380);
    });
    document.getElementById('asAll').addEventListener('click', () => { stop(); step = ne; update(); });

    function global() {      // ma trận toàn cục theo đánh số hiện tại, chỉ gồm `step` phần tử đầu
      const K = new Map();
      for (let e = 0; e < step; e++) { const t = M.T[e]; for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) { const key = perm[t[p]] * n + perm[t[q]]; K.set(key, (K.get(key) || 0) + KE[e][p][q]); } }
      return K;
    }
    function update() {
      const K = global();
      let bw = 0; K.forEach((_, key) => { bw = Math.max(bw, Math.abs(Math.floor(key / n) - key % n)); });
      set('asN', n + '; ' + ne);
      set('asNnz', K.size + ' / ' + (n * n) + ' (' + num(K.size / (n * n) * 100, 2) + '%)');
      set('asBw', String(bw));
      const ke = document.getElementById('asKe');
      if (sel.type === 'el') {
        const t = M.T[sel.e], g = t.map(v => perm[v]);
        set('asSelL', 'Phần tử ' + (sel.e + 1)); set('asSel', NAMES[M.layer[sel.e]] + ', σ = ' + num(SIG[M.layer[sel.e]], 2) + ' S/m');
        ke.innerHTML = `<table class="mini"><thead><tr><th>K<sup>(e)</sup> (mS)</th>${g.map(v => `<th>nút ${v}</th>`).join('')}</tr></thead><tbody>${
          KE[sel.e].map((row, p) => `<tr><td>nút ${g[p]}</td>${row.map(v => `<td>${num(v * 1000, 3)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      } else {
        const inv = new Int32Array(n); perm.forEach((v, i) => { inv[v] = i; });
        const a = inv[sel.i], b = inv[sel.j], els = [];
        M.T.forEach((t, e) => { if (e < step && t.includes(a) && t.includes(b)) els.push(e + 1); });
        const v = K.get(sel.i * n + sel.j) || 0;
        set('asSelL', 'Ô K(' + sel.i + ', ' + sel.j + ')'); set('asSel', v ? num(v * 1000, 3) + ' mS' : '0');
        ke.innerHTML = `<p class="note-s">${els.length ? `Ô này nhận đóng góp từ ${els.length} phần tử (${els.join(', ')}): ${sel.i === sel.j ? 'mọi phần tử chứa nút đó.' : 'các phần tử có chung cạnh nối hai nút.'}` : 'Hai nút này không chung phần tử nào, nên K<sub>ij</sub> = 0: điện thế ở nút này không ảnh hưởng trực tiếp đến phương trình của nút kia.'}</p>`;
      }
      draw(K);
    }
    function draw(K) {
      if (!st.ctx) return; K = K || global();
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const wide = W > 520, half = wide ? W * 0.5 : W, mH = wide ? H : H * 0.5;
      // ---- lưới ----
      const R = Math.min(half, mH) * 0.4, mx = half / 2, my = mH / 2 + (wide ? 8 : 18), s = R / NR;
      const { X, Y, T, layer } = M, inv = new Int32Array(n); perm.forEach((v, i) => { inv[v] = i; });
      const selEls = new Set(), selNodes = new Set();
      if (sel.type === 'el') { selEls.add(sel.e); T[sel.e].forEach(v => selNodes.add(v)); }
      else { const a = inv[sel.i], b = inv[sel.j]; selNodes.add(a); selNodes.add(b); T.forEach((t, e) => { if (t.includes(a) && t.includes(b)) selEls.add(e); }); }
      T.forEach((t, e) => {
        ctx.beginPath(); t.forEach((v, q) => { const x = mx + X[v] * s, y = my + Y[v] * s; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
        ctx.fillStyle = selEls.has(e) ? 'rgba(242,194,48,.75)' : e < step ? (layer[e] === 2 ? '#e7e2d6' : '#f6dede') : '#fff';
        ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let v = 0; v < n; v++) {
        const x = mx + X[v] * s, y = my + Y[v] * s, on = selNodes.has(v);
        ctx.fillStyle = on ? C.ink : '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = on ? '#fff' : C.ink; ctx.fillText(String(perm[v]), x, y + 0.5);
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.fillStyle = C.ink; ctx.fillText('Lưới: ' + step + '/' + ne + ' phần tử đã lắp', 10, 8);
      ctx.fillStyle = C.muted; ctx.fillText('vòng ngoài: xương sọ; bên trong: não', 10, 24);
      // ---- ma trận ----
      const ox = wide ? half + 10 : 0, oy = wide ? 0 : mH, aw = wide ? W - half - 20 : W, ah = wide ? H : H - mH;
      const cell = Math.floor(Math.min((aw - 30) / n, (ah - 60) / n) * 10) / 10, gx = ox + (aw - cell * n) / 2 + 8, gy = oy + 30;
      ctx.fillStyle = '#fff'; ctx.fillRect(gx, gy, cell * n, cell * n);
      let kmax = 0; K.forEach(v => { kmax = Math.max(kmax, Math.abs(v)); });
      const newKeys = new Set(); if (sel.type === 'el') T[sel.e].forEach(a => T[sel.e].forEach(b => newKeys.add(perm[a] * n + perm[b])));
      K.forEach((v, key) => {
        const i = Math.floor(key / n), j = key % n, t = Math.max(0.12, Math.min(1, 1 + Math.log10(Math.abs(v) / kmax + 1e-12) / 2.2));
        ctx.fillStyle = v > 0 ? `rgba(216,49,42,${t})` : `rgba(55,135,196,${t})`;
        ctx.fillRect(gx + j * cell, gy + i * cell, cell, cell);
      });
      ctx.strokeStyle = 'rgba(27,25,32,.08)'; ctx.lineWidth = 1;
      for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + i * cell); ctx.lineTo(gx + n * cell, gy + i * cell); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx + i * cell, gy); ctx.lineTo(gx + i * cell, gy + n * cell); ctx.stroke(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      newKeys.forEach(key => { const i = Math.floor(key / n), j = key % n; ctx.strokeRect(gx + j * cell + 1, gy + i * cell + 1, cell - 2, cell - 2); });
      if (sel.type === 'cell') { ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(gx + sel.j * cell, gy + sel.i * cell, cell, cell); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(gx, gy, cell * n, cell * n);
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Ma trận K (' + n + ' × ' + n + ')', gx, oy + 8);
      { const yl = gy + cell * n + 6; ctx.textAlign = 'left'; ctx.fillStyle = C.pos; ctx.fillText('■ dương', gx, yl); const w = ctx.measureText('■ dương').width;
        ctx.fillStyle = C.sea; ctx.fillText('■ âm', gx + w + 14, yl); }
      geo = { mx, my, s, gx, gy, cell };
    }
    function pointInTri(px, py, t) {
      const P = t.map(v => [geo.mx + M.X[v] * geo.s, geo.my + M.Y[v] * geo.s]);
      const d = (a, b, c) => (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]), p = [px, py];
      const d1 = d(p, P[0], P[1]), d2 = d(p, P[1], P[2]), d3 = d(p, P[2], P[0]);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }
    cv.addEventListener('click', ev => {
      if (!geo) return; const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      const j = Math.floor((x - geo.gx) / geo.cell), i = Math.floor((y - geo.gy) / geo.cell);
      if (i >= 0 && j >= 0 && i < n && j < n) { sel = { type: 'cell', i, j }; update(); return; }
      const e = M.T.findIndex(t => pointInTri(x, y, t)); if (e >= 0) { sel = { type: 'el', e }; update(); }
    });
    watchCanvas(cv, st, () => draw());
    update();
  },
});
})();
