/* =====================================================================
   Cổng mở khóa cho các trang nội dung (intro-bem, intro-transformer, med-atlas, linh-tinh).
   Nạp ĐỒNG BỘ trong <head> của mỗi trang, ngay sau <meta charset>:
       <style>html.gate-locked body{visibility:hidden!important}</style>
       <script src="../common/gate.js"></script>
   và thẻ <html> có sẵn class="gate-locked" (trang bị ẩn cho tới khi mã được xác nhận;
   tắt JavaScript cũng không xem được).

   Cách lưu mã: KHÔNG có mã gốc ở đâu cả, chỉ có bản băm PBKDF2-SHA256 (muối riêng, 200 000 vòng).
   Mã người dùng nhập được chuẩn hoá (bỏ dấu, bỏ khoảng trắng, chữ thường), băm cùng cách,
   rồi so với danh sách. Khớp: lưu mã trên máy người dùng (localStorage) để lần sau không hỏi lại,
   và mỗi lần mở trang lại băm-kiểm tra lại (sửa localStorage bằng tay không vượt qua được).
   Sai: chuyển về trang chủ.
   Thêm / đổi mã: chạy common/gate_hash.py <mã> rồi dán bản băm vào HASHES (giữ nguyên SALT, ITER).
   Đổi SALT thì phải băm lại mọi mã.

   Giới hạn (web tĩnh): đây là rào chắn cho người xem thông thường, không phải bảo mật thật.
   Nội dung vẫn nằm trong file HTML/JS/dữ liệu công khai (xem mã nguồn trang, mở thẳng đường dẫn file).
   ===================================================================== */
(() => {
  'use strict';
  const HOME = 'https://nnmy.github.io/';
  const STORE_KEY = 'acdm-gate';
  const PROMPT = 'Bạn và tui lần đầu gặp nhau ở tỉnh/thành phố nào (nhập không dấu, không khoảng cách)';
  const SALT = '276fe92fd02d531189918104aa6eaee3';
  const ITER = 200000;
  const HASHES = new Set([
    '011ec043a9ae7c46c63ef103b1a1e443957a8598e1894799875c9ea4344c60f5',
    '292ee090f8f124fd010ca46a31762fa9b4925ba32de331080b6860940330f104',
    '3d68205042fa5abec9227b056908ff3eaedd90e0886709f12e027c90a819aff2',
    '592b8cfb7b178406b3ebc91dac26ab6c0f07c4786867376feb68f0225c3c876e',
    '722b384dae6ce784d994801df323471558605863e9c842c96962b2fa908808aa',
    '923ff0cb14e699005b3f0da1b29e91fbcd5ad685cf1fad38eccf173e14301e40',
    'c9996ac3ba26a4d3325242e21d048bcfac325e460f12e0a5e352daa8cfc44210',
  ]);

  const root = document.documentElement;
  root.classList.add('gate-locked');
  // dự phòng nếu trang thiếu thẻ <style> tĩnh
  const st = document.createElement('style');
  st.textContent = 'html.gate-locked body{visibility:hidden!important}';
  document.head.appendChild(st);

  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
  const hexToBytes = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
  const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  async function check(code) {
    if (!code) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(SALT), iterations: ITER }, key, 256);
    return HASHES.has(toHex(bits));
  }
  const store = {
    get() { try { return localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(STORE_KEY, v); } catch (e) { try { sessionStorage.setItem(STORE_KEY, v); } catch (e2) { /* bỏ qua */ } } },
    clear() { try { localStorage.removeItem(STORE_KEY); sessionStorage.removeItem(STORE_KEY); } catch (e) { /* bỏ qua */ } },
  };
  const unlock = () => root.classList.remove('gate-locked');
  const leave = () => location.replace(HOME);
  const whenReady = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());

  function ask(note) {
    whenReady(() => {
      const css = document.createElement('style');
      css.textContent = `
.gate-ov{position:fixed;inset:0;z-index:2147483000;visibility:visible;display:grid;place-items:center;padding:20px;background:#FBFCFD;
  font:400 16px/1.5 "Be Vietnam Pro","Figtree","Segoe UI",system-ui,-apple-system,sans-serif;color:#1B1920}
.gate-ov *{box-sizing:border-box}
.gate-card{width:min(440px,100%);background:#fff;border:2px solid #1B1920;box-shadow:6px 6px 0 #7bcde8;padding:22px 22px 20px}
.gate-card label{display:block;font-weight:600;font-size:17px;line-height:1.45;margin:0 0 14px}
.gate-row{display:flex;gap:8px}
.gate-row input{flex:1;min-width:0;font-family:inherit;font-size:17px;font-weight:500;line-height:1.3;padding:8px 10px;border:2px solid #1B1920;border-radius:0;background:#fff;color:#1B1920}
.gate-row button{font-family:inherit;font-size:15px;font-weight:600;line-height:1.3;padding:8px 16px;border:2px solid #1B1920;background:#3787c4;color:#fff;cursor:pointer}
.gate-row button:disabled{opacity:.6;cursor:default}
.gate-ov :focus-visible{outline:3px solid #3787c4;outline-offset:2px}
.gate-note{margin:10px 0 0;font-size:14px;color:#59606B}`;
      const ov = document.createElement('div');
      ov.className = 'gate-ov';
      ov.innerHTML = `<form class="gate-card" autocomplete="off">
  <label for="gateIn">${PROMPT}</label>
  <div class="gate-row"><input id="gateIn" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" required><button type="submit">Tiếp tục</button></div>
  ${note ? `<p class="gate-note">${note}</p>` : ''}
</form>`;
      document.body.append(css, ov);
      const form = ov.querySelector('form'), inp = ov.querySelector('input'), btn = ov.querySelector('button');
      inp.focus();
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const code = norm(inp.value);
        if (!code) { inp.focus(); return; }
        btn.disabled = true; inp.disabled = true;
        let ok = false;
        try { ok = await check(code); } catch (err) { console.error(err); }
        if (!ok) { leave(); return; }
        store.set(code);
        ov.remove(); css.remove(); unlock();
      });
    });
  }

  if (!window.crypto || !crypto.subtle) {          // chỉ có trên https hoặc localhost
    whenReady(() => {
      const p = document.createElement('p');
      p.style.cssText = 'visibility:visible;position:fixed;inset:auto 0 0 0;top:40%;text-align:center;font:16px system-ui,sans-serif;padding:20px';
      p.textContent = 'Trang cần mở qua https (hoặc localhost) để tiếp tục.';
      document.body.appendChild(p);
    });
    return;
  }
  const saved = store.get();
  if (saved) check(saved).then(ok => { if (ok) unlock(); else { store.clear(); ask(); } }, () => ask());
  else ask();
})();
