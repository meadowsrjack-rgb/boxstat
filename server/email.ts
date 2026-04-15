import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'BoxStat <verify@boxstat.app>';

// Use environment-aware domain for email links
function getDomain(): string {
  // In development, use the Replit dev domain
  if (process.env.NODE_ENV === 'development' && process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN;
  }
  // In production or if no dev domain, use the production domain
  return 'boxstat.app';
}

const DOMAIN = getDomain();

export interface SendVerificationEmailParams {
  email: string;
  firstName: string;
  verificationToken: string;
  organizationId?: string;
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
  organizationId,
}: SendVerificationEmailParams): Promise<void> {
  const orgParam = organizationId ? `&organizationId=${encodeURIComponent(organizationId)}` : '';
  const verificationUrl = `https://${DOMAIN}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}${orgParam}`;
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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
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
                        <p style="margin: 30px 0 10px; font-size: 14px; font-weight: 600; color: #374151; text-align: center;">Get the BoxStat App</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 5px 0;">
                              <a href="https://apps.apple.com/us/app/boxstat/id6754899159" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">Download on the App Store</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding: 5px 0;">
                              <a href="https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">Get it on Google Play</a>
                            </td>
                          </tr>
                        </table>
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

export interface SendPasswordResetParams {
  email: string;
  firstName: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  email,
  firstName,
  resetToken,
}: SendPasswordResetParams): Promise<void> {
  const resetUrl = `https://${DOMAIN}/reset-password?token=${resetToken}`;
  const displayName = firstName || 'there';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Password - BoxStat',
      text: `Hi ${displayName},

You requested to reset your password for your BoxStat account. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security purposes.

If you did not request a password reset, please disregard this email and your account will remain secure.

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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">Reset Your Password</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">You requested to reset your password for your BoxStat account. Click the button below to create a new password.</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 20px 0;">
                              <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Reset Password</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">${resetUrl}</p>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you did not request a password reset, please disregard this email.</p>
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
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
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

// ===== Payment Receipt Email =====

export interface SendPaymentReceiptParams {
  email: string;
  firstName: string;
  items: { name: string; amount: number }[];
  totalAmount: number;
  playerName?: string;
  transactionDate?: Date;
  organizationName?: string;
}

export async function sendPaymentReceipt({
  email,
  firstName,
  items,
  totalAmount,
  playerName,
  transactionDate,
  organizationName,
}: SendPaymentReceiptParams): Promise<{ success: boolean; error?: string }> {
  const displayName = firstName || 'there';
  const appUrl = `https://${DOMAIN}`;
  const date = transactionDate || new Date();
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  const formattedTotal = `$${(totalAmount / 100).toFixed(2)}`;
  const orgName = organizationName || 'BoxStat';

  const itemRows = items.map(item => `
    <tr>
      <td style="padding: 12px 0; font-size: 15px; color: #374151; border-bottom: 1px solid #f3f4f6;">${item.name}</td>
      <td style="padding: 12px 0; font-size: 15px; color: #374151; text-align: right; border-bottom: 1px solid #f3f4f6;">$${(item.amount / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  const itemsText = items.map(item => `  ${item.name}: $${(item.amount / 100).toFixed(2)}`).join('\n');

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Payment Receipt - ${orgName}`,
      text: `Hi ${displayName},

Thank you for your payment! Here's your receipt:

Date: ${formattedDate}
${playerName ? `Player: ${playerName}\n` : ''}
Items:
${itemsText}

Total: ${formattedTotal}

---
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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 40px 10px;">
                        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">Payment Receipt</h2>
                        <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">${formattedDate}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px 30px;">
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 24px; font-size: 16px; color: #374151;">Thank you for your payment${playerName ? ` for <strong>${playerName}</strong>` : ''}! Here are your details:</p>
                        
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #e5e7eb; margin-bottom: 16px;">
                          ${itemRows}
                        </table>
                        
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #111827; margin-top: 4px;">
                          <tr>
                            <td style="padding: 14px 0; font-size: 17px; font-weight: 700; color: #111827;">Total</td>
                            <td style="padding: 14px 0; font-size: 17px; font-weight: 700; color: #111827; text-align: right;">${formattedTotal}</td>
                          </tr>
                        </table>

                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                          <tr>
                            <td style="text-align: center; padding: 20px 0;">
                              <a href="${appUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">View in BoxStat</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">Powered by BoxStat Sports Management</p>
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
    console.log(`📧 Payment receipt sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send receipt' };
  }
}

// ===== Notification Email =====

export interface SendNotificationEmailParams {
  email: string;
  firstName: string;
  title: string;
  message: string;
}

export async function sendNotificationEmail({
  email,
  firstName,
  title,
  message,
}: SendNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const displayName = firstName || 'there';
  const appUrl = `https://${DOMAIN}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${title} - BoxStat`,
      text: `Hi ${displayName},

${message}

---
BoxStat - Sports Management Platform
${DOMAIN}

To manage your notification preferences, visit ${appUrl}/settings/notifications
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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">${title}</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151; white-space: pre-wrap;">${message}</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 20px 0;">
                              <a href="${appUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Open BoxStat</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">&copy; ${new Date().getFullYear()} BoxStat. All rights reserved.</p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">BoxStat Sports Management Platform</p>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">
                          <a href="${appUrl}/settings/notifications" style="color: #6b7280; text-decoration: underline;">Manage notification preferences</a>
                        </p>
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
    console.log(`Notification email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// ===== Account Claim Email (admin-created users) =====

export interface SendAccountClaimEmailParams {
  email: string;
  firstName: string;
  inviteToken: string;
  organizationName?: string;
  role?: string;
}

export async function sendAccountClaimEmail({
  email,
  firstName,
  inviteToken,
  organizationName,
  role,
}: SendAccountClaimEmailParams): Promise<{ success: boolean; error?: string }> {
  const displayName = firstName || 'there';
  const claimUrl = `https://${DOMAIN}/invite/${inviteToken}`;
  const appStoreUrl = 'https://apps.apple.com/us/app/boxstat/id6754899159';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US';
  const orgName = organizationName || 'your organization';
  const roleLabel = role === 'coach' ? 'Coach' : role === 'parent' ? 'Parent' : role === 'player' ? 'Player' : 'Member';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You've been added to ${orgName} — Claim Your Account`,
      text: `Hi ${displayName},

You've been added to ${orgName} on BoxStat as a ${roleLabel}. To get started, claim your account and set your password using the link below.

Claim your account:
${claimUrl}

Or download the BoxStat app:
App Store: ${appStoreUrl}
Google Play: ${playStoreUrl}

This link will expire in 7 days.

If you did not expect this email, please disregard it.

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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">Welcome to BoxStat!</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 10px; font-size: 16px; color: #374151;">You've been added to <strong>${orgName}</strong> as a <strong>${roleLabel}</strong>.</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">Click the button below to set your password and activate your account.</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${claimUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Claim Your Account</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${appStoreUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Download on the App Store</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${playStoreUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Get it on Google Play</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">${claimUrl}</p>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 7 days. If you did not expect this email, please disregard it.</p>
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
    console.log(`Account claim email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending account claim email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send claim email' };
  }
}

// ===== Welcome / Claim Account Email (legacy magic link) =====

export interface SendWelcomeEmailParams {
  email: string;
  firstName: string;
  magicLinkToken: string;
  organizationName?: string;
}

export async function sendWelcomeEmail({
  email,
  firstName,
  magicLinkToken,
  organizationName,
}: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const displayName = firstName || 'there';
  const claimUrl = `https://${DOMAIN}/magic-link-login?token=${magicLinkToken}`;
  const appStoreUrl = 'https://apps.apple.com/us/app/boxstat/id6754899159';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US';
  const orgName = organizationName || 'your organization';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to BoxStat — Claim Your Account`,
      text: `Hi ${displayName},

You've been added to ${orgName} on BoxStat! To get started, claim your account using the link below.

Claim your account on the web:
${claimUrl}

Or download the BoxStat app:
App Store: ${appStoreUrl}
Google Play: ${playStoreUrl}

This link will expire in 24 hours.

If you did not expect this email, please disregard it.

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
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <tr>
                      <td style="padding: 16px 40px 8px; text-align: center; background-color: #ffffff;">
                        <img src="https://${DOMAIN}/assets/logo" alt="BoxStat Logo" style="height: 240px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827; text-align: center;">Welcome to BoxStat!</h2>
                        <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${displayName},</p>
                        <p style="margin: 0 0 30px; font-size: 16px; color: #374151;">You've been added to <strong>${orgName}</strong> on BoxStat. Claim your account to access your profile, view team schedules, and more.</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${claimUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Claim Your Account</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${appStoreUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Download on the App Store</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="text-align: center; padding: 10px 0;">
                              <a href="${playStoreUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Get it on Google Play</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
                        <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280; word-break: break-all;">${claimUrl}</p>
                        <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 24 hours. If you did not expect this email, please disregard it.</p>
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
    console.log(`Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send welcome email' };
  }
}
