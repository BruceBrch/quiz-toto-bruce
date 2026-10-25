import db from './db.js';
import { QUIZ } from './questions.js';
import { SHAPES, REACTIONS, esc, ranking, teamStats, losers } from './ui.js';

const INTRO_MS = 5000;        // la question s'affiche seule avant les réponses
const DOUBLE_INTRO_MS = 7000; // un peu plus long pour l'annonce des points doublés
const N = QUIZ.questions.length;
const TEAMS = QUIZ.teams;
const $ = id => document.getElementById(id);

let pin, state = null, players = {}, answers = {}, answersQ = null, unsubAnswers = null;
let revealing = false, lastSecond = -1;

const gamePath = p => `games/${pin}${p ? '/' + p : ''}`;
const showScreen = id => document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });

// --- Sons (générés, pas de fichier à charger) ---
const sfx = (() => {
  let ctx;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f, d, type = 'sine', v = 0.15, when = 0) => {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + d);
    } catch { /* pas de son, tant pis */ }
  };
  return {
    unlock: () => { try { ac().resume(); } catch {} },
    tick: () => tone(880, 0.08, 'square', 0.05),
    gong: () => [523, 659, 784].forEach((f, i) => tone(f, 0.6, 'triangle', 0.15, i * 0.1)),
    double: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'square', 0.08, i * 0.09)),
    sad: () => [392, 370, 349, 330].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.35, 'sawtooth', 0.07, i * 0.38)),
    drum: () => { for (let i = 0; i < 18; i++) tone(110 + (i % 2) * 20, 0.08, 'square', 0.06, i * 0.1); },
    fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.15, i * 0.16)),
  };
})();

const party = (ms = 3000) => {
  if (!window.confetti) return;
  const end = Date.now() + ms;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 } });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

// --- Démarrage ---
async function init() {
  if (db.mode === 'local') $('mode-banner').hidden = false;
  pin = sessionStorage.getItem('kq-host-pin');
  if (!pin || !(await db.get(gamePath('state')))) await newGame();
  setupLobby();
  db.on(gamePath('players'), v => { players = v || {}; onPlayers(); });
  db.on(gamePath('state'), v => { state = v; onState(); });
  listenReactions();
  setInterval(tick, 200);
}

async function newGame() {
  pin = String(Math.floor(100000 + Math.random() * 900000));
  sessionStorage.setItem('kq-host-pin', pin);
  await db.set(gamePath(), { state: { phase: 'lobby', q: -1 }, createdAt: db.now() });
}

function setupLobby() {
  const base = new URL('.', location.href).href;
  $('join-url').textContent = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  $('pin').textContent = pin.replace(/(\d{3})(\d{3})/, '$1 $2');
  $('lobby-title').textContent = QUIZ.title;
  $('lobby-sub').textContent = QUIZ.subtitle || '';
  $('team-cols').innerHTML = TEAMS.map(t => `
    <div class="team-col" style="--team:${t.color}" data-team="${t.id}">
      <h3><span>${esc(t.name)}</span><b class="team-count">0</b></h3>
      <div class="team-chips"></div>
    </div>`).join('');
  $('qr').innerHTML = '';
  if (window.QRCode) new QRCode($('qr'), { text: `${base}?pin=${pin}`, width: 168, height: 168 });
}

// --- Réactions emoji : chaque joueur a un « slot » qu'il réécrit, on détecte les changements ---
function listenReactions() {
  const seen = {};
  let ready = false;
  db.on(gamePath('reactions'), v => {
    for (const [id, r] of Object.entries(v || {})) {
      if (ready && r?.n !== seen[id] && REACTIONS.includes(r?.e)) floatReaction(r.e, players[id]);
      seen[id] = r?.n;
    }
    ready = true;
  });
}

function floatReaction(emoji, player) {
  const box = $('reactions');
  if (box.childElementCount > 40) return;
  const el = document.createElement('div');
  el.className = 'float-react';
  el.style.left = `${4 + Math.random() * 88}%`;
  el.style.setProperty('--drift', `${Math.round(Math.random() * 120 - 60)}px`);
  const team = TEAMS.find(t => t.id === player?.team);
  if (team) el.style.setProperty('--team', team.color);
  el.innerHTML = `<span class="fr-emoji"></span><span class="fr-name"></span>`;
  el.firstChild.textContent = emoji;
  el.lastChild.textContent = player?.name || '';
  el.addEventListener('animationend', () => el.remove());
  box.append(el);
}

// --- Réactions aux données ---
function onPlayers() {
  const list = Object.entries(players).map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  $('player-count').textContent = list.length;
  $('start-btn').disabled = list.length === 0;
  // On n'ajoute/retire que les pseudos qui changent, pour que seuls les nouveaux s'animent
  const ids = new Set(list.map(p => p.id));
  document.querySelectorAll('#team-cols .chip').forEach(c => { if (!ids.has(c.dataset.id)) c.remove(); });
  for (const p of list) {
    if (document.querySelector(`#team-cols .chip[data-id="${p.id}"]`)) continue;
    const col = document.querySelector(`.team-col[data-team="${p.team}"]`) || document.querySelector('.team-col');
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.id = p.id;
    chip.textContent = p.name;
    col.querySelector('.team-chips').append(chip);
  }
  for (const t of teamStats(TEAMS, players)) {
    document.querySelector(`.team-col[data-team="${t.id}"] .team-count`).textContent = t.count;
  }
  updateAnswered();
}

function onState() {
  if (!state) return;
  if (state.phase !== 'question') revealing = false;
  if (state.q !== answersQ) {
    unsubAnswers?.();
    answers = {};
    answersQ = state.q;
    if (state.q >= 0) {
      unsubAnswers = db.on(gamePath(`answers/${state.q}`), v => {
        answers = v || {};
        updateAnswered();
        if (state?.phase === 'reveal') renderReveal();
      });
    }
  }
  ({
    lobby: () => showScreen('lobby'),
    question: renderQuestion, reveal: renderReveal, scores: renderScores,
    losers: renderLosers, teams: renderTeams, end: renderEnd, gift: renderGift,
  })[state.phase]?.();
}

const countAnswers = () => Object.keys(answers).filter(id => players[id]).length;
const updateAnswered = () => { $('q-answered').textContent = countAnswers(); };

// --- Écrans ---
function answerTiles(qd, reveal = false) {
  return qd.answers.map((a, i) => `
    <div class="tile c${i} ${reveal ? (i === qd.correct ? 'correct' : 'wrong') : ''}">
      <span class="shape">${SHAPES[i]}</span>
      <span class="label">${esc(a)}</span>
      ${reveal && i === qd.correct ? '<span class="check">✔</span>' : ''}
    </div>`).join('');
}

function renderQuestion() {
  const qd = QUIZ.questions[state.q];
  showScreen('question');
  $('question').classList.toggle('double', !!qd.double);
  $('q-bar').textContent = qd.double ? 'BONUS_X2.EXE' : `QUESTION_${state.q + 1}.EXE`;
  $('q-index').textContent = `${state.q + 1} / ${N}`;
  $('q-text').textContent = qd.q;
  $('q-media').innerHTML = qd.image ? `<img src="${esc(qd.image)}" alt="">` : '';
  $('q-answers').innerHTML = answerTiles(qd);
  $('q-answers').className = `answers n${qd.answers.length}`;
  lastSecond = -1;
  if (qd.double && db.now() < state.startAt) sfx.double();
  tick();
}

function tick() {
  if (state?.phase !== 'question') return;
  const now = db.now();
  const intro = now < state.startAt;
  $('question').classList.toggle('intro', intro);
  if (intro) {
    const total = state.double ? DOUBLE_INTRO_MS : INTRO_MS;
    $('intro-bar').firstElementChild.style.width = `${Math.min(100, 100 * (1 - (state.startAt - now) / total))}%`;
    return;
  }
  const remaining = Math.max(0, Math.ceil((state.startAt + state.duration - now) / 1000));
  $('q-timer').textContent = remaining;
  if (remaining !== lastSecond) {
    if (remaining > 0 && remaining <= 5) sfx.tick();
    lastSecond = remaining;
  }
  const total = Object.keys(players).length;
  if (remaining === 0 || (total > 0 && countAnswers() >= total)) reveal();
}

function renderReveal() {
  const qd = QUIZ.questions[state.q];
  showScreen('reveal');
  $('r-text').textContent = qd.q;
  const counts = qd.answers.map(() => 0);
  for (const a of Object.values(answers)) if (counts[a.c] !== undefined) counts[a.c]++;
  const max = Math.max(1, ...counts);
  $('r-chart').innerHTML = counts.map((n, i) => `
    <div class="bar c${i} ${i === qd.correct ? 'correct' : 'wrong'}">
      <div class="bar-fill" style="height:${4 + 96 * n / max}%"></div>
      <div class="bar-foot"><span class="shape">${SHAPES[i]}</span><b>${n}</b>${i === qd.correct ? '<span>✔</span>' : ''}</div>
    </div>`).join('');
  $('r-answers').innerHTML = answerTiles(qd, true);
  $('r-answers').className = `answers n${qd.answers.length}`;
  $('r-next').textContent = state.q + 1 < N ? 'Suivant' : 'Résultats finaux';
}

function teamBattle() {
  const [a, b] = teamStats(TEAMS, players);
  const sum = a.avg + b.avg;
  const pa = sum ? (100 * a.avg) / sum : 50;
  const side = t => `<div class="battle-side" style="--team:${t.color}"><b>${esc(t.name)}</b><span>${t.avg} pts</span></div>`;
  return `
    <div class="battle">
      ${side(a)}
      <div class="battle-bar">
        <div class="battle-fill" style="width:${pa}%;background:${a.color}"></div>
        <div class="battle-fill" style="width:${100 - pa}%;background:${b.color}"></div>
        <span class="battle-vs">VS</span>
      </div>
      ${side(b)}
    </div>
    <p class="battle-note">moyenne des points par joueur</p>`;
}

function renderScores() {
  showScreen('scores');
  $('s-index').textContent = `${state.q + 1} / ${N}`;
  $('scoreboard').innerHTML = ranking(players).slice(0, 5).map((p, i) => {
    const team = TEAMS.find(t => t.id === p.team);
    return `<li style="--team:${team?.color || '#fff'}"><span class="sb-rank">${i + 1}</span><span class="sb-name">${esc(p.name)}</span><span class="sb-score">${p.score || 0}</span></li>`;
  }).join('');
  $('s-battle').innerHTML = teamBattle();
  const next = QUIZ.questions[state.q + 1];
  $('s-next').textContent = next?.double ? 'Dernière question… ⚡' : 'Question suivante';
}

function renderLosers() {
  showScreen('losers');
  const list = losers(players);
  const titles = ['Mention « peut mieux faire »', 'Vice-roi des loosers', 'Le roi des loosers'];
  const offset = titles.length - list.length;
  // Révélation du 3e pire jusqu'au pire, avec suspense
  $('loser-list').innerHTML = list.map((p, i) => `
    <li class="loser ${i === list.length - 1 ? 'king' : ''}" style="animation-delay:${0.6 + i * 1.8}s">
      <span class="loser-icon">${i === list.length - 1 ? '👑🥄' : '🥄'}</span>
      <span class="loser-name">${esc(p.name)}<small>${titles[i + offset]}</small></span>
      <span class="loser-score">${p.score || 0} pts</span>
    </li>`).join('');
  sfx.drum();
  setTimeout(sfx.sad, 600 + (list.length - 1) * 1800);
}

function renderTeams() {
  showScreen('teams');
  const [a, b] = teamStats(TEAMS, players);
  const winner = a.avg === b.avg ? null : a.avg > b.avg ? a : b;
  $('team-result').innerHTML = `
    ${teamBattle()}
    <div class="team-winner" style="--team:${winner?.color || '#ffe600'}">
      ${winner ? `🏆 ${esc(winner.name)} gagne ! 🏆` : '🤝 Égalité parfaite ! 🤝'}
    </div>`;
  sfx.fanfare();
  party(2000);
}

function renderEnd() {
  showScreen('end');
  const r = ranking(players);
  const place = (p, n) => {
    if (!p) return '<div class="step"></div>';
    const team = TEAMS.find(t => t.id === p.team);
    return `
      <div class="step step${n}" style="--team:${team?.color || '#fff'}">
        <div class="step-name">${esc(p.name)}</div>
        <div class="step-block"><div class="medal">${n}</div><div class="step-score">${p.score || 0} pts</div><div class="step-team">${esc(team?.name || '')}</div></div>
      </div>`;
  };
  $('podium').innerHTML = place(r[1], 2) + place(r[0], 1) + place(r[2], 3);
  sfx.drum();
  setTimeout(() => { sfx.fanfare(); party(3000); }, 1900);
}

function renderGift() {
  showScreen('gift');
  const winner = ranking(players)[0];
  $('gift-winner').textContent = winner ? `Bravo ${winner.name} ! 🎉` : '';
  const box = $('gift-box'), text = $('gift-text');
  box.className = 'gift-box shake';
  text.classList.remove('show');
  sfx.drum();
  setTimeout(() => {
    box.className = 'gift-box open';
    text.classList.add('show');
    sfx.fanfare();
    party(5000);
  }, 2400);
}

// --- Actions de l'animateur ---
function startQuestion(i) {
  const qd = QUIZ.questions[i];
  return db.set(gamePath('state'), {
    phase: 'question', q: i, n: qd.answers.length, double: !!qd.double,
    startAt: db.now() + (qd.double ? DOUBLE_INTRO_MS : INTRO_MS),
    duration: (qd.time || QUIZ.timePerQuestion) * 1000,
  });
}

// Calcul des points façon Kahoot : 1000 max, jusqu'à 500 selon la rapidité, + bonus de série.
async function reveal() {
  if (revealing || state?.phase !== 'question') return;
  revealing = true;
  const qd = QUIZ.questions[state.q];
  const upd = { 'state/phase': 'reveal' };
  for (const [id, p] of Object.entries(players)) {
    const a = answers[id];
    const correct = !!a && a.c === qd.correct;
    const streak = correct ? (p.streak || 0) + 1 : 0;
    let points = 0;
    if (correct) {
      const elapsed = Math.min(Math.max(a.at - state.startAt, 0), state.duration);
      points = Math.round(1000 * (1 - elapsed / state.duration / 2)) + Math.min(Math.max(streak - 1, 0), 5) * 100;
      if (qd.double) points *= 2;
    }
    upd[`players/${id}/score`] = (p.score || 0) + points;
    upd[`players/${id}/streak`] = streak;
    upd[`players/${id}/last`] = { q: state.q, answered: !!a, correct, points };
  }
  sfx.gong();
  await db.update(gamePath(), upd);
}

const setPhase = phase => db.update(gamePath(), { 'state/phase': phase });

$('start-btn').onclick = () => { sfx.unlock(); startQuestion(0); };
$('skip-btn').onclick = () => reveal();
$('r-next').onclick = () => {
  if (state.q + 1 < N) setPhase('scores');
  else setPhase(losers(players).length ? 'losers' : 'teams');
};
$('s-next').onclick = () => startQuestion(state.q + 1);
$('l-next').onclick = () => setPhase('teams');
$('t-next').onclick = () => setPhase('end');
$('gift-btn').onclick = () => setPhase('gift');
$('new-game-btn').onclick = () => {
  if (!confirm('Lancer une nouvelle partie ? (les joueurs devront se reconnecter)')) return;
  sessionStorage.removeItem('kq-host-pin');
  location.reload();
};
$('team-cols').onclick = e => {
  const b = e.target.closest('.chip');
  if (b && confirm(`Retirer ${b.textContent} de la partie ?`)) db.set(gamePath(`players/${b.dataset.id}`), null);
};
// Espace / Entrée / → = bouton principal (pratique avec une télécommande de présentation)
document.addEventListener('keydown', e => {
  if (![' ', 'Enter', 'ArrowRight', 'PageDown'].includes(e.key)) return;
  const btn = document.querySelector('.screen:not([hidden]) [data-next]');
  if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
});

init();
