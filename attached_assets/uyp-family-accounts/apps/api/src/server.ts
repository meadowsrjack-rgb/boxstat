
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { ensureTables, db } from './db.js';
import { session } from './session.js';
import { auth } from './routes/auth.js';
import { family } from './routes/family.js';
import { parent } from './routes/parent.js';
import { player } from './routes/player.js';
import { coach } from './routes/coach.js';
import { privacy } from './routes/privacy.js';
import { stripeRouter } from './stripe/index.js';

const app = express();

// Raw body for Stripe
app.use((req, res, next) => {
  if (req.path.startsWith('/api/stripe/webhook')) {
    (req as any).rawBody = Buffer.alloc(0);
    req.on('data', (chunk) => { (req as any).rawBody = Buffer.concat([(req as any).rawBody, chunk]); });
    req.on('end', () => next());
  } else {
    next();
  }
});

app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session);

ensureTables();

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/family', family);
app.use('/api/parent', parent);
app.use('/api/player', player);
app.use('/api/coach', coach);
app.use('/api/privacy', privacy);
app.use('/api/stripe', stripeRouter);

app.get('/api/me', (req, res) => res.json({ user: req.session.user || null }));

const port = Number(new URL(env.API_URL).port || 8787);
app.listen(port, () => console.log(`[API] Listening on ${env.API_URL}`));
