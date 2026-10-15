"""Chụp ảnh tĩnh các minh họa tương tác (div.demo) bằng Chromium.

Trang được nạp từ một bản sao tạm trong .cache (có <base> trỏ về thư mục gốc, đã bỏ dòng cổng mật khẩu
chỉ trong bản sao này), nên file trong thư mục nội dung không bị thay đổi.
"""
import os
import re

from PIL import Image

from . import paths

HIDE = ('<style>.site-nav,.site-foot,#catCanvas,#catBtn,.ftoc,.ftoc-btn,.demo-title{display:none!important}'
        '.readout{grid-template-columns:minmax(0,1fr) minmax(0,auto)!important}'
        '.readout dd{overflow-wrap:normal!important}</style>')


def snap_copy(folder, href, dst_html):
    src = open(os.path.join(folder, href), encoding='utf8').read()
    src = src.replace('class="gate-locked"', '')
    src = re.sub(r'<script[^>]*gate\.js[^>]*></script>', '', src)
    src = re.sub(r'<style>html\.gate-locked[^<]*</style>', '', src)
    src = re.sub(r'<script[^>]*mathjax[^>]*></script>', f'<script src="{paths.file_url(paths.MATHJAX)}"></script>', src, flags=re.I)
    src = re.sub(r'<script[^>]*goatcounter[^>]*></script>', '', src)
    src = re.sub(r'<link href="https://fonts\.googleapis[^>]*>', '', src)
    base = paths.file_url(folder) + '/'
    src = src.replace('<head>', f'<head><base href="{base}">', 1)
    src = src.replace('</head>', f'<link rel="stylesheet" href="{paths.file_url(paths.FONTS_CSS)}">{HIDE}</head>', 1)
    open(dst_html, 'w', encoding='utf8').write(src)


def _compress(png):
    im = Image.open(png)
    if im.height < 300:          # minh họa cần dịch vụ ngoài: chỉ còn thông báo lỗi -> bỏ
        os.remove(png)
        return
    im.convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT,
                               dither=Image.Dither.NONE).save(png, optimize=True)


def snap_chapter(browser, folder, href, outdir, prefix):
    """Chụp mọi .demo của một chương -> outdir/{prefix}_d{j}.png. Trả về số demo."""
    os.makedirs(outdir, exist_ok=True)
    tmp = os.path.join(outdir, f'_{prefix}_snap.html')
    snap_copy(folder, href, tmp)
    pg = browser.new_page(viewport={'width': 1040, 'height': 1200}, device_scale_factor=2)
    try:
        pg.goto(paths.file_url(tmp), timeout=30000)
        pg.wait_for_timeout(800)
        demos = pg.query_selector_all('.demo')
        for j, d in enumerate(demos):
            png = os.path.join(outdir, f'{prefix}_d{j}.png')
            try:
                d.scroll_into_view_if_needed(timeout=10000)
                pg.wait_for_timeout(1400)
                d.screenshot(path=png, timeout=20000, animations='disabled')
                _compress(png)
            except Exception as e:
                print(f'    (bỏ qua minh họa {j + 1}: {str(e)[:80]})')
        return len(demos)
    finally:
        pg.close()
        os.remove(tmp)


def snap_selector(browser, folder, href, out_png, clicks=(), selector='#svTool'):
    """Chụp một phần tử bất kỳ sau khi bấm lần lượt các nút trong clicks (dùng cho adapter)."""
    tmp = out_png + '.html'
    snap_copy(folder, href, tmp)
    pg = browser.new_page(viewport={'width': 1040, 'height': 1200}, device_scale_factor=2)
    try:
        pg.goto(paths.file_url(tmp), timeout=30000)
        pg.wait_for_timeout(500)
        d = pg.query_selector('.demo')
        if d:
            d.scroll_into_view_if_needed(timeout=10000)
            pg.wait_for_timeout(1500)
        for c in clicks:
            pg.click(c)
            pg.wait_for_timeout(800)
        el = pg.query_selector(selector)
        if el:
            el.screenshot(path=out_png, timeout=20000, animations='disabled')
            _compress(out_png)
    finally:
        pg.close()
        os.remove(tmp)
