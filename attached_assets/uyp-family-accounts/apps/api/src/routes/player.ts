
import { Router } from 'express';
import { db } from '../db.js';
import { addMinutes, shortCode } from '../util/tokens.js';
import { toQRDataUrl } from '../util/qr.js';

export const player = Router();

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

player.post('/family-code', requireAuth, async (req, res) => {
  const { kind } = req.body || {};
  if (!['guardian','follower'].includes(kind)) return res.status(400).json({ error: 'Invalid kind' });

  // find player's own profile (if they own it)
  const player = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.session.user.id);
  if (!player) return res.status(404).json({ error: 'No player profile on this user' });

  const code = shortCode();
  const exp = addMinutes(new Date(), 24*60).toISOString();
  db.prepare('INSERT INTO link_tokens (token, type, role, playerId, issuedByUserId, expiresAt) VALUES (?,?,?,?,?,?)')
    .run(code, `family_${kind}`, kind, player.id, req.session.user.id, exp);
  const qr = await toQRDataUrl(code);
  res.json({ code, qrPngDataUrl: qr, expiresAt: exp });
});
