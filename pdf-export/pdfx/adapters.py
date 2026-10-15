"""Xử lý riêng cho minh họa có nội dung chữ quan trọng nằm trong JS.

Hiện có: demo "survival" (my-collection/song-con): các tình huống trong đối tượng SC, ILL
được viết ra thành văn bản đầy đủ thay vì chỉ chụp một tab.
"""
import json
import os

from . import snapshots


def survival_applies(folder, soup):
    return soup.select_one('#demoSurvival') is not None and \
        os.path.exists(os.path.join(folder, 'lib', 'demos', 'survival.js'))


def survival_data(pg, folder):
    s = open(os.path.join(folder, 'lib', 'demos', 'survival.js'), encoding='utf8').read()
    a, b = s.find('const R ='), s.find('function heatIndexF')
    if a < 0 or b < 0:
        return None
    code = s[a:b] + '\nreturn {SC, ILL};'
    return pg.evaluate('(c) => (new Function(c))()', code)


def survival_html(data, snaps):
    """snaps: {'flood': 'path.png', 'heat': 'path.png'} (có thể thiếu)."""
    SC, ILL = data['SC'], data['ILL']

    def box(t, cls, items):
        if not items:
            return ''
        return f'<div class="sc-box {cls}"><h4>{t}</h4><ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul></div>'

    lab3 = {'flood': 'Sau lũ', 'quake': 'Sau khi hết rung', 'heat': 'Nhận biết và xử trí', 'cold': 'Nhận biết và xử trí'}
    tool_title = {'flood': 'Nước chảy sâu bao nhiêu là nguy hiểm', 'heat': 'Chỉ số nóng: cơ thể cảm thấy nóng tới đâu'}
    out = ['<h2>Làm gì khi gặp nguy</h2>']
    for k, S in SC.items():
        out.append(f'<h3>{S["name"]}</h3>')
        if S.get('sub'):
            out.append('<div class="callout">Khi ở một mình, hãy gọi trợ giúp <b>sớm hơn</b> bình thường: gọi 115 (cấp cứu), '
                       'gọi hàng xóm hoặc người thân, và mở khóa cửa để người khác vào được. Số khẩn cấp ở Việt Nam: '
                       '<b>115</b> cấp cứu y tế, <b>114</b> cứu hỏa, cứu nạn cứu hộ, <b>113</b> công an, <b>112</b> tìm kiếm cứu nạn.</div>')
            for D in ILL.values():
                out.append(f'<h4 class="sc-sub">{D["name"]}</h4>')
                out.append(box('Làm ngay', 'now', D.get('now')) + box('Không nên', 'no', D.get('no')) +
                           box('Thêm', 'after', D.get('after')) + box('Cần cấp cứu khi', 'sos', D.get('sos')))
        else:
            out.append(box('Làm ngay', 'now', S.get('now')) + box('Không nên', 'no', S.get('no')) +
                       box(lab3.get(k, 'Thêm'), 'after', S.get('after')) + box('Cần cấp cứu khi', 'sos', S.get('sos')))
            t = S.get('tool')
            if t and snaps.get(t) and os.path.exists(snaps[t]):
                out.append(f'<div class="demo" data-snap="{snaps[t]}"><div class="demo-title"><h4>{tool_title.get(t, "Minh họa")}</h4></div></div>')
        refs = ', '.join(f'<a href="#ref{n}">[{n}]</a>' for n in S.get('src', []))
        if refs:
            out.append(f'<p class="sc-src">Nguồn: {refs}. Chỉ để tham khảo, không thay thế huấn luyện sơ cứu.</p>')
    return '\n'.join(out)


def survival_snaps(browser, folder, href, outdir):
    os.makedirs(outdir, exist_ok=True)
    res = {}
    for key, clicks in [('flood', ()), ('heat', ('[data-svk=heat]',))]:
        p = os.path.join(outdir, f'tool_{key}.png')
        try:
            snapshots.snap_selector(browser, folder, href, p, clicks=clicks)
            if os.path.exists(p):
                res[key] = p
        except Exception as e:
            print(f'    (bỏ qua công cụ {key}: {str(e)[:80]})')
    return res
