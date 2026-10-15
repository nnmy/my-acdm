/* =====================================================================
   Kỷ yếu: giao diện và điều khiển.
   Trạng thái S (xem model.js) tự lưu vào IndexedDB sau mỗi thay đổi; ảnh lưu riêng (store.js).
   ===================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = window.KModel, TV = window.KY_TERMS.vi;
  const YEAR = M.YEAR, YMIN = YEAR - 20;   // thanh trượt năm: mặc định 20 năm gần nhất (gõ năm cũ hơn thì tự mở rộng)

  /* ---------------- icon ---------------- */
  const ICON = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    image: '<rect x="3" y="5" width="18" height="14"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
    sheet: '<rect x="4" y="3" width="16" height="18"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 5-7 8-7s7 2 8 7"/>',
    cards: '<rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M6 7.5h3M12 7h6M12 9h4M6 16.5h3M12 16h6M12 18h4"/>',
    grid: '<rect x="3" y="3" width="7" height="8"/><rect x="14" y="3" width="7" height="8"/><path d="M3 15h7M14 15h7M3 19h5M14 19h5"/>',
    portrait: '<rect x="6" y="3" width="12" height="18" rx="1"/>',
    landscape: '<rect x="3" y="6" width="18" height="12" rx="1"/>',
    tag: '<rect x="4" y="5" width="16" height="12" rx="1"/><path d="M4 6l8 6 8-6"/>',
    text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5"/>',
  };
  const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;
  function applyIcons(root = document) {
    $$('[data-icon]', root).forEach(el => {
      if (el.querySelector(':scope > svg')) return;
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
    });
  }
  let S = M.emptyState();
  const urls = new Map();
  const photoUrl = id => urls.get(id) || null;
  /* ảnh trong khung 3:4: x, y = vị trí (%), z = độ phóng (1 = vừa khít khung, tối đa ZMAX) */
  const ZMAX = 4;
  const zOf = ph => Math.max(1, Math.min(ZMAX, +(ph && ph.z) || 1));
  const imgPos = ph => `object-position:${ph.x ?? 50}% ${ph.y ?? 50}%` +
    (zOf(ph) > 1 ? `;transform:scale(${zOf(ph)});transform-origin:${ph.x ?? 50}% ${ph.y ?? 50}%` : '');

  /* ---------------- lưu ---------------- */
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => KStore.putState(JSON.parse(JSON.stringify(S))).catch(e => toast('Không lưu được: ' + e.message)), 250);
  }
  async function loadPhotoUrls() {
    for (const u of urls.values()) URL.revokeObjectURL(u);
    urls.clear();
    for (const p of S.people) {
      if (!p.photo) continue;
      const b = await KStore.getPhoto(p.photo.id);
      if (b) urls.set(p.photo.id, URL.createObjectURL(b));
    }
  }

  /* ---------------- tiện ích ---------------- */
  let toastT;
  function toast(msg, ms = 3200) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }
  function download(blob, name) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const slug = s => String(s || 'ky-yeu').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'ky-yeu';
  const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const labLabel = l => M.labName(l, 'en') || '(chưa có tên)';
  const personLabel = p => p.nameEn || p.nameNative || '(chưa có tên)';
  const curLab = () => S.labs.find(l => l.id === S.settings.currentLab) || null;
  const yearOf = v => { const m = String(v || '').match(/^\s*(\d{4})\s*$/); return m ? m[1] : ''; };
  const periodText = m => `${m.yearIn || '?'} – ${m.yearOut || 'nay'}`;

  /* thanh trượt hai đầu + hai ô số. opts: { min, max, from, to, isNow, now (có ô "nay"), onChange } */
  function dualRange(box, opts) {
    box.innerHTML = `<div class="yr"><input class="inp num lo" inputmode="numeric" aria-label="Từ năm"><div class="dual"><div class="track"><div class="fill"></div></div>` +
      `<input type="range" class="r-lo" aria-label="Từ năm"><input type="range" class="r-hi" aria-label="Đến năm"></div><input class="inp num hi" inputmode="numeric" aria-label="Đến năm">` +
      (opts.now ? '<label class="chk"><input type="checkbox" class="now"> nay</label>' : '') + '</div>';
    const rl = $('.r-lo', box), rh = $('.r-hi', box), nl = $('.lo', box), nh = $('.hi', box), fill = $('.fill', box), now = $('.now', box);
    let min = opts.min, max = opts.max;
    const st = { from: opts.from, to: opts.to, now: !!opts.isNow };
    const paint = () => {
      for (const r of [rl, rh]) { r.min = min; r.max = max; }
      rl.value = st.from; rh.value = st.now ? max : st.to;
      nl.value = st.from; nh.value = st.now ? '' : st.to;
      nh.placeholder = st.now ? 'nay' : '';
      nh.disabled = rh.disabled = st.now;
      if (now) now.checked = st.now;
      const span = Math.max(1, max - min);
      fill.style.left = ((st.from - min) / span * 100) + '%';
      fill.style.right = ((max - (st.now ? max : st.to)) / span * 100) + '%';
    };
    const get = () => ({ from: st.from, to: st.now ? null : st.to, now: st.now });
    const emit = () => { paint(); if (opts.onChange) opts.onChange(get()); };
    rl.addEventListener('input', () => { st.from = Math.min(+rl.value, st.now ? max : st.to); emit(); });
    rh.addEventListener('input', () => { st.to = Math.max(+rh.value, st.from); emit(); });
    nl.addEventListener('change', () => { const y = +yearOf(nl.value); if (y) { st.from = y; if (y < min) min = y; if (!st.now && st.to < y) st.to = y; } emit(); });
    nh.addEventListener('change', () => { const y = +yearOf(nh.value); if (y) { st.to = y; if (y > max) max = y; if (st.from > y) st.from = y; } emit(); });
    if (now) now.addEventListener('change', () => { st.now = now.checked; if (!st.now) st.to = Math.min(max, YEAR); emit(); });
    paint();
    return { get };
  }

  /* ---------------- tabs ---------------- */
  function showTab(name) {
    $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    ['data', 'export', 'io'].forEach(t => { $('#tab-' + t).hidden = t !== name; });
    if (name === 'export') { fillExport(); preview(); }
    if (name === 'io') ioStats();
  }

  /* ================= TAB 1 ================= */
  function renderLabs() {
    if (!curLab() && S.labs.length) S.settings.currentLab = S.labs[0].id;
    $('#labList').innerHTML = S.labs.map(l => {
      const n = S.members.filter(m => m.labId === l.id).length;
      return `<li><button type="button" class="lab-item" data-lab="${l.id}" aria-current="${l.id === S.settings.currentLab}">` +
        `<b>${esc(labLabel(l))}</b><small>${esc(M.unitName(l))}${M.unitName(l) ? ' · ' : ''}${n} thành viên</small></button></li>`;
    }).join('');
    renderLabDetail();
  }

  function renderLabDetail() {
    const box = $('#labDetail'), lab = curLab();
    if (!lab) { box.innerHTML = '<div class="empty">Chưa có lab nào.</div>'; return; }
    const alt = M.otherNames(lab, 'en');
    const units = (lab.units || []).map(u => u.text).filter(Boolean);
    const list = S.members.filter(m => m.labId === lab.id).map(m => ({ m, p: S.people.find(p => p.id === m.personId) })).filter(x => x.p)
      .sort((a, b) => (parseInt(a.m.yearIn, 10) || 9999) - (parseInt(b.m.yearIn, 10) || 9999));
    const role = m => {
      const a = M.roleText(m.roleIn, m.roleInText, TV), b = M.roleText(m.roleOut, m.roleOutText, TV);
      return a && b && a !== b ? `${a} → ${b}` : (a || b);
    };
    const rows = list.map(({ m, p }) => {
      const th = p.photo && photoUrl(p.photo.id)
        ? `<div class="thumb"><img src="${photoUrl(p.photo.id)}" alt="" style="${imgPos(p.photo)}"></div>`
        : `<div class="thumb ph">${esc((personLabel(p)[0] || '?').toUpperCase())}</div>`;
      const nLabs = S.members.filter(x => x.personId === p.id).length;
      return `<tr><td class="th">${th}</td><td><b>${esc(personLabel(p))}</b>${p.nameNative && p.nameNative !== personLabel(p) ? `<br><span class="muted">${esc(p.nameNative)}</span>` : ''}` +
        `${p.hidden ? '<span class="tag hid">ẩn</span>' : ''}${nLabs > 1 ? `<span class="tag">${nLabs} lab</span>` : ''}</td>` +
        `<td>${esc(m.yearIn || '?')} – ${m.yearOut ? esc(m.yearOut) : '<span class="tag cur">nay</span>'}</td>` +
        `<td>${esc(role(m))}</td><td><button class="ibtn sm ghost" type="button" data-edit="${m.id}" title="Sửa" aria-label="Sửa">${icon('edit')}</button></td></tr>`;
    }).join('');
    box.innerHTML = `<div class="lab-head"><div><h2>${esc(labLabel(lab))}` +
      `<button class="ibtn sm ghost" type="button" id="btnEditLab" title="Sửa lab" aria-label="Sửa lab">${icon('edit')}</button></h2>` +
      (alt.length ? `<div class="alt">${alt.map(esc).join(' · ')}</div>` : '') +
      (units.length ? `<div class="alt">${units.map(esc).join(' · ')}</div>` : '') +
      (lab.desc ? `<p class="hint" style="margin-top:6px">${esc(lab.desc)}</p>` : '') + '</div></div>' +
      `<div class="list-h"><h3>${list.length} thành viên</h3><button class="ibtn" type="button" id="btnNewMember" title="Thêm thành viên" aria-label="Thêm thành viên">${icon('plus')}</button></div>` +
      (list.length
        ? `<div class="tablewrap"><table class="mtable"><thead><tr><th class="th"></th><th>Họ tên</th><th>Thời gian</th><th>Vai trò</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : '');
  }

  /* ---------- hộp thoại lab ---------- */
  let editLabId = null;
  function langSelect(v) {
    return `<select class="inp sm">${M.LANGS.map(([c, n]) => `<option value="${c}"${c === v ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  }
  function addLangRow(box, lang, text, removable) {
    const r = document.createElement('div');
    r.className = 'r';
    r.innerHTML = `${langSelect(lang)}<input class="inp sm" value="${esc(text)}">` +
      (removable ? `<button class="ibtn sm danger" type="button" title="Xóa" aria-label="Xóa">${icon('x')}</button>` : '<span></span>');
    const b = r.querySelector('button');
    if (b) b.onclick = () => r.remove();
    box.appendChild(r);
  }
  const readLangRows = box => $$('.r', box).map(r => ({ lang: r.querySelector('select').value, text: r.querySelector('input').value.trim() })).filter(x => x.text);
  function openLab(id) {
    editLabId = id;
    const lab = S.labs.find(l => l.id === id) || { names: [], units: [], desc: '' };
    $('#dlgLabTitle').textContent = id ? 'Sửa lab' : 'Thêm lab';
    $('#labNames').innerHTML = ''; $('#labUnits').innerHTML = '';
    (lab.names.length ? lab.names : [{ lang: 'en', text: '' }]).forEach((x, i) => addLangRow($('#labNames'), x.lang, x.text, i > 0));
    (lab.units.length ? lab.units : [{ lang: 'en', text: '' }]).forEach((x, i) => addLangRow($('#labUnits'), x.lang, x.text, i > 0));
    $('#labDesc').value = lab.desc || '';
    $('#labDelete').hidden = !id;
    $('#dlgLab').showModal();
  }
  function saveLab() {
    const names = readLangRows($('#labNames'));
    if (!names.length) { toast('Cần tên lab.'); $('#labNames input').classList.add('bad'); return; }
    let lab = S.labs.find(l => l.id === editLabId);
    if (!lab) { lab = { id: M.uid(), names: [], units: [], desc: '' }; S.labs.push(lab); }
    Object.assign(lab, { names, units: readLangRows($('#labUnits')), desc: $('#labDesc').value.trim() });
    S.settings.currentLab = lab.id;
    $('#dlgLab').close(); save(); renderLabs();
  }
  async function deleteLab() {
    const lab = S.labs.find(l => l.id === editLabId);
    if (!lab) return;
    const pids = S.members.filter(m => m.labId === lab.id).map(m => m.personId);
    const orphans = pids.filter(pid => !S.members.some(m => m.personId === pid && m.labId !== lab.id));
    if (!confirm(`Xóa lab "${labLabel(lab)}"?` + (orphans.length ? `\n${orphans.length} người chỉ thuộc lab này cũng sẽ bị xóa.` : ''))) return;
    S.members = S.members.filter(m => m.labId !== lab.id);
    for (const pid of orphans) await deletePerson(pid, true);
    S.labs = S.labs.filter(l => l.id !== lab.id);
    S.settings.currentLab = S.labs[0] ? S.labs[0].id : null;
    $('#dlgLab').close(); save(); renderLabs();
  }
  async function deletePerson(pid, silent) {
    const p = S.people.find(x => x.id === pid);
    if (!p) return;
    if (p.photo) { await KStore.delPhoto(p.photo.id); urls.delete(p.photo.id); }
    S.people = S.people.filter(x => x.id !== pid);
    S.members = S.members.filter(m => m.personId !== pid);
    if (!silent) save();
  }

  /* ---------- hộp thoại thành viên ---------- */
  let ed = null;           // { memberId, personId, labId, photo, matchAsked }
  let yrs = null;          // thanh trượt năm
  const CT = { email: 'Email', phone: 'Điện thoại', address: 'Chỗ ở', custom: 'Tùy chỉnh' };
  function addContactRow(c = { type: 'email', label: '', value: '' }) {
    const r = document.createElement('div');
    r.innerHTML = `<select class="inp sm">${M.CONTACTS.map(t => `<option value="${t}"${t === c.type ? ' selected' : ''}>${CT[t]}</option>`).join('')}</select>` +
      `<input class="inp sm clabel" placeholder="LINE, Zalo…" value="${esc(c.label || '')}">` +
      `<input class="inp sm cval" value="${esc(c.value || '')}">` +
      `<button class="ibtn sm danger" type="button" title="Xóa" aria-label="Xóa">${icon('x')}</button>`;
    const draw = () => {
      const custom = r.querySelector('select').value === 'custom';
      r.className = 'r' + (custom ? ' custom' : '');
      r.querySelector('.clabel').hidden = !custom;
    };
    r.querySelector('select').addEventListener('change', draw);
    r.querySelector('button').onclick = () => r.remove();
    $('#pContacts').appendChild(r);
    draw();
  }
  function drawFrame() {
    $('#pFrame').innerHTML = ed.photo && ed.photo.url
      ? `<img src="${ed.photo.url}" alt="" style="${imgPos(ed.photo)}">`
      : `<div class="ph">${icon('person')}</div>`;
    $('#pPhotoDel').hidden = $('#pZoomRow').hidden = !ed.photo;
    if (ed.photo) $('#pZoom').value = zOf(ed.photo);
  }
  function fillPersonFields(p) {
    $('#pNameNative').value = p.nameNative || ''; $('#pNameEn').value = p.nameEn || '';
    $('#pBirth').value = p.birth && p.birth.type !== 'none' ? (p.birth.raw || p.birth.value) : '';
    $('#pHometown').value = p.hometown || '';
    $('#pWork').value = (p.workplace && p.workplace.text) || '';
    $('#pWorkYear').value = (p.workplace && p.workplace.year) || YEAR;
    $('#pNote').value = p.note || ''; $('#pHidden').checked = !!p.hidden;
    $('#pContacts').innerHTML = '';
    (p.contacts.length ? p.contacts : [{ type: 'email', value: '' }]).forEach(addContactRow);
    $$('#dlgPerson .bad').forEach(x => x.classList.remove('bad'));
    ed.photo = p.photo ? Object.assign({}, p.photo, { url: photoUrl(p.photo.id) }) : null;
    drawFrame();
  }
  function openPerson(memberId) {
    const m = S.members.find(x => x.id === memberId) || null;
    const p = (m && S.people.find(x => x.id === m.personId)) || M.normalize({ people: [{}] }).people[0];
    ed = { memberId: m ? m.id : null, personId: m ? p.id : null, labId: m ? m.labId : S.settings.currentLab, photo: null, matchAsked: new Set() };
    $('#dlgPersonTitle').textContent = m ? 'Sửa thành viên' : 'Thêm thành viên';
    fillPersonFields(p);
    $('#pLabName').textContent = labLabel(S.labs.find(l => l.id === ed.labId));
    const yIn = parseInt(m && m.yearIn, 10) || YEAR - 3;
    const yOut = m && m.yearOut ? parseInt(m.yearOut, 10) : YEAR;
    yrs = dualRange($('#mYears'), { min: Math.min(YMIN, yIn), max: YEAR, from: yIn, to: Math.max(yIn, yOut), isNow: !!m && !m.yearOut, now: true });
    $('#mRoleIn').value = m ? M.roleText(m.roleIn, m.roleInText, TV) : '';
    $('#mRoleOut').value = m ? M.roleText(m.roleOut, m.roleOutText, TV) : '';
    $('#mResearch').value = (m && m.research) || '';
    $('#pRemove').hidden = !m;
    $('#dlgPerson').showModal();
  }

  /* gõ tên trùng người đã có -> hỏi có thêm thẳng người đó vào lab này không */
  function checkMatch() {
    if (!ed || ed.memberId || ed.personId) return;
    const typed = [$('#pNameNative').value, $('#pNameEn').value].map(M.strip).filter(Boolean);
    if (!typed.length) return;
    const p = S.people.find(x => [x.nameNative, x.nameEn].map(M.strip).filter(Boolean).some(n => typed.includes(n)));
    if (!p || ed.matchAsked.has(p.id)) return;
    ed.matchAsked.add(p.id);
    const ms = S.members.filter(x => x.personId === p.id);
    const here = ms.find(x => x.labId === ed.labId);
    const lines = ms.map(x => `<li>${esc(labLabel(S.labs.find(l => l.id === x.labId)))} (${esc(periodText(x))})</li>`).join('');
    $('#matchBody').innerHTML = `<p><b>${esc(personLabel(p))}</b>${p.nameNative && p.nameEn ? ` · ${esc(p.nameNative)}` : ''}` +
      `${p.birth && p.birth.type !== 'none' ? ` · ${esc(p.birth.raw || p.birth.value)}` : ''} đã được nhập, thuộc:</p>` +
      `<ul class="match-list">${lines || '<li>(chưa thuộc lab nào)</li>'}</ul>` +
      `<p style="margin-top:10px">${here ? 'Người này đã có trong lab này.' : 'Thêm thẳng người này vào lab này?'}</p>`;
    const foot = $('#matchFoot');
    foot.innerHTML = '<button class="btn" type="button" data-m="other">Là người khác</button>' +
      (here ? '<button class="btn primary" type="button" data-m="open">Mở hồ sơ</button>' : '<button class="btn primary" type="button" data-m="use">Thêm vào lab này</button>');
    foot.onclick = e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      $('#dlgMatch').close();
      if (b.dataset.m === 'use') { ed.personId = p.id; fillPersonFields(p); }
      else if (b.dataset.m === 'open') { $('#dlgPerson').close(); openPerson(here.id); }
    };
    $('#dlgMatch').showModal();
  }

  async function savePerson() {
    const nameNative = $('#pNameNative').value.trim(), nameEn = $('#pNameEn').value.trim();
    if (!nameNative && !nameEn) { toast('Cần nhập họ tên.'); $('#pNameEn').classList.add('bad'); $('#pNameEn').focus(); return; }
    const birth = M.parseBirthInput($('#pBirth').value);
    if (!birth) { $('#pBirth').classList.add('bad'); toast('Ngày sinh chưa hợp lệ. Ví dụ: 21/08/1995, 1995-08-21 hoặc 1995.'); $('#pBirth').focus(); return; }
    const wy = $('#pWorkYear').value.trim();
    if (wy && !yearOf(wy)) { $('#pWorkYear').classList.add('bad'); toast('Năm cần 4 chữ số.'); return; }
    let p = S.people.find(x => x.id === ed.personId);
    if (!p) { p = M.normalize({ people: [{}] }).people[0]; S.people.push(p); }
    const work = $('#pWork').value.trim();
    Object.assign(p, {
      nameNative, nameEn, birth, hometown: $('#pHometown').value.trim(),
      workplace: { text: work, year: work ? (yearOf(wy) || '') : '' },
      contacts: $$('#pContacts .r').map(r => ({
        type: r.querySelector('select').value,
        label: r.querySelector('select').value === 'custom' ? r.querySelector('.clabel').value.trim() : '',
        value: r.querySelector('.cval').value.trim(),
      })).filter(c => c.value),
      note: $('#pNote').value.trim(), hidden: $('#pHidden').checked,
    });
    if (ed.photo && ed.photo.blob) {
      const id = M.uid();
      await KStore.putPhoto(id, ed.photo.blob);
      if (p.photo) { await KStore.delPhoto(p.photo.id); urls.delete(p.photo.id); }
      urls.set(id, ed.photo.url);
      p.photo = { id, w: ed.photo.w, h: ed.photo.h, x: ed.photo.x, y: ed.photo.y, z: zOf(ed.photo) };
    } else if (ed.photo && p.photo) {
      p.photo.x = ed.photo.x; p.photo.y = ed.photo.y; p.photo.z = zOf(ed.photo);
    } else if (!ed.photo && p.photo) {
      await KStore.delPhoto(p.photo.id); urls.delete(p.photo.id); p.photo = null;
    }
    let m = S.members.find(x => x.id === ed.memberId);
    if (!m) { m = M.normalize({ members: [{ labId: ed.labId, personId: p.id }] }).members[0]; S.members.push(m); }
    const y = yrs.get(), ri = M.roleFromText($('#mRoleIn').value), ro = M.roleFromText($('#mRoleOut').value);
    Object.assign(m, {
      yearIn: String(y.from), yearOut: y.now ? '' : String(y.to),
      roleIn: ri.code, roleInText: ri.text, roleOut: ro.code, roleOutText: ro.text,
      research: $('#mResearch').value.trim(),
    });
    $('#dlgPerson').close(); save(); renderLabs();
  }
  async function removeMember() {
    const m = S.members.find(x => x.id === ed.memberId);
    if (!m) return;
    const p = S.people.find(x => x.id === m.personId);
    const others = S.members.filter(x => x.personId === m.personId && x.id !== m.id).length;
    if (!confirm(others ? `Gỡ ${personLabel(p)} khỏi lab này?` : `Gỡ ${personLabel(p)} khỏi lab này? Hồ sơ và ảnh sẽ bị xóa vì người này không thuộc lab nào khác.`)) return;
    S.members = S.members.filter(x => x.id !== m.id);
    if (!others) await deletePerson(p.id, true);
    $('#dlgPerson').close(); save(); renderLabs();
  }
  async function pickPhoto(file) {
    try {
      const { blob, w, h } = await KIO.processPhoto(file);
      ed.photo = { blob, w, h, x: 50, y: 50, z: 1, url: URL.createObjectURL(blob) };
      drawFrame();
    } catch (e) { toast('Không đọc được ảnh này.'); }
  }
  /* khung ảnh: kéo để dời; thanh trượt, lăn chuột hoặc chụm hai ngón để phóng to */
  function bindFrameDrag() {
    const f = $('#pFrame');
    const clamp = v => Math.max(0, Math.min(100, v));
    // kích thước ảnh (đã phóng) và phần thừa so với khung, đơn vị px của khung
    const geom = ph => {
      const fw = f.clientWidth, fh = f.clientHeight, z = zOf(ph);
      const imgR = (ph.w || 3) / (ph.h || 4), cover = imgR > fw / fh;
      const W = (cover ? fh * imgR : fw) * z, H = (cover ? fh : fw / imgR) * z;
      return { fw, fh, W, H, ox: W - fw, oy: H - fh };
    };
    const paint = () => {
      const img = f.querySelector('img');
      if (!img) return;
      const ph = ed.photo, z = zOf(ph);
      img.style.objectPosition = `${ph.x}% ${ph.y}%`;
      img.style.transformOrigin = `${ph.x}% ${ph.y}%`;
      img.style.transform = z > 1 ? `scale(${z})` : '';
      $('#pZoom').value = z;
    };
    // đổi độ phóng, giữ nguyên điểm ảnh đang nằm dưới (fx, fy) trong khung
    const setZoom = (z, fx, fy) => {
      const ph = ed && ed.photo;
      if (!ph) return;
      const g0 = geom(ph);
      if (fx == null) { fx = g0.fw / 2; fy = g0.fh / 2; }
      const u = (fx + ph.x / 100 * g0.ox) / g0.W, v = (fy + ph.y / 100 * g0.oy) / g0.H;
      ph.z = Math.round(Math.max(1, Math.min(ZMAX, z)) * 100) / 100;
      const g = geom(ph);
      ph.x = g.ox > 0.5 ? clamp((u * g.W - fx) / g.ox * 100) : 50;
      ph.y = g.oy > 0.5 ? clamp((v * g.H - fy) / g.oy * 100) : 50;
      paint();
    };
    const local = (cx, cy) => { const r = f.getBoundingClientRect(); return [cx - r.left - f.clientLeft, cy - r.top - f.clientTop]; };

    const pts = new Map();
    let st = null, pinch = null;
    const restart = () => {
      const ps = [...pts.values()];
      st = pinch = null;
      if (!ed || !ed.photo || !ps.length) return;
      if (ps.length === 1) st = { x: ps[0].x, y: ps[0].y, px: ed.photo.x, py: ed.photo.y };
      else pinch = { d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, z: zOf(ed.photo) };
    };
    f.addEventListener('pointerdown', e => {
      if (!ed || !ed.photo) return;
      f.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      restart();
    });
    f.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !ed || !ed.photo) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const ph = ed.photo;
      if (pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        setZoom(pinch.z * d / pinch.d, ...local((a.x + b.x) / 2, (a.y + b.y) / 2));
      } else if (st) {
        const g = geom(ph);
        ph.x = g.ox > 0.5 ? clamp(st.px - (e.clientX - st.x) / g.ox * 100) : 50;
        ph.y = g.oy > 0.5 ? clamp(st.py - (e.clientY - st.y) / g.oy * 100) : 50;
        paint();
      }
    });
    const end = e => { pts.delete(e.pointerId); restart(); };
    f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end);
    f.addEventListener('wheel', e => {
      if (!ed || !ed.photo) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      setZoom(zOf(ed.photo) * Math.exp(-dy * 0.0025), ...local(e.clientX, e.clientY));
    }, { passive: false });
    f.addEventListener('dblclick', () => { if (ed && ed.photo) setZoom(1); });
    $('#pZoom').addEventListener('input', e => setZoom(+e.target.value));
  }

  /* ================= TAB 2: XUẤT ================= */
  const EX = () => S.settings.export;
  function exLabId() {
    return S.settings.exportLab && S.labs.some(l => l.id === S.settings.exportLab) ? S.settings.exportLab : (curLab() || {}).id;
  }
  function exportOpts() {
    const ex = JSON.parse(JSON.stringify(EX()));
    ex.labId = exLabId();
    const T = window.KY_TERMS[ex.lang] || TV;
    ex.header = ex.header == null ? T.defaults.header : ex.header;
    ex.footer = ex.footer == null ? T.defaults.footer : ex.footer;
    if (ex.labId) {
      const [b0, b1] = M.yearBounds(S, ex.labId);
      ex.yearFrom = Math.max(b0, Math.min(b1, ex.yearFrom || b0));
      ex.yearTo = Math.max(ex.yearFrom, Math.min(b1, ex.yearTo || b1));
    }
    ex.cols = Math.max(1, Math.min(20, parseInt(ex.cols, 10) || 2));
    ex.mosaicCols = Math.max(1, Math.min(20, parseInt(ex.mosaicCols, 10) || 4));
    ex.lineHeight = Math.max(1, Math.min(2.5, +ex.lineHeight || 1.35));
    ex.border = Math.max(0, Math.min(3, ex.border === '' || ex.border == null || isNaN(+ex.border) ? 0.35 : +ex.border));
    ex.margin = Math.max(3, Math.min(40, +ex.margin || 15));
    ex.fontSize = Math.max(5, Math.min(18, +ex.fontSize || 9.5));
    return ex;
  }
  const FIELDS = [['nameNative', 'Tên gốc'], ['birth', 'Ngày sinh'], ['hometown', 'Quê quán'], ['period', 'Năm vào – ra'], ['role', 'Vai trò'],
    ['research', 'Hướng nghiên cứu'], ['workplace', 'Chỗ làm'], ['email', 'Email'], ['phone', 'Điện thoại'], ['address', 'Chỗ ở'],
    ['custom', 'Liên lạc khác'], ['note', 'Ghi chú']];
  function fillExport() {
    const ex = EX(), o = exportOpts();
    $('#exLab').innerHTML = S.labs.map(l => `<option value="${l.id}">${esc(labLabel(l))}</option>`).join('');
    $('#exLab').value = o.labId || '';
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === ex.lang)));
    $('#exCover').checked = ex.cover;
    $$('[data-layout]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === ex.layout)));
    $$('[data-orient]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.orient === ex.orient)));
    $$('[data-labelmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.labelmode === (ex.labelMode || 'icon'))));
    $('#exCols').value = ex.layout === 'mosaic' ? o.mosaicCols : o.cols;
    $('#exPhotoRow').hidden = $('#exBorderRow').hidden = ex.layout === 'mosaic';
    $('#exBorder').value = o.border; $('#exBorderColor').value = ex.borderColor || '#1B1920';
    $('#exFont').value = o.fontSize; $('#exLine').value = o.lineHeight; $('#exPhoto').checked = ex.showPhoto;
    $('#exPhotoSize').value = ex.photoSize || ''; $('#exPhotoSize').disabled = !ex.showPhoto;
    $('#exPaper').value = ex.paper; $('#exMargin').value = o.margin;
    $('#exHeader').value = o.header; $('#exFooter').value = o.footer;
    $('#exFields').innerHTML = FIELDS.map(([k, label]) => `<label class="chk"><input type="checkbox" data-f="${k}"${ex.fields[k] ? ' checked' : ''}> ${label}</label>`).join('');
    if (o.labId) {
      const [b0, b1] = M.yearBounds(S, o.labId);
      dualRange($('#exYears'), { min: b0, max: b1, from: o.yearFrom, to: o.yearTo,
        onChange: v => { EX().yearFrom = v.from; EX().yearTo = v.to; summaries(); save(); preview(); } });
    } else $('#exYears').innerHTML = '';
    summaries();
  }
  /* dòng tóm tắt hiện cạnh tiêu đề mỗi nhóm khi nhóm đang thu gọn */
  function summaries() {
    const ex = EX(), o = exportOpts(), lab = S.labs.find(l => l.id === o.labId);
    $('#svContent').textContent = lab ? `${labLabel(lab)} · ${o.yearFrom}–${o.yearTo}` : '';
    $('#svLayout').textContent = `${ex.layout === 'mosaic' ? 'Lưới ảnh' : 'Danh bạ'} · ${ex.layout === 'mosaic' ? o.mosaicCols : o.cols}/hàng · ${o.fontSize} pt`;
    $('#svPaper').textContent = `${ex.paper} ${ex.orient === 'landscape' ? 'ngang' : 'dọc'} · lề ${o.margin} mm`;
    const on = FIELDS.filter(([k]) => ex.fields[k]).map(([, l]) => l);
    $('#svFields').textContent = on.length ? on.join(', ') : 'chỉ tên';
  }
  function readExport(e) {
    const ex = EX(), t = e && e.target;
    if (t && t.closest('#exYears')) return;
    if (t && t.id === 'exLab') { S.settings.exportLab = t.value; ex.yearFrom = ex.yearTo = null; save(); fillExport(); return; }
    Object.assign(ex, {
      cover: $('#exCover').checked, fontSize: +$('#exFont').value || 9.5, showPhoto: $('#exPhoto').checked,
      lineHeight: +$('#exLine').value || 1.35, border: $('#exBorder').value === '' ? 0 : +$('#exBorder').value,
      borderColor: $('#exBorderColor').value,
      photoSize: parseInt($('#exPhotoSize').value, 10) ? Math.max(10, Math.min(100, parseInt($('#exPhotoSize').value, 10))) : null,
      paper: $('#exPaper').value, margin: +$('#exMargin').value || 15,
      header: $('#exHeader').value, footer: $('#exFooter').value,
    });
    const nc = Math.max(1, Math.min(20, parseInt($('#exCols').value, 10) || 0));
    if (nc) { if (ex.layout === 'mosaic') ex.mosaicCols = nc; else ex.cols = nc; }
    $$('#exFields [data-f]').forEach(el => { ex.fields[el.dataset.f] = el.checked; });
    $('#exPhotoSize').disabled = !ex.showPhoto;
    summaries();
    save();
  }
  function exClick(e) {
    const b = e.target.closest('[data-lang],[data-layout],[data-orient],[data-labelmode]');
    if (!b) return;
    if (b.closest('summary')) e.preventDefault();        // nút EN/VI nằm trên tiêu đề nhóm: không đóng/mở nhóm
    const ex = EX();
    if (b.dataset.lang) {
      const oldT = window.KY_TERMS[ex.lang];
      if (ex.header === oldT.defaults.header) ex.header = null;     // đang dùng mặc định -> đổi theo ngôn ngữ
      if (ex.footer === oldT.defaults.footer) ex.footer = null;
      ex.lang = b.dataset.lang;
    }
    if (b.dataset.layout) ex.layout = b.dataset.layout;
    if (b.dataset.orient) ex.orient = b.dataset.orient;
    if (b.dataset.labelmode) ex.labelMode = b.dataset.labelmode;
    save(); fillExport(); preview();
  }
  let pvT = null;
  function build() {
    const ex = exportOpts();
    if (!ex.labId) return null;
    let host = $('#kyMeasure');
    if (!host) { host = document.createElement('div'); host.id = 'kyMeasure'; document.body.appendChild(host); }
    return Object.assign(KRender.build(S, ex, photoUrl, host), { ex });
  }
  function preview() {
    clearTimeout(pvT);
    pvT = setTimeout(async () => {
      await document.fonts.ready;                 // đo chữ sau khi font đã tải, tránh chia trang sai
      const pv = $('#preview');
      const b = build();
      if (!b || !b.pages.length) { pv.innerHTML = '<div class="empty">Chưa có lab để xuất.</div>'; $('#pvStatus').textContent = ''; return; }
      pv.innerHTML = '';
      const pxW = b.size[0] * 96 / 25.4;
      const z = Math.min(1, (pv.clientWidth - 40) / pxW);
      b.pages.forEach(p => { p.style.zoom = z; pv.appendChild(p); });
      $('#pvStatus').textContent = `${b.count} thành viên · ${b.pages.length} trang`;
    }, 120);
  }
  function fileBase() {
    const ex = exportOpts(), lab = S.labs.find(l => l.id === ex.labId);
    return `ky-yeu-${slug(M.labName(lab, ex.lang))}-${stamp()}`;
  }
  async function doPrint() {
    await document.fonts.ready;
    const b = build();
    if (!b || !b.pages.length) return;
    const t = document.title;
    document.title = fileBase();
    KRender.print(b.pages, b.size);
    const back = () => { document.title = t; removeEventListener('afterprint', back); };
    addEventListener('afterprint', back);
  }
  async function doPng() {
    await document.fonts.ready;
    const b = build();
    if (!b || !b.pages.length) return;
    const btn = $('#btnPng');
    btn.disabled = true;
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-20000px;top:0';
    document.body.appendChild(holder);
    try {
      b.pages.forEach(p => holder.appendChild(p));
      await document.fonts.ready;
      await Promise.all($$('img', holder).map(i => i.decode().catch(() => 0)));
      let fontCSS = '';
      try { fontCSS = await htmlToImage.getFontEmbedCSS(holder); } catch (e) { fontCSS = ''; }
      const files = [], base = fileBase();
      for (let i = 0; i < b.pages.length; i++) {
        toast(`Đang tạo ảnh trang ${i + 1}/${b.pages.length}…`, 60000);
        const blob = await htmlToImage.toBlob(b.pages[i], { pixelRatio: 2, backgroundColor: '#ffffff', fontEmbedCSS: fontCSS });
        files.push({ name: `${base}-trang-${String(i + 1).padStart(2, '0')}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (files.length === 1) {                    // một trang: tải thẳng file PNG, không nén
        download(new Blob([files[0].data], { type: 'image/png' }), base + '.png');
        toast('Đã tạo ảnh PNG.');
      } else {
        download(KZip.write(files), base + '-png.zip');
        toast(`Đã tạo ${files.length} ảnh PNG.`);
      }
    } catch (e) {
      console.error(e);
      toast('Không tạo được ảnh PNG: ' + (e.message || e));
    } finally {
      holder.remove();
      btn.disabled = false;
      preview();
    }
  }
  async function doDocx() {
    const ex = exportOpts();
    if (!ex.labId) return;
    try { download(await KDocx.make(S, ex, id => KStore.getPhoto(id)), fileBase() + '.docx'); }
    catch (e) { console.error(e); toast('Không tạo được DOCX: ' + e.message); }
  }

  /* ================= TAB 3 ================= */
  function ioStats() {
    const ph = S.people.filter(p => p.photo).length;
    const orphans = S.people.filter(p => !S.members.some(m => m.personId === p.id)).length;
    $('#ioStats').innerHTML = `${S.labs.length} lab · ${S.people.length} người · ${ph} ảnh` +
      (orphans ? `<br>${orphans} người không thuộc lab nào <button class="ibtn sm danger" type="button" id="btnOrphans" title="Xóa những người này" aria-label="Xóa những người này">${icon('x')}</button>` : '');
  }
  async function doBackup() {
    try { download(await KIO.backup(S), `ky-yeu-sao-luu-${stamp()}.zip`); }
    catch (e) { toast('Không tạo được file sao lưu: ' + e.message); }
  }
  async function doRestore(file) {
    try {
      const { state, photos } = await KIO.restore(await file.arrayBuffer());
      if (!confirm(`Khôi phục ${state.labs.length} lab, ${state.people.length} người, ${photos.length} ảnh?\nDữ liệu hiện có trên máy này sẽ bị thay thế.`)) return;
      await KStore.clearAll();
      for (const [id, blob] of photos) await KStore.putPhoto(id, blob);
      S = state;
      await KStore.putState(S);
      await loadPhotoUrls();
      renderLabs(); ioStats();
      toast('Đã khôi phục.');
    } catch (e) { toast(e.message || String(e), 6000); }
  }
  async function doImport(file) {
    try {
      const st = await KIO.importXlsx(await file.arrayBuffer(), S);
      if (!curLab() && S.labs.length) S.settings.currentLab = S.labs[0].id;
      save(); renderLabs(); ioStats();
      $('#importReport').innerHTML = `<p class="hint" style="margin-top:10px">Lab: ${st.labsNew} mới, ${st.labsUpd} cập nhật · Người: ${st.peopleNew} mới, ${st.peopleUpd} cập nhật.` +
        (st.skipped.length ? `<br>Bỏ qua ${st.skipped.length} dòng:<br>${st.skipped.slice(0, 10).map(esc).join('<br>')}${st.skipped.length > 10 ? '<br>…' : ''}` : '') + '</p>';
    } catch (e) { toast(e.message || String(e), 6000); }
  }
  async function doPhotos(files) {
    const n = await KIO.matchPhotos([...files], S);
    await loadPhotoUrls();
    save(); renderLabs(); ioStats();
    const want = S.people.filter(p => p.photoFile && !p.photo).length;
    toast(`Đã gán ${n} ảnh.${want ? ` ${want} người chưa khớp ảnh.` : ''}`, 5000);
  }
  async function doWipe() {
    if (!confirm('Xóa toàn bộ lab, thành viên và ảnh trên máy này? Không thể hoàn tác.')) return;
    await KStore.clearAll();
    S = M.emptyState();
    await loadPhotoUrls();
    renderLabs(); ioStats();
    toast('Đã xóa.');
  }

  /* ================= gắn sự kiện ================= */
  function bind() {
    applyIcons();
    $('#roleList').innerHTML = M.roleSuggestions().map(r => `<option value="${esc(r)}">`).join('');
    $$('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#btnAddLab').onclick = () => openLab(null);
    $('#labList').addEventListener('click', e => {
      const b = e.target.closest('[data-lab]');
      if (b) { S.settings.currentLab = b.dataset.lab; save(); renderLabs(); }
    });
    $('#labDetail').addEventListener('click', e => {
      if (e.target.closest('#btnEditLab')) openLab(S.settings.currentLab);
      else if (e.target.closest('#btnNewMember')) openPerson(null);
      else { const b = e.target.closest('[data-edit]'); if (b) openPerson(b.dataset.edit); }
    });
    $('#labAddName').onclick = () => addLangRow($('#labNames'), 'vi', '', true);
    $('#labAddUnit').onclick = () => addLangRow($('#labUnits'), 'vi', '', true);
    $('#labSave').onclick = saveLab;
    $('#labDelete').onclick = deleteLab;
    ['#pNameNative', '#pNameEn'].forEach(s => $(s).addEventListener('change', checkMatch));
    $('#dlgPerson').addEventListener('input', e => { if (e.target.classList) e.target.classList.remove('bad'); });
    $('#pBirth').addEventListener('change', () => $('#pBirth').classList.toggle('bad', !M.parseBirthInput($('#pBirth').value)));
    $('#pAddContact').onclick = () => addContactRow();
    $('#pPhotoPick').onclick = () => $('#filePhoto').click();
    $('#filePhoto').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) pickPhoto(f); };
    $('#pPhotoDel').onclick = () => { ed.photo = null; drawFrame(); };
    $('#pSave').onclick = savePerson;
    $('#pRemove').onclick = removeMember;
    bindFrameDrag();
    $('#expOpts').addEventListener('input', e => { readExport(e); preview(); });
    $('#expOpts').addEventListener('change', e => { readExport(e); preview(); });
    $('#expOpts').addEventListener('click', exClick);
    addEventListener('resize', () => { if (!$('#tab-export').hidden) preview(); });
    $('#btnPrint').onclick = doPrint;
    $('#btnPng').onclick = doPng;
    $('#btnDocx').onclick = doDocx;
    $('#btnBackup').onclick = doBackup;
    $('#btnRestore').onclick = () => $('#fileRestore').click();
    $('#fileRestore').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) doRestore(f); };
    $('#btnTemplate').onclick = () => download(KIO.template(), 'ky-yeu-mau.xlsx');
    $('#btnImport').onclick = () => $('#fileXlsx').click();
    $('#fileXlsx').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) doImport(f); };
    $('#btnPhotos').onclick = () => $('#filePhotos').click();
    $('#filePhotos').onchange = e => { const fs = e.target.files; if (fs && fs.length) doPhotos(fs).finally(() => { e.target.value = ''; }); };
    $('#btnWipe').onclick = doWipe;
    $('#tab-io').addEventListener('click', async e => {
      if (!e.target.closest('#btnOrphans')) return;
      for (const p of S.people.filter(x => !S.members.some(m => m.personId === x.id))) await deletePerson(p.id, true);
      save(); ioStats();
    });
  }

  async function init() {
    bind();
    try {
      S = M.normalize((await KStore.getState()) || null);
      await loadPhotoUrls();
    } catch (e) {
      toast('Trình duyệt không cho lưu dữ liệu (IndexedDB). Hãy tắt chế độ ẩn danh hoặc dùng trình duyệt khác.', 8000);
    }
    renderLabs();
  }
  init();
})();
