/* =====================================================================
   Xếp hành lý: dữ liệu (linh-tinh/hanh-ly.html)
   Sửa file này để thêm / bớt vật dụng, loại đồ chứa. Không cần đụng vào hanh-ly.js.

   ITEMS: mỗi vật dụng
     id    : mã duy nhất (chữ thường, gạch nối)
     name  : tên ngắn gọn (từ ngữ miền Nam); chuỗi hoặc hàm t => chuỗi
     cat   : nhóm (khóa trong CATS)
     unit  : đơn vị; chuỗi hoặc hàm t => chuỗi
     qty   : số lượng; số cố định hoặc hàm t => số (t: thông tin chuyến đi, xem dưới)
     g     : khối lượng mỗi đơn vị (gam), không bắt buộc
     ml    : thể tích mỗi đơn vị (mililit), không bắt buộc
     kind  : 'personal' = nên mang bên người; 'special' = đặc thù theo điều kiện; bỏ trống = cơ bản
     when  : hàm t => true/false; bỏ trống = luôn gợi ý
     why   : lý do hiện dưới gợi ý (chuỗi hoặc hàm t => chuỗi)
     home  : 'cross' | 'backpack' = đồ chứa mặc định khi thêm (và được xếp sẵn vào đó khi mở trang lần đầu)
   t (thông tin chuyến đi):
     t.intl   : true nếu đi nước ngoài
     t.days   : số ngày tính quần áo (1, 2 hoặc 3; trên 3 ngày cũng chỉ tính 3)
     t.real   : số ngày đã chọn (1–3; 4 nghĩa là trên 3 ngày)
     t.home   : mã nước đang ở (đoán từ múi giờ / ngôn ngữ của trình duyệt), vd. 'VN'
     t.suitcase: true nếu đã có ít nhất một vali
     t.long   : true nếu trên 3 ngày
     t.tmin, t.tmax: khoảng nhiệt độ (°C); t.hmin, t.hmax: khoảng độ ẩm (%)
     t.humid : 'dry' | 'mid' | 'wet', suy ra từ độ ẩm trung bình (≤ 45 % khô, ≥ 70 % ẩm)
     t.rain, t.snow: có mưa, có tuyết
     t.sunny  : suy ra từ nhiệt độ cao nhất ≥ 25 °C hoặc đi biển
     t.city, t.rural, t.beach, t.mountain: nơi đến
     t.plane, t.ground: phương tiện
   ===================================================================== */
(() => {
'use strict';

const CATS = {
  docs:  'Giấy tờ & tiền',
  tech:  'Điện tử',
  cloth: 'Quần áo & giày dép',
  care:  'Vệ sinh cá nhân',
  med:   'Thuốc',
  out:   'Thời tiết & ngoài trời',
  misc:  'Linh tinh',
};

/* Loại đồ chứa. personal = loại mang bên người. Tên sửa được trên trang. */
const CONTAINERS = {
  cross:    { name: 'Túi đeo chéo', personal: true },
  tote:     { name: 'Túi tote',     personal: true },
  backpack: { name: 'Balo',         personal: true,  kg: 7 },    // kg: giới hạn mặc định khi đi máy bay (mỗi hãng mỗi khác)
  suitcase: { name: 'Vali',         personal: false, kg: 20 },
};

const cold = t => t.tmin < 15;
const veryCold = t => t.tmin < 5;
const hot = t => t.tmax >= 30;
const outdoor = t => t.rural || t.mountain || t.beach;

const ITEMS = [
  /* ---------- giấy tờ & tiền ---------- */
  { id: 'id-card',   name: t => t.home === 'VN' ? 'Căn cước' : 'Thẻ cư trú', cat: 'docs', unit: 'cái', g: 5, kind: 'personal', home: 'cross' },
  { id: 'passport',  name: 'Hộ chiếu',          cat: 'docs', unit: 'cuốn', g: 40, kind: 'personal', when: t => t.intl,
    why: 'Nhiều nước yêu cầu hộ chiếu còn hạn ít nhất 6 tháng.' },
  { id: 'visa',      name: 'Visa (bản in)',     cat: 'docs', unit: 'tờ', g: 5, kind: 'personal', when: t => t.intl,
    why: 'In sẵn phòng khi điện thoại hết pin.' },
  { id: 'cash',      name: 'Tiền mặt',          cat: 'docs', unit: 'khoản', kind: 'personal', home: 'cross',
    why: t => t.intl ? 'Đổi sẵn một ít tiền nơi đến cho taxi, quán nhỏ.' : '' },
  { id: 'cash-spare',name: 'Tiền mặt dự phòng', cat: 'docs', unit: 'khoản', kind: 'personal', home: 'backpack',
    why: 'Để riêng một ít, phòng khi mất túi kia.' },
  { id: 'card',      name: 'Thẻ ngân hàng',     cat: 'docs', unit: 'cái', qty: 2, g: 5, kind: 'personal', home: 'cross' },
  { id: 'tickets',   name: 'Vé',                cat: 'docs', unit: 'bộ', g: 10, kind: 'personal' },
  { id: 'insurance', name: 'Bảo hiểm du lịch',  cat: 'docs', unit: 'bản', g: 5, kind: 'special', when: t => t.intl,
    why: 'Đi nước ngoài: chi phí khám chữa bệnh có thể rất cao.' },
  { id: 'doc-copy',  name: 'Bản sao giấy tờ',   cat: 'docs', unit: 'bộ', g: 10, when: t => t.intl },
  { id: 'license',   name: 'Bằng lái quốc tế',  cat: 'docs', unit: 'cuốn', g: 30, kind: 'special', when: t => t.intl && (t.rural || t.mountain),
    why: 'Đi vùng quê, vùng núi có thể cần mướn xe.' },

  /* ---------- điện tử ---------- */
  { id: 'phone',     name: 'Điện thoại',        cat: 'tech', unit: 'cái', g: 200, kind: 'personal', home: 'cross' },
  { id: 'charger',   name: 'Bộ sạc',            cat: 'tech', unit: 'bộ', g: 120, home: 'backpack' },
  { id: 'powerbank', name: 'Sạc dự phòng',      cat: 'tech', unit: 'cái', g: 250, kind: 'personal',
    why: t => t.plane ? 'Đi máy bay: sạc dự phòng phải để trong hành lý xách tay, không được ký gởi.' : '' },
  { id: 'adapter',   name: 'Đầu chuyển ổ cắm',  cat: 'tech', unit: 'cái', g: 80, kind: 'special', when: t => t.intl,
    why: 'Đi nước ngoài: ổ cắm có thể khác kiểu, nên xem trước kiểu ổ cắm nơi đến.' },
  { id: 'sim',       name: 'SIM du lịch',       cat: 'tech', unit: 'cái', kind: 'special', when: t => t.intl,
    why: 'Có mạng ngay khi tới nơi để gọi xe, xem bản đồ.' },
  { id: 'multi-plug',name: 'Ổ cắm nối dài',     cat: 'tech', unit: 'cái', g: 150, when: t => t.long },
  { id: 'camera',    name: 'Camera',            cat: 'tech', unit: 'cái', g: 600 },
  { id: 'card-reader',name: 'Đầu đọc thẻ nhớ',  cat: 'tech', unit: 'cái', g: 20 },
  { id: 'cam-clean', name: 'Bộ vệ sinh camera', cat: 'tech', unit: 'bộ', g: 80, when: t => t.real > 2 },
  { id: 'flashlight',name: 'Đèn pin',           cat: 'out', unit: 'cái', g: 80, kind: 'special', when: t => t.rural || t.mountain,
    why: 'Vùng quê, vùng núi: đường tối, có thể cúp điện.' },

  /* ---------- quần áo & giày dép ---------- */
  { id: 'shirt',     name: 'Áo',                cat: 'cloth', unit: 'cái', g: 180, qty: t => t.days },
  { id: 'pants',     name: 'Quần',              cat: 'cloth', unit: 'cái', g: 400, qty: t => Math.max(1, t.days - 1) },
  { id: 'underwear', name: 'Đồ lót',            cat: 'cloth', unit: 'bộ', g: 80, qty: t => t.days },
  { id: 'socks',     name: 'Vớ',                cat: 'cloth', unit: 'đôi', g: 50, qty: t => t.days },
  { id: 'sleepwear', name: 'Đồ ngủ',            cat: 'cloth', unit: 'bộ', g: 250 },
  { id: 'insole',    name: 'Miếng lót giày',    cat: 'cloth', unit: 'đôi', qty: t => Math.min(t.days, 2), g: 30, kind: 'special',
    when: t => (hot(t) && t.humid === 'wet') || (cold(t) && t.humid === 'dry'),
    why: t => t.humid === 'wet' ? 'Trời nóng ẩm: chân ra mồ hôi, giày dễ ẩm.' : 'Trời lạnh khô: lót giày giữ ấm, êm chân.' },
  { id: 'foot-spray',name: 'Chai khử mùi chân', cat: 'care', unit: 'chai', g: 100, ml: 100, kind: 'special',
    when: t => (hot(t) && t.humid === 'wet') || (cold(t) && t.humid === 'dry'),
    why: t => t.humid === 'wet' ? 'Trời nóng ẩm: chân dễ có mùi.' : 'Mang giày kín cả ngày khi trời lạnh.' },
  { id: 'sandals',   name: 'Dép',               cat: 'cloth', unit: 'đôi', g: 300, when: t => t.beach || hot(t) || t.long },
  { id: 'light-jkt', name: 'Áo khoác mỏng',     cat: 'cloth', unit: 'cái', g: 300, when: t => !veryCold(t),
    why: t => t.plane ? 'Trên máy bay, xe khách thường lạnh.' : '' },
  { id: 'warm-jkt',  name: 'Áo khoác ấm',       cat: 'cloth', unit: 'cái', g: 900, kind: 'special', when: cold,
    why: t => `Nhiệt độ thấp nhất ${t.tmin} °C.` },
  { id: 'thermal',   name: 'Áo giữ nhiệt',      cat: 'cloth', unit: 'cái', g: 200, qty: t => Math.min(t.days, 2), kind: 'special', when: veryCold,
    why: t => `Nhiệt độ có thể xuống ${t.tmin} °C.` },
  { id: 'down',      name: 'Áo lông vũ',        cat: 'cloth', unit: 'cái', g: 700, kind: 'special', when: t => t.tmin < 0 || t.snow,
    why: t => t.snow ? 'Có tuyết.' : 'Nhiệt độ dưới 0 °C.' },
  { id: 'warm-acc',  name: 'Nón len, bao tay',  cat: 'cloth', unit: 'bộ', g: 200, kind: 'special', when: t => veryCold(t) || t.snow,
    why: 'Trời lạnh: đầu và tay mất nhiệt nhanh nhất.' },
  { id: 'snow-boot', name: 'Giày đi tuyết',     cat: 'cloth', unit: 'đôi', g: 1000, kind: 'special', when: t => t.snow,
    why: 'Có tuyết: đường đóng băng rất trơn, cần đế bám.' },
  { id: 'sun-hat',   name: 'Nón rộng vành',     cat: 'out', unit: 'cái', g: 100, kind: 'special', when: t => hot(t) || t.beach,
    why: t => t.beach ? 'Đi biển, nắng gắt.' : `Nhiệt độ cao nhất ${t.tmax} °C.` },
  { id: 'swim',      name: 'Đồ bơi',            cat: 'cloth', unit: 'bộ', g: 150, kind: 'special', when: t => t.beach,
    why: 'Nơi đến có biển.' },
  { id: 'quick-dry', name: 'Áo mau khô',        cat: 'cloth', unit: 'cái', g: 150, qty: t => t.days, kind: 'special', when: t => hot(t) && t.humid === 'wet',
    why: 'Trời nóng ẩm, ra nhiều mồ hôi.' },
  { id: 'hike-pants',name: 'Quần đi rừng',      cat: 'cloth', unit: 'cái', g: 450, kind: 'special', when: t => t.mountain,
    why: 'Đi núi: quần dài vải dày chống côn trùng, gai, vắt.' },
  { id: 'trek-shoe', name: 'Giày leo núi',      cat: 'cloth', unit: 'đôi', g: 1000, kind: 'special', when: t => t.mountain,
    why: 'Đường mòn, dốc, trơn.' },

  /* ---------- vệ sinh cá nhân ---------- */
  { id: 'toothbrush',name: 'Bàn chải, kem đánh răng', cat: 'care', unit: 'bộ', g: 80, ml: 50 },
  { id: 'face-wash', name: 'Sữa rửa mặt',       cat: 'care', unit: 'chai', g: 60, ml: 50 },
  { id: 'shampoo',   name: 'Dầu gội, sữa tắm',  cat: 'care', unit: 'chai', qty: 2, g: 100, ml: 100, when: t => t.long || t.rural || t.mountain },
  { id: 'deodorant', name: 'Lăn khử mùi',       cat: 'care', unit: 'cái', g: 60, ml: 50 },
  { id: 'moisturizer',name: 'Kem dưỡng ẩm',     cat: 'care', unit: 'tuýp', g: 80, ml: 75, kind: 'special', when: t => t.humid === 'dry' || veryCold(t),
    why: 'Không khí khô hoặc lạnh làm da nứt nẻ.' },
  { id: 'sunscreen', name: 'Kem chống nắng',    cat: 'care', unit: 'tuýp', g: 80, ml: 50, kind: 'special', when: t => t.sunny || t.snow,
    why: t => t.snow ? 'Tuyết phản chiếu tia UV rất mạnh.' : t.beach ? 'Đi biển.' : `Nhiệt độ cao nhất ${t.tmax} °C, thường là trời nắng.` },
  { id: 'comb',      name: 'Lược',              cat: 'care', unit: 'cái', g: 30 },
  { id: 'razor',     name: 'Đồ cạo/nhổ râu',    cat: 'care', unit: 'bộ', g: 50 },
  { id: 'tissue',    name: 'Khăn giấy',         cat: 'care', unit: 'gói', qty: 2, g: 60, kind: 'personal', home: 'backpack' },
  { id: 'mask',      name: 'Khẩu trang',        cat: 'care', unit: 'cái', qty: t => t.days + 1, g: 5, kind: 'personal', home: 'cross' },
  { id: 'towel',     name: 'Khăn tắm',          cat: 'care', unit: 'cái', g: 200, when: outdoor },
  { id: 'nail',      name: 'Đồ cắt móng',       cat: 'care', unit: 'bộ', g: 40, when: t => t.long },
  { id: 'laundry',   name: 'Đồ giặt',           cat: 'care', unit: 'bộ', g: 200, kind: 'special', when: t => t.long,
    why: 'Đi trên 3 ngày: mang túi giặt, gói bột giặt nhỏ, móc phơi để giặt thay vì mang thêm đồ.' },

  /* ---------- thuốc ---------- */
  { id: 'meds',      name: 'Thuốc thường dùng', cat: 'med', unit: t => t.long ? 'bộ' : 'ngày', qty: t => t.long ? 1 : t.real + 2, kind: 'personal',
    why: t => (t.long ? 'Mang đủ cho cả chuyến, dư 2 ngày' : 'Mang dư 2 ngày') + ' phòng trễ chuyến; đi nước ngoài thì mang theo toa thuốc.' },
  { id: 'firstaid',  name: 'Thuốc cơ bản',      cat: 'med', unit: 'bộ', g: 150,
    why: 'Hạ sốt, giảm đau, đau bụng, dị ứng.' },
  { id: 'bandage',   name: 'Băng keo cá nhân',  cat: 'med', unit: 'hộp', g: 50, when: t => outdoor(t) || t.long },
  { id: 'motion',    name: 'Thuốc say xe',      cat: 'med', unit: 'vỉ', g: 10, kind: 'special', when: t => t.ground || t.beach,
    why: 'Đi tàu, xe, thuyền đường dài.' },
  { id: 'ors',       name: 'Oresol',            cat: 'med', unit: 'gói', qty: 3, g: 20, kind: 'special', when: t => hot(t) || t.mountain,
    why: 'Trời nóng hoặc leo núi dễ mất nước.' },
  { id: 'repellent', name: 'Thuốc chống muỗi',  cat: 'med', unit: 'chai', g: 100, ml: 100, kind: 'special',
    when: t => t.mountain || t.rural || (hot(t) && t.humid === 'wet'),
    why: 'Vùng quê, vùng núi, nơi nóng ẩm có nhiều muỗi.' },
  { id: 'glasses',   name: 'Mắt kiếng',         cat: 'med', unit: 'bộ', g: 80, kind: 'personal' },
  { id: 'thermo',    name: 'Nhiệt kế',          cat: 'med', unit: 'cái', g: 30, when: t => t.long || t.mountain },

  /* ---------- thời tiết & ngoài trời ---------- */
  { id: 'umbrella',  name: 'Dù xếp',            cat: 'out', unit: 'cái', g: 300, kind: 'special', home: 'backpack', when: t => t.rain || (hot(t) && t.city),
    why: t => t.rain ? 'Có mưa.' : 'Che nắng khi đi bộ trong thành phố.' },
  { id: 'pack-cover',name: 'Bọc balo',          cat: 'out', unit: 'cái', g: 100, kind: 'special', home: 'backpack', when: t => t.rain,
    why: 'Có mưa: giữ đồ trong balo khô.' },
  { id: 'raincoat',  name: 'Áo mưa',            cat: 'out', unit: 'cái', g: 250, kind: 'special', when: t => t.rain && (t.ground || outdoor(t)),
    why: 'Có mưa, đi ngoài trời nhiều.' },
  { id: 'dry-bag',   name: 'Túi chống nước',    cat: 'out', unit: 'cái', g: 50, kind: 'special', when: t => t.rain || t.beach || t.mountain,
    why: 'Giữ khô điện thoại, giấy tờ khi mưa, đi biển, lội suối.' },
  { id: 'sunglasses',name: 'Kiếng mát',         cat: 'out', unit: 'cái', g: 40, kind: 'special', when: t => t.sunny || t.snow,
    why: t => t.snow ? 'Tuyết chói, dễ hại mắt.' : 'Trời nắng.' },
  { id: 'bottle',    name: 'Bình nước',         cat: 'out', unit: 'cái', g: 250, kind: 'personal', home: 'backpack',
    why: t => t.plane ? 'Đi máy bay: để bình rỗng khi qua cửa an ninh, rót nước sau đó.' : '' },
  { id: 'snack',     name: 'Đồ ăn vặt',         cat: 'out', unit: 'gói', qty: 2, g: 100, home: 'backpack' },
  { id: 'knife',     name: 'Dao đa năng',       cat: 'out', unit: 'cái', g: 100, kind: 'special', when: t => t.mountain,
    why: t => t.plane ? 'Đi núi. Đi máy bay thì phải để trong hành lý ký gởi.' : 'Đi núi.' },
  { id: 'whistle',   name: 'Còi',               cat: 'out', unit: 'cái', g: 10, kind: 'special', when: t => t.mountain,
    why: 'Báo hiệu khi bị lạc (xem trang Kỹ năng sống còn).' },
  { id: 'heat-pad',  name: 'Miếng làm ấm (heat pad)', cat: 'out', unit: 'miếng', qty: t => t.days * 2, g: 40, kind: 'special', when: t => t.tmin < 5,
    why: t => `Nhiệt độ có thể xuống ${t.tmin} °C.` },
  { id: 'cool-pad',  name: 'Miếng làm mát (cooling pad)', cat: 'out', unit: 'miếng', qty: t => t.days * 2, g: 30, kind: 'special', when: t => t.tmax >= 33,
    why: t => `Nhiệt độ có thể lên ${t.tmax} °C.` },

  /* ---------- linh tinh ---------- */
  { id: 'keys',      name: 'Chìa khóa nhà',     cat: 'misc', unit: 'chùm', g: 60, kind: 'personal' },
  { id: 'trash-bag', name: 'Túi rác',           cat: 'misc', unit: 'cái', qty: 3, g: 10, home: 'backpack' },
  { id: 'name-tag',  name: 'Thẻ tên',           cat: 'misc', unit: 'cái', g: 10, kind: 'special', when: t => t.plane && t.suitcase,
    why: 'Gắn lên vali ký gởi, ghi tên và số điện thoại.' },
  { id: 'lug-mark',  name: 'Đồ làm dấu vali',   cat: 'misc', unit: 'cái', g: 20, kind: 'special', when: t => t.plane && t.suitcase,
    why: 'Dây hoặc thẻ màu nổi để nhận ra vali nhanh ở băng chuyền.' },
  { id: 'pen',       name: 'Viết',              cat: 'misc', unit: 'cây', g: 10, kind: 'personal', when: t => t.intl,
    why: 'Điền tờ khai nhập cảnh.' },
  { id: 'neck-pillow',name: 'Gối cổ, bịt mắt',  cat: 'misc', unit: 'bộ', g: 150, when: t => t.plane || t.ground },
  { id: 'zip-bags',  name: 'Túi zip',           cat: 'misc', unit: 'cái', qty: 3, g: 10,
    why: t => t.plane ? 'Đi máy bay: chất lỏng xách tay (mỗi chai tối đa 100 ml) phải để chung trong túi trong suốt khoảng 1 lít.' : '' },
];

window.HL_DATA = { CATS, CONTAINERS, ITEMS };
})();
