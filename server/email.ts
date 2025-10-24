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
  const displayName = firstName || 'there';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email Address - BoxStat',
      text: `Hi ${displayName},

Thank you for registering with BoxStat. To complete your registration, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you did not create an account with BoxStat, please disregard this email.

Best regards,
The BoxStat Team

BoxStat - Sports Management Platform
${DOMAIN}
      `,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 120px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">Verify Your Email Address</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Thank you for registering with BoxStat. To complete your registration and access your account, please verify your email address by clicking the button below.</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 20px 0;">
                              <a href="${verificationUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Verify Email Address</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">${verificationUrl}</p>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 24 hours. If you did not create an account with BoxStat, please disregard this email.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">BoxStat Sports Management Platform</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
  const displayName = firstName || 'there';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Secure Login Link - BoxStat',
      text: `Hi ${displayName},

You requested a secure login link for your BoxStat account. Click the link below to log in:

${magicLinkUrl}

This link will expire in 15 minutes for security purposes.

If you did not request this login link, please disregard this email and your account will remain secure.

Best regards,
The BoxStat Team

BoxStat - Sports Management Platform
${DOMAIN}
      `,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px 40px 30px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 120px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">Your Secure Login Link</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">You requested a secure login link for your BoxStat account. Click the button below to log in - no password required.</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 20px 0;">
                              <a href="${magicLinkUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Log In to BoxStat</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">${magicLinkUrl}</p>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 15 minutes. If you did not request this login link, please disregard this email.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">BoxStat Sports Management Platform</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
