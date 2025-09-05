
import { Router } from 'express';
import { db } from '../db.js';
import { toQRDataUrl } from '../util/qr.js';
import { shortCode, addMinutes } from '../util/tokens.js';

export const family = Router();

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

family.post('/create-player', requireAuth, (req, res) => {
  const { firstName, lastName, dob, teamName, jerseyNumber, position } = req.body || {};
  if (!firstName || !lastName || !dob) return res.status(400).json({ error: 'Missing fields' });
  const now = new Date().toISOString();

  // ensure parent profile
  const parentProfile = db.prepare('SELECT * FROM parent_profiles WHERE userId = ?').get(req.session.user.id);
  if (!parentProfile) return res.status(400).json({ error: 'Parent profile missing' });

  const ins = db.prepare(`INSERT INTO player_profiles (userId, firstName, lastName, dob, teamName, jerseyNumber, position, createdAt)
    VALUES (NULL,?,?,?,?,?,?,?)`).run(firstName, lastName, dob, teamName || null, jerseyNumber || null, position || null, now);
  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(ins.lastInsertRowid);

  // link parent as guardian
  db.prepare('INSERT OR IGNORE INTO parent_player_links (parentId, playerId, role, createdAt) VALUES (?,?,?,?)')
    .run(parentProfile.id, player.id, 'guardian', now);

  // issue claim code (24h)
  const code = shortCode();
  const exp = addMinutes(new Date(), 24*60).toISOString();
  db.prepare('INSERT INTO link_tokens (token, type, role, playerId, issuedByUserId, expiresAt) VALUES (?,?,?,?,?,?)')
    .run(code, 'claim', 'owner', player.id, req.session.user.id, exp);

  res.json({ player, claimCode: code });
});

family.post('/generate-code', requireAuth, async (req, res) => {
  const { playerId, kind } = req.body || {};
  if (!playerId || !['guardian','follower'].includes(kind)) return res.status(400).json({ error: 'Invalid payload' });

  // TODO: permission check – must be player owner/guardian/coach
  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const code = shortCode();
  // QR short expiry (15m) for in-person; typed code 24h – here we use 24h for code and offer QR preview
  const exp = addMinutes(new Date(), 24*60).toISOString();
  db.prepare('INSERT INTO link_tokens (token, type, role, playerId, issuedByUserId, expiresAt) VALUES (?,?,?,?,?,?)')
    .run(code, `family_${kind}`, kind, playerId, req.session.user.id, exp);

  const qr = await toQRDataUrl(code);
  res.json({ code, qrPngDataUrl: qr, expiresAt: exp });
});

family.post('/redeem-code', requireAuth, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Code required' });

  const tok = db.prepare('SELECT * FROM link_tokens WHERE token = ?').get(code);
  if (!tok) return res.status(400).json({ error: 'Invalid code' });
  if (tok.usedAt) return res.status(400).json({ error: 'Code already used' });
  if (tok.expiresAt < new Date().toISOString()) return res.status(400).json({ error: 'Code expired' });
  if (!tok.type.startsWith('family_') && tok.type !== 'claim') return res.status(400).json({ error: 'Wrong code type' });

  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(tok.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // ensure parent profile
  const parentProfile = db.prepare('SELECT * FROM parent_profiles WHERE userId = ?').get(req.session.user.id);
  if (!parentProfile) return res.status(400).json({ error: 'Parent profile missing' });

  const role = tok.type === 'claim' ? 'guardian' : (tok.role || 'follower');
  const now = new Date().toISOString();
  db.prepare('INSERT OR IGNORE INTO parent_player_links (parentId, playerId, role, createdAt) VALUES (?,?,?,?)')
    .run(parentProfile.id, player.id, role, now);

  db.prepare('UPDATE link_tokens SET usedAt = ? WHERE id = ?').run(now, tok.id);

  res.json({ linked: true, role, player });
});

family.post('/invite', requireAuth, (req, res) => {
  // stub: we just create a token row that could be emailed out-of-band
  const { playerEmailOrPhone, role, playerId } = req.body || {};
  if (!playerEmailOrPhone || !role) return res.status(400).json({ error: 'Missing fields' });

  const pid = playerId || null;
  if (!pid) return res.status(400).json({ error: 'playerId required for now' });

  const code = shortCode();
  const exp = new Date(Date.now() + 24*60*60*1000).toISOString();
  db.prepare('INSERT INTO link_tokens (token, type, role, playerId, email, issuedByUserId, expiresAt) VALUES (?,?,?,?,?,?,?)')
    .run(code, 'invite', role, pid, playerEmailOrPhone, req.session.user.id, exp);

  res.json({ ok: true, code, expiresAt: exp });
});

family.post('/claim', requireAuth, (req, res) => {
  const { code, dob } = req.body || {};
  if (!code || !dob) return res.status(400).json({ error: 'Code and DOB required' });

  const tok = db.prepare('SELECT * FROM link_tokens WHERE token = ? AND type = ?').get(code, 'claim');
  if (!tok) return res.status(400).json({ error: 'Invalid code' });
  if (tok.usedAt) return res.status(400).json({ error: 'Code already used' });
  if (tok.expiresAt < new Date().toISOString()) return res.status(400).json({ error: 'Code expired' });

  const player = db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(tok.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (player.dob != dob) return res.status(400).json({ error: 'DOB mismatch' });

  // attach to current user
  db.prepare('UPDATE player_profiles SET userId = ? WHERE id = ?').run(req.session.user.id, player.id);
  db.prepare('UPDATE link_tokens SET usedAt = ? WHERE id = ?').run(new Date().toISOString(), tok.id);
  res.json({ ok: true, player });
});
