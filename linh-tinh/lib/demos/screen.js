/* =====================================================================
   Linh tinh: minh họa "Màn hình, mắt và giấc ngủ" (id: screen, trang man-hinh.html)
   Bố cục: trên cùng 3 ô màu (mỏi mắt, kém tập trung, khó ngủ); giữa: màn hình vẽ + sóng ánh sáng
   + mắt + não; dưới: bảng điều khiển (trên điện thoại: trôi nổi ở đáy, thu gọn được).
   LOẠI MÀN HÌNH: đoán từ mẫu máy (detectPanel). ÁNH SÁNG PHÒNG: đọc cảm biến nếu trình duyệt cho phép
   (detectLight); không đọc được thì đoán theo giờ hiện tại (guessRoom) và hiện ô chọn để đổi.
   ĐỘ SÁNG MÀN HÌNH: trình duyệt không cho trang web đọc độ sáng thật của máy, nên mặc định 30%.
   NHẤP NHÁY: mặc định 2 lần/giây (dưới 3 lần/giây nên nhấp nháy thật ngay, an toàn).
   NHẤP NHÁY THẬT trên màn hình vẽ, với 3 vùng:
   - dưới 3 lần/giây: an toàn (WCAG 2.3.1), hiện ngay;
   - từ 3 lần/giây tới giới hạn màn hình (≈ tần số quét / 2): có thể gây co giật ở người động kinh
     nhạy cảm ánh sáng -> hiện cảnh báo, CHỈ nhấp nháy khi người xem bấm xác nhận;
   - cao hơn giới hạn màn hình: không hiển thị được -> hiện độ sáng trung bình + thông báo nhỏ.
   Người dùng bật "giảm chuyển động" trong hệ điều hành: không bao giờ nhấp nháy thật.
   MÔ HÌNH (đơn giản hóa): điện thoại 6,5 inch cách mắt 30 cm, buổi tối.
   - Ánh sáng màn hình tới mắt E = L × Ω; melanopic EDI = E × 0,85 + ánh sáng phòng × 0,5.
   - Ngưỡng buổi tối 10 lux melanopic (Brown et al. 2022). Nhấp nháy thấy được theo IEEE 1789-2015.
   - Tín hiệu tới vùng thị giác bắt nhịp nhấp nháy tới FOLLOW_LO, nhạt dần, đều hẳn từ FOLLOW_HI (Williams et al. 2004).
   - Tín hiệu tới đồng hồ sinh học chỉ theo ánh sáng trung bình: ipRGC phản ứng chậm (Do & Yau 2010).
   - Mỏi mắt, kém tập trung: thang định tính cộng điểm từ các yếu tố có bằng chứng.
   ===================================================================== */
(() => {
const { COLORS: C, range, watchCanvas, loopWhenVisible, REDUCED, num } = LT;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const OMEGA = 0.0106 / (0.30 * 0.30), LMAX = 500, APL = 0.85;     // điện thoại 6,5", 30 cm; nội dung sáng
const ROOM = { bright: 150, dim: 5 };                              // lux tại mắt, đèn phòng buổi tối
const DIM_LUX = 30;                                                // cảm biến: dưới mức này coi là phòng tối
// đoán ánh sáng phòng theo giờ: 6–21 giờ thường bật đèn sáng; từ 21 giờ tới 6 giờ sáng đèn thường mờ / tắt
const DAY_FROM = 6, NIGHT_FROM = 21;
const guessRoom = (h = new Date().getHours()) => (h >= DAY_FROM && h < NIGHT_FROM ? 'bright' : 'dim');
const SAFE_HZ = 3, FOLLOW_LO = 90, FOLLOW_HI = 160;
function zoneOf(f, mod) {           // IEEE 1789-2015: 0 không ảnh hưởng, 1 thấp, 2 có thể khó chịu, 3 thấy được
  if (!f || mod < 0.5) return 0;
  const noel = f < 90 ? 0.01 * f : f <= 3000 ? 0.0333 * f : 100, low = f < 90 ? 0.025 * f : f <= 1250 ? 0.08 * f : 100;
  return mod <= noel ? 0 : mod <= low ? 1 : f < 90 ? 3 : 2;
}
const follow = f => !f ? 0 : f <= FOLLOW_LO ? 1 : f >= FOLLOW_HI ? 0 : 1 - Math.log(f / FOLLOW_LO) / Math.log(FOLLOW_HI / FOLLOW_LO);
const LV = s => (s <= 1 ? ['Thấp', 'lo'] : s <= 2.5 ? ['Vừa', 'mid'] : ['Cao', 'hi']);
const WARN = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M8 1.5 15 14H1z" fill="#f2c230" stroke="#1B1920" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6v4" stroke="#1B1920" stroke-width="1.6"/><circle cx="8" cy="12" r=".9" fill="#1B1920"/></svg>';

/* ---------- đoán loại màn hình từ mẫu máy ---------- */
async function detectPanel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) {                 // iPhone X trở đi (trừ XR, 11, SE): OLED, dpr 3 và cạnh dài ≥ 812
    const h = Math.max(screen.width, screen.height), dpr = window.devicePixelRatio || 1;
    return { type: dpr >= 3 && h >= 812 ? 'oled' : 'lcd', name: 'iPhone' };
  }
  let model = '';
  try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) model = (await navigator.userAgentData.getHighEntropyValues(['model'])).model || ''; } catch (e) {}
  if (!model) { const m = ua.match(/Android [^;)]*; ([^;)]+?)(?: Build[^;)]*)?\)/); if (m) model = m[1].trim(); }
  if (/^Pixel \d/i.test(model)) return { type: 'oled', name: 'Pixel' };
  if (/^SM-(S9|N9|F7|F9|G9|A[357]\d)/i.test(model)) return { type: 'oled', name: 'Galaxy' };
  return null;
}
/* ---------- cảm biến ánh sáng (đa số trình duyệt chưa cho phép) ---------- */
function detectLight(onLux, onFail) {
  let got = false, done = false;
  const ok = v => { if (!isFinite(v)) return; got = true; onLux(v); };
  const fail = () => { if (!got && !done) { done = true; onFail(); } };
  let tried = false;
  if ('AmbientLightSensor' in window) {
    try { const s = new AmbientLightSensor({ frequency: 1 }); s.addEventListener('reading', () => ok(s.illuminance)); s.addEventListener('error', fail); s.start(); tried = true; } catch (e) {}
  }
  if ('ondevicelight' in window) { window.addEventListener('devicelight', e => ok(e.value)); tried = true; }
  if (!tried) { setTimeout(fail, 0); return; }   // chạy sau khi minh họa khởi tạo xong
  setTimeout(fail, 2000);
}

LT.demo('screen', {
  html: `<div class="sc-tiles">
      <div class="sc-tile" id="kEye" title="Mức mỏi mắt ước lượng"><span>Mỏi mắt</span><b></b></div>
      <div class="sc-tile" id="kFoc" title="Mức khó giữ tập trung ước lượng"><span>Kém tập trung</span><b></b></div>
      <div class="sc-tile" id="kSl" title="Ánh sáng tới mắt tính theo tác động lên đồng hồ sinh học (lux melanopic). Khuyến nghị buổi tối: ≤ 10 lux."><span>Khó ngủ</span><b></b></div>
    </div>
    <div class="stagebox sc-stage">
      <canvas id="scMain" class="ar tall" role="img" aria-label="Màn hình phát sáng, sóng ánh sáng, tia sáng tới mắt, rồi tới vùng thị giác và đồng hồ sinh học."></canvas>
      <div class="sc-warn" id="scWarn" hidden>${WARN}<div><b>Nhấp nháy 3–30 lần/giây có thể gây co giật</b> ở người động kinh nhạy cảm ánh sáng.
        <div class="btnrow" style="margin-top:6px"><button class="btn" type="button" id="scAllow">Tôi hiểu, cho xem nhấp nháy thật</button></div></div></div>
      <div class="sc-note" id="scNote" hidden></div>
    </div>
    <div class="sc-ctrl" id="scCtrl" role="group" aria-label="Tùy chỉnh">
      <div class="sc-head">
        <button class="sc-chip" type="button" id="scTypeChip" hidden title="Đoán từ mẫu máy của bạn. Bấm để chọn khác."></button>
        <select id="scType" aria-label="Loại màn hình" hidden><option value="lcd" selected>LCD</option><option value="oled">OLED</option></select>
        <button class="sc-chip" type="button" id="scRoomChip" hidden title="Đọc từ cảm biến ánh sáng. Bấm để chọn khác."></button>
        <select id="scRoom" aria-label="Ánh sáng xung quanh" hidden><option value="bright">Phòng sáng</option><option value="dim" selected>Phòng tối</option></select>
        <span class="sc-sum" id="scSum" aria-hidden="true"></span>
        <button class="sc-min" type="button" id="scMin" aria-controls="scSliders"></button>
      </div>
      <div class="sc-sliders" id="scSliders">
        <div class="ctrl"><label for="scB">Độ sáng</label><output for="scB"></output><input type="range" id="scB" min="5" max="100" step="1" value="30"></div>
        <div class="ctrl"><label for="scF">Nhấp nháy</label><output for="scF"></output><input type="range" id="scF" min="-0.3" max="3.6" step="0.01" value="0.3"></div>
        <div class="ctrl"><label for="scT">Nhìn liên tục</label><output for="scT"></output><input type="range" id="scT" min="5" max="180" step="5" value="20"></div>
      </div>
    </div>`,
  init(root) {
    const $ = id => document.getElementById(id);
    // cuộn tới mép trên của minh họa ngay khi tải (nếu người xem chưa tự cuộn / không mở bằng #liên-kết)
    if (!location.hash && window.scrollY < 40) {
      const jump = () => root.scrollIntoView({ block: 'start', behavior: 'instant' });
      jump(); let y = window.scrollY;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (Math.abs(window.scrollY - y) < 2) { jump(); y = window.scrollY; } });
    }
    const showB = v => Math.round(v * 100) + '%', showF = v => v.toLocaleString('vi-VN') + ' lần/giây';
    const showT = v => (v >= 60 ? (v / 60).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' giờ' : v + ' phút');
    const bR = range('scB', { map: v => v / 100, show: showB, onInput: upd });
    const fR = range('scF', { map: v => { const f = 10 ** v; return f < 10 ? Math.round(f * 10) / 10 : Math.round(f); }, show: showF, onInput: upd });
    const tR = range('scT', { show: showT, onInput: upd });
    let allow = false, S = null, refresh = 60, frames = [], phase = 0, lux = null;
    $('scAllow').addEventListener('click', () => { allow = true; upd(); });
    // ---------- loại màn hình, ánh sáng phòng ----------
    const typeSel = $('scType'), roomSel = $('scRoom'), typeChip = $('scTypeChip'), roomChip = $('scRoomChip');
    typeSel.addEventListener('change', upd); roomSel.addEventListener('change', upd);
    roomSel.value = guessRoom();                         // tạm dùng giờ hiện tại trong lúc chờ cảm biến
    roomSel.title = 'Đoán theo giờ hiện tại. Bạn có thể chọn lại.';
    const manual = (chip, sel) => { chip.hidden = true; sel.hidden = false; sel.focus(); upd(); };
    typeChip.addEventListener('click', () => manual(typeChip, typeSel));
    roomChip.addEventListener('click', () => { lux = null; manual(roomChip, roomSel); });
    detectPanel().then(p => {
      if (!p) { typeSel.hidden = false; return; }
      typeSel.value = p.type; typeChip.textContent = `${p.name}: ${p.type.toUpperCase()}`; typeChip.hidden = false; upd();
    }).catch(() => { typeSel.hidden = false; });
    detectLight(v => { if (roomChip.hidden && !roomSel.hidden) return;   // người xem đã tự chọn
      lux = clamp(v, 0.5, 5000); roomChip.hidden = false; roomSel.hidden = true;
      roomChip.textContent = (lux < DIM_LUX ? 'Phòng tối' : 'Phòng sáng') + ' · ' + Math.round(lux) + ' lux'; upd();
    }, () => { if (lux === null) { roomSel.value = guessRoom(); roomSel.hidden = false; upd(); } });
    // ---------- bảng điều khiển trôi nổi (điện thoại) ----------
    const ctrl = $('scCtrl'), minBtn = $('scMin'), KEY = 'linh-tinh-sc-min';
    const ICON_MIN = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>';
    const ICON_MAX = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 10l5-5 5 5" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>';
    const setMin = v => { ctrl.classList.toggle('min', v); minBtn.setAttribute('aria-expanded', !v); minBtn.innerHTML = v ? ICON_MAX : ICON_MIN;
      minBtn.title = v ? 'Mở tùy chỉnh' : 'Thu gọn tùy chỉnh'; minBtn.setAttribute('aria-label', minBtn.title); try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };
    let mn = false; try { mn = localStorage.getItem(KEY) === '1'; } catch (e) {}
    setMin(mn); minBtn.addEventListener('click', () => setMin(!ctrl.classList.contains('min')));
    // chỉ trôi khi minh họa đang trên màn hình; chừa chỗ ở đáy minh họa bằng chiều cao bảng
    new IntersectionObserver(es => es.forEach(e => ctrl.classList.toggle('on', e.isIntersecting)), { rootMargin: '0px 0px -90px 0px' }).observe(root);
    new ResizeObserver(() => root.style.setProperty('--sc-ctrl-h', ctrl.offsetHeight + 'px')).observe(ctrl);

    function model() {
      const oled = typeSel.value === 'oled', b = bR.get(), f = oled ? fR.get() : 0;
      const m = oled ? clamp(1.15 - b, 0.25, 1) : 0, mod = 100 * m / (2 - m), duty = clamp(0.25 + 0.7 * b, 0.1, 0.95);
      const L = 2 + (LMAX - 2) * b, Le = L * APL, Er = lux !== null ? lux : ROOM[roomSel.value];
      const M = Le * OMEGA * 0.85 + Er * 0.5, z = zoneOf(f, mod), T = tR.get();
      const eT = (T >= 120 ? 2 : T >= 60 ? 1.5 : T >= 20 ? 1 : 0) + 0.5;                 // thời gian nhìn + nhìn gần
      const ratio = Le / (Er * 0.5 / Math.PI + 1), eG = ratio > 30 ? 2 : ratio > 10 ? 1 : 0;   // chói so với xung quanh
      const eF = z === 3 ? 1.5 : z === 2 ? 0.5 : 0, eye = eT + eG + eF;
      const eyeL = LV(eye)[1];
      const fE = eyeL === 'hi' ? 1.5 : eyeL === 'mid' ? 0.75 : 0, fF = z === 3 ? 1.5 : 0, foc = fE + fF;
      const depth = m * follow(f);                       // độ sâu nhịp trong tín hiệu tới vùng thị giác
      return { oled, b, f, m, mod, duty, M, z, eye, eyeL, eT, eG, eF, foc, fE, fF, depth };
    }
    const maxShow = () => refresh / 2;
    const mode = () => !S.f ? 'steady' : S.f < SAFE_HZ ? (REDUCED ? 'reduced' : 'real') : S.f <= maxShow() ? (REDUCED ? 'reduced' : allow ? 'real' : 'warn') : 'beyond';
    function tile(id, [lab, cls]) { const t = $(id); t.className = 'sc-tile ' + cls; t.querySelector('b').textContent = lab; }
    function upd() {
      S = model();
      $('scF').disabled = !S.oled; $('scF').closest('.ctrl').classList.toggle('off', !S.oled);
      tile('kEye', LV(S.eye));
      tile('kFoc', LV(S.foc));
      tile('kSl', S.M <= 10 ? ['Thấp', 'lo'] : S.M <= 30 ? ['Vừa', 'mid'] : ['Cao', 'hi']);
      $('scSum').textContent = [showB(S.b), S.oled ? showF(S.f) : 'LCD', showT(tR.get())].join(' · ');
      const md = mode();
      $('scWarn').hidden = md !== 'warn';
      const note = $('scNote');
      if (md === 'beyond') { note.hidden = false; note.textContent = `Màn hình của bạn quét khoảng ${refresh} lần/giây nên chỉ hiện được nhấp nháy tới ~${Math.round(maxShow())} lần/giây. Đang hiện độ sáng trung bình, đúng như mắt cảm nhận.`; }
      else if (md === 'reduced') { note.hidden = false; note.textContent = 'Thiết bị đang bật "giảm chuyển động" nên không nhấp nháy thật.'; }
      else if (md === 'real' && S.f >= SAFE_HZ) { note.hidden = false; note.innerHTML = 'Đang nhấp nháy thật. <button class="btn" type="button" id="scStop" style="padding:1px 8px">Dừng</button>'; $('scStop').onclick = () => { allow = false; upd(); }; }
      else note.hidden = true;
      drawMain(performance.now() / 1000);
    }
    function level(t) { if (!S.f) return 1; return ((t * S.f) % 1) < S.duty ? 1 : 1 - S.m; }
    const avgLevel = () => (S.f ? S.duty + (1 - S.duty) * (1 - S.m) : 1);
    // ---------- vẽ ----------
    const sm = {};
    function drawMain(t) {
      const { ctx, W, H } = sm; if (!ctx || !S) return;
      ctx.clearRect(0, 0, W, H);
      const narrow = W < 520, md = mode();
      const lv = md === 'real' ? level(t) : avgLevel();
      // màn hình
      const sx = 14, sy = 14, sw = narrow ? W * 0.52 : Math.min(W * 0.4, 420), sh = sw * 0.62;
      ctx.fillStyle = '#1B1920'; ctx.fillRect(sx, sy, sw, sh);
      const bz = 7, Y0 = [24, 20, 26], Y1 = [242, 194, 48], k = Math.sqrt(lv * (0.55 + 0.45 * S.b));   // căn bậc hai: gần với độ sáng mắt cảm nhận
      ctx.fillStyle = `rgb(${Y0.map((v, i) => Math.round(v + (Y1[i] - v) * k)).join(',')})`; ctx.fillRect(sx + bz, sy + bz, sw - 2 * bz, sh - 2 * bz);
      // chữ MÀN HÌNH ở giữa; đổi màu chữ theo nền để luôn đọc được (nền tối khi nhấp nháy ở pha tắt)
      const fs = Math.round(clamp(sw * 0.1, 15, 34)), cy = sy + sh / 2 + (md === 'warn' ? -8 : 0);
      ctx.font = `700 ${fs}px "Be Vietnam Pro", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = k > 0.45 ? 'rgba(27,25,32,.78)' : 'rgba(255,255,255,.7)'; ctx.fillText('MÀN HÌNH', sx + sw / 2, cy);
      if (md === 'warn') { ctx.font = '600 12px "Be Vietnam Pro", sans-serif'; ctx.fillText('đã tạm dừng nhấp nháy', sx + sw / 2, cy + fs * 0.5 + 12); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      // sóng ánh sáng (chỉ OLED; LCD sáng đều nên ẩn sóng và chú thích)
      if (S.oled) {
      const wy = sy + sh + 12, wh = narrow ? 50 : 62, win = S.f ? clamp(4 / S.f, 0.005, 8) : 0.02;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(sx, wy, sw, wh);
      ctx.strokeStyle = C.sea; ctx.lineWidth = 1.6; ctx.beginPath();
      const n = Math.round(sw * 2);
      for (let i = 0; i <= n; i++) { const tt = i / n * win, v = S.f ? (((tt * S.f) % 1) < S.duty ? 1 : 1 - S.m) : 0.985 + 0.015 * Math.sin(tt * 2 * Math.PI * 240); const x = sx + i / n * sw, y = wy + 4 + (1 - v) * (wh - 8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      if (md === 'real' && S.f) { const x = sx + ((t % win) / win) * sw; ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy + wh); ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.font = '11px "Be Vietnam Pro", sans-serif';
      if (!narrow) ctx.fillText('ánh sáng phát ra', sx, wy + wh + 13); ctx.textAlign = 'right';
      ctx.fillText(win >= 1 ? num(win, 2) + ' giây' : Math.round(win * 1000) + ' phần nghìn giây', sx + sw, wy + wh + 13); ctx.textAlign = 'left';
      }
      // mắt
      const ex = narrow ? W * 0.8 : sx + sw + Math.min(W * 0.14, 150), ey = sy + sh / 2 + 10;
      const rays = 5;
      for (let i = 0; i < rays; i++) {
        const y0 = sy + sh * (0.2 + 0.6 * i / (rays - 1)), x0 = sx + sw;
        ctx.strokeStyle = `rgba(242,194,48,${0.15 + 0.7 * k})`; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x0 + 2, y0); ctx.lineTo(ex - 28, ey);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ex, ey, 26, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.sea; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
      ctx.font = '600 12px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Mắt', ex, narrow ? ey - 24 : ey + 32); ctx.textAlign = 'left';
      // hai nhánh và hai đích
      const bw = narrow ? W * 0.44 : Math.min(W * 0.3, 300), bh = 50;
      const A = narrow ? { x: 8, y: H - bh - 12 } : { x: W - bw - 8, y: H * 0.08 }, B = narrow ? { x: W - bw - 8, y: H - bh - 12 } : { x: W - bw - 8, y: H * 0.62 };
      const path = (P, u) => { const x0 = ex + (narrow ? 0 : 26), y0 = ey + (narrow ? 18 : 0), x1 = P.x + (narrow ? bw / 2 : 0), y1 = P.y + (narrow ? 0 : bh / 2), cx = narrow ? x1 : x0 + (x1 - x0) * 0.4, cy = narrow ? y0 + (y1 - y0) * 0.3 : y1;
        const q = 1 - u; return [q * q * x0 + 2 * q * u * cx + u * u * x1, q * q * y0 + 2 * q * u * cy + u * u * y1]; };
      [A, B].forEach(P => { ctx.strokeStyle = C.line; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 30; i++) { const [x, y] = path(P, i / 30); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
      // tín hiệu tới vùng thị giác: các chấm đi thành từng đợt theo nhịp nhấp nháy.
      // Nhấp nháy càng nhanh, các đợt càng dày; quá FOLLOW_LO thì nhịp nhạt dần, từ FOLLOW_HI đều hẳn.
      const nb = S.f ? clamp(Math.round(1.5 + 2.2 * Math.log10(S.f + 1)), 2, 7) : 4, nA = nb * 5, dp = S.depth;
      for (let i = 0; i < nA; i++) {
        const on = ((i / nA) * nb) % 1 < S.duty, [x, y] = path(A, (i / nA + phase * 0.2) % 1);
        ctx.globalAlpha = on ? 1 : 1 - 0.85 * dp; ctx.fillStyle = C.sea; ctx.beginPath(); ctx.arc(x, y, on ? 3.5 : 3.5 * (1 - 0.5 * dp), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // tín hiệu tới đồng hồ sinh học: dòng đều, chỉ theo ánh sáng trung bình (không theo nhịp nhấp nháy)
      const nd = Math.round(clamp(Math.log10(S.M + 1) * 7, 1, 20));
      for (let i = 0; i < nd; i++) { const [x, y] = path(B, (i / nd + phase * 0.15) % 1); ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
      const fit = (txt, font, size, maxW) => { let s = size; ctx.font = font.replace('#', s); while (s > 9 && ctx.measureText(txt).width > maxW) { s -= 0.5; ctx.font = font.replace('#', s); } };
      const box = (P, title, sub, fill) => { ctx.fillStyle = fill; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillRect(P.x, P.y, bw, bh); ctx.strokeRect(P.x, P.y, bw, bh);
        ctx.fillStyle = C.ink; fit(title, '700 #px "Be Vietnam Pro", sans-serif', 12.5, bw - 14); ctx.fillText(title, P.x + 8, P.y + 19);
        fit(sub, '#px "Be Vietnam Pro", sans-serif', 12, bw - 14); ctx.fillText(sub, P.x + 8, P.y + 37); };
      box(A, 'Vùng thị giác (não)', S.z === 3 ? 'thấy nhấp nháy' : dp > 0.05 ? 'không thấy, vẫn bắt nhịp' : 'thấy sáng đều', '#DCEFF8');
      box(B, 'Đồng hồ sinh học', S.M <= 10 ? 'melatonin bình thường' : S.M <= 30 ? 'melatonin bị kìm một phần' : 'melatonin bị kìm nhiều', '#FCE9A8');
      ctx.fillStyle = C.muted; ctx.font = '11px "Be Vietnam Pro", sans-serif';
      const [lx1, ly1] = path(A, narrow ? 0.62 : 0.45), [lx2, ly2] = path(B, narrow ? 0.62 : 0.45);
      { const t1 = 'dây thần kinh thị giác', w1 = ctx.measureText(t1).width; ctx.textAlign = 'left'; ctx.fillText(t1, Math.max(4, lx1 - 8 - w1), ly1 + (narrow ? 4 : -4)); }
      if (narrow) { ctx.textAlign = 'right'; ctx.fillText('tế bào nhạy sáng', lx2 - 8, ly2 + 34); } else { ctx.textAlign = 'left'; ctx.fillText('tế bào nhạy sáng', lx2 + 8, ly2 + 4); } ctx.textAlign = 'left';
    }
    watchCanvas($('scMain'), sm, () => drawMain(performance.now() / 1000));
    loopWhenVisible($('scMain'), (dt, now) => {
      if (frames.length < 60 && dt > 0) { frames.push(dt); if (frames.length === 60) { const s = [...frames].sort((a, b) => a - b); refresh = Math.round(1 / s[30]) || 60; upd(); } }
      if (!REDUCED) phase = (phase + dt * 0.5) % 1000;
      drawMain(now);
    });
    bR.upd(); fR.upd(); tR.upd(); upd();
  },
});
})();
