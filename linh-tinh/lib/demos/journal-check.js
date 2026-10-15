/* =====================================================================
   Linh tinh: minh họa "Tạp chí này có đáng tin không?" (id: journal-check, trang xuat-ban.html)
   Danh sách tự kiểm tra trước khi nộp bài. Các dấu hiệu tổng hợp từ:
   - Think. Check. Submit. (thinkchecksubmit.org);
   - Shamseer et al., BMC Medicine 2017 (đặc điểm phân biệt tạp chí săn mồi với tạp chí hợp lệ);
   - Grudniewicz et al., Nature 2019 (định nghĩa đồng thuận);
   - COPE, DOAJ, OASPA, WAME: Principles of Transparency and Best Practice in Scholarly Publishing.
   Trọng số và ngưỡng do người soạn chọn để minh họa: đây KHÔNG phải công cụ phân loại đã được kiểm chứng.
   Hai dấu hiệu "nghiêm trọng" (khai man chỉ mục; website không khớp danh mục chính thức) tự động cho mức cao nhất.
   EDIT: mảng FLAGS và GOOD.
   ===================================================================== */
(() => {
const FLAGS = [
  ['crit', 'Ghi là có trong Web of Science / Scopus, nhưng tra trên Master Journal List / Scopus Sources không thấy (hoặc đã bị loại).', 'Tra mjl.clarivate.com và scopus.com/sources bằng ISSN, không chỉ bằng tên.'],
  ['crit', 'Website khác với địa chỉ ghi trong Master Journal List / Scopus, hoặc tên gần giống một tạp chí nổi tiếng.', 'Dấu hiệu tạp chí bị chiếm đoạt (hijacked). Luôn vào website qua liên kết trong danh mục chính thức; tra thêm Hijacked Journal Checker của Retraction Watch.'],
  [3, 'Hứa duyệt và xuất bản rất nhanh (vài ngày tới hai tuần).', 'Bình duyệt thật cần thời gian tìm người phản biện và chờ họ đọc.'],
  [3, 'Khoe các "chỉ số" lạ: Global Impact Factor, Universal Impact Factor, Index Copernicus Value, "IF" không ghi nguồn…', 'Chỉ JCR của Clarivate mới cấp Journal Impact Factor.'],
  [2, 'Nhận email mời nộp bài, mời làm biên tập không quen biết, lời lẽ tâng bốc.', ''],
  [2, 'Phí xuất bản (APC) không công bố rõ trên website, hoặc chỉ báo sau khi bài được nhận.', 'Tạp chí truy cập mở hợp lệ cũng thu phí, nhưng công bố rõ từ đầu.'],
  [2, 'Không mô tả quy trình bình duyệt; ban biên tập không có thông tin tra được, hoặc có người không biết mình có tên trong đó.', ''],
  [2, 'Phạm vi chủ đề quá rộng, ghép các ngành không liên quan.', ''],
  [2, 'Không có ISSN, hoặc ISSN không tra được trên ISSN Portal.', ''],
  [1, 'Website nhiều lỗi chính tả, hình ảnh mờ, logo cơ sở dữ liệu dùng tùy tiện.', ''],
  [1, 'Chỉ có email miễn phí (gmail…) hoặc địa chỉ liên hệ không rõ ràng.', ''],
  [1, 'Các bài đã đăng chất lượng kém hoặc lạc đề so với tên tạp chí.', ''],
];
const GOOD = [
  [-2, 'Có trong Master Journal List hoặc Scopus Sources, và website khớp địa chỉ trong danh mục.'],
  [-1, 'Là tạp chí truy cập mở có trong DOAJ.'],
  [-1, 'Nhà xuất bản là thành viên COPE hoặc OASPA.'],
  [-1, 'Thầy hướng dẫn, đồng nghiệp trong ngành biết tạp chí và từng đọc, trích dẫn bài ở đó.'],
];
const LEVELS = [[0, 'Chưa thấy dấu hiệu đáng ngại', '#2e9d4f', 'Vẫn nên tra các danh mục chính thức và hỏi người trong ngành trước khi nộp.'],
  [3, 'Cần kiểm tra thêm', '#b8860b', 'Có vài dấu hiệu chưa ổn. Tra kỹ ISSN, danh mục, ban biên tập; hỏi thầy hướng dẫn hoặc thư viện trường.'],
  [6, 'Rủi ro cao', '#e07b39', 'Nhiều dấu hiệu của tạp chí săn mồi. Không nên nộp bài nếu chưa xác minh được từng điểm.'],
  [99, 'Rủi ro rất cao', '#d8312a', 'Có dấu hiệu nghiêm trọng hoặc quá nhiều dấu hiệu. Tránh nộp bài; nếu đã nộp, có thể rút bài trước khi trả phí.']];

LT.demo('journal-check', {
  domId: 'demoCheck',
  title: 'Tạp chí này có đáng tin không?',
  page: 'xuat-ban.html',
  html: `<style>
    #demoCheck .jc { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: 22px; }
    #demoCheck fieldset { border: 0; margin: 0 0 14px; padding: 0; }
    #demoCheck legend { font: 700 17px var(--body); margin-bottom: 6px; }
    #demoCheck label.it { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 6px; padding: 6px 0; border-bottom: 1px solid var(--line); cursor: pointer; font-size: 15px; text-align: left; }
    #demoCheck label.it input { margin-top: 4px; width: 16px; height: 16px; accent-color: var(--sea); }
    #demoCheck label.it small { display: block; color: var(--muted); font-size: 13px; }
    #demoCheck label.it .crit { color: var(--pos); font-weight: 700; font-size: 12.5px; margin-right: 4px; }
    #demoCheck .res { position: sticky; top: calc(var(--nav-h) + 12px); align-self: start; background: #fff; border: 2px solid var(--ink); padding: 14px 16px; }
    #demoCheck .res h5 { margin: -14px -16px 12px; padding: 8px 16px; font: 700 17px var(--body); color: #fff; }
    #demoCheck .bar { height: 10px; background: var(--line); margin: 6px 0 12px; }
    #demoCheck .bar i { display: block; height: 100%; }
    #demoCheck .res ul { margin: 8px 0 0; padding-left: 18px; font-size: 14px; }
    #demoCheck .res li { text-align: left; margin: 3px 0; }
    @media (max-width: 860px) { #demoCheck .jc { grid-template-columns: 1fr; } #demoCheck .res { position: static; } }
  </style>
  <div class="jc">
    <div>
      <p class="note-s" style="font-size:15px;margin-bottom:12px">Đánh dấu những gì bạn thấy ở tạp chí đang định nộp bài. Kết quả là gợi ý để kiểm tra kỹ hơn, không phải kết luận.</p>
      <fieldset><legend>Dấu hiệu cảnh báo</legend>${FLAGS.map((f, i) => `<label class="it"><input type="checkbox" data-jcf="${i}"><span>${f[0] === 'crit' ? '<span class="crit">NGHIÊM TRỌNG</span>' : ''}${f[1]}${f[2] ? `<small>${f[2]}</small>` : ''}</span></label>`).join('')}</fieldset>
      <fieldset><legend>Dấu hiệu tốt</legend>${GOOD.map((g, i) => `<label class="it"><input type="checkbox" data-jcg="${i}"><span>${g[1]}</span></label>`).join('')}</fieldset>
      <div class="btnrow"><button class="btn" type="button" id="jcReset">Bỏ chọn tất cả</button></div>
    </div>
    <div class="res" aria-live="polite">
      <h5 id="jcLv">—</h5>
      <div class="bar"><i id="jcBar"></i></div>
      <p id="jcMsg" style="margin:0;font-size:15px"></p>
      <ul id="jcTodo"></ul>
      <p class="note-s" style="margin-top:10px">Có trong Web of Science hay Scopus không bảo đảm tuyệt đối: hằng năm vẫn có tạp chí bị loại khỏi danh mục vì vi phạm chất lượng.</p>
    </div>
  </div>`,
  init(root) {
    const fl = [...root.querySelectorAll('[data-jcf]')], gd = [...root.querySelectorAll('[data-jcg]')];
    function upd() {
      let s = 0, crit = false; fl.forEach(c => { if (!c.checked) return; const w = FLAGS[+c.dataset.jcf][0]; if (w === 'crit') crit = true; else s += w; });
      const flags = s; gd.forEach(c => { if (c.checked) s += GOOD[+c.dataset.jcg][0]; });
      s = Math.max(0, s);
      const L = crit || s >= 9 ? LEVELS[3] : s >= 6 ? LEVELS[2] : s >= 3 ? LEVELS[1] : LEVELS[0];
      const h = root.querySelector('#jcLv'); h.textContent = L[1]; h.style.background = L[2];
      const bar = root.querySelector('#jcBar'); bar.style.width = (crit ? 100 : Math.min(100, s / 12 * 100)) + '%'; bar.style.background = L[2];
      root.querySelector('#jcMsg').textContent = L[3];
      const todo = [];
      if (!gd[0].checked) todo.push('Tra ISSN trên Master Journal List (mjl.clarivate.com) và Scopus Sources.');
      if (!gd[1].checked) todo.push('Nếu là tạp chí truy cập mở: tra DOAJ (doaj.org).');
      todo.push('Đọc vài bài đã đăng gần đây trong đúng chuyên ngành của bạn.');
      if (flags === 0 && !crit) todo.push('Đối chiếu với danh sách Think. Check. Submit. (thinkchecksubmit.org).');
      root.querySelector('#jcTodo').innerHTML = todo.map(t => `<li>${t}</li>`).join('');
    }
    [...fl, ...gd].forEach(c => c.addEventListener('change', upd));
    root.querySelector('#jcReset').addEventListener('click', () => { [...fl, ...gd].forEach(c => { c.checked = false; }); upd(); });
    upd();
  },
});
})();
