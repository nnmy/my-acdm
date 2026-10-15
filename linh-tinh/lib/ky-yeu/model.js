/* =====================================================================
   Mô hình dữ liệu + định dạng nội dung thẻ (dùng chung cho xem trước, PDF, PNG, DOCX).

   state = {
     version: 2,
     labs:    [{ id, names: [{ lang, text }], units: [{ lang, text }], desc }]      (tiếng Anh là tên chính)
     people:  [{ id, nameNative, nameEn, birth: { type: 'full'|'year'|'none', value, raw }, hometown,
                 photo: { id, w, h, x, y } | null, contacts: [{ type: 'email'|'phone'|'address'|'custom', label, value }],
                 workplace: { text, year }, note, hidden, photoFile }],
     members: [{ id, labId, personId, yearIn, yearOut, roleIn, roleInText, roleOut, roleOutText, research }],
     settings: { currentLab, exportLab, export: {...} }
   }
   yearOut rỗng = vẫn đang ở lab. Một người có thể có nhiều bản ghi members (nhiều lab).
   Vai trò: mã trong lib/terms/*.js (roles) hoặc 'other' + chữ tự do (roleInText/roleOutText).
   ===================================================================== */
(() => {
  'use strict';
  const ROLES = ['prof', 'assoc_prof', 'lecturer', 'researcher', 'postdoc', 'phd', 'master', 'undergrad', 'staff', 'visiting', 'other'];
  const CONTACTS = ['email', 'phone', 'address', 'custom'];
  const LANGS = [['en', 'English'], ['vi', 'Tiếng Việt'], ['ja', '日本語'], ['zh', '中文'], ['ko', '한국어'], ['other', 'Khác']];
  const PAPERS = { A4: [210, 297], A5: [148, 210], B5: [182, 257], Letter: [215.9, 279.4] };
  const YEAR = new Date().getFullYear();

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function defaultExport() {
    return {
      lang: 'vi', layout: 'directory', cols: 2, mosaicCols: 4, showPhoto: true,
      paper: 'A4', orient: 'portrait', margin: 15, fontSize: 9.5, lineHeight: 1.35,
      labelMode: 'icon', border: 0.35, borderColor: '#1B1920', photoSize: null,
      cover: true, header: null, footer: null, yearFrom: null, yearTo: null, _v2: true,
      fields: {
        nameNative: true, birth: false, hometown: true, period: true, role: true, research: false, workplace: false,
        email: false, phone: false, address: false, custom: false, note: false,
      },
    };
  }
  function emptyState() {
    return { version: 2, labs: [], people: [], members: [], settings: { currentLab: null, exportLab: null, export: defaultExport() } };
  }

  /* Đọc ngày sinh gõ tự do: 1995 | 1995-08-21 | 1995/8/21 | 21/08/1995 | 21-8-1995 | 21.8.1995. */
  function parseBirthInput(s) {
    s = String(s || '').trim();
    if (!s) return { type: 'none', value: '', raw: '' };
    const ok = (y, m, d) => {
      const dt = new Date(Date.UTC(y, m - 1, d));
      return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 1900 && y <= YEAR;
    };
    const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let m;
    if ((m = s.match(/^(\d{4})$/))) { const y = +m[1]; return y >= 1900 && y <= YEAR ? { type: 'year', value: m[1], raw: s } : null; }
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) { const [y, mo, d] = [+m[1], +m[2], +m[3]]; return ok(y, mo, d) ? { type: 'full', value: iso(y, mo, d), raw: s } : null; }
    if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) { const [d, mo, y] = [+m[1], +m[2], +m[3]]; return ok(y, mo, d) ? { type: 'full', value: iso(y, mo, d), raw: s } : null; }
    return null;
  }

  function normalize(s) {
    const st = Object.assign(emptyState(), s || {});
    st.labs = (st.labs || []).map(l => Object.assign({ id: uid(), names: [], units: [], desc: '' }, l));
    st.people = (st.people || []).map(p0 => {
      const p = Object.assign({
        id: uid(), nameNative: '', nameEn: '', birth: { type: 'none', value: '', raw: '' }, hometown: '', photo: null,
        contacts: [], workplace: { text: '', year: '' }, note: '', hidden: false,
      }, p0);
      // chuyển dữ liệu bản cũ: loại liên lạc cũ -> "custom"; địa chỉ -> liên lạc "Chỗ ở"; gia đình -> ghi chú
      const OLD = { line: 'LINE', instagram: 'Instagram', facebook: 'Facebook', zalo: 'Zalo', wechat: 'WeChat', kakao: 'KakaoTalk', x: 'X', website: 'Website', other: '' };
      p.contacts = (p.contacts || []).map(c => (CONTACTS.includes(c.type) ? Object.assign({ label: '' }, c) : { type: 'custom', label: c.label || OLD[c.type] || c.type, value: c.value }));
      if (p.address) { p.contacts.push({ type: 'address', label: '', value: p.address }); delete p.address; }
      if (p.family) { p.note = [p.note, p.family].filter(Boolean).join('\n'); delete p.family; }
      delete p.code;
      if (p.birth && !p.birth.raw && p.birth.value) p.birth.raw = p.birth.value;
      return p;
    });
    st.members = (st.members || []).map(m => Object.assign({
      id: uid(), labId: '', personId: '', yearIn: '', yearOut: '', roleIn: '', roleInText: '', roleOut: '', roleOutText: '', research: '',
    }, m));
    st.version = 2;
    st.settings = Object.assign({ currentLab: null, exportLab: null }, st.settings || {});
    const ex = Object.assign(defaultExport(), st.settings.export || {});
    if (st.settings.export && !st.settings.export._v2) {     // bản 1: header/footer rỗng nghĩa là "mặc định"
      if (!ex.header) ex.header = null;
      if (!ex.footer) ex.footer = null;
      ex._v2 = true;
    }
    ex.fields = Object.assign(defaultExport().fields, ex.fields || {});
    if (ex.fields.contacts) {            // bản cũ: fields.contacts = { email: true, ... }
      ex.fields.email = !!ex.fields.contacts.email;
      ex.fields.phone = !!ex.fields.contacts.phone;
      delete ex.fields.contacts;
    }
    if (typeof ex.fields.birth === 'string') ex.fields.birth = ex.fields.birth !== 'hide';
    st.settings.export = ex;
    return st;
  }

  const pick = (arr, lang) => {
    const list = (arr || []).filter(x => x && x.text && x.text.trim());
    if (!list.length) return '';
    return (list.find(x => x.lang === lang) || list.find(x => x.lang === 'en') || list[0]).text.trim();
  };
  const labName = (lab, lang = 'en') => pick(lab && lab.names, lang);
  const unitName = (lab, lang = 'en') => pick(lab && lab.units, lang);
  const otherNames = (lab, lang) => {
    const main = labName(lab, lang);
    return (lab.names || []).map(x => (x.text || '').trim()).filter(t => t && t !== main);
  };

  /* Vai trò: chữ <-> mã. Chữ khớp tên vai trò (vi hoặc en, không phân biệt hoa thường, dấu) thì lưu mã. */
  const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  function roleFromText(text) {
    const s = strip(text);
    if (!s) return { code: '', text: '' };
    for (const code of ROLES) {
      if (code === 'other') continue;
      for (const T of Object.values(window.KY_TERMS)) if (strip(T.roles[code]) === s || s === code) return { code, text: '' };
    }
    return { code: 'other', text: String(text).trim() };
  }
  function roleText(code, custom, T) {
    if (!code) return '';
    if (code === 'other') return (custom || '').trim();
    return T.roles[code] || code;
  }
  function roleSuggestions() {
    const out = new Set();
    for (const T of Object.values(window.KY_TERMS)) ROLES.filter(r => r !== 'other').forEach(r => out.add(T.roles[r]));
    return [...out];
  }

  function names(p, showNative) {
    const n = (p.nameNative || '').trim(), e = (p.nameEn || '').trim();
    const main = e || n;
    return { main, sub: showNative && n && n !== main ? n : '' };
  }

  function yearBounds(st, labId) {
    const ms = st.members.filter(m => m.labId === labId);
    const ins = ms.map(m => parseInt(m.yearIn, 10)).filter(Boolean);
    const outs = ms.map(m => (m.yearOut ? parseInt(m.yearOut, 10) : YEAR)).filter(Boolean);
    if (!ins.length) return [YEAR - 3, YEAR];
    return [Math.min(...ins), Math.max(YEAR, ...outs)];
  }

  /* Thành viên của lab, lọc theo khoảng năm (có giao nhau), sắp theo năm vào rồi tên. */
  function membersOf(st, labId, ex) {
    const people = new Map(st.people.map(p => [p.id, p]));
    const [b0, b1] = yearBounds(st, labId);
    const from = ex.yearFrom || b0, to = ex.yearTo || b1;
    const list = st.members.filter(m => m.labId === labId).map(m => ({ m, p: people.get(m.personId) }))
      .filter(x => x.p && !x.p.hidden)
      .filter(x => {
        const a = parseInt(x.m.yearIn, 10) || b0, b = x.m.yearOut ? parseInt(x.m.yearOut, 10) : YEAR;
        return a <= to && b >= from;
      });
    const yi = x => parseInt(x.m.yearIn, 10) || 9999;
    const nm = x => (x.p.nameEn || x.p.nameNative || '').toLocaleLowerCase();
    return list.sort((a, b) => yi(a) - yi(b) || nm(a).localeCompare(nm(b)));
  }

  /* Nội dung một thẻ: { main, sub, lines: [{ key, k, v, plain }] }.
     - Thời gian và vai trò gộp một dòng không nhãn (key 'period'): "2018 – 2023: Học viên thạc sĩ → Nghiên cứu sinh".
     - key dùng để chọn biểu tượng thay cho nhãn chữ (labelMode 'icon'); liên lạc tùy chỉnh luôn giữ nhãn (LINE, Zalo…).
     - compact (lưới ảnh): bỏ nhãn của các mục hiển nhiên (plain). */
  function card(p, m, ex, T, compact) {
    const F = ex.fields, L = T.labels, out = [];
    const nm = names(p, F.nameNative);
    const add = (key, k, v, plain) => { if (v && String(v).trim()) out.push({ key, k, v: String(v).trim(), plain: !!plain }); };
    const a = F.role ? roleText(m.roleIn, m.roleInText, T) : '', b = F.role ? roleText(m.roleOut, m.roleOutText, T) : '';
    const roles = a && b && a !== b ? `${a} → ${b}` : (a || b);
    const period = F.period && (m.yearIn || m.yearOut) ? `${m.yearIn || '?'} – ${m.yearOut || L.present}` : '';
    if (period || roles) out.push({ key: 'period', k: '', v: [period, roles].filter(Boolean).join(': '), plain: true });
    if (F.birth && p.birth && p.birth.type !== 'none') add('birth', L.born, p.birth.raw || p.birth.value, true);
    if (F.hometown) add('hometown', L.hometown, p.hometown, true);
    if (F.research) add('research', L.research, m.research);
    if (F.workplace && p.workplace && p.workplace.text) add('workplace', L.workplace, p.workplace.text + (p.workplace.year ? ` (${L.since} ${p.workplace.year})` : ''));
    for (const c of p.contacts || []) {
      if (!c.value || !F[c.type]) continue;
      add(c.type, c.type === 'custom' ? (c.label || T.contacts.custom) : T.contacts[c.type], c.value);
    }
    if (F.note) add('note', L.note, p.note);
    if (compact) out.forEach(x => { if (x.plain) x.k = ''; });
    return { main: nm.main, sub: nm.sub, lines: out };
  }

  function yearRange(st, labId, T, ex) {
    const [b0, b1] = yearBounds(st, labId);
    if (!st.members.some(m => m.labId === labId)) return '';
    const from = (ex && ex.yearFrom) || b0, to = (ex && ex.yearTo) || b1;
    return `${from} – ${to >= YEAR ? T.labels.present : to}`;
  }

  /* Header/footer: chấp nhận HTML. Bỏ thẻ, thuộc tính nguy hiểm; thay biến bằng giá trị đã escape. */
  const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fillHtml(tpl, vars) {
    const tmp = document.createElement('template');
    tmp.innerHTML = String(tpl || '');
    tmp.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,img,video,audio,svg').forEach(e => e.remove());
    tmp.content.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => {
      if (/^on/i.test(a.name) || /javascript:/i.test(a.value) || a.name === 'src' || a.name === 'href') e.removeAttribute(a.name);
    }));
    return tmp.innerHTML.replace(/\{(\w+)\}/g, (all, k) => (k in vars ? escH(vars[k]) : all));
  }

  window.KModel = {
    ROLES, CONTACTS, LANGS, PAPERS, YEAR,
    uid, emptyState, normalize, defaultExport, parseBirthInput, labName, unitName, otherNames,
    roleFromText, roleText, roleSuggestions, names, yearBounds, membersOf, card, yearRange, fillHtml, strip,
  };
})();
