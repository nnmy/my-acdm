/* =====================================================================
   Bán dẫn: minh họa "Chế tạo một transistor, từng bước" (id: fab-flow, trang 5-san-xuat.html)
   Nhúng vào trang: <div class="demo" id="demoFab" data-demo="fab-flow"></div> + lib/semi.js
   Chạy độc lập:    lib/demos/run.html?demo=fab-flow

   Quy trình rút gọn (kiểu transistor MOS thế hệ cũ, cổng đặt sau) để thấy vòng lặp
   "phủ cản quang → chiếu sáng → tráng rửa → ăn mòn / cấy ion → bóc cản quang".
   Chip hiện đại lặp vòng này cho hàng chục lớp mặt nạ, tổng cộng hàng trăm tới hơn nghìn bước.
   Mặt cắt không đúng tỉ lệ. Mỗi bước nêu tối đa 3 công ty dẫn đầu thị trường thiết bị / vật liệu của bước đó
   (không xếp thứ tự; cập nhật 10/2026). Bước 12 gồm ba công đoạn nên nêu hãng dẫn đầu của từng công đoạn.
   ===================================================================== */
(() => {
const { COLORS: C, watchCanvas } = SEMI;
const STEPS = [
  { t: 'Phiến Si', d: 'Thỏi Si đơn tinh thể (kéo từ Si nóng chảy, độ tinh khiết tới 11 chữ số 9, tức 99,999999999%) được cắt thành phiến mỏng đường kính 300 mm, đánh bóng như gương. Phiến này pha sẵn một ít bo: loại p.', e: 'Lò kéo tinh thể, máy cắt, máy đánh bóng', c: 'Shin-Etsu (Nhật), SUMCO (Nhật), GlobalWafers (Đài Loan)' },
  { t: 'Oxy hóa', d: 'Nung phiến trong oxy ở khoảng 1000 °C: bề mặt Si biến thành lớp SiO₂ cách điện. SiO₂ mọc ra từ chính Si là một trong những lý do Si thắng các vật liệu khác.', e: 'Lò oxy hóa, lò khuếch tán', c: 'Tokyo Electron (Nhật), Kokusai Electric (Nhật)' },
  { t: 'Phủ chất cản quang', d: 'Nhỏ chất cản quang (photoresist) lên phiến rồi quay nhanh để nó trải thành lớp mỏng đều. Chất này đổi tính chất khi bị chiếu sáng, giống phim chụp ảnh.', e: 'Máy phủ và tráng rửa (coater/developer); chất cản quang', c: 'Chất cản quang: Tokyo Ohka Kogyo (Nhật), JSR (Nhật), Shin-Etsu (Nhật)' },
  { t: 'Quang khắc', d: 'Ánh sáng tử ngoại chiếu qua mặt nạ (photomask) mang hình mạch, thu nhỏ 4 lần bằng hệ thấu kính, in hình lên lớp cản quang. Máy EUV dùng ánh sáng 13,5 nm cho các chi tiết nhỏ nhất.', e: 'Máy quang khắc (scanner) DUV, EUV; mặt nạ quang khắc', c: 'ASML (Hà Lan), Nikon (Nhật), Canon (Nhật)' },
  { t: 'Tráng rửa', d: 'Dung dịch tráng hòa tan phần cản quang đã bị chiếu sáng (cản quang dương), để lộ ra các "cửa sổ" có hình đúng như trên mặt nạ.', e: 'Máy phủ và tráng rửa (coater/developer)', c: 'Tokyo Electron (Nhật), Screen (Nhật)' },
  { t: 'Ăn mòn', d: 'Plasma ăn mòn lớp SiO₂ ở chỗ không có cản quang che. Ăn mòn khô bằng plasma cho thành vách thẳng đứng, cần thiết cho chi tiết vài nanomet.', e: 'Máy ăn mòn plasma', c: 'Lam Research (Mỹ), Tokyo Electron (Nhật), Applied Materials (Mỹ)' },
  { t: 'Bóc cản quang', d: 'Lớp cản quang đã xong nhiệm vụ, được đốt bỏ bằng plasma oxy rồi rửa sạch. Bây giờ SiO₂ có cửa sổ đúng chỗ cần pha tạp.', e: 'Máy bóc cản quang bằng plasma, máy rửa phiến', c: 'Máy rửa phiến: Screen (Nhật), Tokyo Electron (Nhật), Lam Research (Mỹ)' },
  { t: 'Cấy ion', d: 'Ion phốt pho hoặc asen được gia tốc và bắn vào Si qua cửa sổ; nơi có SiO₂ thì ion bị chặn lại. Hai vùng n⁺ hình thành: nguồn và máng của transistor.', e: 'Máy cấy ion', c: 'Applied Materials (Mỹ), Axcelis (Mỹ), Sumitomo Heavy Industries Ion Technology (Nhật)' },
  { t: 'Ủ nhiệt', d: 'Nung nhanh vài giây để sửa mạng tinh thể bị ion bắn hư và "kích hoạt" chất pha tạp. Chất pha tạp lan ra một chút.', e: 'Lò ủ nhiệt nhanh (RTP), ủ laser', c: 'Applied Materials (Mỹ), Mattson Technology (Mỹ), Screen (Nhật)' },
  { t: 'Cổng', d: 'Lặp lại quang khắc và ăn mòn để mở vùng giữa, mọc lớp oxit cổng rất mỏng, rồi lắng đọng vật liệu cổng lên trên. Quy trình hiện đại làm ngược lại: tạo cổng trước, rồi cấy nguồn và máng tự căn chỉnh theo mép cổng (self-aligned); lớp oxit cổng là vật liệu "high-k" lắng đọng từng lớp nguyên tử (ALD), cổng là kim loại.', e: 'Máy lắng đọng CVD, ALD, PVD', c: 'Applied Materials (Mỹ), Lam Research (Mỹ), Tokyo Electron (Nhật)' },
  { t: 'Kim loại hóa', d: 'Mở lỗ tiếp xúc và đắp kim loại để nối transistor ra ngoài. Chip thật có hơn mười tầng dây đồng chồng lên nhau, mỗi tầng được mài phẳng (CMP) trước khi làm tầng tiếp theo.', e: 'Máy mạ đồng, lắng đọng kim loại, máy mài phẳng CMP', c: 'Applied Materials (Mỹ), Lam Research (Mỹ), Ebara (Nhật)' },
  { t: 'Kiểm tra, cắt, đóng gói', d: 'Máy đo kiểm soi từng phiến tìm lỗi; mỗi chip được thử điện. Phiến được cắt thành từng chip, gắn vào vỏ, nối dây hoặc hàn bi, rồi thử lần cuối. Chip AI hiện nay còn ghép nhiều chip cạnh nhau trong một vỏ (đóng gói tiên tiến).', e: 'Máy đo kiểm, máy thử điện, dây chuyền đóng gói', c: 'Đo kiểm: KLA (Mỹ). Thử điện: Advantest (Nhật). Đóng gói: ASE (Đài Loan)' },
];

SEMI.demo('fab-flow', {
  domId: 'demoFab',
  title: 'Chế tạo một transistor, từng bước',
  page: '5-san-xuat.html',
  html: `<div class="demo-title"><h4>Chế tạo một transistor, từng bước</h4><span>Mặt cắt phiến Si qua ${STEPS.length} bước rút gọn</span></div>
  <div class="demo-body">
    <div class="stagebox"><canvas id="cvFab" class="ar" role="img" aria-label="Mặt cắt phiến Si thay đổi qua từng bước chế tạo: oxy hóa, phủ cản quang, quang khắc, tráng rửa, ăn mòn, cấy ion, tạo cổng và kim loại."></canvas></div>
    <div class="panel">
      <div class="btnrow"><button class="btn" type="button" id="fbPrev">← Bước trước</button><button class="btn" type="button" id="fbNext">Bước sau →</button></div>
      <div class="ctrl"><label for="fbS">Bước</label><output for="fbS"></output><input type="range" id="fbS" min="0" max="${STEPS.length - 1}" step="1" value="0"></div>
      <h4 id="fbT" style="margin:0;font-size:19px"></h4>
      <p id="fbD" style="margin:0;font-size:15px"></p>
      <dl class="readout"><dt>Thiết bị</dt><dd id="fbE" style="font:500 14px var(--body)"></dd><dt>Công ty dẫn đầu</dt><dd id="fbC" style="font:500 14px var(--body)"></dd></dl>
    </div>
  </div>`,
  init() {
    const cv = document.getElementById('cvFab'), st = {}, sl = document.getElementById('fbS'), out = document.querySelector('output[for="fbS"]');
    let s = 0;
    const go = k => { s = Math.max(0, Math.min(STEPS.length - 1, k)); sl.value = s; out.textContent = (s + 1) + ' / ' + STEPS.length;
      const S = STEPS[s]; document.getElementById('fbT').textContent = (s + 1) + '. ' + S.t; document.getElementById('fbD').textContent = S.d;
      document.getElementById('fbE').textContent = S.e; document.getElementById('fbC').textContent = S.c; draw(); };
    sl.addEventListener('input', () => go(+sl.value));
    document.getElementById('fbPrev').addEventListener('click', () => go(s - 1));
    document.getElementById('fbNext').addEventListener('click', () => go(s + 1));
    function draw() {
      if (!st.ctx) return;
      const { ctx, W, H } = st; ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
      const x0 = 24, x1 = W - 24, X = f => x0 + f * (x1 - x0), ys = H * 0.55, yb = H - 20, oxT = 16, rT = 14;
      const win = [[0.16, 0.34], [0.66, 0.84]], gate = [0.36, 0.64];
      const inWin = f => win.some(([a, b]) => f >= a && f <= b);
      // Si
      ctx.fillStyle = '#e7dfe9'; ctx.fillRect(x0, ys, x1 - x0, yb - ys); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x0, ys, x1 - x0, yb - ys);
      ctx.font = '600 12px "Be Vietnam Pro", system-ui, sans-serif'; ctx.fillStyle = '#6b4f78'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('Si loại p', x1 - 6, yb - 6);
      // vùng n+
      if (s >= 7) { const d = s >= 8 ? 46 : 26, sp = s >= 8 ? 10 : 0;
        win.forEach(([a, b], i) => { ctx.fillStyle = 'rgba(55,135,196,.55)'; ctx.beginPath(); ctx.moveTo(X(a) - sp, ys); ctx.lineTo(X(b) + sp, ys); ctx.quadraticCurveTo(X(b) + sp, ys + d, (X(a) + X(b)) / 2, ys + d); ctx.quadraticCurveTo(X(a) - sp, ys + d, X(a) - sp, ys); ctx.fill();
          ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s >= 11 ? (i ? 'máng n⁺' : 'nguồn n⁺') : 'n⁺', (X(a) + X(b)) / 2, ys + d * 0.45); }); }
      // SiO2
      if (s >= 1) {
        for (let k = 0; k < 400; k++) {
          const f = k / 400, open = s >= 5 && inWin(f + 0.0012), gateZone = s >= 9 && f > gate[0] && f < gate[1];
          if (open && !(s >= 9 && false)) continue;
          ctx.fillStyle = '#f7e8a8'; ctx.fillRect(X(f), ys - (gateZone ? 4 : oxT), (x1 - x0) / 400 + 0.6, gateZone ? 4 : oxT);
        }
        if (s >= 1 && s < 9) { ctx.fillStyle = '#9a7a12'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('SiO₂', X(0.005) + 2, ys - oxT / 2); }
      }
      // cản quang
      if (s >= 2 && s <= 5) {
        const top = ys - oxT;
        for (let k = 0; k < 400; k++) {
          const f = k / 400, w = inWin(f + 0.0012);
          if (s >= 4 && w) continue;
          ctx.fillStyle = s === 3 && w ? '#f2b9c9' : '#c2185b'; ctx.globalAlpha = s === 3 && w ? 0.9 : 0.65; ctx.fillRect(X(f), top - rT, (x1 - x0) / 400 + 0.6, rT); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('chất cản quang', X(0.5), top - rT / 2);
      }
      // mặt nạ + ánh sáng
      if (s === 3) {
        const my = 40; ctx.fillStyle = '#20232a'; win.reduce((p, [a, b]) => { ctx.fillRect(X(p), my, X(a) - X(p), 10); return b; }, 0); ctx.fillRect(X(win[1][1]), my, x1 - X(win[1][1]), 10);
        ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('mặt nạ (photomask)', x0, my - 4);
        ctx.fillStyle = 'rgba(123,79,191,.25)'; win.forEach(([a, b]) => { ctx.fillRect(X(a), my + 10, X(b) - X(a), ys - oxT - rT - my - 10); });
        ctx.strokeStyle = '#7b4fbf'; ctx.lineWidth = 2; win.forEach(([a, b]) => { for (let k = 0; k < 4; k++) { const x = X(a) + (k + 0.5) * (X(b) - X(a)) / 4; SEMI.arrow(ctx, x, 20, x, ys - oxT - rT - 2, '#7b4fbf', 2, 7); } });
        ctx.fillStyle = '#7b4fbf'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('ánh sáng tử ngoại', x1, 6);
      }
      if (s === 5) { ctx.fillStyle = '#d8312a'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; win.forEach(([a, b]) => { for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(X(a) + (k + 0.5) * (X(b) - X(a)) / 6, ys - oxT - rT - 14 - (k % 2) * 8, 2.5, 0, 7); ctx.fill(); } }); ctx.fillText('plasma', X(0.25), ys - oxT - rT - 30); }
      if (s === 7) { win.forEach(([a, b]) => { for (let k = 0; k < 5; k++) { const x = X(a) + (k + 0.5) * (X(b) - X(a)) / 5; SEMI.arrow(ctx, x, ys - 90, x, ys - 4, C.sea, 2, 7); } });
        for (let k = 0; k < 3; k++) { const x = X(0.4 + k * 0.1); SEMI.arrow(ctx, x, ys - 90, x, ys - oxT - 2, '#8b929b', 2, 7); }
        ctx.fillStyle = C.sea; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('ion P⁺ (SiO₂ chặn lại ở giữa)', x0, ys - 94); }
      if (s === 8) { ctx.fillStyle = 'rgba(242,107,48,.18)'; ctx.fillRect(x0, ys - 60, x1 - x0, yb - ys + 60); ctx.fillStyle = '#b4541f'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('nung nhanh ~1000 °C', X(0.5), ys - 64); }
      if (s >= 9) { const gt = ys - 4 - 26; ctx.fillStyle = '#8f96a0'; ctx.fillRect(X(gate[0]) + 6, gt, X(gate[1]) - X(gate[0]) - 12, 26); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(X(gate[0]) + 6, gt, X(gate[1]) - X(gate[0]) - 12, 26);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('cổng', X(0.5), gt + 13);
        ctx.fillStyle = '#9a7a12'; ctx.textBaseline = 'top'; ctx.fillText('oxit cổng mỏng', X(0.5), ys + 4); }
      if (s >= 10) { ctx.fillStyle = '#c87533'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        [[(win[0][0] + win[0][1]) / 2, ys], [0.5, ys - 30], [(win[1][0] + win[1][1]) / 2, ys]].forEach(([f, y], i) => { ctx.fillRect(X(f) - 9, 60, 18, y - 60); ctx.strokeRect(X(f) - 9, 60, 18, y - 60); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(['S', 'G', 'D'][i], X(f), 56); ctx.fillStyle = '#c87533'; });
        ctx.fillStyle = '#c87533'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('dây đồng', x0, 66); }
      if (s === 11) { ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(x0 + 4, 40, x1 - x0 - 8, yb - 44); ctx.setLineDash([]); ctx.fillStyle = C.pos; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('một transistor hoàn chỉnh', x1 - 8, 22); }
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '700 13px "Be Vietnam Pro", system-ui, sans-serif';
      if (s !== 3) ctx.fillText((s + 1) + '. ' + STEPS[s].t, x0, 8);
    }
    watchCanvas(cv, st, draw);
    go(0);
  },
});
})();
