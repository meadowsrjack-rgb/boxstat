
import { Router } from 'express';
import { db } from '../db.js';

export const privacy = Router();

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

privacy.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM privacy WHERE userId = ?').get(req.session.user.id);
  res.json({ searchable: row ? !!row.searchable : true });
});

privacy.post('/', requireAuth, (req, res) => {
  const val = req.body?.settings?.searchable ? 1 : 0;
  db.prepare('INSERT INTO privacy (userId, searchable) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET searchable = excluded.searchable')
    .run(req.session.user.id, val);
  res.json({ ok: true });
});
