import db from './db.js';
import { QUIZ } from './questions.js';
import { SHAPES, esc, ranking } from './ui.js';

const INTRO_MS = 5000; // temps pendant lequel la question s'affiche seule, avant les réponses
const N = QUIZ.questions.length;
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
    fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.15, i * 0.16)),
  };
})();

// --- Démarrage ---
async function init() {
  if (db.mode === 'local') $('mode-banner').hidden = false;
  pin = sessionStorage.getItem('kq-host-pin');
  if (!pin || !(await db.get(gamePath('state')))) await newGame();
  setupLobby();
  db.on(gamePath('players'), v => { players = v || {}; onPlayers(); });
  db.on(gamePath('state'), v => { state = v; onState(); });
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
  $('end-title').textContent = QUIZ.title;
  $('qr').innerHTML = '';
  if (window.QRCode) new QRCode($('qr'), { text: `${base}?pin=${pin}`, width: 168, height: 168 });
}

// --- Réactions aux données ---
function onPlayers() {
  const list = Object.entries(players).map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  $('player-count').textContent = list.length;
  $('start-btn').disabled = list.length === 0;
  $('lobby-wait').hidden = list.length > 0;
  // On n'ajoute/retire que les pseudos qui changent, pour que seuls les nouveaux s'animent
  const box = $('player-list');
  const ids = new Set(list.map(p => p.id));
  box.querySelectorAll('.chip').forEach(c => { if (!ids.has(c.dataset.id)) c.remove(); });
  for (const p of list) {
    if (box.querySelector(`[data-id="${p.id}"]`)) continue;
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.id = p.id;
    chip.textContent = p.name;
    box.append(chip);
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
  ({ lobby: renderLobby, question: renderQuestion, reveal: renderReveal, scores: renderScores, end: renderEnd })[state.phase]?.();
}

const countAnswers = () => Object.keys(answers).filter(id => players[id]).length;
const updateAnswered = () => { $('q-answered').textContent = countAnswers(); };

// --- Écrans ---
function renderLobby() { showScreen('lobby'); }

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
  $('q-index').textContent = `${state.q + 1} / ${N}`;
  $('q-text').textContent = qd.q;
  $('q-media').innerHTML = qd.image ? `<img src="${esc(qd.image)}" alt="">` : '';
  $('q-answers').innerHTML = answerTiles(qd);
  $('q-answers').className = `answers n${qd.answers.length}`;
  lastSecond = -1;
  tick();
}

function tick() {
  if (state?.phase !== 'question') return;
  const now = db.now();
  const intro = now < state.startAt;
  $('question').classList.toggle('intro', intro);
  if (intro) {
    $('intro-bar').firstElementChild.style.width = `${Math.min(100, 100 * (1 - (state.startAt - now) / INTRO_MS))}%`;
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
  $('r-next').textContent = state.q + 1 < N ? 'Suivant' : 'Voir le podium';
}

function renderScores() {
  showScreen('scores');
  $('s-index').textContent = `${state.q + 1} / ${N}`;
  $('scoreboard').innerHTML = ranking(players).slice(0, 5).map(p =>
    `<li><span class="sb-name">${esc(p.name)}</span><span class="sb-score">${p.score || 0}</span></li>`).join('');
}

function renderEnd() {
  showScreen('end');
  const r = ranking(players);
  const place = (p, n) => p ? `
    <div class="step step${n}">
      <div class="step-name">${esc(p.name)}</div>
      <div class="step-block"><div class="medal">${n}</div><div class="step-score">${p.score || 0} pts</div></div>
    </div>` : '<div class="step"></div>';
  $('podium').innerHTML = place(r[1], 2) + place(r[0], 1) + place(r[2], 3);
  $('end-rest').innerHTML = r.slice(3, 10).map((p, i) =>
    `<li><span class="sb-name">${i + 4}. ${esc(p.name)}</span><span class="sb-score">${p.score || 0}</span></li>`).join('');
  sfx.fanfare();
  if (window.confetti) {
    const end = Date.now() + 3000;
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}

// --- Actions de l'animateur ---
function startQuestion(i) {
  const qd = QUIZ.questions[i];
  return db.set(gamePath('state'), {
    phase: 'question', q: i, n: qd.answers.length,
    startAt: db.now() + INTRO_MS,
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
    }
    upd[`players/${id}/score`] = (p.score || 0) + points;
    upd[`players/${id}/streak`] = streak;
    upd[`players/${id}/last`] = { q: state.q, answered: !!a, correct, points };
  }
  sfx.gong();
  await db.update(gamePath(), upd);
}

$('start-btn').onclick = () => { sfx.unlock(); startQuestion(0); };
$('skip-btn').onclick = () => reveal();
$('r-next').onclick = () => db.update(gamePath(), { 'state/phase': state.q + 1 < N ? 'scores' : 'end' });
$('s-next').onclick = () => startQuestion(state.q + 1);
$('new-game-btn').onclick = () => {
  if (!confirm('Lancer une nouvelle partie ? (les joueurs devront se reconnecter)')) return;
  sessionStorage.removeItem('kq-host-pin');
  location.reload();
};
$('player-list').onclick = e => {
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
