"""Tải font và MathJax về thư mục .cache trong lần chạy đầu (các lần sau dùng lại)."""
import io
import os
import tarfile
import urllib.request

from . import paths

GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl'
FONTS = {
    **{f'BeVietnamPro-{w}.ttf': f'{GF}/bevietnampro/BeVietnamPro-{w}.ttf'
       for w in ['Regular', 'Italic', 'Medium', 'MediumItalic', 'SemiBold', 'SemiBoldItalic', 'Bold', 'BoldItalic']},
    'NotoSans.ttf': f'{GF}/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf',   # có đủ ký tự IPA
}
MATHJAX_VER = '3.2.2'
MATHJAX_URLS = [
    f'https://cdn.jsdelivr.net/npm/mathjax@{MATHJAX_VER}/es5/tex-svg-full.js',
    f'https://unpkg.com/mathjax@{MATHJAX_VER}/es5/tex-svg-full.js',
]
MATHJAX_TGZ = f'https://registry.npmjs.org/mathjax/-/mathjax-{MATHJAX_VER}.tgz'


def _get(url, timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': 'pdf-export'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def ensure():
    os.makedirs(paths.FONT_DIR, exist_ok=True)
    for name, url in FONTS.items():
        dst = os.path.join(paths.FONT_DIR, name)
        if not os.path.exists(dst):
            print(f'  tải font {name} ...', flush=True)
            data = _get(url)
            open(dst, 'wb').write(data)
    if not os.path.exists(paths.MATHJAX):
        print('  tải MathJax ...', flush=True)
        data = None
        for u in MATHJAX_URLS:
            try:
                data = _get(u)
                break
            except Exception:
                pass
        if data is None:   # dự phòng: lấy từ gói npm
            tgz = _get(MATHJAX_TGZ, timeout=300)
            with tarfile.open(fileobj=io.BytesIO(tgz)) as tf:
                data = tf.extractfile('package/es5/tex-svg-full.js').read()
        os.makedirs(os.path.dirname(paths.MATHJAX), exist_ok=True)
        open(paths.MATHJAX, 'wb').write(data)
    # fonts.css trỏ tới font đã tải
    tmpl = open(os.path.join(paths.STYLES, 'fonts.css.tmpl'), encoding='utf8').read()
    css = tmpl.replace('{FONTDIR}', paths.file_url(paths.FONT_DIR))
    open(paths.FONTS_CSS, 'w', encoding='utf8').write(css)
