/* =====================================================================
   Hai việc dùng chung cho các trình xem (1-brain-mri.html, 1b-brain-disease.html, 2-chest-xray.html):

   1. Nút cuộn ↑ ↓ trong bảng điều khiển, chạy như mũi tên của thanh cuộn:
        bấm một cái  -> trang cuộn một đoạn ngắn (STEP);
        bấm giữ      -> sau HOLD_DELAY trang cuộn liên tục, nhanh dần tới SPEED_MAX, thả tay là dừng.
      Markup:  <span class="vscroll" role="group" aria-label="Cuộn trang">
                 <button class="btn" type="button" data-vscroll="up">…</button>
                 <button class="btn" type="button" data-vscroll="down">…</button></span>
      Nghe sự kiện chung trên document, nên dùng được cả cho trình xem tạo sau (lib/compare.js).

   2. Ẩn/hiện bảng điều khiển nổi trên điện thoại (.controls, .dz-ctl; lớp .away, CSS trong atlas.css
      và compare.css). Bảng hiện khi trình xem đã lên màn hình và giữ nguyên trong lúc cuộn xuống,
      tới khi đầu phần Ghim (#ghim) chạm tới bảng thì mới ẩn. Trang không có phần Ghim: ẩn khi tới
      cuối trình xem. Trình xem đang ẩn (ví dụ đang xem ca bệnh thay cho ảnh người khoẻ): bảng ẩn.
   ===================================================================== */
(() => {
  'use strict';
  const STEP = 90;            // px mỗi lần bấm
  const HOLD_DELAY = 280;     // ms giữ tay trước khi cuộn liên tục
  const SPEED_MIN = 450, SPEED_MAX = 1500, RAMP = 1200;   // px/giây; tăng tốc trong RAMP ms
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 1. nút cuộn ---------- */
  const dirOf = b => (b.dataset.vscroll === 'up' ? -1 : 1);
  let hold = null;
  function stop() {
    if (!hold) return;
    clearTimeout(hold.t); cancelAnimationFrame(hold.raf);
    hold = null;
  }
  function start(btn) {
    stop();
    const dir = dirOf(btn);
    scrollBy({ top: dir * STEP, behavior: reduce.matches ? 'auto' : 'smooth' });
    hold = { raf: 0 };
    hold.t = setTimeout(() => {
      if (!hold) return;
      const t0 = performance.now();
      let last = t0, pos = scrollY;                 // vị trí cộng dồn bằng số thực, không phụ thuộc làm tròn của trình duyệt
      const tick = now => {
        if (!hold) return;
        const k = Math.min(1, (now - t0) / RAMP), v = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * k;
        const max = document.documentElement.scrollHeight - innerHeight;
        pos = Math.max(0, Math.min(max, pos + dir * v * (now - last) / 1000));
        last = now;
        scrollTo({ top: pos, behavior: 'instant' });   // 'instant': bỏ qua scroll-behavior: smooth của html (atlas.css)
        if ((dir < 0 && pos <= 0) || (dir > 0 && pos >= max)) { stop(); return; }   // tới đầu/cuối trang
        hold.raf = requestAnimationFrame(tick);
      };
      hold.raf = requestAnimationFrame(tick);
    }, HOLD_DELAY);
  }
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-vscroll]');
    if (!b || e.button > 0) return;
    e.preventDefault();                       // không lấy focus, không chọn chữ khi giữ lâu
    // giữ con trỏ trên nút: trên máy tính bảng điều khiển trôi theo trang, nút sẽ trượt khỏi dưới con trỏ khi đang cuộn
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* trình duyệt cũ: bỏ qua */ }
    start(b);
  });
  ['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, stop));
  document.addEventListener('lostpointercapture', e => { if (e.target.closest && e.target.closest('[data-vscroll]')) stop(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-vscroll]');
    if (!b) return;
    e.preventDefault();
    if (e.detail === 0) scrollBy({ top: dirOf(b) * STEP, behavior: reduce.matches ? 'auto' : 'smooth' });   // bàn phím (Enter, Space)
  });
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-vscroll]')) e.preventDefault(); });

  /* ---------- 2. bảng điều khiển nổi ---------- */
  const shown = el => el && !el.hidden && el.getClientRects().length > 0;
  function update() {
    const ghim = document.getElementById('ghim');
    document.querySelectorAll('.controls, .dz-ctl').forEach(panel => {
      const viewer = panel.closest('.viewer, .dz');
      const stage = viewer && viewer.querySelector('.stage');
      let on = false;
      if (shown(viewer) && stage) {
        const entered = stage.getBoundingClientRect().top < innerHeight * 0.85;      // trình xem đã lên màn hình
        const after = shown(ghim) && (viewer.compareDocumentPosition(ghim) & Node.DOCUMENT_POSITION_FOLLOWING);
        const limit = after ? ghim.getBoundingClientRect().top : viewer.getBoundingClientRect().bottom;
        const panelTop = innerHeight - panel.offsetHeight - 12;                        // mép trên của bảng khi đang hiện
        on = entered && limit > panelTop;
      }
      panel.classList.toggle('away', !on);
    });
  }
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.addEventListener('click', () => setTimeout(schedule, 60), true);    // thu gọn bảng, đổi trình xem
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
  schedule();
})();
