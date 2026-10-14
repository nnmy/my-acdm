/* =====================================================================
   Atlas hình ảnh y khoa: trình xem khối ảnh 3D (dùng chung cho mọi trang của module).
   Không dùng thư viện hay dịch vụ ngoài. Dữ liệu đọc từ lib/data/<cơ quan>/:
     meta.json    kích thước, gốc tọa độ, mức tham chiếu, cửa sổ hiển thị, điểm đại diện mỗi nhãn
     labels.json  tên, đặc điểm, chức năng... của từng cấu trúc (SỬA NỘI DUNG Ở ĐÂY)
     *.u8.gz      khối voxel uint8 nén gzip (x nhanh nhất, RAS, 1 mm), do tools/prepare_*.py tạo
   Cách dùng trên trang:  ATLAS.start({ data: 'lib/data/brain-mri/', organ: 'brain-mri', title: 'MRI não',
                          printHeader, printTitle, printFile })   (ba mục cuối dùng cho file PDF)
   Trang phải có các phần tử với id như trong 1-brain-mri.html.

   Mục lục file:
     1. tiện ích (tải + giải nén, định dạng số)
     2. hình học lát cắt (ax / cor / sag, quy ước X-quang / thần kinh)
     3. dựng ảnh lát cắt và lớp phân vùng
     4. vẽ, con trỏ, khóa vị trí, bàn phím
     5. khung thông tin (thu gọn được)
     6. danh sách ghim (IndexedDB) và xuất PDF (in qua trình duyệt)
   Cấu trúc có "lateral": true trong labels.json được xem là hai vùng riêng (Left/Right);
   cấu trúc khác gộp hai bên thành một vùng: tên không kèm bên, tô sáng cả hai bên.
   ===================================================================== */
const ATLAS = (() => {
'use strict';

/* ---------------- 1. tiện ích ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sgn = v => (v < 0 ? '−' + Math.abs(v) : String(v));          // dấu trừ chuẩn
const SIDE = { R: 'bên phải', L: 'bên trái', '': '' };
const AXN = ['x', 'y', 'z'];

/* Tải một file nhị phân, báo tiến trình (byte đã nhận). */
async function fetchBytes(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không tải được ' + url + ' (HTTP ' + res.status + ')');
  if (!res.body || !res.body.getReader) { const b = new Uint8Array(await res.arrayBuffer()); onBytes(b.length); return b; }
  const rd = res.body.getReader(), parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; onBytes(value.length); }
  const out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; });
  return out;
}
/* Giải nén nếu còn ở dạng gzip (2 byte đầu 1F 8B); một số server đã tự giải nén trước. */
async function gunzipIfNeeded(b) {
  if (b[0] !== 0x1f || b[1] !== 0x8b) return b;
  if (!('DecompressionStream' in window)) throw new Error('Trình duyệt quá cũ: thiếu DecompressionStream để giải nén dữ liệu.');
  const st = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(st).arrayBuffer());
}

/* ---------------- trạng thái ---------------- */
const S = {
  cfg: null, meta: null, L: null, dims: null, X: 0, Y: 0, Z: 0, MAXD: 1,
  vol: {}, seg: null, lut: {},
  orient: 'ax', slice: { ax: 0, cor: 0, sag: 0 }, rad: false,   // mặc định quy ước thần kinh
  segMode: 'edge', opacity: 0.55,
  cur: null,          // voxel đang trỏ (chuột hoặc bàn phím)
  lock: null,         // voxel đã khóa
  lockHl: null,       // các nhãn được tô sáng khi khóa (một bên, hoặc cả hai bên)
  ids: {},            // khóa cấu trúc -> danh sách số nhãn (phải, trái)
  hoverLab: 0, sl: null, overlay: null, overlayKey: '',
  films: [],          // [{mod, cv, ctx, wrap}]
  colors: [],         // màu theo số nhãn: [r,g,b] hoặc null
  nofill: [],
};
const idx = (x, y, z) => x + S.X * (y + S.Y * z);
const mm = v => [0, 1, 2].map(a => Math.round(S.meta.origin_mm[a] + v[a]));

/* ---------------- 2. hình học lát cắt ----------------
   ax  (z cố định): cột u theo x, hàng v theo y (trước ở trên)
   cor (y cố định): cột u theo x, hàng v theo z (trên ở trên)
   sag (x cố định): cột u theo y (trước ở bên trái), hàng v theo z
   Quy ước X-quang (rad = true): bên PHẢI người bệnh nằm bên TRÁI màn hình (ax, cor). */
const OR = {
  ax: { axis: 2, name: 'Axial', W: () => S.X, H: () => S.Y,
        toV: (u, v, s) => [S.rad ? S.X - 1 - u : u, S.Y - 1 - v, s], toUV: p => [S.rad ? S.X - 1 - p[0] : p[0], S.Y - 1 - p[1]],
        edge: () => S.rad ? ['R', 'L', 'A', 'P'] : ['L', 'R', 'A', 'P'] },
  cor: { axis: 1, name: 'Coronal', W: () => S.X, H: () => S.Z,
        toV: (u, v, s) => [S.rad ? S.X - 1 - u : u, s, S.Z - 1 - v], toUV: p => [S.rad ? S.X - 1 - p[0] : p[0], S.Z - 1 - p[2]],
        edge: () => S.rad ? ['R', 'L', 'S', 'I'] : ['L', 'R', 'S', 'I'] },
  sag: { axis: 0, name: 'Sagittal', W: () => S.Y, H: () => S.Z,
        toV: (u, v, s) => [s, S.Y - 1 - u, S.Z - 1 - v], toUV: p => [S.Y - 1 - p[1], S.Z - 1 - p[2]],
        edge: () => ['A', 'P', 'S', 'I'] },
};
/* chữ ở mép ảnh: [trái, phải, trên, dưới] theo quy ước quốc tế: R/L phải/trái người bệnh, A/P trước/sau, S/I trên/dưới. */

/* ---------------- 3. dựng ảnh lát cắt ---------------- */
function buildSlice(o, s) {
  const D = OR[o], W = D.W(), H = D.H(), n = W * H;
  const lab = new Uint8Array(n), gray = {};
  const src = new Int32Array(n);
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { const p = D.toV(u, v, s); src[u + W * v] = idx(p[0], p[1], p[2]); }
  for (let i = 0; i < n; i++) lab[i] = S.seg[src[i]];
  for (const m of S.cfg.mods) {
    const im = new ImageData(W, H), d = im.data, vol = S.vol[m], lut = S.lut[m];
    for (let i = 0; i < n; i++) { const g = lut[vol[src[i]]]; d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = g; d[4 * i + 3] = 255; }
    gray[m] = im;
  }
  return { o, s, W, H, lab, gray };
}
const canvasOf = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function isEdge(lab, W, H, i, l) {
  const x = i % W, y = (i / W) | 0;
  return (x > 0 && lab[i - 1] !== l) || (x < W - 1 && lab[i + 1] !== l) || (y > 0 && lab[i - W] !== l) || (y < H - 1 && lab[i + W] !== l);
}
/* lớp phân vùng: mode = off | fill | edge; hl = mảng các nhãn được làm nổi bật (đang khóa hoặc đang trỏ) */
function buildOverlay(sl, mode, opacity, hlIds) {
  const hm = new Uint8Array(256); hlIds.forEach(i => { hm[i] = 1; });
  const { W, H, lab } = sl, im = new ImageData(W, H), d = im.data, a = Math.round(opacity * 255);
  for (let i = 0; i < W * H; i++) {
    const l = lab[i]; if (!l) continue;
    const c = S.colors[l]; if (!c) continue;
    const isHl = hm[l] === 1, nf = S.nofill[l];
    let r = c[0], g = c[1], b = c[2], al = 0;
    if (isHl && !nf && isEdge(lab, W, H, i, l)) { r = g = b = 255; al = 255; }
    else if (mode === 'fill') { if (!nf) al = isHl ? Math.min(255, a + 70) : a; }
    else if (mode === 'edge') { if (!nf && isEdge(lab, W, H, i, l)) al = Math.max(a, 70); if (isHl && !nf) al = Math.max(al, Math.round(a * 0.55)); }
    else if (mode === 'off') { if (isHl && !nf) al = 60; }
    if (al) { const k = 4 * i; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = al; }
  }
  const cv = canvasOf(W, H); cv.getContext('2d').putImageData(im, 0, 0); return cv;
}
function refresh(full) {
  const s = S.slice[S.orient];
  if (full || !S.sl || S.sl.o !== S.orient || S.sl.s !== s) {
    S.sl = buildSlice(S.orient, s);
    S.sl.cv = {};
    for (const m of S.cfg.mods) { const c = canvasOf(S.sl.W, S.sl.H); c.getContext('2d').putImageData(S.sl.gray[m], 0, 0); S.sl.cv[m] = c; }
    S.overlayKey = '';
  }
  const hl = S.lock ? S.lockHl : hlFor(S.hoverLab);
  const key = [S.segMode, S.opacity, hl.join(',')].join('|');
  if (key !== S.overlayKey) { S.overlay = buildOverlay(S.sl, S.segMode, S.opacity, hl); S.overlayKey = key; }
  drawAll(); readout();
}

/* ---------------- 4. vẽ, con trỏ, khóa ---------------- */
function geom(f) {
  const W = S.sl.W, H = S.sl.H, cw = f.cv.width, ch = f.cv.height;
  const sc = Math.min(cw, ch) / S.MAXD;                            // cùng tỉ lệ mm/pixel cho mọi hướng cắt
  return { sc, ox: (cw - W * sc) / 2, oy: (ch - H * sc) / 2, W, H };
}
function relPct(m, p) { const v = S.vol[m][idx(...p)]; return Math.round(v / S.meta.ref[m].wm * 100); }
function drawFilm(f) {
  const ctx = f.ctx, g = geom(f), dpr = window.devicePixelRatio || 1;
  f.lockRect = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, f.cv.width, f.cv.height);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.sl.cv[f.mod], g.ox, g.oy, g.W * g.sc, g.H * g.sc);
  if (S.overlay) { ctx.imageSmoothingEnabled = false; ctx.drawImage(S.overlay, g.ox, g.oy, g.W * g.sc, g.H * g.sc); }
  // chữ chỉ hướng ở mép ảnh
  const e = OR[S.orient].edge(), fs = Math.max(11, Math.round(13 * dpr));
  ctx.font = `600 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`; ctx.fillStyle = 'rgba(220,227,234,.85)'; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(e[0], 8 * dpr, f.cv.height / 2);
  ctx.textAlign = 'right'; ctx.fillText(e[1], f.cv.width - 8 * dpr, f.cv.height / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(e[2], f.cv.width / 2, 6 * dpr);
  ctx.textBaseline = 'bottom'; ctx.fillText(e[3], f.cv.width / 2, f.cv.height - 6 * dpr);
  // đường chữ thập
  const p = S.lock || S.cur; if (!p) return;
  const D = OR[S.orient], [u, v] = D.toUV(p), off = p[D.axis] !== S.slice[S.orient];
  const X = g.ox + (u + 0.5) * g.sc, Y = g.oy + (v + 0.5) * g.sc, gap = 7 * dpr;
  ctx.save();
  ctx.strokeStyle = S.lock ? '#f2c230' : 'rgba(123,205,232,.95)'; ctx.lineWidth = Math.max(1, dpr);
  if (off) ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.beginPath();
  ctx.moveTo(g.ox, Y); ctx.lineTo(X - gap, Y); ctx.moveTo(X + gap, Y); ctx.lineTo(g.ox + g.W * g.sc, Y);
  ctx.moveTo(X, g.oy); ctx.lineTo(X, Y - gap); ctx.moveTo(X, Y + gap); ctx.lineTo(X, g.oy + g.H * g.sc);
  ctx.stroke(); ctx.restore();
  if (off) return;
  // cường độ tương đối tại điểm: nhãn nhỏ cạnh giao điểm; khi đang khóa, nhãn có icon ổ khóa và bấm vào để mở khóa
  const txt = f.mod.toUpperCase() + ' ' + relPct(f.mod, p);
  ctx.font = `600 ${Math.round(12.5 * dpr)}px ui-monospace, Menlo, Consolas, monospace`;
  const ic = S.lock ? 13 * dpr : 0, th = 20 * dpr, tw = ctx.measureText(txt).width + 10 * dpr + ic;
  let tx = X + 10 * dpr, ty = Y - 10 * dpr - th;                  // phía trên-phải giao điểm (tooltip nằm dưới-phải)
  if (tx + tw > f.cv.width - 4) tx = X - 10 * dpr - tw;
  if (ty < 4) ty = Y + 10 * dpr;
  ctx.fillStyle = 'rgba(27,25,32,.85)'; ctx.fillRect(tx, ty, tw, th);
  const fg = S.lock ? '#f2c230' : '#fff';
  if (S.lock) {
    ctx.strokeStyle = S.lockHover === f ? '#fff' : fg; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    const lx = tx + 5 * dpr, ly = ty + th / 2;                    // ổ khóa: thân + quai
    ctx.fillStyle = fg; ctx.fillRect(lx, ly - 1 * dpr, 9 * dpr, 6.5 * dpr);
    ctx.strokeStyle = fg; ctx.lineWidth = 1.6 * dpr; ctx.beginPath();
    ctx.moveTo(lx + 2 * dpr, ly - 1 * dpr); ctx.lineTo(lx + 2 * dpr, ly - 3.2 * dpr); ctx.arc(lx + 4.5 * dpr, ly - 3.2 * dpr, 2.5 * dpr, Math.PI, 0); ctx.lineTo(lx + 7 * dpr, ly - 1 * dpr); ctx.stroke();
    f.lockRect = [tx, ty, tw, th];
  }
  ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, tx + 5 * dpr + ic, ty + th / 2 + 0.5);
}
function drawAll() { S.films.forEach(drawFilm); }

function voxelAt(f, clientX, clientY) {
  const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, g = geom(f);
  const u = Math.floor(((clientX - r.left) * dpr - g.ox) / g.sc), v = Math.floor(((clientY - r.top) * dpr - g.oy) / g.sc);
  if (u < 0 || v < 0 || u >= g.W || v >= g.H) return null;
  return OR[S.orient].toV(u, v, S.slice[S.orient]);
}
function onLockTag(f, cx, cy) {
  if (!f.lockRect) return false;
  const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, x = (cx - r.left) * dpr, y = (cy - r.top) * dpr, [tx, ty, tw, th] = f.lockRect;
  return x >= tx - 3 && x <= tx + tw + 3 && y >= ty - 3 && y <= ty + th + 3;
}
function screenOf(f, p) {
  const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, g = geom(f), [u, v] = OR[S.orient].toUV(p);
  return [r.left + (g.ox + (u + 0.5) * g.sc) / dpr, r.top + (g.oy + (v + 0.5) * g.sc) / dpr];
}
function labelInfo(l) {
  const e = S.L.labels[l]; if (!e) return null;
  const st = S.L.structures[e.s]; if (!st) return null;
  return { id: l, key: e.s, side: st.lateral ? e.side : '', st, g: S.L.groups[st.group] };   // side rỗng nếu gộp hai bên
}
/* tên tiếng Anh (chính) và tiếng Việt (phụ); chỉ ghi bên khi chức năng hai bên khác nhau */
const SIDE_EN = { R: 'Right', L: 'Left' };
const nameEn = (en, side) => side ? SIDE_EN[side] + ' ' + en.charAt(0).toLowerCase() + en.slice(1) : en;
const nameVi = (vi, side) => vi + (side ? ' ' + SIDE[side] : '');
const ipaOf = (st, side) => st.ipa ? '/' + (side && S.L.side_ipa ? S.L.side_ipa[side] + ' ' : '') + st.ipa + '/' : '';
/* các nhãn được tô sáng cùng nhãn l: chính nó nếu là vùng lệch bên, cả hai bên nếu là vùng gộp */
function hlFor(l, both) {
  const e = S.L.labels[l]; if (!e || !l) return [];
  const st = S.L.structures[e.s];
  return (both || !st.lateral) ? (S.ids[e.s] || [l]) : [l];
}

const tip = () => $('atlasTip');
function showTip(l, x, y) {
  const li = labelInfo(l);
  if (!li) { tip().hidden = true; return; }
  showTipHtml(`<b><i style="background:${li.st.color}"></i>${esc(nameEn(li.st.en, li.side))}</b><small>${esc(nameVi(li.st.vi, li.side))}</small>`, x, y);
}
function showTipHtml(html, x, y) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const w = t.offsetWidth, h = t.offsetHeight;
  let tx = x + 16, ty = y + 18;
  if (tx + w > window.innerWidth - 8) tx = x - 16 - w;
  if (ty + h > window.innerHeight - 8) ty = y - 18 - h;
  t.style.left = tx + 'px'; t.style.top = ty + 'px';
}
function setCur(p) {
  S.cur = p;
  const l = p ? S.seg[idx(...p)] : 0;
  if (l !== S.hoverLab) S.hoverLab = l;
  refresh();
}
function setLock(p, hl) {
  S.lock = p ? p.slice() : null;
  S.lockHl = p ? (hl || hlFor(S.seg[idx(...p)])) : null;
  if (!hl) { const f = $('find'); if (f) { f.value = ''; f.dataset.picked = ''; } }   // khóa bằng nhấp chuột: bỏ chọn ở ô tìm
  refresh(); renderInfo();
}
function setSlice(v) {
  const D = OR[S.orient], max = S.dims[D.axis] - 1;
  S.slice[S.orient] = Math.max(0, Math.min(max, v));
  const sl = $('slice'); sl.value = S.slice[S.orient]; sliceLabel();
  if (S.cur) S.cur[D.axis] = S.slice[S.orient];
  refresh();
}
function sliceLabel() {
  const a = OR[S.orient].axis, v = Math.round(S.meta.origin_mm[a] + S.slice[S.orient]);
  $('sliceOut').textContent = AXN[a] + ' = ' + sgn(v) + ' mm';
}
function setOrient(o) {
  S.orient = o;
  const D = OR[o], p = S.lock || S.cur;
  if (p) S.slice[o] = p[D.axis];
  const sl = $('slice'); sl.max = S.dims[D.axis] - 1; sl.value = S.slice[o];
  document.querySelectorAll('[data-orient]').forEach(b => b.setAttribute('aria-pressed', b.dataset.orient === o));
  sliceLabel(); refresh(true);
}
function readout() {
  const el = $('readout'), p = S.lock || S.cur;
  if (!p) { el.innerHTML = ''; return; }
  const c = mm(p);
  const parts = [`<span>MNI <b>${c.map(sgn).join(', ')}</b> mm</span>`];
  for (const m of S.cfg.mods) parts.push(`<span>${m.toUpperCase()} <b>${relPct(m, p)}</b></span>`);
  el.innerHTML = parts.join('');
}

function bindFilm(f) {
  const cv = f.cv;
  cv.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const onTag = onLockTag(f, e.clientX, e.clientY);
    if (onTag !== (S.lockHover === f)) { S.lockHover = onTag ? f : null; cv.style.cursor = onTag ? 'pointer' : ''; drawFilm(f); }
    if (onTag) { showTipHtml('<b>Bấm để mở khóa</b>', e.clientX, e.clientY); return; }
    const p = voxelAt(f, e.clientX, e.clientY);
    if (!p) { tip().hidden = true; if (S.cur) setCur(null); return; }
    setCur(p); showTip(S.seg[idx(...p)], e.clientX, e.clientY);
  });
  cv.addEventListener('pointerleave', () => { tip().hidden = true; S.lockHover = null; cv.style.cursor = ''; setCur(null); });
  cv.addEventListener('click', e => {
    if (onLockTag(f, e.clientX, e.clientY)) { S.lockHover = null; cv.style.cursor = ''; setLock(null); tip().hidden = true; return; }
    const p = voxelAt(f, e.clientX, e.clientY); if (!p) return;
    S.cur = p.slice(); setLock(p);
    showTip(S.seg[idx(...p)], e.clientX, e.clientY);
    if (e.pointerType === 'touch' || e.detail === 0) { clearTimeout(f.tt); f.tt = setTimeout(() => { tip().hidden = true; }, 1800); }
  });
  let acc = 0;
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    acc += e.deltaY; const step = Math.trunc(acc / 40);
    if (step) { acc -= step * 40; setSlice(S.slice[S.orient] - step); }
    if (S.cur) showTip(S.seg[idx(...S.cur)], e.clientX, e.clientY);
  }, { passive: false });
  cv.addEventListener('keydown', e => {
    const D = OR[S.orient], k = e.key, n = e.shiftKey ? 5 : 1;
    let p = (S.cur || S.lock || null);
    if (k === 'Escape') { setLock(null); tip().hidden = true; e.preventDefault(); return; }
    if (k === 'PageUp' || k === '+' || k === '=') { setSlice(S.slice[S.orient] + n); e.preventDefault(); return; }
    if (k === 'PageDown' || k === '-') { setSlice(S.slice[S.orient] - n); e.preventDefault(); return; }
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (mv) {
      if (!p || p[D.axis] !== S.slice[S.orient]) p = D.toV(Math.floor(D.W() / 2), Math.floor(D.H() / 2), S.slice[S.orient]);
      let [u, v] = D.toUV(p); u = Math.max(0, Math.min(D.W() - 1, u + mv[0] * n)); v = Math.max(0, Math.min(D.H() - 1, v + mv[1] * n));
      const q = D.toV(u, v, S.slice[S.orient]); setCur(q);
      const [sx, sy] = screenOf(f, q); showTip(S.seg[idx(...q)], sx, sy);
      e.preventDefault(); return;
    }
    if ((k === 'Enter' || k === ' ') && S.cur) { setLock(S.cur); e.preventDefault(); }
  });
  cv.addEventListener('blur', () => { tip().hidden = true; });
}
function fitFilm(f) {
  const r = f.cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  f.cv.width = Math.max(1, Math.round(r.width * dpr)); f.cv.height = Math.max(1, Math.round(r.height * dpr));
  f.ctx = f.cv.getContext('2d');
  if (S.sl) drawFilm(f);
}

/* ---------------- 5. khung thông tin ---------------- */
function renderInfo() {
  const box = $('info');
  if (!S.lock) {
    box.innerHTML = '<p class="info-empty">Nhấp vào một điểm trên ảnh, hoặc chọn ở ô <b>Tìm cấu trúc</b>, để khóa vị trí và xem thông tin của cấu trúc tại đó.</p>';
    $('infoName').textContent = '';
    return;
  }
  const p = S.lock, l = S.seg[idx(...p)], li = labelInfo(l), c = mm(p);
  const where = `MNI ${c.map(sgn).join(', ')} mm; ` + S.cfg.mods.map(m => m.toUpperCase() + ' ' + relPct(m, p)).join(', ');
  if (!li) {
    $('infoName').textContent = 'Outside the head';
    box.innerHTML = `<h3>Outside the head</h3><p class="sub-vi">Ngoài đầu: nền không khí, không có mô.</p><p class="where">${esc(where)}</p>
      <div class="btnrow"><button class="btn" type="button" id="btnUnlock">Bỏ khóa</button></div>`;
  } else {
    const st = li.st, row = (t, v) => v ? `<dt>${t}</dt><dd>${esc(v)}</dd>` : '';
    const en = nameEn(st.en, li.side);
    $('infoName').textContent = en;
    const ipa = ipaOf(st, li.side);
    box.innerHTML = `<h3>${esc(en)}${ipa ? ` <span class="ipa" lang="en-fonipa">${esc(ipa)}</span>` : ''}</h3>
      <p class="sub-vi">${esc(nameVi(st.vi, li.side))}</p>
      <div class="chips"><span class="chip"><i style="background:${st.color}"></i>${esc(li.g ? li.g.en : '')}</span>${li.side ? `<span class="chip">${SIDE_EN[li.side]} hemisphere</span>` : ''}</div>
      <dl>${row('Chức năng', st.func)}${row('Lâm sàng', st.clin)}${row('Đặc điểm', st.desc)}</dl>
      <p class="where">${esc(where)}</p>
      <div class="btnrow"><button class="btn primary" type="button" id="btnSave">Ghim</button><button class="btn" type="button" id="btnUnlock">Bỏ khóa</button></div>`;
    $('btnSave').addEventListener('click', saveNote);
  }
  $('btnUnlock').addEventListener('click', () => setLock(null));
  if (S.infoMin && window.matchMedia('(max-width: 979px)').matches) setInfoMin(false);   // trên điện thoại: tự mở lại khi khóa điểm mới
}
const MIN_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2"/></svg>';
const MAX_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
function setInfoMin(v) {
  S.infoMin = v;
  $('viewer').classList.toggle('info-min', v);
  const b = $('infoMin'); b.setAttribute('aria-expanded', !v);
  b.innerHTML = v ? MAX_SVG : MIN_SVG; b.title = v ? 'Mở khung thông tin' : 'Thu gọn khung thông tin';
  S.films.forEach(fitFilm);
}
function setCtlMin(v) {
  const c = $('controls'), b = $('ctlMin');
  c.classList.toggle('min', v); b.setAttribute('aria-expanded', !v);
  b.innerHTML = v ? MAX_SVG : MIN_SVG; b.title = v ? 'Mở bảng điều khiển' : 'Thu gọn bảng điều khiển';
}

/* ---------------- 6. danh sách ghim + PDF ---------------- */
const DB = (() => {
  let dbp = null, mem = [], memId = 1, useMem = false;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) { rej(new Error('no idb')); return; }
      const r = indexedDB.open('med-atlas', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }).catch(err => { useMem = true; console.warn('IndexedDB không dùng được, danh sách ghim chỉ giữ trong phiên này.', err); return null; });
    return dbp;
  }
  function run(mode, fn) {
    return open().then(db => db ? new Promise((res, rej) => {
      const t = db.transaction('notes', mode), st = t.objectStore('notes'); let out;
      const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    }) : null);
  }
  return {
    get volatile() { return useMem; },
    async all(organ) { const r = await run('readonly', st => st.getAll()); return (useMem ? mem : r || []).filter(n => n.organ === organ).sort((a, b) => a.time - b.time); },
    async add(n) { const r = await run('readwrite', st => st.add(n)); if (useMem) { n.id = memId++; mem.push(n); } return r; },
    async del(id) { await run('readwrite', st => st.delete(id)); if (useMem) mem = mem.filter(n => n.id !== id); },
    async put(n) { await run('readwrite', st => st.put(n)); if (useMem) mem = mem.map(m => m.id === n.id ? n : m); },
  };
})();

/* Ảnh thu nhỏ: T1 | T2 quanh vùng tại điểm khóa (nhãn l), viền vùng đậm 3 px.
   tight = false: khung rộng (~2,2 lần vùng, >= 100 mm) cho thẻ ghim, để thấy vùng nằm ở đâu.
   tight = true : khung sát vùng (~1,3 lần, >= 28 mm) cho file PDF. */
function thumbnail(p, l, hlIds, orient = S.orient, tight = false) {
  const D = OR[orient], sl = buildSlice(orient, p[D.axis]), W = sl.W, H = sl.H, P = 240, GAP = 4;
  // khung bao của vùng tại điểm khóa trong lát này
  let u0 = W, u1 = -1, v0 = H, v1 = -1;
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) if (sl.lab[u + W * v] === l) { if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
  const [pu, pv] = D.toUV(p);
  if (u1 < 0) { u0 = u1 = pu; v0 = v1 = pv; }
  u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv);
  const ext = Math.max(u1 - u0 + 1, v1 - v0 + 1);
  const C = Math.min(S.MAXD, tight ? Math.max(28, ext * 1.3 + 6) : Math.max(100, ext * 2.2));
  const cu = (u0 + u1 + 1) / 2 - C / 2, cv = (v0 + v1 + 1) / 2 - C / 2, k = P / C;
  // nhãn ở độ phân giải ảnh thu nhỏ, để viền có độ dày tính bằng pixel
  const hm = new Uint8Array(256); hlIds.forEach(i => { hm[i] = 1; });
  const lo = new Uint8Array(P * P);
  for (let y = 0; y < P; y++) { const v = Math.floor(cv + (y + 0.5) / k); for (let x = 0; x < P; x++) { const u = Math.floor(cu + (x + 0.5) / k); lo[x + P * y] = (u >= 0 && v >= 0 && u < W && v < H) ? sl.lab[u + W * v] : 0; } }
  const ov = new ImageData(P, P), d = ov.data, col = S.colors[l] || [255, 255, 255], R = 3;
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const i = x + P * y, q = lo[i]; if (!q) continue;
    const k4 = 4 * i;
    if (hm[q]) {                                   // viền dày R px phía trong vùng được ghim
      let edge = false;
      for (let dy = -R; dy <= R && !edge; dy++) for (let dx = -R; dx <= R; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= P || yy >= P || !hm[lo[xx + P * yy]]) { edge = true; break; }
      }
      if (edge) { d[k4] = col[0]; d[k4 + 1] = col[1]; d[k4 + 2] = col[2]; d[k4 + 3] = 255; }
    } else if (!S.nofill[q]) {                     // viền mảnh, mờ cho các vùng khác
      if ((x < P - 1 && lo[i + 1] !== q) || (y < P - 1 && lo[i + P] !== q)) { d[k4] = d[k4 + 1] = d[k4 + 2] = 255; d[k4 + 3] = 80; }
    }
  }
  const ovc = canvasOf(P, P); ovc.getContext('2d').putImageData(ov, 0, 0);
  const cvs = canvasOf(P * 2 + GAP, P), ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  S.cfg.mods.slice(0, 2).forEach((m, j) => {
    const src = canvasOf(W, H); src.getContext('2d').putImageData(sl.gray[m], 0, 0);
    const ox = j * (P + GAP);
    const sx = Math.max(0, cu), sy = Math.max(0, cv), ex = Math.min(W, cu + C), ey = Math.min(H, cv + C);
    ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, P, P); ctx.clip();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (ex > sx && ey > sy) ctx.drawImage(src, sx, sy, ex - sx, ey - sy, ox + (sx - cu) * k, (sy - cv) * k, (ex - sx) * k, (ey - sy) * k);
    ctx.drawImage(ovc, ox, 0);
    const X = ox + (pu - cu + 0.5) * k, Y = (pv - cv + 0.5) * k;
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X - 10, Y); ctx.lineTo(X - 4, Y); ctx.moveTo(X + 4, Y); ctx.lineTo(X + 10, Y);
    ctx.moveTo(X, Y - 10); ctx.lineTo(X, Y - 4); ctx.moveTo(X, Y + 4); ctx.lineTo(X, Y + 10); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '22px VT323, monospace'; ctx.textBaseline = 'top'; ctx.fillText(m.toUpperCase(), ox + 7, 5);
    ctx.restore();
  });
  return cvs.toDataURL('image/jpeg', 0.88);
}
async function saveNote() {
  const p = S.lock; if (!p) return;
  const l = S.seg[idx(...p)], li = labelInfo(l); if (!li) return;
  const note = {
    organ: S.cfg.organ, time: Date.now(), label: l, key: li.key, side: li.side, vox: p.slice(), mni: mm(p), orient: S.orient,
    rel: Object.fromEntries(S.cfg.mods.map(m => [m, relPct(m, p)])),
    vi: li.st.vi, en: li.st.en, group: li.g ? li.g.en : '', desc: li.st.desc, func: li.st.func, clin: li.st.clin,
    thumb: thumbnail(p, l, S.lockHl || [l]), min: true,          // mặc định hiện ở dạng thu gọn
  };
  await DB.add(note);
  const b = $('btnSave'); if (b) { b.textContent = 'Đã ghim'; b.disabled = true; }
  renderNotebook();
}
async function renderNotebook() {
  const notes = await DB.all(S.cfg.organ), list = $('nbList');
  $('nbCount').textContent = notes.length;
  $('btnPdf').disabled = !notes.length;
  $('nbEmpty').hidden = !!notes.length;
  $('nbWarn').hidden = !DB.volatile;
  list.innerHTML = notes.map(n => {
    const dz = n.kind === 'disease';
    // ghim từ trình xem bệnh (lib/compare.js): tên bệnh + cấu trúc tại điểm; ảnh khoẻ | bệnh
    const title = dz ? n.caseLabel : nameEn(n.en, n.side), sub = dz ? `${nameVi(n.vi, n.side)}${n.lesion ? ', trong vùng tổn thương' : ''}` : nameVi(n.vi, n.side);
    const alt = dz ? `${n.caseLabel}, ${nameVi(n.vi, n.side)}, ảnh khoẻ và bệnh ${n.mod.toUpperCase()}` : `${nameEn(n.en, n.side)}, lát ${OR[n.orient].name}, T1 và T2`;
    const pos = `MNI ${n.mni.map(sgn).join(', ')} mm, ${dz ? n.mod.toUpperCase() + ' ' : ''}${OR[n.orient].name.toLowerCase()}`;
    return `<li class="nb-item${n.min ? ' min' : ''}${dz ? ' nb-dz' : ''}" data-id="${n.id}">
      <div class="nb-top"><div class="nm"><b>${esc(title)}</b><span class="vi">${esc(sub)}</span></div>
        <button class="iconbtn" type="button" data-min="${n.id}" aria-expanded="${!n.min}" title="${n.min ? 'Mở rộng' : 'Thu gọn'}">${n.min ? MAX_SVG : MIN_SVG}</button>
         <button class="iconbtn del" type="button" data-del="${n.id}" title="Bỏ ghim" aria-label="Bỏ ghim ${esc(title)}">${DEL_SVG}</button></div>
      <img src="${n.thumb}" alt="${esc(alt)}" loading="lazy">
      <small>${esc(pos)}; ${new Date(n.time).toLocaleString('vi-VN')}</small></li>`;
  }).join('');
  list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { await DB.del(+b.dataset.del); renderNotebook(); }));
  list.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', async () => {
    const n = notes.find(x => x.id === +b.dataset.min); n.min = !n.min; await DB.put(n); renderNotebook();
  }));
}
/* trình xem bệnh gửi bản ghi ghim vào đây, để chung một danh sách với ghim cấu trúc */
async function addNote(n) {
  n.organ = S.cfg.organ; n.time = n.time || Date.now();
  await DB.add(n);
  await renderNotebook();
}
const DEL_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const pad2 = v => String(v).padStart(2, '0');
function noteHtml(n) {
  const p = (t, v) => v ? `<p><b>${t}.</b> ${esc(v)}</p>` : '';
  if (n.kind === 'disease') {
    const st = S.L.structures[n.key] || {};
    return `<article><img src="${n.thumbPdf || n.thumb}" alt="">
      <div><h2>${esc(n.caseLabel)}: ${esc(nameEn(st.en || n.en, n.side))}</h2>
      <p class="en">${esc(nameVi(st.vi || n.vi, n.side))}${n.lesion ? ', trong vùng tổn thương' : ''}</p>
      <p class="pos">MNI ${n.mni.map(sgn).join(', ')} mm; ${n.mod.toUpperCase()}${n.rel != null ? ' ' + n.rel : ''}; ${esc(OR[n.orient].name.toLowerCase())}</p>
      ${p('Ca bệnh', n.caseTitle)}<p>Ảnh trái: người khoẻ; ảnh phải: bệnh nhân.</p>${p('Lâm sàng', st.clin)}</div></article>`;
  }
  const st = S.L.structures[n.key] || n;                       // nội dung hiện hành trong labels.json (ghim cũ cũng được cập nhật)
  const side = n.side, ipa = S.L.structures[n.key] ? ipaOf(st, side) : '';
  const img = thumbnail(n.vox, n.label, hlFor(n.label), n.orient, true);
  return `<article><img src="${img}" alt="">
    <div><h2>${esc(nameEn(st.en, side))}${ipa ? ` <span class="ipa">${esc(ipa)}</span>` : ''}</h2>
    <p class="en">${esc(nameVi(st.vi, side))}</p>
    <p class="pos">MNI ${n.mni.map(sgn).join(', ')} mm; ${Object.entries(n.rel).map(([m, v]) => m.toUpperCase() + ' ' + v).join(', ')}; ${esc(OR[n.orient].name.toLowerCase())}</p>
    ${p('Chức năng', st.func)}${p('Lâm sàng', st.clin)}${p('Đặc điểm', st.desc)}</div></article>`;
}
/* Bản in: tự chia trang để ghi được "Trang i/N" ở chân mỗi trang (trình duyệt không cho biết tổng số trang).
   Đo chiều cao từng mục ở đúng bề rộng in (180 mm), rồi xếp vào các trang A4 có kích thước cố định. */
const PAGE_H = 296, BODY_TOP = 20, BODY_BOTTOM = 16;          // mm; 296 thay vì 297 để tránh tràn sang trang trắng
async function exportPdf() {
  const notes = await DB.all(S.cfg.organ); if (!notes.length) return;
  const sh = $('printSheet'), pxmm = 96 / 25.4, avail = (PAGE_H - BODY_TOP - BODY_BOTTOM) * pxmm;
  const blocks = [`<h1>${esc(S.cfg.printTitle || S.cfg.title)}</h1>`, ...notes.map(noteHtml)];
  sh.className = 'measure';
  sh.innerHTML = `<div class="pb">${blocks.join('')}</div>`;
  await Promise.all([...sh.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : null));
  const els = [...sh.querySelector('.pb').children], pages = [];
  let cur = [], top = 0;
  els.forEach((el, i) => {
    const r0 = el.offsetTop, r1 = el.offsetTop + el.offsetHeight;
    if (cur.length && r1 - top > avail) { pages.push(cur); cur = []; }
    if (!cur.length) top = r0;
    cur.push(blocks[i]);
  });
  if (cur.length) pages.push(cur);
  const head = esc(S.cfg.printHeader || ''), N = pages.length;
  sh.className = '';
  sh.innerHTML = pages.map((pg, i) => `<section class="pg"><div class="ph">${head}</div><div class="pb">${pg.join('')}</div><div class="pf">Trang ${i + 1}/${N}</div></section>`).join('');
  await Promise.all([...sh.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : null));
  // tên file mặc định khi "Lưu thành PDF" lấy theo tiêu đề trang
  const d = new Date(), old = document.title;
  document.title = `${S.cfg.printFile || 'ghichu'} ${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}

/* ---------------- khởi động ---------------- */
function loaderMsg(html, err) {
  const ld = $('loader'); ld.hidden = false; ld.classList.toggle('err', !!err); ld.innerHTML = `<div>${html}</div>`;
}
async function start(cfg) {
  S.cfg = Object.assign({ mods: ['t1', 't2'] }, cfg);
  S.films = S.cfg.mods.map(m => ({ mod: m, cv: $('cv-' + m) }));
  S.films.forEach(f => { f.ctx = f.cv.getContext('2d'); new ResizeObserver(() => fitFilm(f)).observe(f.cv); });
  if (location.protocol === 'file:') {
    loaderMsg('Trang đang được mở trực tiếp từ ổ đĩa, nên trình duyệt chặn việc đọc dữ liệu ảnh.<br><br>Hãy mở qua một server tĩnh, ví dụ chạy <code>python -m http.server</code> trong thư mục <code>my-acdm</code> rồi vào <code>http://localhost:8000</code>, hoặc dùng Live Server của VS Code. Trên GitHub Pages trang chạy bình thường.', true);
    return;
  }
  try {
    const base = S.cfg.data;
    const [meta, L] = await Promise.all([fetch(base + 'meta.json').then(r => r.json()), fetch(base + 'labels.json').then(r => r.json())]);
    S.meta = meta; S.L = L; S.dims = meta.dims; [S.X, S.Y, S.Z] = meta.dims; S.MAXD = Math.max(...meta.dims);
    const names = [...S.cfg.mods, 'seg'], total = names.reduce((a, n) => a + (meta.bytes ? meta.bytes[n] : 0), 0);
    let got = 0;
    $('loader').innerHTML = `<div>Đang tải ảnh ${esc(S.cfg.title)} (khoảng ${Math.round(total / 1e6)} MB, chỉ tải một lần)<div class="bar"><i id="ldBar"></i></div></div>`;
    const bufs = await Promise.all(names.map(n => fetchBytes(base + meta.files[n], k => { got += k; if (total) $('ldBar').style.width = Math.min(100, got / total * 100) + '%'; }).then(gunzipIfNeeded)));
    const N = S.X * S.Y * S.Z;
    bufs.forEach((b, i) => { if (b.length !== N) throw new Error(`File ${meta.files[names[i]]} có ${b.length} byte, cần ${N}.`); });
    S.cfg.mods.forEach((m, i) => { S.vol[m] = bufs[i]; });
    S.seg = bufs[names.length - 1];
  } catch (err) {
    console.error(err);
    loaderMsg('Không tải được dữ liệu ảnh: ' + esc(err.message), true);
    return;
  }
  // bảng tra cứu: cửa sổ hiển thị, màu nhãn
  for (const m of S.cfg.mods) {
    const [lo, hi] = S.meta.window[m], t = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) t[v] = v === 0 ? 0 : (v - lo) / (hi - lo) * 255;
    S.lut[m] = t;
  }
  Object.entries(S.L.labels).forEach(([id, e]) => {
    const st = S.L.structures[e.s]; if (!st) return;
    const h = st.color.replace('#', '');
    S.colors[+id] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    S.nofill[+id] = !!st.nofill;
    (S.ids[e.s] = S.ids[e.s] || []).push(+id);
  });
  // vị trí ban đầu: giữa khối, lát ngang qua đồi thị
  const mid = [Math.floor(S.X / 2), Math.floor(S.Y / 2), Math.floor(S.Z / 2)];
  const th = S.meta.seeds && (S.meta.seeds['40'] || S.meta.seeds[40]);
  S.slice = { ax: th ? th[2] : mid[2], cor: th ? th[1] : mid[1], sag: th ? th[0] : mid[0] };
  $('loader').hidden = true;
  wireControls();
  S.films.forEach(f => { bindFilm(f); fitFilm(f); });
  setOrient('ax'); renderInfo(); renderNotebook();
}
/* bỏ dấu tiếng Việt để lọc: "hai ma" khớp "Hải mã" */
const fold = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
/* combobox gọn: ô nhập + danh sách (role listbox); mỗi mục: tên tiếng Anh, sau đó nghĩa tiếng Việt (tự xuống dòng nếu dài) */
function combo(input, list, items, onPick) {
  let shown = [], act = -1;
  const box = input.closest('.combo');
  const render = () => {
    const q = fold(input.value.trim());
    shown = q && input.dataset.picked !== input.value ? items.filter(it => it.q.includes(q)) : items;
    list.innerHTML = shown.length ? shown.map((it, i) => `<li role="option" id="opt-${it.k}" data-i="${i}" aria-selected="${i === act}"${i === act ? ' class="act"' : ''}><span class="o-en">${esc(it.en)}</span><span class="o-vi">${esc(it.vi)}</span></li>`).join('')
      : '<li class="none" aria-disabled="true">Không có cấu trúc nào khớp</li>';
    input.setAttribute('aria-activedescendant', act >= 0 && shown[act] ? 'opt-' + shown[act].k : '');
  };
  const open = () => {
    if (!list.hidden) return;
    const r = input.getBoundingClientRect();
    box.classList.toggle('up', window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom);
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); render();
  };
  const close = () => { list.hidden = true; act = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
  const pick = it => { input.value = it.en; input.dataset.picked = it.en; close(); onPick(it); };
  const move = d => {
    open(); if (!shown.length) return;
    act = (act + d + shown.length) % shown.length; render();
    const el = list.querySelector('.act'); if (el) el.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('focus', () => { input.select(); open(); });
  input.addEventListener('click', open);
  input.addEventListener('input', () => { act = 0; if (list.hidden) open(); else render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { move(1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { move(-1); e.preventDefault(); }
    else if (e.key === 'Enter') { if (!list.hidden && shown[act]) { pick(shown[act]); e.preventDefault(); } }
    else if (e.key === 'Escape') { if (!list.hidden) { close(); e.preventDefault(); e.stopPropagation(); } }
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
  list.addEventListener('mousedown', e => e.preventDefault());       // giữ focus ở ô nhập
  list.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) pick(shown[+li.dataset.i]); });
  box.querySelector('.combo-arrow').addEventListener('click', () => { if (list.hidden) { input.focus(); } else close(); });
}
function wireControls() {
  document.querySelectorAll('[data-orient]').forEach(b => b.addEventListener('click', () => setOrient(b.dataset.orient)));
  $('slice').addEventListener('input', e => setSlice(+e.target.value));
  const sm = $('segMode');
  sm.value = S.segMode;
  sm.addEventListener('change', () => { S.segMode = sm.value; $('opacityRow').hidden = S.segMode === 'off'; refresh(); });
  const op = $('opacity');
  op.value = Math.round(S.opacity * 100); $('opacityOut').textContent = op.value;
  op.addEventListener('input', () => { S.opacity = op.value / 100; $('opacityOut').textContent = op.value; refresh(); });
  // ô tìm cấu trúc: tên tiếng Anh theo ABC kèm nghĩa tiếng Việt, gõ để lọc; không phân bên (tô sáng cả hai bên)
  const items = Object.entries(S.L.structures)
    .filter(([k]) => (S.ids[k] || []).some(id => S.meta.seeds[id]) && k !== 'unk' && k !== 'extra')
    .map(([k, st]) => ({ k, en: st.en, vi: st.vi, q: fold(st.en + ' ' + st.vi) }))
    .sort((a, b) => a.en.localeCompare(b.en, 'en'));
  combo($('find'), $('findList'), items, it => {
    const ids = S.ids[it.k], id = ids.find(i => S.meta.seeds[i]), s = S.meta.seeds[id];
    S.slice[S.orient] = s[OR[S.orient].axis]; $('slice').value = S.slice[S.orient]; sliceLabel();
    S.cur = s.slice(); setLock(s, ids);
  });
  $('btnPdf').addEventListener('click', exportPdf);
  $('infoMin').addEventListener('click', () => setInfoMin(!S.infoMin));
  $('ctlMin').addEventListener('click', () => setCtlMin(!$('controls').classList.contains('min')));
  setInfoMin(false); setCtlMin(false);
  // trên điện thoại, bảng điều khiển nổi chỉ hiện khi khung ảnh còn trên màn hình
  new IntersectionObserver(es => es.forEach(e => $('controls').classList.toggle('away', !e.isIntersecting)), { threshold: 0.15 }).observe($('stage'));
  window.addEventListener('scroll', () => { tip().hidden = true; }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.lock && !e.defaultPrevented) setLock(null); });
}

return { start, addNote };
})();
