/* =====================================================================
   Sinh điện từ: dữ liệu và mô hình điện môi của mô (dùng chung cho các minh họa phần 4).
   Mô hình 4 vùng Cole–Cole của Gabriel, Lau & Gabriel (1996), Phys. Med. Biol. 41:2271.
   Tham số lấy từ bảng tóm tắt Appendix C (C. Gabriel & S. Gabriel 1996), bản trên WebNIR / IFAC-CNR:
   https://niremf.ifac.cnr.it/docs/DIELECTRIC/AppendixC.html
   p = [ε∞, σi (S/m), Δε1, τ1 (ps), α1, Δε2, τ2 (ns), α2, Δε3, τ3 (µs), α3, Δε4, τ4 (ms), α4]
   rho: khối lượng riêng (kg/m³), giá trị điển hình theo IT'IS Foundation (dùng cho SAR).
   Mô hình dùng tin cậy trên 1 MHz; dưới 1 MHz là ước lượng tốt nhất, sai số có thể tới 2 lần.
   ===================================================================== */
(() => {
const T = {
  muscle: { vi: 'Cơ', en: 'muscle', rho: 1090, p: [4, 0.2, 50, 7.234, 0.1, 7000, 353.68, 0.1, 1.2e6, 318.31, 0.1, 2.5e7, 2.274, 0] },
  fat:    { vi: 'Mỡ', en: 'fat', rho: 911, p: [2.5, 0.01, 3, 7.958, 0.2, 15, 15.915, 0.1, 33000, 159.16, 0.05, 1e7, 7.958, 0.01] },
  blood:  { vi: 'Máu', en: 'blood', rho: 1050, p: [4, 0.7, 56, 8.377, 0.1, 5200, 132.63, 0.1, 0, 159.16, 0.2, 0, 15.915, 0] },
  grey:   { vi: 'Chất xám (não)', en: 'brain grey matter', rho: 1045, p: [4, 0.02, 45, 7.958, 0.1, 400, 15.915, 0.15, 2e5, 106.1, 0.22, 4.5e7, 5.305, 0] },
  white:  { vi: 'Chất trắng (não)', en: 'brain white matter', rho: 1041, p: [4, 0.02, 32, 7.958, 0.1, 100, 7.958, 0.1, 40000, 53.052, 0.3, 3.5e7, 7.958, 0.02] },
  csf:    { vi: 'Dịch não tủy', en: 'cerebrospinal fluid', rho: 1007, p: [4, 2, 65, 7.958, 0.1, 40, 1.592, 0, 0, 159.16, 0, 0, 15.915, 0] },
  bone:   { vi: 'Xương vỏ', en: 'cortical bone', rho: 1908, p: [2.5, 0.02, 10, 13.263, 0.2, 180, 79.577, 0.2, 5000, 159.16, 0.2, 1e5, 15.915, 0] },
  skinw:  { vi: 'Da ướt', en: 'wet skin', rho: 1109, p: [4, 0.0004, 39, 7.958, 0.1, 280, 79.577, 0, 30000, 1.592, 0.16, 30000, 1.592, 0.2] },
  skind:  { vi: 'Da khô', en: 'dry skin', rho: 1109, p: [4, 0.0002, 32, 7.234, 0, 1100, 32.481, 0.2, 0, 159.16, 0.2, 0, 15.915, 0.2] },
  heart:  { vi: 'Tim', en: 'heart', rho: 1081, p: [4, 0.05, 50, 7.958, 0.1, 1200, 159.16, 0.05, 4.5e5, 72.343, 0.22, 2.5e7, 4.547, 0] },
  liver:  { vi: 'Gan', en: 'liver', rho: 1079, p: [4, 0.02, 39, 8.842, 0.1, 6000, 530.52, 0.2, 50000, 22.736, 0.2, 3e7, 15.915, 0.05] },
  lung:   { vi: 'Phổi (phồng)', en: 'inflated lung', rho: 394, p: [2.5, 0.03, 18, 7.958, 0.1, 500, 63.662, 0.1, 2.5e5, 159.16, 0.2, 4e7, 7.958, 0] },
  nerve:  { vi: 'Dây thần kinh', en: 'nerve', rho: 1075, p: [4, 0.006, 26, 7.958, 0.1, 500, 106.1, 0.15, 70000, 15.915, 0.2, 4e7, 15.915, 0] },
};
const EPS0 = 8.8541878128e-12, C0 = 299792458;
const UNIT = [1e-12, 1e-9, 1e-6, 1e-3];
/* ε*(f) = ε' − jε''. Trả về {re, im (= ε'' > 0), sigma (S/m, tổng), terms[4] (phần thực từng vùng)} */
function eps(key, f) {
  const p = T[key].p, w = 2 * Math.PI * f;
  let re = p[0], im = 0; const terms = [];
  for (let n = 0; n < 4; n++) {
    const d = p[2 + 3 * n], tau = p[3 + 3 * n] * UNIT[n], a = p[4 + 3 * n];
    if (!d) { terms.push([0, 0]); continue; }
    const b = 1 - a, m = Math.pow(w * tau, b), ar = 1 + m * Math.cos(Math.PI * b / 2), ai = m * Math.sin(Math.PI * b / 2);
    const den = ar * ar + ai * ai, tr = d * ar / den, ti = -d * ai / den;      // d / (ar + j ai)
    re += tr; im += ti; terms.push([tr, -ti]);
  }
  im -= p[1] / (w * EPS0);                                                    // σi/(jωε0) = −j σi/(ωε0)
  const epp = -im;
  return { re, im: epp, sigma: w * EPS0 * epp, terms };
}
/* Hằng số lan truyền: k = (ω/c)·sqrt(ε*). Trả về δ (m, độ sâu biên độ E còn 1/e) và λ trong mô. */
function wave(key, f) {
  const e = eps(key, f), w = 2 * Math.PI * f;
  const a = e.re, b = -e.im, r = Math.hypot(a, b);                       // sqrt(a + jb)
  const sr = Math.sqrt((r + a) / 2), si = Math.sign(b || -1) * Math.sqrt(Math.max(0, (r - a) / 2));
  const kr = w / C0 * sr, ki = w / C0 * Math.abs(si);
  return { delta: 1 / ki, lambda: 2 * Math.PI / kr, eps: e };
}
BEM.GABRIEL = { T, eps, wave, EPS0, C0 };
})();
