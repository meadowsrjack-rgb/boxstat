
import { ironSession } from 'iron-session/express';
import type { IronSessionOptions } from 'iron-session';
import { env } from './env.js';

declare module 'iron-session' {
  interface IronSessionData {
    user?: { id: number; role: 'parent'|'player'|'coach'|'admin'; email: string };
  }
}

const sessionOptions: IronSessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: 'uyp.sid',
  cookieOptions: {
    secure: false, // set true behind HTTPS
    sameSite: 'lax',
  },
};

export const session = ironSession(sessionOptions);
