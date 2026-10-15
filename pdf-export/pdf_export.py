#!/usr/bin/env python3
"""Xuất một thư mục nội dung của my-library (hoặc my-collection) thành một file PDF để đọc trên tablet e-ink.

Ví dụ:
    python pdf_export.py ../intro-bem
    python pdf_export.py ../intro-semi --title "Bán dẫn và Siêu dẫn" --file Ban-dan-va-Sieu-dan.pdf
    python pdf_export.py ../../my-collection/song-con -y

Xem README.md để biết cách cài đặt và các quy ước nội dung.
"""
import argparse
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bs4 import BeautifulSoup                      # noqa: E402
from playwright.sync_api import sync_playwright   # noqa: E402
from pypdf import PdfReader                        # noqa: E402

from pdfx import adapters, assets, book as bookmod, chapters, glossary, layout, paths, snapshots  # noqa: E402


def ask(label, default, auto):
    if auto:
        return default
    try:
        v = input(f'{label} [{default}]: ').strip()
    except EOFError:
        v = ''
    return v or default


def main():
    ap = argparse.ArgumentParser(description='Xuất một thư mục nội dung thành PDF cho máy đọc e-ink.')
    ap.add_argument('folder', help='thư mục nội dung, ví dụ ../intro-bem')
    ap.add_argument('--title', help='tên sách (mặc định: tiêu đề trang index.html)')
    ap.add_argument('--file', help='tên file PDF (mặc định: tên sách không dấu)')
    ap.add_argument('--author', default='NNM x AI', help='tác giả in trên bìa (mặc định: NNM x AI)')
    ap.add_argument('--out', default=paths.OUTPUT, help='thư mục lưu PDF (mặc định: pdf-export/output)')
    ap.add_argument('--no-demos', action='store_true', help='không chụp minh họa tương tác (nhanh hơn)')
    ap.add_argument('-y', '--yes', action='store_true', help='không hỏi lại, dùng giá trị mặc định')
    a = ap.parse_args()
    t0 = time.time()

    print('Chuẩn bị font, MathJax ...')
    assets.ensure()

    with sync_playwright() as p:
        br = p.chromium.launch(args=['--allow-file-access-from-files'])
        pg = br.new_page(viewport={'width': 560, 'height': 800})
        bk = bookmod.load(a.folder, pg)
        print(f'\nThư mục: {bk["folder"]}  ({len(bk["chapters"])} chương)')
        for i, ch in enumerate(bk['chapters'], 1):
            print(f'  {i}. {ch["name"]}')
        title = a.title or ask('Tên sách', bk['title'], a.yes)
        fname = a.file or ask('Tên file PDF', bookmod.slug(title) + '.pdf', a.yes)
        if not fname.lower().endswith('.pdf'):
            fname += '.pdf'

        wd = os.path.join(paths.WORK, bk['name'])
        shutil.rmtree(wd, ignore_errors=True)
        os.makedirs(wd)
        snapdir = os.path.join(wd, 'snaps')
        hrefmap = {ch['href']: i for i, ch in enumerate(bk['chapters'], 1)}
        appx, chap_pdfs, headhtml = [], [], None
        try:
            for i, ch in enumerate(bk['chapters'], 1):
                print(f'\nChương {i}: {ch["name"]}')
                extra = None
                pngs = []
                if not a.no_demos:
                    n = snapshots.snap_chapter(br, bk['folder'], ch['href'], snapdir, f'c{i}')
                    pngs = [os.path.join(snapdir, f'c{i}_d{j}.png') for j in range(n)]
                    if n:
                        print(f'  chụp {n} minh họa')
                src_soup = BeautifulSoup(open(os.path.join(bk['folder'], ch['href']), encoding='utf8').read(), 'lxml')
                if adapters.survival_applies(bk['folder'], src_soup):
                    data = adapters.survival_data(pg, bk['folder'])
                    snaps = {} if a.no_demos else adapters.survival_snaps(br, bk['folder'], ch['href'], snapdir)
                    extra = adapters.survival_html(data, snaps) if data else None
                out_html = os.path.join(wd, f'chapter{i}.html')
                hh = chapters.prepare(bk, ch, i, hrefmap, appx, pngs, out_html, extra)
                headhtml = headhtml or hh
                dst = os.path.join(wd, f'chapter{i}.pdf')
                layout.html2pdf(pg, out_html, dst, mj=True)
                chap_pdfs.append(dst)

            print('\nPhụ lục, thuật ngữ, bìa, mục lục ...')
            ah = chapters.appendix_html(appx, headhtml, hrefmap)
            ar = None
            if ah:
                ap_html = os.path.join(wd, 'appendix.html')
                open(ap_html, 'w', encoding='utf8').write(ah)
                layout.html2pdf(pg, ap_html, os.path.join(wd, 'appendix.pdf'), mj=True)
                ar = PdfReader(os.path.join(wd, 'appendix.pdf'))
            items = glossary.collect(bk)
            gdoc, gtitle = glossary.page_html(items, layout.css_links(), chapters.mj_conf())
            gr = None
            if gdoc:
                gh = os.path.join(wd, 'glossary.html')
                open(gh, 'w', encoding='utf8').write(gdoc)
                layout.html2pdf(pg, gh, os.path.join(wd, 'glossary.pdf'), mj=True, outline=False)
                gr = PdfReader(os.path.join(wd, 'glossary.pdf'))
            ch_html = os.path.join(wd, 'cover.html')
            open(ch_html, 'w', encoding='utf8').write(layout.cover_html(title, bk['icon'], a.author))
            layout.html2pdf(pg, ch_html, os.path.join(wd, 'cover.pdf'),
                            margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'}, outline=False)

            readers = [PdfReader(x) for x in chap_pdfs]
            outl = [layout.outline_items(r) for r in readers]
            aol = layout.outline_items(ar) if ar else []
            ntoc = 1
            for _ in range(4):
                entries, chap_start = [], []
                pno = 1 + ntoc + 1
                for i, (r, ol) in enumerate(zip(readers, outl), 1):
                    chap_start.append(pno)
                    entries.append({'lvl': 0, 'title': f'Chương {i}: {bk["chapters"][i - 1]["name"]}', 'page': pno})
                    entries += [{'lvl': 1, 'title': t, 'page': pno + pp} for d, t, pp, _ in ol if d == 1]
                    pno += len(r.pages)
                appx_start = None
                if ar:
                    appx_start = pno
                    entries.append({'lvl': 0, 'title': 'Phụ lục: Thuật ngữ và ký hiệu', 'page': pno})
                    entries += [{'lvl': 1, 'title': t, 'page': pno + pp} for d, t, pp, _ in aol if d == 1]
                    pno += len(ar.pages)
                gloss_start = pno if gr else None
                if gr:
                    entries.append({'lvl': 0, 'title': gtitle, 'page': pno})
                th = os.path.join(wd, 'toc.html')
                open(th, 'w', encoding='utf8').write(layout.toc_html(entries))
                layout.html2pdf(pg, th, os.path.join(wd, 'toc.pdf'), outline=False)
                n = len(PdfReader(os.path.join(wd, 'toc.pdf')).pages)
                if n == ntoc:
                    break
                ntoc = n
            br.close()

            parts = [(r, f'Chương {i}: {bk["chapters"][i - 1]["name"]}', f'Chương {i}: {bk["chapters"][i - 1]["name"]}', ol)
                     for i, (r, ol) in enumerate(zip(readers, outl), 1)]
            if ar:
                parts.append((ar, 'Phụ lục: Thuật ngữ và ký hiệu', 'Phụ lục: Thuật ngữ và ký hiệu', aol))
            if gr:
                parts.append((gr, gtitle, gtitle, []))
            os.makedirs(a.out, exist_ok=True)
            out_pdf = os.path.join(a.out, fname)
            npages = layout.assemble(out_pdf, title, a.author, PdfReader(os.path.join(wd, 'cover.pdf')),
                                     PdfReader(os.path.join(wd, 'toc.pdf')), parts, chap_start, appx_start, gloss_start)
        finally:
            # bản sao tạm không có cổng mật khẩu: luôn xóa sau khi xong
            shutil.rmtree(wd, ignore_errors=True)
    print(f'\nXong: {out_pdf}\n  {npages} trang, {len(items)} thuật ngữ, {time.time() - t0:.0f} giây')


if __name__ == '__main__':
    main()
