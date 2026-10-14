/* =====================================================================
   Omics: minh họa "Từ đoạn đọc đến bảng đếm: CPM và TPM" (id: count-matrix, trang 3-omics.html)
   Nhúng vào trang: <div class="demo" id="demoCount" data-demo="count-matrix"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=count-matrix

   Hai mẫu RNA-seq mô phỏng, 6 gene giả định với độ dài và số bản phiên mã đã biết ("đáp án").
   Mỗi đoạn đọc rơi vào gene g với xác suất ∝ (số bản phiên mã × độ dài) (gene dài bị cắt ra nhiều đoạn hơn).
   Số đếm ~ Poisson(N · p_g) (xấp xỉ đa thức khi N lớn).
   CPM = đếm / tổng đếm × 10⁶ (khử độ sâu giải trình tự).
   TPM: r_g = đếm / độ dài (kb); TPM = r_g / Σr × 10⁶ (khử cả độ sâu lẫn độ dài; Wagner et al. 2012).
   Chỉ gene G4 thật sự tăng 4 lần ở mẫu B; các gene khác giống nhau ở hai mẫu.
   ===================================================================== */
(() => {
const { COLORS: C, num, sci, range, watchCanvas } = OMICS;
const GENES = [['G1', 0.6, 400], ['G2', 1.5, 400], ['G3', 3.0, 400], ['G4', 2.0, 100], ['G5', 8.0, 50], ['G6', 1.0, 1200]];   // [tên, độ dài kb, số bản phiên mã ở mẫu A]
const FOLD = [1, 1, 1, 4, 1, 1];
function pois(l) { if (l > 50) { let u = 0, v = 0; while (!u) u = Math.random(); v = Math.random(); return Math.max(0, Math.round(l + Math.sqrt(l) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); } let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }

OMICS.demo('count-matrix', {
  domId: 'demoCount',
  title: 'Từ đoạn đọc đến bảng đếm: CPM và TPM',
  page: '3-omics.html',
  html: `<div class="demo-title"><h4>Từ đoạn đọc đến bảng đếm: CPM và TPM</h4><span>Đổi độ sâu giải trình tự và cách chuẩn hóa</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvCnt" class="ar" role="img" aria-label="Biểu đồ cột cho 6 gene ở hai mẫu A và B theo cách chuẩn hóa đang chọn; bên dưới là bảng số đếm."></canvas></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Chuẩn hóa">
        <button class="btn" type="button" data-cnn="raw" aria-pressed="true">Số đếm thô</button>
        <button class="btn" type="button" data-cnn="cpm" aria-pressed="false">CPM</button>
        <button class="btn" type="button" data-cnn="tpm" aria-pressed="false">TPM</button>
      </div>
      <div class="ctrl"><label for="cnA">Độ sâu mẫu A</label><output for="cnA"></output><input type="range" id="cnA" min="4" max="7.3" step="0.05" value="6"></div>
      <div class="ctrl"><label for="cnB">Độ sâu mẫu B</label><output for="cnB"></output><input type="range" id="cnB" min="4" max="7.3" step="0.05" value="6.5"></div>
      <div class="btnrow"><button class="btn" type="button" id="cnRe">Giải trình tự lại</button></div>
      <div id="cnTab"></div>
      <p class="note-s" id="cnNote"></p>
    </div>
  </div>`,
  init(root) {
    const cv = document.getElementById('cvCnt'), st = {};
    let norm = 'raw', cnt = null;
    const rA = range('cnA', { map: v => Math.round(10 ** v), show: v => sci(v, 2) + ' đoạn đọc', onInput: () => sample() });
    const rB = range('cnB', { map: v => Math.round(10 ** v), show: v => sci(v, 2) + ' đoạn đọc', onInput: () => sample() });
    root.querySelector('#cnRe').addEventListener('click', () => sample());
    const bs = [...root.querySelectorAll('[data-cnn]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); norm = b.dataset.cnn; show(); }));
    function sample() {
      cnt = [rA.get(), rB.get()].map((N, s) => {
        const w = GENES.map(([, len, tx], g) => tx * (s ? FOLD[g] : 1) * len), tot = w.reduce((a, b) => a + b, 0);
        return w.map(x => pois(N * x / tot));
      });
      show();
    }
    const val = (s, g) => {
      const c = cnt[s], tot = c.reduce((a, b) => a + b, 0);
      if (norm === 'raw') return c[g];
      if (norm === 'cpm') return c[g] / tot * 1e6;
      const r = c.map((x, k) => x / GENES[k][1]), rt = r.reduce((a, b) => a + b, 0); return r[g] / rt * 1e6;
    };
    function show() {
      if (!cnt) return;
      const head = '<tr><th>Gene</th><th>Dài (kb)</th><th>A</th><th>B</th><th>B / A</th></tr>';
      const rows = GENES.map(([n, len], g) => { const a = val(0, g), b = val(1, g); return `<tr><td>${n}${FOLD[g] > 1 ? ' ★' : ''}</td><td>${num(len, 2)}</td><td>${fmtv(a)}</td><td>${fmtv(b)}</td><td>${a > 0 ? num(b / a, 3) : '—'}</td></tr>`; }).join('');
      root.querySelector('#cnTab').innerHTML = `<table class="mini"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
      root.querySelector('#cnNote').textContent = norm === 'raw'
        ? 'Số đếm thô: mẫu nào giải trình tự sâu hơn thì mọi gene đều có vẻ "tăng". Không so sánh được giữa hai mẫu. ★: gene duy nhất thật sự tăng (4 lần).'
        : norm === 'cpm' ? 'CPM khử độ sâu: G4 (★) nổi bật với tỉ số khoảng 3,5 lần. Các gene khác có tỉ số khoảng 0,86 chứ không phải 1: vì G4 chiếm thêm phần đoạn đọc ở mẫu B, các gene còn lại bị chia ít đi (hiệu ứng thành phần; DESeq2 và edgeR sửa thêm lỗi này). Trong cùng một mẫu, gene dài (G5) vẫn có vẻ biểu hiện mạnh hơn thực tế.'
        : 'TPM khử cả độ sâu lẫn độ dài: so sánh được mức biểu hiện giữa các gene trong cùng một mẫu. G5 nhận nhiều đoạn đọc hơn G1 chỉ vì dài hơn, dù số bản phiên mã ít hơn 8 lần; TPM đưa G5 về đúng vị trí thấp nhất.';
      draw();
    }
    const fmtv = v => norm === 'raw' ? String(v) : num(v, 3);
    function draw() {
      if (!st.ctx || !cnt) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 74, x1 = W - 16, y0 = 44, y1 = H - 40, n = GENES.length, gw = (x1 - x0) / n;
      const vals = GENES.map((_, g) => [val(0, g), val(1, g)]), mx = Math.max(...vals.flat()) * 1.1 || 1, py = v => y1 - v / mx * (y1 - y0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      vals.forEach(([a, b], g) => { const x = x0 + g * gw + gw * 0.15, bw = gw * 0.33;
        ctx.fillStyle = C.sea; ctx.fillRect(x, py(a), bw, y1 - py(a)); ctx.fillStyle = C.pos; ctx.fillRect(x + bw + 2, py(b), bw, y1 - py(b));
        ctx.fillStyle = C.ink; ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(GENES[g][0] + (FOLD[g] > 1 ? ' ★' : ''), x + bw, y1 + 6); ctx.fillStyle = C.muted; ctx.font = '500 11px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillText(num(GENES[g][1], 2) + ' kb', x + bw, y1 + 22); });
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.ink; ctx.fillText({ raw: 'Số đếm thô', cpm: 'CPM (số đếm trên một triệu đoạn đọc)', tpm: 'TPM (bản phiên mã trên một triệu)' }[norm], 10, 8);
      ctx.fillStyle = C.sea; ctx.fillText('■ mẫu A', 10, 24); ctx.fillStyle = C.pos; ctx.fillText('■ mẫu B', 80, 24);
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(sci(mx / 1.1, 2), x0 - 6, py(mx / 1.1)); ctx.fillText('0', x0 - 6, y1);
    }
    watchCanvas(cv, st, draw);
    rA.upd(); rB.upd();
  },
});
})();
