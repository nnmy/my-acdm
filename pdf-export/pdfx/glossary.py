"""Trang thuật ngữ cuối sách.

Nguồn (theo thứ tự ưu tiên tăng dần, mục sau ghi đè mục trước nếu trùng từ tiếng Anh):
1. Tự trích từ nội dung: cặp <span class="term">…</span> <span class="en">(…)</span> trong bài
   (diễn nghĩa = câu chứa thuật ngữ) và các bảng section#thuat-ngu / section#bang.
2. File pdf-glossary.txt trong thư mục nội dung (nếu có). Mỗi dòng:
       English | IPA | Tiếng Việt | Diễn nghĩa
   hoặc    English | IPA | Tiếng Việt | 中文 | pinyin | Diễn nghĩa
   Dòng bắt đầu bằng # là chú thích. Dòng "#!only" ở đầu file: chỉ dùng file, không tự trích.
IPA để trống thì tự tra bằng gói eng_to_ipa (nếu đã cài); không tra được thì bỏ trống.
"""
import html
import os
import re

from bs4 import BeautifulSoup

try:
    import eng_to_ipa
except Exception:          # gói tùy chọn
    eng_to_ipa = None

SENT = re.compile(r'(?<=[.!?])\s+(?=[A-ZĐÂĂÊÔƠƯÁÀẢÃẠÉÈẺẼẸÍÌỈĨỊÓÒỎÕỌÚÙỦŨỤÝỲỶỸỴ"“(\\])')


def _clean_en(s):
    s = s.strip().strip('()').strip()
    s = re.sub(r'\s+', ' ', s)
    m = re.match(r'^(.*?),\s*([A-Z][A-Za-z0-9\-]{1,10})$', s)     # "finite element method, FEM"
    if m:
        s = f'{m.group(1)} ({m.group(2)})'
    return s


def _is_latin(s):
    return bool(s) and all(ord(c) < 0x250 or c in '–’' for c in s)


def _sentence(block_text, needle):
    for snt in SENT.split(block_text):
        if needle in snt:
            snt = snt.strip()
            return snt if len(snt) <= 320 else snt[:300].rsplit(' ', 1)[0] + '…'
    return ''


def _from_page(path):
    soup = BeautifulSoup(open(path, encoding='utf8').read(), 'lxml')
    main = soup.find('main') or soup.body
    for t in main.select('script, style, .demo, nav, footer'):
        t.decompose()
    out = []
    # bảng thuật ngữ
    for sid in ('thuat-ngu', 'bang'):
        sec = main.find('section', id=sid)
        if not sec:
            continue
        for tr in sec.find_all('tr'):
            tds = tr.find_all('td')
            if len(tds) < 2:
                continue
            c0 = tds[0]
            en_el = c0.select_one('.en')
            en = _clean_en(en_el.get_text(' ', strip=True)) if en_el else ''
            if en_el:
                en_el.extract()
            vi = c0.get_text(' ', strip=True)
            m = re.match(r'^(.*\S)\s*\(([^()]+)\)\s*$', vi)
            if not en and m and _is_latin(m.group(2)):
                vi, en = m.group(1), _clean_en(m.group(2))
            if not en and _is_latin(vi):
                en, vi = vi, ''
            if not en:
                continue
            df = tds[-1].get_text(' ', strip=True)
            out.append({'en': en, 'vi': vi, 'def': df, 'prio': 2})
    # thuật ngữ trong bài
    for t in main.select('.term'):
        n = t.find_next_sibling()
        if n is None or 'en' not in (n.get('class') or []):
            continue
        gap = t.next_sibling
        if gap is not None and gap is not n and str(gap).strip() not in ('', ',', '('):
            continue
        en = _clean_en(n.get_text(' ', strip=True))
        vi = t.get_text(' ', strip=True)
        if not en or len(en) > 70:
            continue
        blk = t.find_parent(['p', 'li', 'td', 'div'])
        df = _sentence(blk.get_text(' ', strip=True), vi) if blk else ''
        df = re.sub(r'\s+([,.;:)])', r'\1', df)
        out.append({'en': en, 'vi': vi[:1].upper() + vi[1:], 'def': df, 'prio': 1})
    return out


def _from_file(path):
    items, only = [], False
    for line in open(path, encoding='utf8'):
        s = line.strip()
        if not s:
            continue
        if s.startswith('#!only'):
            only = True
            continue
        if s.startswith('#'):
            continue
        parts = [x.strip() for x in s.split('|')]
        if len(parts) >= 6:
            en, ipa, vi, zh, py = parts[:5]
            df = '|'.join(parts[5:]).strip()
        elif len(parts) >= 4:
            en, ipa, vi = parts[:3]
            zh = py = ''
            df = '|'.join(parts[3:]).strip()
        else:
            continue
        items.append({'en': en, 'ipa': ipa, 'vi': vi, 'zh': zh, 'py': py, 'def': df, 'prio': 3})
    return items, only


def _ipa(en):
    if eng_to_ipa is None:
        return ''
    words = re.sub(r'\(.*?\)', '', en).strip()
    if not words or not re.fullmatch(r"[A-Za-z' \-]+", words):
        return ''
    try:
        r = eng_to_ipa.convert(words.replace('-', ' '))
    except Exception:
        return ''
    return '' if '*' in r else r


def collect(book):
    folder = book['folder']
    entries = {}
    gfile = os.path.join(folder, 'pdf-glossary.txt')
    fitems, only = _from_file(gfile) if os.path.exists(gfile) else ([], False)
    if not only:
        for ch in book['chapters']:
            for e in _from_page(os.path.join(folder, ch['href'])):
                k = e['en'].lower()
                old = entries.get(k)
                if old is None or e['prio'] > old['prio'] or (e['prio'] == old['prio'] and not old['def'] and e['def']):
                    entries[k] = e
    for e in fitems:
        entries[e['en'].lower()] = e
    res = []
    for e in entries.values():
        e.setdefault('zh', '')
        e.setdefault('py', '')
        if not e.get('ipa'):
            e['ipa'] = _ipa(e['en'])
        e['en'] = e['en'][:1].upper() + e['en'][1:]
        res.append(e)
    res.sort(key=lambda e: re.sub(r'[^a-z0-9]', '', e['en'].lower()))
    return res


def page_html(items, head_links, mj):
    if not items:
        return None, None
    has_zh = any(e['zh'] for e in items)
    title = 'Thuật ngữ Anh – Việt – Trung' if has_zh else 'Thuật ngữ Anh – Việt'
    out, cur = [], None
    for e in items:
        letter = (re.sub(r'[^a-z0-9]', '', e['en'].lower()) or '#')[0].upper()
        if letter != cur:
            cur = letter
            out.append(f'<div class="g-letter">{letter}</div>')
        ipa = f' <span class="g-ipa">/{html.escape(e["ipa"])}/</span>' if e['ipa'] else ''
        tr = ''
        if e['vi']:
            tr += f'<span class="g-lab">VI</span><span class="g-vi">{html.escape(e["vi"])}</span>'
        if e['zh']:
            tr += (f'<span class="g-lab">中</span><span class="g-zh" lang="zh-Hans">{html.escape(e["zh"])}</span> '
                   f'<span class="g-py">{html.escape(e["py"])}</span>')
        tr = f'<div class="g-tr">{tr}</div>' if tr else ''
        df = f'<div class="g-def">{e["def"]}</div>' if e['def'] else ''
        out.append(f'<div class="g-entry"><div class="g-head"><span class="g-en">{html.escape(e["en"])}</span>{ipa}</div>{tr}{df}</div>')
    notes = ['xếp theo ABC của từ tiếng Anh']
    if any(e['ipa'] for e in items):
        notes.append('phiên âm IPA theo giọng Anh–Mỹ')
    if has_zh:
        notes.append('tiếng Trung ghi chữ giản thể kèm pinyin')
    intro = f'{len(items)} thuật ngữ, ' + '; '.join(notes) + '.'
    doc = (f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{head_links}</head>'
           f'<body class="gloss"><h1 class="sec-title">{title}</h1><p class="g-intro">{intro}</p>{"".join(out)}{mj}</body></html>')
    return doc, title
