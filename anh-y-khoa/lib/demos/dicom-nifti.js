/* =====================================================================
   Ảnh y khoa: minh họa "Một loạt ảnh, hai cách lưu" (id: dicom-nifti, trang 4-nifti-dicom.html)
   Một loạt ảnh MR trục (axial) giả định 24 lát, 256 × 256, pixel 0,9375 mm, lát dày 5 mm.
   - DICOM: 24 file, mỗi file một lát, có thẻ (tag) riêng; ImagePositionPatient đổi theo lát.
   - NIfTI: 1 file; header 348 byte + dữ liệu; ma trận affine (sform) theo hệ RAS+ suy ra từ các thẻ DICOM (LPS+).
   Mọi thông tin bệnh nhân ở đây là giả.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, setTxt, pressGroup, watchCanvas } = LT;
const NS = 24, DX = 0.9375, DZ = 5, IPP0 = [-120, -110, -40];
const f = v => (+v.toFixed(4)).toString();
LT.demo('dicom-nifti', {
  html: `<div class="demo-title"><h4>Một loạt ảnh, hai cách lưu</h4><span>Chọn một lát để xem thẻ DICOM; so với header NIfTI của cả khối</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvDn" class="ar" role="img" aria-label="Chồng 24 file DICOM bên trái và một file NIfTI bên phải"></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="dnK">Lát (file DICOM)</label><output for="dnK"></output><input type="range" id="dnK" min="1" max="${NS}" value="8"></div>
      <div class="btnrow" role="group" aria-label="Xem">
        <button class="btn" type="button" data-dv="dcm" aria-pressed="true">Thẻ DICOM của lát</button><button class="btn" type="button" data-dv="nii" aria-pressed="false">Header NIfTI</button>
      </div>
      <div class="checks"><label><input type="checkbox" id="dnAn"> Ẩn danh hóa</label></div>
      <div style="max-height:330px;overflow:auto;border:1px solid var(--line);background:#fff"><table class="tagtbl" id="dnTab"></table></div>
      <p class="note-s" id="dnNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = root.querySelector('#cvDn'), st = {}, an = root.querySelector('#dnAn');
    let view = 'dcm';
    const bs = [...root.querySelectorAll('[data-dv]')];
    bs.forEach(b => b.addEventListener('click', () => { pressGroup(bs, b); view = b.dataset.dv; draw(); }));
    const rK = range('dnK', { show: v => `IM-${String(v).padStart(4, '0')}.dcm`, onInput: draw });
    an.addEventListener('change', draw);
    function rows(k) {
      const z = IPP0[2] + (k - 1) * DZ, A = an.checked;
      const uid = A ? '2.25.' + (918273645 + k) : '1.2.840.99999.1.20260312.8.' + k;
      if (view === 'dcm') return [
        ['(0008,0018)', 'SOPInstanceUID', uid, 'id'],
        ['(0008,0020)', 'StudyDate', A ? '(đã xóa)' : '20260312', 'pt'],
        ['(0008,0060)', 'Modality', 'MR'],
        ['(0008,0080)', 'InstitutionName', A ? '(đã xóa)' : 'BENH VIEN DEMO', 'pt'],
        ['(0008,103E)', 'SeriesDescription', 'T1_SE_AX'],
        ['(0010,0010)', 'PatientName', A ? '(đã xóa)' : 'TRAN^THI^MAI', 'pt'],
        ['(0010,0020)', 'PatientID', A ? 'ANON-0001' : 'BN00123', 'pt'],
        ['(0010,0030)', 'PatientBirthDate', A ? '(đã xóa)' : '19800101', 'pt'],
        ['(0018,0050)', 'SliceThickness', '5'],
        ['(0018,0080)', 'RepetitionTime', '500'],
        ['(0018,0081)', 'EchoTime', '15'],
        ['(0018,0087)', 'MagneticFieldStrength', '1.5'],
        ['(0020,0013)', 'InstanceNumber', String(k), 'hl'],
        ['(0020,0032)', 'ImagePositionPatient', `${f(IPP0[0])}\\${f(IPP0[1])}\\${f(z)}`, 'hl'],
        ['(0020,0037)', 'ImageOrientationPatient', '1\\0\\0\\0\\1\\0'],
        ['(0020,1041)', 'SliceLocation', f(z), 'hl'],
        ['(0028,0010)', 'Rows', '256'], ['(0028,0011)', 'Columns', '256'],
        ['(0028,0030)', 'PixelSpacing', `${f(DX)}\\${f(DX)}`],
        ['(0028,0100)', 'BitsAllocated', '16'],
        ['(7FE0,0010)', 'PixelData', '131 072 byte (một lát)'],
      ];
      return [
        ['0', 'sizeof_hdr', '348'],
        ['40', 'dim', `[3, 256, 256, ${NS}, 1, 1, 1, 1]`, 'hl'],
        ['70', 'datatype', '4 (int16)'], ['72', 'bitpix', '16'],
        ['76', 'pixdim', `[1, ${f(DX)}, ${f(DX)}, ${DZ}, 0, 0, 0, 0]`, 'hl'],
        ['108', 'vox_offset', '352'],
        ['112', 'scl_slope / scl_inter', '1 / 0'],
        ['123', 'xyzt_units', '10 (mm, giây)'],
        ['148', 'descrip', 'T1_SE_AX'],
        ['252', 'qform_code / sform_code', '1 / 1 (tọa độ máy chụp)'],
        ['280', 'srow_x', `[${f(-DX)}, 0, 0, ${f(-IPP0[0])}]`, 'hl'],
        ['296', 'srow_y', `[0, ${f(-DX)}, 0, ${f(-IPP0[1])}]`, 'hl'],
        ['312', 'srow_z', `[0, 0, ${DZ}, ${f(IPP0[2])}]`, 'hl'],
        ['344', 'magic', '"n+1"'],
        ['352', '(dữ liệu ảnh)', `${256 * 256 * NS * 2} byte (cả ${NS} lát)`],
      ];
    }
    function draw() {
      const k = rK.get(), R = rows(k);
      root.querySelector('#dnTab').innerHTML = (view === 'dcm' ? '<tr><td>Thẻ</td><td>Tên</td><td>Giá trị</td></tr>' : '<tr><td>Byte</td><td>Trường</td><td>Giá trị</td></tr>')
        + R.map(([a, b, c, cls]) => `<tr class="${cls === 'hl' ? 'hl' : cls === 'pt' && an.checked ? 'gone' : ''}"><td>${a}</td><td>${b}</td><td class="v">${c}</td></tr>`).join('');
      setTxt('dnNote', view === 'dcm'
        ? `Lát ${k}: ImagePositionPatient cho biết góc trên trái của lát nằm ở z = ${f(IPP0[2] + (k - 1) * DZ)} mm (hệ LPS của DICOM). Mỗi file lặp lại toàn bộ thông tin bệnh nhân và cách chụp.${an.checked ? ' Ẩn danh hóa xóa hoặc thay các thẻ định danh, và tạo UID mới.' : ''}`
        : 'NIfTI gói cả 24 lát vào một mảng 3D. Ba hàng srow là ma trận affine đổi chỉ số voxel (i, j, k) sang tọa độ mm theo hệ RAS+: hai trục đầu đổi dấu so với DICOM (LPS+). Header không có tên, ngày sinh bệnh nhân.');
      drawStack(k);
    }
    function drawStack(k) {
      if (!st.ctx) return;
      const { ctx, W, H } = st, font = getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const half = W / 2, sw = Math.min(half * 0.62, 150), sh = sw * 0.45, dz = Math.min(9, (H - 120) / NS);
      const slab = (x, y, fill, stroke, lw = 1.5) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y); ctx.lineTo(x + sw + sh * 0.6, y - sh); ctx.lineTo(x + sh * 0.6, y - sh); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); };
      const x0 = half / 2 - (sw + sh * 0.6) / 2, base = H - 50;
      for (let s = 1; s <= NS; s++) {   // DICOM: lát rời, mỗi lát một file
        const y = base - (s - 1) * dz;
        slab(x0, y, s === k ? 'rgba(242,194,48,.9)' : '#fff', s === k ? C.ink : '#97A3AD', s === k ? 2 : 1);
      }
      { const y = base - (k - 1) * dz; ctx.save(); ctx.globalAlpha = 0.55; slab(x0, y, C.gold, C.ink, 2); ctx.restore(); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + sw, y); ctx.lineTo(x0 + sw + sh * 0.6, y - sh); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = C.ink; ctx.font = '600 14px ' + font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('DICOM: ' + NS + ' file', half / 2, 12); ctx.font = '12.5px ' + font; ctx.fillStyle = C.muted;
      ctx.fillText('mỗi file = 1 lát + thẻ riêng', half / 2, 32);
      ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.fillText(`← IM-${String(k).padStart(4, '0')}.dcm`, x0 + sw + sh * 0.6 + 6, base - (k - 1) * dz - sh / 2 - 6);
      // NIfTI: một khối
      const bx = half + half / 2 - (sw + sh * 0.6) / 2, top = base - (NS - 1) * dz;
      ctx.fillStyle = 'rgba(123,205,232,.35)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, base); ctx.lineTo(bx + sw, base); ctx.lineTo(bx + sw, top); ctx.lineTo(bx, top); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + sw, base); ctx.lineTo(bx + sw + sh * 0.6, base - sh); ctx.lineTo(bx + sw + sh * 0.6, top - sh); ctx.lineTo(bx + sw, top); ctx.closePath(); ctx.fillStyle = 'rgba(55,135,196,.35)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx + sw, top); ctx.lineTo(bx + sw + sh * 0.6, top - sh); ctx.lineTo(bx + sh * 0.6, top - sh); ctx.closePath(); ctx.fillStyle = 'rgba(123,205,232,.6)'; ctx.fill(); ctx.stroke();
      const yk = base - (k - 1) * dz; ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, yk); ctx.lineTo(bx + sw, yk); ctx.lineTo(bx + sw + sh * 0.6, yk - sh); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = '600 14px ' + font; ctx.textAlign = 'center'; ctx.fillText('NIfTI: 1 file', half + half / 2, 12);
      ctx.font = '12.5px ' + font; ctx.fillStyle = C.muted; ctx.fillText('header 348 byte + khối 3D', half + half / 2, 32);
      ctx.fillStyle = C.pos; ctx.textAlign = 'left'; ctx.fillText('k = ' + (k - 1), bx + sw + sh * 0.6 + 6, yk - sh / 2 - 6);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(half, 54); ctx.lineTo(half, H - 20); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = '12px ' + font; ctx.fillText('dcm2niix', half, H - 34); LT.arrow(ctx, half - 26, H - 16, half + 26, H - 16, C.ink, 1.5, 7);
    }
    watchCanvas(cv, st, () => drawStack(rK.get())); rK.upd();
  },
});
})();
