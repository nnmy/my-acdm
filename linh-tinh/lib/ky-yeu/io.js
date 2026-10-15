/* =====================================================================
   Sao lưu / khôi phục (.zip), file mẫu bảng tính (.xlsx), nhập từ bảng tính, xử lý ảnh.
   Mọi thao tác chạy trong trình duyệt; file chỉ được tạo ra để người dùng tải về máy.
   ===================================================================== */
(() => {
  'use strict';
  const M = () => window.KModel;
  const enc = new TextEncoder();

  /* ---------- ảnh ---------- */
  async function processPhoto(file, maxSide = 1200) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await createImageBitmap(file); }
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
    return { blob, w, h };
  }

  /* ---------- sao lưu ---------- */
  async function backup(state) {
    const files = [{ name: 'data.json', data: JSON.stringify({ app: 'ky-yeu', version: 1, exported: new Date().toISOString(), state }, null, 1) }];
    for (const p of state.people) {
      if (!p.photo) continue;
      const b = await KStore.getPhoto(p.photo.id);
      if (b) files.push({ name: `photos/${p.photo.id}.jpg`, data: new Uint8Array(await b.arrayBuffer()) });
    }
    files.push({ name: 'README.txt', data: 'File sao lưu của tiện ích "Kỷ yếu lab" (my-library/ky-yeu).\n' +
      'data.json: toàn bộ dữ liệu chữ. photos/: ảnh, tên file = mã ảnh trong data.json.\n' +
      'Nạp lại: mở tiện ích, mục "Nhập và sao lưu", chọn "Nạp file sao lưu".\n' +
      'File có thông tin cá nhân của người khác: chỉ lưu ở nơi an toàn, không đưa lên mạng công khai.\n' });
    return KZip.write(files);
  }

  async function restore(buf) {
    const files = await KZip.read(buf);
    const dj = files.get('data.json');
    if (!dj) throw new Error('Không thấy data.json trong file zip.');
    const obj = JSON.parse(KZip.text(dj));
    if (obj.app !== 'ky-yeu' || !obj.state) throw new Error('File zip này không phải bản sao lưu của Kỷ yếu lab.');
    const state = M().normalize(obj.state);
    const photos = [];
    for (const [name, data] of files) {
      const m = name.match(/^photos\/(.+)\.(jpe?g|png)$/i);
      if (m) photos.push([m[1], new Blob([data], { type: /png$/i.test(name) ? 'image/png' : 'image/jpeg' })]);
    }
    return { state, photos };
  }

  /* ---------- bảng tính ---------- */
  const LAB_COLS = [
    ['name_en', 'Tên lab*', 30], ['name_vi', 'Tên lab (tiếng Việt)', 30], ['name_ja', 'Tên lab (tiếng Nhật)', 24], ['name_zh', 'Tên lab (tiếng Trung)', 24],
    ['unit_en', 'Đơn vị', 34], ['unit_vi', 'Đơn vị (tiếng Việt)', 34], ['unit_ja', 'Đơn vị (tiếng Nhật)', 24], ['unit_zh', 'Đơn vị (tiếng Trung)', 24],
    ['desc', 'Mô tả', 40],
  ];
  const MEM_COLS = [
    ['lab', 'Lab*', 26], ['nameEn', 'Họ tên tiếng Anh*', 22], ['nameNative', 'Họ tên tiếng mẹ đẻ', 22],
    ['birth', 'Ngày sinh', 13], ['hometown', 'Quê quán', 16], ['yearIn', 'Năm vào*', 9], ['yearOut', 'Năm ra', 9],
    ['roleIn', 'Vai trò khi vào', 22], ['roleOut', 'Vai trò khi ra', 22], ['research', 'Hướng nghiên cứu', 30],
    ['email', 'Email', 24], ['phone', 'Điện thoại', 15], ['address', 'Chỗ ở', 26], ['custom', 'Liên lạc khác', 22],
    ['work', 'Chỗ làm', 26], ['workYear', 'Từ năm', 9], ['note', 'Ghi chú', 30], ['photoFile', 'File ảnh', 16],
  ];
  const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  const headKey = s => strip(s).replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const fullKey = s => strip(s).replace(/[^a-z0-9()]+/g, ' ').trim();

  function template() {
    const V = window.KY_TERMS.vi, E = window.KY_TERMS.en;
    const roles = M().ROLES.filter(r => r !== 'other');
    const cat = [['Vai trò (tiếng Việt)', 'Role (English)'], ...roles.map(r => [V.roles[r], E.roles[r]])];
    const roleList = `'Danh mục'!$A$2:$A$${roles.length + 1}`;
    const ci = key => KXlsx.colName(MEM_COLS.findIndex(c => c[0] === key));
    const guide = [
      ['Kỷ yếu: mẫu nhập liệu'],
      [''],
      ['• Cột có dấu * là bắt buộc. Không đổi tên sheet và tiêu đề cột; được đổi thứ tự hoặc bỏ cột không dùng.'],
      ['• Sheet "Lab": mỗi dòng một lab hoặc lớp. Sheet "Thành viên": cột "Lab" ghi đúng một tên lab (sheet Lab hoặc lab đã có trong tiện ích).'],
      ['• Người ở nhiều lab: mỗi lab một dòng, cùng họ tên và ngày sinh.'],
      ['• Ngày sinh: 1995-08-21, 21/08/1995 hoặc chỉ năm 1995. Năm ra để trống = đang ở lab.'],
      ['• Vai trò: chọn trong danh sách hoặc gõ tự do. Liên lạc khác: ghi dạng "LINE: abc".'],
      ['• Ảnh: ghi tên file ở cột "File ảnh", rồi dùng nút "Gán ảnh" trong tiện ích.'],
      ['• Nhập lại nhiều lần: dòng trùng được cập nhật, ô trống không xóa dữ liệu cũ.'],
      [''],
      ['Ví dụ', 'Lab', 'Họ tên tiếng Anh', 'Họ tên tiếng mẹ đẻ', 'Ngày sinh', 'Quê quán', 'Năm vào', 'Năm ra', 'Vai trò khi vào', 'Vai trò khi ra'],
      ['', 'Biomedical Imaging Lab', 'An Van Nguyen', 'Nguyễn Văn An', '1995-08-21', 'Huế', 2018, 2023, 'Học viên thạc sĩ', 'Nghiên cứu sinh'],
      ['', 'Computer Vision Lab', 'An Van Nguyen', 'Nguyễn Văn An', '1995-08-21', 'Huế', 2023, '', 'Postdoctoral researcher', ''],
    ];
    const n = 500;
    return KXlsx.write([
      { name: 'Hướng dẫn', rows: guide, widths: [8, 24, 18, 18, 12, 10, 9, 9, 20, 20] },
      { name: 'Lab', rows: [LAB_COLS.map(c => c[1])], widths: LAB_COLS.map(c => c[2]), header: true },
      {
        name: 'Thành viên', rows: [MEM_COLS.map(c => c[1])], widths: MEM_COLS.map(c => c[2]), header: true,
        validations: [
          { sqref: `${ci('roleIn')}2:${ci('roleIn')}${n}`, list: roleList },
          { sqref: `${ci('roleOut')}2:${ci('roleOut')}${n}`, list: roleList },
        ],
      },
      { name: 'Danh mục', rows: cat, widths: [28, 28], header: true },
    ]);
  }

  const year = v => { const m = String(v || '').match(/\d{4}/); return m ? m[0] : ''; };
  function birthOf(v) {
    const s = String(v || '').trim();
    if (/^\d+(\.\d+)?$/.test(s) && +s > 3000) {                  // số ngày kiểu Excel
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(+s) * 86400000);
      return M().parseBirthInput(d.toISOString().slice(0, 10));
    }
    return M().parseBirthInput(s) || { type: 'none', value: '', raw: '' };
  }

  function sheetObjects(rows, cols) {
    if (!rows || !rows.length) return [];
    const full = rows[0].map(fullKey), short = rows[0].map(headKey);
    const idx = {}, used = new Set();
    cols.forEach(([key, label]) => {                 // khớp nguyên văn trước, rồi khớp bỏ phần trong ngoặc
      const i = full.indexOf(fullKey(label));
      if (i >= 0 && !used.has(i)) { idx[key] = i; used.add(i); }
    });
    cols.forEach(([key, label]) => {
      if (key in idx) return;
      const i = short.findIndex((h, j) => h === headKey(label) && !used.has(j));
      if (i >= 0) { idx[key] = i; used.add(i); }
    });
    return rows.slice(1).map(r => {
      const o = {};
      for (const [k, i] of Object.entries(idx)) o[k] = String(r[i] ?? '').trim();
      return o;
    }).filter(o => Object.values(o).some(v => v));
  }

  /* Gộp dữ liệu bảng tính vào state (thay đổi trực tiếp). Trả về thống kê. */
  async function importXlsx(buf, state) {
    const book = await KXlsx.read(buf);
    const find = name => Object.keys(book).find(k => strip(k) === strip(name));
    const labRows = sheetObjects(book[find('Lab')], LAB_COLS);
    const memRows = sheetObjects(book[find('Thành viên')], MEM_COLS);
    if (!labRows.length && !memRows.length) throw new Error('Không thấy dữ liệu trong sheet "Lab" hoặc "Thành viên". Hãy dùng file mẫu.');
    const stat = { labsNew: 0, labsUpd: 0, peopleNew: 0, peopleUpd: 0, memNew: 0, memUpd: 0, skipped: [] };
    const findLab = name => state.labs.find(l => (l.names || []).some(n => strip(n.text) === strip(name)));
    const setLang = (arr, lang, text) => {
      if (!text) return;
      const it = arr.find(x => x.lang === lang);
      if (it) it.text = text; else arr.push({ lang, text });
    };
    labRows.forEach((r, i) => {
      const key = r.name_en || r.name_vi || r.name_ja || r.name_zh;
      if (!key) { stat.skipped.push(`Lab, dòng ${i + 2}: thiếu tên`); return; }
      let lab = [r.name_en, r.name_vi, r.name_ja, r.name_zh].filter(Boolean).map(findLab).find(Boolean);
      if (lab) stat.labsUpd++;
      else { lab = { id: M().uid(), names: [], units: [], desc: '' }; state.labs.push(lab); stat.labsNew++; }
      for (const lg of ['en', 'vi', 'ja', 'zh']) { setLang(lab.names, lg, r['name_' + lg]); setLang(lab.units, lg, r['unit_' + lg]); }
      if (r.desc) lab.desc = r.desc;
    });
    const personKey = (name, birth) => strip(name) + '|' + (birth || '');
    memRows.forEach((r, i) => {
      const line = i + 2;
      const lab = r.lab && findLab(r.lab);
      if (!lab) { stat.skipped.push(`Thành viên, dòng ${line}: không thấy lab "${r.lab || ''}"`); return; }
      if (!r.nameNative && !r.nameEn) { stat.skipped.push(`Thành viên, dòng ${line}: thiếu họ tên`); return; }
      const birth = birthOf(r.birth);
      let p = state.people.find(x => [x.nameEn, x.nameNative].filter(Boolean).some(n => personKey(n, x.birth.value) === personKey(r.nameEn || r.nameNative, birth.value)));
      if (!p) { p = M().normalize({ people: [{}] }).people[0]; state.people.push(p); stat.peopleNew++; } else stat.peopleUpd++;
      const set = (k, v) => { if (v) p[k] = v; };
      set('nameEn', r.nameEn); set('nameNative', r.nameNative); set('hometown', r.hometown); set('note', r.note); set('photoFile', r.photoFile);
      if (birth.type !== 'none') p.birth = birth;
      if (r.work) p.workplace = { text: r.work, year: year(r.workYear) };
      const putC = (type, value, label = '') => {
        if (!value) return;
        const ex = p.contacts.find(c => c.type === type && (type !== 'custom' || strip(c.label) === strip(label)));
        if (ex) ex.value = value; else p.contacts.push({ type, label, value });
      };
      putC('email', r.email); putC('phone', r.phone); putC('address', r.address);
      if (r.custom) { const m = r.custom.match(/^([^:]{1,24}):\s*(.+)$/); putC('custom', m ? m[2] : r.custom, m ? m[1].trim() : ''); }
      const yIn = year(r.yearIn);
      let m = state.members.find(x => x.labId === lab.id && x.personId === p.id && (x.yearIn || '') === yIn);
      if (m) stat.memUpd++;
      else { m = M().normalize({ members: [{ labId: lab.id, personId: p.id }] }).members[0]; state.members.push(m); stat.memNew++; }
      if (yIn) m.yearIn = yIn;
      const yOut = year(r.yearOut); if (yOut) m.yearOut = yOut;
      const ri = M().roleFromText(r.roleIn); if (ri.code) { m.roleIn = ri.code; m.roleInText = ri.text; }
      const ro = M().roleFromText(r.roleOut); if (ro.code) { m.roleOut = ro.code; m.roleOutText = ro.text; }
      if (r.research) m.research = r.research;
    });
    return stat;
  }

  /* Gán ảnh theo tên file đã ghi trong cột "File ảnh". Trả về số ảnh đã gán. */
  async function matchPhotos(files, state) {
    const norm = s => strip(s).replace(/\.[a-z0-9]+$/, '');
    const map = new Map();
    for (const f of files) map.set(norm(f.name), f);
    let n = 0;
    for (const p of state.people) {
      if (!p.photoFile) continue;
      const f = map.get(norm(p.photoFile));
      if (!f) continue;
      const { blob, w, h } = await processPhoto(f);
      const id = M().uid();
      await KStore.putPhoto(id, blob);
      if (p.photo) await KStore.delPhoto(p.photo.id);
      p.photo = { id, w, h, x: 50, y: 50 };
      n++;
    }
    return n;
  }

  window.KIO = { processPhoto, backup, restore, template, importXlsx, matchPhotos, enc };
})();
