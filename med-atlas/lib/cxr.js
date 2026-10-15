/* =====================================================================
   TRÌNH XEM X-QUANG NGỰC  (med-atlas/lib/cxr.js, dùng cho 2-chest-xray.html)
   Dữ liệu: lib/data/chest-xray/
     cases.json            danh sách ca theo thứ tự nút (label tiếng Việt + en tiếng Anh)
     anatomy.json          tên Việt/Anh, IPA, đặc điểm, ý nghĩa lâm sàng của từng cấu trúc
     <ca>/image.png        ảnh xám (tools/prepare_chest_xray.py)
     <ca>/meta.json        kích thước, tuổi, giới, khung khoanh vùng của bác sĩ (expert_boxes)
     <ca>/lung-r.png, lung-l.png   mặt nạ phổi có sẵn của bộ Montgomery (nếu có)
     <ca>/case.json        nội dung chữ, vùng nhận diện (structures), marker AI (viết tay)
   - Ca "normal": một ảnh; rê chuột / chạm để nhận diện, nhấp để khóa (nhãn có icon ổ khóa, bấm vào để mở khóa).
   - Ca bệnh: hai ảnh (bình thường | bệnh). Khung của bác sĩ: nét liền đỏ; marker AI: nét đứt vàng,
     luôn kèm chú thích "chưa được bác sĩ duyệt".
   - Thanh "Khoanh vùng": 0 = tắt; các nấc giữa = độ dày viền; nấc cuối = tô màu vùng.
   - Ghim + Xuất PDF: giống trang MRI não (IndexedDB 'med-atlas', organ = 'chest-xray'; in qua #printSheet).
   Nhận diện: tại một điểm, cấu trúc có diện tích nhỏ nhất trong các cấu trúc chứa điểm đó được chọn.
   ===================================================================== */
const CXR = (() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SRC = {
  expert: { short: 'Bác sĩ khoanh', long: 'Khoanh vùng có sẵn trong bộ dữ liệu, do bác sĩ hoặc dưới sự giám sát của bác sĩ vẽ.' },
  ai: { short: 'AI tự vẽ', long: 'Khoanh vùng do AI tự vẽ, chưa được bác sĩ duyệt. Chỉ để minh họa vị trí gần đúng.' },
};
const COL = { expert: '#ff4d3d', ai: '#f2c230' };
// nấc của thanh Khoanh vùng: t = độ dày viền (px màn hình); fill = tô màu
const LEVELS = [{ name: 'Tắt', t: 0 }, { name: 'Viền mảnh', t: 1 }, { name: 'Viền vừa', t: 2 }, { name: 'Viền dày', t: 3.5 }, { name: 'Viền rất dày', t: 5.5 }, { name: 'Tô màu', t: 2, fill: true }];
const S = { base: '', cfg: {}, cases: [], anat: null, cache: {}, cur: null, level: 2, lastLevel: 2, levelBright: 0, contrast: 0,
  hover: null, lock: null, lockHover: false, films: [] };

/* ---------- tải dữ liệu ---------- */
const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); });
const getImg = u => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('Không tải được ' + u)); i.src = u; });
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function grayOf(img) {
  const c = canvasOf(img.naturalWidth, img.naturalHeight), g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, out = new Uint8Array(c.width * c.height);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4]; return out;
}
function rasterize(W, H, draw) {
  const c = canvasOf(W, H), g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; draw(g);
  const d = g.getImageData(0, 0, W, H).data, m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 && d[i * 4] > 127 ? 1 : 0; return m;
}
async function shapeMask(dir, s, W, H) {
  if (s.mask) { const im = await getImg(dir + s.mask); return rasterize(W, H, g => { g.drawImage(im, 0, 0, W, H); }); }
  return rasterize(W, H, g => {
    g.beginPath();
    if (s.poly) { s.poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
    else if (s.ellipse) { const [x, y, rx, ry] = s.ellipse; g.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI); g.fill(); }
    else if (s.line) { g.lineWidth = s.width || 10; g.lineCap = 'round'; g.lineJoin = 'round'; s.line.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
  });
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
async function loadCase(id) {
  if (S.cache[id]) return S.cache[id];
  const dir = S.base + id + '/';
  const [meta, cfg] = await Promise.all([getJSON(dir + 'meta.json'), getJSON(dir + 'case.json')]);
  const img = await getImg(dir + 'image.png'), [W, H] = meta.size, gray = grayOf(img), st = [];
  for (const s of cfg.structures || []) {
    const m = await shapeMask(dir, s, W, H); let area = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let i = 0; i < m.length; i++) if (m[i]) { area++; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const a = S.anat.structures[s.key] || { vi: s.key, en: s.key, color: '#7bcde8' };
    st.push({ ...s, m, area, bb: [x0, y0, x1, y1], info: a, rgb: hex(a.color) });
  }
  const label = (S.cases.find(c => c.id === id) || {});
  const C = { id, dir, meta, cfg, W, H, gray, st, en: label.en || '', view: null, ov: {} };
  S.cache[id] = C; return C;
}

/* ---------- hiển thị ảnh ---------- */
function viewCanvas(C) {
  const key = S.levelBright + '|' + S.contrast;
  if (C.view && C.viewKey === key) return C.view;
  const c = C.view || canvasOf(C.W, C.H), g = c.getContext('2d'), im = g.createImageData(C.W, C.H), d = im.data;
  const k = Math.pow(2, S.contrast / 50), mid = 128 - S.levelBright * 1.27, lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = (v - mid) * k + 128;
  for (let i = 0, n = C.gray.length; i < n; i++) { const v = lut[C.gray[i]]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); C.view = c; C.viewKey = key; return c;
}
/* Lớp khoanh vùng cấu trúc ở độ phân giải ảnh. r = độ dày viền (pixel ảnh); fill = tô; hl = cấu trúc đang trỏ/khóa. */
function overlay(C, r, fill, hl) {
  const key = r + '|' + fill + '|' + (hl ? hl.key : '');
  if (C.ov.key === key) return C.ov.c;
  const c = C.ov.c || canvasOf(C.W, C.H), g = c.getContext('2d'); g.clearRect(0, 0, C.W, C.H);
  const off = !r && !fill;
  if (!off || hl) {
    const im = g.createImageData(C.W, C.H), d = im.data, W = C.W, H = C.H;
    const order = C.st.slice().sort((a, b) => b.area - a.area);   // lớn trước, nhỏ đè lên
    for (const s of order) {
      const on = hl && hl.key === s.key; if (off && !on) continue;
      const [rr, gg, bb] = s.rgb, m = s.m, R = Math.max(1, r || 2), [bx0, by0, bx1, by1] = s.bb;
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
        const i = y * W + x; if (!m[i]) continue;
        let edge = false;
        for (let k = 1; k <= R && !edge; k++) {
          if (x - k < 0 || y - k < 0 || x + k >= W || y + k >= H || !m[i - k] || !m[i + k] || !m[i - k * W] || !m[i + k * W]) edge = true;
        }
        if (edge && s.source === 'ai' && !on && ((x + y) >> 3) & 1 && !fill) continue;   // viền nét đứt cho vùng AI tự vẽ
        let al = 0;
        if (edge && !off) al = 255; else if (edge && on) al = 255;
        else if (fill) al = on ? 150 : 100; else if (on) al = 70;
        if (!al) continue;
        d[i * 4] = rr; d[i * 4 + 1] = gg; d[i * 4 + 2] = bb; d[i * 4 + 3] = al;
      }
    }
    g.putImageData(im, 0, 0);
  }
  C.ov = { key, c }; return c;
}
function hitAt(C, x, y) {
  x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= C.W || y >= C.H) return null;
  const i = y * C.W + x; let best = null;
  for (const s of C.st) if (s.m[i] && (!best || s.area < best.area)) best = s;
  return best;
}
const boxAt = (C, x, y) => (C.meta.expert_boxes || []).find(b => x >= b.xywh[0] && x <= b.xywh[0] + b.xywh[2] && y >= b.xywh[1] && y <= b.xywh[1] + b.xywh[3]);

/* Vẽ khung của bác sĩ và marker AI. T: tọa độ ảnh -> canvas; k: số pixel canvas mỗi pixel ảnh; px: 1 px CSS; lw: độ dày nét; fill: tô nhạt. */
function drawMarks(ctx, C, T, k, px, lw, fill, withText = true) {
  const font = getComputedStyle(document.body).fontFamily, fs = Math.max(11, Math.round(13 * px));
  const label = (txt, x, y, col) => {
    ctx.font = '600 ' + fs + 'px ' + font; const w = ctx.measureText(txt).width + 10 * px, h = fs + 8 * px;
    const bx = Math.max(2, Math.min(ctx.canvas.width - w - 2, x)), by = Math.max(2, Math.min(ctx.canvas.height - h - 2, y));
    ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(bx, by, w, h); ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, bx + 5 * px, by + h / 2);
    return [bx, by, w, h];
  };
  for (const b of C.meta.expert_boxes || []) {
    const [x, y] = T(b.xywh[0], b.xywh[1]), w = b.xywh[2] * k, h = b.xywh[3] * k;
    if (fill) { ctx.fillStyle = 'rgba(255,77,61,.22)'; ctx.fillRect(x, y, w, h); }
    ctx.strokeStyle = COL.expert; ctx.lineWidth = lw; ctx.setLineDash([]); ctx.strokeRect(x, y, w, h);
    if (withText) label('Bác sĩ khoanh', x, y - fs - 10 * px, COL.expert);
  }
  for (const m of C.cfg.markers || []) {
    ctx.strokeStyle = COL.ai; ctx.fillStyle = COL.ai; ctx.lineWidth = lw; ctx.setLineDash([7 * px, 5 * px]);
    let bx0, by0, bx1, by1;
    if (m.kind === 'circle' || m.kind === 'ellipse') {
      const [x, y] = T(...m.at), rx = (m.rx || m.r) * k, ry = (m.ry || m.r) * k;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
      if (fill) { ctx.fillStyle = 'rgba(242,194,48,.22)'; ctx.fill(); ctx.fillStyle = COL.ai; }
      ctx.stroke(); [bx0, by0, bx1, by1] = [x - rx, y - ry, x + rx, y + ry];
    } else if (m.kind === 'arrow') {
      const [x, y] = T(...m.at), a = (m.dir || 135) * Math.PI / 180, L = 46 * px, x0 = x + Math.cos(a) * L, y0 = y - Math.sin(a) * L;
      ctx.setLineDash([5 * px, 4 * px]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      const ha = Math.atan2(y - y0, x - x0), h = (9 + lw / px * 1.2) * px; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x - h * Math.cos(ha - 0.45), y - h * Math.sin(ha - 0.45)); ctx.lineTo(x - h * Math.cos(ha + 0.45), y - h * Math.sin(ha + 0.45)); ctx.closePath(); ctx.fill();
      [bx0, by0, bx1, by1] = [x0, y0, x0, y0];
    } else if (m.kind === 'line') {
      const [a0, a1] = m.pts.map(p => T(...p)); ctx.beginPath(); ctx.moveTo(...a0); ctx.lineTo(...a1); ctx.stroke(); ctx.setLineDash([]);
      [a0, a1].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y - 8 * px); ctx.lineTo(x, y + 8 * px); ctx.stroke(); });
      [bx0, by0, bx1, by1] = [Math.min(a0[0], a1[0]), Math.min(a0[1], a1[1]), Math.max(a0[0], a1[0]), Math.max(a0[1], a1[1])];
    }
    if (m.text && withText) {
      ctx.font = '600 ' + fs + 'px ' + font; const tw = ctx.measureText(m.text).width + 10 * px, th = fs + 8 * px, gap = 6 * px;
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
      const pos = m.lab || (m.kind === 'arrow' ? (Math.cos((m.dir || 135) * Math.PI / 180) < 0 ? 'left' : 'right') : 'above');
      const P = { above: [cx - tw / 2, by0 - th - gap], below: [cx - tw / 2, by1 + gap], left: [bx0 - tw - gap, cy - th / 2], right: [bx1 + gap, cy - th / 2] }[pos];
      label(m.text, P[0], P[1], COL.ai);
    }
  }
  ctx.setLineDash([]);
  return label;
}

/* ---------- vẽ một khung ảnh ---------- */
function geom(f) {
  const C = f.C, cw = f.cv.width, ch = f.cv.height, sc = Math.min(cw / C.W, ch / C.H) * f.zoom;
  return { sc, ox: (cw - C.W * sc) / 2 + f.panX * sc, oy: (ch - C.H * sc) / 2 + f.panY * sc };
}
function fitCanvas(f) {
  const r = f.cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (f.cv.width !== w || f.cv.height !== h) { f.cv.width = w; f.cv.height = h; }
}
function drawFilm(f) {
  if (!f.C || f.box.hidden) return;
  fitCanvas(f);
  const C = f.C, ctx = f.cv.getContext('2d'), g = geom(f), dpr = window.devicePixelRatio || 1, L = LEVELS[S.level];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, f.cv.width, f.cv.height);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(viewCanvas(C), g.ox, g.oy, C.W * g.sc, C.H * g.sc);
  const T = (x, y) => [g.ox + x * g.sc, g.oy + y * g.sc];
  const hl = f.primary ? (S.lock && S.lock.f === f ? S.lock.s : S.hover && S.hover.f === f ? S.hover.s : null) : null;
  if (C.st.length && f.primary) {
    const r = L.t ? Math.max(1, Math.round(L.t * dpr / g.sc)) : 0;
    ctx.drawImage(overlay(C, L.fill ? 2 : r, !!L.fill, hl), g.ox, g.oy, C.W * g.sc, C.H * g.sc);
  }
  if (f.disease && S.level > 0) drawMarks(ctx, C, T, g.sc, dpr, Math.max(1.5, L.t) * dpr, !!L.fill);
  const font = getComputedStyle(document.body).fontFamily, fs = Math.max(12, Math.round(13 * dpr));
  const tag = (txt, x, y, col, lock) => {
    ctx.font = '600 ' + fs + 'px ' + font;
    const ic = lock ? 14 * dpr : 0, w = ctx.measureText(txt).width + 10 * dpr + ic, h = fs + 9 * dpr;
    let bx = x + 12 * dpr, by = y - h - 12 * dpr;
    if (bx + w > f.cv.width - 4) bx = x - 12 * dpr - w; if (by < 4) by = y + 12 * dpr;
    ctx.fillStyle = 'rgba(27,25,32,.86)'; ctx.fillRect(bx, by, w, h);
    if (lock) {
      ctx.strokeStyle = S.lockHover ? '#fff' : col; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
      const lx = bx + 5 * dpr, ly = by + h / 2;                         // ổ khóa: thân + quai
      ctx.fillStyle = col; ctx.fillRect(lx, ly - 1 * dpr, 9 * dpr, 6.5 * dpr);
      ctx.strokeStyle = col; ctx.lineWidth = 1.6 * dpr; ctx.beginPath();
      ctx.moveTo(lx + 2 * dpr, ly - 1 * dpr); ctx.lineTo(lx + 2 * dpr, ly - 3.2 * dpr); ctx.arc(lx + 4.5 * dpr, ly - 3.2 * dpr, 2.5 * dpr, Math.PI, 0); ctx.lineTo(lx + 7 * dpr, ly - 1 * dpr); ctx.stroke();
      f.lockRect = [bx, by, w, h];
    }
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 5 * dpr + ic, by + h / 2 + 0.5);
  };
  f.lockRect = null;
  const locked = S.lock && S.lock.f === f, cur = locked ? S.lock : (S.hover && S.hover.f === f && !S.lock ? S.hover : null);
  if (cur) {
    const [x, y] = T(cur.x, cur.y);
    if (locked) {
      ctx.strokeStyle = COL.ai; ctx.lineWidth = 2 * dpr; const gap = 5 * dpr, R = 13 * dpr;
      ctx.beginPath(); ctx.moveTo(x - R, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + R, y);
      ctx.moveTo(x, y - R); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + R); ctx.stroke();
    }
    const txt = cur.s ? cur.s.info.vi + (cur.s.source === 'ai' ? ' (AI)' : '') : cur.box ? 'Bác sĩ khoanh: ' + cur.box.label : (locked ? 'Điểm đã khóa' : '');
    if (txt && (f.primary || f.disease || locked)) tag(txt, x, y, locked ? COL.ai : '#fff', locked);
  }
}
const drawAll = () => S.films.forEach(drawFilm);

/* ---------- tương tác ---------- */
function imgXY(f, e) {
  const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, g = geom(f);
  return [((e.clientX - r.left) * dpr - g.ox) / g.sc, ((e.clientY - r.top) * dpr - g.oy) / g.sc];
}
function onLockTag(f, e) {
  if (!f.lockRect) return false;
  const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr, [tx, ty, tw, th] = f.lockRect;
  return x >= tx - 3 && x <= tx + tw + 3 && y >= ty - 3 && y <= ty + th + 3;
}
function readout() {
  const el = $('cxReadout'), p = S.lock || S.hover;
  if (!p) { el.innerHTML = S.cur && S.cur.st.length ? '<span class="q">Rê chuột hoặc chạm vào ảnh để nhận diện cấu trúc; nhấp để khóa, bấm vào nhãn có ổ khóa để mở khóa.</span>' : '<span class="q">Kéo thanh Khoanh vùng về 0 để ẩn vùng bệnh (phím H).</span>'; return; }
  const parts = [];
  if (p.s) parts.push(`<b>${esc(p.s.info.vi)}</b> <span class="q">${esc(p.s.info.en)}</span> <span class="src-tag ${p.s.source}">${SRC[p.s.source].short}</span>`);
  if (p.box) parts.push(`<span class="src-tag expert">Bác sĩ khoanh</span> <span class="q">nhãn: ${esc(p.box.label)}</span>`);
  if (!parts.length) parts.push('<span class="q">Không thuộc cấu trúc nào được khoanh vùng.</span>');
  el.innerHTML = parts.join(' &nbsp; ');
}
function setLock(v) { S.lock = v; S.lockHover = false; readout(); info(); drawAll(); }
function bindFilm(f) {
  let down = null;
  f.cv.addEventListener('pointermove', e => {
    if (!f.C) return;
    if (down && f.zoom > 1 && (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4)) {
      const r = f.cv.getBoundingClientRect(), dpr = f.cv.width / r.width, g = geom(f);
      f.panX = down.px + (e.clientX - down.x) * dpr / g.sc; f.panY = down.py + (e.clientY - down.y) * dpr / g.sc; down.moved = true; drawFilm(f); return;
    }
    const lh = S.lock && S.lock.f === f && onLockTag(f, e);
    f.cv.style.cursor = lh ? 'pointer' : '';
    if (lh !== S.lockHover) { S.lockHover = lh; drawFilm(f); }
    if (S.lock) return;
    const [x, y] = imgXY(f, e), inside = x >= 0 && y >= 0 && x < f.C.W && y < f.C.H;
    S.hover = inside ? { f, x, y, s: f.primary ? hitAt(f.C, x, y) : null, box: f.disease ? boxAt(f.C, x, y) : null } : null;
    readout(); drawAll();
  });
  f.cv.addEventListener('pointerleave', () => { S.hover = null; if (S.lockHover) { S.lockHover = false; } if (!S.lock) readout(); drawAll(); });
  f.cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, px: f.panX, py: f.panY, moved: false }; f.cv.setPointerCapture(e.pointerId); });
  f.cv.addEventListener('pointerup', e => {
    const d = down; down = null; if (!f.C || (d && d.moved)) return;
    if (S.lock && S.lock.f === f && onLockTag(f, e)) { setLock(null); return; }   // bấm vào nhãn ổ khóa: mở khóa
    const [x, y] = imgXY(f, e); if (x < 0 || y < 0 || x >= f.C.W || y >= f.C.H) return;
    setLock({ f, x, y, s: f.primary ? hitAt(f.C, x, y) : null, box: f.disease ? boxAt(f.C, x, y) : null });
  });
  f.cv.addEventListener('wheel', e => { if (!f.C || (!e.ctrlKey && !e.metaKey && !e.altKey)) return; e.preventDefault(); setZoom(f, f.zoom * (e.deltaY < 0 ? 1.25 : 0.8)); }, { passive: false });
  f.cv.addEventListener('dblclick', () => setZoom(f, f.zoom > 1 ? 1 : 2));
  f.cv.addEventListener('keydown', e => { if (e.key === 'Enter' && S.hover && S.hover.f === f) setLock({ ...S.hover }); });
}
function setZoom(f, z) { f.zoom = Math.max(1, Math.min(6, z)); if (f.zoom === 1) f.panX = f.panY = 0; drawFilm(f); $('cxZoomOut').textContent = Math.round(f.zoom * 100) + '%'; }

/* ---------- khung thông tin ---------- */
const srcNote = src => `<p class="src-note ${src}"><span class="src-tag ${src}">${SRC[src].short}</span> ${esc(SRC[src].long)}</p>`;
const detailOf = m => [m.sex === 'F' ? 'Nữ' : m.sex === 'M' ? 'Nam' : '', m.age ? m.age + ' tuổi' : '', m.view === 'PA' ? 'phim thẳng sau–trước' : ''].filter(Boolean).join(', ');
function info() {
  const C = S.cur, el = $('cxInfo'); if (!C) return;
  const L = S.lock, cfg = C.cfg, meta = C.meta;
  let h = '';
  if (L && L.s) {   // chỉ hiện thông tin cấu trúc, ẩn phần mô tả ca
    const a = L.s.info;
    h = `<h3>${esc(a.en)}${a.ipa ? ` <span class="ipa" lang="en-fonipa">/${esc(a.ipa)}/</span>` : ''}</h3><p class="sub-vi">${esc(a.vi)}</p>
      <div class="chips"><span class="chip"><i style="background:${a.color}"></i>${esc(C.id === 'normal' ? 'Giải phẫu bình thường' : cfg.title)}</span></div>
      ${srcNote(L.s.source)}<dl><dt>Đặc điểm</dt><dd>${esc(a.desc)}</dd><dt>Ý nghĩa lâm sàng</dt><dd>${esc(a.clinical)}</dd></dl>
      <div class="btnrow"><button class="btn primary" type="button" id="cxSave">Ghim</button><button class="btn" type="button" id="cxUnlock">Bỏ khóa</button></div>`;
    $('cxInfoName').textContent = a.en;
  } else {
    if (L) h += `<p class="info-empty" style="margin-top:0">${L.box ? 'Điểm khóa nằm trong <b>khung bác sĩ khoanh</b> (nhãn: ' + esc(L.box.label) + ').' : 'Điểm khóa không thuộc cấu trúc nào được khoanh vùng.'}</p>
      <div class="btnrow" style="margin:6px 0 12px">${C.id !== 'normal' ? '<button class="btn primary" type="button" id="cxSave">Ghim ca này</button>' : ''}<button class="btn" type="button" id="cxUnlock">Bỏ khóa</button></div>`;
    else if (C.id === 'normal') h += `<p class="info-empty">Nhấp vào một vùng trên ảnh để xem tên, đặc điểm và ý nghĩa lâm sàng của cấu trúc, hoặc chọn trong ô <b>Tìm cấu trúc</b>.</p>`;
    else h += `<div class="btnrow" style="margin:0 0 10px"><button class="btn primary" type="button" id="cxSave">Ghim ca này</button></div>`;
    h += `<h3>${esc(cfg.title)}</h3><p class="sub-vi">${C.en ? esc(C.en) + ' · ' : ''}${esc(cfg.detail || detailOf(meta))}</p>`;
    if (cfg.reading_vi) h += `<dl><dt>Kết luận của bác sĩ đọc phim (bộ dữ liệu)</dt><dd>${esc(cfg.reading_vi)}</dd></dl><p class="where">Nguyên văn: ${esc(meta.clinical_reading)}</p>`;
    (cfg.summary || []).forEach(p => { h += `<p class="para">${esc(p)}</p>`; });
    if ((cfg.findings || []).length) h += '<dl><dt>Dấu hiệu trên ảnh</dt></dl><ul class="finds">' + cfg.findings.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>';
    if (cfg.note) h += `<p class="note-s">${esc(cfg.note)}</p>`;
    if ((meta.expert_boxes || []).length) h += `<p class="src-note expert"><span class="src-tag expert">Bác sĩ khoanh</span> Khung chữ nhật đỏ nét liền: vùng tổn thương do bác sĩ khoanh, có sẵn trong bộ NIH ChestX-ray14 (nhãn: ${meta.expert_boxes.map(b => esc(b.label)).join(', ')}).</p>`;
    if ((cfg.markers || []).length || C.st.some(s => s.source === 'ai')) h += srcNote('ai');
    h += '<p class="where">Nguồn: ' + (cfg.sources || []).map(s => `<a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.cite)}</a>`).join('; ') + '. ' + esc(cfg.license || '') + '</p>';
    $('cxInfoName').textContent = cfg.title;
  }
  el.innerHTML = h;
  const u = $('cxUnlock'); if (u) u.addEventListener('click', () => setLock(null));
  const sv = $('cxSave'); if (sv) sv.addEventListener('click', saveNote);
  if (L && $('cxViewer').classList.contains('info-min') && matchMedia('(max-width: 979px)').matches) S.infoMin(false);
}

/* ---------- ghim + PDF (giống trang MRI não) ---------- */
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
/* Ảnh thu nhỏ quanh điểm khóa: cấu trúc (viền dày), hoặc ca bệnh (khung bác sĩ + marker AI). */
function thumbnail(C, lock) {
  const P = 360, s = lock && lock.s;
  let x0, y0, x1, y1;
  if (s) { [x0, y0, x1, y1] = s.bb; }
  else if (C.id !== 'normal') { x0 = 0; y0 = 0; x1 = C.W - 1; y1 = C.H - 1; }
  else { x0 = lock.x - 120; y0 = lock.y - 120; x1 = lock.x + 120; y1 = lock.y + 120; }
  const side = Math.min(Math.max(C.W, C.H), Math.max(200, Math.max(x1 - x0, y1 - y0) * (s ? 1.35 : 1)));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = cx - side / 2, sy = cy - side / 2, k = P / side;
  const cvs = canvasOf(P, P), ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, P, P); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(viewCanvas(C), -sx * k, -sy * k, C.W * k, C.H * k);
  const T = (x, y) => [(x - sx) * k, (y - sy) * k];
  if (s) {   // viền dày 3 px của cấu trúc ở độ phân giải ảnh thu nhỏ
    const lo = new Uint8Array(P * P);
    for (let y = 0; y < P; y++) { const iy = Math.floor(sy + (y + 0.5) / k); for (let x = 0; x < P; x++) { const ix = Math.floor(sx + (x + 0.5) / k); lo[x + P * y] = ix >= 0 && iy >= 0 && ix < C.W && iy < C.H ? s.m[iy * C.W + ix] : 0; } }
    const im = ctx.getImageData(0, 0, P, P), d = im.data, R = 3, [r, g, b] = s.rgb;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const i = x + P * y; if (!lo[i]) continue; let edge = false;
      for (let dy = -R; dy <= R && !edge; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= P || yy >= P || !lo[xx + P * yy]) { edge = true; break; } }
      if (edge && !(s.source === 'ai' && ((x + y) >> 3) & 1)) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
    }
    ctx.putImageData(im, 0, 0);
  } else if (C.id !== 'normal') drawMarks(ctx, C, T, k, 1, 2.5, false, true);
  const [X, Y] = T(lock.x, lock.y);
  ctx.strokeStyle = COL.ai; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(X - 10, Y); ctx.lineTo(X - 4, Y); ctx.moveTo(X + 4, Y); ctx.lineTo(X + 10, Y); ctx.moveTo(X, Y - 10); ctx.lineTo(X, Y - 4); ctx.moveTo(X, Y + 4); ctx.lineTo(X, Y + 10); ctx.stroke();
  return cvs.toDataURL('image/jpeg', 0.88);
}
async function saveNote() {
  const C = S.cur, L = S.lock || { x: C.W / 2, y: C.H / 2, s: null, box: null }, f = L.f, lc = f ? f.C : C;
  const note = { organ: 'chest-xray', time: Date.now(), kind: L.s ? 'structure' : 'case', caseId: C.id, caseTitle: C.cfg.title, caseEn: C.en,
    key: L.s ? L.s.key : null, source: L.s ? L.s.source : null, box: L.box ? L.box.label : null, xy: [Math.round(L.x), Math.round(L.y)],
    thumb: thumbnail(lc, L), min: true };
  await DB.add(note);
  const b = $('cxSave'); if (b) { b.textContent = 'Đã ghim'; b.disabled = true; }
  renderNotebook();
}
const MIN_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2"/></svg>';
const MAX_SVG = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const DEL_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
function noteTitle(n) {
  if (n.kind === 'structure') { const a = S.anat.structures[n.key] || {}; return [a.en || n.key, (a.vi || '') + (n.source === 'ai' ? ' (AI)' : ''), a]; }
  return [n.caseTitle + (n.caseEn ? ' · ' + n.caseEn : ''), 'Ca bệnh' + (n.box ? ', điểm trong khung bác sĩ khoanh' : ''), null];
}
async function renderNotebook() {
  const notes = await DB.all('chest-xray'), list = $('nbList');
  $('nbCount').textContent = notes.length; $('btnPdf').disabled = !notes.length; $('nbEmpty').hidden = !!notes.length; $('nbWarn').hidden = !DB.volatile;
  list.innerHTML = notes.map(n => {
    const [t, sub] = noteTitle(n), where = n.kind === 'structure' ? (n.caseId === 'normal' ? 'Phim bình thường' : n.caseTitle) : 'Ca bệnh';
    return `<li class="nb-item${n.min ? ' min' : ''}" data-id="${n.id}">
      <div class="nb-top"><div class="nm"><b>${esc(t)}</b><span class="vi">${esc(sub)}</span></div>
        <button class="iconbtn" type="button" data-min="${n.id}" aria-expanded="${!n.min}" title="${n.min ? 'Mở rộng' : 'Thu gọn'}">${n.min ? MAX_SVG : MIN_SVG}</button>
        <button class="iconbtn del" type="button" data-del="${n.id}" title="Bỏ ghim" aria-label="Bỏ ghim ${esc(t)}">${DEL_SVG}</button></div>
      <img src="${n.thumb}" alt="${esc(t)}" loading="lazy">
      <small>${esc(where)}; ${new Date(n.time).toLocaleString('vi-VN')}</small></li>`;
  }).join('');
  list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { await DB.del(+b.dataset.del); renderNotebook(); }));
  list.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', async () => { const n = notes.find(x => x.id === +b.dataset.min); n.min = !n.min; await DB.put(n); renderNotebook(); }));
}
function noteHtml(n) {
  const p = (t, v) => v ? `<p><b>${t}.</b> ${esc(v)}</p>` : '';
  if (n.kind === 'structure') {
    const a = S.anat.structures[n.key] || {};
    const src = n.source === 'ai' ? 'Khoanh vùng do AI tự vẽ, chưa được bác sĩ duyệt' : 'Khoanh vùng có sẵn trong bộ dữ liệu (bác sĩ)';
    return `<article><img src="${n.thumb}" alt="">
      <div><h2>${esc(a.en || n.key)}${a.ipa ? ` <span class="ipa">/${esc(a.ipa)}/</span>` : ''}</h2><p class="en">${esc(a.vi || '')}</p>
      <p class="pos">${esc(n.caseId === 'normal' ? 'Phim ngực thẳng bình thường' : n.caseTitle)}; ${esc(src)}</p>
      ${p('Đặc điểm', a.desc)}${p('Ý nghĩa lâm sàng', a.clinical)}</div></article>`;
  }
  const C = S.cache[n.caseId], cfg = C ? C.cfg : {};
  return `<article><img src="${n.thumb}" alt="">
    <div><h2>${esc(n.caseTitle)}${n.caseEn ? ` <span class="ipa">${esc(n.caseEn)}</span>` : ''}</h2><p class="en">${esc(cfg.detail || (C ? detailOf(C.meta) : ''))}</p>
    <p class="pos">Khung đỏ nét liền: bác sĩ khoanh (NIH ChestX-ray14). Vàng nét đứt: AI tự vẽ, chưa được bác sĩ duyệt.</p>
    ${cfg.reading_vi ? p('Kết luận đọc phim (bộ dữ liệu)', cfg.reading_vi) : ''}${(cfg.findings || []).length ? p('Dấu hiệu', cfg.findings.join(' ')) : ''}</div></article>`;
}
const pad2 = v => String(v).padStart(2, '0');
const PAGE_H = 296, BODY_TOP = 20, BODY_BOTTOM = 16;          // mm; như trang MRI não
async function exportPdf() {
  const notes = await DB.all('chest-xray'); if (!notes.length) return;
  await Promise.all([...new Set(notes.filter(n => n.kind === 'case').map(n => n.caseId))].map(id => loadCase(id).catch(() => null)));
  const sh = $('printSheet'), pxmm = 96 / 25.4, avail = (PAGE_H - BODY_TOP - BODY_BOTTOM) * pxmm;
  const blocks = [`<h1>${esc(S.cfg.printTitle)}</h1>`, ...notes.map(noteHtml)];
  sh.className = 'measure'; sh.innerHTML = `<div class="pb">${blocks.join('')}</div>`;
  await Promise.all([...sh.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : null));
  const els = [...sh.querySelector('.pb').children], pages = []; let cur = [], top = 0;
  els.forEach((el, i) => { const r0 = el.offsetTop, r1 = el.offsetTop + el.offsetHeight; if (cur.length && r1 - top > avail) { pages.push(cur); cur = []; } if (!cur.length) top = r0; cur.push(blocks[i]); });
  if (cur.length) pages.push(cur);
  const head = esc(S.cfg.printHeader || ''), N = pages.length;
  sh.className = '';
  sh.innerHTML = pages.map((pg, i) => `<section class="pg"><div class="ph">${head}</div><div class="pb">${pg.join('')}</div><div class="pf">Trang ${i + 1}/${N}</div></section>`).join('');
  await Promise.all([...sh.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : null));
  const d = new Date(), old = document.title;
  document.title = `${S.cfg.printFile} ${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}

/* ---------- mở một ca ---------- */
async function open(id) {
  const ld = $('cxLoader'); ld.hidden = false; ld.classList.remove('err'); ld.innerHTML = '<div>Đang tải ảnh…</div>';
  try {
    const [C, N] = await Promise.all([loadCase(id), loadCase('normal')]);
    S.cur = C; S.lock = null; S.hover = null;
    const dz = id !== 'normal', [fa, fb] = S.films;
    $('cxFilms').classList.toggle('two', dz); fb.box.hidden = !dz;
    Object.assign(fa, { C: dz ? N : C, primary: !dz, disease: false, zoom: 1, panX: 0, panY: 0 });
    Object.assign(fb, { C: dz ? C : null, primary: dz && C.st.length > 0, disease: dz, zoom: 1, panX: 0, panY: 0 });
    $('cxTagA').textContent = dz ? 'Bình thường' : 'Phim thẳng PA';
    $('cxTagB').textContent = (S.cases.find(c => c.id === id) || {}).label || '';
    $('cxFindRow').hidden = !C.st.length;
    $('cxFind').innerHTML = '<option value="">Chọn cấu trúc…</option>' + C.st.slice().sort((a, b) => a.info.vi.localeCompare(b.info.vi, 'vi'))
      .map(s => `<option value="${s.key}">${esc(s.info.vi)} - ${esc(s.info.en)}${s.source === 'ai' ? ' (AI)' : ''}</option>`).join('');
    legend(C, dz);
    ld.hidden = true; $('cxZoomOut').textContent = '100%';
    readout(); info(); requestAnimationFrame(drawAll);
    document.querySelectorAll('[data-cx]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cx === id)));
  } catch (e) {
    console.error(e); ld.hidden = false; ld.classList.add('err');
    ld.innerHTML = location.protocol === 'file:' ? '<div>Trang cần chạy qua một web server (ví dụ <code>python -m http.server</code>); trình duyệt chặn đọc dữ liệu khi mở file trực tiếp.</div>' : '<div>Không tải được dữ liệu: ' + esc(e.message) + '</div>';
  }
}
function legend(C, dz) {
  const items = [];
  if (C.st.some(s => s.source === 'expert')) items.push(`<span><i class="sw solid" style="border-color:#3787c4"></i>Phổi: mặt nạ có sẵn của bộ dữ liệu (vẽ dưới sự giám sát của bác sĩ)</span>`);
  if (C.st.some(s => s.source === 'ai')) items.push(`<span><i class="sw dash"></i><b>Các mốc còn lại: khoanh vùng do AI tự vẽ, chưa được bác sĩ duyệt</b></span>`);
  if (dz && (C.meta.expert_boxes || []).length) items.push(`<span><i class="sw solid" style="border-color:${COL.expert}"></i>Khung đỏ nét liền: bác sĩ khoanh (NIH ChestX-ray14)</span>`);
  if (dz && (C.cfg.markers || []).length) items.push(`<span><i class="sw dash"></i><b>Vòng, mũi tên, đường đo màu vàng: AI tự vẽ, chưa được bác sĩ duyệt</b></span>`);
  $('cxLegend').innerHTML = items.join('');
}

/* ---------- khởi động ---------- */
async function start(opt) {
  S.base = opt.data; S.cfg = Object.assign({ printHeader: '', printTitle: 'Ghi chú X-quang ngực', printFile: 'ghichu_xquang_nguc' }, opt);
  S.films = ['A', 'B'].map(k => ({ box: $('cxFilm' + k), cv: $('cxCv' + k), C: null, zoom: 1, panX: 0, panY: 0 }));
  S.films.forEach(bindFilm);
  new ResizeObserver(drawAll).observe($('cxFilms'));
  // khung thông tin, bảng điều khiển: thu gọn được
  const setBtn = (b, min, what) => { b.innerHTML = min ? MAX_SVG : MIN_SVG; b.setAttribute('aria-expanded', String(!min)); b.title = (min ? 'Mở ' : 'Thu gọn ') + what; b.setAttribute('aria-label', b.title); };
  S.infoMin = v => { $('cxViewer').classList.toggle('info-min', v); setBtn($('cxInfoMin'), v, 'khung thông tin'); requestAnimationFrame(drawAll); };
  const ctlMin = v => { $('cxControls').classList.toggle('min', v); setBtn($('cxCtlMin'), v, 'bảng điều khiển'); };
  $('cxInfoMin').addEventListener('click', () => S.infoMin(!$('cxViewer').classList.contains('info-min')));
  $('cxCtlMin').addEventListener('click', () => ctlMin(!$('cxControls').classList.contains('min')));
  S.infoMin(false); ctlMin(matchMedia('(max-width: 700px)').matches);
  new IntersectionObserver(es => es.forEach(e => $('cxControls').classList.toggle('away', !e.isIntersecting)), { threshold: 0.15 }).observe($('cxStage'));
  // ghim
  $('btnPdf').addEventListener('click', exportPdf);
  try {
    const [cs, an] = await Promise.all([getJSON(S.base + 'cases.json'), getJSON(S.base + 'anatomy.json')]);
    S.cases = cs.cases; S.anat = an;
  } catch (e) { $('cxLoader').innerHTML = location.protocol === 'file:' ? '<div>Trang cần chạy qua một web server (ví dụ <code>python -m http.server</code>).</div>' : '<div>Không tải được danh sách ca: ' + esc(e.message) + '</div>'; return; }
  renderNotebook();
  const tabs = $('cxTabs');
  tabs.innerHTML = S.cases.map(c => `<button class="btn" type="button" data-cx="${c.id}" aria-pressed="false" aria-label="${esc(c.label)} (${esc(c.en)})"><span class="t-vi">${esc(c.label)}</span><span class="t-en" lang="en">${esc(c.en)}</span></button>`).join('');
  tabs.querySelectorAll('[data-cx]').forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-pressed') !== 'true') { open(b.dataset.cx); history.replaceState(null, '', '#' + b.dataset.cx); } }));
  // thanh Khoanh vùng: 0 = tắt, giữa = độ dày viền, cuối = tô màu
  const lv = $('cxLevel'); lv.max = LEVELS.length - 1;
  const setLevel = v => { S.level = v; if (v) S.lastLevel = v; lv.value = v; $('cxLevelOut').textContent = LEVELS[v].name; lv.setAttribute('aria-valuetext', LEVELS[v].name); drawAll(); };
  lv.addEventListener('input', () => setLevel(+lv.value)); setLevel(S.level);
  const rng = (id, out, fn) => { const el = $(id), o = $(out); const up = () => { fn(+el.value); o.textContent = (+el.value > 0 ? '+' : '') + el.value; drawAll(); }; el.addEventListener('input', up); up(); };
  rng('cxBright', 'cxBrightOut', v => { S.levelBright = v; });
  rng('cxContrast', 'cxContrastOut', v => { S.contrast = v; });
  $('cxReset').addEventListener('click', () => { ['cxBright', 'cxContrast'].forEach(id => { $(id).value = 0; $(id).dispatchEvent(new Event('input')); }); S.films.forEach(f => setZoom(f, 1)); });
  $('cxFind').addEventListener('change', e => {
    const C = S.cur, s = C.st.find(x => x.key === e.target.value); if (!s) return;
    let sx = 0, sy = 0, n = 0; for (let i = 0; i < s.m.length; i++) if (s.m[i]) { sx += i % C.W; sy += (i / C.W) | 0; n++; }
    let x = sx / n, y = sy / n;
    if (hitAt(C, x, y) !== s) for (let i = 0; i < s.m.length; i += 7) if (s.m[i] && hitAt(C, i % C.W, (i / C.W) | 0) === s) { x = i % C.W; y = (i / C.W) | 0; break; }
    const f = S.films.find(ff => ff.C === C && ff.primary); if (!f) return;
    setLock({ f, x, y, s, box: null }); e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'Escape' && S.lock) setLock(null);
    if (e.key === 'h' || e.key === 'H') setLevel(S.level ? 0 : S.lastLevel);
  });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.cases.some(c => c.id === h) && (!S.cur || S.cur.id !== h)) open(h); });
  const want = location.hash.slice(1);
  await open(S.cases.some(c => c.id === want) ? want : S.cases[0].id);
}
return { start, open, redraw: drawAll };
})();
