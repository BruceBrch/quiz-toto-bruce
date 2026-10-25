// Formes Kahoot : ▲ rouge, ◆ bleu, ● jaune, ■ vert
export const SHAPES = [
  '<svg viewBox="0 0 32 32"><path d="M16 3 31 29H1z"/></svg>',
  '<svg viewBox="0 0 32 32"><path d="M16 1 31 16 16 31 1 16z"/></svg>',
  '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14"/></svg>',
  '<svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26"/></svg>',
];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const ranking = players => Object.entries(players || {})
  .map(([id, p]) => ({ id, ...p }))
  .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.joinedAt || 0) - (b.joinedAt || 0));

export const REACTIONS = ['😂', '🔥', '😱', '👏', '❤️', '🎉'];

// Score d'équipe = moyenne par joueur (équitable si les équipes n'ont pas la même taille)
export const teamStats = (teams, players) => teams.map(t => {
  const ps = Object.values(players || {}).filter(p => p.team === t.id);
  const total = ps.reduce((s, p) => s + (p.score || 0), 0);
  return { ...t, count: ps.length, avg: ps.length ? Math.round(total / ps.length) : 0 };
});

// Les 3 derniers (du 3e pire au pire), seulement s'il reste assez de monde pour le podium
export const losers = players => {
  const r = ranking(players);
  return r.slice(r.length - Math.min(3, Math.max(0, r.length - 3)));
};
