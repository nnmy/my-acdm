/* =====================================================================
   Omics: minh họa "Từ DNA đến protein" (id: central-dogma, trang 2-dna-protein.html)
   Nhúng vào trang: <div class="demo" id="demoDogma" data-demo="central-dogma"></div> + lib/omics.js
   Chạy độc lập:    lib/demos/run.html?demo=central-dogma

   Mã di truyền chuẩn (NCBI translation table 1). Mạch mã hóa DNA (5'→3') → mạch khuôn (bổ sung) →
   mRNA (giống mạch mã hóa, T thay bằng U) → đọc từng bộ ba từ ATG đầu tiên tới codon kết thúc.
   Ví dụ 1: đoạn gene giả định. Ví dụ 2: 31 codon đầu của gene HBB người (β-globin); đột biến
   hồng cầu hình liềm là GAG → GTG ở codon thứ 7 tính cả Met (Glu6Val theo cách đánh số protein trưởng thành).
   ===================================================================== */
(() => {
const B = 'TCAG', AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
const CODE = {}; for (let i = 0; i < 64; i++) CODE[B[i >> 4] + B[(i >> 2) & 3] + B[i & 3]] = AA[i];
const NAME = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Stop' };
const CLS = a => 'DE'.includes(a) ? ['#f3c9c6', 'acid (âm)'] : 'KRH'.includes(a) ? ['#c9dcf3', 'base (dương)'] : 'STNQCY'.includes(a) ? ['#d5efd0', 'phân cực'] : a === '*' ? ['#1B1920', 'kết thúc'] : ['#f3e7c4', 'không phân cực'];
const BC = { A: 'var(--base-a)', C: 'var(--base-c)', G: 'var(--base-g)', T: 'var(--base-t)', U: 'var(--base-t)' };
const EX = {
  demo: 'ATGGCCACGAAGCTGGTTGAATTCCGAGATTGGCATACCTCTGGCAAACCGTACATTCAGGTGAGCGACTAA',
  hbb: 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG',
};
const comp = s => s.replace(/[ACGT]/g, c => ({ A: 'T', T: 'A', C: 'G', G: 'C' })[c]);
function translate(dna) {
  const st = dna.indexOf('ATG'); if (st < 0) return { st, aa: [] };
  const aa = []; for (let i = st; i + 3 <= dna.length; i += 3) { const a = CODE[dna.slice(i, i + 3)]; aa.push(a); if (a === '*') break; }
  return { st, aa };
}

OMICS.demo('central-dogma', {
  domId: 'demoDogma',
  title: 'Từ DNA đến protein',
  page: '2-dna-protein.html',
  html: `<div class="demo-title"><h4>Từ DNA đến protein</h4><span>Sửa chuỗi DNA hoặc gây đột biến, xem protein thay đổi ra sao</span></div>
  <style>
    #demoDogma .dg { padding: 14px 16px; display: grid; gap: 10px; }
    #demoDogma .row { display: grid; grid-template-columns: 118px minmax(0, 1fr); gap: 8px; align-items: start; }
    #demoDogma .row > b { font-size: 13px; color: var(--muted); font-weight: 600; padding-top: 4px; }
    #demoDogma .seq span.m { outline: 2px solid var(--ink); outline-offset: 1px; background: #fff3c9; }
    #demoDogma .codons { display: flex; flex-wrap: wrap; gap: 4px; }
    #demoDogma .cd { display: inline-flex; flex-direction: column; align-items: center; border: 1px solid var(--line); background: #fff; padding: 2px 4px; min-width: 42px; }
    #demoDogma .cd i { font: 600 12.5px var(--mono); font-style: normal; letter-spacing: .03em; }
    #demoDogma .cd em { font: 700 12.5px var(--body); font-style: normal; padding: 0 4px; margin-top: 2px; }
    #demoDogma .cd.diff { border: 2px solid var(--pos); }
    #demoDogma textarea { width: 100%; min-height: 64px; font: 600 14px/1.5 var(--mono); padding: 6px 8px; border: 2px solid var(--ink); resize: vertical; }
    @media (max-width: 560px) { #demoDogma .row { grid-template-columns: 1fr; } }
  </style>
  <div class="demo-body">
    <div class="stagebox"><div class="dg" id="dgOut"></div></div>
    <div class="panel">
      <div class="btnrow" role="group" aria-label="Ví dụ">
        <button class="btn" type="button" data-dge="demo" aria-pressed="true">Gene giả định</button>
        <button class="btn" type="button" data-dge="hbb" aria-pressed="false">Gene HBB (β-globin)</button>
      </div>
      <label for="dgIn" style="font-weight:600;font-size:15px">Mạch mã hóa DNA (5'→3')</label>
      <textarea id="dgIn" spellcheck="false"></textarea>
      <div class="btnrow">
        <button class="btn" type="button" id="dgSub">Thay 1 base</button>
        <button class="btn" type="button" id="dgIns">Chèn 1 base</button>
        <button class="btn" type="button" id="dgDel">Xóa 1 base</button>
        <button class="btn" type="button" id="dgSick">Hồng cầu hình liềm</button>
        <button class="btn" type="button" id="dgReset">Khôi phục</button>
      </div>
      <dl class="readout" aria-live="polite">
        <dt>Chiều dài protein</dt><dd id="dgLen">—</dd>
        <dt>Loại đột biến</dt><dd class="big" id="dgType">—</dd>
      </dl>
      <p class="note-s" id="dgNote"></p>
    </div>
  </div>`,
  init(root) {
    const inp = root.querySelector('#dgIn'), out = root.querySelector('#dgOut');
    let ex = 'demo', ref = EX.demo, mut = -1;
    const bs = [...root.querySelectorAll('[data-dge]')];
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); ex = b.dataset.dge; ref = EX[ex]; inp.value = ref; mut = -1; upd(); }));
    const clean = () => inp.value.toUpperCase().replace(/U/g, 'T').replace(/[^ACGT]/g, '');
    const pos = s => { const st = s.indexOf('ATG'); return st + 3 + Math.floor(Math.random() * Math.max(1, s.length - st - 6)); };
    root.querySelector('#dgSub').addEventListener('click', () => { const s = clean(), i = pos(s), alt = 'ACGT'.replace(s[i], ''); inp.value = s.slice(0, i) + alt[Math.floor(Math.random() * 3)] + s.slice(i + 1); mut = i; upd(); });
    root.querySelector('#dgIns').addEventListener('click', () => { const s = clean(), i = pos(s); inp.value = s.slice(0, i) + 'ACGT'[Math.floor(Math.random() * 4)] + s.slice(i); mut = i; upd(); });
    root.querySelector('#dgDel').addEventListener('click', () => { const s = clean(), i = pos(s); inp.value = s.slice(0, i) + s.slice(i + 1); mut = Math.min(i, s.length - 2); upd(); });
    root.querySelector('#dgSick').addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x.dataset.dge === 'hbb')); ex = 'hbb'; ref = EX.hbb; const i = 19; inp.value = ref.slice(0, i) + 'T' + ref.slice(i + 1); mut = i; upd(); });
    root.querySelector('#dgReset').addEventListener('click', () => { inp.value = ref; mut = -1; upd(); });
    inp.addEventListener('input', () => { mut = -1; upd(); });
    const bases = (s, rna) => s.split('').map((c, i) => `<span${i === mut ? ' class="m"' : ''} style="color:${BC[c]}">${rna && c === 'T' ? 'U' : c}</span>`).join('');
    function upd() {
      const s = clean(), T = translate(s), R = translate(ref);
      const cods = []; if (T.st >= 0) for (let k = 0; k < T.aa.length; k++) cods.push(s.slice(T.st + 3 * k, T.st + 3 * k + 3).replace(/T/g, 'U'));
      out.innerHTML = `
        <div class="row"><b>DNA, mạch mã hóa 5'→3'</b><div class="seq">${bases(s)}</div></div>
        <div class="row"><b>DNA, mạch khuôn 3'→5'</b><div class="seq" style="opacity:.75">${bases(comp(s))}</div></div>
        <div class="row"><b>mRNA 5'→3'<br>(phiên mã)</b><div class="seq">${bases(s, true)}</div></div>
        <div class="row"><b>Codon → amino acid<br>(dịch mã)</b><div class="codons">${T.aa.map((a, k) => { const [bg] = CLS(a), diff = R.aa[k] !== a;
          return `<span class="cd${diff ? ' diff' : ''}" title="${NAME[a]}: ${CLS(a)[1]}"><i>${cods[k]}</i><em style="background:${bg};color:${a === '*' ? '#fff' : 'var(--ink)'}">${NAME[a]}</em></span>`; }).join('') || '<span class="note-s">Không tìm thấy codon mở đầu ATG.</span>'}</div></div>
        <div class="row"><b>Chú thích màu</b><div class="note-s"><span style="background:#f3e7c4;padding:0 4px">không phân cực</span> <span style="background:#d5efd0;padding:0 4px">phân cực</span> <span style="background:#f3c9c6;padding:0 4px">acid</span> <span style="background:#c9dcf3;padding:0 4px">base</span>; khung đỏ: khác bản gốc</div></div>`;
      const stopT = T.aa.indexOf('*'), lenT = stopT >= 0 ? stopT : T.aa.length, stopR = R.aa.indexOf('*'), lenR = stopR >= 0 ? stopR : R.aa.length;
      document.getElementById('dgLen').textContent = lenT + ' amino acid' + (stopT < 0 ? ' (chưa gặp codon kết thúc)' : '') + (ex === 'hbb' ? ', đoạn đầu' : '');
      let type, note;
      const dl = s.length - ref.length, same = T.aa.join('') === R.aa.join('');
      if (s === ref) { type = 'không có'; note = 'Mỗi bộ ba base (codon) mã hóa một amino acid; 64 codon cho 20 amino acid và 3 tín hiệu kết thúc, nên nhiều codon cùng chỉ một amino acid.'; }
      else if (dl % 3 !== 0) { type = 'lệch khung đọc'; note = 'Chèn hoặc xóa một số base không chia hết cho 3 làm lệch cách chia bộ ba từ chỗ đột biến trở đi: mọi amino acid phía sau đều sai, thường gặp codon kết thúc sớm.'; }
      else if (same) { type = 'im lặng'; note = 'Codon mới vẫn mã hóa cùng amino acid (thường do thay base thứ ba của codon), nên protein không đổi.'; }
      else if (lenT < lenR || (stopT >= 0 && stopR < 0)) { type = 'vô nghĩa (dừng sớm)'; note = 'Một codon bị biến thành codon kết thúc: protein bị cắt cụt, thường mất chức năng.'; }
      else { type = dl === 0 ? 'sai nghĩa' : 'thêm/bớt amino acid'; note = ex === 'hbb' && s[19] === 'T' && dl === 0 && s.slice(0, 19) === ref.slice(0, 19) ? 'Đây là đột biến gây bệnh hồng cầu hình liềm: GAG → GTG đổi Glu (mang điện âm) thành Val (không phân cực). Chỉ một base, nhưng hemoglobin kết dính lại khi thiếu oxy và làm hồng cầu biến dạng.' : 'Một amino acid bị thay bằng amino acid khác. Tác động tùy vị trí và tính chất hóa học của hai amino acid: có thể vô hại, có thể gây bệnh.'; }
      document.getElementById('dgType').textContent = type; document.getElementById('dgNote').textContent = note;
    }
    inp.value = ref; upd();
  },
});
})();
