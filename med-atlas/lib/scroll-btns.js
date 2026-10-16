/* =====================================================================
   Nút cuộn tới đầu / cuối trình xem (↑ ↓), nằm trong bảng điều khiển của mỗi trình xem,
   cạnh dòng "Phóng to" (trang MRI người khoẻ: dòng "Cuộn trang"). Chạy trên cả máy tính và điện thoại.
   Markup:  <span class="vscroll" role="group" aria-label="Cuộn trang">
              <button class="btn" type="button" data-vscroll="top">…</button>
              <button class="btn" type="button" data-vscroll="end">…</button></span>
   Nghe click chung trên document, nên dùng được cả cho trình xem tạo sau (lib/compare.js).
     ↑ (top): đưa đầu trình xem (kể cả hàng nút chọn ảnh ngay trên nó) lên sát dưới thanh điều hướng.
     ↓ (end): đưa cuối trình xem ra giữa màn hình: nửa trên là trình xem, nửa dưới là nội dung thường.
   "Cuối trình xem": .viewer -> mép dưới của nó; trình xem bệnh .dz -> mép trên phần chữ .dz-info.
   Dùng ở: 1-brain-mri.html, 1b-brain-disease.html, 2-chest-xray.html.
   ===================================================================== */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const absTop = el => el.getBoundingClientRect().top + scrollY;
  const navH = () => { const n = document.querySelector('nav.site-nav'); return n ? n.getBoundingClientRect().height : 0; };

  function startOf(viewer) {
    // hàng nút chọn ảnh/ca (.vw-tabs) nằm ngay phía trên trình xem: tính luôn vào phần đầu
    let el = viewer, prev = viewer.previousElementSibling;
    if (!prev && viewer.parentElement) prev = viewer.parentElement.previousElementSibling;   // trình xem bệnh nằm trong #dzHost
    if (prev && prev.matches('.vw-tabs') && !prev.hidden && absTop(viewer) - (absTop(prev) + prev.offsetHeight) < 80) el = prev;
    return absTop(el);
  }
  function endOf(viewer) {
    const info = viewer.matches('.dz') && viewer.querySelector('.dz-info');
    return info ? absTop(info) : absTop(viewer) + viewer.offsetHeight;
  }
  function go(btn) {
    const viewer = btn.closest('.viewer, .dz');
    if (!viewer) return;
    const y = btn.dataset.vscroll === 'top' ? startOf(viewer) - navH() - 8 : endOf(viewer) - innerHeight / 2;
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTo({ top: Math.max(0, Math.min(max, Math.round(y))), behavior: reduce.matches ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-vscroll]');
    if (b) { e.preventDefault(); go(b); }
  });
})();
