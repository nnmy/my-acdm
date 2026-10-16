/* =====================================================================
   Không dây: minh họa "Tần số và bước sóng" (id: wave, trang 1-song-vo-tuyen.html)
   Nhúng vào trang: <div class="demo" id="demoWave" data-demo="wave"></div> + lib/wl.js
   Chạy độc lập:    lib/demos/run.html?demo=wave

   λ = c / f. Canvas tự đổi tỉ lệ để luôn thấy khoảng 3 bước sóng, kèm một vật quen thuộc
   (tòa nhà, người, điện thoại, đồng xu) vẽ cùng tỉ lệ để so sánh kích thước.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas, loopWhenVisible, FONT, hz } = WL;
const c0 = 299792458;
const PRESETS = [
  ['Sạc Qi', 140e3], ['NFC', 13.56e6], ['MedRadio', 403.5e6], ['4G (1800 MHz)', 1.8e9],
  ['GPS L1', 1575.42e6], ['Bluetooth, Wi-Fi 2,4', 2.44e9], ['Wi-Fi 5 GHz', 5.5e9], ['Starlink (Ku)', 12e9],
];
// vật so sánh: [tên, chiều cao (m), chiều rộng (m), kiểu vẽ]
const REFS = [
  ['tòa nhà 20 tầng', 60, 25, 'building'],
  ['người cao 1,7 m', 1.7, 0.5, 'person'],
  ['điện thoại 15 cm', 0.15, 0.072, 'phone'],
  ['đồng xu 2,5 cm', 0.025, 0.025, 'coin'],
];

WL.demo('wave', {
  html: `<div class="demo-title"><h4>Tần số và bước sóng</h4><span>Kéo tần số hoặc chọn một công nghệ</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvWave" class="ar" role="img" aria-label="Một sóng hình sin chạy ngang màn hình, có thước đo bước sóng và một vật quen thuộc vẽ cùng tỉ lệ để so sánh."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="wvF">Tần số f</label><output for="wvF"></output><input type="range" id="wvF" min="5" max="10.5" step="0.0001" value="9.3874"></div>
      <div class="techlist" id="wvPre">${PRESETS.map((p, i) => `<button type="button" data-i="${i}">${p[0]}</button>`).join('')}</div>
      <dl class="readout" aria-live="polite">
        <dt>Bước sóng λ</dt><dd class="big" id="wvL">—</dd>
        <dt>Chu kỳ T = 1/f</dt><dd id="wvT">—</dd>
        <dt>Ăng-ten nửa sóng λ/2</dt><dd id="wvA">—</dd>
      </dl>
      <p class="note-s" id="wvNote"></p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvWave'), st = {};
    let phase = 0;
    const rF = range('wvF', { map: v => Math.pow(10, v), show: v => hz(v, 4), onInput: () => { mark(); upd(); } });
    const pre = document.getElementById('wvPre');
    pre.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; rF.set(Math.log10(PRESETS[+b.dataset.i][1])); });
    function mark() {
      const f = rF.get();
      pre.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Math.log10(PRESETS[+b.dataset.i][1] / f)) < 0.004)));
    }
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    function upd() {
      const f = rF.get(), lam = c0 / f;
      set('wvL', fmt(lam, 'm', 3)); set('wvT', fmt(1 / f, 's', 3)); set('wvA', fmt(lam / 2, 'm', 3));
      let note;
      if (lam > 300) note = 'Bước sóng dài cả trăm mét tới vài cây số: ở tần số này, thiết bị không \u201cphát sóng\u201d đi xa mà xài từ trường ở sát cuộn dây (trường gần), như sạc Qi.';
      else if (lam > 5) note = 'Bước sóng cỡ chục mét, lớn hơn rất nhiều so với cái thẻ hay cái điện thoại. NFC ở 13,56 MHz cũng xài trường gần, nên chỉ chạy trong vài cm.';
      else if (lam > 0.3) note = 'Bước sóng cỡ nửa mét tới vài mét: ăng-ten nửa sóng dài vài chục cm, vẫn nhét được vô thiết bị nếu uốn khéo. Sóng ở dải này đi xuyên tường và xuyên cơ thể khá tốt.';
      else if (lam > 0.05) note = 'Bước sóng cỡ vài cm tới vài chục cm: vừa khít để ăng-ten nằm gọn trong điện thoại. Đây là dải của di động, GPS, Bluetooth và Wi-Fi.';
      else note = 'Bước sóng chỉ cỡ 1–3 cm: ăng-ten rất nhỏ, gom được hàng trăm cái lên một tấm phẳng (như chảo Starlink). Đổi lại, sóng dễ bị mưa, lá cây, tường chặn.';
      set('wvNote', note);
    }
    function drawRef(ctx, ref, x, yBase, s) {
      const h = ref[1] * s, w = ref[2] * s;
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.fillStyle = '#fff';
      if (ref[3] === 'building') {
        ctx.fillRect(x, yBase - h, w, h); ctx.strokeRect(x, yBase - h, w, h);
        ctx.fillStyle = C.sky; const fl = 20, cols = 4;
        for (let i = 0; i < fl; i++) for (let j = 0; j < cols; j++) {
          const ww = w / (cols * 2 + 1), hh = h / (fl * 2 + 1);
          if (ww > 1 && hh > 1) ctx.fillRect(x + ww * (2 * j + 1), yBase - h + hh * (2 * i + 1), ww, hh);
        }
      } else if (ref[3] === 'person') {
        const r = h * 0.09; ctx.beginPath(); ctx.arc(x + w / 2, yBase - h + r, r, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w / 2, yBase - h + 2 * r); ctx.lineTo(x + w / 2, yBase - h * 0.45);
        ctx.moveTo(x, yBase - h * 0.72); ctx.lineTo(x + w, yBase - h * 0.72);
        ctx.moveTo(x + w / 2, yBase - h * 0.45); ctx.lineTo(x + w * 0.1, yBase); ctx.moveTo(x + w / 2, yBase - h * 0.45); ctx.lineTo(x + w * 0.9, yBase); ctx.stroke();
      } else if (ref[3] === 'phone') {
        ctx.fillRect(x, yBase - h, w, h); ctx.strokeRect(x, yBase - h, w, h);
        ctx.fillStyle = C.sky; ctx.fillRect(x + w * 0.1, yBase - h * 0.92, w * 0.8, h * 0.8);
      } else {
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x + w / 2, yBase - h / 2, w / 2, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st, f = rF.get(), lam = c0 / f;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 24, x1 = W - 24, s = (x1 - x0) / (3 * lam);       // px trên mỗi mét: luôn thấy 3 bước sóng
      const yMid = H * 0.42, amp = Math.min(H * 0.2, 70), yBase = H - 34;
      // trục
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, yMid); ctx.lineTo(x1, yMid); ctx.stroke();
      // sóng
      ctx.strokeStyle = C.sea; ctx.lineWidth = 3; ctx.beginPath();
      for (let x = x0; x <= x1; x += 1.5) { const y = yMid - amp * Math.sin(2 * Math.PI * (x - x0) / (lam * s) - phase); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // thước bước sóng: giữa hai đỉnh liên tiếp
      const k0 = ((phase / (2 * Math.PI)) + 0.25) % 1;           // vị trí đỉnh đầu tiên (tính theo bước sóng)
      const p0 = x0 + k0 * lam * s, p1 = p0 + lam * s, yR = yMid - amp - 18;
      ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      [p0, p1].forEach(p => { ctx.beginPath(); ctx.moveTo(p, yR - 6); ctx.lineTo(p, yMid - amp); ctx.stroke(); });
      ctx.setLineDash([]);
      WL.arrow(ctx, (p0 + p1) / 2, yR, p0 + 1, yR, C.pos, 1.5, 7); WL.arrow(ctx, (p0 + p1) / 2, yR, p1 - 1, yR, C.pos, 1.5, 7);
      ctx.fillStyle = C.pos; ctx.font = FONT(13, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('λ = ' + fmt(lam, 'm', 3), (p0 + p1) / 2, yR - 4);
      // vật so sánh: chọn vật cao chừng 10–60% bề cao vùng vẽ
      const avail = yBase - (yMid + amp + 16);
      let ref = REFS.find(r => r[1] * s <= avail && r[1] * s >= 6) || null;
      ctx.font = FONT(12, 600); ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (ref) { drawRef(ctx, ref, x0 + 6, yBase, s); ctx.fillText(ref[0] + ' (cùng tỉ lệ)', x0 + 12 + ref[2] * s, yBase - 14); }
      else ctx.fillText('mọi vật quen thuộc đều quá ' + (avail < REFS[3][1] * s ? 'to' : 'nhỏ') + ' để vẽ chung tỉ lệ', x0 + 6, yBase - 14);
      // mặt đất + thước
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, yBase); ctx.lineTo(x1, yBase); ctx.stroke();
      const nice = v => { const e = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 5, 10].map(m => m * e).find(m => m >= v); };
      const tick = nice(lam / 2), px = tick * s;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1 - px, yBase + 10); ctx.lineTo(x1, yBase + 10);
      ctx.moveTo(x1 - px, yBase + 5); ctx.lineTo(x1 - px, yBase + 15); ctx.moveTo(x1, yBase + 5); ctx.lineTo(x1, yBase + 15); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.font = FONT(12, 600);
      ctx.fillText(fmt(tick, 'm', 2), x1, yBase + 15);
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.textBaseline = 'top';
      ctx.fillText('sóng chạy với tốc độ ánh sáng; hình được làm chậm lại rất nhiều', x0, 10);
    }
    watchCanvas(cv, st, draw);
    loopWhenVisible(cv, dt => { if (!WL.REDUCED) phase = (phase + dt * 2.2) % (2 * Math.PI); draw(); });
    rF.upd(); mark();
  },
});
})();
