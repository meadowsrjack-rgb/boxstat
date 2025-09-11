import { storage } from '../storage';
import { nanoid } from 'nanoid';

interface GoHighLevelContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  customFields?: Record<string, any>;
  tags?: string[];
}

interface GoHighLevelWebhookData {
  contact: GoHighLevelContact;
  event_type: string;
  location_id?: string;
}

interface PlayerData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  schoolGrade?: number;
}

export class GoHighLevelService {
  /**
   * Generate a new magic link token with expiration
   */
  private generateMagicLinkToken(): { token: string; expires: Date } {
    const token = `ghl_${nanoid(32)}`;
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // Token expires in 7 days
    return { token, expires };
  }

  /**
   * Process webhook data from GoHighLevel to create/update profiles
   */
  async processWebhook(webhookData: any): Promise<{ success: boolean; message: string }> {
    try {
      const { event_type, contact, account, players } = webhookData;
      
      if (!contact?.email) {
        throw new Error('Contact email is required');
      }

      console.log('Processing GoHighLevel webhook:', event_type || 'account_created', 'for contact:', contact.email);

      switch (event_type) {
        case 'payment_completed':
          return await this.updatePaymentStatus(contact.email, 'paid', account);
        case 'payment_required':
          return await this.updatePaymentStatus(contact.email, 'overdue', account);
        case 'account_created':
        default:
          return await this.createAccountAndProfiles(contact, account, players);
      }

    } catch (error) {
      console.error('GoHighLevel webhook processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update payment status for existing account
   */
  private async updatePaymentStatus(email: string, paymentStatus: 'paid' | 'pending' | 'overdue', accountData?: any): Promise<{ success: boolean; message: string }> {
    try {
      // Find existing account by email
      const account = await storage.getAccountByEmail(email);
      if (!account) {
        return { success: false, message: 'Account not found' };
      }

      // Update payment status and registration status
      const registrationStatus = paymentStatus === 'paid' ? 'active' : 'payment_required';
      
      // Generate magic link token if not provided (for authentication links in emails)
      let magicLinkToken = accountData?.magic_link_token;
      let magicLinkExpires = accountData?.expires_at ? new Date(accountData.expires_at) : undefined;
      
      if (!magicLinkToken) {
        const { token, expires } = this.generateMagicLinkToken();
        magicLinkToken = token;
        magicLinkExpires = expires;
        console.log(`Generated magic link token for account ${account.id}: ...${token.slice(-4)}`);
      }
      
      await storage.updateAccount(account.id, {
        paymentStatus,
        registrationStatus,
        magicLinkToken,
        magicLinkExpires
      });

      console.log(`Updated payment status to ${paymentStatus} for account:`, account.id);
      
      // Build properly formatted magic link URL
      const baseUrl = process.env.REPLIT_DOMAINS ? 
        `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
        'http://localhost:5000';
      const magicLinkUrl = `${baseUrl}/api/auth/magic-link/${magicLinkToken}`;
      
      return {
        success: true,
        paymentStatus,
        registrationStatus,
        magic_link_url: magicLinkUrl,
        magic_link_expires: magicLinkExpires?.toISOString(),
        message: `Payment status updated to ${paymentStatus}`
      };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * Create account and profiles from webhook data
   */
  private async createAccountAndProfiles(contact: any, accountData?: any, playersData?: any[]): Promise<{ success: boolean; message: string }> {
    try {
      // Extract parent and player data from contact
      const parentData = {
        email: contact.email,
        firstName: contact.first_name || contact.firstName,
        lastName: contact.last_name || contact.lastName,
        phoneNumber: contact.phone || '',
      };

      // Extract player data from webhook or contact custom fields
      const players = playersData || this.extractPlayersFromContact(contact);

      if (players.length === 0) {
        console.log('No player data found in contact, skipping profile creation');
        return { success: true, message: 'No player data found' };
      }

      // Create account with payment info
      const accountId = await this.getOrCreateAccount(contact.email, parentData, accountData);

      // Create parent profile
      const parentProfile = await this.getOrCreateParentProfile(accountId, parentData);

      // Create player profiles and relationships
      const createdPlayers = [];
      for (const playerData of players) {
        if (playerData.first_name && playerData.last_name) {
          const playerProfile = await storage.createProfile({
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            accountId: accountId,
            profileType: 'player',
            firstName: playerData.first_name,
            lastName: playerData.last_name,
            dateOfBirth: playerData.dateOfBirth,
            schoolGrade: playerData.schoolGrade?.toString()
          });
          createdPlayers.push(playerProfile);

          // Create parent-player relationship
          await storage.createProfileRelationship({
            accountId: accountId,
            parentProfileId: parentProfile.id,
            playerProfileId: playerProfile.id,
            relationship: 'parent'
          });

          console.log('Created player profile and relationship:', playerProfile.id);
        }
      }

      return {
        success: true,
        message: `Created profiles for ${createdPlayers.length} players`
      };
    } catch (error) {
      console.error('Error creating account and profiles:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Creation failed'
      };
    }
  }

  /**
   * Sync profiles on-demand by email
   */
  async syncByEmail(email: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('On-demand sync requested for email:', email);
      
      // Check if user already has profiles 
      try {
        const existingProfiles = await storage.getAccountProfiles(userId);
        if (existingProfiles.length > 0) {
          return {
            success: true,
            message: `Found ${existingProfiles.length} existing profiles, no sync needed`
          };
        }
      } catch (error) {
        console.log('No existing profiles found, will attempt sync');
      }

      // TODO: In a real implementation, we would call the GoHighLevel API here
      // For now, simulate that no contact was found in GoHighLevel
      console.log('Would attempt to fetch contact from GoHighLevel API for:', email);
      
      return {
        success: false,
        message: 'Contact not found in GoHighLevel - please ensure your data has been processed'
      };
    } catch (error) {
      console.error('GoHighLevel sync error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Extract player data from GoHighLevel contact custom fields
   */
  private extractPlayersFromContact(contact: GoHighLevelContact): PlayerData[] {
    const players: PlayerData[] = [];
    
    if (!contact.customFields) {
      return players;
    }

    // Look for player data in custom fields
    // This assumes GoHighLevel has custom fields like: player1_first_name, player1_last_name, etc.
    for (let i = 1; i <= 5; i++) { // Support up to 5 players per family
      const firstName = contact.customFields[`player${i}_first_name`] || contact.customFields[`player_${i}_first_name`];
      const lastName = contact.customFields[`player${i}_last_name`] || contact.customFields[`player_${i}_last_name`];
      const dob = contact.customFields[`player${i}_dob`] || contact.customFields[`player_${i}_dob`];
      const grade = contact.customFields[`player${i}_grade`] || contact.customFields[`player_${i}_grade`];

      if (firstName && lastName) {
        players.push({
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          dateOfBirth: dob ? String(dob).trim() : undefined,
          schoolGrade: grade ? parseInt(String(grade), 10) : undefined
        });
      }
    }

    return players;
  }

  /**
   * Get or create account (using new accounts table)
   */
  private async getOrCreateAccount(email: string, parentData: any, accountData?: any): Promise<string> {
    try {
      // Check if account already exists
      const existingAccount = await storage.getAccountByEmail(email);
      if (existingAccount) {
        console.log('Found existing account for:', email);
        return existingAccount.id;
      }
      
      // Generate magic link token for new accounts
      const { token, expires } = this.generateMagicLinkToken();
      
      // Create new account
      const accountId = `ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await storage.upsertAccount({
        id: accountId,
        email: email,
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        primaryAccountType: 'parent' as const,
        accountCompleted: true,
        registrationStatus: 'payment_required', // Default status for new accounts
        paymentStatus: 'pending',
        magicLinkToken: token,
        magicLinkExpires: expires
      });

      console.log(`Created account from GoHighLevel: ${accountId} with magic link: ...${token.slice(-4)}`);
      return accountId;
    } catch (error) {
      console.error('Error getting/creating account:', error);
      throw error;
    }
  }

  /**
   * Get or create parent profile
   */
  private async getOrCreateParentProfile(accountId: string, parentData: any) {
    try {
      // Check for existing parent profile
      const profiles = await storage.getAccountProfiles(accountId);
      const existingParent = profiles.find(p => p.profileType === 'parent');
      
      if (existingParent) {
        console.log('Found existing parent profile:', existingParent.id);
        return existingParent;
      }

      // Create new parent profile
      const parentProfile = await storage.createProfile({
        id: `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        accountId: accountId,
        profileType: 'parent',
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        phoneNumber: parentData.phoneNumber
      });

      console.log('Created new parent profile:', parentProfile.id);
      return parentProfile;
    } catch (error) {
      console.error('Error getting/creating parent profile:', error);
      throw error;
    }
  }
}

export const goHighLevelService = new GoHighLevelService();