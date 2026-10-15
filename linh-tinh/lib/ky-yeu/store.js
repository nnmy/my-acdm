/* =====================================================================
   Lưu trữ trên máy: IndexedDB của trình duyệt (dung lượng lớn hơn localStorage nhiều, đủ cho ảnh).
   - kho "state": một bản ghi duy nhất (key "main") chứa toàn bộ dữ liệu chữ.
   - kho "photos": ảnh dạng Blob, key = mã ảnh.
   Dữ liệu chỉ nằm trong trình duyệt của máy này; không có đoạn code nào gửi dữ liệu ra ngoài.
   ===================================================================== */
(() => {
  'use strict';
  const DB = 'ky-yeu', VER = 1;
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('state')) d.createObjectStore('state');
        if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then(v => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  window.KStore = {
    getState: () => tx('state', 'readonly', s => req(s.get('main'))),
    putState: v => tx('state', 'readwrite', s => { s.put(v, 'main'); }),
    getPhoto: id => tx('photos', 'readonly', s => req(s.get(id))),
    putPhoto: (id, blob) => tx('photos', 'readwrite', s => { s.put(blob, id); }),
    delPhoto: id => tx('photos', 'readwrite', s => { s.delete(id); }),
    photoKeys: () => tx('photos', 'readonly', s => req(s.getAllKeys())),
    clearAll: () => Promise.all([tx('state', 'readwrite', s => { s.clear(); }), tx('photos', 'readwrite', s => { s.clear(); })]),
  };
})();
