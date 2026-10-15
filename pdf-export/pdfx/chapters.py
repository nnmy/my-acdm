"""Biến một trang HTML nội dung thành trang in cho PDF (bản sao tạm trong .cache; đường dẫn đổi sang tuyệt đối).

Quy ước được dùng (đúng như các trang hiện có):
- tên chương: .page-head h1
- bảng thuật ngữ / ký hiệu gom về phụ lục: section#bang, section#thuat-ngu, section#ky-hieu
- lịch sử: ol.timeline > li (.yr, h4, p) -> đoạn văn thường
- hình tĩnh: figure.fig (+ figcaption); minh họa: div.demo (.demo-title h4 làm chú thích)
- nhóm thu gọn: details.grp (summary .t) -> khối tĩnh có tiêu đề h2
"""
import html
import os
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup, NavigableString

from . import paths

GOTO = 'https://goto.local/'
APPX_IDS = {'bang', 'thuat-ngu', 'ky-hieu'}
MJ_CONF = """<script>window.MathJax={tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']]},svg:{fontCache:'local',mtextInheritFont:true},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']},startup:{pageReady(){return MathJax.startup.defaultPageReady().then(()=>{document.body.setAttribute('data-mj','done')})}}};</script>
<script src="MJSRC"></script>"""

END = r'(?=\s*[.,;:)!?]|\s*$)'
PAT_DEMO = [(re.compile(r'\bcông cụ (bên dưới|dưới đây|ở dưới)\b'), '{L}'),
            (re.compile(r'\b[Dd]emo (này|bên dưới|dưới đây|ở dưới|bên trên|ở trên)\b'), '{L}'),
            (re.compile(r'\b(trên|trong|ở|của|với|theo) demo' + END), r'\1 {L}'),
            (re.compile(r'\b[Dd]emo' + END), '{L}')]
PAT_FIG = [(re.compile(r'\b[Hh]ình (bên dưới|dưới đây|ở dưới|bên trên|ở trên|bên)\b'), '{L}')]


def mj_conf():
    return MJ_CONF.replace('MJSRC', paths.file_url(paths.MATHJAX))


def head_links(compact=False):
    s = (f'<link rel="stylesheet" href="{paths.file_url(paths.FONTS_CSS)}">'
         f'<link rel="stylesheet" href="{paths.css("eink.css")}">')
    if compact:
        s += f'<link rel="stylesheet" href="{paths.css("compact.css")}">'
    return s


def _refify(el, label, pats):
    if el is None or isinstance(el, NavigableString):
        return
    for t in list(el.find_all(string=True)):
        if t.parent.name in ('script', 'style', 'code', 'pre'):
            continue
        s = s2 = str(t)
        for rx, rep in pats:
            s2 = rx.sub(rep.replace('{L}', label), s2)
        if s2 != s:
            t.replace_with(s2)


def _neighbors(node):
    res = []
    p = node.find_previous_sibling()
    if p is not None:
        res.append(p)
    q = node
    for _ in range(2):
        q = q.find_next_sibling() if q is not None else None
        if q is not None:
            res.append(q)
    return res


def _table_rows(tb):
    hdr = [th.get_text(' ', strip=True) for th in tb.find_all('th')]
    rows = []
    for tr in tb.find_all('tr'):
        tds = tr.find_all('td')
        if tds:
            rows.append([td.decode_contents().strip() for td in tds])
    return hdr, rows


def prepare(book, ch, idx, hrefmap, appx, demo_pngs, out_html, extra_html=None):
    """demo_pngs: danh sách đường dẫn ảnh (hoặc None) theo thứ tự các .demo trong trang.
    extra_html: HTML thay cho #demoSurvival (adapter). Trả về True nếu dùng kiểu trình bày gọn."""
    folder = book['folder']
    soup = BeautifulSoup(open(os.path.join(folder, ch['href']), encoding='utf8').read(), 'lxml')
    soup.html.attrs.pop('class', None)
    head, body = soup.head, soup.body
    for t in head.find_all(['script', 'style', 'base']):
        t.decompose()
    for l in head.find_all('link'):
        if 'lib/' not in l.get('href', ''):
            l.decompose()
    for c in soup.find_all(string=lambda s: s.__class__.__name__ == 'Comment'):
        c.extract()
    if extra_html is not None:
        d = body.select_one('#demoSurvival')
        d.replace_with(BeautifulSoup(extra_html, 'html.parser'))
        lead = body.select_one('.page-head .lead')
        if lead:
            lead.string = re.sub(r'\s*Chọn tình huống để xem\.?', '', lead.get_text())

    # --- bảng thuật ngữ / ký hiệu -> phụ lục ---
    removed = set()
    for sid in ['bang', 'thuat-ngu', 'ky-hieu']:
        sec = body.find('section', id=sid)
        if not sec:
            continue
        removed.add(sid)
        for x in sec.find_all(id=True):
            removed.add(x['id'])
        kind = 'sym' if sid == 'ky-hieu' else 'term'
        for tb in sec.find_all('table'):
            hdr, rows = _table_rows(tb)
            appx.append((kind, tuple(hdr), rows, idx))
        sec.decompose()

    # --- lịch sử: timeline -> đoạn văn ---
    for ol in body.select('ol.timeline'):
        div = soup.new_tag('div', attrs={'class': 'hist'})
        for li in ol.find_all('li', recursive=False):
            yr = li.select_one('.yr')
            yr = yr.get_text(' ', strip=True) if yr else ''
            h4 = li.find('h4')
            ttl = h4.decode_contents() if h4 else ''
            ps = li.find_all('p')
            txt = ' '.join(p.decode_contents() for p in ps)
            sep = ' · ' if yr and ttl else ''
            div.append(BeautifulSoup(f'<p><b>{yr}{sep}{ttl}.</b> {txt}</p>', 'html.parser'))
        ol.replace_with(div)

    # --- hình + chú thích + tham chiếu ---
    fn = dj = 0
    cands = body.find_all(lambda t: (t.name == 'figure' and 'fig' in (t.get('class') or [])) or
                          (t.name == 'div' and 'demo' in (t.get('class') or [])))
    for f in cands:
        if f.name == 'div':
            fsnap = f.get('data-snap')
            h4 = f.select_one('.demo-title h4')
            ttl = h4.get_text(' ', strip=True) if h4 else 'Minh họa'
            if fsnap:
                png = fsnap
            else:
                png = demo_pngs[dj] if dj < len(demo_pngs) else None
                dj += 1
            if not png or not os.path.exists(png):
                f.decompose()
                continue
            fn += 1
            L = f'Hình {idx}.{fn}'
            fig = BeautifulSoup(f'<figure class="demo-snap"><img src="{paths.file_url(png)}"><figcaption><b>{L}. '
                                f'{html.escape(ttl)}.</b> Ảnh chụp từ minh họa tương tác của bản web.</figcaption></figure>',
                                'html.parser').figure
            f.replace_with(fig)
            nbs = fig.find_previous_siblings(limit=5) if fsnap else _neighbors(fig)
            for nb in nbs:
                _refify(nb, L, PAT_DEMO)
        else:
            fn += 1
            L = f'Hình {idx}.{fn}'
            cap = f.find('figcaption')
            if cap is None:
                cap = soup.new_tag('figcaption')
                f.append(cap)
            b = soup.new_tag('b')
            b.string = f'{L}. '
            cap.insert(0, b)
            anchor = f.parent if 'figrow' in (f.parent.get('class') or []) else f
            for nb in _neighbors(anchor):
                _refify(nb, L, PAT_FIG)
    for im in body.find_all('img'):
        im.attrs.pop('loading', None)       # ảnh lazy sẽ không được tải khi in

    # --- bỏ phần tương tác ---
    for t in body.find_all(['script', 'noscript', 'footer', 'canvas']):
        t.decompose()
    for sel in ['nav.site-nav', '.pager', 'button.say', '.crumb', '.ftoc', '.say']:
        for t in body.select(sel):
            t.decompose()
    for d in body.find_all('details'):
        d.name = 'div'
        d['class'] = (d.get('class') or []) + ['grp-static']
        d.attrs.pop('open', None)
        sm = d.find('summary')
        if not sm:
            continue
        t = sm.select_one('.t')
        if t:
            h = soup.new_tag('h2', attrs={'class': 'grp-h'})
            h.string = t.get_text(' ', strip=True)
            meta = soup.new_tag('div', attrs={'class': 'grp-meta'})
            for x in sm.select('.en,.n'):
                sp = soup.new_tag('span', attrs={'class': ' '.join(x.get('class'))})
                sp.string = x.get_text(' ', strip=True)
                meta.append(sp)
            hd = soup.new_tag('div', attrs={'class': 'grp-head'})
            hd.append(h)
            hd.append(meta)
            sm.replace_with(hd)
        else:
            sm.name = 'div'
            sm['class'] = ['grp-head']

    # --- liên kết ---
    for a in body.find_all('a'):
        href = a.get('href', '')
        if href.startswith(('http:', 'https:', 'mailto:')):
            continue
        if href.startswith('#'):
            if href[1:] in removed or href[1:] in APPX_IDS:
                a['href'] = f'{GOTO}appx/0'
            continue
        base, _, frag = href.partition('#')
        if base in hrefmap:
            a['href'] = f'{GOTO}appx/0' if frag in APPX_IDS else f'{GOTO}chap/{hrefmap[base]}'
        else:
            a.unwrap()

    # --- tiêu đề chương ---
    h1 = body.select_one('.page-head h1') or body.find('h1')
    if h1:
        h1.string = f'Chương {idx}: {ch["name"]}'

    # --- id duy nhất trong cả cuốn ---
    for el in body.find_all(id=True):
        el['id'] = f'c{idx}-' + el['id']
    for a in body.find_all('a', href=True):
        if a['href'].startswith('#') and len(a['href']) > 1:
            a['href'] = f'#c{idx}-' + a['href'][1:]
    # --- đường dẫn tương đối -> tuyệt đối (file tạm nằm ở .cache, không dùng <base> để liên kết # vẫn nội bộ) ---
    base_url = paths.file_url(folder) + '/'
    for el in soup.find_all(['img', 'link', 'script', 'source', 'object', 'embed']):
        for attr in ('src', 'href', 'data'):
            v = el.get(attr)
            if v and not re.match(r'^[a-z][a-z0-9+.-]*:|^#|^/', v):
                el[attr] = urljoin(base_url, v)

    compact = bool(body.select('.vgrid, ul.phr, .tn-table'))
    head.append(BeautifulSoup(head_links(compact), 'html.parser'))
    head.append(BeautifulSoup(mj_conf(), 'html.parser'))
    open(out_html, 'w', encoding='utf8').write(str(soup))
    return str(head)


def appendix_html(appx, headhtml, hrefmap=None):
    if not appx:
        return None
    terms, syms = {}, {}
    for kind, hdr, rows, idx in appx:
        tgt = (syms if kind == 'sym' else terms).setdefault(hdr, {})
        for r in rows:
            key = re.sub(r'\s+', ' ', BeautifulSoup(''.join(r), 'html.parser').get_text(' ', strip=True))
            if key in tgt:
                tgt[key][1].add(idx)
            else:
                tgt[key] = (r, {idx})

    def table(hdr, d):
        th = ''.join(f'<th>{html.escape(h)}</th>' for h in hdr) + '<th class="chcol">Ch.</th>'
        trs = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) +
                      f'<td class="chcol">{", ".join(map(str, sorted(s)))}</td></tr>' for r, s in d.values())
        return f'<div class="tablewrap"><table class="cmp"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>'

    parts = ['<main><header class="page-head"><h1>Phụ lục: Thuật ngữ và ký hiệu</h1><p class="lead">Các bảng thuật ngữ '
             'và ký hiệu toán học ở cuối mỗi chương được gom về đây. Cột “Ch.” cho biết chương có dùng mục đó.</p></header>']
    if terms:
        parts.append('<section class="part"><div class="wrap"><h2>Bảng thuật ngữ</h2>')
        for i, (hdr, d) in enumerate(terms.items(), 1):
            if len(terms) > 1:
                parts.append(f'<h3>Bảng {i}: {html.escape(" / ".join(hdr[:2]))}</h3>')
            parts.append(table(hdr, d))
        parts.append('</div></section>')
    if syms:
        parts.append('<section class="part"><div class="wrap"><h2>Ký hiệu toán học</h2>'
                     '<p>Cột giữa là cách đọc thường dùng trong sách và bài giảng tiếng Anh.</p>')
        for hdr, d in syms.items():
            parts.append(table(hdr, d))
        parts.append('</div></section>')
    parts.append('</main>')
    soup = BeautifulSoup(''.join(parts), 'html.parser')
    for a in soup.find_all('a'):
        href = a.get('href', '')
        if href.startswith(('http:', 'https:', 'mailto:')):
            continue
        base = href.split('#')[0]
        if hrefmap and base in hrefmap:
            a['href'] = f'{GOTO}chap/{hrefmap[base]}'
        else:
            a.unwrap()
    return f'<!doctype html><html lang="vi">{headhtml}<body>{soup}</body></html>'
