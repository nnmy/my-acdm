/* =====================================================================
   Trình xem bệnh não: ảnh người khoẻ | ảnh bệnh nhân, cùng một lát cắt.
   Độc lập với lib/atlas.js. Trang 1-brain-mri.html chỉ nạp file này (và compare.css) khi
   người xem bấm nút một bệnh; 1b-brain-disease.html dùng nó như một trang riêng để soạn ca.

   Dùng:  CMP.start({ host, data, labels, caseId, hideCases, onPin, onClose })  -> Promise
          CMP.open(caseId)            đổi ca (dữ liệu đã tải được giữ lại)
     host       phần tử chứa; trình xem tự dựng giao diện bên trong (mọi id có tiền tố dz)
     hideCases  ẩn thanh chọn ca (trang cha có nút riêng)
     onPin(n)   có thì hiện nút Ghim; n là bản ghi ghim (kind: 'disease') kèm ảnh thu nhỏ
     onClose()  có thì hiện nút X đỏ ở góc trên phải
   Dữ liệu: lib/data/brain-disease/
     cases.json        danh sách ca (viết tay)
     <ca>/case.json    nội dung chữ, vùng khoanh, marker, nguồn (viết tay)
     <ca>/meta.json    do tools/prepare_disease_cases.py tạo (đừng sửa tay)
   Ca: khối 3D trên lưới MNI của trang atlas (x nhanh nhất, RAS, 1 mm); mỗi khung có ảnh, nhãn
   và (bệnh nhân) mặt nạ tổn thương riêng. Tọa độ dùng chung là mm (MNI).
   Marker trong case.json: { "kind": "circle" | "arrow", "mm": [x, y, z], "r": 4, "text": "...",
     "pane": "patient" | "control" | "both", "mods": ["dwi"], "dir": 45 }; hiện cùng lớp khoanh vùng,
   chỉ trên các lát cách tâm marker không quá 2 mm.
   Mục lục: 1. tiện ích  2. tải dữ liệu  3. hình học  4. dựng lát  5. vẽ  6. tương tác  7. ghim  8. phần chữ  9. giao diện
   ===================================================================== */
const CMP = (() => {
'use strict';

/* ---------------- 1. tiện ích ---------------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sgn = v => (v < 0 ? '−' + Math.abs(v) : String(v));
const num = (v, d = 1) => v.toFixed(d).replace('.', ',');
const MODNAME = { t1: 'T1', t2: 'T2', flair: 'FLAIR', dwi: 'DWI', adc: 'ADC', swi: 'SWI', pd: 'PD' };
const modName = m => MODNAME[m] || m.toUpperCase();
const SIDE = { R: 'phải', L: 'trái', '': '' };
const ROLES = ['control', 'patient'];
const ROLE_VI = { control: 'người khoẻ', patient: 'bệnh nhân' };
const ORIENT_VI = { ax: 'Axial', cor: 'Coronal', sag: 'Sagittal' };
const TOL = 2;                      // mm
const LES_RGB = [255, 77, 61];
const GOLD = '#f2c230', SKY = 'rgba(123,205,232,.95)';
const TITLE_MAX = 60;               // ký tự tối đa của tên công trình trong phần nguồn
const MIN_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2"/></svg>';
const MAX_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const X_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

let root = null;
const $ = id => document.getElementById(id);

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw Object.assign(new Error(url + ': HTTP ' + r.status), { status: r.status });
  return r.json();
}
async function fetchBytes(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
  if (!res.body || !res.body.getReader) { const b = new Uint8Array(await res.arrayBuffer()); onBytes(b.length); return b; }
  const rd = res.body.getReader(), parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; onBytes(value.length); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function gunzip(b) {
  if (!(b[0] === 0x1f && b[1] === 0x8b)) return b;
  if (!('DecompressionStream' in window)) throw new Error('Trình duyệt quá cũ: thiếu DecompressionStream để giải nén dữ liệu.');
  const st = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(st).arrayBuffer());
}

/* ---------------- trạng thái ---------------- */
const S = {
  cfg: null, L: null, cases: [], cache: new Map(), C: null, tok: 0, ready: null,
  mod: null, orient: 'ax', slice: { ax: 0, cor: 0, sag: 0 }, zoom: 1,
  cur: null, lock: null, pinned: false,       // mm [x, y, z]
  showReg: true,
  films: {}, sl: null, slKey: '', ov: {}, ovKey: '',
};

/* ---------------- 2. tải dữ liệu ---------------- */
function loaderMsg(html, err) { const l = $('dzLoader'); l.hidden = false; l.classList.toggle('err', !!err); l.innerHTML = '<div>' + html + '</div>'; }

async function loadCase(id) {
  if (S.cache.has(id)) return S.cache.get(id);
  const base = S.cfg.data + id + '/';
  const def = await fetchJSON(base + 'case.json');
  let meta;
  try { meta = await fetchJSON(base + 'meta.json'); }
  catch (e) { if (e.status === 404) throw Object.assign(new Error('nodata'), { nodata: true, def }); throw e; }
  if (meta.type !== 'volume') throw new Error('meta.json: trình xem chỉ hỗ trợ ca dạng khối (type "volume")');
  const C = { id, def, meta, base, panes: { control: {}, patient: {} } };
  [C.X, C.Y, C.Z] = meta.dims; C.N = C.X * C.Y * C.Z; C.org = meta.origin_mm;
  const jobs = [];
  for (const r of ROLES) {
    const p = meta.panes[r]; if (!p) continue;
    for (const [m, f] of Object.entries(p.files)) jobs.push([r, 'mod', m, f, p.bytes[m]]);
    jobs.push([r, 'seg', null, p.seg, p.bytes.seg]);
    if (p.lesion) jobs.push([r, 'lesion', null, p.lesion, p.bytes.lesion]);
  }
  const total = jobs.reduce((a, j) => a + (j[4] || 0), 0); let got = 0;
  loaderMsg(`Đang tải ảnh (khoảng ${Math.max(1, Math.round(total / 1e6))} MB)<div class="bar"><i id="dzBar"></i></div>`);
  const bufs = await Promise.all(jobs.map(j => fetchBytes(base + j[3], k => {
    got += k; const bar = $('dzBar'); if (bar && total) bar.style.width = Math.min(100, got / total * 100) + '%';
  }).then(gunzip)));
  jobs.forEach((j, i) => {
    const b = bufs[i];
    if (b.length !== C.N) throw new Error(`File ${j[3]} có ${b.length} byte, cần ${C.N}.`);
    const P = C.panes[j[0]];
    if (j[1] === 'mod') (P.vol = P.vol || {})[j[2]] = b; else P[j[1]] = b;
  });
  C.lut = {};
  for (const [m, info] of Object.entries(meta.mods)) {
    const [lo, hi] = info.window, t = new Uint8ClampedArray(256);
    for (let v = 1; v < 256; v++) t[v] = (v - lo) / Math.max(1, hi - lo) * 255;
    C.lut[m] = t;
  }
  C.regIds = new Set();
  for (const key of def.regions || []) for (const id2 of S.ids[key] || []) C.regIds.add(id2);
  S.cache.set(id, C);
  return C;
}

async function open(id) {
  if (S.ready) await S.ready;
  const tok = ++S.tok;
  root.querySelectorAll('[data-dz-case]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dzCase === id)));
  if (!S.cfg.onClose) { try { const u = new URL(location.href); u.searchParams.set('case', id); history.replaceState(null, '', u); } catch (e) { /* bỏ qua */ } }
  S.C = null; S.sl = null; S.slKey = ''; S.ov = {}; S.ovKey = ''; S.cur = S.lock = null;
  let C;
  try { C = await loadCase(id); }
  catch (e) {
    if (tok !== S.tok) return;
    console.error(e);
    if (e.nodata) {
      setTags(e.def); renderInfo({ def: e.def, meta: null });
      loaderMsg('Ca này chưa có dữ liệu ảnh.<br><br>Tạo dữ liệu bằng <code>tools/prepare_disease_cases.py</code> theo <code>README-brain-disease.md</code>, rồi tải lại trang.', true);
    } else loaderMsg('Không tải được ca này: ' + esc(e.message), true);
    drawAll(); readout(); return;
  }
  if (tok !== S.tok) return;
  S.C = C;
  $('dzLoader').hidden = true;
  const d = C.def.default || {}, mods = Object.keys(C.meta.mods);
  S.mod = mods.includes(d.mod) ? d.mod : mods[0];
  S.zoom = d.zoom || 1;
  S.showReg = true;
  S.orient = d.orient || 'ax';
  S.slice = { ax: Math.floor(C.Z / 2), cor: Math.floor(C.Y / 2), sag: Math.floor(C.X / 2) };
  const p = target(d); if (p) setSlicesTo(p);
  setTags(C.def); renderMods(); renderInfo(C); syncToggles(); refresh();
}
function setTags(def) {
  for (const r of ROLES) {
    const pd = ((def || {}).panes || {})[r] || {};
    $('dz-tag-' + r).textContent = pd.label || (r === 'control' ? 'Người khoẻ' : 'Bệnh nhân');
    $('dz-det-' + r).textContent = pd.detail || '';
  }
}

/* ---------------- 3. hình học (quy ước thần kinh, như trang atlas) ---------------- */
const OR = {
  ax: { axis: 2, W: C => C.X, H: C => C.Y,
        toV: (C, u, v, s) => [u, C.Y - 1 - v, s], toUV: (C, p) => [p[0], C.Y - 1 - p[1]], edge: ['L', 'R', 'A', 'P'] },
  cor: { axis: 1, W: C => C.X, H: C => C.Z,
        toV: (C, u, v, s) => [u, s, C.Z - 1 - v], toUV: (C, p) => [p[0], C.Z - 1 - p[2]], edge: ['L', 'R', 'S', 'I'] },
  sag: { axis: 0, W: C => C.Y, H: C => C.Z,
        toV: (C, u, v, s) => [s, C.Y - 1 - u, C.Z - 1 - v], toUV: (C, p) => [C.Y - 1 - p[1], C.Z - 1 - p[2]], edge: ['A', 'P', 'S', 'I'] },
};
function view(o = S.orient, s = S.slice[o]) {
  const C = S.C, D = OR[o], org = C.org;
  return {
    W: D.W(C), H: D.H(C), edge: D.edge,
    toMM: (u, v) => D.toV(C, u, v, s).map((q, i) => q + org[i]),
    toUV: mm => { const p = mm.map((q, i) => Math.round(q - org[i])); const [u, v] = D.toUV(C, p); return [u, v, Math.abs(p[D.axis] - s)]; },
  };
}
const voxOf = mm => { const C = S.C, p = mm.map((q, i) => Math.round(q - C.org[i])); return p.every((q, i) => q >= 0 && q < C.meta.dims[i]) ? p : null; };
const vidx = p => p[0] + S.C.X * (p[1] + S.C.Y * p[2]);

function target(g) {
  const C = S.C; if (!C || !g) return null;
  if (g.mm) return g.mm.slice();
  if (!g.at) return null;
  let p = null;
  if (g.at === 'lesion') p = C.meta.lesion && C.meta.lesion.center;
  else {
    const seeds = (C.meta.panes.patient || {}).seeds || {}, ids = S.ids[g.at] || [];
    const want = g.side ? ids.filter(i => S.L.labels[i].side === g.side) : ids;
    for (const i of want) if (seeds[i]) { p = seeds[i]; break; }
  }
  return p ? p.map((q, i) => q + C.org[i]) : null;
}
function setSlicesTo(mm) {
  const C = S.C, p = mm.map((q, i) => Math.min(C.meta.dims[i] - 1, Math.max(0, Math.round(q - C.org[i]))));
  S.slice = { ax: p[2], cor: p[1], sag: p[0] };
}

/* ---------------- 4. dựng lát ---------------- */
const canvasOf = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function buildSlice(o = S.orient, s = S.slice[o], mod = S.mod) {
  const C = S.C, D = OR[o], W = D.W(C), H = D.H(C), n = W * H, src = new Int32Array(n);
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) src[u + W * v] = vidx(D.toV(C, u, v, s));
  const out = { W, H, panes: {} };
  for (const r of ROLES) {
    const P = C.panes[r]; if (!P.seg) continue;
    const q = { lab: new Uint8Array(n), les: null, gray: null };
    for (let i = 0; i < n; i++) q.lab[i] = P.seg[src[i]];
    if (P.lesion) { q.les = new Uint8Array(n); for (let i = 0; i < n; i++) q.les[i] = P.lesion[src[i]]; }
    const vol = P.vol && P.vol[mod];
    if (vol) {
      const im = new ImageData(W, H), d = im.data, lut = C.lut[mod];
      for (let i = 0; i < n; i++) { const g = lut[vol[src[i]]]; d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = g; d[4 * i + 3] = 255; }
      q.gray = canvasOf(W, H); q.gray.getContext('2d').putImageData(im, 0, 0);
    }
    out.panes[r] = q;
  }
  out.les = C.panes.patient && C.panes.patient.lesion ? out.panes.patient.les : null;
  return out;
}
/* viền các cấu trúc trong "regions" (màu cấu trúc) + viền tổn thương (đỏ; nét chấm ở khung người khoẻ) */
function buildOverlay(sl, r) {
  const C = S.C, q = sl.panes[r]; if (!q) return null;
  const { W, H } = sl, im = new ImageData(W, H), d = im.data, lab = q.lab, reg = C.regIds;
  const put = (i, c, a) => { const k = 4 * i; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = a; };
  if (reg.size) {
    for (let i = 0; i < W * H; i++) {
      const l = lab[i]; if (!reg.has(l)) continue;
      const x = i % W, y = (i / W) | 0;
      if ((x > 0 && lab[i - 1] !== l) || (x < W - 1 && lab[i + 1] !== l) || (y > 0 && lab[i - W] !== l) || (y < H - 1 && lab[i + W] !== l)) put(i, S.colors[l] || [255, 255, 255], 255);
    }
  }
  const les = sl.les;
  if (les) {
    const dotted = r !== 'patient';
    for (let i = 0; i < W * H; i++) {
      if (!les[i]) continue;
      const x = i % W, y = (i / W) | 0;
      if (!((x > 0 && !les[i - 1]) || (x < W - 1 && !les[i + 1]) || (y > 0 && !les[i - W]) || (y < H - 1 && !les[i + W]))) continue;
      if (dotted && ((x + y) % 3 === 0)) continue;
      put(i, LES_RGB, dotted ? 210 : 255);
    }
  }
  const cv = canvasOf(W, H); cv.getContext('2d').putImageData(im, 0, 0); return cv;
}
function refresh() {
  if (S.C) {
    const key = [S.orient, S.slice[S.orient], S.mod].join('|');
    if (key !== S.slKey) { S.sl = buildSlice(); S.slKey = key; S.ovKey = ''; }
    const ok = [S.slKey, S.showReg].join('|');
    if (ok !== S.ovKey) { S.ov = {}; if (S.showReg) for (const r of ROLES) S.ov[r] = buildOverlay(S.sl, r); S.ovKey = ok; }
  }
  syncSlice(); drawAll(); readout();
}

/* ---------------- 5. vẽ ---------------- */
function fit(f) {
  const dpr = window.devicePixelRatio || 1, w = Math.max(1, Math.round(f.cv.clientWidth * dpr)), h = Math.max(1, Math.round(f.cv.clientHeight * dpr));
  if (f.cv.width !== w || f.cv.height !== h) { f.cv.width = w; f.cv.height = h; }
}
/* ảnh vừa khung; khi phóng to thì lấy điểm khóa (hoặc điểm mở đầu của ca) làm tâm */
function geom(f, V) {
  const cw = f.cv.width, ch = f.cv.height, s0 = Math.min(cw / V.W, ch / V.H), sc = s0 * S.zoom;
  let cu = V.W / 2, cv = V.H / 2;
  if (S.zoom > 1) {
    const fm = S.lock || target(S.C.def.default || {});
    if (fm) { const [u, v] = V.toUV(fm); cu = u + 0.5; cv = v + 0.5; }
  }
  const place = (len, c, box) => len <= box ? (box - len) / 2 : Math.min(0, Math.max(box - len, box / 2 - c * sc));
  return { sc, ox: place(V.W * sc, cu, cw), oy: place(V.H * sc, cv, ch) };
}
function drawAll() { ROLES.forEach(r => drawFilm(S.films[r], r)); }
function drawFilm(f, r) {
  fit(f);
  const ctx = f.ctx, dpr = window.devicePixelRatio || 1, C = S.C, cw = f.cv.width, ch = f.cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  f.g = null; f.el.classList.remove('empty');
  if (!C) return;
  const V = view(), g = geom(f, V); f.g = g; f.V = V;
  const img = S.sl.panes[r] && S.sl.panes[r].gray;
  if (!img) {
    f.el.classList.add('empty'); f.g = null;
    ctx.fillStyle = '#A9B4C0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(14 * dpr)}px "Be Vietnam Pro", system-ui, sans-serif`;
    const a1 = `Không có ảnh ${modName(S.mod)}`, a2 = `của ${ROLE_VI[r]}`;
    if (ctx.measureText(a1 + ' ' + a2).width < cw - 24 * dpr) ctx.fillText(a1 + ' ' + a2, cw / 2, ch / 2);
    else { ctx.fillText(a1, cw / 2, ch / 2 - 10 * dpr); ctx.fillText(a2, cw / 2, ch / 2 + 10 * dpr); }
    return;
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, g.ox, g.oy, V.W * g.sc, V.H * g.sc);
  if (S.showReg && S.ov[r]) { ctx.imageSmoothingEnabled = false; ctx.drawImage(S.ov[r], g.ox, g.oy, V.W * g.sc, V.H * g.sc); }
  if (S.showReg) drawMarkers(ctx, r, V, g, dpr);
  const e = V.edge, fs = Math.max(11, Math.round(13 * dpr));
  ctx.font = `600 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillStyle = 'rgba(220,227,234,.85)'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(e[0], 8 * dpr, ch / 2);
  ctx.textAlign = 'right'; ctx.fillText(e[1], cw - 8 * dpr, ch / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(e[2], cw / 2, 6 * dpr);
  ctx.textBaseline = 'bottom'; ctx.fillText(e[3], cw / 2, ch - 6 * dpr);
  const p = S.lock || S.cur; if (!p) return;
  const [u, v, off] = V.toUV(p), X = g.ox + (u + 0.5) * g.sc, Y = g.oy + (v + 0.5) * g.sc, gap = 7 * dpr;
  ctx.save(); ctx.strokeStyle = S.lock ? GOLD : SKY; ctx.lineWidth = Math.max(1, dpr);
  if (off > 0.5) ctx.setLineDash([4 * dpr, 4 * dpr]);
  const x0 = Math.max(0, g.ox), x1 = Math.min(cw, g.ox + V.W * g.sc), y0 = Math.max(0, g.oy), y1 = Math.min(ch, g.oy + V.H * g.sc);
  ctx.beginPath();
  ctx.moveTo(x0, Y); ctx.lineTo(X - gap, Y); ctx.moveTo(X + gap, Y); ctx.lineTo(x1, Y);
  ctx.moveTo(X, y0); ctx.lineTo(X, Y - gap); ctx.moveTo(X, Y + gap); ctx.lineTo(X, y1);
  ctx.stroke(); ctx.restore();
}
/* marker: vòng tròn / mũi tên vàng kèm chữ; tọa độ màn hình qua hàm toXY (dùng chung cho ảnh ghim) */
function drawMarkers(ctx, r, V, g, dpr, toXY) {
  const list = (S.C.def.markers || []).filter(m => Array.isArray(m.mm) && ((m.pane || 'patient') === r || m.pane === 'both'));
  for (const m of list) {
    if (m.mods && !m.mods.includes(S.mod)) continue;
    const [u, v, off] = V.toUV(m.mm); if (off > TOL) continue;
    const [X, Y] = toXY ? toXY(u, v) : [g.ox + (u + 0.5) * g.sc, g.oy + (v + 0.5) * g.sc];
    ctx.save(); ctx.strokeStyle = GOLD; ctx.fillStyle = GOLD; ctx.lineWidth = 2 * dpr;
    let tx = X, ty = Y;
    if (m.kind === 'arrow') {
      const a = (m.dir == null ? 45 : m.dir) * Math.PI / 180, L = 42 * dpr, hx = Math.cos(a), hy = -Math.sin(a);
      const sx = X + hx * L, sy = Y + hy * L, ex = X + hx * 5 * dpr, ey = Y + hy * 5 * dpr;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      const hw = 7 * dpr, bx = ex + hx * 10 * dpr, by = ey + hy * 10 * dpr;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(bx - hy * hw * 0.6, by + hx * hw * 0.6); ctx.lineTo(bx + hy * hw * 0.6, by - hx * hw * 0.6); ctx.closePath(); ctx.fill();
      tx = sx; ty = sy;
    } else {
      const rad = Math.max(4 * dpr, (m.r || 4) * g.sc);
      ctx.beginPath(); ctx.arc(X, Y, rad, 0, 2 * Math.PI); ctx.stroke();
      tx = X + rad * 0.72; ty = Y - rad * 0.72;
    }
    if (m.text) {
      ctx.font = `600 ${Math.round(13 * dpr)}px "Be Vietnam Pro", system-ui, sans-serif`;
      const pad = 5 * dpr, th = 22 * dpr, tw = ctx.measureText(m.text).width + 2 * pad;
      let bx = tx + 4 * dpr, by = ty - th - 2 * dpr;
      if (bx + tw > ctx.canvas.width - 4) bx = tx - 4 * dpr - tw;
      if (by < 4) by = ty + 4 * dpr;
      ctx.fillStyle = 'rgba(27,25,32,.85)'; ctx.fillRect(bx, by, tw, th);
      ctx.fillStyle = GOLD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(m.text, bx + pad, by + th / 2 + 0.5);
    }
    ctx.restore();
  }
}

/* ---------------- 6. tương tác ---------------- */
function mmAt(f, cx, cy) {
  if (!f.g) return null;
  const rc = f.cv.getBoundingClientRect(), dpr = f.cv.width / rc.width;
  const u = Math.floor(((cx - rc.left) * dpr - f.g.ox) / f.g.sc), v = Math.floor(((cy - rc.top) * dpr - f.g.oy) / f.g.sc);
  if (u < 0 || v < 0 || u >= f.V.W || v >= f.V.H) return null;
  return f.V.toMM(u, v).map(q => Math.round(q * 10) / 10);
}
function setLock(mm) {
  S.lock = mm; S.pinned = false;
  if (mm && S.C) { const o = S.orient, keep = S.slice[o]; setSlicesTo(mm); S.slice[o] = keep; }
  refresh();
}
function bindFilm(f) {
  let down = null;
  f.cv.addEventListener('pointermove', e => {
    if (!S.C) return;
    const mm = mmAt(f, e.clientX, e.clientY);
    if (String(mm) !== String(S.cur)) { S.cur = mm; drawAll(); readout(); }
  });
  f.cv.addEventListener('pointerleave', () => { if (S.cur) { S.cur = null; drawAll(); readout(); } });
  f.cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  f.cv.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) { down = null; return; }
    down = null;
    const mm = mmAt(f, e.clientX, e.clientY); if (!mm) return;
    const same = S.lock && Math.hypot(...S.lock.map((q, i) => q - mm[i])) < 1.5;
    setLock(same ? null : mm);
  });
  f.cv.addEventListener('keydown', e => {
    if (!S.C) return;
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault(); stepSlice(e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const V = view(); setLock(S.lock ? null : (S.cur || V.toMM(Math.floor(V.W / 2), Math.floor(V.H / 2))));
    }
  });
}
function stepSlice(d) {
  const n = S.C.meta.dims[OR[S.orient].axis];
  S.slice[S.orient] = Math.min(n - 1, Math.max(0, S.slice[S.orient] + d)); refresh();
}
function syncSlice() {
  const C = S.C;
  root.querySelectorAll('[data-dz-orient]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dzOrient === S.orient)));
  root.querySelectorAll('[data-dz-zoom]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.dzZoom === S.zoom)));
  root.querySelectorAll('[data-dz-mod]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dzMod === S.mod)));
  if (!C) return;
  const ax = OR[S.orient].axis, el = $('dzSlice');
  el.max = C.meta.dims[ax] - 1; el.value = S.slice[S.orient];
  $('dzSliceOut').textContent = 'xyz'[ax] + ' ' + sgn(Math.round(S.slice[S.orient] + C.org[ax])) + ' mm';
}
function syncToggles() { $('dzReg').setAttribute('aria-pressed', String(S.showReg)); }
function nameOf(l) {
  const e = S.L.labels[l]; if (!e) return null;
  const st = S.L.structures[e.s]; if (!st) return null;
  return { vi: st.vi + (e.side ? ' ' + SIDE[e.side] : ''), en: st.en, key: e.s, side: e.side, st };
}
function readout() {
  const C = S.C, p = S.lock || S.cur;
  for (const r of ROLES) {
    const el = $('dz-rd-' + r);
    if (!C || !p) {
      el.innerHTML = r === 'control' && C ? '<span class="q">Rê chuột lên ảnh để xem tên cấu trúc. Nhấp để khóa điểm.</span>' : '';
      continue;
    }
    let html = '';
    const P = C.panes[r], v = voxOf(p);
    if (v && P.seg) {
      const i = vidx(v), nm = nameOf(P.seg[i]);
      html += nm ? `<b>${esc(nm.vi)}</b>` : '<span class="q">ngoài não</span>';
      const vol = P.vol && P.vol[S.mod];
      if (vol && vol[i]) html += ` <span class="q">${esc(modName(S.mod))} ${Math.round(vol[i] / C.meta.mods[S.mod].ref_wm * 100)}% chất trắng</span>`;
      if (P.lesion && P.lesion[i]) html += ' <span class="les">trong vùng tổn thương</span>';
    }
    if (r === 'patient') {
      html += `<span class="xy">x ${sgn(Math.round(p[0]))}, y ${sgn(Math.round(p[1]))}, z ${sgn(Math.round(p[2]))} mm</span>`;
      if (S.lock) {
        if (S.cfg.onPin) html += ` <button type="button" class="pin" id="dzPin"${S.pinned ? ' disabled' : ''}>${S.pinned ? 'Đã ghim' : 'Ghim'}</button>`;
        else html += ' <button type="button" id="dzCopy" title="Chép tọa độ để dán vào marker trong case.json">Chép tọa độ</button>';
        html += ' <button type="button" id="dzUnlock">Bỏ khóa</button>';
      }
    }
    el.innerHTML = html;
  }
  const cp = $('dzCopy'); if (cp) cp.onclick = () => {
    const t = '[' + S.lock.map(q => Math.round(q * 10) / 10).join(', ') + ']';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { cp.textContent = 'Đã chép ' + t; }, () => { cp.textContent = t; });
  };
  const pn = $('dzPin'); if (pn) pn.onclick = pin;
  const ul = $('dzUnlock'); if (ul) ul.onclick = () => setLock(null);
}

/* ---------------- 7. ghim ----------------
   Ảnh thu nhỏ: khoẻ | bệnh quanh điểm khóa, cùng lớp khoanh vùng đang hiện.
   C = cạnh khung (mm): rộng cho thẻ ghim, sát hơn cho file PDF. */
function pinThumb(C) {
  const P = 240, GAP = 4, o = S.orient, ax = OR[o].axis, p = voxOf(S.lock);
  const s = p ? p[ax] : S.slice[o], sl = buildSlice(o, s), V = view(o, s);
  const [pu, pv] = V.toUV(S.lock), cu = pu + 0.5 - C / 2, cv = pv + 0.5 - C / 2, k = P / C;
  const cvs = canvasOf(P * 2 + GAP, P), ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  ROLES.forEach((r, j) => {
    const ox = j * (P + GAP), q = sl.panes[r];
    ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, P, P); ctx.clip();
    if (q && q.gray) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(q.gray, ox - cu * k, -cv * k, sl.W * k, sl.H * k);
      if (S.showReg) {
        const ov = buildOverlay(sl, r);
        if (ov) { ctx.imageSmoothingEnabled = false; ctx.drawImage(ov, ox - cu * k, -cv * k, sl.W * k, sl.H * k); }
        drawMarkers(ctx, r, V, { sc: k }, 1, (u, v) => [ox + (u - cu + 0.5) * k, (v - cv + 0.5) * k]);
      }
      const X = ox + (pu - cu + 0.5) * k, Y = (pv - cv + 0.5) * k;
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X - 10, Y); ctx.lineTo(X - 4, Y); ctx.moveTo(X + 4, Y); ctx.lineTo(X + 10, Y);
      ctx.moveTo(X, Y - 10); ctx.lineTo(X, Y - 4); ctx.moveTo(X, Y + 4); ctx.lineTo(X, Y + 10); ctx.stroke();
    } else {
      ctx.fillStyle = '#A9B4C0'; ctx.font = '15px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`Không có ${modName(S.mod)}`, ox + P / 2, P / 2);
    }
    ctx.fillStyle = '#fff'; ctx.font = '22px VT323, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((r === 'control' ? 'Khoẻ ' : 'Bệnh ') + modName(S.mod), ox + 7, 5);
    ctx.restore();
  });
  return cvs.toDataURL('image/jpeg', 0.88);
}
async function pin() {
  const C = S.C, p = S.lock; if (!C || !p || !S.cfg.onPin) return;
  const v = voxOf(p), P = C.panes.patient, i = v ? vidx(v) : -1;
  const nm = i >= 0 && P.seg ? nameOf(P.seg[i]) : null;
  const vol = P.vol && P.vol[S.mod];
  const caseInfo = S.cases.find(c => c.id === C.id) || {};
  const note = {
    kind: 'disease', time: Date.now(), caseId: C.id, caseLabel: caseInfo.label || C.def.title || C.id, caseTitle: C.def.title || '',
    mod: S.mod, orient: S.orient, mni: p.map(q => Math.round(q)),
    key: nm ? nm.key : '', side: nm && nm.st.lateral ? nm.side : '', vi: nm ? nm.st.vi : 'Ngoài não', en: nm ? nm.st.en : 'Outside the brain',
    lesion: !!(P.lesion && i >= 0 && P.lesion[i]),
    rel: vol && i >= 0 && vol[i] ? Math.round(vol[i] / C.meta.mods[S.mod].ref_wm * 100) : null,
    thumb: pinThumb(110), thumbPdf: pinThumb(70), min: true,
  };
  const b = $('dzPin'); if (b) { b.disabled = true; b.textContent = 'Đang ghim…'; }
  try { await S.cfg.onPin(note); S.pinned = true; }
  catch (e) { console.error(e); }
  readout();
}

/* ---------------- 8. phần chữ ---------------- */
const short = (t, n) => (t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);
function renderInfo(C) {
  const d = C.def || {};
  $('dzTitle').textContent = d.title || '';
  $('dzSummary').innerHTML = (d.summary || []).map(t => `<p>${esc(t)}</p>`).join('');
  const fl = d.findings || [];
  $('dzFind').innerHTML = fl.length ? fl.map((x, i) => `<li><span>${esc(x.text)}</span>${x.go && C.meta ? `<button class="btn" type="button" data-go="${i}">Xem trên ảnh</button>` : ''}</li>`).join('') : '<li><span class="q">Chưa có.</span></li>';
  $('dzFind').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => goTo(fl[+b.dataset.go].go)));
  // nguồn: tác giả, năm + tên công trình (rút gọn) làm liên kết; tên đầy đủ hiện khi rê chuột
  $('dzSrc').innerHTML = (d.sources || []).map(s => {
    const t = s.title || s.text || '', link = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(t)}">${esc(short(t, TITLE_MAX))}</a>` : esc(short(t, TITLE_MAX));
    return `<li>${s.cite ? esc(s.cite) + '. ' : ''}${link}</li>`;
  }).join('');
  $('dzLic').innerHTML = esc(d.license || '');
  $('dzAck').hidden = !d.acknowledgment; $('dzAck').textContent = d.acknowledgment || '';
  $('dzTable').innerHTML = C.meta ? lesionTable(C) : '';
}
function goTo(go) {
  const C = S.C; if (!C) return;
  if (go.mod && C.meta.mods[go.mod]) S.mod = go.mod;
  if (go.orient) S.orient = go.orient;
  const p = target(go); if (p) setSlicesTo(p);
  if (go.zoom) S.zoom = go.zoom;
  S.lock = null; S.showReg = true;
  syncToggles(); refresh();
  const st = root.querySelector('.stage'); if (st && st.getBoundingClientRect().top < 0) st.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function lesionTable(C) {
  const m = C.meta; if (!m.lesion) return '';
  const tot = Object.values(m.lesion.overlap).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(m.lesion.overlap).sort((a, b) => b[1] - a[1]).filter(([id, n]) => nameOf(+id) && n >= 50).slice(0, 8);   // bỏ phần giao dưới 0,05 mL
  return `<h3>Tổn thương: ${num(m.lesion.ml)} mL</h3><div class="dz-tabwrap"><table class="dz-tab"><thead><tr><th>Cấu trúc bị ảnh hưởng</th><th>mL</th><th>% tổn thương</th></tr></thead><tbody>${
    top.map(([id, n]) => { const nm = nameOf(+id); return `<tr><td><i style="background:${esc(nm.st.color)}"></i>${esc(nm.vi)}</td><td>${num(n / 1000)}</td><td>${num(n / tot * 100, 0)}%</td></tr>`; }).join('')
  }</tbody></table></div><p class="dz-small">Ước lượng từ mặt nạ tổn thương và nhãn atlas đã warp sang bệnh nhân.</p>`;
}

/* ---------------- 9. giao diện ---------------- */
function markup(cfg) {
  return `<div class="dz" id="dzBox">
  ${cfg.onClose ? `<button class="dz-close" type="button" id="dzClose" title="Đóng" aria-label="Đóng trình xem bệnh">${X_SVG}</button>` : ''}
  <div class="dz-cases"${cfg.hideCases ? ' hidden' : ''}>
    <span class="lab" id="dzLbCase">Ca bệnh</span>
    <div class="btnrow" id="dzCases" role="group" aria-labelledby="dzLbCase"></div>
  </div>
  <div class="stage" id="dzStage">
    <div class="films">
      ${ROLES.map(r => `<div class="film" id="dz-film-${r}">
        <canvas id="dz-cv-${r}" tabindex="0" aria-label="Ảnh ${ROLE_VI[r]}. Mũi tên lên xuống đổi lát cắt, Enter để khóa điểm, Esc bỏ khóa."></canvas>
        <span class="tag" aria-hidden="true"><span id="dz-tag-${r}"></span><small id="dz-det-${r}"></small></span>
      </div>`).join('')}
      <div class="loader" id="dzLoader"><div>Đang chuẩn bị…</div></div>
    </div>
    <div class="readout-strip" aria-live="polite"><div id="dz-rd-control"></div><div id="dz-rd-patient"></div></div>
  </div>
  <div class="dz-ctl" id="dzCtl">
    <div class="dz-ctl-head"><span>Điều khiển</span><button class="iconbtn" type="button" id="dzCtlMin" aria-controls="dzCtlBody"></button></div>
    <div class="dz-ctl-body" id="dzCtlBody">
      <div class="ctl">
        <span class="lab" id="dzLbMod">Chuỗi xung</span>
        <div class="seg-btns" id="dzMods" role="group" aria-labelledby="dzLbMod"></div>
      </div>
      <div class="ctl">
        <span class="lab" id="dzLbOrient">Hướng cắt</span>
        <div class="seg-btns" role="group" aria-labelledby="dzLbOrient">
          ${['ax', 'cor', 'sag'].map(o => `<button class="btn" type="button" data-dz-orient="${o}" aria-pressed="false">${ORIENT_VI[o]}</button>`).join('')}
        </div>
      </div>
      <div class="ctl">
        <label class="lab" for="dzSlice">Lát cắt</label>
        <div class="inline">
          <input type="range" id="dzSlice" min="0" max="100" value="50"><output id="dzSliceOut" for="dzSlice"></output>
          <button class="btn dz-reg" type="button" id="dzReg" aria-pressed="true" title="Phím H">Khoanh vùng<span class="dz-long"> bệnh</span></button>
        </div>
      </div>
      <div class="ctl">
        <span class="lab" id="dzLbZoom">Phóng to</span>
        <div class="seg-btns" role="group" aria-labelledby="dzLbZoom">
          ${[1, 2, 4].map(z => `<button class="btn" type="button" data-dz-zoom="${z}" aria-pressed="false">${z}×</button>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="dz-info">
    <section aria-labelledby="dzTitle">
      <h2 id="dzTitle"></h2>
      <div id="dzSummary"></div>
      <h3>Dấu hiệu chính</h3>
      <ul class="dz-find" id="dzFind"></ul>
    </section>
    <section>
      <div id="dzTable"></div>
      <h3>Nguồn ảnh</h3>
      <ul class="dz-src" id="dzSrc"></ul>
      <p class="dz-lic" id="dzLic"></p>
      <p class="dz-ack" id="dzAck" hidden></p>
      <p class="dz-small">Tài liệu học tập, không dùng để chẩn đoán hay điều trị.</p>
    </section>
  </div>
</div>`;
}
function renderMods() {
  const order = Object.keys(MODNAME), rank = m => (order.indexOf(m) + 1) || 99, box = $('dzMods');
  box.innerHTML = Object.keys(S.C.meta.mods).sort((a, b) => rank(a) - rank(b))
    .map(m => `<button class="btn" type="button" data-dz-mod="${esc(m)}" aria-pressed="false">${esc(modName(m))}</button>`).join('');
  box.querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => { S.mod = b.dataset.dzMod; refresh(); }));
}
function setCtlMin(v) {
  $('dzCtl').classList.toggle('min', v);
  const b = $('dzCtlMin'); b.innerHTML = v ? MAX_SVG : MIN_SVG;
  b.setAttribute('aria-expanded', String(!v)); b.title = v ? 'Mở bảng điều khiển' : 'Thu gọn bảng điều khiển';
}
function wire() {
  ROLES.forEach(r => {
    const f = { cv: $('dz-cv-' + r), el: $('dz-film-' + r) }; f.ctx = f.cv.getContext('2d'); S.films[r] = f;
    new ResizeObserver(() => drawAll()).observe(f.cv); bindFilm(f);
  });
  root.querySelectorAll('[data-dz-orient]').forEach(b => b.addEventListener('click', () => {
    if (!S.C) return;
    S.orient = b.dataset.dzOrient; if (S.lock) setSlicesTo(S.lock); refresh();
  }));
  root.querySelectorAll('[data-dz-zoom]').forEach(b => b.addEventListener('click', () => { S.zoom = +b.dataset.dzZoom; refresh(); }));
  $('dzSlice').addEventListener('input', e => { if (S.C) { S.slice[S.orient] = +e.target.value; refresh(); } });
  $('dzReg').addEventListener('click', () => { S.showReg = !S.showReg; syncToggles(); refresh(); });
  $('dzCtlMin').addEventListener('click', () => setCtlMin(!$('dzCtl').classList.contains('min')));
  setCtlMin(false);
  if (S.cfg.onClose) $('dzClose').addEventListener('click', () => S.cfg.onClose());
  // phím tắt chỉ khi đang thao tác trong trình xem bệnh
  document.addEventListener('keydown', e => {
    if (!root.contains(e.target) || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key.toLowerCase() === 'h') { S.showReg = !S.showReg; syncToggles(); refresh(); }
    else if (e.key === 'Escape' && S.lock) { e.preventDefault(); setLock(null); }
  });
  // điện thoại: bảng điều khiển nổi ở đáy màn hình chỉ khi khung ảnh bệnh đang trên màn hình
  new IntersectionObserver(es => es.forEach(e => $('dzCtl').classList.toggle('away', !e.isIntersecting)), { threshold: 0.15 }).observe($('dzStage'));
}

async function start(cfg) {
  S.cfg = cfg;
  root = cfg.host;
  root.innerHTML = markup(cfg);
  wire();
  S.ready = (async () => {
    if (location.protocol === 'file:') throw new Error('file');
    const [L, idx] = await Promise.all([fetchJSON(cfg.labels), fetchJSON(cfg.data + 'cases.json')]);
    S.L = L; S.cases = idx.cases || []; S.ids = {}; S.colors = [];
    Object.entries(L.labels).forEach(([id, e]) => {
      (S.ids[e.s] = S.ids[e.s] || []).push(+id);
      const st = L.structures[e.s]; if (st && st.color) { const h = st.color.replace('#', ''); S.colors[+id] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
    });
    $('dzCases').innerHTML = S.cases.map(c => `<button class="btn" type="button" data-dz-case="${esc(c.id)}" aria-pressed="false">${esc(c.label || c.id)}</button>`).join('');
    $('dzCases').querySelectorAll('.btn').forEach(b => b.addEventListener('click', () => open(b.dataset.dzCase)));
  })();
  try { await S.ready; }
  catch (e) {
    S.ready = null;
    if (e.message === 'file') loaderMsg('Trang đang được mở trực tiếp từ ổ đĩa, nên trình duyệt chặn việc đọc dữ liệu ảnh. Hãy mở qua một server tĩnh, ví dụ <code>python -m http.server</code>.', true);
    else { console.error(e); loaderMsg('Không tải được danh sách ca: ' + esc(e.message), true); }
    return;
  }
  if (!S.cases.length) { loaderMsg('Chưa có ca nào trong cases.json.', true); return; }
  const want = cfg.caseId || new URLSearchParams(location.search).get('case');
  await open(S.cases.some(c => c.id === want) ? want : S.cases[0].id);
}
/* trang cha gọi khi hiện lại trình xem (kích thước khung có thể đã đổi) */
function redraw() { if (root) drawAll(); }

return { start, open, redraw };
})();
