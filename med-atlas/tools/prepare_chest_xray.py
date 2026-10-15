#!/usr/bin/env python3
"""
=====================================================================
CHUẨN BỊ DỮ LIỆU X-QUANG NGỰC  (med-atlas/tools/prepare_chest_xray.py)
Chạy MỘT LẦN trên máy tính để tạo ảnh cho trang 2-chest-xray.html.
Trang web không cần Python; chỉ đọc các file mà script này tạo ra.

Đầu vào (giải nén vào một thư mục bất kỳ, NẰM NGOÀI repo):
  --nih <thư mục>        ảnh NIH ChestX-ray14 (PNG 1024 × 1024), tìm cả trong thư mục con
  --bbox <file csv>      BBox_List_2017.csv của ChestX-ray14 (khung khoanh vùng do bác sĩ vẽ)
  --entry <file csv>     Data_Entry_2017.csv (tuổi, giới, hướng chụp)
  --montgomery <thư mục> bản sao bộ Montgomery: CXR/, ManualMask/leftMask/, ManualMask/rightMask/, ClinicalReadings/

Danh sách ca nằm trong CASES ngay bên dưới: id thư mục -> (nguồn, tên ảnh gốc).
Muốn đổi ảnh minh họa: sửa CASES rồi chạy lại.

Đầu ra (thư mục lib/data/chest-xray/<id>/):
  image.png       ảnh xám 8 bit, cạnh dài tối đa 1024 px (ảnh NIH giữ nguyên 1024 × 1024)
  lung-r.png      mặt nạ phổi PHẢI người bệnh (chỉ ca Montgomery), đen trắng, cùng kích thước ảnh
  lung-l.png      mặt nạ phổi TRÁI người bệnh (chỉ ca Montgomery)
  meta.json       kích thước, nguồn, tuổi, giới, khung khoanh vùng của bác sĩ (tọa độ pixel của image.png)
Nội dung chữ (case.json, anatomy.json) viết tay; script KHÔNG đụng tới.

Cách chạy:
  pip install numpy pillow
  python prepare_chest_xray.py --nih <thư mục NIH> --bbox BBox_List_2017.csv --entry Data_Entry_2017.csv \
      --montgomery <thư mục Montgomery> --out ../lib/data/chest-xray
=====================================================================
"""
import argparse, csv, glob, json, os
import numpy as np
from PIL import Image

CASES = {
    'normal':       ('montgomery', 'MCUCXR_0001_0'),
    'tuberculosis': ('montgomery', 'MCUCXR_0108_1'),
    'pneumonia':    ('nih', '00021710_003.png'),
    'effusion':     ('nih', '00021181_002.png'),
    'pneumothorax': ('nih', '00021782_028.png'),
    'cardiomegaly': ('nih', '00021443_000.png'),
    'mass':         ('nih', '00022192_003.png'),
    'nodule':       ('nih', '00013951_001.png'),
}
MAX_SIDE = 1024


def find(folder, name):
    hits = glob.glob(os.path.join(folder, '**', name), recursive=True)
    if not hits:
        raise SystemExit('Không tìm thấy ' + name + ' trong ' + folder)
    return hits[0]


def fit(size):
    w, h = size
    s = min(1.0, MAX_SIDE / max(w, h))
    return (max(1, round(w * s)), max(1, round(h * s))), s


def save_gray(img, path):
    img.convert('L').save(path, optimize=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nih', required=True)
    ap.add_argument('--bbox', required=True)
    ap.add_argument('--entry', required=True)
    ap.add_argument('--montgomery', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    boxes, entry = {}, {}
    with open(a.bbox, newline='', encoding='utf-8') as f:
        r = csv.reader(f); next(r)
        for row in r:
            boxes.setdefault(row[0], []).append({'label': row[1], 'xywh': [float(v) for v in row[2:6]]})
    with open(a.entry, newline='', encoding='utf-8') as f:
        r = csv.reader(f); next(r)
        for row in r:
            entry[row[0]] = {'labels': row[1], 'age': int(row[4]), 'sex': row[5], 'view': row[6],
                             'orig_size': [int(row[7]), int(row[8])], 'orig_spacing_mm': [float(row[9]), float(row[10])]}

    for cid, (src, name) in CASES.items():
        out = os.path.join(a.out, cid); os.makedirs(out, exist_ok=True)
        meta = {'id': cid, 'source': src, 'source_image': name}
        if src == 'nih':
            img = Image.open(find(a.nih, name))
            (w, h), s = fit(img.size)
            if s != 1.0: img = img.resize((w, h), Image.LANCZOS)
            save_gray(img, os.path.join(out, 'image.png'))
            e = entry[name]
            meta.update({'size': [w, h], 'age': e['age'], 'sex': e['sex'], 'view': e['view'], 'nih_labels': e['labels'],
                         # khoảng cách pixel của image.png (ảnh NIH đã bị thu từ ảnh gốc xuống 1024 px)
                         'pixel_mm': round(e['orig_spacing_mm'][0] * e['orig_size'][0] / 1024 / s, 4),
                         'expert_boxes': [{'label': b['label'], 'xywh': [round(v * s, 1) for v in b['xywh']]} for b in boxes.get(name, [])]})
        else:
            img = Image.open(find(os.path.join(a.montgomery, 'CXR'), name + '.png')).convert('L')
            # cắt bỏ dải đen hoàn toàn ở mép ảnh (phần đầu thu không có phim)
            arr = np.asarray(img); rows = np.nonzero(arr.max(1) > 20)[0]; cols = np.nonzero(arr.max(0) > 20)[0]
            crop = (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)
            img = img.crop(crop)
            (w, h), s = fit(img.size)
            save_gray(img.resize((w, h), Image.LANCZOS), os.path.join(out, 'image.png'))
            # Lưu ý: trong bộ Montgomery, leftMask/rightMask đặt tên theo BÊN TRÁI/PHẢI CỦA ẢNH.
            # Phim chụp thẳng hiển thị phổi phải người bệnh ở bên trái ảnh, nên leftMask = phổi PHẢI người bệnh.
            # (Đã kiểm tra: tâm của leftMask nằm ở nửa trái ảnh, cùng phía với chữ R đánh dấu trên phim.)
            for side, folder in (('r', 'leftMask'), ('l', 'rightMask')):
                m = Image.open(find(os.path.join(a.montgomery, 'ManualMask', folder), name + '.png')).convert('L').crop(crop)
                m = (np.asarray(m.resize((w, h), Image.BILINEAR)) > 127).astype(np.uint8) * 255
                Image.fromarray(m).save(os.path.join(out, 'lung-' + side + '.png'), optimize=True)
            txt = open(find(os.path.join(a.montgomery, 'ClinicalReadings'), name + '.txt'), encoding='utf-8', errors='replace').read()
            lines = [l.strip() for l in txt.splitlines() if l.strip()]
            sex = next((l.split(':')[1].strip() for l in lines if l.lower().startswith("patient's sex")), '')
            age = next((l.split(':')[1].strip() for l in lines if l.lower().startswith("patient's age")), '')
            reading = ' '.join(l for l in lines if not l.lower().startswith("patient's"))
            # ảnh Montgomery: pixel gốc 0,0875 mm (theo mô tả bộ dữ liệu)
            meta.update({'size': [w, h], 'age': int(''.join(c for c in age if c.isdigit()) or 0), 'sex': sex,
                         'view': 'PA', 'clinical_reading': reading, 'pixel_mm': round(0.0875 / s, 4),
                         'expert_masks': {'lung-r': 'lung-r.png', 'lung-l': 'lung-l.png'},
                         'crop_from_original': list(crop)})
        meta['bytes'] = os.path.getsize(os.path.join(out, 'image.png'))
        with open(os.path.join(out, 'meta.json'), 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=1)
        print(cid, meta['size'], meta['bytes'] // 1024, 'KB')


if __name__ == '__main__':
    main()
