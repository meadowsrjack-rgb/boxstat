
import crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const nano = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function shortCode() {
  // e.g., "4J6-9P2" style grouping
  const a = nano();
  return a[:3] + '-' + a[3:];
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function sixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function addMinutes(date: Date, mins: number) {
  return new Date(date.getTime() + mins * 60000);
}
