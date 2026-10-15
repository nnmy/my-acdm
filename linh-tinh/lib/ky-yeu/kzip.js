/* =====================================================================
   ZIP tối giản, chạy hoàn toàn trong trình duyệt (không gửi dữ liệu đi đâu).
   - KZip.write(files) -> Blob. files: [{ name, data: Uint8Array | string }]. Lưu kiểu "store" (không nén):
     ảnh JPEG/PNG vốn đã nén, còn JSON/XML nhỏ.
   - KZip.read(arrayBuffer) -> Promise<Map<name, Uint8Array>>. Đọc được cả file nén deflate (ví dụ file .xlsx
     từ Excel, hoặc file zip người dùng nén lại bằng hệ điều hành) nhờ DecompressionStream của trình duyệt.
   ===================================================================== */
(() => {
  'use strict';
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function write(files, mime = 'application/zip') {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    const d = new Date();
    const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    for (const f of files) {
      const nb = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + data.length;
    }
    const csize = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: mime });
  }

  async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt không hỗ trợ giải nén (cần Chrome, Edge, Firefox hoặc Safari bản mới).');
    const ds = new DecompressionStream('deflate-raw');
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(out);
  }

  async function read(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Không phải file zip hợp lệ.');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder(), out = new Map();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('File zip bị hỏng.');
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (name.endsWith('/')) continue;
      const lnlen = dv.getUint16(lho + 26, true), lxlen = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lnlen + lxlen;
      const raw = u8.subarray(start, start + csize);
      if (method === 0) out.set(name, raw.slice());
      else if (method === 8) out.set(name, await inflate(raw));
      else throw new Error(`Kiểu nén không hỗ trợ (${method}) trong ${name}.`);
    }
    return out;
  }

  window.KZip = { write, read, text: b => new TextDecoder().decode(b) };
})();
