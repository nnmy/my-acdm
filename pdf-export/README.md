# pdf-export

Công cụ chạy trên máy cá nhân: xuất **một** thư mục nội dung (ví dụ `intro-bem`) thành **một** file PDF
để đọc trên tablet e-ink màu. Không có trang web, không gắn link ở đâu cả.

PDF xuất ra **không có cổng mật khẩu**. Thư mục `output/` đã được bỏ qua trong `.gitignore`;
đừng đưa PDF lên repo hay GitHub Pages.

## Cài đặt (một lần)

```bash
cd my-library/pdf-export
python -m pip install -r requirements.txt
python -m playwright install chromium
```

Lần chạy đầu, công cụ tự tải font (Be Vietnam Pro, Noto Sans) và MathJax vào `.cache/`.
Chữ Hán, kana dùng font CJK có sẵn trên máy (Windows, macOS đều có).

## Dùng

```bash
python pdf_export.py ../intro-bem
python pdf_export.py ../../my-collection/song-con
```

Công cụ liệt kê các chương rồi hỏi **tên sách** và **tên file PDF**, kèm giá trị mặc định
(lấy từ tiêu đề trang `index.html`, dấu `&` đổi thành "và"). Nhấn Enter để giữ, hoặc gõ tên mới.

Tùy chọn:

| Tùy chọn | Ý nghĩa |
|---|---|
| `--title "…"` | đặt tên sách, không hỏi |
| `--file ten.pdf` | đặt tên file, không hỏi |
| `--author "…"` | tác giả trên bìa (mặc định `NNM x AI`) |
| `--out thư-mục` | nơi lưu PDF (mặc định `pdf-export/output`) |
| `--no-demos` | không chụp minh họa tương tác (nhanh hơn) |
| `-y` | dùng mọi giá trị mặc định, không hỏi |

Mỗi cuốn mất khoảng 15–90 giây tùy số minh họa.

## PDF gồm những gì

- **Bìa:** tên sách, pixel art của thư mục (lấy từ `SECTIONS` ở `index.html` của trang chủ; không có thì dùng hình quyển sách), tác giả.
- **Mục lục:** chương và các mục `h2`, bấm được; PDF có bookmark.
- **Header và footer:** header là tên sách; footer có tên chương bên trái, số trang bên phải.
  Bấm vào số trang để về mục lục, đúng trang mục lục có dòng của chương đang đọc
  (vùng bấm khai báo ở `PAGENUM_HIT` trong `pdfx/layout.py`).
- **Các chương:**
  - Minh họa tương tác được chụp thành ảnh, có chú thích "Hình x.y". Câu sát hình kiểu "demo này", "trên demo" được đổi thành tên hình.
  - Phần lịch sử (timeline) chuyển thành đoạn văn.
- **Phụ lục:** gom mọi bảng thuật ngữ và ký hiệu toán học của các chương.
- **Thuật ngữ:** tiếng Anh (kèm IPA nếu tra được), tiếng Việt, diễn nghĩa, xếp theo ABC.

## Quy ước nội dung mà công cụ dựa vào

Các trang hiện có đều đã theo những quy ước dưới đây. Trang mới chỉ cần giữ chúng là xuất đúng.

| Thành phần | Quy ước |
|---|---|
| Danh sách chương | mảng `PAGES` trong `index.html` của thư mục; thiếu `PAGES` thì `index.html` là chương duy nhất. Mục `done: false` bị bỏ qua |
| Tên chương | `.page-head h1` |
| Bảng gom về phụ lục | `section#bang`, `section#thuat-ngu` (thuật ngữ), `section#ky-hieu` (ký hiệu) |
| Lịch sử | `ol.timeline > li` gồm `.yr`, `h4`, `p` |
| Hình tĩnh | `figure.fig` + `figcaption` |
| Minh họa | `div.demo`, tên trong `.demo-title h4` dùng làm chú thích |
| Nhóm thu gọn | `details.grp` có `summary .t` (thành tiêu đề mục) |
| Thuật ngữ trong bài | `<span class="term">…</span> <span class="en">(…)</span>` |

Trang có `.vgrid`, `ul.phr` hoặc `.tn-table` (tiếng Hoa, tiếng Nhật) tự dùng kiểu trình bày gọn.
Minh họa `survival` (song-con) có xử lý riêng trong `pdfx/adapters.py`: các tình huống trong `SC`/`ILL`
được viết ra đầy đủ. Nếu đổi cấu trúc hai biến này thì sửa adapter theo.

## Thuật ngữ: tự trích hoặc file `pdf-glossary.txt`

Mặc định công cụ tự trích thuật ngữ từ cặp `.term` / `.en` (diễn nghĩa là câu chứa thuật ngữ) và từ các bảng thuật ngữ.
Muốn sửa, bổ sung hay thay hẳn, đặt file `pdf-glossary.txt` trong thư mục nội dung:

```
# chú thích
English | IPA | Tiếng Việt | Diễn nghĩa
English | IPA | Tiếng Việt | 中文 | pinyin | Diễn nghĩa
```

- Mục trong file ghi đè mục tự trích có cùng từ tiếng Anh.
- Thêm dòng `#!only` để chỉ dùng file, không tự trích (đang dùng cho tiếng Hoa, tiếng Nhật).
- IPA để trống thì công cụ tra bằng gói `eng_to_ipa`; không tra được thì để trống.
- Có cột tiếng Trung thì tiêu đề trang thành "Thuật ngữ Anh – Việt – Trung".

## Cấu trúc thư mục

```
pdf-export/
  pdf_export.py      lệnh chính
  pdfx/              book (đọc thư mục), chapters (chuẩn bị trang in), snapshots (chụp minh họa),
                     adapters, glossary, layout (bìa, mục lục, header/footer, ghép PDF), assets, paths
  styles/            CSS cho e-ink: eink.css (nội dung), book.css (bìa, mục lục, thuật ngữ),
                     compact.css (trang ngôn ngữ), fonts.css.tmpl
  .cache/            font, MathJax, file tạm (tự tạo, tự xóa file tạm sau mỗi lần chạy)
  output/            PDF
```

File tạm (bản sao trang đã bỏ dòng cổng mật khẩu) chỉ nằm trong `.cache/work/` và bị xóa khi xuất xong.
Công cụ không sửa bất kỳ file nào trong các thư mục nội dung hay `common/`.
