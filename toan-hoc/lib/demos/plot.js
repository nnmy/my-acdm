/* =====================================================================
   Toán học & ứng dụng: tiện ích vẽ đồ thị dùng chung cho các minh họa (nạp qua def.deps = ['plot']).
   LT.plot(st, view) -> P với:
     P.X(x), P.Y(y): tọa độ toán -> pixel;  P.ix(px), P.iy(py): pixel -> tọa độ toán
     P.frame(opts): nền, lưới, trục, nhãn số;  P.curve(f, color, width, dash): vẽ đồ thị y = f(x), tự ngắt khi nhảy vọt
     P.clip(fn): vẽ trong khung đồ thị;  P.dot(x, y, color, r, hollow)
   view = { x0, x1, y0, y1, l, r, t, b } (l, r, t, b: lề pixel)
   ===================================================================== */
(() => {
const C = LT.COLORS;
const niceStep = span => { const raw = span / 7, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
const lab = v => { const a = Math.abs(v); let s = a >= 1e4 || (a < 1e-3 && a > 0) ? v.toExponential(0) : (+v.toPrecision(6)).toString(); return s.replace('.', ',').replace('-', '−'); };
LT.plot = (st, v) => {
  const l = v.l ?? 46, r = v.r ?? 14, t = v.t ?? 14, b = v.b ?? 30;
  const W = st.W, H = st.H, pw = W - l - r, ph = H - t - b;
  const X = x => l + (x - v.x0) / (v.x1 - v.x0) * pw, Y = y => t + (v.y1 - y) / (v.y1 - v.y0) * ph;
  const ix = px => v.x0 + (px - l) / pw * (v.x1 - v.x0), iy = py => v.y1 - (py - t) / ph * (v.y1 - v.y0);
  const ctx = st.ctx;
  const P = { X, Y, ix, iy, l, r, t, b, pw, ph, ctx, v };
  P.clip = fn => { ctx.save(); ctx.beginPath(); ctx.rect(l, t, pw, ph); ctx.clip(); fn(); ctx.restore(); };
  P.frame = (o = {}) => {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(l, t, pw, ph);
    const sx = o.xstep || niceStep(v.x1 - v.x0), sy = o.ystep || niceStep(v.y1 - v.y0);
    ctx.lineWidth = 1; ctx.strokeStyle = '#E8EEF2'; ctx.beginPath();
    for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1 + 1e-9; x += sx) { ctx.moveTo(Math.round(X(x)) + .5, t); ctx.lineTo(Math.round(X(x)) + .5, t + ph); }
    for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1 + 1e-9; y += sy) { ctx.moveTo(l, Math.round(Y(y)) + .5); ctx.lineTo(l + pw, Math.round(Y(y)) + .5); }
    ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
    if (v.y0 <= 0 && v.y1 >= 0) { ctx.moveTo(l, Y(0)); ctx.lineTo(l + pw, Y(0)); }
    if (v.x0 <= 0 && v.x1 >= 0) { ctx.moveTo(X(0), t); ctx.lineTo(X(0), t + ph); }
    ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(l + .5, t + .5, pw - 1, ph - 1);
    ctx.fillStyle = C.muted; ctx.font = '12px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const xl = o.xlab || lab, yl = o.ylab || lab;
    for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1 + 1e-9; x += sx) ctx.fillText(xl(Math.abs(x) < sx * 1e-6 ? 0 : x), X(x), t + ph + 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1 + 1e-9; y += sy) ctx.fillText(yl(Math.abs(y) < sy * 1e-6 ? 0 : y), l - 6, Y(y));
    if (o.xname) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = C.ink; ctx.fillText(o.xname, l + pw - 4, t + ph - 3); }
    if (o.yname) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = C.ink; ctx.fillText(o.yname, l + 5, t + 4); }
  };
  P.curve = (f, color, width = 2.5, dash, xa = v.x0, xb = v.x1) => P.clip(() => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
    const n = Math.max(200, Math.round(pw * 2)), span = v.y1 - v.y0; let pen = false, py = null;
    ctx.beginPath();
    for (let k = 0; k <= n; k++) {
      const x = xa + (xb - xa) * k / n, y = f(x);
      if (!isFinite(y) || (py !== null && Math.abs(y - py) > span * 3)) { pen = false; py = isFinite(y) ? y : null; continue; }
      const yy = Math.max(v.y0 - span * 2, Math.min(v.y1 + span * 2, y));
      if (pen) ctx.lineTo(X(x), Y(yy)); else { ctx.moveTo(X(x), Y(yy)); pen = true; }
      py = y;
    }
    ctx.stroke(); ctx.setLineDash([]);
  });
  P.dot = (x, y, color, rad = 5, hollow = false) => {
    ctx.beginPath(); ctx.arc(X(x), Y(y), rad, 0, 2 * Math.PI);
    if (hollow) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke(); }
  };
  P.text = (s, x, y, color = C.ink, align = 'left', base = 'bottom', bold = false) => {
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.font = (bold ? '600 ' : '') + '13px ' + getComputedStyle(document.body).fontFamily; ctx.fillText(s, x, y);
  };
  return P;
};
LT.vn = (v, d = 4) => LT.num(v, d);
})();
