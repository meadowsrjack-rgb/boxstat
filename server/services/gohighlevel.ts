import { storage } from '../storage';

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
   * Process webhook data from GoHighLevel to create/update profiles
   */
  async processWebhook(webhookData: GoHighLevelWebhookData): Promise<{ success: boolean; message: string }> {
    try {
      const { contact, event_type } = webhookData;
      
      if (!contact?.email) {
        throw new Error('Contact email is required');
      }

      console.log('Processing GoHighLevel webhook:', event_type, 'for contact:', contact.email);

      // Extract parent and player data from contact
      const parentData = {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phoneNumber: contact.phone || '',
      };

      // Extract player data from custom fields
      const players = this.extractPlayersFromContact(contact);

      if (players.length === 0) {
        console.log('No player data found in contact, skipping profile creation');
        return { success: true, message: 'No player data found' };
      }

      // Create account
      const accountId = await this.getOrCreateAccount(contact.email, parentData);

      // Create parent profile
      const parentProfile = await this.getOrCreateParentProfile(accountId, parentData);

      // Create player profiles and relationships
      const createdPlayers = [];
      for (const playerData of players) {
        if (playerData.firstName && playerData.lastName) {
          const playerProfile = await storage.createProfile({
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            accountId: accountId,
            profileType: 'player',
            firstName: playerData.firstName,
            lastName: playerData.lastName,
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
      console.error('GoHighLevel webhook processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
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
  private async getOrCreateAccount(email: string, parentData: any): Promise<string> {
    try {
      // Create new account (or update existing one)
      const accountId = `ghl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await storage.upsertAccount({
        id: accountId,
        email: email,
        primaryAccountType: 'parent' as const,
        accountCompleted: true
      });

      console.log('Created/updated account from GoHighLevel:', accountId);
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