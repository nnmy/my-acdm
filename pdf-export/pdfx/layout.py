"""Bìa, mục lục, header/footer và ghép các phần thành một PDF."""
import html
import io
import os

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, Fit, NameObject, NullObject
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from . import paths
from .chapters import GOTO

PW, PH = 158, 210                     # mm, tỉ lệ 3:4 (màn e-ink 7,8″ / 10,3″)
MARGIN = {'top': '15mm', 'bottom': '15mm', 'left': '12mm', 'right': '12mm'}
_fonts_ok = False


def _fonts():
    global _fonts_ok
    if _fonts_ok:
        return
    for n, f in [('BVP', 'Regular'), ('BVPM', 'Medium'), ('BVPB', 'SemiBold')]:
        pdfmetrics.registerFont(TTFont(n, os.path.join(paths.FONT_DIR, f'BeVietnamPro-{f}.ttf')))
    _fonts_ok = True


def css_links():
    return (f'<link rel="stylesheet" href="{paths.file_url(paths.FONTS_CSS)}">'
            f'<link rel="stylesheet" href="{paths.css("book.css")}">')


def pixel_svg(icon, colors, cell):
    W = max(len(r) for r in icon)
    H = len(icon)
    rects = []
    for y, row in enumerate(icon):
        for x, ch in enumerate(row):
            c = colors.get(ch)
            if c:
                rects.append(f'<rect x="{x}" y="{y}" width="1.02" height="1.02" fill="{c}"/>')
    return (f'<svg viewBox="0 0 {W} {H}" width="{W * cell}mm" height="{H * cell}mm" '
            f'shape-rendering="crispEdges">{"".join(rects)}</svg>')


def cover_html(title, icon, author):
    art = pixel_svg(icon['icon'], icon['iconColors'], 3.12)
    return (f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{css_links()}</head>'
            f'<body class="cover"><div class="cv"><div class="art">{art}</div>'
            f'<h1 class="cv-title">{html.escape(title)}</h1><div class="cv-rule"></div>'
            f'<p class="cv-author">{html.escape(author)}</p></div></body></html>')


def toc_html(entries):
    rows, first = [], True
    for e in entries:
        label = html.escape(e['title'])
        cls = 't0' if e['lvl'] == 0 else 't1'
        if e['lvl'] == 0:
            if not first:
                rows.append('<div class="gap"></div>')
            first = False
        rows.append(f'<a class="{cls}" href="{GOTO}page/{e["page"]}"><span class="tt">{label}</span>'
                    f'<span class="ld"></span><span class="pn">{e["page"]}</span></a>')
    return (f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{css_links()}</head>'
            f'<body class="toc"><h1 class="sec-title">Mục lục</h1>{"".join(rows)}</body></html>')


def html2pdf(pg, src, dst, margin=None, mj=False, outline=True):
    pg.goto(paths.file_url(src), timeout=60000)
    if mj:
        try:
            pg.wait_for_selector('body[data-mj=done]', timeout=90000)
        except Exception:
            print('    (MathJax chưa xong, vẫn tiếp tục)')
    pg.evaluate('document.fonts.ready.then(()=>1)')
    pg.evaluate('Promise.race([new Promise(r=>setTimeout(r,4000)),'
                'Promise.all([...document.images].map(i=>i.decode().catch(()=>1)))])')
    pg.wait_for_timeout(250)
    pg.pdf(path=dst, width=f'{PW}mm', height=f'{PH}mm', margin=margin or MARGIN,
           print_background=True, outline=outline, tagged=outline)


def outline_items(reader):
    res = []

    def walk(items, depth):
        for it in items:
            if isinstance(it, list):
                walk(it, depth + 1)
                continue
            try:
                pno = reader.get_destination_page_number(it)
            except Exception:
                continue
            top = it.get('/Top') if hasattr(it, 'get') else None
            top = float(top) if top is not None and not isinstance(top, NullObject) else None
            res.append((depth, str(it.title), pno, top))
    walk(reader.outline, 0)
    return res


def _fit(c, txt, font, size, maxw):
    if pdfmetrics.stringWidth(txt, font, size) <= maxw:
        return txt
    while txt and pdfmetrics.stringWidth(txt + '…', font, size) > maxw:
        txt = txt[:-1]
    return txt.rstrip() + '…'


def overlay(labels, title):
    _fonts()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PW * mm, PH * mm))
    for i, lab in enumerate(labels):
        if lab is not None:
            c.setStrokeColorRGB(0, 0, 0)
            c.setLineWidth(0.5)
            c.setFillColorRGB(0.1, 0.1, 0.12)
            c.setFont('BVPM', 8)
            c.drawCentredString(PW * mm / 2, (PH - 9.2) * mm, _fit(c, title, 'BVPM', 8, (PW - 24) * mm))
            c.line(12 * mm, (PH - 11) * mm, (PW - 12) * mm, (PH - 11) * mm)
            c.line(12 * mm, 11 * mm, (PW - 12) * mm, 11 * mm)
            c.setFont('BVP', 8)
            c.drawString(12 * mm, 7.2 * mm, _fit(c, lab, 'BVP', 8, (PW - 50) * mm))
            c.setFont('BVPB', 9)
            c.drawRightString((PW - 12) * mm, 7 * mm, str(i + 1))
        c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def assemble(out_pdf, title, author, cover, toc, parts, chap_start, appx_start, gloss_start):
    """parts: [(reader, footer_label, outline_title, outline_items)], theo thứ tự sau mục lục."""
    w = PdfWriter()
    labels = [None]
    w.append(cover)
    w.append(toc)
    labels += ['Mục lục'] * len(toc.pages)
    starts = []
    for r, lab, _, _ in parts:
        starts.append(len(labels))
        w.append(r, import_outline=False)
        labels += [lab] * len(r.pages)
    ov = overlay(labels, title)
    for i, lab in enumerate(labels):
        if lab is not None:
            w.pages[i].merge_page(ov.pages[i])
    for page in w.pages:                      # liên kết nội bộ goto.local -> nhảy trang
        for aref in page.get('/Annots') or []:
            a = aref.get_object()
            act = a.get('/A')
            if not act:
                continue
            uri = act.get_object().get('/URI')
            if not (uri and str(uri).startswith(GOTO)):
                continue
            kind, num = str(uri)[len(GOTO):].split('/')[:2]
            num = int(num)
            if kind == 'page':
                target = num - 1
            elif kind == 'chap':
                target = chap_start[num - 1] - 1
            else:
                target = (appx_start or gloss_start or 2) - 1
            target = max(0, min(target, len(w.pages) - 1))
            a[NameObject('/A')] = DictionaryObject({
                NameObject('/S'): NameObject('/GoTo'),
                NameObject('/D'): ArrayObject([w.pages[target].indirect_reference, NameObject('/Fit')])})
    w.add_outline_item('Bìa', 0)
    w.add_outline_item('Mục lục', 1)
    for (r, _, otitle, ol), base in zip(parts, starts):
        par = w.add_outline_item(otitle, base)
        stack = {0: par}
        for depth, t, pno, top in ol:
            if depth == 0 or depth > 2:
                continue
            fit = Fit.xyz(0, top, None) if top is not None else Fit.fit()
            stack[depth] = w.add_outline_item(t, base + pno, parent=stack.get(depth - 1, par), fit=fit)
    w.page_mode = '/UseOutlines'
    w.add_metadata({'/Title': title, '/Author': author, '/Subject': title})
    w.compress_identical_objects(remove_identicals=True, remove_orphans=True)
    with open(out_pdf, 'wb') as f:
        w.write(f)
    return len(w.pages)
