// Petite couche d'accès aux données : Firebase Realtime Database si configuré,
// sinon un faux serveur dans le localStorage (synchronisé entre onglets) pour tester.
import { FIREBASE_CONFIG } from './config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
let api;

if (FIREBASE_CONFIG.databaseURL) {
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const fdb = await import(`${SDK}/firebase-database.js`);
  const db = fdb.getDatabase(initializeApp(FIREBASE_CONFIG));
  const r = p => fdb.ref(db, p);
  let offset = 0;
  fdb.onValue(r('.info/serverTimeOffset'), s => { offset = s.val() || 0; });

  api = {
    mode: 'firebase',
    set: (p, v) => fdb.set(r(p), v),
    update: (p, v) => fdb.update(r(p), v),
    get: async p => (await fdb.get(r(p))).val(),
    on: (p, cb) => fdb.onValue(r(p), s => cb(s.val())),
    now: () => Date.now() + offset,
  };
} else {
  const KEY = 'kq-local-db';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const parts = p => p.split('/').filter(Boolean);
  const getAt = (t, p) => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), t);
  const setAt = (t, p, v) => {
    const ks = parts(p);
    if (!ks.length) return v ?? {};
    let o = t;
    for (const k of ks.slice(0, -1)) {
      if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
      o = o[k];
    }
    if (v == null) delete o[ks.at(-1)];
    else o[ks.at(-1)] = JSON.parse(JSON.stringify(v));
    return t;
  };
  const listeners = new Set();
  const notify = () => { const t = read(); listeners.forEach(l => l(t)); };
  const write = t => { localStorage.setItem(KEY, JSON.stringify(t)); notify(); };
  window.addEventListener('storage', e => { if (e.key === KEY) notify(); });

  api = {
    mode: 'local',
    set: async (p, v) => write(setAt(read(), p, v)),
    update: async (p, obj) => {
      let t = read();
      for (const [k, v] of Object.entries(obj)) t = setAt(t, `${p}/${k}`, v);
      write(t);
    },
    get: async p => getAt(read(), p) ?? null,
    on: (p, cb) => {
      let last;
      const l = t => {
        const s = JSON.stringify(getAt(t, p) ?? null);
        if (s !== last) { last = s; cb(JSON.parse(s)); }
      };
      listeners.add(l);
      queueMicrotask(() => l(read()));
      return () => listeners.delete(l);
    },
    now: () => Date.now(),
  };
}

export default api;
