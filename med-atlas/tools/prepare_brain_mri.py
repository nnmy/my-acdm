#!/usr/bin/env python3
"""
=====================================================================
CHUẨN BỊ DỮ LIỆU MRI NÃO  (med-atlas/tools/prepare_brain_mri.py)
Chạy MỘT LẦN trên máy tính để tạo dữ liệu cho trang 1-brain-mri.html.
Trang web không cần Python; chỉ đọc các file mà script này tạo ra.

Đầu vào (tải về từ trang gốc, giải nén vào một thư mục):
  - ICBM 2009c Nonlinear Symmetric (MINC1 hoặc NIfTI), https://nist.mni.mcgill.ca/
      mni_icbm152_t1_tal_nlin_sym_09c.(mnc|nii)        ảnh T1
      mni_icbm152_t2_tal_nlin_sym_09c.(mnc|nii)        ảnh T2
      mni_icbm152_t1_tal_nlin_sym_09c_mask.(mnc|nii)   mặt nạ não
      mni_icbm152_{wm,gm,csf}_tal_nlin_sym_09c.(mnc|nii)  bản đồ xác suất mô
  - CerebrA, https://gin.g-node.org/anamanera/CerebrA   (CerebrA.nii)

Đầu ra (thư mục lib/data/brain-mri/):
  t1.u8.gz, t2.u8.gz   cường độ 0..255 (tuyến tính, 0 = không tín hiệu), gzip
  seg.u8.gz            nhãn 0..107 (xem bên dưới), gzip
  meta.json            kích thước, gốc tọa độ MNI, mức tham chiếu, điểm đại diện mỗi nhãn

Thứ tự voxel: x nhanh nhất, rồi y, rồi z (chỉ số = x + nx*(y + ny*z)), hướng RAS:
  x tăng sang PHẢI người bệnh, y tăng ra TRƯỚC, z tăng lên TRÊN; 1 voxel = 1 mm.

Nhãn:
  1..51   CerebrA, bán cầu PHẢI      52..102  CerebrA, bán cầu TRÁI (= nhãn phải + 51)
  103/104 chất trắng đại não phải/trái  (bổ sung từ bản đồ xác suất WM của ICBM)
  105     dịch não tủy ngoài não thất   (bổ sung từ bản đồ xác suất CSF của ICBM)
  106     trong não nhưng chưa phân loại
  107     ngoài não (da đầu, xương sọ, mô mềm)
  0       nền (không khí)
Voxel trong não mà CerebrA không gán nhãn, nếu chất xám chiếm ưu thế và cách nhãn
CerebrA gần nhất <= 3 mm, được gán theo nhãn gần nhất (viền vỏ não do thể tích từng phần).

Cách chạy:
  pip install nibabel numpy scipy
  python prepare_brain_mri.py --icbm <thư mục ICBM> --cerebra <đường dẫn CerebrA.nii> --out ../lib/data/brain-mri
=====================================================================
"""
import argparse, glob, gzip, json, os
import numpy as np
import nibabel as nib
from scipy import ndimage as ndi


def load_ras(path):
    img = nib.as_closest_canonical(nib.load(path))
    return np.asanyarray(img.dataobj).astype(np.float32), img.affine


def find(folder, stem):
    for ext in ('.mnc', '.nii', '.nii.gz'):
        hits = glob.glob(os.path.join(folder, '**', stem + ext), recursive=True)
        if hits:
            return hits[0]
    raise SystemExit('Không tìm thấy ' + stem + ' trong ' + folder)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--icbm', required=True)
    ap.add_argument('--cerebra', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--margin', type=int, default=3, help='lề (voxel) quanh đầu khi cắt vùng trống')
    a = ap.parse_args()

    st = 'mni_icbm152_%s_tal_nlin_sym_09c'
    T1, aff = load_ras(find(a.icbm, st % 't1'))
    T2, aff2 = load_ras(find(a.icbm, st % 't2'))
    MASK, _ = load_ras(find(a.icbm, st % 't1' + '_mask'))
    WM, _ = load_ras(find(a.icbm, st % 'wm'))
    GM, _ = load_ras(find(a.icbm, st % 'gm'))
    CSF, _ = load_ras(find(a.icbm, st % 'csf'))
    CB, affc = load_ras(a.cerebra)
    for A in (aff2, affc):
        assert np.allclose(A, aff), 'Các ảnh không cùng lưới voxel'
    assert np.allclose(np.abs(np.diag(aff)[:3]), 1), 'Cần voxel 1 mm'
    CB = np.rint(CB).astype(np.uint8)

    # ---------- nhãn ----------
    lab = CB.copy()
    brain = MASK > 0.5
    un = (lab == 0) & brain
    xs = np.arange(lab.shape[0])[:, None, None]
    x0 = int(round(-aff[0, 3]))                      # chỉ số voxel của x = 0 mm (đường giữa)
    wm = un & (WM >= np.maximum(GM, CSF))
    lab[wm & (xs >= x0)] = 103
    lab[wm & (xs < x0)] = 104
    csf = un & ~wm & (CSF >= GM)
    lab[csf] = 105
    un = (lab == 0) & brain
    dist, ind = ndi.distance_transform_edt(CB == 0, return_indices=True)
    near = CB[tuple(ind)]
    fill = un & (dist <= 3)
    lab[fill] = near[fill]
    lab[(lab == 0) & brain] = 106

    # đầu = vùng có tín hiệu (T1 hoặc T2), lấp lỗ, giữ khối lớn nhất
    sm = ndi.gaussian_filter(np.maximum(T1 / np.percentile(T1, 99.5), T2 / np.percentile(T2, 99.5)), 1.0)
    head = sm > 0.12
    cc, n = ndi.label(head)
    if n > 1:
        sizes = ndi.sum(head, cc, range(1, n + 1))
        head = cc == (1 + int(np.argmax(sizes)))
    head = ndi.binary_closing(head, iterations=3)
    for z in range(head.shape[2]):
        head[:, :, z] = ndi.binary_fill_holes(head[:, :, z])
    head |= brain
    lab[(lab == 0) & head] = 107

    # ---------- cắt vùng trống ----------
    idx = np.argwhere(head)
    lo = np.maximum(idx.min(0) - a.margin, 0)
    hi = np.minimum(idx.max(0) + a.margin + 1, lab.shape)
    sl = tuple(slice(l, h) for l, h in zip(lo, hi))
    T1c, T2c, labc, WMc, GMc, CSFc = T1[sl], T2[sl], lab[sl], WM[sl], GM[sl], CSF[sl]
    origin_mm = [float(aff[i, 3] + lo[i]) for i in range(3)]   # tọa độ MNI (mm) của voxel (0,0,0) sau khi cắt

    # ---------- cường độ: tuyến tính, 0 -> 0, phân vị 99.9 trong đầu -> 255 ----------
    hc = head[sl]
    def to_u8(v):
        ref = float(np.percentile(v[hc], 99.9))
        return np.clip(np.rint(np.maximum(v, 0) / ref * 255), 0, 255).astype(np.uint8)
    u1, u2 = to_u8(T1c), to_u8(T2c)
    u1[labc == 0] = 0; u2[labc == 0] = 0      # nền không khí = 0 (nén tốt hơn nhiều)

    def med(u, m):
        return round(float(np.median(u[m])), 2)
    wm_ref = np.isin(labc, (103, 104)) & (WMc > 0.9)
    gm_ref = (labc >= 1) & (labc <= 102) & (GMc > 0.8)
    csf_ref = np.isin(labc, (41, 92)) & (CSFc > 0.9)    # não thất bên
    ref = {k: {'wm': med(u, wm_ref), 'gm': med(u, gm_ref), 'csf': med(u, csf_ref)} for k, u in (('t1', u1), ('t2', u2))}
    win = {k: [int(np.percentile(u[hc], 1)), int(np.percentile(u[hc], 99.7))] for k, u in (('t1', u1), ('t2', u2))}

    # ---------- điểm đại diện mỗi nhãn: voxel nằm sâu trong cấu trúc, gần tâm khối ----------
    seeds = {}
    for k in np.unique(labc):
        if k in (0, 106, 107):
            continue
        m = labc == k
        d = ndi.distance_transform_edt(m)
        c = np.array(ndi.center_of_mass(m))
        pts = np.argwhere(d >= max(1.0, d.max() * 0.6))
        p = pts[np.argmin(((pts - c) ** 2).sum(1))]
        seeds[int(k)] = [int(v) for v in p]
    counts = {int(k): int(v) for k, v in zip(*np.unique(labc, return_counts=True))}

    os.makedirs(a.out, exist_ok=True)
    for name, arr in (('t1', u1), ('t2', u2), ('seg', labc)):
        raw = np.ascontiguousarray(arr.transpose(2, 1, 0)).tobytes()   # x nhanh nhất
        with gzip.GzipFile(os.path.join(a.out, name + '.u8.gz'), 'wb', compresslevel=9, mtime=0) as f:
            f.write(raw)
    sizes = {n: os.path.getsize(os.path.join(a.out, n + '.u8.gz')) for n in ('t1', 't2', 'seg')}
    meta = {
        'title': 'MNI ICBM152 2009c Nonlinear Symmetric + CerebrA',
        'dims': [int(v) for v in labc.shape],
        'order': 'x-fastest, RAS, 1 mm isotropic',
        'origin_mm': origin_mm,
        'files': {'t1': 't1.u8.gz', 't2': 't2.u8.gz', 'seg': 'seg.u8.gz'},
        'bytes': sizes,                                   # để hiện thanh tiến trình khi tải
        'ref': ref,
        'window': win,
        'seeds': seeds,
        'voxels': counts,
    }
    with open(os.path.join(a.out, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    print('dims', meta['dims'], 'origin', origin_mm)
    print('ref', ref, 'window', win)
    for n in ('t1', 't2', 'seg'):
        print(n, os.path.getsize(os.path.join(a.out, n + '.u8.gz')) // 1024, 'KB')


if __name__ == '__main__':
    main()
