/* =====================================================================
   Linh tinh: minh họa "Cơ thể qua từng độ tuổi" (id: aging, trang lao-hoa.html)
   Mọi đường cong là TRUNG BÌNH / TRUNG VỊ quần thể; khác biệt giữa người với người rất lớn.
   Nguồn (chi tiết ở cuối trang lao-hoa.html):
   - Nhìn gần: công thức Hofstetter (1950): biên độ điều tiết TB = 18,5 − 0,30·tuổi, tối thiểu = 15 − 0,25·tuổi (đi-ốp).
   - Ánh sáng tới võng mạc: Weale; người 60 tuổi nhận khoảng 1/3 so với người 20 tuổi; nội suy hàm mũ.
   - Thính lực: ISO 7029:2000, ngưỡng trung vị lệch = α·(tuổi − 18)², hợp lệ 18–70 tuổi.
   - Da: collagen giảm ~1%/năm (Shuster et al. 1975).
   CẤP ĐỘ (LEVELS): Tốt / Khá / Trung bình / Kém. Thính lực theo thang WHO 2021 (trung bình 0,5–1–2–4 kHz:
   < 20, 20–34, 35–49, ≥ 50 dB). Các ô khác: ngưỡng do người soạn chọn theo % so với tuổi 20 (xem levelOf).
   - Nhịp tim tối đa: Tanaka et al. (2001): 208 − 0,7·tuổi.
   - Trí não: tuổi đạt đỉnh theo Hartshorne & Germine (2015); hình dạng đường cong là minh họa.
   - Đĩa đệm: Brinjikji et al. (2015), tỉ lệ người KHÔNG đau lưng có thoái hóa / mất tín hiệu / thấp đĩa / phình đĩa
     trên MRI-CT ở các mốc 20…80 tuổi; nội suy tuyến tính, trên 80 tuổi giữ số liệu tuổi 80. Hình cột sống là minh họa.
   - Tốc độ đi bộ: Bohannon & Andrews (2011), trung bình theo nhóm 10 tuổi và giới; mốc dưới 0,8 m/s theo Studenski et al. (2011).
   LỜI KHUYÊN: tuổi ≤ NO_TIPS_MAX không hiện lời khuyên nào; tuổi ≥ DOCTOR_AGE, ô lời khuyên chung chỉ còn
   một ý: cần tư vấn bác sĩ (lời khuyên trong từng ô vẫn hiện theo cấp độ).
   EDIT: số liệu ở các hằng số ngay dưới đây.
   ===================================================================== */
(() => {
const { COLORS: C, range, watchCanvas, setTxt, pressGroup, num } = LT;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* LỜI KHUYÊN theo tuổi / giới (ngắn gọn). Chỉ đưa khuyến nghị chính thức hoặc có thử nghiệm; nguồn [6], [8]–[15] trên trang (liên kết trong dòng "Nguồn" cuối mỗi ô).
   WHO 2020 (vận động), WHO healthy diet, IOM 2011 (canxi, vitamin D), Pullar 2017 (đạm, vitamin C cho collagen),
   USPSTF 2025 (đo mật độ xương), AAO (khám mắt), Hughes 2013 (kem chống nắng). */
const NO_TIPS_MAX = 28, DOCTOR_AGE = 60;
// [nguồn] đánh số như danh sách tài liệu trên trang
const REF = { 1: 'https://scholar.google.com/scholar?q=%22Useful+age-amplitude+formula%22+Hofstetter', 2: 'https://scholar.google.com/scholar?q=%22Retinal+illumination+and+age%22+Weale',
  3: 'https://doi.org/10.1111/j.1365-2133.1975.tb05113.x', 4: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4441622/', 5: 'https://www.iso.org/standard/42916.html',
  6: 'https://www.who.int/publications/i/item/9789240020481', 7: 'https://doi.org/10.1016/S0735-1097(00)01054-8', 8: 'https://doi.org/10.1136/bjsports-2020-102955',
  9: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', 10: 'https://nap.nationalacademies.org/catalog/13050', 11: 'https://www.bones.nih.gov/health-info/bone/osteoporosis/bone-mass',
  12: 'https://doi.org/10.7326/0003-4819-158-11-201306040-00002', 13: 'https://www.aao.org/newsroom/news-releases/detail/your-brain-may-be-disguising-blinding-eye-disease',
  14: 'https://doi.org/10.3390/nu9080866', 15: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening',
  16: 'https://www.who.int/publications/i/item/9789241550543', 17: 'https://doi.org/10.3174/ajnr.A4173', 18: 'https://doi.org/10.1016/j.physio.2010.12.004',
  19: 'https://doi.org/10.1001/jama.2010.1923', 20: 'https://www.ncbi.nlm.nih.gov/books/NBK599210/' };
const srcHTML = ns => 'Nguồn: ' + [...new Set(ns)].sort((x, y) => x - y).map(n => `<a href="${REF[n]}" rel="noopener">[${n}]</a>`).join(', ');
/* Lời khuyên CHUNG (không gắn với ô nào): [nội dung, nguồn] */
function advice(a, s) {
  if (a >= DOCTOR_AGE) return [['Cần tư vấn bác sĩ để nhận các lời khuyên về sức khỏe.', 0]];
  const L = [];
  L.push(['Nên vận động 150–300 phút mỗi tuần, tập sức mạnh ≥ 2 ngày mỗi tuần.', 8]);
  L.push(['Nên ăn rau, trái cây ≥ 400 g mỗi ngày.', 9]);
  L.push(['Tránh ăn mặn (muối < 5 g mỗi ngày) và nhiều đường.', 9]);
  const ca = s === 'f' && a >= 51 ? 1200 : 1000, vd = 600;
  L.push([`Nên nạp canxi ${ca.toLocaleString('vi-VN')} mg, vitamin D ${vd} IU mỗi ngày, ưu tiên từ thức ăn.`, 10]);
  if (a < 40) L.push(['Nên vận động chịu lực (chạy, nhảy, tập tạ) để xương chắc.', 11]);
  if (s === 'f' && a >= 45) L.push(['Nên hỏi bác sĩ về đo mật độ xương nếu đã mãn kinh và có yếu tố nguy cơ.', 15]);
  L.push(['Tránh hút thuốc.', 0]);
  return L;
}
/* Lời khuyên GẮN VỚI Ô: chỉ trả về khi cấp độ của ô không còn Tốt (k ≥ 1). [nội dung, [nguồn]] */
function eyeExam(a) { return a < 40 ? 'Nên khám mắt khi thấy mờ hoặc khó chịu.' : a < 55 ? 'Nên khám mắt nền ở tuổi 40, sau đó 2–4 năm một lần.' : a < 65 ? 'Nên khám mắt 1–3 năm một lần.' : 'Nên khám mắt 1–2 năm một lần.'; }
const TIPS = {
  near: (a, k, add) => [[`Nên đeo kiếng lão${add ? ' (khoảng +' + add.toFixed(2).replace('.', ',') + ')' : ''} khi đọc gần.`, [13]], [eyeExam(a), [13]]],
  light: () => [['Nên dùng đèn sáng hơn khi đọc, nhất là buổi tối.', [2]], ['Nên khám mắt khi thấy chói, mờ, màu nhạt đi (đục thủy tinh thể).', [13]]],
  skin: () => [['Nên thoa kem chống nắng hằng ngày.', [12]], ['Nên ăn đủ protein và vitamin C (rau, trái cây tươi) để cơ thể tạo collagen.', [14]]],
  cog: () => [['Nên vận động đều; giữ huyết áp, đường huyết ổn định.', [16]], ['Tránh hút thuốc.', [16]]],
  hear: () => [['Nên đi đo thính lực; dùng máy trợ thính nếu được khuyên.', [6]], ['Tránh tiếng ồn lớn kéo dài.', [6]]],
  spine: () => [['Nên vận động đều, tập cơ lưng và bụng; ngồi lâu thì đứng dậy đi lại.', [8, 20]],
    ['Nên đi khám nếu đau lưng kéo dài hoặc kèm tê, yếu chân. Thoái hóa trên phim chụp rất hay gặp cả ở người không đau.', [17, 20]]],
  walk: a => [[a >= 65 ? 'Nên tập thăng bằng và sức mạnh chân ≥ 3 ngày mỗi tuần để đi vững, giảm té.' : 'Nên tập sức mạnh chân (ngồi xuống đứng lên, leo cầu thang) ≥ 2 ngày mỗi tuần.', [8]],
    ['Nên đi khám nếu thấy mình đi chậm hẳn đi, hay vấp hoặc té.', [19]]],
  hr: () => [['Nên tập sức bền đều (đi nhanh, bơi, đạp xe) để giữ thể lực.', [8]], ['Nên tính nhịp khi tập theo 208 − 0,7 × tuổi; tránh dùng 220 − tuổi.', [7]]],
};
const tipLi = t => `<li>${t.replace(/^(Nên|Tránh|Cần)/, '<b>$1</b>')}</li>`;
const lerpPts = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const ACC_AVG = a => Math.max(18.5 - 0.30 * a, 0.5), ACC_MIN = a => Math.max(15 - 0.25 * a, 0);
const LIGHT = a => Math.exp(-Math.log(3) / 40 * Math.max(0, a - 20));          // 1 ở 20 tuổi, 1/3 ở 60 tuổi
const FREQ = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const ALPHA = { // ISO 7029:2000, hệ số α (dB/năm²)
  m: { 250: 0.0030, 500: 0.0035, 1000: 0.0040, 2000: 0.0070, 3000: 0.0115, 4000: 0.0160, 6000: 0.0180, 8000: 0.0220 },
  f: { 250: 0.0030, 500: 0.0035, 1000: 0.0040, 2000: 0.0060, 3000: 0.0075, 4000: 0.0090, 6000: 0.0120, 8000: 0.0150 } };
const HR = a => 208 - 0.7 * a;
// Collagen của da: giảm khoảng 1% mỗi năm ở người trưởng thành (Shuster et al. 1975); tính lũy thừa từ tuổi 20.
const COLL = a => Math.pow(0.99, Math.max(0, a - 20));
// vị trí cố định của các sợi collagen (để hình không nhảy khi kéo tuổi)
const R0 = LT.rng(5), FIB = [...Array(46)].map(() => [R0(), R0(), R0() * 6.28, R0()]);
/* ĐĨA ĐỆM (Brinjikji et al. 2015): % người không đau lưng có dấu hiệu trên MRI/CT ở tuổi 20, 30, …, 80.
   deg: thoái hóa đĩa đệm; dark: mất tín hiệu ("đĩa đen", mất nước); thin: đĩa thấp đi; bulge: phình đĩa. */
const DISC_AGES = [20, 30, 40, 50, 60, 70, 80];
const DISC = { deg: [37, 52, 68, 80, 88, 93, 96], dark: [17, 33, 54, 73, 86, 94, 97], thin: [24, 34, 45, 56, 67, 76, 84], bulge: [30, 40, 50, 60, 69, 77, 84] };
const discP = (k, a) => lerpPts(DISC_AGES.map((x, i) => [x, DISC[k][i] / 100]), a);
/* TỐC ĐỘ ĐI BỘ thường (Bohannon & Andrews 2011), m/s, đặt ở giữa mỗi nhóm tuổi (nhóm 80–99 đặt ở 85). */
const GAIT_AGES = [25, 35, 45, 55, 65, 75, 85];
const GAIT = { m: [1.36, 1.43, 1.43, 1.43, 1.34, 1.26, 0.97], f: [1.34, 1.34, 1.39, 1.31, 1.24, 1.13, 0.94] };
const GAITV = (s, a) => lerpPts(GAIT_AGES.map((x, i) => [x, GAIT[s][i]]), a);
const WALK_M = 10;   // quãng đường minh họa (m)
const COG = [ // [tên, đỉnh từ, đỉnh đến, độ rộng trái, độ rộng phải, màu]
  ['Tốc độ xử lý', 18, 19, 6, 38, '#d8312a'], ['Trí nhớ ngắn hạn', 25, 35, 8, 32, '#3787c4']];
const LEVELS = [['Tốt', '#3f9d6a', '#ffffff'], ['Khá', '#f2c230', '#1B1920'], ['Trung bình', '#E88C28', '#1B1920'], ['Kém', '#d8312a', '#ffffff']];
const WARN = '<svg class="lv-warn" viewBox="0 0 16 16" width="15" height="15" aria-label="cảnh báo"><path d="M8 1.5 15 14H1z" fill="#f2c230" stroke="#1B1920" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6v4" stroke="#1B1920" stroke-width="1.6"/><circle cx="8" cy="12" r=".9" fill="#1B1920"/></svg>';
const step = (v, t1, t2, t3, up = true) => up ? (v >= t1 ? 0 : v >= t2 ? 1 : v >= t3 ? 2 : 3) : (v < t1 ? 0 : v < t2 ? 1 : v < t3 ? 2 : 3);
const PTA = (s, a) => [500, 1000, 2000, 4000].reduce((t, f) => t + ALPHA[s][f], 0) / 4 * Math.max(0, a - 18) ** 2;   // WHO: trung bình 4 tần số
const cogV = ([, a, b, wl, wr], x) => x < a ? Math.exp(-(((x - a) / wl) ** 2)) : x > b ? Math.exp(-(((x - b) / wr) ** 2)) : 1;

/* đồ thị đường đơn giản */
function chart(st, { x0 = 20, x1 = 90, y0, y1, series, marker, ylab, yticks, invert = false, bands = [] }) {
  const { ctx, W, H } = st; if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  const l = 36, r = 8, t = 8, b = 20, w = W - l - r, h = H - t - b;
  const X = x => l + (x - x0) / (x1 - x0) * w, Y = y => invert ? t + (y - y0) / (y1 - y0) * h : t + (1 - (y - y0) / (y1 - y0)) * h;
  bands.forEach(([a, c, col]) => { ctx.fillStyle = col; const ya = Y(a), yc = Y(c); ctx.fillRect(l, Math.min(ya, yc), w, Math.abs(yc - ya)); });
  ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(l, t, w, h);
  ctx.fillStyle = C.muted; ctx.font = '10.5px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center';
  for (let a = x0; a <= x1; a += 10) ctx.fillText(a, X(a), t + h + 13);
  ctx.textAlign = 'right'; (yticks || [y0, y1]).forEach(v => ctx.fillText(num(v, 3), l - 4, Y(v) + 4)); ctx.textAlign = 'left';
  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.w || 2; ctx.setLineDash(s.dash || []); ctx.beginPath();
    for (let x = x0; x <= x1; x += 0.5) { const y = clamp(s.fn(x), Math.min(y0, y1), Math.max(y0, y1)); x === x0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y)); }
    ctx.stroke(); ctx.setLineDash([]);
  });
  if (marker) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(marker.x), t); ctx.lineTo(X(marker.x), t + h); ctx.stroke(); ctx.setLineDash([]);
    (marker.ys || [marker.y]).forEach(y => { if (y == null) return; ctx.fillStyle = C.pos; ctx.beginPath(); ctx.arc(X(marker.x), Y(clamp(y, Math.min(y0, y1), Math.max(y0, y1))), 4.5, 0, Math.PI * 2); ctx.fill(); }); }
  if (ylab) { ctx.fillStyle = C.muted; ctx.fillText(ylab, l + 4, t + 11); }
}

LT.demo('aging', {
  html: `<div class="ag-sticky">
      <div class="agebar"><label for="agA" class="agelab" style="font-weight:600">Tuổi</label>
        <input type="range" id="agA" min="20" max="90" step="1" value="35"><div class="age" id="agV" aria-live="polite">35</div></div>
      <div class="btnrow" role="group" aria-label="Giới tính">
        <button class="btn" type="button" data-s="m" aria-pressed="true">Nam</button>
        <button class="btn" type="button" data-s="f" aria-pressed="false">Nữ</button></div>
    </div>
    <div class="lt-grid">
      <div class="lt-card"><h5 id="hNear" data-t="Nhìn gần">Nhìn gần</h5>
        <div id="agTxt" style="border:1px dashed #9DA4AD;padding:8px 10px;font-size:15px;line-height:1.45;background:#fffdf6">Uống 1 viên sau bữa ăn, ngày 2 lần. Không dùng quá 6 viên mỗi ngày.</div>
        <p class="one">Đọc ở 35 cm, không đeo kiếng</p>
        <p class="one" id="agAddRow">Kính lão <b id="agAdd">—</b></p>
        <div class="tip" id="tNear" hidden></div><p class="src" id="sNear"></p></div>
      <div class="lt-card"><h5 id="hLight" data-t="Ánh sáng và màu sắc">Ánh sáng và màu sắc</h5><canvas id="agScene" style="height:140px"></canvas>
        <p class="one">Ánh sáng tới võng mạc <b id="agLt">—</b></p>
        <div class="tip" id="tLight" hidden></div><p class="src" id="sLight"></p></div>
      <div class="lt-card"><h5 id="hSpine" data-t="Đĩa đệm cột sống">Đĩa đệm cột sống</h5><canvas id="agSpine" style="height:150px"></canvas>
        <p class="one">Nguy cơ thoái hóa đĩa đệm<b id="agDeg">—</b></p>
        <p class="one">Đĩa đệm bị mỏng đi<b id="agThin">—</b></p>
        <div class="tip" id="tSpine" hidden></div><p class="src" id="sSpine"></p></div>
      <div class="lt-card"><h5 id="hWalk" data-t="Tốc độ đi bộ">Tốc độ đi bộ</h5><canvas id="agWalk" style="height:140px" role="img" aria-label="Hai người cùng đi 10 mét: người 20 tuổi và người ở tuổi đang chọn"></canvas>
        <p class="one">Tốc độ đi thường <b id="agGv">—</b></p>
        <p class="one">Đi ${WALK_M} m mất <b id="agGt">—</b></p>
        <div class="tip" id="tWalk" hidden></div><p class="src" id="sWalk"></p></div>
      <div class="lt-card"><h5 id="hSkin" data-t="Da">Da</h5><canvas id="agSkin" style="height:140px"></canvas>
        <p class="one">Collagen so với tuổi 20 <b id="agCo">—</b></p>
        <div class="tip" id="tSkin" hidden></div><p class="src" id="sSkin"></p></div>
      <div class="lt-card"><h5 id="hCog" data-t="Trí não">Trí não</h5><canvas id="agCog" style="height:140px"></canvas>
        <div id="agCl" class="cog-leg"></div>
        <div class="tip" id="tCog" hidden></div><p class="src" id="sCog"></p></div>
      <div class="lt-card"><h5 id="hHear" data-t="Thính lực">Thính lực</h5><canvas id="agAud" style="height:150px"></canvas>
        <p class="one">Mất nghe trung bình <b id="agPta">—</b></p>
        <div class="btnrow" id="agTones" style="margin-top:8px"></div><p class="note-s" style="margin:4px 0 0">⚠ Hạ âm lượng trước khi bấm</p>
        <div class="tip" id="tHear" hidden></div><p class="src" id="sHear"></p></div>
      <div class="lt-card"><h5 id="hHr" data-t="Nhịp tim tối đa">Nhịp tim tối đa</h5><canvas id="agHr" style="height:140px"></canvas>
        <p class="one">Lần/phút <b id="agHv">—</b></p>
        <div class="tip" id="tHr" hidden></div><p class="src" id="sHr"></p></div>
      <div class="lt-card ag-advice" id="agAdvCard" style="grid-column:1 / -1"><h5 id="agAdvT">Lời khuyên chung</h5><div class="tip"><ul id="agAdv"></ul></div>
        <p class="src" id="agAdvSrc">Khuyến nghị chung cho người khỏe mạnh; hỏi bác sĩ trước khi dùng thuốc bổ.<br><span id="sAdv"></span></p></div>
    </div>`,
  init(root) {
    const $ = id => document.getElementById(id);
    let sex = 'm', ac = null;
    const aR = range('agA', { show: v => v, onInput: upd });
    const sb = [...root.querySelectorAll('[data-s]')];
    sb.forEach(b => b.addEventListener('click', () => { sex = b.dataset.s; pressGroup(sb, b); upd(); }));
    // âm thử
    [1000, 8000, 15000, 17400].forEach(f => {
      const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = '♪ ' + (f / 1000).toLocaleString('vi-VN') + ' kHz';
      b.addEventListener('click', () => {
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
          o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.1); g.gain.setValueAtTime(0.04, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 1.4);
          o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.5);
        } catch (e) { b.disabled = true; b.title = 'Trình duyệt không hỗ trợ phát âm thanh'; }
      });
      $('agTones').appendChild(b);
    });
    const ss = {}, sa = {}, sh = {}, sc = {}, sk = {}, sp = {}, sw = {};
    let wt = 0;   // thời gian (giây) của lượt đi bộ đang chạy
    const mix = (p, q, u) => '#' + p.map((v, i) => Math.round(v + (q[i] - v) * u).toString(16).padStart(2, '0')).join('');
    // tô màu thanh tiêu đề theo cấp độ
    // lời khuyên trong ô: chỉ hiện khi cấp độ không còn Tốt
    function tip(key, k, tips, base) {
      const el = $('t' + key), show = aR.get() > NO_TIPS_MAX && k >= 1 && tips && tips.length;
      el.hidden = !show; el.style.borderLeftColor = LEVELS[k][1];
      el.innerHTML = show ? '<ul>' + tips.map(t => tipLi(t[0])).join('') + '</ul>' : '';
      $('s' + key).innerHTML = srcHTML(base.concat(show ? tips.flatMap(t => t[1]) : []));
    }
    function setLevel(id, k) { const h = $(id), [lab, bg, fg] = LEVELS[k]; h.className = 'lvl'; h.style.background = bg; h.style.color = fg; h.innerHTML = `${h.dataset.t} · ${lab}${k === 3 ? ' ' + WARN : ''}`; }
    // cảnh màu cho ô "ánh sáng và màu sắc"
    let base = null;
    function paintScene() {
      const { ctx, W, H, dpr } = ss; if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5BA8E0'); g.addColorStop(1, '#CFE9F7'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.25, H * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6CC48A'; ctx.fillRect(0, H * 0.68, W, H * 0.32);
      const fl = ['#3D5BD9', '#8f63c9', '#D8312A', '#FFFFFF', '#3D5BD9', '#E88C28', '#8f63c9'];
      fl.forEach((c, i) => { const x = W * (0.08 + i * 0.13), y = H * (0.8 + (i % 2) * 0.08); ctx.fillStyle = c; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * 6, y + Math.sin(k * 1.26) * 6, 5, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#1B1920'; ctx.font = '600 13px "Be Vietnam Pro", sans-serif'; ctx.fillText('xanh lam · tím · trắng', 10, 20);
      base = ctx.getImageData(0, 0, Math.round(W * dpr), Math.round(H * dpr));
    }
    function sceneAge(a) {
      const { ctx } = ss; if (!ctx || !base) return;
      const img = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height), d = img.data;
      const k = Math.sqrt(LIGHT(a)), y = clamp((a - 20) / 70, 0, 1);    // tối đi (căn bậc hai: thị giác thích nghi một phần), ngả vàng
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b;
        d[i] = (r * (1 - 0.15 * y) + lum * 0.15 * y) * k; d[i + 1] = (g * (1 - 0.1 * y) + lum * 0.05 * y) * k * 0.98; d[i + 2] = b * (1 - 0.45 * y) * k;
      }
      ctx.putImageData(img, 0, 0);
    }
    watchCanvas($('agScene'), ss, () => { paintScene(); upd(); });
    [['agAud', sa], ['agHr', sh], ['agCog', sc], ['agSkin', sk], ['agSpine', sp], ['agWalk', sw]].forEach(([id, s]) => watchCanvas($(id), s, () => upd()));
    // da: mặt cắt, số sợi collagen tỉ lệ với lượng collagen
    function skin(a) {
      const { ctx, W, H } = sk; if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const ep = H * 0.16, c = COLL(a);
      ctx.fillStyle = '#E9B48A'; ctx.fillRect(0, 0, W, ep);
      ctx.strokeStyle = '#C98A60'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = 0; x <= W; x += 4) { const y = ep + Math.sin(x / 9) * (2 + 4 * c); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.fillStyle = '#F8DCCB'; ctx.fillRect(0, ep + 6, W, H - ep - 6);
      ctx.strokeStyle = '#C0504D'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      FIB.forEach(([u, v, ph, k]) => { if (k > c) return; const x = u * (W - 40) + 10, y = ep + 16 + v * (H - ep - 30);
        ctx.beginPath(); for (let i = 0; i <= 10; i++) { const xx = x + i * 3.4, yy = y + Math.sin(ph + i * 0.9) * 3; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); });
      ctx.fillStyle = C.muted; ctx.font = '11px "Be Vietnam Pro", sans-serif'; ctx.fillText('biểu bì', 6, 12); ctx.fillText('lớp bì: sợi collagen (đỏ)', 6, H - 6);
    }
    /* đĩa đệm: mặt cắt dọc 3 đốt sống + 2 đĩa (minh họa). Độ cao đĩa theo tỉ lệ "thấp đĩa", màu lõi theo tỉ lệ
       "mất tín hiệu" (sáng = nhiều nước), độ phình ra sau theo tỉ lệ "phình đĩa". Bên phải: 10 người không đau lưng. */
    function spine(a) {
      const { ctx, W, H } = sp; if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const nrm = (k, lo, hi) => clamp((discP(k, a) - lo) / (hi - lo), 0, 1);
      const uT = nrm('thin', 0.24, 0.84), uD = nrm('dark', 0.17, 0.97), uB = nrm('bulge', 0.30, 0.84);
      const sw0 = Math.min(W * 0.44, 170), x0 = 14, vw = sw0 - 34, vh = 26, dh = 15 * (1 - 0.5 * uT), bul = 2 + 9 * uB;
      let y = (H - (3 * vh + 2 * dh)) / 2 + 4;
      ctx.font = '11px "Be Vietnam Pro", sans-serif'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#EFE6D6'; ctx.strokeStyle = '#8C7B62'; ctx.beginPath(); ctx.roundRect(x0, y, vw, vh, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#E2D5BE'; ctx.beginPath(); ctx.roundRect(x0 + vw + 3, y + 6, 14, vh - 12, 3); ctx.fill(); ctx.stroke();   // gai sau
        y += vh;
        if (i < 2) {
          ctx.fillStyle = '#D9CDB4'; ctx.strokeStyle = '#8C7B62';
          ctx.beginPath(); ctx.moveTo(x0 + 2, y); ctx.lineTo(x0 + vw - 2, y);
          ctx.quadraticCurveTo(x0 + vw + bul, y + dh / 2, x0 + vw - 2, y + dh); ctx.lineTo(x0 + 2, y + dh);
          ctx.quadraticCurveTo(x0 - 2, y + dh / 2, x0 + 2, y); ctx.fill(); ctx.stroke();
          ctx.fillStyle = mix([123, 205, 232], [74, 79, 87], uD);   // lõi: xanh sáng (nhiều nước) → xám tối
          ctx.beginPath(); ctx.ellipse(x0 + vw * 0.55, y + dh / 2, vw * 0.24, Math.max(2, dh / 2 - 2.5), 0, 0, Math.PI * 2); ctx.fill();
          y += dh;
        }
      }
      ctx.fillStyle = C.muted; ctx.fillText('đốt sống', x0 + 4, 12); ctx.fillText('lõi đĩa đệm', x0 + 4, H - 4);
      // 10 người không đau lưng, tô đỏ số người có thoái hóa đĩa đệm
      const n = Math.round(discP('deg', a) * 10), gx = sw0 + 10, gw = W - gx - 6, cw = gw / 5;
      ctx.fillStyle = C.ink; ctx.font = '600 11.5px "Be Vietnam Pro", sans-serif'; ctx.fillText('10 người không đau lưng', gx, 14);
      for (let i = 0; i < 10; i++) {
        const cx = gx + cw * (i % 5 + 0.5), cy = 40 + Math.floor(i / 5) * 46, r = Math.min(6, cw * 0.18);
        ctx.fillStyle = i < n ? C.pos : '#C9CFD6';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx - r * 1.4, cy + r + 2, r * 2.8, r * 3.2, [r, r, 2, 2]); ctx.fill();
      }
      ctx.font = '11px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = C.pos;
      ctx.fillText(`đỏ: ${n} người có thoái hóa`, gx, H - 18); ctx.fillStyle = C.muted; ctx.fillText(a > 80 ? 'trên MRI (số liệu tuổi 80)' : 'trên MRI', gx, H - 4);
    }
    /* đi bộ: hai người cùng đi ${WALK_M} m; xám = tuổi 20, đỏ = tuổi đang chọn. Chạy lặp khi khung đang hiện. */
    function walker(x, y, dist, col) {
      const { ctx } = sw, ph = Math.sin(dist / 0.7 * Math.PI), sL = 7 * ph;   // bước chân ~0,7 m
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - 30, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x, y - 12);
      ctx.moveTo(x, y - 12); ctx.lineTo(x + sL, y); ctx.moveTo(x, y - 12); ctx.lineTo(x - sL, y);
      ctx.moveTo(x, y - 22); ctx.lineTo(x - sL * 0.7, y - 14); ctx.moveTo(x, y - 22); ctx.lineTo(x + sL * 0.7, y - 14); ctx.stroke();
    }
    function walk() {
      const { ctx, W, H } = sw; if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const a = aR.get(), l = 14, r = 34, w = W - l - r, X = d => l + d / WALK_M * w;
      const lanes = [[20, '#9DA4AD', GAITV(sex, 20), H * 0.45], [a, C.pos, GAITV(sex, a), H * 0.9]];
      ctx.font = '11px "Be Vietnam Pro", sans-serif';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(WALK_M), 4); ctx.lineTo(X(WALK_M), H - 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.fillText(WALK_M + ' m', X(WALK_M) + 4, 12);
      lanes.forEach(([age, col, v, y]) => {
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, y + 1); ctx.lineTo(X(WALK_M), y + 1); ctx.stroke();
        const d = Math.min(WALK_M, v * wt), done = d >= WALK_M;
        walker(X(d), y, d, col);
        ctx.fillStyle = col; ctx.fillText(age === 20 && a !== 20 ? 'tuổi 20' : 'tuổi ' + age, l, y - 36);
        if (done) { ctx.textAlign = 'right'; ctx.fillText((WALK_M / v).toFixed(1).replace('.', ',') + ' giây', X(WALK_M) - 14, y - 36); ctx.textAlign = 'left'; }
      });
    }
    const walkEnd = () => WALK_M / GAITV(sex, aR.get()) + 1.6;   // chờ người chậm hơn tới đích, nghỉ rồi chạy lại
    if (LT.REDUCED) wt = 1e9; else LT.loopWhenVisible($('agWalk'), dt => { wt += dt; if (wt > walkEnd()) wt = 0; walk(); });
    function audiogram(a) {
      const { ctx, W, H } = sa; if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      const l = 36, r = 8, t = 8, b = 20, w = W - l - r, h = H - t - b, X = f => l + Math.log2(f / 250) / 5 * w, Y = dB => t + dB / 80 * h;
      ctx.fillStyle = '#D5EDDD'; ctx.fillRect(l, t, w, Y(20) - t);
      ctx.fillStyle = '#3f9d6a'; ctx.font = '10.5px "Be Vietnam Pro", sans-serif'; ctx.fillText('nghe bình thường (≤ 20 dB)', l + 4, t + 12);
      ctx.strokeStyle = C.line; ctx.strokeRect(l, t, w, h);
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; [250, 500, 1000, 2000, 4000, 8000].forEach(f => ctx.fillText(f >= 1000 ? f / 1000 + 'k' : f, X(f), t + h + 13));
      ctx.textAlign = 'right'; [0, 20, 40, 60, 80].forEach(v => ctx.fillText(v, l - 4, Y(v) + 4)); ctx.textAlign = 'left';
      const curve = (age, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); FREQ.forEach((f, i) => { const v = clamp(ALPHA[sex][f] * Math.max(0, age - 18) ** 2, 0, 80); i ? ctx.lineTo(X(f), Y(v)) : ctx.moveTo(X(f), Y(v)); }); ctx.stroke();
        FREQ.forEach(f => { const v = clamp(ALPHA[sex][f] * Math.max(0, age - 18) ** 2, 0, 80); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(f), Y(v), 3, 0, Math.PI * 2); ctx.fill(); }); };
      curve(20, '#B9C1CA', 1.5); curve(a, C.pos, 2.5);
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('Hz →', W - 10, t + h - 4); ctx.textAlign = 'left';
      ctx.fillStyle = '#9DA4AD'; ctx.fillText('xám: tuổi 20', l + 4, t + h - 6); ctx.fillStyle = C.pos; ctx.fillText(a > 70 ? 'đỏ: tuổi ' + a + ' (ngoại suy)' : 'đỏ: tuổi ' + a, l + 4, t + h - 20);
    }
    function upd() {
      const a = aR.get(); setTxt('agV', a);
      // nhìn gần
      const A = ACC_AVG(a), def = Math.max(0, 1 / 0.35 - A / 2);   // đọc lâu thoải mái: chỉ dùng tối đa 1/2 sức điều tiết
      $('agTxt').style.filter = `blur(${num(def * 1.3, 3).replace(',', '.')}px)`;
      const add = Math.max(0, Math.round((2.5 - ACC_MIN(a) / 2) * 4) / 4);
      setTxt('agAdd', add ? '+' + add.toFixed(2).replace('.', ',') : ''); $('agAddRow').hidden = !add;
      const kN = add === 0 ? 0 : add <= 1 ? 1 : add <= 2 ? 2 : 3; setLevel('hNear', kN); tip('Near', kN, TIPS.near(a, kN, add), [1]);
      // ánh sáng
      sceneAge(a); setTxt('agLt', '≈ ' + Math.round(LIGHT(a) * 100) + '%');
      const kL = step(LIGHT(a), 0.8, 0.55, 0.3); setLevel('hLight', kL); tip('Light', kL, TIPS.light(a), [2]);
      // da
      skin(a); setTxt('agCo', '≈ ' + Math.round(COLL(a) * 100) + '%');
      const kS = step(COLL(a), 0.85, 0.7, 0.55); setLevel('hSkin', kS); tip('Skin', kS, TIPS.skin(), [3]);
      // thính lực (thang WHO 2021)
      audiogram(a); const pta = PTA(sex, a);
      setTxt('agPta', Math.round(pta) + ' dB');
      const kH = step(pta, 20, 35, 50, false); setLevel('hHear', kH); tip('Hear', kH, TIPS.hear(), [5, 6]);
      // tim
      chart(sh, { y0: 140, y1: 200, yticks: [140, 170, 200], series: [{ fn: HR, color: C.pos }], marker: { x: a, y: HR(a) }, ylab: '' });
      setTxt('agHv', Math.round(HR(a))); const kR = step(HR(a) / HR(20), 0.93, 0.85, 0.78); setLevel('hHr', kR); tip('Hr', kR, TIPS.hr(), [7]);
      // đĩa đệm (cấp độ theo tỉ lệ thoái hóa; ngưỡng do người soạn chọn)
      spine(a); const dg = discP('deg', a);
      setTxt('agDeg', '≈ ' + Math.round(dg * 100) + '%'); setTxt('agThin', '≈ ' + Math.round(discP('thin', a) * 100) + '%');
      const kP = step(dg, 0.6, 0.8, 0.95, false); setLevel('hSpine', kP); tip('Spine', kP, TIPS.spine(), [17]);
      // tốc độ đi bộ
      const gv = GAITV(sex, a); if (!LT.REDUCED) wt = 0; walk();
      setTxt('agGv', num(gv, 3) + ' m/s'); setTxt('agGt', (WALK_M / gv).toFixed(1).replace('.', ',') + ' giây');
      const kW = step(gv, 1.2, 1.0, 0.8); setLevel('hWalk', kW); tip('Walk', kW, TIPS.walk(a), [18]);
      // trí não: cấp độ ngay sau mỗi chú giải
      chart(sc, { x0: 15, x1: 90, y0: 0, y1: 1.08, yticks: [], series: COG.map(c => ({ fn: x => cogV(c, x), color: c[5] })), marker: { x: a, ys: COG.map(c => cogV(c, a)) } });
      $('agCl').innerHTML = COG.map(c => { const k = step(cogV(c, a), 0.9, 0.7, 0.45), [lab, bg, fg] = LEVELS[k];
        return `<div><i style="background:${c[5]}"></i>${c[0]} <span class="lvb" style="background:${bg};color:${fg}">${lab}</span>${k === 3 ? WARN : ''}</div>`; }).join('');
      setLevel('hCog', Math.max(...COG.map(c => step(cogV(c, a), 0.9, 0.7, 0.45))));   // nền tiêu đề: theo chỉ số kém hơn
      const kC = Math.max(0, ...COG.filter(c => a > c[2]).map(c => step(cogV(c, a), 0.9, 0.7, 0.45))); tip('Cog', kC, TIPS.cog(), [4]);   // chỉ tính khả năng đã qua đỉnh (đang giảm)
      // lời khuyên
      setTxt('agAdvT', `Lời khuyên chung cho ${sex === 'f' ? 'nữ' : 'nam'} ${a} tuổi`);
      $('agAdvCard').hidden = a <= NO_TIPS_MAX; $('agAdvSrc').hidden = a >= DOCTOR_AGE;
      const adv = advice(a, sex); $('agAdv').innerHTML = adv.map(t => tipLi(t[0])).join(''); $('sAdv').innerHTML = srcHTML(adv.map(t => t[1]).filter(Boolean));
    }
    aR.upd();
  },
});
})();
