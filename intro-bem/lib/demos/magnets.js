/* =====================================================================
   Sinh điện từ: minh họa "Nam châm, Trái Đất và la bàn" (id: magnets, trang 2-tu.html)
   Nhúng vào trang: <div class="demo" id="demoMagnets" data-demo="magnets"></div>
                    + <script src="lib/bem.js"></script> (tự tải file này khi cuộn tới)
   Chạy độc lập:    lib/demos/run.html?demo=magnets
   ===================================================================== */
(() => {
const { COLORS: C, fmt, num, range, arrow, watchCanvas, loopWhenVisible, REDUCED } = BEM;
const MU0 = 1.25663706e-6;           // T m / A
const WORLD_W = 0.20;                // khung rộng 20 cm (demo dây dẫn)
const xy = (cv, e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const clampF = (v, m) => Math.max(m, Math.min(1 - m, v));
const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
function pressGroup(btns, active) { btns.forEach(b => b.setAttribute('aria-pressed', b === active)); }
function dots(ctx, W, H) { ctx.fillStyle = C.line; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) ctx.fillRect(x - .75, y - .75, 1.5, 1.5); }
/* kim la bàn nhỏ: đầu đỏ chỉ theo (bx, by) */
function needle(ctx, x, y, bx, by, L, w = 3) {
  const n = Math.hypot(bx, by); if (!n) return;
  const ux = bx / n, uy = by / n, px = -uy, py = ux;
  ctx.fillStyle = C.pos; ctx.beginPath(); ctx.moveTo(x + ux * L, y + uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
  ctx.fillStyle = '#9DA4AD'; ctx.beginPath(); ctx.moveTo(x - ux * L, y - uy * L); ctx.lineTo(x + px * w, y + py * w); ctx.lineTo(x - px * w, y - py * w); ctx.fill();
}

BEM.demo('magnets', {
  domId: 'demoMagnets',
  title: 'Nam châm, Trái Đất và la bàn',
  page: '2-tu.html',
  html: `<div class="demo-title"><h4>Nam châm, Trái Đất và la bàn</h4><span>Kéo rê la bàn để dò theo đường sức</span></div>
      <div class="demo-body">
        <div class="stagebox">
          <canvas id="cvMag" class="grab ar" role="img" aria-label="Đường sức từ quanh nam châm thẳng, nam châm chữ U hoặc Trái Đất, với một la bàn kéo rê được."></canvas>
        </div>
        <div class="panel">
          <div class="btnrow" role="group" aria-label="Nguồn từ trường">
            <button class="btn" type="button" data-mag="bar" aria-pressed="true">Nam châm thẳng</button>
            <button class="btn" type="button" data-mag="u" aria-pressed="false">Chữ U</button>
            <button class="btn" type="button" data-mag="earth" aria-pressed="false">Trái Đất</button>
          </div>
          <div class="checks">
            <label><input type="checkbox" id="mLines" checked> Đường sức</label>
            <label><input type="checkbox" id="mNeedles"> Lưới la bàn</label>
          </div>
          <dl class="readout" id="mRead" aria-live="polite"></dl>
          <p class="note-s" id="mNote"></p>
        </div>
      </div>`,
  init() {
/* =====================================================================
   DEMO 3: NAM CHÂM THẲNG, CHỮ U, TRÁI ĐẤT + LA BÀN
   Nam châm: mô hình "cực từ" (mỗi điểm cực cho trường ∝ r̂/r²), chỉ đúng ở bên ngoài vật.
   Trái Đất: lưỡng cực điểm, đường sức r = L·R·sin²θ (giải tích).
   ===================================================================== */
(function demoMagnets() {
  const cv = document.getElementById('cvMag'); if (!cv) return;
  const st = {}; let mode = 'bar', geo = null, lines = [], dirty = true, drag = false;
  const comp = { fx: 0.5, fy: 0.16 };
  const show = { lines: true, needles: false };
  const TILT = 10 * Math.PI / 180, B0 = 30e-6;
  const NOTES = {
    bar: 'Đường sức đi ra ở cực N (đỏ), vòng ra bên ngoài rồi đi vào cực S (xanh). Bên trong nam châm (đường mảnh), chúng đi từ S sang N, nên mỗi đường là một vòng khép kín.',
    u: 'Hai cực đặt gần nhau, cùng hướng xuống, nên từ trường ở khe giữa hai đầu nam châm mạnh và khá đều. Đường nét đứt: đường sức bên trong vật liệu, đi từ S về N.',
    earth: 'Đầu đỏ của kim la bàn chỉ về phía Bắc địa lý, vì ở đó có cực S của "nam châm Trái Đất". Kéo la bàn từ xích đạo lên vùng cực để thấy B mạnh dần và độ nghiêng tăng. Mô hình lưỡng cực, B = 30 µT ở xích đạo.',
  };
  const btns = [...document.querySelectorAll('#demoMagnets [data-mag]')];
  btns.forEach(b => b.addEventListener('click', () => { pressGroup(btns, b); mode = b.dataset.mag; comp.fx = mode === 'earth' ? 0.78 : 0.5; comp.fy = mode === 'u' ? 0.86 : mode === 'earth' ? 0.3 : 0.14; dirty = true; draw(); }));
  document.getElementById('mLines').addEventListener('change', e => { show.lines = e.target.checked; draw(); });
  document.getElementById('mNeedles').addEventListener('change', e => { show.needles = e.target.checked; draw(); });

  function build() {
    const { W, H } = st, cx = W / 2, cy = H / 2, g = { poles: [] };
    if (mode === 'bar') {
      const L = Math.min(W * 0.36, H * 0.7), h = L * 0.24;
      Object.assign(g, { cx, cy, L, h, x0: cx - L / 2, x1: cx + L / 2, y0: cy - h / 2, y1: cy + h / 2 });
      for (let k = 0; k < 5; k++) { const y = g.y0 + h * (k + 0.5) / 5; g.poles.push({ x: g.x1 - 3, y, s: 1 }, { x: g.x0 + 3, y, s: -1 }); }
      g.inside = (x, y) => x > g.x0 && x < g.x1 && y > g.y0 && y < g.y1;
      g.seeds = []; const R = h * 0.6 + 4;
      for (let k = 0; k < 16; k++) { const a = (-100 + 200 * (k + 0.5) / 16) * Math.PI / 180; g.seeds.push([g.x1 + R * Math.cos(a), cy + R * Math.sin(a), 1]); g.seeds.push([g.x0 - R * Math.cos(a), cy + R * Math.sin(a), -1]); }
    } else if (mode === 'u') {
      const Wu = Math.min(W * 0.34, H * 0.62), t = Wu * 0.28, top = H * 0.12, ca = top + Wu / 2, bot = H * 0.62;
      Object.assign(g, { cx, Wu, t, ca, bot, R1: Wu / 2, R2: Wu / 2 - t });
      const inOuter = (x, y) => (y >= ca && y <= bot && Math.abs(x - cx) <= g.R1) || (y < ca && Math.hypot(x - cx, y - ca) <= g.R1);
      const inInner = (x, y) => (y >= ca && y <= bot + 1 && Math.abs(x - cx) < g.R2) || (y < ca && Math.hypot(x - cx, y - ca) < g.R2);
      g.inside = (x, y) => inOuter(x, y) && !inInner(x, y);
      for (let k = 0; k < 4; k++) { const off = t * (k + 0.5) / 4; g.poles.push({ x: cx - g.R1 + off, y: bot - 3, s: 1 }, { x: cx + g.R2 + off, y: bot - 3, s: -1 }); }
      g.seeds = []; const nx = cx - g.R1 + t / 2, R = t * 0.6 + 4;
      const sx = cx + g.R2 + t / 2;
      for (let k = 0; k < 14; k++) { const a = (180 * (k + 0.5) / 14) * Math.PI / 180; g.seeds.push([nx + R * Math.cos(a), bot + R * Math.sin(a), 1]); g.seeds.push([sx + R * Math.cos(a), bot + R * Math.sin(a), -1]); }
    } else {
      const R = Math.min(W, H) * 0.16;
      Object.assign(g, { cx, cy, R, mx: Math.sin(TILT), my: Math.cos(TILT) });   // m̂ hướng về phía Nam địa lý (xuống), lệch 10°
      g.inside = (x, y) => Math.hypot(x - cx, y - cy) < R;
    }
    geo = g;
  }
  function Bat(x, y) {
    const g = geo;
    if (mode === 'earth') {
      const rx = (x - g.cx) / g.R, ry = (y - g.cy) / g.R, r = Math.hypot(rx, ry); if (r < 1e-6) return [0, 0, 0, 0];
      const ux = rx / r, uy = ry / r, c = ux * g.mx + uy * g.my;
      const s = 1 / (r * r * r);
      return [(3 * c * ux - g.mx) * s, (3 * c * uy - g.my) * s, r, c];
    }
    let bx = 0, by = 0;
    for (const p of g.poles) { const dx = x - p.x, dy = y - p.y, r2 = Math.max(4, dx * dx + dy * dy), r = Math.sqrt(r2); bx += p.s * dx / (r2 * r); by += p.s * dy / (r2 * r); }
    return [bx, by];
  }
  function trace() {
    lines = [];
    if (mode === 'earth') {
      const g = geo, px = g.my, py = -g.mx;                 // p̂ vuông góc với m̂
      for (const L of [1.25, 1.6, 2.1, 2.9, 4.2, 6.5, 10]) for (const side of [1, -1]) {
        const t0 = Math.asin(Math.sqrt(1 / L)), pts = [];
        for (let k = 0; k <= 160; k++) {
          const t = t0 + (Math.PI - 2 * t0) * k / 160, r = L * g.R * Math.sin(t) ** 2;
          pts.push([g.cx + r * (Math.cos(t) * g.mx + side * Math.sin(t) * px), g.cy + r * (Math.cos(t) * g.my + side * Math.sin(t) * py)]);
        }
        lines.push(pts);
      }
      dirty = false; return;
    }
    const { W, H } = st, h = 2.5;
    for (const [sx, sy, sg] of geo.seeds) {           // sg = +1: đi theo B từ cực N; −1: đi ngược B từ cực S
      let x = sx, y = sy, ended = false; const pts = [[x, y]];
      for (let s = 0; s < 2600; s++) {
        let [bx, by] = Bat(x, y), n = Math.hypot(bx, by); if (!n) break;
        const xm = x + sg * bx / n * h / 2, ym = y + sg * by / n * h / 2;
        [bx, by] = Bat(xm, ym); n = Math.hypot(bx, by); if (!n) break;
        x += sg * bx / n * h; y += sg * by / n * h; pts.push([x, y]);
        if (geo.inside(x, y) || geo.poles.some(q => Math.abs(q.x - x) + Math.abs(q.y - y) < 4)) { ended = true; break; }
        if (x < -60 || y < -60 || x > W + 60 || y > H + 60) break;
      }
      if (sg < 0 && ended) continue;                    // đường này đã được vẽ từ phía cực N
      lines.push(sg > 0 ? pts : pts.reverse());
    }
    dirty = false;
  }
  function polyline(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  function headAt(ctx, pts, k) {
    if (k < 2 || k > pts.length - 3) return;
    const [x0, y0] = pts[k - 2], [x1, y1] = pts[k + 2], [x, y] = pts[k];
    let dx = x1 - x0, dy = y1 - y0; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    ctx.beginPath(); ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x - dx * 4 - dy * 3.6, y - dy * 4 + dx * 3.6); ctx.lineTo(x - dx * 4 + dy * 3.6, y - dy * 4 - dx * 3.6); ctx.fill();
  }
  function label(ctx, t, x, y, col = '#fff', size = 18) { ctx.font = `700 ${size}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); }

  function drawBody(ctx) {
    const g = geo;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    if (mode === 'bar') {
      ctx.fillStyle = C.neg; ctx.fillRect(g.x0, g.y0, g.L / 2, g.h);
      ctx.fillStyle = C.pos; ctx.fillRect(g.cx, g.y0, g.L / 2, g.h);
      ctx.strokeRect(g.x0, g.y0, g.L, g.h);
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      for (const f of [0.25, 0.5, 0.75]) {
        const y = g.y0 + g.h * f; ctx.beginPath(); ctx.moveTo(g.x0 + 4, y); ctx.lineTo(g.x1 - 4, y); ctx.stroke();
        headAt(ctx, [[g.x0, y], [g.x0 + 1, y], [g.cx - 2, y], [g.cx - 1, y], [g.cx, y], [g.cx + 1, y], [g.cx + 2, y]], 4);
      }
      label(ctx, 'S', g.x0 + g.L * 0.14, g.cy); label(ctx, 'N', g.x1 - g.L * 0.14, g.cy);
    } else if (mode === 'u') {
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R1, g.bot); ctx.lineTo(g.cx - g.R1, g.ca); ctx.arc(g.cx, g.ca, g.R1, Math.PI, 0); ctx.lineTo(g.cx + g.R1, g.bot);
      ctx.lineTo(g.cx + g.R2, g.bot); ctx.lineTo(g.cx + g.R2, g.ca); ctx.arc(g.cx, g.ca, g.R2, 0, Math.PI, true); ctx.lineTo(g.cx - g.R2, g.bot); ctx.closePath();
      ctx.fillStyle = '#B9C0C8'; ctx.fill();
      const tip = (g.bot - g.ca) * 0.45;
      ctx.fillStyle = C.pos; ctx.fillRect(g.cx - g.R1, g.bot - tip, g.t, tip);
      ctx.fillStyle = C.neg; ctx.fillRect(g.cx + g.R2, g.bot - tip, g.t, tip);
      ctx.stroke();
      label(ctx, 'N', g.cx - g.R1 + g.t / 2, g.bot - tip / 2); label(ctx, 'S', g.cx + g.R2 + g.t / 2, g.bot - tip / 2);
      // đường sức trong vật liệu: từ S (phải) lên, vòng qua, xuống N (trái)
      const rm = (g.R1 + g.R2) / 2, pts = [];
      for (let k = 0; k <= 20; k++) pts.push([g.cx + rm, g.bot - 4 - (g.bot - 4 - g.ca) * k / 20]);
      for (let k = 1; k <= 30; k++) { const a = Math.PI * k / 30; pts.push([g.cx + rm * Math.cos(a), g.ca - rm * Math.sin(a)]); }
      for (let k = 1; k <= 20; k++) pts.push([g.cx - rm, g.ca + (g.bot - 4 - g.ca) * k / 20]);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(27,25,32,.7)'; ctx.lineWidth = 1.3; polyline(ctx, pts); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(27,25,32,.85)'; [10, 35, 60].forEach(k => headAt(ctx, pts, k));
    } else {
      const { cx, cy, R } = g;
      ctx.fillStyle = '#A9D3EA'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(27,25,32,.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
      // trục quay
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy - R - 22); ctx.lineTo(cx, cy + R + 22); ctx.stroke();
      ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom'; ctx.fillText('Bắc địa lý', cx, cy - R - 24);
      ctx.textBaseline = 'top'; ctx.fillText('Nam địa lý', cx, cy + R + 24);
      // nam châm tưởng tượng trong lõi, dọc trục từ
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-TILT);
      const l = R * 0.55, w = R * 0.11;
      ctx.fillStyle = C.neg; ctx.fillRect(-w, -l, 2 * w, l); ctx.fillStyle = C.pos; ctx.fillRect(-w, 0, 2 * w, l);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(-w, -l, 2 * w, 2 * l);
      label(ctx, 'S', 0, -l * 0.6, '#fff', 13); label(ctx, 'N', 0, l * 0.6, '#fff', 13);
      ctx.setLineDash([5, 4]); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -R - 14); ctx.lineTo(0, -l); ctx.moveTo(0, l); ctx.lineTo(0, R + 14); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.font = '500 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (W > 520) ctx.fillText('trục từ lệch ≈ 10° (nét đứt)', cx - 10, cy - R - 44);
    }
  }
  function draw() {
    if (!st.ctx) return;
    const { ctx, W, H } = st;
    if (dirty) { build(); trace(); }
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); dots(ctx, W, H);
    if (show.lines) {
      ctx.strokeStyle = 'rgba(27,25,32,.6)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
      lines.forEach(p => polyline(ctx, p));
      ctx.fillStyle = 'rgba(27,25,32,.8)';
      lines.forEach(p => { if (mode === 'earth') headAt(ctx, p, 80); else for (let k = 50; k < p.length - 3; k += 110) headAt(ctx, p, k); });
    }
    if (show.needles) for (let y = 22; y < H; y += 38) for (let x = 22; x < W; x += 38) {
      if (geo.inside(x, y)) continue;
      const [bx, by] = Bat(x, y); needle(ctx, x, y, bx, by, 9, 2.6);
    }
    drawBody(ctx);
    // la bàn
    let x = comp.fx * W, y = comp.fy * H;
    if (mode === 'earth') {                                   // không cho la bàn chui vào lòng đất
      const dx = x - geo.cx, dy = y - geo.cy, d = Math.hypot(dx, dy), rmin = geo.R + 2;
      if (d < rmin) { x = geo.cx + dx / (d || 1) * rmin; y = geo.cy + dy / (d || 1) * rmin; comp.fx = x / W; comp.fy = y / H; }
    }
    const b = Bat(x, y);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    needle(ctx, x, y, b[0], b[1], 17, 4.5);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    readout(b);
  }
  function readout(b) {
    const dl = document.getElementById('mRead'); let rows;
    const ang = (Math.atan2(-b[1], b[0]) * 180 / Math.PI + 360) % 360;
    if (mode === 'earth') {
      const [, , r, c] = b, Bt = B0 / r ** 3 * Math.sqrt(1 + 3 * c * c);
      const lam = Math.asin(Math.max(-1, Math.min(1, -c))) * 180 / Math.PI;          // vĩ độ từ: dương ở bán cầu Bắc
      const inc = Math.atan(2 * Math.tan(lam * Math.PI / 180)) * 180 / Math.PI;
      rows = [['B tại la bàn', fmt(Bt, 'T'), 1], ['Khoảng cách tới tâm', num(r, 3) + ' R'], ['Vĩ độ từ λ', num(lam, 3) + '°'], ['Độ nghiêng từ I', num(inc, 3) + '°']];
    } else {
      rows = [['Hướng kim (0° = sang phải)', num(ang, 3) + '°', 1]];
    }
    dl.replaceChildren(...rows.flatMap(([k, v, big]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; if (big) dd.className = 'big'; return [dt, dd]; }));
    setTxt('mNote', NOTES[mode]);
  }
  cv.addEventListener('pointerdown', e => {
    const [x, y] = xy(cv, e);
    if (Math.hypot(comp.fx * st.W - x, comp.fy * st.H - y) < 30 || !geo.inside(x, y)) {
      drag = true; comp.fx = clampF(x / st.W, 22 / st.W); comp.fy = clampF(y / st.H, 22 / st.H);
      cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing'); draw();
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const [x, y] = xy(cv, e);
    comp.fx = clampF(x / st.W, 22 / st.W); comp.fy = clampF(y / st.H, 22 / st.H); draw();
  });
  const end = () => { drag = false; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  watchCanvas(cv, st, () => { dirty = true; draw(); });
})();
  },
});
})();
