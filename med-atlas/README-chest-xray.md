# X-quang ngực (`med-atlas/2-chest-xray.html`)

Trang có một hàng nút: **Bình thường** và 7 ca bệnh (lao phổi, viêm phổi, tràn dịch màng phổi, tràn khí màng phổi, tim to, u phổi, nốt phổi).

- **Bình thường**: một phim. Rê chuột hoặc chạm để nhận diện cấu trúc, nhấp để khóa và xem tên, đặc điểm, ý nghĩa lâm sàng.
- **Ca bệnh**: hai phim cạnh nhau (bình thường | bệnh), khoanh vùng bệnh hiện sẵn.
- Mỗi nút ghi tên bệnh tiếng Việt, bên dưới là từ khóa tiếng Anh (trường `en` trong `cases.json`).
- Khi khóa một điểm, nhãn cạnh điểm có icon ổ khóa; bấm vào nhãn đó (hoặc nút Bỏ khóa, phím Esc) để mở khóa.
  Khi đang khóa một cấu trúc, khung thông tin chỉ hiện thông tin cấu trúc (tên Anh + IPA, tên Việt, đặc điểm, ý nghĩa lâm sàng).
- Thanh **Khoanh vùng**: nấc 0 = tắt; nấc 1–4 = viền mảnh → rất dày; nấc cuối = tô màu vùng (khung bác sĩ và vòng AI cũng được tô nhạt).
  Áp dụng cho cả vùng giải phẫu lẫn khung, marker của ca bệnh. Phím H: tắt / bật lại nấc trước đó. Các nấc nằm trong `LEVELS` đầu `lib/cxr.js`.
- Ô **Tìm cấu trúc** ghi "Tên Việt - English"; vùng do AI vẽ có thêm "(AI)".
- Hàng **Ảnh**: độ sáng và tương phản. Nhấp đúp vào ảnh để phóng to, kéo để di chuyển; Ctrl/Alt + lăn chuột cũng phóng to.
- **Ghim và Xuất PDF** như trang MRI não: ghim một cấu trúc (nút Ghim khi đang khóa cấu trúc) hoặc cả ca bệnh (nút Ghim ca này).
  Ghim lưu trong IndexedDB `med-atlas` (organ `chest-xray`, tách khỏi ghim MRI não); PDF in qua `#printSheet` (định dạng trong `atlas.css`).
  Nội dung chữ trong PDF lấy từ `anatomy.json` / `case.json` hiện hành, nên sửa chữ xong thì ghim cũ cũng cập nhật.

## Quy ước nguồn khoanh vùng (bắt buộc giữ)

| Nguồn | Trong `case.json` | Hiển thị | Ví dụ |
|-|-|-|-|
| Bộ dữ liệu, do bác sĩ hoặc dưới sự giám sát của bác sĩ vẽ | `"source": "expert"`; khung NIH lấy tự động từ `meta.json` | Nét liền | Mặt nạ phổi Montgomery; khung đỏ NIH |
| **AI tự vẽ** | `"source": "ai"` và mọi phần tử trong `markers` | Nét đứt màu vàng, kèm câu **"khoanh vùng do AI tự vẽ, chưa được bác sĩ duyệt"** | Tim, khí quản, rốn phổi…; mũi tên, vòng tròn, đường đo |

Trình xem tự thêm chú thích AI vào chú giải dưới ảnh và khung thông tin khi ca có vùng `ai` hoặc `markers`. Khi một bác sĩ đã duyệt một vùng, có thể đổi `source` của vùng đó thành `expert` và ghi người duyệt vào phần nguồn.

## Các file

| Đường dẫn | Nội dung | Ai tạo |
|-|-|-|
| `lib/cxr.js`, `lib/cxr.css` | Trình xem (dùng chung `lib/atlas.css`) | Có sẵn |
| `lib/data/chest-xray/cases.json` | Danh sách ca, thứ tự, chữ trên nút (`label`) và từ khóa tiếng Anh (`en`) | Viết tay |
| `lib/data/chest-xray/anatomy.json` | Tên Việt/Anh, IPA (`ipa`, giọng Mỹ, không kèm dấu /), màu, đặc điểm, ý nghĩa lâm sàng của từng cấu trúc | Viết tay |
| `lib/data/chest-xray/<ca>/case.json` | Tiêu đề, tóm tắt, dấu hiệu, vùng nhận diện (`structures`), marker AI, nguồn, giấy phép | Viết tay |
| `lib/data/chest-xray/<ca>/image.png`, `meta.json`, `lung-r.png`, `lung-l.png` | Ảnh, kích thước, tuổi, giới, khung của bác sĩ, mặt nạ phổi | `tools/prepare_chest_xray.py` |

**Sửa chữ, vùng, marker chỉ cần sửa JSON, không cần chạy Python.** Tọa độ trong `case.json` là pixel của `image.png` (gốc ở góc trên trái).

### Cú pháp `structures` và `markers`

```json
"structures": [
  { "key": "phoi-phai", "source": "expert", "mask": "lung-r.png" },
  { "key": "tim", "source": "ai", "poly": [[470, 340], [560, 335], [745, 550], [470, 575]] },
  { "key": "quai-dmc", "source": "ai", "ellipse": [588, 265, 22, 30] },
  { "key": "vom-hoanh-phai", "source": "ai", "line": [[185, 590], [330, 530], [448, 570]], "width": 14 }
],
"markers": [
  { "kind": "circle", "at": [652, 158], "r": 24, "text": "Hang lao (gợi ý)", "lab": "left" },
  { "kind": "ellipse", "at": [690, 300], "rx": 125, "ry": 165, "text": "Tổn thương thùy trên trái", "lab": "below" },
  { "kind": "arrow", "at": [360, 470], "dir": 225, "text": "Nốt rải rác phổi phải" },
  { "kind": "line", "pts": [[325, 690], [790, 690]], "text": "Bề ngang tim", "lab": "above" }
]
```

- `key` phải có trong `anatomy.json`. Tại một điểm thuộc nhiều vùng, vùng nhỏ nhất được chọn (rốn phổi thắng phổi).
- `dir`: hướng đuôi mũi tên (độ, 0 = sang phải, 90 = lên trên). `lab`: vị trí chữ (`above`, `below`, `left`, `right`).
- Lấy tọa độ: mở `image.png` trong phần mềm xem ảnh có hiện tọa độ pixel (GIMP, Paint.NET, Photoshop), hoặc trong Python: `plt.imshow(img); plt.grid()`.

## Tạo lại ảnh bằng Python

Chỉ cần khi đổi ảnh minh họa. Danh sách ca và ảnh gốc nằm trong biến `CASES` đầu file `tools/prepare_chest_xray.py`.

```bash
pip install numpy pillow
cd my-library/med-atlas/tools
python prepare_chest_xray.py --nih ~/cxr-source/nih_cxr \
  --bbox ~/cxr-source/BBox_List_2017.csv --entry ~/cxr-source/Data_Entry_2017.csv \
  --montgomery ~/cxr-source/Montgomery --out ../lib/data/chest-xray
```

Thư mục Montgomery cần có `CXR/`, `ManualMask/leftMask/`, `ManualMask/rightMask/`, `ClinicalReadings/`. Giữ dữ liệu gốc **ngoài** repo.

- **Mặt nạ Montgomery đặt tên theo bên của ảnh**: `leftMask` là phổi bên trái ẢNH, tức phổi PHẢI người bệnh. Script đã đổi lại (`lung-r.png` = phổi phải người bệnh). Nếu dùng bản sao khác, kiểm tra lại bằng cách mở ảnh: chữ R trên phim phải cùng phía với `lung-r.png`.
- Ảnh NIH ChestX-ray14 nằm trong 12 file nén `images_001` … `images_012`, xếp theo tên ảnh; số ảnh mỗi file: 4999, rồi 10000 × 10, rồi 7121. Muốn biết một ảnh nằm trong file nào, sắp xếp `Data_Entry_2017.csv` theo tên ảnh rồi đếm.
- Sau khi chạy lại, nếu kích thước ảnh đổi, tọa độ trong `case.json` phải sửa theo.

## Ảnh đang dùng

| Ca | Ảnh gốc | Lý do chọn |
|-|-|-|
| normal | Montgomery MCUCXR_0001_0 (nữ 27) | Phim người lớn bình thường, có mặt nạ phổi |
| tuberculosis | Montgomery MCUCXR_0108_1 (nam 40) | Lao hang thùy trên trái, có kết luận đọc phim |
| pneumonia | NIH 00021710_003 | Nhãn gốc "Infiltration"; đám mờ đáy phổi trái |
| effusion | NIH 00021181_002 | Tràn dịch phải, thấy rõ bờ cong lõm |
| pneumothorax | NIH 00021782_028 | Bên phải; đường màng phổi mảnh, nên được bác sĩ xem lại trước |
| cardiomegaly | NIH 00021443_000 | |
| mass | NIH 00022192_003 | |
| nodule | NIH 00013951_001 | |

Ảnh NIH được lọc: chụp thẳng PA, 18–80 tuổi, chỉ đúng một nhãn bệnh, đúng một khung khoanh vùng.

## Giấy phép và trích dẫn

- **NIH ChestX-ray14**: NIH Clinical Center; sử dụng không hạn chế, yêu cầu ghi nguồn NIH Clinical Center, dẫn link trang tải và trích dẫn Wang X và cs., CVPR 2017.
- **Montgomery County (NLM)**: trích dẫn Jaeger S và cs., Quant Imaging Med Surg 2014;4(6):475-477 và Candemir S và cs., IEEE TMI 2014;33(2):577-590. Ảnh lấy qua bản sao trên Kaggle: nên kiểm tra điều khoản của bản sao đó.

## Chưa làm

- Phù phổi, khí phế thũng: đã bỏ vì bộ dữ liệu không có khoanh vùng của bác sĩ.
- Xương đòn, bóng hơi dạ dày: không khoanh vì ranh giới trên ảnh này không đủ rõ.
