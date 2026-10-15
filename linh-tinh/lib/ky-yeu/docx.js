/* =====================================================================
   Xuất DOCX (Word) để tự do chỉnh sửa tiếp. Dựng trực tiếp XML WordprocessingML rồi đóng gói bằng KZip.
   - Khổ giấy, lề, cỡ chữ theo tùy chọn xuất.
   - Header/footer: chữ theo mẫu; {page}, {pages} thành trường số trang của Word (tự cập nhật).
   - Trang bìa (nếu chọn) không có header/footer.
   - Thành viên đặt trong bảng N cột; ảnh được cắt theo khung đã chọn (Word vẫn giữ ảnh gốc, có thể chỉnh lại).
   ===================================================================== */
(() => {
  'use strict';
  const M = () => window.KModel;
  const x = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const TW = 56.6929;            // twip / mm
  const EMU_TW = 635;            // EMU / twip
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const XMLH = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  const run = (t, o = {}) => `<w:r><w:rPr>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.u ? '<w:u w:val="single"/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}` +
    `${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  const para = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}${o.pb ? '<w:pageBreakBefore/>' : ''}` +
    `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 40}" w:line="${o.line ?? 260}" w:lineRule="auto"/>` +
    `${o.center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${runs}</w:p>`;
  const field = code => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${code} </w:instrText></w:r>` +
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';

  /* Header/footer HTML -> các đoạn Word. Hỗ trợ <br>, <p>/<div> (xuống dòng), <b>/<strong>, <i>/<em>, <u>,
     <small> (chữ nhỏ), <big>; thẻ khác chỉ giữ chữ. {page}, {pages} thành trường số trang của Word. */
  function htmlParas(tpl, vars, sz) {
    const html = M().fillHtml(tpl, Object.assign({}, vars, { page: '\u0001', pages: '\u0002' }));
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const paras = [[]];
    const walk = (node, st) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\u0001|\u0002)/);
          for (const t of parts) {
            if (!t) continue;
            if (t === '\u0001') paras[paras.length - 1].push(field('PAGE'));
            else if (t === '\u0002') paras[paras.length - 1].push(field('NUMPAGES'));
            else paras[paras.length - 1].push(run(t.replace(/\s+/g, ' '), { b: st.b, i: st.i, sz: st.sz, color: '444444', u: st.u }));
          }
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') { paras.push([]); continue; }
          const ns = Object.assign({}, st);
          if (tag === 'b' || tag === 'strong') ns.b = true;
          if (tag === 'i' || tag === 'em') ns.i = true;
          if (tag === 'u') ns.u = true;
          if (tag === 'small') ns.sz = Math.round(st.sz * 0.85);
          if (tag === 'big') ns.sz = Math.round(st.sz * 1.2);
          const block = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'li'].includes(tag);
          if (block && paras[paras.length - 1].length) paras.push([]);
          walk(n, ns);
          if (block) paras.push([]);
        }
      }
    };
    walk(doc.body.firstChild, { sz, b: false, i: false, u: false });
    const out = paras.filter(p => p.length).map(p => para(p.join(''), { center: true, after: 0 }));
    return out.length ? out.join('') : para('', { after: 0 });
  }

  function crop(ph, ratio) {
    if (!ph || !ph.w || !ph.h) return { l: 0, t: 0, r: 0, b: 0 };
    const [rw, rh] = [3, 4];
    const target = rw / rh, cur = ph.w / ph.h;
    const px = (ph.x ?? 50) / 100, py = (ph.y ?? 50) / 100;
    if (cur > target) {           // ảnh rộng hơn khung: cắt hai bên
      const f = target / cur, left = (1 - f) * px;
      return { l: Math.round(left * 1e5), r: Math.round((1 - f - left) * 1e5), t: 0, b: 0 };
    }
    const f = cur / target, top = (1 - f) * py;
    return { t: Math.round(top * 1e5), b: Math.round((1 - f - top) * 1e5), l: 0, r: 0 };
  }

  async function make(st, ex, getPhotoBlob) {
    const T = window.KY_TERMS[ex.lang] || window.KY_TERMS.vi;
    const lab = st.labs.find(l => l.id === ex.labId);
    const list = M().membersOf(st, lab.id, ex);
    const [W, H] = window.KRender.pageSize(ex);
    const pageW = Math.round(W * TW), pageH = Math.round(H * TW), mar = Math.round(ex.margin * TW);
    const textW = pageW - 2 * mar;
    const n = Math.max(1, ex.layout === 'mosaic' ? ex.mosaicCols : ex.cols);
    const cellW = Math.floor(textW / n);
    const sz = Math.round(ex.fontSize * 2);
    const LH = Math.round(240 * (+ex.lineHeight || 1.35));           // khoảng cách dòng phần nội dung
    const BLUE = '1F5F9E', GRAY = '6B7280';
    const maxImgH = pageH - 2 * mar - Math.round(70 * TW);            // ảnh không cao quá trang (chừa chỗ cho chú thích)
    const [rw, rh] = [3, 4];
    const media = [], rels = [];
    let pid = 0;

    async function placeholder(p) {        // ô xám có chữ cái đầu, cùng tỉ lệ khung ảnh
      const cv = document.createElement('canvas');
      cv.width = 300; cv.height = Math.round(300 * rh / rw);
      const g = cv.getContext('2d');
      g.fillStyle = '#EEF2F5'; g.fillRect(0, 0, cv.width, cv.height);
      const s = (p.nameEn || p.nameNative || '?').trim().split(/\s+/);
      const ini = (s[0][0] + (s.length > 1 ? s[s.length - 1][0] : '')).toUpperCase();
      g.fillStyle = '#9AA4AE'; g.font = 'bold 90px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ini, cv.width / 2, cv.height / 2);
      return new Promise(r => cv.toBlob(r, 'image/png'));
    }
    async function image(p, widthTw) {
      if (!ex.showPhoto && ex.layout !== 'mosaic') return '';
      let blob = p.photo ? await getPhotoBlob(p.photo.id) : null;
      const isPh = !blob;
      if (!blob) blob = await placeholder(p);
      if (!blob) return '';
      pid++;
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      const name = `img${pid}.${ext}`;
      media.push({ name: 'word/media/' + name, data: new Uint8Array(await blob.arrayBuffer()) });
      const rid = 'rIdImg' + pid;
      rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
      const cx = Math.round(widthTw * EMU_TW), cy = Math.round(cx * rh / rw);
      const c = isPh ? { l: 0, t: 0, r: 0, b: 0 } : crop(p.photo, ex.ratio);
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
        `<wp:docPr id="${pid}" name="Photo ${pid}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
        `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
        `<pic:nvPicPr><pic:cNvPr id="${pid}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill><a:blip r:embed="${rid}"/><a:srcRect l="${c.l}" t="${c.t}" r="${c.r}" b="${c.b}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
        `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }

    const noBorders = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
    const bSz = Math.round((+ex.border || 0) / 0.3528 * 8);           // mm -> 1/8 pt
    const bCol = String(ex.borderColor || '#1B1920').replace('#', '').toUpperCase();
    const side = t => `<w:${t} w:val="single" w:sz="${Math.max(2, bSz)}" w:color="${bCol}"/>`;
    const cellBorder = bSz > 0 ? `<w:tcBorders>${['top', 'left', 'bottom', 'right'].map(side).join('')}</w:tcBorders>` : '';

    const ln = { line: LH };
    const lineXml = (l, center) => l.key === 'period'
      ? para(run(l.v, { b: true, sz }), Object.assign({ after: 20, center }, ln))
      : para((l.k ? run(l.k + ': ', { b: true, sz, color: GRAY }) : '') + run(l.v, { sz }), Object.assign({ after: 20, center }, ln));
    const pct = +ex.photoSize ? Math.max(10, Math.min(100, +ex.photoSize)) / 100 : 0;   // cỡ ảnh kiểu danh bạ
    const maxLines = Math.max(0, ...list.map(x => M().card(x.p, x.m, ex, T, true).lines.length));   // cùng cỡ ảnh cho mọi ô
    async function cellContent(p, m) {
      if (ex.layout === 'mosaic') {
        const c = M().card(p, m, ex, T, true);
        // ảnh + chú thích phải vừa một trang (hàng bảng không được ngắt): ước lượng chiều cao chú thích
        const capMm = (2.4 + maxLines * 1.7) * ex.fontSize * 0.3528 * (+ex.lineHeight || 1.35) + 10;
        const fitH = Math.max(Math.round(25 * TW), pageH - 2 * mar - Math.round((32 + capMm) * TW));
        const img = await image(p, Math.min(cellW - 240, Math.round(fitH * 3 / 4)));
        return (img ? para(img, { center: true, after: 60 }) : '') +
          para(run(c.main, { b: true, sz: sz + 2, color: BLUE }), Object.assign({ center: true, after: 0 }, ln)) +
          (c.sub ? para(run(c.sub, { color: BLUE, sz }), Object.assign({ center: true, after: 0 }, ln)) : '') +
          c.lines.map(l => lineXml(l, true)).join('') + para('', { after: 120 });
      }
      const c = M().card(p, m, ex, T, false);
      const pctD = pct || (n === 1 ? Math.max(0.1, (26 * TW) / textW) : 0);   // tự động: ảnh rộng ~26 mm khi 1 thẻ/hàng
      const phW = Math.round((cellW - 240) * Math.min(0.8, pctD || 0.32)), txW = cellW - 240 - (n <= 2 && ex.showPhoto ? phW : 0);
      const head = c.lines.filter(l => l.key === 'period'), rest = c.lines.filter(l => l.key !== 'period');
      // thẻ rộng: chia các dòng chi tiết thành nhiều cột (mỗi cột tối thiểu ~52 mm, tối đa 3)
      const nCol = Math.max(1, Math.min(3, Math.floor(txW / (52 * TW))));
      let restXml = rest.map(l => lineXml(l, false)).join('');
      if (nCol > 1 && rest.length > 1) {
        const per = Math.ceil(rest.length / nCol), colW = Math.floor(txW / nCol);
        const cols = Array.from({ length: nCol }, (_, k) => rest.slice(k * per, (k + 1) * per));
        restXml = `<w:tbl><w:tblPr><w:tblW w:w="${colW * nCol}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${noBorders}` +
          `<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
          `<w:tblGrid>${cols.map(() => `<w:gridCol w:w="${colW}"/>`).join('')}</w:tblGrid><w:tr>` +
          cols.map(col => `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>${col.map(l => lineXml(l, false)).join('') || para('')}</w:tc>`).join('') +
          '</w:tr></w:tbl>' + para('', { after: 0 });
      }
      const text = para(run(c.main, { b: true, sz: sz + 4, color: BLUE }), Object.assign({ after: 0 }, ln)) +
        (c.sub ? para(run(c.sub, { color: BLUE, sz }), Object.assign({ after: 60 }, ln)) : '') +
        head.map(l => lineXml(l, false)).join('') + restXml;
      if (n <= 2 && ex.showPhoto) {      // ảnh bên trái, chữ bên phải (bảng lồng)
        const img = await image(p, phW - 120);
        return `<w:tbl><w:tblPr><w:tblW w:w="${cellW - 240}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${noBorders}` +
          `<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
          `<w:tblGrid><w:gridCol w:w="${phW}"/><w:gridCol w:w="${txW}"/></w:tblGrid><w:tr>` +
          `<w:tc><w:tcPr><w:tcW w:w="${phW}" w:type="dxa"/></w:tcPr>${para(img || '', { after: 0 })}</w:tc>` +
          `<w:tc><w:tcPr><w:tcW w:w="${txW}" w:type="dxa"/></w:tcPr>${text}</w:tc></w:tr></w:tbl>` + para('', { after: 0 });
      }
      const img = await image(p, Math.min(Math.round((cellW - 240) * (pctD || 1)), Math.round(maxImgH * 3 / 4)));
      return (img ? para(img, { after: 80, center: !!pctD && pctD < 1 }) : '') + text;
    }

    // ---- nội dung ----
    let body = '';
    if (ex.cover) {
      const name = M().labName(lab, ex.lang), others = M().otherNames(lab, ex.lang);
      const unitMain = M().unitName(lab, ex.lang);
      const units = (lab.units || []).map(u => (u.text || '').trim()).filter(u => u && u !== unitMain);
      const meta = [M().yearRange(st, lab.id, T, ex), `${list.length} ${T.labels.members}`].filter(Boolean).join(' · ');
      body += para('', { before: Math.round(pageH * 0.22), after: 0 }) +
        para(run(T.defaults.coverSub.toUpperCase(), { sz: 20, color: '3787C4', b: true }), { center: true, after: 200 }) +
        para(run(name, { b: true, sz: 52 }), { center: true, after: 120, line: 300 }) +
        others.map(o => para(run(o, { sz: 28, color: '444444' }), { center: true, after: 60 })).join('') +
        para('', { after: 240 }) +
        (unitMain ? para(run(unitMain, { sz: 26 }), { center: true, after: 40 }) : '') +
        units.map(u => para(run(u, { sz: 22, color: '555555' }), { center: true, after: 40 })).join('') +
        (lab.desc ? para(run(lab.desc, { sz: 22, i: true, color: '333333' }), { center: true, before: 240, after: 120 }) : '') +
        para(run(meta, { sz: 20, color: '555555' }), { center: true, before: 200 });
    }
    const rowsXml = [];
    for (let i = 0; i < list.length; i += n) {
      const chunk = list.slice(i, i + n);
      const cells = [];
      for (let k = 0; k < n; k++) {
        const it = chunk[k];
        const inner = it ? await cellContent(it.p, it.m) : para('');
        const border = ex.layout === 'directory' && it ? cellBorder : '';
        cells.push(`<w:tc><w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/>${border}</w:tcPr>${inner}</w:tc>`);
      }
      rowsXml.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells.join('')}</w:tr>`);
    }
    const table = `<w:tbl><w:tblPr><w:tblW w:w="${cellW * n}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${noBorders}` +
      `<w:tblCellSpacing w:w="${ex.layout === 'directory' ? 60 : 0}" w:type="dxa"/>` +
      `<w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
      `<w:tblGrid>${Array.from({ length: n }, () => `<w:gridCol w:w="${cellW}"/>`).join('')}</w:tblGrid>${rowsXml.join('')}</w:tbl>`;
    body += (ex.cover ? para('', { pb: true, after: 0 }) : '') + table;

    // ---- header / footer ----
    const vars = { lab: M().labName(lab, ex.lang), unit: M().unitName(lab, ex.lang), years: M().yearRange(st, lab.id, T, ex), year: String(new Date().getFullYear()) };
    const hTpl = ex.header || '', fTpl = ex.footer || '';
    const hdr = `${XMLH}<w:hdr ${NS}>${htmlParas(hTpl, vars, 17)}</w:hdr>`;     // header/footer: cỡ cố định 8,5 pt
    const ftr = `${XMLH}<w:ftr ${NS}>${htmlParas(fTpl, vars, 17)}</w:ftr>`;
    const sect = `<w:sectPr>${hTpl.trim() ? '<w:headerReference w:type="default" r:id="rIdH"/>' : ''}${fTpl.trim() ? '<w:footerReference w:type="default" r:id="rIdF"/>' : ''}` +
      `<w:pgSz w:w="${pageW}" w:h="${pageH}"${ex.orient === 'landscape' ? ' w:orient="landscape"' : ''}/>` +
      `<w:pgMar w:top="${mar}" w:right="${mar}" w:bottom="${mar}" w:left="${mar}" w:header="${Math.round(mar / 2)}" w:footer="${Math.round(mar / 2)}" w:gutter="0"/>` +
      `${ex.cover ? '<w:titlePg/>' : ''}</w:sectPr>`;
    const doc = `${XMLH}<w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
    const styles = `${XMLH}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>` +
      `<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="${ex.lang === 'en' ? 'en-US' : 'vi-VN'}"/>` +
      `</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
      `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
    const files = [
      { name: '[Content_Types].xml', data: `${XMLH}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
      { name: '_rels/.rels', data: `${XMLH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
      { name: 'word/_rels/document.xml.rels', data: `${XMLH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
        '<Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
        rels.join('') + '</Relationships>' },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/header1.xml', data: hdr },
      { name: 'word/footer1.xml', data: ftr },
      ...media,
    ];
    return KZip.write(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }

  window.KDocx = { make };
})();
