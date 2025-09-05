
import nodemailer from 'nodemailer';
import { env } from '../env.js';

export async function sendEmail(to: string, subject: string, html: string) {
  if (!env.SMTP_HOST) {
    console.log('\n[DEV EMAIL] To:', to);
    console.log('[DEV EMAIL] Subject:', subject);
    console.log('[DEV EMAIL] HTML:\n', html, '\n');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}
