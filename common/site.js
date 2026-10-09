/* =====================================================================
   Shared site chrome for My Academia: minigame ở footer của mọi trang, titan ăn lá.
   Cách dùng: site.css, khối <footer class="site-foot"> (canvas #catCanvas + nút #catBtn), rồi
   <script src="../common/site.js" defer></script>.

   - Titan luôn tự đi bộ từ đầu này sang đầu kia của thanh ngang (lúc đầu là người đàn ông,
     cao bằng con gà trong minigame của my-library).
   - Nhấn Play: một chiếc lá xanh bay lên, nhấp nháy, dừng ở độ cao cao hơn đỉnh đầu titan 5-20%.
     Dưới nút hiện "Press ← ↑ → to eat the food"; nút Play bị mờ (không bấm được) cho tới khi lá được ăn.
     ← →: chạy về hướng đó, giữ càng lâu càng nhanh (tối đa gấp 4 lần đi bộ); thả ra thì titan lại tự đi.
     Đang nhảy mà giữ ← →: titan lao về hướng đó (giữ đà lúc bật nhảy, cộng thêm gia tốc trên không). ↑: nhấn giữ để lấy đà (thang ô vuông
     trên đầu titan đầy dần), giữ càng lâu nhảy càng cao, tối đa gấp 2 lần chiều cao titan; thả ra thì nhảy.
     Chỉ ăn được lá khi đang nhảy hoặc bay; đi ngang qua dưới lá thì không ăn.
   - Sau 10 lần ăn lá, titan mọc đôi cánh dơi (lúc giữ ↑ mà chưa bay, cạnh titan hiện FLY_HINT): giữ ↑ thêm cho tới khi đầy các ô xanh dương thì chuyển từ nhảy sang bay.
     Đang bay: giữ ↑ để bay lên, ← → để lượn ngang, ↓ để hạ thấp; thả ↑ thì titan hạ dần xuống tới khi đáp đất.
     Bay ngang qua lá là ăn được lá.
   - Ăn lá: lá biến mất, titan cao thêm 10%, nút Play trở lại như trước.
     Lá đầu tiên biến titan thành người cây khổng lồ (đầu bầu dục); từ khi cao hơn ban đầu 50% thì thân gầy, khô, sắc nâu đỏ.
   - Từ khi cao hơn ban đầu 30%: mỗi lần nhảy rồi đáp đất, thanh ngang rung lắc quanh chỗ titan đứng
     (titan bám theo), mạnh dần theo chiều cao nhưng có giới hạn (WOBBLE_MAX), rồi tắt dần.
   - Khi titan đã cao từ 50% chiều cao màn hình trở lên: lần nhảy kế tiếp, vừa chạm đất là
     thanh ngang gãy, titan rơi hẳn xuống chỗ gãy, hiện "Too Heavy. Game Over!".
     Nhấn Play lần nữa để chơi lại từ đầu.
   Vẽ kiểu pixel art nét sketch như minigame con gà của my-library: mỗi bộ phận chỉ còn đường viền, có màu, không tô
   (riêng chiếc lá được tô màu). Canvas (#catCanvas) cao dần lên phía trên footer (đè lên nội dung,
   không nhận chuột) khi titan lớn.
   Điện thoại không có phím mũi tên nên chỉ xem titan đi, không chơi được.
   EDIT: màu trong COL, các thông số trong phần "settings".
   ===================================================================== */
(() => {
'use strict';
const canvas = document.getElementById('catCanvas');
const btn = document.getElementById('catBtn');
if (!canvas || !btn) return;
const lane = canvas.parentElement;
lane.style.display = 'flow-root';          // để margin âm của canvas không kéo cả footer (và nút Play) lên theo
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const ctx = canvas.getContext('2d');

/* ---------------- settings ---------------- */
const BASE_H = 140;            // chiều cao canvas mặc định (khớp #catCanvas trong site.css)
const GROUND = 24;             // thanh ngang cách đáy canvas (khớp minigame con gà của my-library)
const PIX = 2;                 // mỗi điểm ảnh của sprite = 2 px (người cây)
const PIX0 = 1;                // người đàn ông lúc đầu nhỏ: 1 px để còn thấy được nét viền (không tô)
const H0 = 44;                 // chiều cao ban đầu (px) = chiều cao con gà (my-library)
const GROW = 1.10;             // mỗi lá: cao thêm 10%
const LEAF_UP = [0.05, 0.20];  // lá dừng cao hơn đỉnh đầu titan 5-20% chiều cao titan
const HEAVY = 0.5;             // từ 50% chiều cao màn hình: lần nhảy kế tiếp làm gãy thanh ngang
const JUMP_T = 1.0;            // thời gian lần nhảy cao nhất (giây)
const CHARGE_T = 0.8;          // giữ ↑ bao lâu thì đạt độ nhảy cao nhất (giây)
const JUMP_MIN = 0.05, JUMP_MAX = 2;      // độ cao nhảy (lần chiều cao titan): thấp nhất / cao nhất
const WINGS_AFTER = 10;        // sau 10 lần ăn lá thì mọc cánh
const FLY_T = 0.6;             // có cánh: giữ ↑ thêm bao lâu sau mức nhảy cao nhất thì cất cánh (giây)
const METER = { jump: 8, fly: 4, sq: 5, gap: 1 };
const FLY_HINT = 'Đè nút ↑ đủ lâu để bay!';   // ghi chú cạnh titan (khi đã có cánh) lúc đang giữ ↑ mà chưa bay   // thang đo lấy đà: số ô (nhảy, bay), cạnh ô, khe (px)
const RUN_MIN = 1.5, RUN_MAX = 4;   // ← →: tốc độ chạy (lần tốc độ đi bộ) lúc mới nhấn / tối đa
const RUN_RAMP = 1.5;          // giữ ← → bao lâu thì đạt tốc độ tối đa (giây)
const AIR_ACC = 3;             // đang nhảy mà giữ ← →: gia tốc ngang (lần tốc độ đi bộ mỗi giây)
const WOBBLE_FROM = 1.3;       // từ khi cao gấp 1,3 lần ban đầu: thanh ngang rung khi titan đáp đất
const WOBBLE_MAX = 9;          // biên độ rung lớn nhất (px)
const GAUNT_FROM = 1.5;        // từ khi cao gấp 1,5 lần ban đầu: thân gầy
const COL = { meter: ['#3E9B3A', '#7FB02E', '#C9A21A', '#E07B1F', '#d8312a'], fly: '#3787c4', man: '#1B1920', bark: '#7A4E2D', barkDark: '#5A3820', gaunt: '#8A3324', gauntDark: '#5A1F16', leaf: '#23A04A', eye: '#C9A21A', red: '#d8312a', bar: '#1B1920' };

/* ---------------- canvas ---------------- */
const S = { W: 0, H: 0, dpr: 1, visible: false, last: null, cssH: BASE_H };
function fit() {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  S.W = r.width; S.H = r.height; S.dpr = dpr;
  canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
}
/* canvas cao thêm về phía trên (margin âm) để titan lớn và chiếc lá không bị cắt; đáy giữ nguyên chỗ */
function setHeight(h) {
  h = Math.max(BASE_H, Math.ceil(h / 40) * 40);
  if (h === S.cssH) return;
  S.cssH = h; canvas.style.height = h + 'px'; canvas.style.marginTop = (BASE_H - h) + 'px'; fit();
}
const needHeight = () => Math.min(window.innerHeight * 1.5,
  Math.max(T.hT * (1.1 + JUMP_MAX), leaf ? leaf.alt + 40 : 0, T.wings ? window.innerHeight - GROUND - 20 : 0) + GROUND + 30);

/* ---------------- sketch sprites (cùng cách với minigame con gà của my-library) ----------------
   Mỗi bộ phận tô bằng một màu khóa trên canvas nhỏ, rồi chỉ giữ điểm ảnh ở mép bộ phận
   (giáp chỗ trống hoặc giáp bộ phận vẽ trước nó) bằng màu nét của bộ phận đó. */
const PARTS = ['wing', 'legB', 'armB', 'legF', 'body', 'head', 'hair', 'armF', 'detail', 'eye'];
const SOLID = new Set(['detail', 'eye']);                           // vẽ hết điểm ảnh (nét mảnh)
const KEY = PARTS.map((_, i) => [20 + i * 21, 235 - i * 19, (i * 97) % 255]);
const keyCss = n => { const c = KEY[PARTS.indexOf(n)]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const spr = document.createElement('canvas');
const sctx = spr.getContext('2d', { willReadFrequently: true });
let U = 1;                                                          // số điểm ảnh sprite ứng với chiều cao titan
const px = (w, min) => Math.max(w, min / U);                        // bề dày tối thiểu (điểm ảnh)
function ln(n, w, pts) { const c = sctx; c.strokeStyle = keyCss(n); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }
function el(n, x, y, rx, ry, rot = 0) { const c = sctx; c.fillStyle = keyCss(n); c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); }
function poly(n, pts) { const c = sctx; c.fillStyle = keyCss(n); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); }
const polar = (o, len, ang) => [o[0] + Math.sin(ang) * len, o[1] + Math.cos(ang) * len];   // ang = 0: thẳng xuống

/* tư thế: step (pha bước), walk 0..1, jump 0..1 (co chân, giơ tay). Tọa độ: chân ở y = 0, đỉnh đầu y = -1, mặt quay về +x */
function limb(n, root, l1, l2, a1, a2, w) { const k = polar(root, l1, a1), f = polar(k, l2, a2); ln(n, w, [root, k, f]); return f; }
function drawMan(P) {
  const sw = Math.sin(P.step) * 0.5 * P.walk, j = Math.max(P.jump, P.crouch * 0.6);
  const leg = (n, a) => { const f = limb(n, [0, -0.45], 0.23, 0.22, a + j * 0.9, a - j * 0.5, px(0.085, 1.6)); ln(n, px(0.05, 1.2), [f, [f[0] + 0.06, f[1]]]); };
  const arm = (n, a) => limb(n, [0, -0.75], 0.17, 0.16, a * 0.8 + j * 2.4, a * 0.8 - 0.3 + j * 2.6, px(0.05, 1.4));
  leg('legB', -sw); arm('armB', sw); leg('legF', sw);
  poly('body', [[-0.085, -0.78], [0.095, -0.78], [0.07, -0.45], [-0.07, -0.45]]);
  ln('head', px(0.05, 1.4), [[0.005, -0.82], [0.005, -0.76]]);
  el('head', 0.01, -0.89, 0.075, 0.09);
  el('hair', -0.012, -0.95, 0.07, 0.04, -0.2);                      // tóc ngắn
  arm('armF', -sw);
  sctx.fillStyle = keyCss('eye'); sctx.fillRect(0.045, -0.905, px(0.001, 1), px(0.001, 1));
}
/* cánh dơi: xương cánh từ vai tới cổ tay, ba ngón dài xòe ra, màng da căng giữa các ngón với mép sau lõm hình vỏ sò.
   open 0 = xếp dựng sau vai, 1 = dang rộng; flap = pha vỗ */
function drawWing(open, flap) {
  const root = [-0.05, -0.74], L = lerp(0.36, 0.66, open);
  const al = lerp(1.3, 0.3 + 0.7 * Math.sin(flap), open);           // góc so với phương ngang phía sau, đo lên trên
  const d = [-Math.cos(al), -Math.sin(al)], q = [-d[1], d[0]];       // d: dọc cánh ra ngoài; q: về phía mép trước
  const sv = lerp(0.45, 1, open);                                     // xếp lại thì màng hẹp
  const at = (u, v) => [root[0] + d[0] * L * u + q[0] * L * v * sv, root[1] + d[1] * L * u + q[1] * L * v * sv];
  const wrist = at(0.42, 0.1), tips = [at(1, 0.06), at(0.86, -0.34), at(0.58, -0.56)], body = at(0.06, -0.36);
  const scallop = (p1, p2) => { const m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]; return [lerp(m[0], wrist[0], 0.28), lerp(m[1], wrist[1], 0.28)]; };
  poly('wing', [root, wrist, tips[0], scallop(tips[0], tips[1]), tips[1], scallop(tips[1], tips[2]), tips[2], scallop(tips[2], body), body]);
  ln('detail', px(0.016, 1), [root, wrist]);                        // xương cánh
  tips.forEach(tp => ln('detail', px(0.009, 1), [wrist, tp]));       // ba ngón dài
  ln('detail', px(0.009, 1), [wrist, at(0.48, 0.2), at(0.45, 0.24)]);   // ngón cái có móc nhỏ
}
function drawGiant(P, gaunt, wings) {                               // người cây khổng lồ (thiết kế riêng)
  if (wings) drawWing(P.fly, P.flap);
  const fl = P.fly, sw = Math.sin(P.step) * 0.42 * P.walk * (1 - fl), j = Math.max(P.jump, P.crouch * 0.6) * (1 - fl);
  const f = gaunt ? 0.55 : 1;                                        // gầy: tay chân, thân mảnh hơn
  const leg = (n, a) => {
    const ft = limb(n, [0, -0.47], 0.25, 0.22, a + j * 0.8, a - j * 0.45, px(0.11 * f, 2));
    ln(n, px(0.06 * f, 1.4), [ft, [ft[0] + 0.09, ft[1] + 0.005]]); ln(n, px(0.04 * f, 1), [ft, [ft[0] - 0.04, ft[1] + 0.005]]);   // chân như rễ
  };
  const arm = (n, a) => {
    const h = limb(n, [0.01, -0.76], 0.22, gaunt ? 0.25 : 0.22, a * 0.7 + j * 2.2, a * 0.7 - 0.12 + j * 2.4, px(0.055 * f, 1.4));
    [-0.5, 0, 0.5].forEach(d => ln('detail', px(0.012, 1), [h, polar(h, gaunt ? 0.065 : 0.05, 0.25 * Math.sign(a || 1) + d + j * 2.4)]));   // ngón như cành nhỏ
  };
  leg('legB', -sw - fl * 0.55); arm('armB', sw + fl * 0.3); leg('legF', sw - fl * 0.3);   // bay: chân duỗi ra sau
  if (gaunt) poly('body', [[-0.07, -0.8], [0.08, -0.8], [0.055, -0.62], [0.04, -0.46], [-0.04, -0.46], [-0.055, -0.62]]);
  else poly('body', [[-0.1, -0.8], [0.11, -0.8], [0.09, -0.6], [0.075, -0.45], [-0.075, -0.45], [-0.09, -0.6]]);
  ln('head', px(0.06 * f, 1.6), [[0.01, gaunt ? -0.85 : -0.84], [0.01, -0.78]]);
  el('head', 0.022, -0.88, gaunt ? 0.042 : 0.047, gaunt ? 0.058 : 0.063);    // đầu bầu dục (cao hơn rộng), không có nhánh trên đầu
  if (gaunt) {                                                       // thân khô: vết nứt dọc trên thân, đốt ở khớp
    ln('detail', px(0.008, 1), [[-0.015, -0.78], [-0.02, -0.66], [-0.01, -0.5]]);
    ln('detail', px(0.008, 1), [[0.03, -0.76], [0.025, -0.64]]);
  } else {
    ln('detail', px(0.01, 1), [[-0.03, -0.76], [-0.02, -0.62], [-0.035, -0.5]]);    // vân vỏ cây trên thân
    ln('detail', px(0.01, 1), [[0.045, -0.72], [0.035, -0.58]]);
  }
  sctx.fillStyle = keyCss('eye'); sctx.fillRect(0.045, -0.895, px(0.001, 1), px(0.001, 1));
}
function render(stage, P, h, dir, wings) {
  U = Math.max(12, Math.round(h / (stage === 0 ? PIX0 : PIX)));
  const w = Math.ceil(U * (wings ? 1.45 : 0.75)) + 12, hh = Math.ceil(U * (wings ? 1.42 : 1.12)) + 6, ox = Math.round(w / 2), oy = hh - 3;
  if (spr.width !== w || spr.height !== hh) { spr.width = w; spr.height = hh; }
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, w, hh);
  sctx.setTransform(dir * U, 0, 0, U, ox, oy);
  if (stage === 0) drawMan(P); else drawGiant(P, stage === 2, wings);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = sctx.getImageData(0, 0, w, hh), d = img.data, cls = new Int8Array(w * hh).fill(-1);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] < 120) continue;
    let best = 0, bd = 1e9;
    for (let k = 0; k < KEY.length; k++) { const c = KEY[k], dd = (c[0] - d[i]) ** 2 + (c[1] - d[i + 1]) ** 2 + (c[2] - d[i + 2]) ** 2; if (dd < bd) { bd = dd; best = k; } }
    cls[p] = best;
  }
  const [main, dark] = stage === 2 ? [COL.gaunt, COL.gauntDark] : [COL.bark, COL.barkDark];
  const lineOf = stage === 0 ? () => COL.man : n => (n === 'eye' ? COL.eye : n === 'detail' ? dark : main);
  const cols = PARTS.map(n => hex(lineOf(n))), solid = PARTS.map(n => SOLID.has(n));
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= hh) ? -1 : cls[y * w + x];
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4, c = cls[p];
    d[i + 3] = 0;
    if (c < 0) continue;
    if (solid[c] || at(x - 1, y) < c || at(x + 1, y) < c || at(x, y - 1) < c || at(x, y + 1) < c) {
      const col = cols[c]; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  return { ox, oy };
}
/* biểu tượng một chiếc lá xanh (tô màu, không nền), vẽ kiểu pixel một lần */
const leafSpr = (() => {
  const W = 13, H = 17, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = COL.leaf;
  g.beginPath(); g.moveTo(1.5, 15.5);                                // cuống ở góc dưới trái, chóp lá ở góc trên phải
  g.bezierCurveTo(0.5, 7.5, 5, 2, 12.5, 0.5);
  g.bezierCurveTo(13, 9, 9, 14.5, 1.5, 15.5);
  g.fill();
  g.globalCompositeOperation = 'destination-out';                    // gân lá: đường cong để trống
  g.strokeStyle = '#000'; g.lineWidth = 1.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(2.5, 14.5); g.quadraticCurveTo(6.5, 10.5, 10, 4.5); g.stroke();
  g.globalCompositeOperation = 'source-over';
  g.lineWidth = 1.2; g.strokeStyle = COL.leaf; g.beginPath(); g.moveTo(0.5, 16.5); g.lineTo(2.5, 14.5); g.stroke();   // cuống
  const im = g.getImageData(0, 0, W, H), d = im.data, rgb = hex(COL.leaf);
  for (let i = 0; i < d.length; i += 4) {                            // bỏ khử răng cưa: điểm ảnh rõ nét
    if (d[i + 3] >= 110) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; } else d[i + 3] = 0;
  }
  g.putImageData(im, 0, 0);
  return c;
})();

/* ---------------- trạng thái ---------------- */
const T = { x: null, dir: 1, h: H0, hT: H0, stage: 0, eaten: 0, lift: 0, vy: 0, g: 0, air: false, heavyJump: false,
  charge: null, wings: false, flying: false, upHeld: false, vx: 0, runT: 0, runDir: 0,
  pose: { step: 0, walk: 0, jump: 0, crouch: 0, fly: 0, flap: 0 }, fall: 0, fallV: 0 };
let mode = 'idle';                 // idle | play | over
let leaf = null;                   // { x, alt, x0, t0, ready }
let broken = null;                 // { x, half, t0 }
let wob = null;                    // thanh ngang rung: { x, a0, t0 }
const keys = { left: false, right: false, down: false };
const ground = () => S.H - GROUND;
const bounds = () => { const m = 18 + T.h * 0.22; return [m, Math.max(m, S.W - m)]; };

function reset() {
  Object.assign(T, { h: H0, hT: H0, stage: 0, eaten: 0, lift: 0, vy: 0, vx: 0, runT: 0, runDir: 0, air: false, heavyJump: false, charge: null,
    wings: false, flying: false, upHeld: false, fall: 0, fallV: 0, dir: 1 });
  T.x = S.W * 0.25; broken = null; leaf = null; wob = null;
  setHeight(BASE_H);
}
function startRound(t) {
  const [a, b] = bounds(), far = Math.min(140, (b - a) / 3);
  let x = rnd(a, b);
  for (let k = 0; k < 20 && Math.abs(x - T.x) < far; k++) x = rnd(a, b);
  leaf = { x, alt: T.hT * (1 + rnd(LEAF_UP[0], LEAF_UP[1])), x0: S.W / 2, t0: t, ready: false };
  mode = 'play';
  setHeight(needHeight());
  setButton();
}
/* ↑: nhấn giữ để lấy đà, thả ra thì nhảy; giữ càng lâu càng cao (tới JUMP_MAX) */
function upDown(t) {
  if (mode !== 'play') return;
  if (T.flying) { T.upHeld = true; return; }                         // đang bay: giữ ↑ để bay lên
  if (!T.air && T.charge === null) T.charge = t;
}
function upRelease(t) {
  T.upHeld = false;                                                  // đang bay: thả ↑ thì hạ dần
  if (T.charge === null) return;
  const u = clamp((t - T.charge) / CHARGE_T, 0, 1); T.charge = null;
  if (mode !== 'play' || T.air) return;
  const Amax = T.h * JUMP_MAX, A = lerp(T.h * JUMP_MIN + 2, Amax, u);
  T.g = 8 * Amax / (JUMP_T * JUMP_T); T.vy = Math.sqrt(2 * T.g * A); T.air = true;
  T.heavyJump = T.hT >= HEAVY * window.innerHeight;
}
function takeOff() {                                                 // có cánh, giữ ↑ đủ lâu: chuyển sang bay
  T.charge = null; T.flying = true; T.air = true; T.upHeld = true; T.vy = 0;
  T.heavyJump = T.hT >= HEAVY * window.innerHeight;
  setHeight(needHeight());
}
function land(t) {
  T.flying = false; T.upHeld = false;
  if (T.heavyJump) {
    broken = { x: T.x, half: T.h * 0.2 + 10, t0: t };                 // thanh ngang gãy ngay dưới chân
    mode = 'over'; leaf = null; wob = null; keys.left = keys.right = false; T.charge = null; T.fallV = 0;
    setButton(); return;
  }
  const r = T.hT / H0;
  if (r >= WOBBLE_FROM) wob = { x: T.x, a0: Math.min(WOBBLE_MAX, 2.5 + (r - WOBBLE_FROM) * 4), t0: t };
}
/* độ võng của thanh ngang tại x (px, dương = xuống): dao động tắt dần, lớn nhất ở chỗ titan đáp đất,
   bằng 0 ở hai đầu đoạn thanh (đoạn trái / phải của nút Play) */
function sag(x, t) {
  if (!wob) return 0;
  const e = t - wob.t0, amp = wob.a0 * Math.exp(-e / 0.65) * Math.cos(2 * Math.PI * 2.1 * e);
  if (e > 3) { wob = null; return 0; }
  const mid = S.W / 2, gap = 15, [s0, s1] = wob.x < mid ? [0, mid - gap] : [mid + gap, S.W];
  if (x < s0 || x > s1) return 0;
  const wx = clamp(wob.x, s0 + 1, s1 - 1);
  const k = x <= wx ? Math.sin(Math.PI / 2 * (x - s0) / (wx - s0)) : Math.sin(Math.PI / 2 * (s1 - x) / (s1 - wx));
  return amp * k;
}
function eat() {
  leaf = null; T.eaten++; T.hT *= GROW;
  T.stage = T.hT / H0 >= GAUNT_FROM ? 2 : 1;
  if (T.eaten >= WINGS_AFTER) T.wings = true;     // từ giờ canvas phủ cả màn hình phía trên footer (needHeight)
  mode = 'idle'; keys.left = keys.right = keys.down = false; T.charge = null; T.upHeld = false;
  setHeight(needHeight());
  setButton();
}

/* ---------------- nút Play + phím ---------------- */
const icon = btn.querySelector('path');
const hint = document.createElement('div');
hint.className = 'titan-hint'; hint.hidden = true; hint.textContent = 'Press ← ↑ → to eat the food';
lane.appendChild(hint);
function setButton() {
  if (icon) icon.setAttribute('d', 'M9.6 7.4 17 12l-7.4 4.6z');
  const busy = mode === 'play';                                      // lá còn đó: nút Play không bấm được
  btn.setAttribute('aria-disabled', String(busy));
  btn.style.opacity = busy ? '.4' : '';
  btn.style.cursor = busy ? 'default' : '';
  const lab = busy ? 'Đang chơi: ← → để chạy, giữ ↑ để lấy đà nhảy lên ăn lá'
    : mode === 'over' ? 'Chơi lại từ đầu' : 'Thả lá cho titan';
  if (busy && T.wings) { const l2 = 'Đang chơi: giữ ↑ thật lâu để bay, ← → ↓ để lượn, thả ↑ để hạ cánh'; btn.setAttribute('aria-label', l2); btn.title = l2; }
  btn.setAttribute('aria-label', lab); btn.title = lab;
  hint.hidden = !busy;
}
btn.addEventListener('click', e => {
  e.preventDefault();
  if (mode === 'play') return;
  const t = performance.now() / 1000;
  if (mode === 'over') reset();
  startRound(t);
});
const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
document.addEventListener('keydown', e => {
  const k = ARROWS[e.key];
  if (!k || mode !== 'play' || !S.visible || e.altKey || e.ctrlKey || e.metaKey) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  e.preventDefault();                                                  // không cuộn trang khi đang chơi
  if (k === 'up') { if (!e.repeat) upDown(performance.now() / 1000); } else keys[k] = true;
});
document.addEventListener('keyup', e => {
  const k = ARROWS[e.key]; if (!k) return;
  if (k === 'up') upRelease(performance.now() / 1000); else keys[k] = false;
});
window.addEventListener('blur', () => { keys.left = keys.right = keys.down = false; upRelease(performance.now() / 1000); });

/* ---------------- cập nhật ---------------- */
function update(t, dt) {
  if (T.x === null) T.x = S.W * 0.25;
  T.h = lerp(T.h, T.hT, Math.min(1, dt * 6));
  const P = T.pose;
  if (mode === 'over') {                                               // rơi qua chỗ gãy
    if (t - broken.t0 > 0.12) { T.fallV += 2600 * dt; T.fall += T.fallV * dt; }
    P.walk = lerp(P.walk, 0, Math.min(1, dt * 8)); P.jump = lerp(P.jump, 1, Math.min(1, dt * 4));
    return;
  }
  const [a, b] = bounds();
  const walkV = 22 + T.h * 0.12, vmax = walkV * RUN_MAX;
  const d = mode === 'play' ? (keys.right ? 1 : 0) - (keys.left ? 1 : 0) : 0;
  // thời gian giữ ← → liên tục theo một hướng (đổi hướng / thả phím thì tính lại)
  if (d && d === T.runDir) T.runT += dt; else { T.runT = 0; T.runDir = d; }
  const runV = walkV * lerp(RUN_MIN, RUN_MAX, clamp(T.runT / RUN_RAMP, 0, 1));
  if (T.flying) {                                                      // bay: ← → lượn ngang
    if (d) T.dir = d;
    T.vx = d * (60 + T.h * 0.5);
  } else if (T.air) {                                                  // nhảy: giữ đà lúc bật lên, ← → cộng thêm gia tốc
    if (d) { T.dir = d; T.vx = clamp(T.vx + d * AIR_ACC * walkV * dt, -vmax, vmax); }
  } else {
    let target;
    if (d) { T.dir = d; target = d * runV; }                           // ← →: chạy, giữ càng lâu càng nhanh
    else if (T.charge !== null) target = 0;                            // đang lấy đà: đứng lại
    else if (!REDUCED) {                                               // tự đi từ đầu này sang đầu kia
      if (T.x <= a + 1) T.dir = 1; else if (T.x >= b - 1) T.dir = -1;
      target = T.dir * walkV;
    } else target = 0;
    T.vx = lerp(T.vx, target, Math.min(1, dt * 10));
  }
  const vx = Math.abs(T.vx) < 0.5 ? 0 : T.vx;
  P.crouch = lerp(P.crouch, T.charge !== null ? 0.4 + 0.6 * clamp((t - T.charge) / CHARGE_T, 0, 1) : 0, Math.min(1, dt * 12));
  const nx = clamp(T.x + vx * dt, a, b);
  if (nx !== T.x + vx * dt) T.vx = 0;                                   // chạm đầu thanh ngang: dừng
  T.x = nx;
  P.walk = lerp(P.walk, vx && !T.air ? 1 : 0, Math.min(1, dt * 10));
  if (vx && !T.air) P.step += Math.abs(vx) * dt / (T.h * 0.2);
  if (T.charge !== null && T.wings && t - T.charge >= CHARGE_T + FLY_T) takeOff();
  if (T.flying) {                                                    // bay: ↑ lên, ↓ xuống, thả ↑ thì hạ dần
    const ctl = mode === 'play', down = ctl && keys.down, up = ctl && T.upHeld;
    const vTarget = down ? -(150 + T.h * 0.6) : up ? 90 + T.h * 0.5 : -(30 + T.h * 0.15);
    T.vy = lerp(T.vy, vTarget, Math.min(1, dt * 4));
    const top = S.H - GROUND - T.h * 1.45 - 10;
    T.lift = clamp(T.lift + T.vy * dt, 0, Math.max(0, top));
    P.flap += dt * (up ? 9 : 5); P.fly = lerp(P.fly, 1, Math.min(1, dt * 6)); P.jump = lerp(P.jump, 0, Math.min(1, dt * 8));
    if (T.lift <= 0 && T.vy < 0) { T.lift = 0; T.air = false; T.vy = 0; land(t); }
  } else if (T.air) {
    T.vy -= T.g * dt; T.lift += T.vy * dt;
    P.jump = lerp(P.jump, T.vy > 0 ? 1 : 0.3, Math.min(1, dt * 10));
    if (T.lift <= 0) { T.lift = 0; T.air = false; land(t); }
  } else P.jump = lerp(P.jump, 0, Math.min(1, dt * 10));
  if (!T.flying) { P.fly = lerp(P.fly, 0, Math.min(1, dt * 6)); P.flap = 0; }
  if (leaf) {
    const u = clamp((t - leaf.t0) / 1.0, 0, 1);
    leaf.ready = u >= 1;
    if (leaf.ready && T.air) {                                         // chỉ ăn khi đang nhảy / bay: lá nằm trong khung người titan
      const ly = leaf.alt, hw = T.h * (T.flying ? 0.3 : 0.2) + 8, top = T.lift + T.h * (T.stage ? 1.04 : 1);
      if (Math.abs(leaf.x - T.x) < hw && top >= ly - 3 && ly > T.lift - 4) eat();
    }
  }
}

/* ---------------- vẽ ---------------- */
function drawBar(t, gy) {
  const W = S.W, mid = W / 2, gap = 15;
  let segs = [[0, mid - gap], [mid + gap, W]];
  ctx.fillStyle = COL.bar;
  if (broken) {
    const L = broken.x - broken.half, R = broken.x + broken.half;
    segs = segs.flatMap(([s, e]) => [[s, Math.min(e, L)], [Math.max(s, R), e]]).filter(([s, e]) => e - s > 0.5);
    const ang = Math.min(1, (t - broken.t0) / 0.3) * 1.25;            // hai mảnh gãy gập xuống
    [[L, 1], [R, -1]].forEach(([hx, sgn]) => {
      ctx.save(); ctx.translate(hx, gy); ctx.rotate(sgn * ang);
      ctx.fillRect(sgn > 0 ? 0 : -broken.half, -1, broken.half, 2); ctx.restore();
    });
  }
  if (!wob) { segs.forEach(([s, e]) => ctx.fillRect(Math.round(s), gy - 1, Math.round(e - s), 2)); return; }
  segs.forEach(([s, e]) => {                                         // đang rung: vẽ theo từng cột 2 px
    for (let x = Math.round(s); x < e; x += 2) ctx.fillRect(x, Math.round(gy - 1 + sag(x + 1, t)), Math.min(2, e - x), 2);
  });
}
function draw(t) {
  const { dpr, W, H } = S;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const gy = ground();
  drawBar(t, gy);
  if (!(mode === 'over' && T.fall > T.h + GROUND + 40)) {
    const o = render(T.stage, T.pose, T.h, T.dir, T.wings);
    const k = T.stage === 0 ? PIX0 : PIX, x = Math.round(T.x - o.ox * k), y = Math.round(gy + 1 - T.lift + T.fall + (T.air ? 0 : sag(T.x, t)) - o.oy * k);
    ctx.drawImage(spr, x, y, spr.width * k, spr.height * k);
  }
  if (leaf) {
    const u = clamp((t - leaf.t0) / 1.0, 0, 1), e = 1 - (1 - u) ** 3;
    const lx = lerp(leaf.x0, leaf.x, e), ly = gy - lerp(0, leaf.alt, e) + (leaf.ready ? Math.sin(t * 3) * 2 : 0);
    ctx.globalAlpha = Math.floor(t * 6) % 2 ? 1 : 0.35;                // chớp nháy
    ctx.drawImage(leafSpr, Math.round(lx - leafSpr.width), Math.round(ly - leafSpr.height), leafSpr.width * PIX, leafSpr.height * PIX);
    ctx.globalAlpha = 1;
  }
  if (T.charge !== null) drawMeter(t, gy);
  if (mode === 'over') {
    ctx.fillStyle = COL.red; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 20px "Pixelify Sans", VT323, monospace';
    ctx.fillText('Too Heavy. Game Over!', W / 2, gy - 52);
  }
}

/* thang đo lấy đà: các ô vuông màu đặt cạnh nhau trên đầu titan; ô xanh dương = phần để cất cánh (khi có cánh) */
function drawMeter(t, gy) {
  const held = t - T.charge, nj = METER.jump, nf = T.wings ? METER.fly : 0, n = nj + nf;
  const fillJ = Math.ceil(clamp(held / CHARGE_T, 0, 1) * nj), fillF = nf ? Math.floor(clamp((held - CHARGE_T) / FLY_T, 0, 1) * nf) : 0;
  const { sq, gap } = METER, w = n * (sq + gap) - gap, x0 = Math.round(T.x - w / 2), y0 = Math.round(gy - T.lift - T.h * (T.wings ? 1.25 : 1.1) - 12);
  for (let k = 0; k < n; k++) {
    const isF = k >= nj, on = isF ? k - nj < fillF : k < fillJ;
    ctx.fillStyle = isF ? COL.fly : COL.meter[Math.min(COL.meter.length - 1, Math.floor(k / nj * COL.meter.length))];
    ctx.globalAlpha = on ? 1 : 0.18;
    ctx.fillRect(x0 + k * (sq + gap), y0, sq, sq);
  }
  ctx.globalAlpha = 1;
  if (T.wings) {                                                     // có cánh, đang giữ ↑ mà chưa bay: nhắc cách bay
    ctx.font = '600 13px "Be Vietnam Pro", "Figtree", system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const msg = FLY_HINT, tw = ctx.measureText(msg).width, pad = 6;
    const right = x0 + w + 8 + tw + pad * 2 <= S.W - 4;               // cạnh phải thang đo, sát mép thì sang trái
    const bx = right ? x0 + w + 8 : x0 - 8 - tw - pad * 2, by = y0 + sq / 2 - 10;
    ctx.fillStyle = 'rgba(251,252,253,.88)'; ctx.fillRect(bx, by, tw + pad * 2, 20);
    ctx.strokeStyle = COL.fly; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, tw + pad * 2 - 1, 19);
    ctx.fillStyle = COL.fly; ctx.textAlign = 'left'; ctx.fillText(msg, bx + pad, by + 10.5);
  }
}

/* ---------------- vòng lặp ---------------- */
const io = new IntersectionObserver(es => es.forEach(e => { S.visible = e.isIntersecting; S.last = null; }), { threshold: 0 });
io.observe(canvas);
new ResizeObserver(() => { fit(); if (T.x !== null) { const [a, b] = bounds(); T.x = clamp(T.x, a, b); } }).observe(canvas);
fit(); setButton();
(function loop(now) {
  if (S.visible) {
    const t = now / 1000, dt = S.last === null ? 0 : Math.min(0.05, t - S.last); S.last = t;
    update(t, dt); draw(t);
  }
  requestAnimationFrame(loop);
})(performance.now());
})();
