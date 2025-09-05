
import { Router } from 'express';
import { db } from '../db.js';
import { session } from '../session.js';
import { sendEmail } from '../util/email.js';
import { env } from '../env.js';
import { hashToken, sixDigit, addMinutes } from '../util/tokens.js';
import crypto from 'crypto';

export const auth = Router();

auth.post('/magic-link', async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email required' });

  const code = sixDigit();
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = addMinutes(new Date(), 15).toISOString();

  db.prepare('INSERT INTO magic_links (email, tokenHash, code, expiresAt) VALUES (?,?,?,?)')
    .run(email.toLowerCase(), tokenHash, code, expiresAt);

  const verifyUrl = `${env.APP_URL}/auth/verify?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const html = `
    <p>Sign in to UYP</p>
    <p>Your code: <b>${code}</b></p>
    <p>Or click: <a href="${verifyUrl}">${verifyUrl}</a> (expires in 15 minutes)</p>
  `;
  await sendEmail(email, 'Your UYP sign-in link', html);
  res.json({ ok: true });
});

auth.post('/verify', async (req, res) => {
  const { email, codeOrToken } = req.body || {};
  if (!email || !codeOrToken) return res.status(400).json({ error: 'Email and code/token required' });

  const row = db.prepare('SELECT * FROM magic_links WHERE email = ? ORDER BY id DESC').get(email.toLowerCase());
  if (!row) return res.status(400).json({ error: 'No code issued' });

  const nowIso = new Date().toISOString();
  if (row.consumedAt) return res.status(400).json({ error: 'Code already used' });
  if (row.expiresAt < nowIso) return res.status(400).json({ error: 'Code expired' });

  const tokenOk = (() => {
    // if code matches directly
    if (row.code === codeOrToken) return true;
    // if token provided, hash it
    try {
      const tokenHash = crypto.createHash('sha256').update(codeOrToken).digest('hex');
      return tokenHash === row.tokenHash;
    } catch { return false; }
  })();

  if (!tokenOk) return res.status(400).json({ error: 'Invalid code/token' });

  // consume
  db.prepare('UPDATE magic_links SET consumedAt = ? WHERE id = ?').run(nowIso, row.id);

  // upsert user
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    const ins = db.prepare('INSERT INTO users (email, role, createdAt) VALUES (?, ?, ?)')
      .run(email.toLowerCase(), 'parent', nowIso);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(ins.lastInsertRowid);
    // create parent profile
    db.prepare('INSERT INTO parent_profiles (userId, createdAt) VALUES (?, ?)').run(user.id, nowIso);
  }

  req.session.user = { id: user.id, role: user.role, email: user.email };
  await req.session.save();
  res.json({ ok: true, user: req.session.user });
});

auth.post('/logout', async (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

auth.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});
