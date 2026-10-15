/* =====================================================================
   XLSX tối giản: tạo file mẫu nhập liệu và đọc lại file người dùng đã điền.
   Chạy trong trình duyệt, dùng KZip (lib/kzip.js). Không cần thư viện ngoài.
   - KXlsx.write(sheets) -> Blob. sheets: [{ name, rows: [[...]], widths: [..], header: true, validations: [{ sqref, list }] }]
   - KXlsx.read(arrayBuffer) -> Promise<{ [sheetName]: string[][] }>
   ===================================================================== */
(() => {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const colIndex = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };

  function sheetXml(sh) {
    const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
    const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
      if (v === null || v === undefined || v === '') return '';
      const ref = colName(ci) + (ri + 1);
      const style = sh.header && ri === 0 ? ' s="1"' : (sh.wrap ? ' s="2"' : '');
      if (typeof v === 'number') return `<c r="${ref}"${style}><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('') + '</row>').join('');
    const freeze = sh.header ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
    const dv = (sh.validations || []).length
      ? `<dataValidations count="${sh.validations.length}">` + sh.validations.map(v =>
        `<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="${v.sqref}"><formula1>${esc(v.list)}</formula1></dataValidation>`).join('') + '</dataValidations>'
      : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${freeze}${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
  }

  function write(sheets) {
    const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
    const wbrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF6FA"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const files = [
      { name: '[Content_Types].xml', data: ct },
      { name: '_rels/.rels', data: rels },
      { name: 'xl/workbook.xml', data: wb },
      { name: 'xl/_rels/workbook.xml.rels', data: wbrels },
      { name: 'xl/styles.xml', data: styles },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
    ];
    return KZip.write(files, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  function textOf(el) {   // <is>/<si>: nối mọi <t> (kể cả rich text)
    return [...el.getElementsByTagNameNS(NS, 't')].map(t => t.textContent).join('');
  }

  async function read(buf) {
    const files = await KZip.read(buf);
    const xml = name => {
      const b = files.get(name);
      return b ? new DOMParser().parseFromString(KZip.text(b), 'application/xml') : null;
    };
    const wb = xml('xl/workbook.xml');
    if (!wb) throw new Error('Không phải file .xlsx.');
    const rels = xml('xl/_rels/workbook.xml.rels');
    const target = {};
    for (const r of rels.getElementsByTagName('Relationship')) target[r.getAttribute('Id')] = r.getAttribute('Target');
    const ssDoc = xml('xl/sharedStrings.xml');
    const shared = ssDoc ? [...ssDoc.getElementsByTagNameNS(NS, 'si')].map(textOf) : [];
    const out = {};
    for (const s of wb.getElementsByTagNameNS(NS, 'sheet')) {
      const rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id');
      let t = target[rid] || '';
      t = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
      const doc = xml(t);
      if (!doc) continue;
      const rows = [];
      for (const row of doc.getElementsByTagNameNS(NS, 'row')) {
        const ri = parseInt(row.getAttribute('r'), 10) - 1;
        const arr = rows[ri] = rows[ri] || [];
        for (const c of row.getElementsByTagNameNS(NS, 'c')) {
          const ci = colIndex(c.getAttribute('r') || colName(arr.length));
          const type = c.getAttribute('t');
          const v = c.getElementsByTagNameNS(NS, 'v')[0];
          let val = '';
          if (type === 's') val = shared[parseInt(v ? v.textContent : '0', 10)] || '';
          else if (type === 'inlineStr') { const is = c.getElementsByTagNameNS(NS, 'is')[0]; val = is ? textOf(is) : ''; }
          else if (type === 'b') val = v && v.textContent === '1' ? 'TRUE' : 'FALSE';
          else val = v ? v.textContent : '';
          arr[ci] = val;
        }
      }
      out[s.getAttribute('name')] = Array.from(rows, r => Array.from(r || [], x => (x === undefined ? '' : String(x))));
    }
    return out;
  }

  window.KXlsx = { write, read, colName };
})();
