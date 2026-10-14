/* =====================================================================
   Omics: minh họa "Phễu phát triển thuốc và chỗ AI tham gia" (id: drug-pipeline, trang 5-ai.html)
   Nhúng vào trang: <div class="demo" id="demoDrug" data-demo="drug-pipeline"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=drug-pipeline

   Tỉ lệ chuyển pha (mọi nhóm bệnh, 2011–2020): Pha I→II 52,0%; II→III 28,9%; III→nộp hồ sơ 57,8%;
   hồ sơ→được duyệt 90,6%; khả năng được duyệt từ pha I ≈ 7,9% (BIO, Informa Pharma Intelligence, QLS,
   "Clinical Development Success Rates 2011–2020", 2021). Thời gian 10–15 năm (PhRMA).
   Thanh trượt "AI cải thiện pha II" là GIẢ ĐỊNH để thấy pha nào ảnh hưởng nhiều tới kết quả chung.
   ===================================================================== */
(() => {
const { COLORS: C, num, range, watchCanvas } = OMICS;
const ST = [
  { n: 'Tìm đích', t: 'khoảng 1–3 năm (gộp trong 3–6 năm khám phá và tiền lâm sàng)', p: null,
    d: 'Xác định protein hoặc gene mà nếu tác động vào sẽ chữa được bệnh, và kiểm chứng điều đó trên tế bào, động vật.',
    ai: 'So sánh dữ liệu omics giữa mô bệnh và mô khỏe; GWAS và di truyền học người (một phân tích năm 2024 cho thấy đích thuốc có bằng chứng di truyền ở người có khả năng được duyệt cao hơn khoảng 2,6 lần); đồ thị tri thức nối gene, bệnh, thuốc; phân tích màn hình CRISPR.' },
  { n: 'Tìm và tối ưu hợp chất', t: 'khoảng 1–3 năm', p: null,
    d: 'Sàng lọc hàng nghìn tới hàng triệu phân tử để tìm "hit", rồi chỉnh sửa hóa học thành hợp chất dẫn đầu đủ mạnh, đủ chọn lọc, đủ an toàn.',
    ai: 'Dự đoán cấu trúc protein đích (AlphaFold); sàng lọc ảo hàng tỉ phân tử bằng docking và học máy; mô hình sinh (generative) đề xuất phân tử mới; dự đoán hấp thu, phân bố, chuyển hóa, thải trừ và độc tính (ADMET).' },
  { n: 'Tiền lâm sàng', t: 'khoảng 1–2 năm', p: null,
    d: 'Thử trên tế bào và động vật để đánh giá độc tính và liều trước khi được phép thử trên người.',
    ai: 'Dự đoán độc tính từ cấu trúc phân tử; phân tích ảnh mô bệnh học tự động; mô hình dược động học.' },
  { n: 'Pha I', t: 'khoảng 1–2 năm, vài chục người', p: 0.520,
    d: 'Thử trên một nhóm nhỏ, thường là người khỏe mạnh: thuốc có an toàn không, liều bao nhiêu.',
    ai: 'Mô hình hóa liều; dự đoán tác dụng phụ từ dữ liệu trước đó.' },
  { n: 'Pha II', t: 'khoảng 2 năm, vài trăm bệnh nhân', p: 0.289,
    d: 'Lần đầu kiểm tra thuốc có tác dụng trên bệnh nhân không. Đây là cửa ải hẹp nhất: phần lớn thất bại vì thuốc không hiệu quả như mong đợi, thường do chọn sai đích.',
    ai: 'Chọn bệnh nhân theo dấu ấn sinh học (biomarker) từ dữ liệu omics, để thử đúng nhóm người có khả năng đáp ứng; phân tích dữ liệu thử nghiệm.' },
  { n: 'Pha III', t: 'khoảng 3 năm, hàng nghìn bệnh nhân', p: 0.578,
    d: 'Thử nghiệm lớn, có nhóm đối chứng, để xác nhận hiệu quả và theo dõi tác dụng phụ hiếm.',
    ai: 'Chọn địa điểm và tuyển bệnh nhân; theo dõi từ xa; phát hiện sớm tín hiệu an toàn.' },
  { n: 'Xét duyệt', t: 'khoảng 1 năm', p: 0.906,
    d: 'Cơ quan quản lý (FDA, EMA, Bộ Y tế…) xem xét toàn bộ dữ liệu để cấp phép lưu hành.',
    ai: 'Ít vai trò trực tiếp; sau khi lưu hành, AI hỗ trợ theo dõi tác dụng phụ trên dữ liệu thực tế.' },
];

OMICS.demo('drug-pipeline', {
  domId: 'demoDrug',
  title: 'Phễu phát triển thuốc và chỗ AI tham gia',
  page: '5-ai.html',
  html: `<div class="demo-title"><h4>Phễu phát triển thuốc và chỗ AI tham gia</h4><span>Bấm vào từng giai đoạn</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvDrug" class="ar" role="img" aria-label="Phễu các giai đoạn phát triển thuốc từ tìm đích tới xét duyệt; với các pha lâm sàng, độ rộng thanh tỉ lệ với số thuốc còn lại trên 100 thuốc bắt đầu pha I."></canvas></div>
    <div class="panel">
      <h4 id="dgN" style="margin:0;font-size:19px"></h4>
      <dl class="readout"><dt>Thời gian</dt><dd id="dgT" style="font:500 14px var(--body)"></dd><dt>Tỉ lệ qua giai đoạn</dt><dd id="dgP" style="font:500 14px var(--body)"></dd></dl>
      <p id="dgD" style="margin:0;font-size:15px"></p>
      <div class="callout" style="margin:0;font-size:14.5px"><b>AI và dữ liệu giúp gì?</b> <span id="dgAI"></span></div>
      <div class="ctrl"><label for="dgX">Giả định: AI nâng tỉ lệ qua pha II lên</label><output for="dgX"></output><input type="range" id="dgX" min="0.289" max="0.6" step="0.005" value="0.289"></div>
      <dl class="readout" aria-live="polite"><dt>Được duyệt (thực tế 7,9%)</dt><dd class="big" id="dgL">—</dd></dl>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvDrug'), st = {};
    let sel = 4, boxes = [];
    const rX = range('dgX', { show: v => num(v * 100, 3) + '%' + (Math.abs(v - 0.289) < 1e-6 ? ' (thực tế)' : ''), onInput: () => upd() });
    const probs = () => ST.map((s, i) => i === 4 ? rX.get() : s.p);
    function upd() {
      const S = ST[sel], P = probs();
      document.getElementById('dgN').textContent = S.n; document.getElementById('dgT').textContent = S.t;
      document.getElementById('dgP').textContent = S.p ? num(P[sel] * 100, 3) + '%' + (sel === 4 && Math.abs(P[4] - 0.289) > 1e-6 ? ' (giả định; thực tế 28,9%)' : '') : 'không có số liệu chung đáng tin cậy';
      document.getElementById('dgD').textContent = S.d; document.getElementById('dgAI').textContent = S.ai;
      const loa = P.slice(3).reduce((a, b) => a * b, 1);
      document.getElementById('dgL').textContent = num(loa * 100, 3) + '%';
      draw();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const P = probs(), cx = W / 2, top = 40, rowH = (H - top - 30) / ST.length, maxW = W - 60;
      boxes = [];
      let alive = 100;
      ST.forEach((s, i) => {
        const y = top + i * rowH, h = rowH - 8;
        let w, lab;
        if (i < 3) { w = maxW * (1 - i * 0.06); lab = ['hàng nghìn tới hàng triệu phân tử', 'vài chục hợp chất dẫn đầu', 'vài ứng viên'][i]; }
        else { w = Math.max(30, maxW * 0.8 * alive / 100); lab = num(alive, 3) + ' thuốc'; }
        const x = cx - w / 2, on = i === sel;
        ctx.fillStyle = i < 3 ? (on ? '#7b4fbf' : '#c9bde6') : (on ? C.sea : '#bcd7ee'); ctx.fillRect(x, y, w, h);
        if (on) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }
        ctx.font = '700 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = on ? '#fff' : C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const txt = s.n + ': ' + lab, tw = ctx.measureText(txt).width;
        if (tw + 12 < w) ctx.fillText(txt, cx, y + h / 2); else { ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.fillText(txt, x - 8, y + h / 2); }
        if (i >= 3) { ctx.font = '500 11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('qua ' + num(P[i] * 100, 3) + '%', Math.min(W - 70, cx + w / 2 + 8), y + h / 2); alive *= P[i]; }
        boxes.push([x, y, w, h, i]);
      });
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Từ 100 thuốc bắt đầu thử trên người, còn bao nhiêu được duyệt?', 10, 10);
      ctx.textBaseline = 'bottom'; ctx.fillStyle = C.muted; ctx.fillText('Được duyệt: ' + num(alive, 3) + ' / 100. Tổng thời gian thường 10–15 năm.', 10, H - 6);
    }
    cv.addEventListener('click', ev => { const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      const b = boxes.find(([bx, by, bw, bh]) => y >= by && y <= by + bh && x >= Math.min(bx, st.W / 2 - 80) && x <= Math.max(bx + bw, st.W / 2 + 80)); if (b) { sel = b[4]; upd(); } });
    watchCanvas(cv, st, draw);
    rX.upd();
  },
});
})();
