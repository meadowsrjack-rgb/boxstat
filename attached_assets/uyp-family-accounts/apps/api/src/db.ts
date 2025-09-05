
import Database from 'better-sqlite3';
import { env } from './env.js';

export const db = new Database(env.DATABASE_URL.replace('file:', ''));

// enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function ensureTables() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    firstName TEXT,
    lastName TEXT,
    role TEXT NOT NULL DEFAULT 'parent',
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS parent_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    phone TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS player_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dob TEXT NOT NULL,
    teamName TEXT,
    jerseyNumber INTEGER,
    position TEXT,
    profileImageUrl TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS parent_player_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parentId INTEGER NOT NULL,
    playerId INTEGER NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    UNIQUE(parentId, playerId, role),
    FOREIGN KEY(parentId) REFERENCES parent_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(playerId) REFERENCES player_profiles(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS magic_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    tokenHash TEXT NOT NULL,
    code TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    consumedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS link_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    role TEXT,
    playerId INTEGER NOT NULL,
    issuedByUserId INTEGER,
    email TEXT,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    FOREIGN KEY(playerId) REFERENCES player_profiles(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    status TEXT,
    stripeCustomerId TEXT,
    stripeSubId TEXT,
    plan TEXT,
    seatsIncluded INTEGER DEFAULT 2,
    seatsExtra INTEGER DEFAULT 0,
    currentPeriodEnd TEXT,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teamId INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    startTime TEXT NOT NULL,
    location TEXT,
    locationLat REAL,
    locationLng REAL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teamId INTEGER,
    senderUserId INTEGER,
    message TEXT NOT NULL,
    messageType TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerId INTEGER NOT NULL,
    coachUserId INTEGER NOT NULL,
    quarter TEXT NOT NULL,
    year INTEGER NOT NULL,
    scores TEXT NOT NULL,
    FOREIGN KEY(playerId) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(coachUserId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerId INTEGER NOT NULL,
    coachUserId INTEGER NOT NULL,
    awardId TEXT NOT NULL,
    category TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(playerId) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(coachUserId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS privacy (
    userId INTEGER PRIMARY KEY,
    searchable INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );
  `);
}
