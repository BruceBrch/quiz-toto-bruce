import db from './db.js';
import { QUIZ } from './questions.js';
import { SHAPES, REACTIONS, esc, ranking, teamStats, losers } from './ui.js';

const $ = id => document.getElementById(id);
const showScreen = id => document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
const TEAMS = QUIZ.teams;
const sup = n => `${n}<sup>${n === 1 ? 'er' : 'e'}</sup>`;

let pin = null, pid = null, pendingName = null, state = null, players = {}, me = null;
let myAnswer = null, answerQ = null, unsubAnswer = null, unsubs = [], viewKey = '', lastReact = 0;

const store = {
  get: p => { try { return JSON.parse(localStorage.getItem('kq-player-' + p)); } catch { return null; } },
  set: (p, v) => { try { localStorage.setItem('kq-player-' + p, JSON.stringify(v)); } catch {} },
  del: p => { try { localStorage.removeItem('kq-player-' + p); } catch {} },
};

// --- Rejoindre : PIN → pseudo → équipe ---
async function init() {
  if (db.mode === 'local') $('mode-banner').hidden = false;
  $('team-buttons').innerHTML = TEAMS.map(t =>
    `<button class="team-btn" style="--team:${t.color}" data-team="${t.id}">${esc(t.name)}</button>`).join('');
  $('react-bar').innerHTML = REACTIONS.map(e => `<button class="react-btn" data-e="${e}">${e}</button>`).join('');
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

async function nameTaken(name) {
  const existing = (await db.get(`games/${pin}/players`)) || {};
  return Object.values(existing).some(p => p.name.toLowerCase() === name.toLowerCase());
}

async function chooseName(name) {
  name = name.trim().replace(/\s+/g, ' ');
  $('name-error').textContent = '';
  if (!name) { $('name-error').textContent = 'Choisis un pseudo.'; return; }
  if (await nameTaken(name)) { $('name-error').textContent = 'Ce pseudo est déjà pris.'; return; }
  pendingName = name;
  $('name-form').hidden = true;
  $('team-pick').hidden = false;
}

async function join(team) {
  if (await nameTaken(pendingName)) {
    $('team-pick').hidden = true;
    $('name-form').hidden = false;
    $('name-error').textContent = 'Ce pseudo vient d\'être pris, choisis-en un autre.';
    return;
  }
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  await db.set(`games/${pin}/players/${id}`, { name: pendingName, team, score: 0, streak: 0, joinedAt: db.now() });
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

function react(e, btn) {
  const now = Date.now();
  if (now - lastReact < 350) return;
  lastReact = now;
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  db.set(`games/${pin}/reactions/${pid}`, { e, n: now });
}

// --- Affichage ---
function render() {
  if (!state || !me) return;
  const now = db.now();
  const r = ranking(players);
  const rank = r.findIndex(p => p.id === pid) + 1;
  const myTeam = TEAMS.find(t => t.id === me.team);
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
  $('p-team').textContent = myTeam?.name || '';
  $('p-team').style.setProperty('--team', myTeam?.color || '#fff');
  $('react-bar').hidden = sub === 'answer';

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
      body.innerHTML = msg('Tu es dans la partie !', `Bienvenue dans la <b>${esc(myTeam?.name || '')}</b> 💪<br>Le quiz va bientôt commencer…<br><br>Balance des réactions en attendant 👇`);
      break;
    case 'intro':
      body.innerHTML = state.double
        ? msg('⚡ POINTS DOUBLÉS ⚡', 'Dernière question : tout peut encore basculer !', '<div class="p-x2">×2</div>')
        : msg(`Question ${state.q + 1}`, 'Prépare-toi…', '<div class="spinner"></div>');
      if (state.double) play.classList.add('double');
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
      const foot = `<p class="p-rank">${sup(rank)} · ${behind()}</p>`;
      body.innerHTML = last.correct
        ? msg('Bonne réponse', '', `<div class="p-big">✔</div><div class="p-points">+ ${last.points}${state.double ? ' (×2)' : ''}</div>${me.streak > 1 ? `<p>🔥 Série de ${me.streak} !</p>` : ''}${foot}`)
        : msg(last.answered ? 'Raté !' : 'Pas de réponse', '', `<div class="p-big">✖</div><p>${last.answered ? 'Ça arrive aux meilleurs…' : 'Sois plus rapide la prochaine fois !'}</p>${foot}`);
      break;
    }
    case 'scores':
      body.innerHTML = msg(`${sup(rank)} sur ${r.length}`, behind(), `<div class="p-points">${me.score || 0} pts</div>`);
      break;
    case 'losers':
      body.innerHTML = losers(players).some(p => p.id === pid)
        ? msg('Aïe… 🥄', 'Tu es dans le <b>classement des loosers</b> !<br>Assume, tout le monde te regarde 😂')
        : msg('Ouf ! 😅', 'Tu échappes au classement des loosers.<br>Regarde l\'écran…');
      break;
    case 'teams': {
      const [a, b] = teamStats(TEAMS, players);
      const winner = a.avg === b.avg ? null : a.avg > b.avg ? a : b;
      if (!winner) body.innerHTML = msg('🤝 Égalité !', 'Les deux teams sont à égalité parfaite.');
      else if (winner.id === me.team) { play.classList.add('good'); body.innerHTML = msg('🏆 Ta team a gagné !', `Bravo la ${esc(winner.name)} !`); }
      else { play.classList.add('bad'); body.innerHTML = msg('😢 Ta team a perdu…', `La ${esc(winner.name)} l'emporte cette fois.`); }
      break;
    }
    case 'end':
      body.innerHTML = rank <= 3
        ? msg(['🥇', '🥈', '🥉'][rank - 1], `Bravo, tu termines <b>${sup(rank)}</b> !`, `<div class="p-points">${me.score || 0} pts</div>`)
        : msg('Fin du quiz !', `Tu termines ${sup(rank)} sur ${r.length}.`, `<div class="p-points">${me.score || 0} pts</div>`);
      break;
    case 'gift':
      if (rank === 1) { play.classList.add('good'); body.innerHTML = msg('🎁 C\'EST TOI !', 'Tu remportes le <b>cadeau surprise</b> !<br>Va vite le récupérer 🎉', '<div class="p-big">🏆</div>'); }
      else body.innerHTML = msg('🎁 Cadeau surprise !', `<b>${esc(r[0]?.name || '')}</b> remporte le cadeau.<br>Applaudissements ! 👏`);
      break;
  }
}

$('pin-form').onsubmit = e => { e.preventDefault(); checkPin($('pin-input').value); };
$('name-form').onsubmit = e => { e.preventDefault(); chooseName($('name-input').value); };
$('team-buttons').onclick = e => { const b = e.target.closest('.team-btn'); if (b) join(b.dataset.team); };
$('p-body').onclick = e => { const b = e.target.closest('.pad-btn'); if (b) answer(Number(b.dataset.i)); };
$('react-bar').onclick = e => { const b = e.target.closest('.react-btn'); if (b) react(b.dataset.e, b); };
if (new URLSearchParams(location.search).has('kicked')) $('pin-error').textContent = 'Tu as été retiré de la partie.';

init();
