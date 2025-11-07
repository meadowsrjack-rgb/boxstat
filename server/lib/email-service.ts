import { z } from 'zod';
import { Resend } from 'resend';

// Email configuration schema
const emailConfigSchema = z.object({
  provider: z.enum(['console', 'resend', 'sendgrid']).default('console'),
  from: z.string().default('BoxStat Support <no-reply@boxstat.app>'), // Allow display name format
  resendApiKey: z.string().optional(),
  sendgridApiKey: z.string().optional(),
  devModeCode: z.string().default('000000'),
});

// Parse environment variables
const emailConfig = emailConfigSchema.parse({
  provider: process.env.MAIL_PROVIDER,
  from: process.env.MAIL_FROM,
  resendApiKey: process.env.RESEND_API_KEY,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  devModeCode: process.env.DEV_MODE_CODE,
});

// Generate a random 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email service interface
export interface EmailService {
  sendVerificationCode(to: string, code: string, playerName: string): Promise<void>;
  sendClaimEmail(to: string, claimLink: string, accountType: string): Promise<void>;
}

// Console email service (for development/testing)
class ConsoleEmailService implements EmailService {
  async sendVerificationCode(to: string, code: string, playerName: string): Promise<void> {
    console.log('📧 [EMAIL SERVICE - CONSOLE]');
    console.log('='.repeat(50));
    console.log(`To: ${to}`);
    console.log(`Subject: Verify Player Claim - ${playerName}`);
    console.log('');
    console.log(`Hi there!`);
    console.log('');
    console.log(`Someone is trying to claim ${playerName} in the BoxStat app.`);
    console.log(`If this was you, use this verification code:`);
    console.log('');
    console.log(`  🏀 CODE: ${code}`);
    console.log('');
    console.log(`This code will expire in 10 minutes.`);
    console.log(`If you didn't request this, you can safely ignore this email.`);
    console.log('');
    console.log(`Thanks,`);
    console.log(`BoxStat Team`);
    console.log('='.repeat(50));
  }

  async sendClaimEmail(to: string, claimLink: string, accountType: string): Promise<void> {
    console.log('📧 [EMAIL SERVICE - CONSOLE]');
    console.log('='.repeat(50));
    console.log(`To: ${to}`);
    console.log(`Subject: Claim Your ${accountType === 'coach' ? 'Coach' : 'Parent'} Account - BoxStat`);
    console.log('');
    console.log(`Welcome to BoxStat!`);
    console.log('');
    console.log(`Click the link below to claim your ${accountType} account:`);
    console.log('');
    console.log(`  🏀 ${claimLink}`);
    console.log('');
    console.log(`This link will expire in 30 minutes.`);
    console.log(`If you didn't request this, you can safely ignore this email.`);
    console.log('');
    console.log(`Thanks,`);
    console.log(`BoxStat Team`);
    console.log('='.repeat(50));
  }
}

// Resend email service
class ResendEmailService implements EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendVerificationCode(to: string, code: string, playerName: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: emailConfig.from,
        to: [to],
        subject: `Verify Player Claim - ${playerName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">BoxStat - Verify Player Claim</h2>
            
            <p>Hi there!</p>
            
            <p>Someone is trying to claim <strong>${playerName}</strong> in the BoxStat app.</p>
            
            <p>If this was you, use this verification code:</p>
            
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #dc2626; font-size: 32px; margin: 0; font-family: monospace;">${code}</h1>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This code will expire in 10 minutes.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 12px;">
              Thanks,<br>
              BoxStat Team
            </p>
          </div>
        `,
        text: `
BoxStat - Verify Player Claim

Hi there!

Someone is trying to claim ${playerName} in the BoxStat app.

If this was you, use this verification code: ${code}

This code will expire in 10 minutes.
If you didn't request this, you can safely ignore this email.

Thanks,
BoxStat Team
        `.trim(),
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error('Failed to send verification email');
      }

      console.log(`✅ Verification email sent to ${to} via Resend`);
    } catch (error) {
      console.error('Error sending email via Resend:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendClaimEmail(to: string, claimLink: string, accountType: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: emailConfig.from,
        to: [to],
        subject: `Claim Your ${accountType === 'coach' ? 'Coach' : 'Parent'} Account - BoxStat`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">BoxStat - Claim Your Account</h2>
            
            <p>Welcome to BoxStat!</p>
            
            <p>You've been added to the BoxStat app as a <strong>${accountType}</strong>. Click the button below to claim your account and get started:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${claimLink}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Claim My Account</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${claimLink}" style="color: #dc2626; word-break: break-all;">${claimLink}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This link will expire in 30 minutes.<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 12px;">
              Thanks,<br>
              BoxStat Team
            </p>
          </div>
        `,
        text: `
BoxStat - Claim Your Account

Welcome to BoxStat!

You've been added to the BoxStat app as a ${accountType}. Click the link below to claim your account and get started:

${claimLink}

This link will expire in 30 minutes.
If you didn't expect this email, you can safely ignore it.

Thanks,
BoxStat Team
        `.trim(),
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error('Failed to send claim email');
      }

      console.log(`✅ Claim email sent to ${to} via Resend`);
    } catch (error) {
      console.error('Error sending claim email via Resend:', error);
      throw new Error('Failed to send claim email');
    }
  }
}

// SendGrid email service (placeholder - can be implemented if needed)
class SendGridEmailService implements EmailService {
  constructor(apiKey: string) {
    throw new Error('SendGrid email service not implemented yet');
  }

  async sendVerificationCode(to: string, code: string, playerName: string): Promise<void> {
    throw new Error('SendGrid email service not implemented yet');
  }

  async sendClaimEmail(to: string, claimLink: string, accountType: string): Promise<void> {
    throw new Error('SendGrid email service not implemented yet');
  }
}

// Email service factory
function createEmailService(): EmailService {
  switch (emailConfig.provider) {
    case 'console':
      return new ConsoleEmailService();
    
    case 'resend':
      if (!emailConfig.resendApiKey) {
        console.warn('Resend API key not provided, falling back to console');
        return new ConsoleEmailService();
      }
      try {
        return new ResendEmailService(emailConfig.resendApiKey);
      } catch (error) {
        console.warn('Failed to initialize Resend, falling back to console:', error);
        return new ConsoleEmailService();
      }
    
    case 'sendgrid':
      if (!emailConfig.sendgridApiKey) {
        console.warn('SendGrid API key not provided, falling back to console');
        return new ConsoleEmailService();
      }
      try {
        return new SendGridEmailService(emailConfig.sendgridApiKey);
      } catch (error) {
        console.warn('Failed to initialize SendGrid, falling back to console:', error);
        return new ConsoleEmailService();
      }
    
    default:
      return new ConsoleEmailService();
  }
}

// Singleton email service instance
export const emailService = createEmailService();

// Helper function to get dev mode code if applicable
export function getDevModeCode(): string | undefined {
  return emailConfig.provider === 'console' ? emailConfig.devModeCode : undefined;
}

// SMS service placeholder (can be extended later for Twilio integration)
export interface SmsService {
  sendVerificationCode(to: string, code: string, playerName: string): Promise<void>;
}

class ConsoleSmsService implements SmsService {
  async sendVerificationCode(to: string, code: string, playerName: string): Promise<void> {
    console.log('📱 [SMS SERVICE - CONSOLE]');
    console.log('='.repeat(30));
    console.log(`To: ${to}`);
    console.log(`Message: BoxStat verification code for ${playerName}: ${code}`);
    console.log('='.repeat(30));
  }
}

export const smsService: SmsService = new ConsoleSmsService();