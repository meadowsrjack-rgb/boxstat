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
      // Extract parent and player data from contact - support multiple field name formats
      const parentData = {
        email: contact.email,
        firstName: contact.first_name || contact.firstName || contact.parent_first_name || '',
        lastName: contact.last_name || contact.lastName || contact.parent_last_name || '',
        phoneNumber: contact.phone || contact.phoneNumber || contact.parent_phone || '',
      };

      console.log('Extracted parent data:', JSON.stringify(parentData, null, 2));

      // Extract player data from webhook or contact custom fields
      const players = playersData || this.extractPlayersFromContact(contact);

      console.log('Extracted players data:', JSON.stringify(players, null, 2));

      if (players.length === 0) {
        console.log('No player data found in contact, checking for single player in contact root');
        // Check if player data is in the root contact object
        if (contact.player_first_name || contact.child_first_name) {
          players.push({
            firstName: contact.player_first_name || contact.child_first_name,
            lastName: contact.player_last_name || contact.child_last_name || parentData.lastName,
            dateOfBirth: contact.player_dob || contact.child_dob,
            schoolGrade: contact.player_grade || contact.child_grade || contact.grade
          });
        }
      }

      if (players.length === 0) {
        console.log('Still no player data found, proceeding with parent-only account');
      }

      // Create account with payment info
      const accountId = await this.getOrCreateAccount(contact.email, parentData, accountData);

      // Create parent profile with proper data
      const parentProfile = await this.getOrCreateParentProfile(accountId, parentData);

      // Create player profiles and relationships
      const createdPlayers = [];
      for (const playerData of players) {
        if (playerData.firstName) {
          const playerProfile = await storage.createProfile({
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            accountId: accountId,
            profileType: 'player',
            firstName: playerData.firstName,
            lastName: playerData.lastName || parentData.lastName, // Default to parent last name
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

          console.log('Created player profile and relationship:', playerProfile.id, playerData.firstName, playerData.lastName);
        }
      }

      return {
        success: true,
        message: `Created account and profiles: 1 parent + ${createdPlayers.length} players`
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
  private extractPlayersFromContact(contact: any): any[] {
    const players: any[] = [];
    
    // First check for direct player data in the contact object
    const directPlayerFields = [
      'player_first_name', 'child_first_name', 'student_first_name',
      'player1_first_name', 'child1_first_name'
    ];
    
    for (const field of directPlayerFields) {
      if (contact[field]) {
        const lastNameField = field.replace('first_name', 'last_name');
        const dobField = field.replace('first_name', 'dob');
        const gradeField = field.replace('first_name', 'grade');
        
        players.push({
          firstName: String(contact[field]).trim(),
          lastName: contact[lastNameField] ? String(contact[lastNameField]).trim() : '',
          dateOfBirth: contact[dobField] ? String(contact[dobField]).trim() : undefined,
          schoolGrade: contact[gradeField] ? parseInt(String(contact[gradeField]), 10) : undefined
        });
      }
    }

    // Then check custom fields if they exist
    if (contact.customFields) {
      // Support multiple naming conventions for player data
      const fieldVariations = [
        'player', 'child', 'student', 'kid'
      ];
      
      for (const variation of fieldVariations) {
        for (let i = 1; i <= 5; i++) { // Support up to 5 players per family
          const fieldPatterns = [
            `${variation}${i}_first_name`,
            `${variation}_${i}_first_name`,
            `${variation}${i}FirstName`,
            `${variation}_${i}_firstName`
          ];
          
          for (const pattern of fieldPatterns) {
            const firstName = contact.customFields[pattern];
            if (firstName) {
              const lastNamePattern = pattern.replace(/first.*name/i, 'last_name');
              const dobPattern = pattern.replace(/first.*name/i, 'dob');
              const gradePattern = pattern.replace(/first.*name/i, 'grade');
              
              players.push({
                firstName: String(firstName).trim(),
                lastName: contact.customFields[lastNamePattern] ? String(contact.customFields[lastNamePattern]).trim() : '',
                dateOfBirth: contact.customFields[dobPattern] ? String(contact.customFields[dobPattern]).trim() : undefined,
                schoolGrade: contact.customFields[gradePattern] ? parseInt(String(contact.customFields[gradePattern]), 10) : undefined
              });
              break; // Found this player, move to next number
            }
          }
        }
      }
    }

    // Remove duplicates and empty names
    const uniquePlayers = players.filter((player, index, arr) => 
      player.firstName && 
      arr.findIndex(p => p.firstName === player.firstName && p.lastName === player.lastName) === index
    );

    return uniquePlayers;
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
        
        // Update existing account with parent data if missing
        if (!existingAccount.firstName || !existingAccount.lastName) {
          console.log('Updating existing account with parent data');
          await storage.updateAccount(existingAccount.id, {
            firstName: parentData.firstName,
            lastName: parentData.lastName
          });
        }
        
        return existingAccount.id;
      }
      
      // Generate magic link token for new accounts
      const { token, expires } = this.generateMagicLinkToken();
      
      // Create new account with proper parent data
      const accountId = `ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Creating new account with parent data:', {
        email,
        firstName: parentData.firstName,
        lastName: parentData.lastName,
        phoneNumber: parentData.phoneNumber
      });
      
      await storage.upsertAccount({
        id: accountId,
        email: email,
        firstName: parentData.firstName || '',
        lastName: parentData.lastName || '',
        primaryAccountType: 'parent' as const,
        accountCompleted: true,
        registrationStatus: 'payment_required', // Default status for new accounts
        paymentStatus: 'pending',
        magicLinkToken: token,
        magicLinkExpires: expires
      });

      console.log(`Created account from GoHighLevel: ${accountId} for ${parentData.firstName} ${parentData.lastName} (${email})`);
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