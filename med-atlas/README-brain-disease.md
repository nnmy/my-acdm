# Ảnh bệnh cho trang MRI não (`med-atlas/1-brain-mri.html`)

Trên trình xem của trang MRI não có một hàng nút: **MRI não người khoẻ** (trình xem atlas), **Bệnh Alzheimer** và **Đột quỵ nhồi máu**. Mỗi lúc chỉ hiện một trình xem. Lần đầu bấm một nút bệnh, trang mới nạp `lib/compare.js`, `lib/compare.css` và dữ liệu ca đó, rồi hiện trình xem bệnh (ảnh người khoẻ | ảnh bệnh nhân, cùng lát cắt, khoanh vùng bệnh hiện sẵn) đúng chỗ trình xem atlas. Điểm ghim trong trình xem bệnh vào chung danh sách **Ghim** và file PDF.

`1b-brain-disease.html` là trang soạn ca (không có liên kết từ trang chính): có thanh chọn mọi ca trong `cases.json` và nút **Chép tọa độ** để lấy tọa độ cho marker.

Muốn thêm hoặc bỏ một bệnh trên trang chính: sửa `lib/data/brain-disease/cases.json` và các nút `data-view` trong `1-brain-mri.html`.

## Các file

|Đường dẫn|Nội dung|Ai tạo|
|-|-|-|
|`lib/compare.js`, `lib/compare.css`|Trình xem so sánh|Có sẵn|
|`lib/data/brain-disease/cases.json`|Danh sách ca, thứ tự nút|Viết tay|
|`lib/data/brain-disease/<ca>/case.json`|Tiêu đề, dấu hiệu, vùng khoanh, marker, nguồn, giấy phép|Viết tay (đã có bản nháp)|
|`lib/data/brain-disease/<ca>/meta.json` + `\*.u8.gz` / `\*.png`|Ảnh, nhãn, thể tích|`tools/prepare\_disease\_cases.py`|

Hai ca: `alzheimer-1` (bệnh nhân OASIS-1, người khoẻ ds003592) và `stroke-1` (bệnh nhân SOOP ds004889, người khoẻ ds003592).

## Nguyên tắc register (áp dụng cho Alzheimer và đột quỵ)

* **Ảnh hiển thị chỉ dùng rigid** (xoay + dời, 6 bậc tự do) vào template của trang. Không dùng affine có co giãn và không dùng phi tuyến cho ảnh, vì chúng làm mất teo não.
* **Phi tuyến chỉ dùng để đưa nhãn atlas sang từng người:** warp template sang ảnh người đó (đã rigid), rồi áp lên `mni\_seg.nii.gz` bằng nội suy nhãn (nearest / GenericLabel).
* **Mọi đầu ra nằm sẵn trên lưới template** (193 × 225 × 188, 1 mm): dùng `mni\_t1.nii.gz` làm ảnh tham chiếu khi resample. Gộp các phép biến đổi để mỗi ảnh chỉ nội suy một lần.

Bạn dùng công cụ nào cũng được. Lệnh bên dưới viết cho ANTs làm ví dụ; với FSL hoặc SPM, chỉ cần đầu ra thoả ba điều trên.

## Bước 0. Cài đặt và xuất template (một lần)

```bash
pip install nibabel numpy scipy pillow
cd my-acdm/med-atlas/tools
python prepare\_disease\_cases.py export-template --out \~/mri-work/template
```

Bạn sẽ có trong `\~/mri-work/template/`:

* `mni\_t1.nii.gz`, `mni\_t2.nii.gz`: template, dùng làm ảnh đích.
* `mni\_seg.nii.gz`: nhãn 1..107, đúng bộ nhãn của trang atlas.
* `mni\_brainmask.nii.gz`: mặt nạ não của template.

Giữ mọi file gốc và file trung gian **ngoài** thư mục `my-acdm`.

Quy trình chung cho một người (ANTs), gọi là **quy trình R**:

```bash
T=\~/mri-work/template
# 1) rigid: ảnh người -> template. Đầu ra sub\_rigid\_Warped.nii.gz đã nằm trên lưới template
antsRegistrationSyN.sh -d 3 -f $T/mni\_t1.nii.gz -m sub\_t1.nii.gz -t r -o sub\_rigid\_
# 2) phi tuyến: template -> ảnh người đã rigid (chỉ để lấy nhãn)
antsRegistrationSyN.sh -d 3 -f sub\_rigid\_Warped.nii.gz -m $T/mni\_t1.nii.gz -t s -o tpl2sub\_
# 3) đưa nhãn atlas sang người đó
antsApplyTransforms -d 3 -i $T/mni\_seg.nii.gz -r sub\_rigid\_Warped.nii.gz \\
  -t tpl2sub\_1Warp.nii.gz -t tpl2sub\_0GenericAffine.mat -n GenericLabel -o sub\_seg.nii.gz
```

Kiểm tra bằng mắt trước khi đóng gói:

* Mở `sub\_rigid\_Warped.nii.gz` chồng lên `mni\_t1.nii.gz`: hai não phải cùng tư thế.
* **Trái/phải không bị lật.** Rigid không sửa được ảnh bị lật, và ảnh định dạng Analyze cũ (.hdr/.img) hay gặp lỗi này.
* Mở `sub\_seg.nii.gz` chồng lên ảnh người đó: hồi hải mã, não thất và nhân nền phải nằm đúng chỗ.

## Bước 1. Alzheimer: OASIS-1

1. **Tải:** vào trang OASIS (https://sites.wustl.edu/oasisbrains/), chọn **OASIS-1** và đồng ý Data Use Agreement. Tải kèm file thông tin người tham gia (CSV) để chọn ca.
2. **Chọn hai người:**

   * Bệnh nhân: CDR 1 (hoặc 2), khoảng 70-80 tuổi, ảnh không bị nhiễu do cử động.
   * Người khoẻ: CDR 0, cùng giới, tuổi lệch không quá 3 năm.
   * Nên xem trước vài ca: chọn bệnh nhân có teo hồi hải mã nhìn thấy rõ, để ảnh có giá trị minh hoạ.
3. **Ảnh dùng:** bản T1 đã xử lý **trong không gian của chính người đó** (ảnh trung bình các lần quét). **Không dùng bản đã đưa vào không gian atlas (T88)**, vì bản đó đã bị co giãn affine. Nếu chỉ có ảnh .hdr/.img, hãy chuyển sang NIfTI và kiểm tra hướng trái/phải.
4. **Register:** chạy quy trình R cho từng người. Đặt tên đầu ra là `ctl\_t1.nii.gz` / `ctl\_seg.nii.gz` cho người khoẻ và `pat\_t1.nii.gz` / `pat\_seg.nii.gz` cho bệnh nhân.
5. **Đóng gói:**

```bash
   python prepare\_disease\_cases.py volume-case --case ../lib/data/brain-disease/alzheimer-1 \\
     --control t1=dat-alzheimer/ctl\_t1.nii.gz --control-seg dat-alzheimer/ctl\_seg.nii.gz \\
     --patient t1=dat-alzheimer/pat\_t1.nii.gz --patient-seg dat-alzheimer/pat\_seg.nii.gz
   ```

6. **Sửa `alzheimer-1/case.json`:** điền `panes.\*.detail`, ví dụ `"Nữ, 76 tuổi, CDR 1, MMSE 21"`. Không ghi mã người tham gia.

## Bước 2. Đột quỵ nhồi máu: SOOP và ds003592

1. **Tải bệnh nhân:** trên https://openneuro.org, tìm "Stroke Outcome Optimization Project". **Kiểm tra mục License của dataset là CC0** trước khi tải. Tải T1, FLAIR, DWI và mặt nạ tổn thương của **một** người, không cần tải cả bộ.
2. **Chọn ca:**

   * Tổn thương vừa phải (khoảng 10-60 mL), nằm trọn trong một lãnh thổ mạch máu.
   * Thấy rõ trên DWI.
   * Lát cắt mỏng nhất có thể.
   * Ghi lại mặt nạ tổn thương nằm trên ảnh nào (DWI hay T1). DWI nếu là ảnh 4D thì tách đúng một volume (b1000 hoặc trace).
   * Nếu có ADC, tải thêm để đối chiếu.
3. **Tải người khoẻ:** OpenNeuro **ds003592** (kiểm tra License là CC0). Chọn một người cao tuổi cùng giới, tuổi gần với bệnh nhân, lấy T1 và FLAIR.
4. **Register bệnh nhân:**

```bash
   # FLAIR và DWI -> T1 của chính bệnh nhân (rigid)
   antsRegistrationSyN.sh -d 3 -f pat\_t1.nii.gz -m pat\_flair.nii.gz -t r -o flair2t1\_
   antsRegistrationSyN.sh -d 3 -f pat\_t1.nii.gz -m pat\_dwi.nii.gz   -t r -o dwi2t1\_
   # T1 -> template (rigid), như bước 1 của quy trình R
   antsRegistrationSyN.sh -d 3 -f $T/mni\_t1.nii.gz -m pat\_t1.nii.gz -t r -o pat\_rigid\_
   # đưa FLAIR, DWI lên lưới template (gộp hai phép rigid, nội suy một lần)
   antsApplyTransforms -d 3 -i pat\_flair.nii.gz -r $T/mni\_t1.nii.gz -t pat\_rigid\_0GenericAffine.mat -t flair2t1\_0GenericAffine.mat -n Linear -o pat\_flair\_tpl.nii.gz
   antsApplyTransforms -d 3 -i pat\_dwi.nii.gz   -r $T/mni\_t1.nii.gz -t pat\_rigid\_0GenericAffine.mat -t dwi2t1\_0GenericAffine.mat   -n Linear -o pat\_dwi\_tpl.nii.gz
   # mặt nạ tổn thương: cùng chuỗi biến đổi với ảnh chứa nó (ví dụ nằm trên DWI)
   antsApplyTransforms -d 3 -i lesion.nii.gz -r $T/mni\_t1.nii.gz -t pat\_rigid\_0GenericAffine.mat -t dwi2t1\_0GenericAffine.mat -n NearestNeighbor -o lesion\_tpl.nii.gz
   ```

   Nếu T1 của bệnh nhân quá kém (ảnh lâm sàng lát dày), hãy dùng FLAIR làm ảnh neo thay cho T1.

5. **Warp nhãn, loại trừ vùng tổn thương:**

   * Tạo mặt nạ "dùng để register", bằng 1 ở mọi nơi trừ tổn thương đã nới rộng:

```python
     import nibabel as nib, numpy as np; from scipy import ndimage as ndi
     m = nib.load('lesion\_tpl.nii.gz'); les = m.get\_fdata() > 0.5
     nib.save(nib.Nifti1Image((\~ndi.binary\_dilation(les, iterations=3)).astype(np.uint8), m.affine), 'incl\_tpl.nii.gz')
     ```

   * Chạy bước 2 và 3 của quy trình R, thêm `-x incl\_tpl.nii.gz` vào lệnh `antsRegistrationSyN.sh` ở bước 2.
6. **Register người khoẻ:** quy trình R cho T1. FLAIR register rigid vào T1 của người đó, rồi đưa lên template như với bệnh nhân.
7. **Đóng gói:**

```bash
   python prepare\_disease\_cases.py volume-case --case ../lib/data/brain-disease/stroke-1 \\
     --control t1=ctl\_t1\_tpl.nii.gz --control flair=ctl\_flair\_tpl.nii.gz --control-seg ctl\_seg.nii.gz \\
     --patient t1=pat\_rigid\_Warped.nii.gz --patient flair=pat\_flair\_tpl.nii.gz --patient dwi=pat\_dwi\_tpl.nii.gz \\
     --patient-seg pat\_seg.nii.gz --lesion lesion\_tpl.nii.gz
   ```

   Nếu có ADC, thêm `--patient adc=pat\_adc\_tpl.nii.gz`. Nếu script báo nhiều voxel bị cắt ở 255, hạ mức tham chiếu, ví dụ `--ref dwi=70`.

8. **Sửa `stroke-1/case.json`:**

   * Điền `detail` cho hai khung.
   * Đối chiếu từng dấu hiệu với ảnh thật: bên tổn thương, mức FLAIR đã sáng chưa (phụ thuộc thời gian từ lúc khởi phát).
   * Xoá dấu hiệu không thấy trên ảnh.

## Bước 3. Parkinson

Đã bỏ khỏi trang. Lệnh `slice-case` của script vẫn còn, nhưng trình xem hiện chỉ hiển thị ca dạng khối (`volume-case`).

## Bước 4. Xem trên máy, đặt marker, duyệt nội dung

1. Trong thư mục `my-acdm`, chạy `python -m http.server`, rồi mở `http://localhost:8000/med-atlas/1-brain-mri.html` và bấm nút một bệnh trên hàng nút của trình xem. Để soạn ca, mở `1b-brain-disease.html?case=stroke-1`.
2. **Lấy toạ độ cho marker** (ở `1b-brain-disease.html`): nhấp vào ảnh để khoá điểm, bấm **Chép tọa độ**, rồi dán vào `case.json`:

```json
   "markers": \[
     { "kind": "circle", "mm": \[-11.4, -19.8, -11.0], "r": 3, "text": "Hồi hải mã teo", "pane": "both" },
     { "kind": "arrow",  "mm": \[-27, -9, -4], "text": "Vùng hạn chế khuếch tán", "mods": \["dwi"], "dir": 135 }
   ]
   ```

   * Vòng tròn (`circle`), mũi tên (`arrow`) và chữ hiện cùng lớp **Khoanh vùng bệnh** (phím H), mặc định bật.
   * `dir` là hướng đuôi mũi tên (độ, 0 = sang phải, 90 = lên trên).
   * Ở ca dạng khối, marker chỉ hiện trên các lát cách tâm nó không quá 2 mm.
3. **Kiểm tra:**

   * Ở ca Alzheimer: viền hồi hải mã, não thất có nằm đúng trên ảnh từng người không? Nếu lệch nhiều, làm lại bước phi tuyến.
   * Bảng "cấu trúc bị ảnh hưởng" của ca đột quỵ có khớp với vị trí tổn thương bạn thấy không?
   * Mọi dấu hiệu trong `findings` có thật sự thấy trên ảnh không?
   * Phần nguồn (`sources`: `cite`, `title`, `url`; trang chỉ hiện 60 ký tự đầu của tên công trình), `license` và `acknowledgment` đúng với dữ liệu bạn dùng. Với OASIS, `acknowledgment` phải đúng mẫu trong Data Use Agreement bạn đã đồng ý.

## Ghi chú

* Mỗi ca khoảng 4-12 MB, chỉ tải khi người xem bấm nút bệnh đó.
* Script tự xoá mọi thứ ngoài não (theo nhãn đã warp, nới 2 voxel), nên khuôn mặt không xuất hiện trên trang. Đừng dùng `--keep-head`.
* Cường độ được chuẩn hoá để trung vị chất trắng của mỗi người bằng một mức chung theo chuỗi xung, rồi hai khung dùng chung cửa sổ hiển thị. Con số "% chất trắng" khi rê chuột tính theo mức này.

