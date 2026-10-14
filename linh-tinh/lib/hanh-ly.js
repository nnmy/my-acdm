/* =====================================================================
   Xếp hành lý (linh-tinh/hanh-ly.html): toàn bộ logic.
   Dữ liệu (vật dụng, loại đồ chứa): lib/hanh-ly-data.js → window.HL_DATA.
   - Trạng thái: state = { trip, bags, items, seq, fresh }, tự lưu localStorage (KEY).
   - trip: { scope, days (1–3; 4 nghĩa là "trên 3 ngày"), transport[], place[], weather[] (rain/snow), tmin, tmax, hmin, hmax, perDay, cur, home, wxSrc }
   - Mỗi món: { id, key (mã trong danh mục, nếu có), name, qty, unit, g, ml, cat, note, loc }
     loc = id của đồ chứa / 'pool' (Chưa xếp) / 'skip' (Không mang).
   - Đồ chứa: { id, type, name, kg } ; kg = khối lượng tối đa (chỉ dùng khi đi máy bay); viền dày dần theo % kg.
   - Lần đầu mở trang (không có dữ liệu lưu): đoán nước đang ở từ múi giờ / ngôn ngữ trình duyệt
     (tên "Căn cước" hay "Thẻ cư trú", đơn vị tiền), lấy dự báo 7 ngày ở đó từ Open-Meteo (không cần quyền vị trí)
     làm khoảng nhiệt độ, độ ẩm mặc định, và xếp sẵn các món có home = 'cross' / 'backpack'.
     Nút ghim (📍) dùng vị trí chính xác (trình duyệt sẽ hỏi quyền).
   - Mọi thay đổi trên đồ chứa và món đi qua act() để có Hoàn tác.
   - Xuất: DOCX tự dựng (XML + ZIP không nén), PDF qua hộp thoại In (checklist gọn + sơ đồ hành lý), JSON.
   ===================================================================== */
(() => {
'use strict';
const D = window.HL_DATA;
if (!D) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'hanh-ly-v4', OLD_KEYS = ['hanh-ly-v3', 'hanh-ly-v2', 'hanh-ly-v1'];
const ROOT = $('#hl');
const itemDef = Object.fromEntries(D.ITEMS.map(i => [i.id, i]));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('vi-VN');
const pf = s => { const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- đoán nơi đang ở (không cần quyền vị trí) ----------------
   Múi giờ → [mã nước, vĩ độ, kinh độ, thành phố]; tiền tệ theo mã nước. */
const TZ = {
  'Asia/Ho_Chi_Minh': ['VN', 10.82, 106.63, 'TP.HCM'], 'Asia/Saigon': ['VN', 10.82, 106.63, 'TP.HCM'],
  'Asia/Bangkok': ['TH', 13.75, 100.5, 'Bangkok'], 'Asia/Tokyo': ['JP', 35.68, 139.69, 'Tokyo'], 'Asia/Taipei': ['TW', 25.03, 121.56, 'Đài Bắc'],
  'Asia/Seoul': ['KR', 37.57, 126.98, 'Seoul'], 'Asia/Shanghai': ['CN', 31.23, 121.47, 'Thượng Hải'], 'Asia/Hong_Kong': ['HK', 22.3, 114.17, 'Hồng Kông'],
  'Asia/Singapore': ['SG', 1.35, 103.82, 'Singapore'], 'Asia/Kuala_Lumpur': ['MY', 3.14, 101.69, 'Kuala Lumpur'], 'Asia/Jakarta': ['ID', -6.2, 106.85, 'Jakarta'],
  'Asia/Manila': ['PH', 14.6, 120.98, 'Manila'], 'Asia/Phnom_Penh': ['KH', 11.56, 104.92, 'Phnom Penh'], 'Asia/Vientiane': ['LA', 17.97, 102.6, 'Viêng Chăn'],
  'Asia/Kolkata': ['IN', 28.61, 77.21, 'New Delhi'], 'Australia/Sydney': ['AU', -33.87, 151.21, 'Sydney'], 'Australia/Melbourne': ['AU', -37.81, 144.96, 'Melbourne'],
  'Pacific/Auckland': ['NZ', -36.85, 174.76, 'Auckland'], 'Europe/London': ['GB', 51.5, -0.13, 'London'], 'Europe/Paris': ['FR', 48.86, 2.35, 'Paris'],
  'Europe/Berlin': ['DE', 52.52, 13.4, 'Berlin'], 'Europe/Amsterdam': ['NL', 52.37, 4.9, 'Amsterdam'], 'Europe/Rome': ['IT', 41.9, 12.5, 'Rome'],
  'Europe/Madrid': ['ES', 40.42, -3.7, 'Madrid'], 'Europe/Zurich': ['CH', 47.37, 8.54, 'Zürich'], 'Europe/Stockholm': ['SE', 59.33, 18.07, 'Stockholm'],
  'America/New_York': ['US', 40.71, -74.0, 'New York'], 'America/Chicago': ['US', 41.88, -87.63, 'Chicago'], 'America/Los_Angeles': ['US', 34.05, -118.24, 'Los Angeles'],
  'America/Toronto': ['CA', 43.65, -79.38, 'Toronto'], 'America/Vancouver': ['CA', 49.28, -123.12, 'Vancouver'],
};
const CUR = { VN: 'VND', TH: 'THB', JP: 'JPY', TW: 'TWD', KR: 'KRW', CN: 'CNY', HK: 'HKD', SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', KH: 'KHR', LA: 'LAK', IN: 'INR',
  AU: 'AUD', NZ: 'NZD', GB: 'GBP', FR: 'EUR', DE: 'EUR', NL: 'EUR', IT: 'EUR', ES: 'EUR', CH: 'CHF', SE: 'SEK', US: 'USD', CA: 'CAD' };
function guessPlace() {
  let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  const lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  const region = (lang.split('-')[1] || '').toUpperCase();
  let hit = TZ[tz] ? [...TZ[tz]] : null;
  if (hit && hit[0] === 'TH' && /^vi\b/i.test(lang)) hit = ['VN', 21.03, 105.85, 'Hà Nội'];   // máy ở VN đôi khi đặt múi giờ Bangkok
  const country = hit ? hit[0] : region || (/^vi\b/i.test(lang) ? 'VN' : '');
  return { country, cur: CUR[country] || '', lat: hit?.[1], lon: hit?.[2], city: hit?.[3] };
}

/* ---------------- trạng thái ---------------- */
const DEF_TRIP = () => ({ scope: 'dom', days: 2, transport: ['ground'], weather: [], place: ['city'],
  tmin: 25, tmax: 33, hmin: 60, hmax: 85, perDay: '', cur: '', home: '', wxSrc: '', transportTouched: false });
const DEF_BAGS = () => [mkBag('cross', 'b1'), mkBag('backpack', 'b2')];
function mkBag(type, id, name) { return { id, type, name: name || D.CONTAINERS[type].name, kg: D.CONTAINERS[type].kg ?? null }; }

let state = load();
const firstRun = !state;
if (!state) { state = { trip: DEF_TRIP(), bags: DEF_BAGS(), items: [], seq: 3, fresh: true }; }
else { state.items = state.items.filter(i => i.loc !== 'pool' && i.loc !== 'skip'); save(); }   // tải lại trang: bỏ các món Chưa xếp, Không mang của lần trước
let hist = [];
let tab = 'personal', wtab = 'temp';

function load() {
  try {
    for (const k of [KEY, ...OLD_KEYS]) {
      const s = JSON.parse(localStorage.getItem(k)); if (!s) continue;
      const st = sanitize(s);
      if (st && k !== KEY) st.trip.days = 2;   // dữ liệu của bản cũ (số ngày tới 60): đưa số ngày về mặc định 2
      return st;
    }
  } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function sanitize(s) {
  if (!s || !Array.isArray(s.items) || !Array.isArray(s.bags) || typeof s.trip !== 'object') return null;
  const o = s.trip, trip = DEF_TRIP();
  // bản cũ: from/to, purpose, days 1–4 + real, humid khô/vừa/ẩm, place wild, vali xách tay/ký gửi → dạng mới
  trip.scope = o.scope === 'intl' || (o.from && o.to && o.from !== o.to) ? 'intl' : 'dom';
  for (const k of ['tmin', 'tmax', 'hmin', 'hmax', 'perDay', 'cur', 'home', 'wxSrc', 'transportTouched']) if (o[k] !== undefined) trip[k] = o[k];
  let days = pf(o.days) || 2; if (days === 4 && pf(o.real)) days = pf(o.real);   // bản cũ: 4 = "trên 3 ngày"
  trip.days = clamp(Math.round(days), 1, 4);
  trip.tmin = clamp(pf(trip.tmin) ?? 25, -20, 45); trip.tmax = clamp(Math.max(trip.tmin, pf(trip.tmax) ?? 33), -20, 45);
  if (o.hmin === undefined && o.humid) [trip.hmin, trip.hmax] = { dry: [25, 45], mid: [50, 65], wet: [75, 95] }[o.humid] || [60, 85];
  trip.hmin = clamp(pf(trip.hmin) ?? 60, 0, 100); trip.hmax = clamp(Math.max(trip.hmin, pf(trip.hmax) ?? 85), 0, 100);
  trip.transport = (Array.isArray(o.transport) ? o.transport : []).filter(v => ['plane', 'ground'].includes(v));
  trip.weather = (Array.isArray(o.weather) ? o.weather : []).filter(v => ['rain', 'snow'].includes(v));
  trip.place = (Array.isArray(o.place) ? o.place : []).map(v => v === 'wild' ? 'mountain' : v).filter(v => ['city', 'rural', 'beach', 'mountain'].includes(v));
  const TYPE = t => D.CONTAINERS[t] ? t : (t === 'carry' || t === 'checked') ? 'suitcase' : null;
  const bags = s.bags.filter(b => b && TYPE(b.type)).map(b => ({ id: String(b.id), type: TYPE(b.type), name: String(b.name || D.CONTAINERS[TYPE(b.type)].name).slice(0, 60), kg: pf(b.kg) }));
  if (!s.v || s.v < 2) bags.forEach(b => { b.kg = D.CONTAINERS[b.type].kg ?? null; });
  const ids = new Set(bags.map(b => b.id));
  const items = s.items.filter(i => i && i.name).map(i => ({
    id: String(i.id), key: i.key && itemDef[i.key] ? i.key : null, name: String(i.name).slice(0, 120), qty: pf(i.qty) ?? 1, unit: String(i.unit ?? 'cái').slice(0, 20),
    g: pf(i.g), ml: pf(i.ml), cat: D.CATS[i.cat] ? i.cat : 'misc', note: String(i.note ?? '').slice(0, 200),
    loc: ids.has(String(i.loc)) || i.loc === 'skip' ? String(i.loc) : 'pool',
  }));
  const maxId = Math.max(0, ...[...bags, ...items].map(x => parseInt(String(x.id).replace(/\D/g, '')) || 0));
  return { trip, bags, items, seq: Math.max(pf(s.seq) || 0, maxId + 1), fresh: false };
}
const nid = p => p + (state.seq++);

function act(fn) {
  hist.push(JSON.stringify({ bags: state.bags, items: state.items, seq: state.seq }));
  if (hist.length > 80) hist.shift();
  state.fresh = false;
  fn(); save(); renderAll();
}
function undo() {
  const h = hist.pop(); if (!h) return;
  Object.assign(state, JSON.parse(h)); save(); renderAll(); toast('Đã hoàn tác.');
}

/* ---------------- thông tin chuyến đi → t ---------------- */
function tripInfo() {
  const r = state.trip, has = (arr, v) => arr.includes(v), hm = (r.hmin + r.hmax) / 2;
  const t = {
    intl: r.scope === 'intl', days: Math.min(r.days, 3), real: r.days, long: r.days > 3, home: r.home,
    tmin: r.tmin, tmax: r.tmax, hmin: r.hmin, hmax: r.hmax, humid: hm >= 70 ? 'wet' : hm <= 45 ? 'dry' : 'mid',
    rain: has(r.weather, 'rain'), snow: has(r.weather, 'snow'),
    city: has(r.place, 'city'), rural: has(r.place, 'rural'), beach: has(r.place, 'beach'), mountain: has(r.place, 'mountain'),
    plane: has(r.transport, 'plane'), ground: has(r.transport, 'ground'),
    suitcase: state.bags.some(b => b.type === 'suitcase'),
  };
  t.sunny = t.tmax >= 25 || t.beach;
  return t;
}
const val = (v, t) => typeof v === 'function' ? v(t) : v;
const nameOf = d => val(d.name, tripInfo());

function suggestions() {
  const t = tripInfo(), out = { personal: [], special: [], base: [] };
  for (const d of D.ITEMS) {
    if (d.when && !d.when(t)) continue;
    out[d.kind || 'base'].push({ d, name: val(d.name, t), unit: val(d.unit, t) || 'cái', qty: Math.max(1, Math.round(val(d.qty ?? 1, t))), why: val(d.why, t) || '' });
  }
  return out;
}
const addedKeys = () => new Set(state.items.map(i => i.key).filter(Boolean));
function itemFromDef(s, loc) {
  const d = s.d;
  return { id: nid('i'), key: d.id, name: s.name, qty: s.qty, unit: s.unit, g: d.g ?? null, ml: d.ml ?? null, cat: d.cat,
    note: d.kind === 'special' ? s.why : '', loc };
}
const bagOf = type => state.bags.find(b => b.type === type);
function homeLoc(d) {
  if (d.home && bagOf(d.home)) return bagOf(d.home).id;
  if (d.kind === 'personal') { const b = state.bags.find(b => D.CONTAINERS[b.type].personal); if (b) return b.id; }
  return 'pool';
}
/* xếp sẵn các món có home (chỉ khi mở trang lần đầu / làm lại) */
function prefill() {
  const S = suggestions(), done = addedKeys();
  [...S.personal, ...S.special, ...S.base].filter(s => s.d.home && !done.has(s.d.id) && bagOf(s.d.home))
    .forEach(s => state.items.push(itemFromDef(s, bagOf(s.d.home).id)));
}

/* ---------------- render: bước 1 ---------------- */
function fillSelects() {
  $('#hlNewType').innerHTML = Object.entries(D.CONTAINERS).map(([k, c]) => `<option value="${k}">${esc(c.name)}</option>`).join('');
  $('#hlDlgForm [name=cat]').innerHTML = Object.entries(D.CATS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
}
const setVal = (el, v) => { if (document.activeElement !== el) el.value = v; };
function range2(key, lo, hi) {
  const box = $(`[data-r2="${key}"]`), [a, b] = $$('input', box), span = +a.max - +a.min;
  a.value = lo; b.value = hi;
  a.style.zIndex = lo >= +a.max - (span * 0.12) ? 3 : 1; b.style.zIndex = 2;   // hai nút chồng nhau ở đầu phải: cho nút min lên trên
  Object.assign($('.fill', box).style, { left: ((lo - a.min) / span * 100) + '%', width: ((hi - lo) / span * 100) + '%' });
}
function renderTrip() {
  const r = state.trip, t = tripInfo();
  $$('.hl-seg[data-key]').forEach(seg => {
    const cur = r[seg.dataset.key];
    $$('button', seg).forEach(b => b.setAttribute('aria-pressed', Array.isArray(cur) ? cur.includes(b.dataset.v) : String(cur) === b.dataset.v));
  });
  $('#hlDays').textContent = r.days > 3 ? '>3' : r.days;
  range2('t', r.tmin, r.tmax); range2('h', r.hmin, r.hmax);
  $('#hlTempOut').textContent = `${r.tmin}–${r.tmax} °C`;
  $('#hlHumOut').textContent = `${r.hmin}–${r.hmax} %`;
  $('#hlOtherOut').textContent = [t.rain && 'mưa', t.snow && 'tuyết'].filter(Boolean).join(', ') || '—';
  $$('.hl-wtabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.wtab === wtab));
  $$('.hl-wpanel').forEach(p => { p.hidden = p.dataset.wpanel !== wtab; });
  $('#hlWsrc').hidden = !r.wxSrc; $('#hlWsrc').textContent = r.wxSrc;
  setVal($('#hlPerDay'), r.perDay); setVal($('#hlCur'), r.cur);
  const per = pf(r.perDay);
  $('#hlBudgetOut').textContent = !per ? '' : t.long ? `≈ ${num(per * 3, 0)} ${r.cur} cho 3 ngày đầu`.replace('  ', ' ') : `≈ ${num(per * t.real, 0)} ${r.cur} cho ${t.real} ngày`.replace('  ', ' ');
}

/* ---------------- thời tiết mặc định theo vị trí (Open-Meteo, không cần khóa API) ---------------- */
async function fetchWeather(lat, lon, label) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    '&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,relative_humidity_2m_min,precipitation_probability_max,snowfall_sum&forecast_days=7&timezone=auto';
  const res = await fetch(u); if (!res.ok) throw new Error('HTTP ' + res.status);
  const d = (await res.json()).daily, ok = a => (a || []).filter(v => v != null);
  const tmin = Math.min(...ok(d.temperature_2m_min)), tmax = Math.max(...ok(d.temperature_2m_max));
  const hmin = Math.min(...ok(d.relative_humidity_2m_min)), hmax = Math.max(...ok(d.relative_humidity_2m_max));
  if (!isFinite(tmin) || !isFinite(tmax)) throw new Error('no data');
  const r = state.trip;
  r.tmin = clamp(Math.floor(tmin), -20, 45); r.tmax = clamp(Math.max(r.tmin, Math.ceil(tmax)), -20, 45);
  if (isFinite(hmin) && isFinite(hmax)) { r.hmin = clamp(Math.floor(hmin / 5) * 5, 0, 100); r.hmax = clamp(Math.ceil(hmax / 5) * 5, r.hmin, 100); }
  const rain = ok(d.precipitation_probability_max).some(v => v >= 50), snow = ok(d.snowfall_sum).some(v => v > 0);
  r.weather = [rain && 'rain', snow && 'snow'].filter(Boolean);
  r.wxSrc = `Theo dự báo 7 ngày tới ở ${label} (Open-Meteo). Chỉnh lại theo nơi đến.`;
}
async function autoDefaults() {
  const g = guessPlace(), r = state.trip;
  r.home = g.country; if (!r.cur) r.cur = g.cur;
  if (g.lat != null) { try { await fetchWeather(g.lat, g.lon, g.city); } catch (e) { /* không có mạng: giữ mặc định */ } }
  if (state.fresh) { state.items = []; prefill(); }   // xếp sẵn lại theo thời tiết vừa lấy (vd. có mưa thì thêm dù, bọc balo)
  save(); renderAll();
}
function geoWeather() {
  if (!navigator.geolocation) { toast('Trình duyệt không hỗ trợ lấy vị trí.'); return; }
  const btn = $('#hlGeo'); btn.classList.add('busy');
  navigator.geolocation.getCurrentPosition(async p => {
    try { await fetchWeather(p.coords.latitude, p.coords.longitude, 'vị trí hiện tại'); save(); renderAll(); toast('Đã cập nhật nhiệt độ, độ ẩm theo vị trí hiện tại.'); }
    catch (e) { toast('Không lấy được dự báo thời tiết. Kiểm tra kết nối mạng.'); }
    btn.classList.remove('busy');
  }, () => { btn.classList.remove('busy'); toast('Không lấy được vị trí (chưa cho phép hoặc bị chặn).'); }, { timeout: 10000, maximumAge: 600000 });
}

/* ---------------- render: gợi ý ---------------- */
function renderSugg() {
  const S = suggestions(), done = addedKeys();
  $$('.hl-tabs button').forEach(b => {
    const k = b.dataset.tab, left = S[k].filter(s => !done.has(s.d.id)).length;
    b.setAttribute('aria-selected', k === tab); $('.cnt', b).textContent = `(${left})`;
  });
  const list = S[tab], box = $('#hlSugg');
  if (!list.length) { box.innerHTML = '<p class="hl-empty" style="padding:10px 14px">Không có gợi ý nào cho các lựa chọn hiện tại.</p>'; return; }
  const groups = {};
  list.forEach(s => (groups[s.d.cat] = groups[s.d.cat] || []).push(s));
  box.innerHTML = Object.keys(D.CATS).filter(c => groups[c]).map(c => `<div class="grp">${esc(D.CATS[c])}</div>` + groups[c].map(s => {
    const a = done.has(s.d.id), q = s.qty > 1 ? `×${s.qty}` : '';
    return `<div class="hl-srow${a ? ' added' : ''}" data-key="${s.d.id}" data-qty="${s.qty}">
      <span class="nm">${esc(s.name)} <span class="q">${q}</span></span>
      ${a ? '<span></span>' : `<button type="button" class="hl-add" aria-label="Thêm ${esc(s.name)}" title="Thêm">+</button>`}
      ${s.why ? `<span class="why">${esc(s.why)}</span>` : ''}</div>`;
  }).join('')).join('');
  $('#hlAddAll').disabled = !list.some(s => !done.has(s.d.id));
}
function addSugg(keys, loc) {
  const S = suggestions(), all = [...S.personal, ...S.special, ...S.base], done = addedKeys();
  const picks = all.filter(s => keys.includes(s.d.id) && !done.has(s.d.id));
  if (!picks.length) return;
  act(() => picks.forEach(s => state.items.push(itemFromDef(s, loc ?? homeLoc(s.d)))));
}


/* ---------------- render: đồ chứa, vùng ---------------- */
const ICONS = {
  cross: '<path d="M6 3 L18 15" stroke-width="1.6"/><rect x="5" y="12" width="15" height="10" rx="2"/><path d="M5 16h15"/>',
  tote: '<path d="M8 9V6a4 4 0 0 1 8 0v3"/><path d="M4 9h16l-1.5 13h-13z"/>',
  backpack: '<rect x="5" y="6" width="14" height="16" rx="4"/><path d="M9 6V4h6v2M8 14h8v5H8z"/>',
  suitcase: '<rect x="5" y="6" width="14" height="15" rx="2"/><path d="M9.5 6V3h5v3M8 21v1.5M16 21v1.5M9 10v7M12 10v7M15 10v7"/>',
};
const icon = type => `<svg class="hl-ico" viewBox="0 0 24 24" fill="none" stroke="#1B1920" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICONS[type]}</svg>`;
const qx = i => i.qty !== 1 ? `×${num(i.qty)}` : '';

function totals(items) {
  let g = 0, ml = 0, gMiss = 0;
  items.forEach(i => { if (i.g != null) g += i.g * i.qty; else gMiss++; if (i.ml != null) ml += i.ml * i.qty; });
  return { g, ml, gMiss };
}
const limitOn = b => tripInfo().plane && b.kg;
function bagWarns(bag, items) {
  return limitOn(bag) && totals(items).g / 1000 > bag.kg ? [`Nặng hơn giới hạn ${num(bag.kg)} kg.`] : [];
}
function chip(i) {
  const tip = [`${num(i.qty)} ${i.unit}`, i.note, i.g != null ? `${num(i.g)} g/đơn vị` : '', i.ml != null ? `${num(i.ml)} ml/đơn vị` : ''].filter(Boolean).join('. ');
  return `<li class="hl-it" data-id="${i.id}">
    <span class="grip" aria-hidden="true">⠿</span>
    <span class="body" role="button" tabindex="0" title="${esc(tip)}" aria-label="${esc(i.name)}, ${num(i.qty)} ${esc(i.unit)}. Bấm để sửa hoặc chuyển chỗ"><b>${esc(i.name)}</b>${i.qty !== 1 ? `<small>${num(i.qty)}</small>` : ''}</span></li>`;
}
function renderBags() {
  const box = $('#hlBags'), editing = new Set($$('.hl-bag.edit', box).map(b => b.dataset.loc)), plane = tripInfo().plane;
  const allWarns = [];
  box.innerHTML = state.bags.map(b => {
    const items = state.items.filter(i => i.loc === b.id), tt = totals(items), warns = bagWarns(b, items);
    warns.forEach(w => allWarns.push(`${b.name}: ${w}`));
    const pct = limitOn(b) ? tt.g / 1000 / b.kg : 0;
    const bw = Math.round(1 + Math.min(pct, 1.25) * 4);   // viền 1 px (trống) → 5 px (đầy) → 6 px (quá tải)
    const meta = [`${items.length} món`];
    if (tt.g || limitOn(b)) meta.push(`${tt.gMiss && tt.g ? '≥ ' : ''}${num(tt.g / 1000)}${limitOn(b) ? ' / ' + num(b.kg) : ''} kg`);
    if (tt.ml) meta.push(`${num(tt.ml / 1000)} L`);
    return `<div class="hl-bag${editing.has(b.id) && plane ? ' edit' : ''}${pct > 1 ? ' over' : ''}" data-loc="${b.id}" style="--bw:${bw}px">
      <div class="hl-bag-head">${icon(b.type)}<input class="nm" value="${esc(b.name)}" aria-label="Tên đồ chứa (sửa được)" title="Bấm để đổi tên">
        ${plane ? '<button type="button" class="hl-mini" data-bag-edit title="Khối lượng tối đa khi đi máy bay">kg</button>' : ''}
        <button type="button" class="hl-mini x" data-bag-del aria-label="Xóa ${esc(b.name)}">✕</button></div>
      <div class="hl-cap"><label>Tối đa <input type="number" min="0" step="any" data-cap="kg" value="${b.kg ?? ''}" placeholder="vd. 7"> kg</label></div>
      <div class="hl-bag-meta">${meta.map(esc).join('<span aria-hidden="true"> </span>')}</div>
      <ul class="hl-items">${items.map(chip).join('') || '<li class="hl-empty">Kéo món vào đây.</li>'}</ul>
      ${warns.length ? `<ul class="hl-warns">${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    </div>`;
  }).join('') || '<p class="hl-empty">Chưa có đồ chứa nào. Chọn loại ở trên rồi bấm dấu +.</p>';
  for (const z of ['pool', 'skip']) {
    const items = state.items.filter(i => i.loc === z), el = z === 'pool' ? $('#hlPool') : $('#hlSkip');
    $('.hl-items', el).innerHTML = items.map(chip).join('') || `<li class="hl-empty">${z === 'pool' ? 'Món tạo nhanh hoặc chưa có chỗ sẽ nằm ở đây.' : 'Kéo vào đây những món quyết định không mang.'}</li>`;
    $(z === 'pool' ? '#hlPoolN' : '#hlSkipN').textContent = items.length ? `${items.length} món` : '';
  }
  const al = $('#hlAlerts');
  al.hidden = !allWarns.length;
  al.innerHTML = allWarns.length ? `<b>Cần xem lại</b><ul>${allWarns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  $('#hlQuickTo').innerHTML = `<option value="pool">Vào: Chưa xếp</option>` + state.bags.map(b => `<option value="${b.id}">Vào: ${esc(b.name)}</option>`).join('');
  $('#hlUndo').disabled = !hist.length;
}
function renderAll() { renderTrip(); renderSugg(); renderBags(); }
function addBag(type) {
  const base = D.CONTAINERS[type].name, n = state.bags.filter(b => b.type === type).length;
  act(() => {
    const b = mkBag(type, nid('b'), n ? `${base} ${n + 1}` : base); state.bags.push(b);
    if (type === 'suitcase') {   // vali mới: tự thêm đồ làm dấu vali
      const d = itemDef['lug-mark'], first = !state.items.some(i => i.key === 'lug-mark');
      state.items.push({ id: nid('i'), key: first ? d.id : null, name: d.name, qty: 1, unit: d.unit, g: d.g, ml: null, cat: d.cat, note: '', loc: b.id });
    }
  });
}

/* ---------------- di chuyển ---------------- */
const b0name = id => (state.bags.find(b => b.id === id) || {}).name || 'đồ chứa này';
function moveItems(ids, loc) {
  const set = new Set(ids);
  if (!state.items.some(i => set.has(i.id) && i.loc !== loc)) return;
  act(() => state.items.forEach(i => { if (set.has(i.id)) i.loc = loc; }));
}

/* ---------------- kéo thả (chuột + cảm ứng, pointer events) ---------------- */
let drag = null, justDragged = false;
function onDown(e) {
  if (e.button > 0) return;
  const it = e.target.closest('.hl-it'), row = e.target.closest('.hl-srow:not(.added)');
  if (!it && !row) return;
  if (e.target.closest('button, input')) return;
  const touch = e.pointerType !== 'mouse';
  if (it && touch && !e.target.closest('.grip')) return;   // cảm ứng: kéo bằng tay cầm ⠿, còn lại để cuộn trang
  if (row && touch) return;                                // cảm ứng: dùng nút + cho gợi ý
  drag = { x: e.clientX, y: e.clientY, id: it?.dataset.id, key: row?.dataset.key, started: false, pid: e.pointerId, over: null };
  if (touch) e.preventDefault();
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.started = true;
    let label;
    if (drag.id) {
      drag.ids = [drag.id];
      label = state.items.find(i => i.id === drag.id).name;
    } else label = nameOf(itemDef[drag.key]);
    drag.ghost = Object.assign(document.createElement('div'), { className: 'hl-ghost', textContent: label });
    document.body.append(drag.ghost); document.body.classList.add('hl-dragging');
  }
  e.preventDefault();
  drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
  const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-loc]');
  if (t !== drag.over) { drag.over?.classList.remove('drop'); t?.classList.add('drop'); drag.over = t; }
  const edge = 70, vy = e.clientY < edge ? -12 : e.clientY > innerHeight - edge ? 12 : 0;
  if (vy) scrollBy(0, vy);
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag; drag = null;
  if (!d.started) return;
  d.ghost.remove(); document.body.classList.remove('hl-dragging'); d.over?.classList.remove('drop');
  justDragged = true; setTimeout(() => { justDragged = false; }, 50);
  if (!d.over) return;
  const loc = d.over.dataset.loc;
  if (d.ids) moveItems(d.ids, loc); else addSugg([d.key], loc);
}

/* ---------------- tạo nhanh ---------------- */
function parseQuick(text) {
  const out = [];
  for (let s of text.split(/[;\n]+/)) {
    s = s.trim(); if (!s) continue;
    let g = null, ml = null, qty = 1, unit = null, name;
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)(?![\p{L}\d])/giu, (m, n, u) => {
      const v = pf(n); u = u.toLowerCase();
      if (u === 'kg') g = v * 1000; else if (u === 'g') g = v; else if (u === 'ml') ml = v; else ml = v * 1000;
      return ' ';
    }).replace(/\s+/g, ' ').trim();
    let m;
    if ((m = s.match(/^(.+?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(\S+)?$/i))) { name = m[1]; qty = pf(m[2]); unit = m[3] || null; }
    else if ((m = s.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/))) { qty = pf(m[1]); name = m[2]; }
    else if ((m = s.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*([^\d]{1,15})?$/))) { name = m[1]; qty = pf(m[2]); unit = m[3] ? m[3].trim() : null; }
    else name = s;
    name = name.trim(); if (!name) continue;
    const def = D.ITEMS.find(d => nameOf(d).toLowerCase() === name.toLowerCase());
    out.push({ name: def ? nameOf(def) : name.charAt(0).toUpperCase() + name.slice(1), qty: qty || 1, unit: unit || (def && val(def.unit, tripInfo())) || 'cái',
      g: g ?? def?.g ?? null, ml: ml ?? def?.ml ?? null, cat: def?.cat || 'misc', key: def?.id || null });
  }
  return out;
}
function quickAdd() {
  const ta = $('#hlQuick'), list = parseQuick(ta.value), loc = $('#hlQuickTo').value;
  if (!list.length) { toast('Gõ tên món, ngăn cách bằng dấu chấm phẩy.'); return; }
  const done = addedKeys();
  act(() => list.forEach(p => state.items.push({ id: nid('i'), key: p.key && !done.has(p.key) ? p.key : null, name: p.name, qty: p.qty, unit: p.unit,
    g: p.g, ml: p.ml, cat: p.cat, note: '', loc })));
  ta.value = ''; toast(`Đã thêm ${list.length} món.`);
}

/* ---------------- hộp thoại sửa món ---------------- */
let editing = null;
function openEdit(id) {
  const i = state.items.find(x => x.id === id); if (!i) return;
  editing = id; const f = $('#hlDlgForm');
  f.nm.value = i.name; f.qty.value = i.qty; f.unit.value = i.unit; f.g.value = i.g ?? ''; f.ml.value = i.ml ?? '';
  f.loc.innerHTML = [...state.bags.map(b => [b.id, b.name]), ['pool', 'Chưa xếp'], ['skip', 'Không mang']].map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
  f.cat.value = i.cat; f.note.value = i.note; f.loc.value = i.loc;
  $('#hlDlg').showModal(); f.nm.focus();
}
function saveEdit(e) {
  e.preventDefault();
  const f = $('#hlDlgForm'), id = editing; if (!f.nm.value.trim()) return;
  act(() => { const i = state.items.find(x => x.id === id); if (!i) return;
    Object.assign(i, { name: f.nm.value.trim(), qty: pf(f.qty.value) ?? 1, unit: f.unit.value.trim() || 'cái', g: pf(f.g.value), ml: pf(f.ml.value),
      cat: f.cat.value, note: f.note.value.trim(), loc: f.loc.value }); });
  $('#hlDlg').close();
}

/* ---------------- xuất / nhập ---------------- */
const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
function download(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function saveJson() {
  const data = { app: 'hanh-ly', v: 3, saved: new Date().toISOString(), trip: state.trip, bags: state.bags, items: state.items, seq: state.seq };
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `hanh-ly-${stamp()}.json`);
}
function loadJson(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let s; try { s = JSON.parse(rd.result); } catch (e) { toast('File không đọc được: không phải JSON hợp lệ.'); return; }
    if (s.app !== 'hanh-ly') { toast('File này không phải file dữ liệu của trang Xếp hành lý.'); return; }
    const ok = sanitize(s); if (!ok) { toast('File thiếu dữ liệu đồ chứa hoặc vật dụng.'); return; }
    if (state.items.length && !confirm('Thay toàn bộ hành lý hiện tại bằng nội dung trong file?')) return;
    act(() => { state.bags = ok.bags; state.items = ok.items; state.seq = ok.seq; state.trip = ok.trip; });
    renderAll(); toast(`Đã mở: ${ok.items.length} món, ${ok.bags.length} đồ chứa.`);
  };
  rd.readAsText(file);
}


/* nội dung chung cho checklist */
function checklistData() {
  const t = tripInfo(), r = state.trip;
  const P = { city: 'thành thị', rural: 'nông thôn', beach: 'biển', mountain: 'núi' };
  const meta = [
    [t.plane && 'máy bay', t.ground && 'xe'].filter(Boolean).join(', '),
    r.place.map(p => P[p]).join(', '),
    `${r.tmin}–${r.tmax} °C, độ ẩm ${r.hmin}–${r.hmax} %${t.rain ? ', mưa' : ''}${t.snow ? ', tuyết' : ''}`,
  ].filter(Boolean);
  const per = pf(r.perDay);
  if (per) meta.push(`tiền mặt ${num(per)} ${r.cur}/ngày`.replace(' /', '/'));
  const groups = state.bags.map(b => { const items = state.items.filter(i => i.loc === b.id); return { bag: b, name: b.name, items, warns: bagWarns(b, items) }; })
    .filter(g => g.items.length);
  return { title: `Xếp hành lý: ${t.intl ? 'nước ngoài' : 'trong nước'}, ${t.long ? 'trên 3' : t.real} ngày`, meta: (m => m.charAt(0).toUpperCase() + m.slice(1))(meta.join('. ')), groups };
}
const weightText = items => { const tt = totals(items); return tt.g ? `${tt.gMiss ? '≥ ' : ''}${num(tt.g / 1000)} kg` : ''; };
const lineOf = i => `${i.name}${qx(i) ? ' ' + qx(i) : ''}`;

const madeAt = () => { const d = new Date(), p = n => String(n).padStart(2, '0');
  return `Checklist được tạo vào ${p(d.getHours())}:${p(d.getMinutes())} ngày ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; };
const BLANKS = ['Họ tên', 'Ngày xuất phát', 'Nơi đến'];   // các dòng để trống dưới tiêu đề, người dùng tự điền tay

/* --- PDF qua hộp thoại In: checklist hai cột + sơ đồ hành lý --- */
function printPdf() {
  const c = checklistData();
  if (!c.groups.length) { toast('Chưa có món nào trong đồ chứa.'); return; }
  $('#hlPrint').innerHTML = `<h1>Checklist hành lý</h1><div class="blanks">${BLANKS.map(b => `<p>${b}:<span></span></p>`).join('')}</div>` +
    c.groups.map(g => `<h2>${esc(g.name)} <small>${esc([`${g.items.length} món`, weightText(g.items)].filter(Boolean).join(', '))}</small></h2>
      <ul class="ck">${g.items.map(i => `<li>${esc(lineOf(i))}</li>`).join('')}</ul>${g.warns.map(w => `<p class="warn">⚠ ${esc(w)}</p>`).join('')}`).join('') +
    `<section class="map"><h2>Sơ đồ hành lý</h2><div class="bags">${c.groups.map(g =>
      `<div class="bag"><b class="t">${icon(g.bag.type)}${esc(g.name)}</b><div class="cells">${g.items.map(i => `<span>${esc(lineOf(i))}</span>`).join('')}</div></div>`).join('')}</div></section>` +
    `<p class="foot">${madeAt()}</p>`;
  document.body.classList.add('hl-printing');
  const done = () => { document.body.classList.remove('hl-printing'); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}

/* --- DOCX: XML WordprocessingML + ZIP không nén --- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  for (const [name, text] of files) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nb, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), nb);
    off += 30 + nb.length + data.length;
  }
  const csize = central.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function makeDocx() {
  const c = checklistData();
  if (!c.groups.length) { toast('Chưa có món nào trong đồ chứa.'); return; }
  const x = s => esc(s).replace(/&#39;/g, '&apos;');
  const run = (text, o = {}) => `<w:r><w:rPr>${o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}" w:cs="${o.font}"/>` : ''}${o.b ? '<w:b/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}${o.sz ? `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
  const para = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 60}" w:line="${o.line ?? 300}" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  const box = '☐ ';
  const W = 9638, half = W / 2;   // bề rộng vùng chữ A4, lề 2 cm (twip)
  const blank = label => `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:leader="underscore" w:pos="${W}"/></w:tabs><w:spacing w:before="0" w:after="120"/></w:pPr>${run(label + ':')}<w:r><w:tab/></w:r></w:p>`;
  const cell = inner => `<w:tc><w:tcPr><w:tcW w:w="${half}" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
  const grid2 = items => {   // bảng 2 cột không viền: mỗi ô một món
    const rows = []; for (let k = 0; k < items.length; k += 2) rows.push(items.slice(k, k + 2));
    const one = i => i ? para(run(box, { font: 'Segoe UI Symbol', sz: 22 }) + run(lineOf(i)), { after: 20 }) : para('', { after: 20 });
    return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${half}"/><w:gridCol w:w="${half}"/></w:tblGrid>` +
      rows.map(rw => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(one(rw[0]))}${cell(one(rw[1]))}</w:tr>`).join('') + '</w:tbl>';
  };
  let body = para(run('Checklist hành lý', { b: true, sz: 32 }), { after: 160 }) + BLANKS.map(blank).join('');
  for (const g of c.groups) {
    const wt = weightText(g.items);
    body += para(run(g.name, { b: true, sz: 24 }) + run(`   ${g.items.length} món${wt ? ', ' + wt : ''}`, { color: '666666', sz: 18 }), { before: 200, after: 40, keep: true });
    body += grid2(g.items);
    g.warns.forEach(w => { body += para(run('⚠ ' + w, { color: 'B4321F', sz: 18 }), { after: 0 }); });
  }
  body += para(run(madeAt(), { color: '888888', sz: 16 }), { before: 280 });
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['word/document.xml', doc],
    ['word/styles.xml', styles],
  ];
  download(zip(files), `checklist-hanh-ly-${stamp()}.docx`);
}

/* ---------------- tiện ích ---------------- */
let toastT;
function toast(msg) {
  let el = $('.hl-toast'); if (!el) { el = Object.assign(document.createElement('div'), { className: 'hl-toast', role: 'status' }); document.body.append(el); }
  el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2600);
}


/* ---------------- sự kiện ---------------- */
function bind() {
  const setTrip = fn => { fn(state.trip); save(); renderAll(); };
  $$('.hl-seg[data-key]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = seg.dataset.key, v = b.dataset.v;
    setTrip(r => {
      if (seg.hasAttribute('data-single')) {
        r[k] = v;
        if (k === 'scope' && !r.transportTouched) r.transport = v === 'intl' ? ['plane'] : ['ground'];
      } else { const a = r[k]; r[k] = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; if (k === 'transport') r.transportTouched = true; }
    });
  }));
  $$('.hl-stepper [data-step]').forEach(b => b.addEventListener('click', () => setTrip(r => { r.days = clamp(r.days + +b.dataset.step, 1, 4); })));
  const r2 = (lo, hi, kmin, kmax) => {
    const f = which => e => setTrip(r => { const v = +e.target.value; if (which) r[kmax] = Math.max(v, r[kmin]); else r[kmin] = Math.min(v, r[kmax]); r.wxSrc = ''; });
    $(lo).addEventListener('input', f(0)); $(hi).addEventListener('input', f(1));
  };
  r2('#hlTmin', '#hlTmax', 'tmin', 'tmax'); r2('#hlHmin', '#hlHmax', 'hmin', 'hmax');
  $$('.hl-wtabs [role=tab]').forEach(b => b.addEventListener('click', () => { wtab = b.dataset.wtab; renderTrip(); }));
  $('#hlGeo').addEventListener('click', geoWeather);
  $('#hlPerDay').addEventListener('input', e => { state.trip.perDay = e.target.value; save(); renderTrip(); });
  $('#hlCur').addEventListener('input', e => { state.trip.cur = e.target.value.trim().toUpperCase().slice(0, 6); save(); renderTrip(); });

  $$('.hl-tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderSugg(); }));
  $('#hlSugg').addEventListener('click', e => { const b = e.target.closest('.hl-add'); if (b) addSugg([b.closest('.hl-srow').dataset.key]); });
  $('#hlAddAll').addEventListener('click', () => addSugg(suggestions()[tab].map(s => s.d.id)));
  $('#hlQuickBtn').addEventListener('click', quickAdd);
  $('#hlQuick').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); quickAdd(); } });

  $('#hlNewBag').addEventListener('click', () => addBag($('#hlNewType').value));
  $('#hlUndo').addEventListener('click', undo);

  ROOT.addEventListener('click', e => {
    if (justDragged) return;
    const body = e.target.closest('.hl-it .body');
    if (body) { openEdit(body.closest('.hl-it').dataset.id); return; }
    const bag = e.target.closest('.hl-bag');
    if (bag && e.target.closest('[data-bag-edit]')) { bag.classList.toggle('edit'); return; }
    if (bag && e.target.closest('[data-bag-del]')) {
      const id = bag.dataset.loc, n = state.items.filter(i => i.loc === id).length;
      if (n && !confirm(`Xóa ${b0name(id)}? ${n} món bên trong sẽ chuyển về "Chưa xếp".`)) return;
      act(() => { state.bags = state.bags.filter(b => b.id !== id); state.items.forEach(i => { if (i.loc === id) i.loc = 'pool'; }); });
    }
  });
  ROOT.addEventListener('keydown', e => {
    const body = e.target.closest('.hl-it .body');
    if (body && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); body.click(); }
  });
  ROOT.addEventListener('change', e => {
    const bag = e.target.closest('.hl-bag'); if (!bag) return;
    const b = state.bags.find(x => x.id === bag.dataset.loc); if (!b) return;
    if (e.target.matches('input.nm')) { const v = e.target.value.trim(); if (v && v !== b.name) act(() => { b.name = v.slice(0, 60); }); else e.target.value = b.name; }
    if (e.target.matches('[data-cap]')) act(() => { b[e.target.dataset.cap] = pf(e.target.value); });
  });
  ROOT.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: false });
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);

  $('#hlDlgForm').addEventListener('submit', saveEdit);
  $('#hlDlgCancel').addEventListener('click', () => $('#hlDlg').close());
  $('#hlDlgDel').addEventListener('click', () => { const id = editing; act(() => { state.items = state.items.filter(i => i.id !== id); }); $('#hlDlg').close(); });

  $('#hlDocx').addEventListener('click', makeDocx);
  $('#hlPdf').addEventListener('click', printPdf);
  $('#hlSave').addEventListener('click', saveJson);
  $('#hlLoad').addEventListener('click', () => $('#hlFile').click());
  $('#hlFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadJson(f); e.target.value = ''; });
  $('#hlReset').addEventListener('click', () => {
    if (!confirm('Xóa hết đồ chứa, vật dụng và đưa các lựa chọn về mặc định?')) return;
    act(() => { const home = state.trip.home, cur = state.trip.cur; state.trip = DEF_TRIP(); state.trip.home = home; state.trip.cur = cur;
      state.bags = DEF_BAGS(); state.items = []; state.seq = 3; prefill(); });
    state.fresh = true; save(); autoDefaults();
  });
  document.addEventListener('keydown', e => {
    const typing = e.target.closest('input, textarea, select');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); undo(); }
  });
}

fillSelects(); bind();
if (firstRun) { const g = guessPlace(); state.trip.home = g.country; state.trip.cur = g.cur; prefill(); }
renderAll();
if (firstRun) autoDefaults();
window.HL = { state: () => state, parseQuick };   // để kiểm thử từ console
})();
