
import { Router } from 'express';
import { db } from '../db.js';

export const parent = Router();

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

parent.get('/players', requireAuth, (req, res) => {
  const parentProfile = db.prepare('SELECT * FROM parent_profiles WHERE userId = ?').get(req.session.user.id);
  if (!parentProfile) return res.json([]);
  const rows = db.prepare(`
    SELECT p.* FROM player_profiles p
    JOIN parent_player_links ppl ON ppl.playerId = p.id
    WHERE ppl.parentId = ?
  `).all(parentProfile.id);
  // basic snapshot
  const out = rows.map((p) => ({
    id: p.id, firstName: p.firstName, lastName: p.lastName,
    teamName: p.teamName, profileImageUrl: p.profileImageUrl,
    jerseyNumber: p.jerseyNumber, position: p.position,
    awardsSummary: { trophiesCount: 0 },
    nextEvent: null
  }));
  res.json(out);
});

parent.post('/players', requireAuth, (req, res) => {
  const { playerId } = req.body || {};
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  const parentProfile = db.prepare('SELECT * FROM parent_profiles WHERE userId = ?').get(req.session.user.id);
  if (!parentProfile) return res.status(400).json({ error: 'Parent profile missing' });
  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare('INSERT OR IGNORE INTO parent_player_links (parentId, playerId, role, createdAt) VALUES (?,?,?,?)')
    .run(parentProfile.id, player.id, 'follower', new Date().toISOString());
  res.json({ ok: true });
});

parent.delete('/players/:id', requireAuth, (req, res) => {
  const pid = Number(req.params.id);
  const parentProfile = db.prepare('SELECT * FROM parent_profiles WHERE userId = ?').get(req.session.user.id);
  if (!parentProfile) return res.status(400).json({ error: 'Parent profile missing' });
  db.prepare('DELETE FROM parent_player_links WHERE parentId = ? AND playerId = ?')
    .run(parentProfile.id, pid);
  res.json({ ok: true });
});

parent.get('/events', requireAuth, (req, res) => {
  // In a real app, gather events for all linked players/teams.
  res.json([]);
});

// billing summary stub – Stripe webhook will update subscriptions table
parent.get('/billing/summary', requireAuth, (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE userId = ? ORDER BY id DESC').get(req.session.user.id);
  if (!sub) return res.json(null);
  res.json({
    planName: sub.plan || '—',
    status: sub.status || 'unpaid',
    nextPaymentDue: sub.currentPeriodEnd,
    amountDueCents: null,
    currency: 'usd',
    last4: null,
  });
});
