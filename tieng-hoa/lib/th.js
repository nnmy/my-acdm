/* =====================================================================
   Tiếng Hoa: tiện ích dùng chung cho mọi trang của nhóm (chép từ tieng-nhat/lib/tn.js, đổi phần đọc).
   - Nhóm tình huống: <details class="grp" id="...">; mọi nhóm thu gọn khi tải trang.
     Vào trang bằng link có #id thì tự mở nhóm đó.
   - Mục lục nổi (như các trang intro-…): thu gọn khi tải trang; liệt kê các nhóm và mục con (h3.sub);
     bấm vào một mục thì mở nhóm đó và cuộn tới.
     Cuối mục lục có link trang trước / trang sau, lấy từ <nav class="pager">.
   - Nút loa (🔊) cạnh mỗi câu / từ tiếng Hoa: đọc bằng giọng tiếng Hoa của trình duyệt (Web Speech API),
     ưu tiên giọng Đài Loan (zh-TW), không có thì dùng giọng zh khác; tự ẩn nếu máy không có giọng tiếng Hoa.
   ===================================================================== */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const groups = () => $$('details.grp');

/* ---------- mở nhóm theo #hash ---------- */
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
  const el = document.getElementById(id); if (!el) return;
  const d = el.closest('details.grp') || (el.matches('details.grp') ? el : null);
  if (d) { d.open = true; requestAnimationFrame(() => d.scrollIntoView({ block: 'start' })); }
}

/* ---------- mục lục nổi ---------- */
function floatingToc() {
  const gs = groups(); if (!gs.length) return;
  const nav = document.createElement('nav'); nav.className = 'ftoc'; nav.setAttribute('aria-label', 'Mục lục trang');
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ftoc-btn'; btn.setAttribute('aria-controls', 'ftocPanel');
  const panel = document.createElement('div'); panel.className = 'ftoc-panel'; panel.id = 'ftocPanel';
  const homeA = document.createElement('a'); homeA.className = 'ftoc-home'; homeA.href = 'index.html'; homeA.textContent = 'Trang chủ Tiếng Hoa';
  const ol = document.createElement('ol'), links = [];
  gs.forEach(d => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + d.id; a.textContent = $('summary .t', d).textContent.trim();
    a.addEventListener('click', () => { d.open = true; });
    li.appendChild(a); ol.appendChild(li); links.push([d, a]);
    const subs = $$('h3.sub', d);
    if (subs.length) {
      const sub = document.createElement('ol');
      subs.forEach((h, i) => {
        if (!h.id) h.id = d.id + '-' + (i + 1);
        const l2 = document.createElement('li'), a2 = document.createElement('a');
        a2.href = '#' + h.id; a2.textContent = h.textContent.trim();
        a2.addEventListener('click', () => { d.open = true; });
        l2.appendChild(a2); sub.appendChild(l2);
      });
      li.appendChild(sub);
    }
  });
  panel.append(homeA, ol);
  const pg = $$('main .pager a[href]');
  if (pg.length) {
    const box = document.createElement('div'); box.className = 'ftoc-pager';
    pg.forEach(p => {
      const next = p.classList.contains('next'), a = document.createElement('a');
      a.href = p.getAttribute('href'); a.className = next ? 'next' : 'prev';
      a.innerHTML = '<small>' + (next ? 'Trang sau →' : '← Trang trước') + '</small>';
      a.appendChild(document.createTextNode(($('b', p) || p).textContent.trim())); box.appendChild(a);
    });
    panel.appendChild(box);
  }
  nav.append(btn, panel); document.body.appendChild(nav);
  const ICON_MIN = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2.2"/></svg>';
  const ICON_MAX = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h8" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
  let open = false;   // luôn thu gọn khi tải trang
  const setOpen = v => {
    open = v; nav.classList.toggle('open', v); btn.setAttribute('aria-expanded', v);
    btn.innerHTML = v ? ICON_MIN + '<span>Thu gọn</span>' : ICON_MAX + '<span>Mục lục</span>';
    btn.title = v ? 'Thu gọn mục lục' : 'Mở mục lục';
  };
  btn.addEventListener('click', () => setOpen(!open));
  setOpen(false);
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(([d, a]) => a.classList.toggle('active', d === e.target));
  }), { rootMargin: '-35% 0px -60% 0px' });
  links.forEach(([d]) => io.observe(d));
}

/* ---------- đọc tiếng Hoa ---------- */
function speech() {
  if (!('speechSynthesis' in window)) return;
  let voice = null;
  const pick = () => {
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^zh[-_](TW|Hant)/i.test(v.lang)) || vs.find(v => /^zh(-|_|$)/i.test(v.lang)) || null;
    document.body.classList.toggle('tn-tts', !!voice);
  };
  pick(); speechSynthesis.addEventListener?.('voiceschanged', pick);
  document.addEventListener('click', e => {
    const b = e.target.closest('.say'); if (!b || !voice) return;
    const box = b.closest('.ph, .vw, td'); if (!box) return;
    const el = box.querySelector('[lang|="zh"]'); if (!el) return;
    const text = el.textContent.replace(/[＿_]+/g, '').trim();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = voice.lang || 'zh-TW'; u.voice = voice; u.rate = 0.9;
    speechSynthesis.speak(u);
  });
}

const go = () => { floatingToc(); openFromHash(); speech(); };
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
addEventListener('hashchange', openFromHash);
})();
