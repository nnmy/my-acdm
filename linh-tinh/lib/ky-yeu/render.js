/* =====================================================================
   Dàn trang kỷ yếu thành các trang có kích thước giấy thật (mm).
   Dùng chung cho: xem trước, In / Lưu PDF, xuất PNG. Số trang ở header/footer do code tính, nên
   PDF và PNG khớp nhau, không phụ thuộc trình duyệt có hỗ trợ lề trang (@page margin boxes) hay không.
   - Cỡ chữ, khoảng cách dòng: chỉ áp dụng cho phần nội dung (.ky-bd). Header, footer, trang bìa dùng cỡ cố định.
   - Hàng nào cao hơn vùng nội dung của trang thì ảnh trong hàng được thu nhỏ để chữ (chú thích) luôn hiện đủ.
   ===================================================================== */
(() => {
  'use strict';
  const M = () => window.KModel;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PX_PER_MM = 96 / 25.4;
  const GAP = 4;          // mm, khoảng cách giữa các thẻ / hàng
  const BAND = 8;         // mm, chiều cao tối thiểu của header, footer

  /* biểu tượng thay nhãn chữ (vẽ bằng SVG nên in và xuất PNG đều giữ nguyên) */
  const FICON = {
    birth: '<path d="M4 21h16v-8H4zM4 16c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0M12 13V9M12 6.5c-1-1-1-2.5 0-3.5 1 1 1 2.5 0 3.5z"/>',
    hometown: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    research: '<path d="M9 3h6M10 3v6L4.5 19a1.3 1.3 0 0 0 1.2 2h12.6a1.3 1.3 0 0 0 1.2-2L14 9V3M7 15h10"/>',
    workplace: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M9 7V4h6v3M3 12h18"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 6l9 7 9-7"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    address: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
    note: '<path d="M5 3h14v12l-6 6H5zM13 21v-6h6M8 8h8M8 12h5"/>',
  };
  const ficon = key => FICON[key] ? `<svg class="fi" viewBox="0 0 24 24" aria-hidden="true">${FICON[key]}</svg>` : '';

  function pageSize(ex) {
    const [w, h] = M().PAPERS[ex.paper] || M().PAPERS.A4;
    return ex.orient === 'landscape' ? [h, w] : [w, h];
  }
  function initials(p) {
    const s = (p.nameEn || p.nameNative || '?').trim().split(/\s+/);
    return (s[0][0] + (s.length > 1 ? s[s.length - 1][0] : '')).toUpperCase();
  }
  /* vị trí + độ phóng của ảnh trong khung (z = 1: vừa khít khung; z > 1: phóng quanh điểm x% y%) */
  function imgPos(ph) {
    const x = ph.x ?? 50, y = ph.y ?? 50, z = Math.max(1, Math.min(4, +ph.z || 1));
    return `object-position:${x}% ${y}%` + (z > 1 ? `;transform:scale(${z});transform-origin:${x}% ${y}%` : '');
  }
  function photoHtml(p, photoUrl, style = '') {
    const url = p.photo && photoUrl(p.photo.id);
    if (url) return `<div class="ky-ph"${style}><img src="${url}" alt="" style="${imgPos(p.photo)}"></div>`;
    return `<div class="ky-ph ky-noimg"${style}><span>${esc(initials(p))}</span></div>`;
  }
  function lineHtml(l, ex) {
    if (l.key === 'period') return `<div class="ky-ln ky-pr">${esc(l.v)}</div>`;
    if (!l.k) return `<div class="ky-ln">${esc(l.v)}</div>`;
    const useIcon = ex.labelMode === 'icon' && FICON[l.key];
    return `<div class="ky-ln">${useIcon ? ficon(l.key) : `<span class="k">${esc(l.k)}:</span> `}${esc(l.v)}</div>`;
  }
  function cardHtml(p, m, ex, T, photoUrl) {
    const c = M().card(p, m, ex, T, false);
    const horiz = ex.cols <= 2;
    const bw = Math.max(0, +ex.border || 0);
    const style = `border:${bw ? `${bw}mm solid ${ex.borderColor || '#1B1920'}` : '0'}`;
    // cỡ ảnh: % bề rộng thẻ (trống = tự động: ảnh rộng ~26 mm khi 1 thẻ/hàng, 30% khi ảnh nằm trái, 100% khi ảnh nằm trên)
    const innerW = pageSize(ex)[0] - 2 * ex.margin;
    const ps = +ex.photoSize || (ex.cols === 1 ? Math.max(10, 26 / innerW * 100) : 0);
    const phStyle = ps ? ` style="width:${Math.max(10, Math.min(horiz ? 80 : 100, ps))}%${horiz ? '' : ';align-self:center'}"` : '';
    // thẻ rộng (thường là 1 thẻ/hàng): các dòng chi tiết tự chia 2–3 cột theo bề rộng; dòng thời gian–vai trò giữ nguyên bề ngang
    const head = c.lines.filter(l => l.key === 'period'), rest = c.lines.filter(l => l.key !== 'period');
    return `<div class="ky-card${horiz ? ' h' : ''}" style="${style}">${ex.showPhoto ? photoHtml(p, photoUrl, phStyle) : ''}` +
      `<div class="ky-tx"><div class="ky-nm">${esc(c.main)}</div>${c.sub ? `<div class="ky-sub">${esc(c.sub)}</div>` : ''}` +
      head.map(l => lineHtml(l, ex)).join('') +
      (rest.length ? `<div class="ky-cols">${rest.map(l => lineHtml(l, ex)).join('')}</div>` : '') + '</div></div>';
  }
  function tileHtml(p, m, ex, T, photoUrl) {
    const c = M().card(p, m, ex, T, true);
    return `<div class="ky-tile">${photoHtml(p, photoUrl)}<div class="ky-cap"><div class="ky-nm">${esc(c.main)}</div>` +
      (c.sub ? `<div class="ky-sub">${esc(c.sub)}</div>` : '') + c.lines.map(l => lineHtml(l, ex)).join('') + '</div></div>';
  }
  function coverHtml(st, lab, ex, T, count) {
    const L = ex.lang, name = M().labName(lab, L), others = M().otherNames(lab, L);
    const units = (lab.units || []).map(u => (u.text || '').trim()).filter(Boolean);
    const unitMain = M().unitName(lab, L);
    const years = M().yearRange(st, lab.id, T, ex);
    return `<div class="ky-cover"><p class="ky-cv-sub">${esc(T.defaults.coverSub)}</p>` +
      `<h1 class="ky-cv-title">${esc(name)}</h1>` + others.map(o => `<p class="ky-cv-alt">${esc(o)}</p>`).join('') +
      `<div class="ky-cv-rule"></div>` + (unitMain ? `<p class="ky-cv-unit">${esc(unitMain)}</p>` : '') +
      units.filter(u => u !== unitMain).map(o => `<p class="ky-cv-unit alt">${esc(o)}</p>`).join('') +
      (lab.desc ? `<p class="ky-cv-desc">${esc(lab.desc)}</p>` : '') +
      `<p class="ky-cv-meta">${esc([years, `${count} ${T.labels.members}`].filter(Boolean).join(' · '))}</p></div>`;
  }

  /* Trả về { pages: [Element], size: [wmm, hmm], count }. host: phần tử để đo (sẽ bị xóa nội dung). */
  function build(st, ex, photoUrl, host) {
    const T = window.KY_TERMS[ex.lang] || window.KY_TERMS.vi;
    const lab = st.labs.find(l => l.id === ex.labId);
    if (!lab) return { pages: [], size: pageSize(ex), count: 0 };
    const [W, H] = pageSize(ex);
    const list = M().membersOf(st, lab.id, ex);
    const n = Math.max(1, ex.layout === 'mosaic' ? ex.mosaicCols : ex.cols);
    const headerTpl = ex.header || '', footerTpl = ex.footer || '';
    const hasH = !!headerTpl.trim(), hasF = !!footerTpl.trim();
    const innerW = W - 2 * ex.margin;
    const bodyStyle = el => { el.style.fontSize = ex.fontSize + 'pt'; el.style.lineHeight = String(ex.lineHeight || 1.35); };

    host.innerHTML = '';
    host.className = 'ky-measure ky-doc';
    host.style.width = innerW + 'mm';

    // header / footer (HTML tự do, có thể nhiều dòng): đo chiều cao
    const vars0 = {
      lab: M().labName(lab, ex.lang), unit: M().unitName(lab, ex.lang),
      years: M().yearRange(st, lab.id, T, ex), year: String(new Date().getFullYear()), page: '99', pages: '99',
    };
    const band = (cls, tpl) => {
      const el = document.createElement('div');
      el.className = cls;
      el.innerHTML = `<div class="in">${M().fillHtml(tpl, vars0)}</div>`;
      host.appendChild(el);
      const h = Math.max(BAND, el.getBoundingClientRect().height / PX_PER_MM + 2);
      el.remove();
      return Math.ceil(h);
    };
    const hH = hasH ? band('ky-hd', headerTpl) : 0, fH = hasF ? band('ky-ft', footerTpl) : 0;
    const bodyH = H - 2 * ex.margin - hH - fH - 4;    // 4 mm: đệm trên của vùng nội dung

    // 1) dựng các hàng, đo; hàng cao hơn trang thì thu nhỏ ảnh
    const body = document.createElement('div');
    body.className = 'ky-bd';
    bodyStyle(body);
    host.appendChild(body);
    const rows = [];
    for (let i = 0; i < list.length; i += n) {
      const row = document.createElement('div');
      row.className = 'ky-row ' + ex.layout;
      row.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
      row.innerHTML = list.slice(i, i + n).map(x => ex.layout === 'mosaic'
        ? tileHtml(x.p, x.m, ex, T, photoUrl) : cardHtml(x.p, x.m, ex, T, photoUrl)).join('');
      body.appendChild(row);
      rows.push(row);
    }
    const hOf = el => el.getBoundingClientRect().height / PX_PER_MM;
    const heights = rows.map(r => {
      let h = hOf(r);
      if (h > bodyH) {
        const phs = [...r.querySelectorAll('.ky-ph')];
        const phH = phs.length ? Math.max(...phs.map(hOf)) : 0;
        if (phH) {
          const target = Math.max(12, phH - (h - bodyH) - 1);
          phs.forEach(ph => { ph.style.height = target + 'mm'; ph.style.width = (target * 3 / 4) + 'mm'; ph.classList.add('fixed'); });
          h = hOf(r);
        }
      }
      return h;
    });

    // 2) chia trang
    const groups = [];
    let cur = [], used = 0;
    rows.forEach((r, i) => {
      const add = (cur.length ? GAP : 0) + heights[i];
      if (cur.length && used + add > bodyH + 0.5) { groups.push(cur); cur = []; used = 0; }
      used += (cur.length ? GAP : 0) + heights[i];
      cur.push(r);
    });
    if (cur.length || !groups.length) groups.push(cur);

    // 3) dựng trang
    const total = groups.length + (ex.cover ? 1 : 0);
    const vars = Object.assign({}, vars0, { pages: String(total) });
    const mk = () => {
      const pg = document.createElement('div');
      pg.className = 'ky-page ky-doc';
      pg.style.width = W + 'mm';
      pg.style.height = H + 'mm';
      pg.style.padding = ex.margin + 'mm';
      return pg;
    };
    const pages = [];
    if (ex.cover) {
      const pg = mk();
      pg.classList.add('is-cover');
      pg.innerHTML = coverHtml(st, lab, ex, T, list.length);
      pages.push(pg);
    }
    groups.forEach((g, gi) => {
      const pg = mk();
      const v = Object.assign({}, vars, { page: String(gi + 1 + (ex.cover ? 1 : 0)) });
      if (hasH) pg.insertAdjacentHTML('beforeend', `<div class="ky-hd" style="height:${hH}mm"><div class="in">${M().fillHtml(headerTpl, v)}</div></div>`);
      const bd = document.createElement('div');
      bd.className = 'ky-bd';
      bodyStyle(bd);
      bd.style.height = (bodyH + 4) + 'mm';
      g.forEach(r => bd.appendChild(r));
      pg.appendChild(bd);
      if (hasF) pg.insertAdjacentHTML('beforeend', `<div class="ky-ft" style="height:${fH}mm"><div class="in">${M().fillHtml(footerTpl, v)}</div></div>`);
      pages.push(pg);
    });
    host.innerHTML = '';
    return { pages, size: [W, H], count: list.length };
  }

  /* In: đưa các trang vào vùng in riêng, đặt khổ giấy, gọi hộp thoại In của trình duyệt. */
  function print(pages, size) {
    let box = document.getElementById('kyPrint');
    if (!box) { box = document.createElement('div'); box.id = 'kyPrint'; document.body.appendChild(box); }
    box.innerHTML = '';
    pages.forEach(p => box.appendChild(p.cloneNode(true)));
    let st = document.getElementById('kyPageStyle');
    if (!st) { st = document.createElement('style'); st.id = 'kyPageStyle'; document.head.appendChild(st); }
    st.textContent = `@page { size: ${size[0]}mm ${size[1]}mm; margin: 0; }`;
    document.body.classList.add('ky-printing');
    const done = () => { document.body.classList.remove('ky-printing'); box.innerHTML = ''; removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    setTimeout(() => window.print(), 80);
  }

  window.KRender = { build, print, pageSize };
})();
