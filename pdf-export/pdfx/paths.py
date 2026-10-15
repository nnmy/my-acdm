"""Đường dẫn dùng chung. Mọi file tạm và PDF đều nằm trong thư mục pdf-export/."""
import os
import pathlib

TOOL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../my-library/pdf-export
STYLES = os.path.join(TOOL, 'styles')
CACHE = os.path.join(TOOL, '.cache')
FONT_DIR = os.path.join(CACHE, 'fonts')
MATHJAX = os.path.join(CACHE, 'mathjax', 'tex-svg-full.js')
FONTS_CSS = os.path.join(CACHE, 'fonts.css')
WORK = os.path.join(CACHE, 'work')
OUTPUT = os.path.join(TOOL, 'output')


def file_url(p):
    return pathlib.Path(os.path.abspath(p)).as_uri()


def css(name):
    return file_url(os.path.join(STYLES, name))
