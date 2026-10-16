/* =====================================================================
   Nút cuộn trang nổi (chỉ trên điện thoại, xem .scroll-btns trong atlas.css).
   Trên điện thoại, trình xem ảnh chiếm gần hết bề ngang và nuốt thao tác vuốt
   (kéo lát cắt, phóng to...), nên khó cuộn trang khi đang ở vùng trình xem.
   Hai nút mũi tên lên/xuống ở góc phải giúp cuộn trang; nút mờ (opacity) để
   không che ảnh, rõ hơn khi chạm.
   - Bấm: cuộn ~70% chiều cao màn hình. Giữ: cuộn liên tục.
   - Tự nâng lên phía trên bảng điều khiển nổi ở đáy (.controls / .dz-ctl).
   - Nút mờ hẳn và không bấm được khi đã ở đầu/cuối trang.
   Dùng ở: 1-brain-mri.html, 1b-brain-disease.html, 2-chest-xray.html.
   ===================================================================== */
(() => {
  'use strict';
  const SVG = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const box = document.createElement('div');
  box.className = 'scroll-btns';
  box.innerHTML =
    `<button type="button" data-dir="-1" aria-label="Cuộn lên" title="Cuộn lên">${SVG('M12 19V5M5 12l7-7 7 7')}</button>` +
    `<button type="button" data-dir="1" aria-label="Cuộn xuống" title="Cuộn xuống">${SVG('M12 5v14M5 12l7 7 7-7')}</button>`;
  document.body.appendChild(box);
  const [up, down] = box.querySelectorAll('button');
  const mq = matchMedia('(max-width: 700px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* vị trí: luôn nằm trên bảng điều khiển nổi đang hiện (nếu có) */
  const GAP = 10, BASE = 16;
  function place() {
    if (!mq.matches) return;
    let bottom = BASE;
    for (const el of document.querySelectorAll('.controls, .dz-ctl')) {
      if (el.classList.contains('away') || !el.getClientRects().length || getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.height && r.top < innerHeight) bottom = Math.max(bottom, innerHeight - r.top + GAP);
    }
    box.style.bottom = `calc(${Math.round(bottom)}px + env(safe-area-inset-bottom, 0px))`;
    const max = document.documentElement.scrollHeight - innerHeight;
    up.disabled = scrollY <= 2;
    down.disabled = scrollY >= max - 2;
  }
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  mq.addEventListener ? mq.addEventListener('change', schedule) : mq.addListener(schedule);
  // bảng điều khiển trượt ra/vào, thu gọn/mở rộng, hoặc được tạo sau (trình xem bệnh não)
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('click', () => setTimeout(schedule, 50), true);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const seen = new WeakSet();
    const watch = () => document.querySelectorAll('.controls, .dz-ctl').forEach(el => { if (!seen.has(el)) { seen.add(el); ro.observe(el); } });
    watch();
    new MutationObserver(() => { watch(); schedule(); }).observe(document.body, { childList: true, subtree: true });
  }

  /* cuộn: bấm = một bước; giữ = cuộn liên tục cho tới khi thả tay */
  const step = dir => scrollBy({ top: dir * Math.round(innerHeight * 0.7), behavior: reduce.matches ? 'auto' : 'smooth' });
  let hold = null, skipClick = false;
  function stopHold() {
    if (!hold) return;
    clearTimeout(hold.t); cancelAnimationFrame(hold.raf);
    if (hold.moved) skipClick = true;          // vừa giữ để cuộn: bỏ qua cú click đi kèm khi thả tay
    hold = null;
  }
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const dir = +b.dataset.dir;
    stopHold(); skipClick = false;
    hold = { moved: false, raf: 0 };
    hold.t = setTimeout(() => {               // giữ quá 350 ms: chuyển sang cuộn liên tục
      if (!hold) return;
      hold.moved = true;
      let last = performance.now();
      const tick = now => {
        if (!hold) return;
        const max = document.documentElement.scrollHeight - innerHeight;
        if ((dir < 0 && scrollY <= 0) || (dir > 0 && scrollY >= max - 1)) { stopHold(); return; }   // tới đầu/cuối trang
        scrollBy(0, dir * (now - last) * 1.2);  // ~1200 px/giây
        last = now;
        hold.raf = requestAnimationFrame(tick);
      };
      hold.raf = requestAnimationFrame(tick);
    }, 350);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => box.addEventListener(t, stopHold));
  ['pointerup', 'pointercancel', 'blur'].forEach(t => addEventListener(t, stopHold));   // thả tay ở chỗ khác / nút vừa bị khóa
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (skipClick) { skipClick = false; return; }
    step(+b.dataset.dir);
  });
  box.addEventListener('contextmenu', e => e.preventDefault());   // giữ lâu không bật menu

  place();
})();
