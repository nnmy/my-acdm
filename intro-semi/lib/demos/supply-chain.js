/* =====================================================================
   Bán dẫn: minh họa "Bản đồ chuỗi cung ứng chip" (id: supply-chain, trang 5-san-xuat.html)
   Nhúng vào trang: <div class="demo" id="demoChain" data-demo="supply-chain"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=supply-chain

   EDIT: dữ liệu ở mảng STAGES (tên khâu, vai trò, tối đa 3 công ty dẫn đầu [tên, quốc gia/vùng], ghi chú).
   Cập nhật: 10/2026. Nguồn xếp hạng: TrendForce quý 2/2026 cho gia công (09/09/2026) và thiết kế fabless
   (11/09/2026); các khâu khác theo thị phần được công bố rộng rãi, không xếp thứ tự trong khâu.
   ===================================================================== */
(() => {
const UPDATED = '10/2026';
const STAGES = [
  { id: 'eda', row: 0, name: 'Phần mềm thiết kế (EDA)', role: 'Phần mềm để vẽ, mô phỏng và kiểm tra hàng tỉ transistor trước khi sản xuất.',
    co: [['Synopsys', 'Mỹ'], ['Cadence', 'Mỹ'], ['Siemens EDA', 'Đức']],
    choke: 'Ba hãng này chiếm phần lớn thị trường EDA; gần như không thể thiết kế chip tiên tiến mà không có công cụ của họ.' },
  { id: 'design', row: 0, name: 'Thiết kế chip (fabless)', role: 'Công ty chỉ thiết kế chip rồi mướn nhà máy sản xuất. Một số hãng lớn vừa thiết kế vừa tự sản xuất (IDM) nên không nằm trong bảng xếp hạng này.',
    co: [['Nvidia', 'Mỹ'], ['Broadcom', 'Mỹ'], ['AMD', 'Mỹ']],
    choke: 'Theo TrendForce, quý 2/2026 Nvidia, Broadcom và AMD là ba hãng có doanh thu lớn nhất; riêng Nvidia chiếm khoảng 64% doanh thu của mười hãng đứng đầu.' },
  { id: 'wafer', row: 1, name: 'Phiến Si', role: 'Phiến Si đơn tinh thể siêu tinh khiết, đường kính 300 mm.',
    co: [['Shin-Etsu', 'Nhật'], ['SUMCO', 'Nhật'], ['GlobalWafers', 'Đài Loan']],
    choke: 'Hai hãng Nhật Shin-Etsu và SUMCO cung cấp khoảng một nửa lượng phiến Si của thế giới.' },
  { id: 'resist', row: 1, name: 'Chất cản quang', role: 'Hóa chất nhạy sáng dùng để in hình mạch trong quang khắc; ngoài ra nhà máy còn cần hóa chất ăn mòn, tẩy rửa và khí đặc chủng.',
    co: [['Tokyo Ohka Kogyo', 'Nhật'], ['JSR', 'Nhật'], ['Shin-Etsu', 'Nhật']],
    choke: 'Các công ty Nhật chiếm phần lớn thị trường chất cản quang, nhất là loại dùng cho EUV.' },
  { id: 'mask', row: 1, name: 'Mặt nạ quang khắc', role: 'Tấm thạch anh mang hình mạch của từng lớp; một chip tiên tiến cần hàng chục mặt nạ. Các hãng gia công lớn cũng tự làm phần lớn mặt nạ của mình.',
    co: [['Photronics', 'Mỹ'], ['Toppan', 'Nhật'], ['DNP', 'Nhật']],
    choke: '' },
  { id: 'litho', row: 1, name: 'Máy quang khắc', role: 'Chiếu hình mặt nạ lên phiến Si. Máy EUV (13,5 nm) to bằng chiếc xe buýt, giá hơn 100 triệu USD mỗi máy.',
    co: [['ASML', 'Hà Lan'], ['Nikon', 'Nhật'], ['Canon', 'Nhật']],
    choke: 'ASML là nhà cung cấp máy EUV duy nhất trên thế giới. Hạn chế xuất khẩu khiến SMIC không mua được máy EUV, phải làm chip 7 và 5 nm bằng máy DUV 193 nm.' },
  { id: 'equip', row: 1, name: 'Thiết bị chế tạo khác', role: 'Lắng đọng, ăn mòn, cấy ion, làm sạch, mài phẳng, đo kiểm.',
    co: [['Applied Materials', 'Mỹ'], ['Lam Research', 'Mỹ'], ['Tokyo Electron', 'Nhật']],
    choke: 'Cùng với ASML, ba hãng này là những nhà cung cấp thiết bị chế tạo chip lớn nhất thế giới.' },
  { id: 'fab', row: 2, name: 'Gia công chip (foundry)', role: 'Nhà máy sản xuất chip theo thiết kế của khách hàng. Một nhà máy tiên tiến tốn hàng chục tỉ USD.',
    co: [['TSMC', 'Đài Loan'], ['Samsung Foundry', 'Hàn Quốc'], ['SMIC', 'Trung Quốc']],
    choke: 'Theo TrendForce, quý 2/2026 TSMC chiếm 72,5% doanh thu gia công toàn cầu, Samsung 5,9%, SMIC 5,4%. Gần như mọi chip AI tiên tiến đều do TSMC sản xuất.' },
  { id: 'mem', row: 2, name: 'Bộ nhớ', role: 'DRAM, NAND flash và bộ nhớ băng thông cao (HBM) xếp chồng cho chip AI; các hãng này tự thiết kế và tự sản xuất.',
    co: [['Samsung', 'Hàn Quốc'], ['SK hynix', 'Hàn Quốc'], ['Micron', 'Mỹ']],
    choke: 'Ba hãng này chiếm phần lớn thị trường DRAM và gần như toàn bộ nguồn cung HBM cho chip AI.' },
  { id: 'osat', row: 3, name: 'Đóng gói và kiểm tra (OSAT)', role: 'Cắt phiến thành chip, đóng vỏ, nối dây, thử điện. Đóng gói tiên tiến ghép nhiều chip (logic + HBM) thành một khối.',
    co: [['ASE', 'Đài Loan'], ['Amkor', 'Mỹ'], ['JCET', 'Trung Quốc']],
    choke: 'Đóng gói tiên tiến cho chip AI (như CoWoS) chủ yếu do chính TSMC thực hiện và từng là nút cổ chai cho sản lượng chip AI.' },
];
const ROWS = ['Thiết kế', 'Đầu vào cho nhà máy', 'Sản xuất', 'Hoàn thiện'];

SEMI.demo('supply-chain', {
  domId: 'demoChain',
  title: 'Bản đồ chuỗi cung ứng chip',
  page: '5-san-xuat.html',
  html: `<div class="demo-title"><h4>Bản đồ chuỗi cung ứng chip</h4><span>Bấm vào một khâu để xem vai trò và các công ty chủ chốt</span></div>
  <style>
    #demoChain .chain { display: grid; gap: 10px; padding: 16px; align-content: start; }
    #demoChain .lane { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; align-items: stretch; }
    #demoChain .lane > span { font: 400 21px/1.05 var(--pixel-vi); color: var(--muted); align-self: center; }
    #demoChain .cells { display: flex; flex-wrap: wrap; gap: 8px; }
    #demoChain .stage { flex: 1 1 140px; text-align: left; font: 600 14px/1.3 var(--body); color: var(--ink); background: #fff; border: 2px solid var(--ink); padding: 8px 10px; cursor: pointer; }
    #demoChain .stage:hover { box-shadow: 3px 3px 0 var(--sky); }
    #demoChain .stage[aria-pressed="true"] { background: var(--ink); color: #fff; box-shadow: 3px 3px 0 var(--sea); }
    #demoChain .stage small { display: block; font-weight: 400; color: var(--muted); font-size: 12.5px; }
    #demoChain .stage[aria-pressed="true"] small { color: #C9CED6; }
    #demoChain .arrow { text-align: center; color: var(--muted); font-size: 13px; }
    #demoChain ul.co { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    #demoChain ul.co li { font-size: 13.5px; padding: 2px 9px; background: var(--mist); border: 1px solid var(--line); text-align: left; }
    #demoChain ul.co li i { color: var(--muted); font-style: normal; }
    @media (max-width: 560px) { #demoChain .lane { grid-template-columns: 1fr; } }
  </style>
  <div class="demo-body">
    <div class="stagebox"><div class="chain" id="chGrid"></div></div>
    <div class="panel" aria-live="polite">
      <h4 id="chName" style="margin:0;font-size:19px"></h4>
      <p id="chRole" style="margin:0;font-size:15px"></p>
      <ul class="co" id="chCo"></ul>
      <div class="callout" id="chChoke" style="margin:0;font-size:14.5px"></div>
      <p class="note-s">Mỗi khâu nêu tối đa 3 công ty dẫn đầu, không xếp thứ tự. Cập nhật ${UPDATED}.</p>
    </div>
  </div>`,
  init(root) {
    const grid = root.querySelector('#chGrid');
    grid.innerHTML = ROWS.map((r, i) => `<div class="lane"><span>${r}</span><div class="cells">${STAGES.filter(s => s.row === i).map(s =>
      `<button class="stage" type="button" data-ch="${s.id}" aria-pressed="false">${s.name}<small>${s.co.map(c => c[0]).join(', ')}</small></button>`).join('')}</div></div>${i < ROWS.length - 1 ? '<div class="arrow" aria-hidden="true">▼</div>' : ''}`).join('');
    const bs = [...grid.querySelectorAll('[data-ch]')];
    const show = id => {
      const s = STAGES.find(x => x.id === id); bs.forEach(b => b.setAttribute('aria-pressed', b.dataset.ch === id));
      root.querySelector('#chName').textContent = s.name; root.querySelector('#chRole').textContent = s.role;
      root.querySelector('#chCo').innerHTML = s.co.map(([n, c]) => `<li>${n}${c ? ` <i>(${c})</i>` : ''}</li>`).join('');
      const ck = root.querySelector('#chChoke'); ck.hidden = !s.choke; ck.innerHTML = s.choke ? '<b>Điểm đáng chú ý.</b> ' + s.choke : '';
    };
    bs.forEach(b => b.addEventListener('click', () => show(b.dataset.ch)));
    show('litho');
  },
});
})();
