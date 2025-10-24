import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'BoxStat <onboarding@boxstat.app>';
const DOMAIN = process.env.REPLIT_DOMAINS?.split(',')[0] || 'boxstat.app';

export interface SendVerificationEmailParams {
  email: string;
  firstName: string;
  verificationToken: string;
}

export interface SendMagicLinkParams {
  email: string;
  firstName: string;
  magicLinkToken: string;
}

export async function sendVerificationEmail({
  email,
  firstName,
  verificationToken,
}: SendVerificationEmailParams): Promise<void> {
  const verificationUrl = `https://${DOMAIN}/verify-email?token=${verificationToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your BoxStat Account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to BoxStat! 🏀</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Thank you for signing up! To complete your registration and start using your BoxStat account, please verify your email address.</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendMagicLink({
  email,
  firstName,
  magicLinkToken,
}: SendMagicLinkParams): Promise<void> {
  const magicLinkUrl = `https://${DOMAIN}/magic-link-login?token=${magicLinkToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your BoxStat Magic Link',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>BoxStat Login Link 🏀</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Click the button below to securely log in to your BoxStat account. No password needed!</p>
                <div style="text-align: center;">
                  <a href="${magicLinkUrl}" class="button">Log In to BoxStat</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #6b7280;">${magicLinkUrl}</p>
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">This link will expire in 15 minutes. If you didn't request this login link, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
    console.log(`Magic link sent to ${email}`);
  } catch (error) {
    console.error('Error sending magic link:', error);
    throw new Error('Failed to send magic link');
  }
}
