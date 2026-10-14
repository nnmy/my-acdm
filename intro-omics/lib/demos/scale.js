/* =====================================================================
   Omics: minh họa "Thang kích thước và giới hạn của kính hiển vi" (id: scale, trang 1-te-bao.html)
   Nhúng vào trang: <div class="demo" id="demoScale" data-demo="scale"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=scale

   Trục log từ 0,1 nm tới 1 mm. Giới hạn phân giải Abbe của kính hiển vi quang học: d = λ / (2·NA).
   Kích thước điển hình (làm tròn; Milo & Phillips, Cell Biology by the Numbers; Alberts et al.):
   noãn người ~120 µm, sợi tóc ~70 µm, tế bào người ~10–30 µm, hồng cầu ~7,5 µm, nhân ~6 µm,
   E. coli ~2 µm, ty thể ~1 µm, virus SARS-CoV-2 ~100 nm, ribosome ~25 nm, đường kính DNA ~2 nm,
   khoảng cách giữa hai cặp base 0,34 nm, nguyên tử ~0,1–0,3 nm.
   Độ phân giải cỡ: mắt thường ~0,1 mm; kính quang học ~200 nm; hiển vi siêu phân giải ~20 nm;
   hiển vi điện tử (cryo-EM tốt nhất) ~0,1–0,3 nm.
   ===================================================================== */
(() => {
const { COLORS: C, num, fmt, range, watchCanvas } = OMICS;
const OBJ = [
  ['Noãn người', 1.2e-4], ['Sợi tóc', 7e-5], ['Tế bào người', 2e-5], ['Hồng cầu', 7.5e-6], ['Nhân tế bào', 6e-6],
  ['Vi khuẩn E. coli', 2e-6], ['Ty thể', 1e-6], ['Virus SARS-CoV-2', 1e-7], ['Ribosome', 2.5e-8],
  ['Bề ngang chuỗi DNA', 2e-9], ['Cặp base kế tiếp', 3.4e-10], ['Nguyên tử', 2e-10],
];
const INST = [['Mắt thường', 1e-4, '#9DA4AD'], ['Kính hiển vi quang học', 2e-7, '#2e9d4f'], ['Hiển vi siêu phân giải', 2e-8, '#3787c4'], ['Hiển vi điện tử', 2e-10, '#7b4fbf']];
const LMIN = -10, LMAX = -3;

OMICS.demo('scale', {
  domId: 'demoScale',
  title: 'Thang kích thước và giới hạn của kính hiển vi',
  page: '1-te-bao.html',
  html: `<div class="demo-title"><h4>Thang kích thước và giới hạn của kính hiển vi</h4><span>Từ nguyên tử tới tế bào trứng, trên một trục log</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvScale" class="ar tall-m" role="img" aria-label="Trục kích thước dạng log từ 0,1 nanomet tới 1 milimet, đánh dấu kích thước của nguyên tử, DNA, ribosome, virus, vi khuẩn, tế bào; bên dưới là dải độ phân giải của mắt thường, kính hiển vi quang học, hiển vi siêu phân giải và hiển vi điện tử."></canvas></div>
    <div class="panel">
      <div class="ctrl"><label for="scL">Bước sóng ánh sáng λ</label><output for="scL"></output><input type="range" id="scL" min="400" max="700" step="5" value="550"></div>
      <div class="ctrl"><label for="scNA">Khẩu độ số của vật kính NA</label><output for="scNA"></output><input type="range" id="scNA" min="0.1" max="1.45" step="0.01" value="1.4"></div>
      <dl class="readout" aria-live="polite">
        <dt>Giới hạn Abbe d = λ/(2NA)</dt><dd class="big" id="scD">—</dd>
        <dt>Thấy được (lớn hơn d)</dt><dd id="scYes" style="font:500 14px var(--body)">—</dd>
        <dt>Không phân biệt được</dt><dd id="scNo" style="font:500 14px var(--body)">—</dd>
      </dl>
      <p class="note-s">Hai điểm gần nhau hơn khoảng một nửa bước sóng sẽ nhòe thành một chấm, dù phóng to bao nhiêu. Vì vậy DNA được "thấy" lần đầu không phải bằng kính hiển vi quang học mà bằng nhiễu xạ tia X (bước sóng cỡ 0,1 nm) và kính hiển vi điện tử.</p>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvScale'), st = {};
    const rL = range('scL', { show: v => v + ' nm', onInput: () => upd() });
    const rNA = range('scNA', { show: v => num(v, 3) + (v > 1 ? ' (vật kính dầu)' : ''), onInput: () => upd() });
    let d = 2e-7;
    function upd() {
      d = rL.get() * 1e-9 / (2 * rNA.get());
      document.getElementById('scD').textContent = fmt(d, 'm');
      document.getElementById('scYes').textContent = OBJ.filter(o => o[1] > d).map(o => o[0]).join(', ') || '—';
      document.getElementById('scNo').textContent = OBJ.filter(o => o[1] <= d).map(o => o[0]).join(', ') || '—';
      draw();
    }
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 30, x1 = W - 20, px = v => x0 + (Math.log10(v) - LMIN) / (LMAX - LMIN) * (x1 - x0);
      const ay = H * 0.52;
      // vùng không phân giải được (kính quang học hiện tại)
      ctx.fillStyle = 'rgba(46,157,79,.08)'; ctx.fillRect(px(d), 30, x1 - px(d), ay - 30);
      ctx.fillStyle = 'rgba(160,165,172,.12)'; ctx.fillRect(x0, 30, px(d) - x0, ay - 30);
      ctx.strokeStyle = '#2e9d4f'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(px(d), 26); ctx.lineTo(px(d), H - 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#2e9d4f'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('d = ' + fmt(d, 'm'), px(d) + 4, 10);
      // trục
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
      const ticks = [[1e-10, '0,1 nm'], [1e-9, '1 nm'], [1e-8, '10 nm'], [1e-7, '100 nm'], [1e-6, '1 µm'], [1e-5, '10 µm'], [1e-4, '100 µm'], [1e-3, '1 mm']];
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ticks.forEach(([v, t]) => { ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(px(v), ay - 5); ctx.lineTo(px(v), ay + 5); ctx.stroke(); ctx.fillText(t, px(v), ay + 8); });
      // vật thể
      OBJ.forEach(([n, v], i) => {
        const x = px(v), lvl = i % 4, y = ay - 26 - lvl * 26, ok = v > d;
        ctx.strokeStyle = '#c3c8ce'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x, y + 6); ctx.stroke();
        ctx.fillStyle = ok ? '#2e9d4f' : '#8b929b'; ctx.beginPath(); ctx.arc(x, ay, 4, 0, 7); ctx.fill();
        ctx.fillStyle = ok ? C.ink : C.muted; ctx.font = (ok ? '600 ' : '500 ') + '11.5px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(n, Math.max(x0 + 40, Math.min(x1 - 40, x)), y + 4);
      });
      // dải độ phân giải của các công cụ
      const by = ay + 34; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif';
      INST.forEach(([n, r, col], i) => {
        const y = by + i * 22; ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(px(r), y - 7, x1 - px(r), 14); ctx.globalAlpha = 1;
        const lab = n + ' (từ ~' + fmt(r, 'm', 2) + ')', tw = ctx.measureText(lab).width;
        if (tw + 12 < x1 - px(r)) { ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(lab, px(r) + 6, y + 0.5); }
        else { ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.fillText(lab, px(r) - 6, y + 0.5); ctx.textAlign = 'left'; }
      });
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Kích thước (thang log)', 10, 10);
    }
    watchCanvas(cv, st, draw);
    rL.upd(); rNA.upd();
  },
});
})();
