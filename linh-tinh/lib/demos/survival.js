/* =====================================================================
   Linh tinh: minh họa "Làm gì khi gặp nguy" (id: survival, trang song-con.html)
   Chọn tình huống để xem: làm ngay / nên / không nên / khi nào cần cấp cứu. Chỉ đưa các khuyến cáo có nguồn
   chính thức (đánh số theo danh sách tài liệu cuối trang song-con.html). Không thay thế huấn luyện sơ cứu.
   Công cụ phụ:
   - Chỉ số nóng (heat index) của Cơ quan Khí tượng Mỹ (NWS): phương trình Rothfusz kèm hai hiệu chỉnh;
     nhóm nguy cơ theo °F: 80–90 thận trọng, 90–103 hết sức thận trọng, 103–124 nguy hiểm, ≥ 125 cực kỳ nguy hiểm.
     Tính cho bóng râm, gió nhẹ; dưới nắng trực tiếp có thể cao hơn tới khoảng 15 °F (≈ 8 °C).
   - Độ sâu nước chảy (NWS, "Turn Around Don't Drown"): khoảng 15 cm (6 inch) làm người lớn té;
     khoảng 30 cm (1 foot) cuốn trôi phần lớn xe hơi; khoảng 60 cm (2 feet) cuốn trôi cả xe SUV, xe tải.
   EDIT: nội dung ở đối tượng SC.
   ===================================================================== */
(() => {
const { pressGroup, num, range } = LT;
const R = n => `<a href="#ref${n}">[${n}]</a>`;
const SC = {
  flood: { name: 'Bão, lũ', src: [1, 2, 3, 4],
    now: ['Theo dõi cảnh báo của chính quyền; khi có lệnh sơ tán thì đi sớm, trước khi đường bị ngập.', 'Gom sẵn nước uống, đồ ăn khô, thuốc đang dùng, giấy tờ (bọc bao ni lông) vào một túi dễ mang.', 'Khi bão tới: ở trong nhà kiên cố, tránh xa cửa kiếng; chằng mái, buộc chặt đồ có thể bay.', 'Nước dâng vào nhà: cúp cầu dao nếu đứng ở chỗ khô và làm được an toàn, rồi lên chỗ cao.'],
    no: ['Không lội, không lái xe qua dòng nước đang chảy (xem công cụ bên dưới).', 'Không ra ngoài khi gió bão bỗng lặng: có thể là mắt bão, gió sẽ thổi lại mạnh từ hướng ngược lại.', 'Không trốn lên gác hay gác mái kín không có lối thoát lên mái.', 'Không chạm thiết bị điện khi người ướt hoặc đứng trong nước; tránh xa dây điện đứt.', 'Khi mưa lớn kéo dài: tránh xa sông suối, chân và sườn đồi dốc (lũ quét, sạt lở).'],
    after: ['Coi nước lũ là nước dơ: chỉ uống nước đóng chai hoặc đã nấu sôi cho tới khi được thông báo an toàn; bỏ đồ ăn đã ngấm nước lũ.', 'Không chạy máy phát điện, bếp than trong nhà kín (ngộ độc khí CO).', 'Rửa sạch vết thương bị nước lũ dính vào.'],
    sos: ['Bị cuốn trôi, bị thương, mắc kẹt: gọi 112 hoặc 114.', 'Sốt, đau đầu, đau cơ (nhất là bắp chân) trong vòng khoảng một tháng sau khi lội nước lũ: đi khám và kể việc đã lội nước (nghi bệnh xoắn khuẩn Leptospira).'],
    tool: 'flood' },
  heat: { name: 'Nắng nóng', src: [5, 6, 7],
    now: ['Tránh gắng sức ngoài trời vào giữa trưa; nghỉ trong bóng râm.', 'Uống nước đều, không đợi khát; mặc đồ rộng, sáng màu, đội nón.', 'Không bao giờ để trẻ em, người già hay vật nuôi trong xe đóng kín, dù chỉ vài phút.', 'Không có quạt, máy lạnh: làm ướt da hoặc áo rồi quạt, ngâm tay chân vào nước mát, ở chỗ thông gió.'],
    no: ['Không coi nhẹ chóng mặt, buồn ói khi trời nóng: đó có thể là dấu hiệu kiệt sức vì nóng.', 'Không cho người đang lơ mơ, lú lẫn uống nước (có thể sặc).'],
    after: ['<b>Kiệt sức vì nóng</b>: ra nhiều mồ hôi, da mát ẩm, mệt, chuột rút, buồn ói, đau đầu, chóng mặt. Vào chỗ mát, nới lỏng quần áo, đắp khăn ướt, uống từng ngụm nước. Đi khám nếu ói, nặng lên hoặc kéo dài quá 1 giờ.', '<b>Sốc nhiệt</b> (nặng, đe dọa tính mạng): thân nhiệt từ 39,4 °C trở lên, da nóng (khô hoặc ẩm), mạch nhanh mạnh, lú lẫn, nói lắp, xỉu. Gọi 115, rồi làm mát nhanh bằng mọi cách có được: ngâm nước mát, dội nước, khăn ướt và quạt.'],
    sos: ['Lú lẫn, xỉu, co giật, nghi sốc nhiệt: gọi 115 ngay.'],
    tool: 'heat' },
  cold: { name: 'Trời lạnh', src: [8, 9, 10],
    now: ['Mặc nhiều lớp, giữ khô; che đầu, cổ, tay, chân. Đồ ướt mất gần hết khả năng giữ ấm: thay ngay.', 'Không có mền: nhồi lá khô, cỏ khô, giấy báo vào giữa các lớp áo; lót lá dày để cách người với mặt đất; nằm sát nhau để chia hơi ấm.', 'Trẻ nhỏ và người già mất nhiệt nhanh hơn: kiểm tra họ thường xuyên.'],
    no: ['<b>Không sưởi bằng than, củi, bếp ga, máy phát điện trong phòng đóng kín</b>, nhất là khi ngủ: khí CO không màu, không mùi, có thể gây tử vong. Nếu buộc phải đốt lửa, để thoáng khí.', 'Không uống rượu để "làm ấm": rượu làm mất nhiệt nhanh hơn.', 'Không xoa bóp mạnh tay chân bị lạnh cóng, không hơ lửa trực tiếp.'],
    after: ['<b>Hạ thân nhiệt</b> (thân nhiệt dưới 35 °C): run, lú lẫn, nói líu, buồn ngủ, vụng về; nặng hơn thì hết run, đó là dấu hiệu xấu. Đưa vào chỗ ấm, thay đồ ướt, ủ ấm phần thân trước (ngực, cổ, đầu, bẹn) bằng mền hoặc hơi ấm cơ thể; nếu tỉnh, cho uống nước ấm có đường.', 'Ở Việt Nam, rét đậm là khi nhiệt độ trung bình ngày 13–15 °C, rét hại khi từ 13 °C trở xuống.'],
    sos: ['Nghi hạ thân nhiệt (lú lẫn, hết run, lơ mơ): gọi 115.', 'Nhức đầu, chóng mặt, buồn ói, buồn ngủ ở nhiều người cùng phòng có bếp lửa: nghi ngộ độc CO, đưa mọi người ra chỗ thoáng và gọi 115.'] },
  lost: { name: 'Lạc rừng, đảo hoang', src: [11, 12, 13, 14],
    now: ['<b>Dừng lại</b> (Stop), <b>suy nghĩ</b> (Think), <b>quan sát</b> (Observe), <b>lên kế hoạch</b> (Plan). Hoảng loạn và đi tiếp là cách lạc xa hơn.', 'Nếu có người biết bạn đi đâu: ở yên một chỗ dễ thấy. Người đứng yên dễ được tìm thấy hơn người di chuyển.', 'Ưu tiên theo thứ tự: tránh nguy hiểm trước mắt, chỗ trú và giữ ấm, tín hiệu cầu cứu, nước, rồi mới tới thức ăn. "Quy tắc số 3" ước lượng thô: khoảng 3 giờ không chỗ trú trong thời tiết khắc nghiệt, 3 ngày không nước, 3 tuần không ăn.', 'Chỗ trú: chỗ cao ráo, không ở lòng suối khô (lũ quét), không dưới cây chết, cành khô; lót lá dày cách mặt đất.', 'Tín hiệu: nhóm ba (ba đống lửa, ba tiếng còi, ba tiếng hô) là tín hiệu cầu cứu được hiểu rộng rãi; xếp chữ SOS thật lớn, tương phản trên bãi trống hoặc bãi cát; dùng vật bóng loáng phản chiếu nắng; khói ban ngày, lửa sáng ban đêm.'],
    no: ['Không uống nước biển, không uống nước tiểu: làm mất nước nhanh hơn.', 'Không ăn nấm, trái cây, lá lạ: nhiều loại gây chết người, kể cả loại nhìn giống loại ăn được. Thiếu ăn vài ngày không nguy hiểm bằng ngộ độc.', 'Không đi lại khi trời tối.', 'Không tốn sức tạo lửa bằng ma sát nếu chưa từng luyện tập: rất khó và tốn mồ hôi.'],
    after: ['<b>Nước</b>: nước mưa hứng sạch là nguồn tốt nhất. Nước suối, nước hồ có thể chứa mầm bệnh: nấu sôi bùng ít nhất 1 phút nếu có lửa và đồ đựng. Không nấu được: đổ nước trong vào chai nhựa trong suốt, phơi nắng trực tiếp ít nhất 6 giờ (2 ngày nếu trời nhiều mây). Lọc qua vải chỉ bớt cặn, không diệt mầm bệnh.', '<b>Ít nước thì ăn ít</b>: tiêu hóa thức ăn cũng tốn nước.', '<b>Phương hướng</b>: mặt trời mọc ở khoảng hướng đông, lặn ở khoảng hướng tây (lệch theo mùa). Ban đêm ở Bắc bán cầu, sao Bắc Cực chỉ hướng bắc; ở Việt Nam nó nằm thấp trên chân trời phía bắc.', '<b>Đảo</b>: tìm bóng râm, tránh nắng giữa trưa; hứng nước mưa; nước dừa non uống được.', 'Nếu không ai biết bạn ở đâu và đã chờ lâu không thấy ai: một số hướng dẫn gợi ý men theo suối về phía hạ lưu vì làng mạc thường gần nước, nhưng ven suối có thể có thác, vách đá; chỉ đi ban ngày và đánh dấu đường đi.'],
    sos: ['Có sóng điện thoại dù yếu: gọi 112 (tìm kiếm cứu nạn); tin nhắn đôi khi gửi được khi không gọi được.'] },
  quake: { name: 'Động đất', src: [15, 16],
    now: ['<b>Nằm xuống, che đầu, bám chặt</b> (Drop, Cover, Hold On): quỳ xuống, chui dưới bàn chắc, một tay che đầu và cổ, tay kia bám chân bàn. Không có bàn: ngồi sát tường trong, che đầu cổ.', 'Đang nằm trên giường: nằm yên, lấy gối che đầu.', 'Ở ngoài trời: ra chỗ trống, xa nhà cửa, cây, cột và dây điện.', 'Đang lái xe: dừng ở chỗ trống, tránh cầu, cầu vượt; ngồi yên trong xe.'],
    no: ['Không chạy ra ngoài khi đang rung: phần lớn thương tích do vật rơi, kiếng bể khi đang di chuyển.', 'Không đứng ở khung cửa: trong nhà hiện đại, chỗ đó không an toàn hơn và không che được vật rơi.', 'Không dùng thang máy.'],
    after: ['Chuẩn bị cho dư chấn: lặp lại "nằm xuống, che đầu, bám chặt".', 'Ngửi thấy mùi gas: rời đi ngay, không quẹt hộp quẹt, không mở hay tắt công tắc điện.', '<b>Ở gần biển</b>: nếu rung rất mạnh hoặc kéo dài, hoặc thấy nước biển rút xa bất thường, lên chỗ cao ngay, không đợi cảnh báo (sóng thần).', '<b>Bị kẹt</b>: che mũi miệng bằng vải; gõ vào ống nước hoặc tường cho người cứu hộ nghe; chỉ la hét khi cần (tránh hít bụi); không thắp lửa.'],
    sos: ['Bị thương, bị kẹt: gọi 112 hoặc 114 nếu gọi được.'] },
  ill: { name: 'Bệnh đột xuất khi ở một mình', src: [17, 18, 19, 20, 21, 22, 23], sub: true },
};
const ILL = {
  stroke: { name: 'Đột quỵ (tai biến)',
    now: ['Nhận biết theo <b>BE-FAST</b>: <b>B</b>alance (đột ngột mất thăng bằng), <b>E</b>yes (mờ hoặc mất thị lực), <b>F</b>ace (méo miệng), <b>A</b>rm (yếu, tê tay hoặc chân một bên), <b>S</b>peech (nói khó, nói ngọng), <b>T</b>ime (gọi cấp cứu ngay).', '<b>Gọi 115 ngay</b>, trước khi triệu chứng làm bạn không gọi được nữa. Nói rõ địa chỉ, rồi mở khóa cửa nếu còn đi được.', 'Ghi nhớ hoặc nói cho người cấp cứu <b>giờ bắt đầu</b> triệu chứng (hoặc lần cuối bạn còn bình thường): quyết định có điều trị tiêu huyết khối được hay không.', 'Nằm nghiêng nếu buồn ói hoặc ói.'],
    no: ['Không ăn, uống gì (có thể sặc).', 'Không tự uống aspirin hay thuốc hạ huyết áp: đột quỵ có thể do chảy máu não.', 'Không chích máu đầu ngón tay, không cạo gió, không chờ "xem có đỡ không": mất thời gian vàng.', 'Không tự lái xe đi viện.'],
    sos: ['Mọi dấu hiệu BE-FAST, kể cả khi đã hết sau vài phút (có thể là cơn thiếu máu não thoáng qua, báo trước đột quỵ).'] },
  vertigo: { name: 'Chóng mặt',
    now: ['Ngồi hoặc nằm xuống ngay để không bị té.', 'Giữ đầu yên, nhìn vào một điểm cố định; khi đỡ thì ngồi dậy và đứng lên thật từ từ.', 'Uống nước từng ngụm nếu buồn ói; mở đèn khi đi lại ban đêm.'],
    no: ['Không lái xe, không leo cao, không tắm một mình khi còn chóng mặt.'],
    sos: ['Chóng mặt kèm <b>bất kỳ</b> dấu hiệu: nói khó, méo miệng, yếu hoặc tê một bên người, nhìn đôi, đi không vững hẳn, đau đầu dữ dội đột ngột, đau ngực, khó thở, xỉu. Đây có thể là đột quỵ hoặc bệnh tim, không phải rối loạn tiền đình: gọi 115.'] },
  food: { name: 'Ngộ độc thực phẩm',
    now: ['Bù nước từng ngụm nhỏ, nhiều lần. Dùng gói oresol, pha đúng lượng nước ghi trên gói.', 'Không có oresol (công thức WHO): <b>1 lít nước sạch</b> (nấu sôi để nguội) + <b>6 muỗng cà phê gạt đường</b> + <b>½ muỗng cà phê gạt muối</b>. Pha đúng tỉ lệ; quá mặn có hại.', 'Khi đỡ ói thì ăn nhẹ, chia nhỏ bữa.'],
    no: ['Không tự móc họng cho ói.', 'Không dùng thuốc cầm tiêu chảy khi có sốt hoặc phân có máu.'],
    sos: ['Phân có máu; sốt trên 38,9 °C; tiêu chảy quá 3 ngày; ói nhiều tới mức không giữ được nước.', 'Dấu hiệu mất nước: tiểu rất ít, khô miệng, chóng mặt khi đứng dậy.', '<b>Nhìn mờ, nhìn đôi, khó nuốt, khó nói, yếu cơ</b>, nhất là sau khi ăn đồ đóng hộp, đóng gói kín: nghi ngộ độc botulinum, gọi 115 ngay.'] },
  fever: { name: 'Sốt',
    now: ['Nghỉ ngơi, uống nhiều nước, mặc thoáng, lau người bằng nước ấm.', 'Nếu dùng thuốc hạ sốt, chọn paracetamol và dùng đúng liều ghi trên hộp.', '<b>Ở vùng có sốt xuất huyết như Việt Nam</b>: không dùng aspirin hay ibuprofen khi chưa loại trừ sốt xuất huyết (tăng nguy cơ chảy máu).'],
    no: ['Không ủ ấm, đắp mền dày khi đang sốt cao.'],
    sos: ['Sốt kèm cứng cổ, đau đầu dữ dội, lú lẫn, khó thở, đau ngực, co giật, phát ban dạng chấm xuất huyết; hoặc sốt từ 39,4 °C trở lên không giảm.', 'Nghi sốt xuất huyết, nhất là khi vừa hết sốt (khoảng ngày 3–7): đau bụng nhiều, ói liên tục, chảy máu chân răng hoặc mũi, mệt lả, li bì. Đây là giai đoạn nguy hiểm: đi bệnh viện ngay.'] },
};

function heatIndexF(T, RH) {     // NWS: T (°F), RH (%)
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + RH * 0.094);
  if ((hi + T) / 2 < 80) return hi;
  hi = -42.379 + 2.04901523 * T + 10.14333127 * RH - 0.22475541 * T * RH - 0.00683783 * T * T - 0.05481717 * RH * RH + 0.00122874 * T * T * RH + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;
  if (RH < 13 && T >= 80 && T <= 112) hi -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  if (RH > 85 && T >= 80 && T <= 87) hi += ((RH - 85) / 10) * ((87 - T) / 5);
  return hi;
}
const toC = f => (f - 32) * 5 / 9, toF = c => c * 9 / 5 + 32;
const HEAT_LV = [[80, 'Bình thường', '#2e9d4f', 'Vẫn uống đủ nước khi làm việc ngoài trời.'], [90, 'Thận trọng', '#b8860b', 'Mệt mỏi có thể xảy ra khi tiếp xúc, vận động lâu.'], [103, 'Hết sức thận trọng', '#e07b39', 'Có thể bị chuột rút, kiệt sức vì nóng khi tiếp xúc, vận động lâu.'], [125, 'Nguy hiểm', '#d8312a', 'Dễ bị chuột rút, kiệt sức vì nóng; có thể sốc nhiệt nếu tiếp tục vận động.'], [1e9, 'Cực kỳ nguy hiểm', '#8b1d16', 'Nguy cơ sốc nhiệt rất cao.']];

LT.demo('survival', {
  domId: 'demoSurvival',
  title: 'Làm gì khi gặp nguy',
  page: 'song-con.html',
  html: `<style>
    #demoSurvival .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    #demoSurvival .tabs.sub { margin: -4px 0 14px; }
    #demoSurvival .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    #demoSurvival .box { background: #fff; border: 1.5px solid var(--ink); padding: 0 14px 12px; min-width: 0; }
    #demoSurvival .box h5 { margin: 0 -14px 10px; padding: 7px 14px; font: 700 15.5px var(--body); color: #fff; }
    #demoSurvival .box ul { margin: 0; padding-left: 18px; font-size: 15px; }
    #demoSurvival .box li { margin: 5px 0; text-align: left; }
    #demoSurvival .src { font-size: 13px; color: var(--muted); margin: 12px 0 0; }
    #demoSurvival .tool { margin-top: 16px; background: #fff; border: 2px solid var(--ink); box-shadow: 5px 5px 0 var(--sky); display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(240px, 1fr); }
    #demoSurvival .tool .vis { border-right: 2px solid var(--ink); padding: 10px; min-width: 0; }
    #demoSurvival .tool .panel { padding: 14px 16px; }
    #demoSurvival .tool h6 { margin: 0; font: 700 16px var(--body); }
    #demoSurvival .hl { padding: 8px 12px; color: #fff; font: 700 17px var(--body); }
    @media (max-width: 760px) { #demoSurvival .tool { grid-template-columns: 1fr; } #demoSurvival .tool .vis { border-right: 0; border-bottom: 2px solid var(--ink); } }
  </style>
  <div class="tabs" role="group" aria-label="Tình huống">${Object.entries(SC).map(([k, v], i) => `<button class="btn" type="button" data-svk="${k}" aria-pressed="${i === 0}">${v.name}</button>`).join('')}</div>
  <div class="tabs sub" id="svSub" role="group" aria-label="Bệnh" hidden>${Object.entries(ILL).map(([k, v], i) => `<button class="btn" type="button" data-svi="${k}" aria-pressed="${i === 0}">${v.name}</button>`).join('')}</div>
  <div id="svBody" aria-live="polite"></div>
  <div id="svTool"></div>`,
  init(root) {
    let key = 'flood', ill = 'stroke';
    const tabs = [...root.querySelectorAll('[data-svk]')], subs = [...root.querySelectorAll('[data-svi]')];
    tabs.forEach(b => b.addEventListener('click', () => { pressGroup(tabs, b); key = b.dataset.svk; show(); }));
    subs.forEach(b => b.addEventListener('click', () => { pressGroup(subs, b); ill = b.dataset.svi; show(); }));
    const box = (title, col, items) => items && items.length ? `<div class="box"><h5 style="background:${col}">${title}</h5><ul>${items.map(t => `<li>${t}</li>`).join('')}</ul></div>` : '';
    function show() {
      const S = SC[key], D = S.sub ? ILL[ill] : S;
      root.querySelector('#svSub').hidden = !S.sub;
      const common = S.sub ? `<div class="callout" style="margin:0 0 14px">Khi ở một mình, hãy gọi trợ giúp <b>sớm hơn</b> bình thường: gọi 115 (cấp cứu), gọi hàng xóm hoặc người thân, và mở khóa cửa để người khác vào được. Số khẩn cấp ở Việt Nam: <b>115</b> cấp cứu y tế, <b>114</b> cứu hỏa, cứu nạn cứu hộ, <b>113</b> công an, <b>112</b> tìm kiếm cứu nạn.</div>` : '';
      root.querySelector('#svBody').innerHTML = common + `<div class="grid">${box('Làm ngay', '#3787c4', D.now)}${box('Không nên', '#1B1920', D.no)}${box(key === 'flood' ? 'Sau lũ' : key === 'quake' ? 'Sau khi hết rung' : key === 'heat' ? 'Nhận biết và xử trí' : key === 'cold' ? 'Nhận biết và xử trí' : 'Thêm', '#59606B', D.after)}${box('Cần cấp cứu khi', '#d8312a', D.sos)}</div><p class="src">Nguồn: ${S.src.map(R).join(', ')}. Chỉ để tham khảo, không thay thế huấn luyện sơ cứu.</p>`;
      tool(S.tool);
    }
    function tool(t) {
      const el = root.querySelector('#svTool');
      if (t === 'heat') {
        el.innerHTML = `<div class="tool"><div class="vis" id="hiVis"></div><div class="panel" style="display:flex;flex-direction:column;gap:12px">
          <h6>Chỉ số nóng: cơ thể cảm thấy nóng tới đâu?</h6>
          <div class="ctrl"><label for="hiT">Nhiệt độ không khí</label><output for="hiT"></output><input type="range" id="hiT" min="26" max="45" step="0.5" value="35"></div>
          <div class="ctrl"><label for="hiH">Độ ẩm tương đối</label><output for="hiH"></output><input type="range" id="hiH" min="20" max="100" step="1" value="65"></div>
          <p class="note-s">Theo công thức của Cơ quan Khí tượng Mỹ (NWS) ${R(7)}, tính trong bóng râm, gió nhẹ. Đứng dưới nắng trực tiếp có thể cao hơn tới khoảng 8 °C. Độ ẩm cao làm mồ hôi khó bay hơi, cơ thể khó tự làm mát.</p></div></div>`;
        const rT = range('hiT', { show: v => num(v, 3) + ' °C', onInput: () => u() }), rH = range('hiH', { show: v => v + '%', onInput: () => u() });
        const u = () => { const f = heatIndexF(toF(rT.get()), rH.get()), L = HEAT_LV.find(l => f < l[0]);
          root.querySelector('#hiVis').innerHTML = `<div class="hl" style="background:${L[2]}">${L[1]}</div><p style="font:700 44px/1.1 var(--mono);margin:14px 0 6px;color:${L[2]}">${num(Math.round(toC(f) * 10) / 10, 3)} °C</p><p style="margin:0">cảm giác nóng (chỉ số nóng) khi nhiệt độ ${num(rT.get(), 3)} °C, độ ẩm ${rH.get()}%.</p><p class="note-s" style="margin-top:8px">${L[3]}</p>`; };
        rT.upd(); rH.upd();
      } else if (t === 'flood') {
        el.innerHTML = `<div class="tool"><div class="vis" id="flVis"></div><div class="panel" style="display:flex;flex-direction:column;gap:12px">
          <h6>Nước chảy sâu bao nhiêu là nguy hiểm?</h6>
          <div class="ctrl"><label for="flD">Độ sâu nước đang chảy</label><output for="flD"></output><input type="range" id="flD" min="0" max="80" step="1" value="20"></div>
          <p class="note-s" id="flMsg"></p></div></div>`;
        const rD = range('flD', { show: v => v + ' cm', onInput: () => u() });
        const u = () => { const d = rD.get(), H = 200, sc = 1.0, wy = H - 10 - d * sc;
          root.querySelector('#flVis').innerHTML = `<svg viewBox="0 0 320 ${H}" width="100%" role="img" aria-label="Người cao 1,6 m và xe hơi đứng trong nước sâu ${d} cm">
            <rect x="0" y="0" width="320" height="${H}" fill="#FBFCFD"/>
            <g fill="#1B1920"><circle cx="70" cy="${H - 10 - 152}" r="10"/><rect x="62" y="${H - 10 - 140}" width="16" height="62"/><rect x="62" y="${H - 10 - 80}" width="7" height="80"/><rect x="71" y="${H - 10 - 80}" width="7" height="80"/></g>
            <g fill="#59606B"><rect x="160" y="${H - 10 - 60}" width="140" height="35" rx="6"/><rect x="185" y="${H - 10 - 85}" width="85" height="28" rx="6"/><circle cx="190" cy="${H - 10 - 18}" r="16" fill="#1B1920"/><circle cx="270" cy="${H - 10 - 18}" r="16" fill="#1B1920"/></g>
            <rect x="0" y="${wy}" width="320" height="${H - wy}" fill="rgba(55,135,196,.55)"/>
            <path d="M0 ${wy} q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#3787c4" stroke-width="2" fill="none"/>
            <line x1="0" y1="${H - 10}" x2="320" y2="${H - 10}" stroke="#1B1920"/>
            <text x="8" y="16" font-size="12" font-family="Be Vietnam Pro, sans-serif" fill="#1B1920">người cao 1,6 m; xe con (minh họa)</text></svg>`;
          root.querySelector('#flMsg').innerHTML = d >= 60 ? '<b>Khoảng 60 cm nước chảy</b> cuốn trôi được cả xe SUV, xe tải.' : d >= 30 ? '<b>Khoảng 30 cm nước chảy</b> cuốn trôi được phần lớn xe hơi con.' : d >= 15 ? '<b>Khoảng 15 cm nước chảy</b> đã đủ làm người lớn té.' : 'Nước nông vẫn nguy hiểm: không thấy được hố sâu, cống mất nắp, đường bị xói bên dưới.';
          root.querySelector('#flMsg').innerHTML += ' Không lội, không lái xe qua: quay lại, tìm đường khác (NWS ' + R(3) + ').'; };
        rD.upd();
      } else el.innerHTML = '';
    }
    show();
  },
});
})();
