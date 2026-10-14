#!/usr/bin/env python3
"""Tạo bản băm cho một mã mở khóa mới (dùng với common/gate.js).
   python gate_hash.py <mã>
   Dán dòng in ra vào danh sách HASHES trong gate.js. SALT và ITER phải giống trong gate.js.
   Đừng lưu mã gốc trong repo (kể cả trong lịch sử commit)."""
import hashlib, re, sys, unicodedata
SALT = '276fe92fd02d531189918104aa6eaee3'
ITER = 200000
if len(sys.argv) != 2:
    sys.exit('Cách dùng: python gate_hash.py <mã>')
s = unicodedata.normalize('NFD', sys.argv[1])
s = re.sub(r'[\u0300-\u036f]', '', s).replace('đ', 'd').replace('Đ', 'd').lower()
code = re.sub(r'[^a-z0-9]', '', s)
print("'%s'," % hashlib.pbkdf2_hmac('sha256', code.encode(), bytes.fromhex(SALT), ITER).hex())
