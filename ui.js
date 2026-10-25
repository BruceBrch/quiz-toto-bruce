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
