
import { Router } from 'express';
import { db } from '../db.js';
import { addMinutes, shortCode } from '../util/tokens.js';
import { toQRDataUrl } from '../util/qr.js';

export const coach = Router();

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

coach.post('/players/:playerId/family-code', requireAuth, async (req, res) => {
  // TODO: require coach role & roster permission
  const playerId = Number(req.params.playerId);
  const { role } = req.body || {};
  if (!['guardian','follower'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const code = shortCode();
  const exp = addMinutes(new Date(), 60*24).toISOString();
  db.prepare('INSERT INTO link_tokens (token, type, role, playerId, issuedByUserId, expiresAt) VALUES (?,?,?,?,?,?)')
    .run(code, `family_${role}`, role, playerId, req.session.user.id, exp);
  const qr = await toQRDataUrl(code);
  res.json({ code, qrPngDataUrl: qr, expiresAt: exp });
});
