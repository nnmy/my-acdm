"""Đọc thông tin một cuốn (thư mục nội dung): tên, danh sách chương, pixel art cho bìa."""
import os
import re
import unicodedata

from bs4 import BeautifulSoup

# pixel art dự phòng (quyển sách) khi trang chủ không có icon cho thư mục này
FALLBACK_ICON = {
    'iconColors': {'o': '#1d1d21', 's': '#3787c4', 'w': '#f4f2ea', 'r': '#d8312a'},
    'icon': ['..oooooooo..', '.osssssssso.', '.osswwwwsso.', '.osssssssso.', '.osswwwwsso.',
             '.osssssssso.', '.osssssssso.', '.osssssssso.', '.orrrrrrrro.', '.owwwwwwwwo.', '..oooooooo..'],
}


def _js_literal(pg, src, name):
    """Lấy giá trị một hằng JS (const NAME = [...];) bằng cách cho trình duyệt eval."""
    m = re.search(r'const\s+' + name + r'\s*=\s*(\[[\s\S]*?\n\]);', src)
    if not m:
        return None
    try:
        return pg.evaluate('(t) => (new Function("return " + t))()', m.group(1))
    except Exception:
        return None


def slug(s):
    s = s.replace('đ', 'd').replace('Đ', 'D')
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-')
    return s or 'book'


def load(folder, pg):
    """folder: đường dẫn thư mục nội dung (có index.html). pg: trang Playwright để eval JS."""
    folder = os.path.abspath(folder)
    name = os.path.basename(folder)
    idx = os.path.join(folder, 'index.html')
    if not os.path.exists(idx):
        raise SystemExit(f'Không thấy {idx}')
    src = open(idx, encoding='utf8').read()
    soup = BeautifulSoup(src, 'lxml')
    h1 = soup.select_one('.page-head h1') or soup.find('h1')
    title = h1.get_text(' ', strip=True) if h1 else ''
    if not title and soup.title:
        title = soup.title.get_text().split('|')[0].strip()
    title = re.sub(r'\s*&\s*', ' và ', title).strip()

    pages = _js_literal(pg, src, 'PAGES')
    chapters = []
    if pages:
        for p in pages:
            href = p.get('href', '')
            if href.startswith('http') or not os.path.exists(os.path.join(folder, href)):
                continue
            if p.get('done') is False:
                continue
            chapters.append({'href': href, 'name': p.get('name') or href})
    else:   # trang đơn: chính index.html là chương duy nhất
        chapters.append({'href': 'index.html', 'name': title})

    # pixel art: tìm trong SECTIONS của trang chủ (thư mục cha)
    icon = None
    root_idx = os.path.join(os.path.dirname(folder), 'index.html')
    if os.path.exists(root_idx):
        secs = _js_literal(pg, open(root_idx, encoding='utf8').read(), 'SECTIONS') or []
        for sec in secs:
            for it in sec.get('items', []):
                if str(it.get('href', '')).startswith(name + '/') and it.get('icon'):
                    icon = {'icon': it['icon'], 'iconColors': it['iconColors']}
    return {
        'folder': folder, 'name': name, 'title': title, 'chapters': chapters,
        'icon': icon or FALLBACK_ICON, 'filename': slug(title) + '.pdf',
    }
