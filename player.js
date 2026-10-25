import db from './db.js';
import { SHAPES, esc, ranking } from './ui.js';

const $ = id => document.getElementById(id);
const showScreen = id => document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });

let pin = null, pid = null, state = null, players = {}, me = null;
let myAnswer = null, answerQ = null, unsubAnswer = null, unsubs = [], viewKey = '';

const store = {
  get: p => { try { return JSON.parse(localStorage.getItem('kq-player-' + p)); } catch { return null; } },
  set: (p, v) => { try { localStorage.setItem('kq-player-' + p, JSON.stringify(v)); } catch {} },
  del: p => { try { localStorage.removeItem('kq-player-' + p); } catch {} },
};

// --- Rejoindre ---
async function init() {
  if (db.mode === 'local') $('mode-banner').hidden = false;
  const urlPin = new URLSearchParams(location.search).get('pin');
  if (!urlPin) return;
  $('pin-input').value = urlPin;
  const saved = store.get(urlPin);
  if (saved && await db.get(`games/${urlPin}/players/${saved.pid}`)) return enter(urlPin, saved.pid);
  checkPin(urlPin);
}

async function checkPin(value) {
  const p = value.replace(/\D/g, '');
  $('pin-error').textContent = '';
  if (p.length !== 6) { $('pin-error').textContent = 'Le PIN fait 6 chiffres.'; return; }
  const st = await db.get(`games/${p}/state`);
  if (!st) { $('pin-error').textContent = 'PIN introuvable. Vérifie sur l\'écran.'; return; }
  pin = p;
  $('pin-form').hidden = true;
  $('name-form').hidden = false;
  $('name-input').focus();
}

async function join(name) {
  name = name.trim().replace(/\s+/g, ' ');
  $('name-error').textContent = '';
  if (!name) { $('name-error').textContent = 'Choisis un pseudo.'; return; }
  const existing = (await db.get(`games/${pin}/players`)) || {};
  if (Object.values(existing).some(p => p.name.toLowerCase() === name.toLowerCase())) {
    $('name-error').textContent = 'Ce pseudo est déjà pris.'; return;
  }
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  await db.set(`games/${pin}/players/${id}`, { name, score: 0, streak: 0, joinedAt: db.now() });
  store.set(pin, { pid: id });
  enter(pin, id);
}

function enter(p, id) {
  pin = p; pid = id;
  history.replaceState(null, '', `?pin=${pin}`);
  showScreen('play');
  unsubs = [
    db.on(`games/${pin}/state`, v => { state = v; onState(); }),
    db.on(`games/${pin}/players`, v => {
      players = v || {};
      me = players[pid] || null;
      if (!me) return kicked();
      render();
    }),
  ];
  setInterval(render, 250);
}

function kicked() {
  unsubs.forEach(u => u());
  unsubAnswer?.();
  store.del(pin);
  location.replace(location.pathname + '?kicked=1');
}

function onState() {
  if (!state) return;
  if (state.q !== answerQ) {
    unsubAnswer?.();
    answerQ = state.q;
    myAnswer = null;
    if (state.q >= 0) {
      unsubAnswer = db.on(`games/${pin}/answers/${state.q}/${pid}`, v => { if (v) { myAnswer = v; render(); } });
    }
  }
  render();
}

async function answer(i) {
  if (myAnswer || state?.phase !== 'question') return;
  myAnswer = { c: i };
  navigator.vibrate?.(40);
  render();
  await db.set(`games/${pin}/answers/${state.q}/${pid}`, { c: i, at: db.now() });
}

// --- Affichage ---
function render() {
  if (!state || !me) return;
  const now = db.now();
  const r = ranking(players);
  const rank = r.findIndex(p => p.id === pid) + 1;
  let sub = state.phase;
  if (state.phase === 'question') {
    sub = now < state.startAt ? 'intro'
      : myAnswer ? 'answered'
      : now >= state.startAt + state.duration ? 'timeout' : 'answer';
  }
  const key = [sub, state.q, me.score, rank, me.last?.q, r.length].join('|');
  if (key === viewKey) return;
  viewKey = key;

  $('p-name').textContent = me.name;
  $('p-score').textContent = me.score || 0;
  $('p-qnum').textContent = state.q >= 0 ? `Question ${state.q + 1}` : 'Salle d\'attente';
  $('p-streak').textContent = me.streak > 1 ? `🔥 ${me.streak}` : '';

  const body = $('p-body');
  const play = $('play');
  play.className = 'screen';
  const msg = (title, text = '', extra = '') =>
    `<div class="p-msg"><div class="p-title">${title}</div>${text ? `<p>${text}</p>` : ''}${extra}</div>`;
  const behind = () => {
    if (rank <= 1) return 'Tu es en tête ! 👑';
    const prev = r[rank - 2];
    return `à ${(prev.score || 0) - (me.score || 0)} pts de ${esc(prev.name)}`;
  };

  switch (sub) {
    case 'lobby':
      body.innerHTML = msg('Tu es dans la partie !', 'Ton pseudo apparaît sur l\'écran.<br>Le quiz va bientôt commencer…', '<div class="spinner"></div>');
      break;
    case 'intro':
      body.innerHTML = msg(`Question ${state.q + 1}`, 'Prépare-toi…', '<div class="spinner"></div>');
      break;
    case 'answer':
      body.innerHTML = `<div class="pad n${state.n || 4}">${Array.from({ length: state.n || 4 }, (_, i) =>
        `<button class="pad-btn c${i}" data-i="${i}" aria-label="Réponse ${i + 1}">${SHAPES[i]}</button>`).join('')}</div>`;
      break;
    case 'answered':
      body.innerHTML = msg('Réponse envoyée !', 'Tu as été assez rapide ?', `<div class="pad-mini c${myAnswer.c}">${SHAPES[myAnswer.c]}</div>`);
      break;
    case 'timeout':
      body.innerHTML = msg('Temps écoulé ⏰', 'Trop tard pour celle-là !');
      break;
    case 'reveal': {
      const last = me.last?.q === state.q ? me.last : { answered: false, correct: false, points: 0 };
      play.classList.add(last.correct ? 'good' : 'bad');
      body.innerHTML = last.correct
        ? msg('Bonne réponse', '', `<div class="p-big">✔</div><div class="p-points">+ ${last.points}</div>${me.streak > 1 ? `<p>🔥 Série de ${me.streak} !</p>` : ''}<p class="p-rank">${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup> · ${behind()}</p>`)
        : msg(last.answered ? 'Raté !' : 'Pas de réponse', '', `<div class="p-big">✖</div><p>${last.answered ? 'Ça arrive aux meilleurs…' : 'Sois plus rapide la prochaine fois !'}</p><p class="p-rank">${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup> · ${behind()}</p>`);
      break;
    }
    case 'scores':
      body.innerHTML = msg(`${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup> sur ${r.length}`, behind(), `<div class="p-points">${me.score || 0} pts</div>`);
      break;
    case 'end':
      body.innerHTML = rank <= 3
        ? msg(['🥇', '🥈', '🥉'][rank - 1], `Bravo, tu termines <b>${rank}<sup>${rank === 1 ? 'er' : 'e'}</sup></b> !`, `<div class="p-points">${me.score || 0} pts</div>`)
        : msg('Fin du quiz !', `Tu termines ${rank}<sup>e</sup> sur ${r.length}.`, `<div class="p-points">${me.score || 0} pts</div>`);
      break;
  }
}

$('pin-form').onsubmit = e => { e.preventDefault(); checkPin($('pin-input').value); };
$('name-form').onsubmit = e => { e.preventDefault(); join($('name-input').value); };
$('p-body').onclick = e => { const b = e.target.closest('.pad-btn'); if (b) answer(Number(b.dataset.i)); };
if (new URLSearchParams(location.search).has('kicked')) $('pin-error').textContent = 'Tu as été retiré de la partie.';

init();
