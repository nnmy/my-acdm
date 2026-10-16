/* =====================================================================
   Không dây: minh họa "Hai cuộn dây ghép từ" (id: induction, trang 3-nfc-qi.html)
   Nhúng vào trang: <div class="demo" id="demoInd" data-demo="induction"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=induction

   Tính thật (gần đúng một vòng dây cho mỗi cuộn):
     - Hỗ cảm M giữa hai vòng tròn song song (công thức Neumann, cộng số 64 × 64 đoạn dây)
     - Tự cảm L = μ0·a·(ln(8a/w) − 2)  (vòng tròn bán kính a, dây bán kính w)
     - Hệ số ghép k = M / √(L1·L2)  (số vòng dây N triệt tiêu nhau nên bỏ qua được)
     - Hiệu suất truyền tối đa giữa hai cuộn cộng hưởng: η = x / (1 + √(1 + x))², x = k²·Q1·Q2
   Nền màu: độ lớn từ trường của cuộn phát (Biot–Savart), thang log, nhìn ngang.
   Ngưỡng "thẻ NFC đủ năng lượng" là ngưỡng minh họa (η ≈ 15%), chọn để tầm đọc cỡ 4–5 cm như thực tế.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas, FONT } = WL;
const MU = 4e-7 * Math.PI;
// [tên, bán kính cuộn phát, cuộn thu, bán kính dây, Q1, Q2, d max, d mặc định, vùng nhìn ngang ±, chiều cao vùng nhìn]
const MODES = {
  nfc: { name: 'NFC (đầu đọc ↔ thẻ)', a: 0.025, b: 0.022, w: 0.0005, Q1: 30, Q2: 30, dMax: 0.10, d0: 0.02, half: 0.08, top: 0.115 },
  qi: { name: 'Sạc Qi (đế ↔ điện thoại)', a: 0.02, b: 0.02, w: 0.001, Q1: 60, Q2: 60, dMax: 0.05, d0: 0.005, half: 0.06, top: 0.065 },
};
function mutual(a, b, d, s, n = 64) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t1 = 2 * Math.PI * (i + 0.5) / n, x1 = a * Math.cos(t1), y1 = a * Math.sin(t1), ux = -Math.sin(t1), uy = Math.cos(t1);
    for (let j = 0; j < n; j++) {
      const t2 = 2 * Math.PI * (j + 0.5) / n, x2 = s + b * Math.cos(t2), y2 = b * Math.sin(t2);
      sum += (ux * -Math.sin(t2) + uy * Math.cos(t2)) / Math.hypot(x1 - x2, y1 - y2, d);
    }
  }
  return MU / (4 * Math.PI) * sum * a * b * Math.pow(2 * Math.PI / n, 2);
}
const selfL = (a, w) => MU * a * (Math.log(8 * a / w) - 2);
// |B| của vòng dây bán kính a (dòng 1 A) tại điểm (x, 0, z): Biot–Savart rời rạc
function bmag(a, x, z, n = 48) {
  let bx = 0, by = 0, bz = 0;
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * (i + 0.5) / n, px = a * Math.cos(t), py = a * Math.sin(t);
    const dlx = -Math.sin(t) * a * 2 * Math.PI / n, dly = Math.cos(t) * a * 2 * Math.PI / n;
    const rx = x - px, ry = -py, rz = z, r3 = Math.pow(rx * rx + ry * ry + rz * rz, 1.5) + 1e-15;
    bx += dly * rz / r3; by += -dlx * rz / r3; bz += (dlx * ry - dly * rx) / r3;
  }
  return 1e-7 * Math.hypot(bx, by, bz);
}

WL.demo('induction', {
  html: `<div class="demo-title"><h4>Hai cuộn dây ghép từ</h4><span>Kéo khoảng cách và độ lệch, xem năng lượng qua được bao nhiêu</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvInd" class="ar" role="img" aria-label="Nhìn ngang hai cuộn dây: cuộn phát nằm dưới, cuộn thu nằm trên. Nền tô màu cho biết từ trường của cuộn phát mạnh hay yếu: đậm ở sát cuộn dây, nhạt rất nhanh khi ra xa."></canvas></div>
    <div class="panel">
      <div class="seg-btns" id="idM"><button type="button" class="btn" data-m="nfc">NFC</button><button type="button" class="btn" data-m="qi">Sạc Qi</button></div>
      <div class="ctrl"><label for="idD">Khoảng cách d</label><output for="idD"></output><input type="range" id="idD" min="0.002" max="0.1" step="0.0005" value="0.02"></div>
      <div class="ctrl"><label for="idS">Lệch ngang s</label><output for="idS"></output><input type="range" id="idS" min="0" max="0.05" step="0.0005" value="0"></div>
      <dl class="readout" aria-live="polite">
        <dt>Hệ số ghép k</dt><dd id="idK">—</dd>
        <dt>Hiệu suất giữa 2 cuộn η</dt><dd class="big" id="idE">—</dd>
        <dt id="idXl">—</dt><dd id="idX">—</dd>
      </dl>
      <p class="note-s" id="idNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvInd'), st = {};
    let key = 'nfc', md = MODES.nfc, heat = null;
    const rD = range('idD', { show: v => num(v * 100, 3) + ' cm', onInput: draw });
    const rS = range('idS', { show: v => num(v * 100, 3) + ' cm', onInput: draw });
    const mb = document.getElementById('idM');
    mb.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
    function setMode(k) {
      key = k; md = MODES[k]; heat = null;
      mb.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === k)));
      rD.el.max = md.dMax; rD.set(md.d0); rS.set(0);
    }
    function buildHeat(W, H, X, Z) {
      const cell = 6, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), img = [];
      const bref = bmag(md.a, 0, md.a * 0.25);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = X.inv((c + 0.5) * cell), z = Z.inv((r + 0.5) * cell), b = bmag(md.a, x, Math.abs(z) < md.w * 2 ? md.w * 2 : z);
        img.push([c * cell, r * cell, Math.max(0, Math.min(1, (Math.log10(b / bref) + 2.5) / 3))]);
      }
      return { W, H, cell, img };
    }
    function draw() {
      const d = rD.get(), s = rS.get();
      const k = mutual(md.a, md.b, Math.max(d, md.w), s) / Math.sqrt(selfL(md.a, md.w) * selfL(md.b, md.w));
      const x = k * k * md.Q1 * md.Q2, eta = x / Math.pow(1 + Math.sqrt(1 + x), 2);
      document.getElementById('idK').textContent = num(Math.abs(k), 3);
      const eEl = document.getElementById('idE'); eEl.textContent = num(eta * 100, 3) + ' %';
      const xl = document.getElementById('idXl'), xv = document.getElementById('idX'), note = document.getElementById('idNote');
      let ok;
      if (key === 'nfc') {
        ok = eta >= 0.15; xl.textContent = 'Thẻ có đủ điện để trả lời?'; xv.textContent = ok ? 'có' : 'không'; xv.className = ok ? 'ok' : 'bad';
        note.textContent = ok ? 'Thẻ không có pin: nó \u201cxin\u201d năng lượng từ từ trường của đầu đọc, đủ để con chip chạy và trả lời. Kéo ra xa vài cm là hết.'
          : 'Ra xa một chút là từ trường yếu đi rất nhanh, thẻ không đủ năng lượng để thức dậy. Đây cũng là một lớp bảo vệ: người lạ khó đọc lén thẻ từ xa.';
      } else {
        ok = eta >= 0.7; const pin = 15, pout = pin * eta;
        xl.textContent = 'Nếu đế phát 15 W, máy nhận'; xv.textContent = fmt(pout, 'W', 3) + ' (nóng ' + fmt(pin - pout, 'W', 2) + ')'; xv.className = ok ? 'ok' : 'bad';
        note.textContent = s > md.a * 0.6 ? 'Đặt lệch tâm: phần lớn từ trường không đi xuyên qua cuộn thu, năng lượng thành nhiệt. Vì vậy Qi2 và MagSafe xài nam châm để hít điện thoại vô đúng tâm.'
          : ok ? 'Đặt sát và đúng tâm, hai cuộn \u201cnói chuyện\u201d với nhau rất tốt. Con số này chưa tính hao phí của mạch điện; cả bộ sạc thực tế thường chỉ đạt cỡ 70–80%.'
          : 'Chỉ cách nhau vài cm là hiệu suất tụt mạnh, phần mất đi biến thành nhiệt. Cái ốp lưng quá dày cũng gây ra chuyện này.';
      }
      eEl.className = 'big ' + (ok ? 'ok' : 'bad');
      if (!st.ctx) return;
      const { ctx, W, H } = st;
      const sc = Math.min(W / (2 * md.half), (H - 20) / (md.top + 0.02));
      const X = v => W / 2 + v * sc; X.inv = p => (p - W / 2) / sc;
      const z0 = H - 0.02 * sc - 6, Z = v => z0 - v * sc; Z.inv = p => (z0 - p) / sc;
      if (!heat || heat.W !== W || heat.H !== H) heat = buildHeat(W, H, X, Z);
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      heat.img.forEach(([px, py, v]) => { ctx.fillStyle = `rgba(55,135,196,${(v * 0.85).toFixed(3)})`; ctx.fillRect(px, py, heat.cell, heat.cell); });
      // đế / đầu đọc
      ctx.fillStyle = 'rgba(27,25,32,.12)'; ctx.fillRect(X(-md.a * 1.6), Z(0) + 3, md.a * 3.2 * sc, 0.012 * sc);
      // cuộn phát: mặt cắt dây (dòng đi ra ở bên trái, đi vô ở bên phải)
      const wire = (cx, cz, out) => {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cz, 6, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; if (out === null) return;
        if (out) { ctx.beginPath(); ctx.arc(cx, cz, 2, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(cx - 3.5, cz - 3.5); ctx.lineTo(cx + 3.5, cz + 3.5); ctx.moveTo(cx + 3.5, cz - 3.5); ctx.lineTo(cx - 3.5, cz + 3.5); ctx.stroke(); }
      };
      ctx.strokeStyle = C.pos; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(-md.a), Z(0)); ctx.lineTo(X(md.a), Z(0)); ctx.stroke();
      wire(X(-md.a), Z(0), true); wire(X(md.a), Z(0), false);
      // thiết bị nhận: thẻ hoặc điện thoại
      const devW = key === 'nfc' ? 0.0856 : 0.072, devH = key === 'nfc' ? 0.0015 : 0.008;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.fillRect(X(s - devW / 2), Z(d + devH * 0.3) - devH * sc, devW * sc, devH * sc); ctx.strokeRect(X(s - devW / 2), Z(d + devH * 0.3) - devH * sc, devW * sc, devH * sc);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(s - md.b), Z(d)); ctx.lineTo(X(s + md.b), Z(d)); ctx.stroke();
      wire(X(s - md.b), Z(d), null); wire(X(s + md.b), Z(d), null);
      // nhãn
      ctx.font = FONT(12, 700); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = C.ink;
      ctx.fillText(key === 'nfc' ? 'đầu đọc' : 'đế sạc', X(md.a) + 12, Z(0));
      ctx.fillText(key === 'nfc' ? 'thẻ' : 'điện thoại', X(s + md.b) + 12, Z(d) - (key === 'nfc' ? 0 : devH * sc * 0.6));
      // thước d
      const xr = X(-md.half) + 22; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      if (d * sc > 14) { WL.arrow(ctx, xr, (Z(0) + Z(d)) / 2, xr, Z(0), C.ink, 1.5, 6); WL.arrow(ctx, xr, (Z(0) + Z(d)) / 2, xr, Z(d), C.ink, 1.5, 6); }
      ctx.textAlign = 'left'; ctx.fillText('d', xr + 6, (Z(0) + Z(d)) / 2);
      ctx.font = FONT(11.5, 500); ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(W < 520 ? 'đậm = từ trường mạnh' : 'màu đậm = từ trường mạnh; từ đậm tới gần trắng là yếu đi cỡ 1000 lần', W - 10, 8);
    }
    watchCanvas(cv, st, () => { heat = null; draw(); });
    setMode('nfc');
  },
});
})();
