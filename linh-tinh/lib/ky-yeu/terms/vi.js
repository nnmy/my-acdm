/* =====================================================================
   Thuật ngữ tiếng Việt cho kỷ yếu xuất ra (PDF, PNG, DOCX).
   Sửa chữ hiển thị ở đây (vai trò cũng là danh sách gợi ý khi nhập); KHÔNG đổi các mã bên trái (undergrad, master, ...) vì dữ liệu đã lưu dùng các mã này.
   Thêm ngôn ngữ mới: chép file này thành <mã>.js (ví dụ ja.js), dịch phần chữ, rồi thêm <script> vào index.html.
   ===================================================================== */
window.KY_TERMS = window.KY_TERMS || {};
window.KY_TERMS.vi = {
  langName: 'Tiếng Việt',
  roles: {
    undergrad: 'Sinh viên đại học',
    master: 'Học viên thạc sĩ',
    phd: 'Nghiên cứu sinh',
    postdoc: 'Nghiên cứu sau tiến sĩ',
    researcher: 'Nghiên cứu viên',
    lecturer: 'Giảng viên',
    assoc_prof: 'Phó giáo sư',
    prof: 'Giáo sư',
    staff: 'Nhân viên',
    visiting: 'Thành viên thỉnh giảng',
    other: 'Khác',
  },
  reasons: {
    graduated: 'Tốt nghiệp',
    transferred: 'Chuyển lab',
    contract_end: 'Hết hợp đồng',
    other: 'Khác',
  },
  contacts: { email: 'Email', phone: 'Điện thoại', address: 'Chỗ ở', custom: 'Liên lạc khác' },
  labels: {
    born: 'Sinh',
    hometown: 'Quê quán',
    period: 'Thời gian',
    role: 'Vai trò',
    research: 'Hướng nghiên cứu',
    workplace: 'Nơi làm việc',
    since: 'từ',
    updated: 'cập nhật',
    address: 'Địa chỉ',
    family: 'Gia đình',
    note: 'Ghi chú',
    present: 'nay',
    reason: 'Lý do rời',
    members: 'thành viên',
    page: 'Trang',
  },
  // định dạng ngày: d = {y, m, d} (m, d có thể thiếu)
  formatDate(dt, mode) {
    const p = n => String(n).padStart(2, '0');
    if (mode === 'year') return dt.y ? String(dt.y) : '';
    if (mode === 'daymonth') return dt.d && dt.m ? `${p(dt.d)}/${p(dt.m)}` : '';
    if (dt.d && dt.m) return `${p(dt.d)}/${p(dt.m)}/${dt.y}`;
    return dt.y ? String(dt.y) : '';
  },
  defaults: {
    header: '<b>{lab}</b><br><small>{unit}</small>',
    footer: '{page}',
    coverSub: 'Kỷ yếu thành viên',
  },
};
