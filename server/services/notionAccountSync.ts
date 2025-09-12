import { fetchNotionPeople, type NotionPersonData } from '../lib/notion-adapter.js';
import type { IStorage } from '../storage-impl.js';
import { storage } from '../storage-impl.js';

interface AccountGroup {
  email: string;
  people: NotionPersonData[];
  primaryType: 'parent' | 'player' | 'coach';
  registrationStatus: 'pending' | 'active' | 'payment_required';
}

export class NotionAccountSyncService {
  private storage: IStorage = storage;

  /**
   * Main sync method - fetches from Notion and creates/updates accounts
   */
  async syncAccountsFromNotion(): Promise<{ 
    accountsCreated: number; 
    profilesCreated: number; 
    relationshipsCreated: number; 
  }> {
    console.log('Starting Notion account sync...');
    
    try {
      // Fetch all people from Notion
      const people = await fetchNotionPeople();
      console.log(`Fetched ${people.length} people from Notion`);

      // Group people by email
      const accountGroups = this.groupPeopleByEmail(people);
      console.log(`Found ${accountGroups.length} unique accounts`);

      let accountsCreated = 0;
      let profilesCreated = 0;
      let relationshipsCreated = 0;

      // Create accounts and profiles for each email group
      for (const group of accountGroups) {
        try {
          const account = await this.createAccountFromGroup(group);
          accountsCreated++;

          const profiles = await this.createProfilesFromGroup(account.id, group);
          profilesCreated += profiles.length;

          const relationships = await this.createRelationships(account.id, profiles);
          relationshipsCreated += relationships.length;

          console.log(`Created account ${account.email} with ${profiles.length} profiles`);
        } catch (error) {
          console.error(`Failed to create account for ${group.email}:`, error);
        }
      }

      console.log(`Account sync completed: ${accountsCreated} accounts, ${profilesCreated} profiles, ${relationshipsCreated} relationships`);

      return {
        accountsCreated,
        profilesCreated,
        relationshipsCreated
      };
    } catch (error) {
      console.error('Notion account sync failed:', error);
      throw error;
    }
  }

  /**
   * Group Notion people by email address
   */
  private groupPeopleByEmail(people: NotionPersonData[]): AccountGroup[] {
    const groups = new Map<string, NotionPersonData[]>();

    // Group by email
    for (const person of people) {
      if (!person.email) {
        console.warn(`Skipping person ${person.fullName} - no email provided`);
        continue;
      }

      const email = person.email.toLowerCase().trim();
      if (!groups.has(email)) {
        groups.set(email, []);
      }
      groups.get(email)!.push(person);
    }

    // Convert to AccountGroup format
    const accountGroups: AccountGroup[] = [];
    for (const [email, peopleGroup] of Array.from(groups.entries())) {
      // Determine primary account type - prefer parent > coach > player
      let primaryType: 'parent' | 'player' | 'coach' = 'player';
      let registrationStatus: 'pending' | 'active' | 'payment_required' = 'pending';

      for (const person of peopleGroup) {
        // Set primary type based on priority
        if (person.personType === 'parent') {
          primaryType = 'parent';
        } else if (person.personType === 'coach' && primaryType !== 'parent') {
          primaryType = 'coach';
        }

        // Set most active registration status
        if (person.registrationStatus === 'active') {
          registrationStatus = 'active';
        } else if (person.registrationStatus === 'payment_required' && registrationStatus !== 'active') {
          registrationStatus = 'payment_required';
        }
      }

      accountGroups.push({
        email,
        people: peopleGroup,
        primaryType,
        registrationStatus
      });
    }

    return accountGroups;
  }

  /**
   * Create an account from a grouped set of people
   */
  private async createAccountFromGroup(group: AccountGroup) {
    return await this.storage.upsertAccountFromNotion(group.email, {
      primaryAccountType: group.primaryType,
      registrationStatus: group.registrationStatus
    });
  }

  /**
   * Create profiles for all people in an account group
   */
  private async createProfilesFromGroup(accountId: string, group: AccountGroup) {
    const profiles = [];

    for (const person of group.people) {
      try {
        // Parse age from DOB if available
        let age = person.age;
        if (!age && person.dob) {
          const birthDate = new Date(person.dob);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
        }

        const profile = await this.storage.upsertProfileFromNotion(accountId, {
          notionId: person.notionId,
          fullName: person.fullName,
          personType: person.personType,
          dob: person.dob,
          age,
          jerseyNumber: person.jerseyNumber,
          photoUrl: person.photoUrl,
          teamId: undefined, // Will be set by team mapping logic
          phoneNumber: person.phoneNumber
        });

        profiles.push(profile);
      } catch (error) {
        console.error(`Failed to create profile for ${person.fullName}:`, error);
      }
    }

    return profiles;
  }

  /**
   * Create relationships between parent and player profiles in the same account
   */
  private async createRelationships(accountId: string, profiles: any[]) {
    const relationships = [];
    const parentProfiles = profiles.filter(p => p.profileType === 'parent');
    const playerProfiles = profiles.filter(p => p.profileType === 'player');

    // Link all parents to all players in the same account
    for (const parent of parentProfiles) {
      for (const player of playerProfiles) {
        try {
          const relationship = await this.storage.linkParentPlayer(
            accountId,
            parent.id,
            player.id
          );
          relationships.push(relationship);
        } catch (error) {
          console.error(`Failed to create relationship between ${parent.id} and ${player.id}:`, error);
        }
      }
    }

    return relationships;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    try {
      const accounts = await this.storage.getAccounts();
      const profiles = await this.storage.getProfiles();
      
      return {
        totalAccounts: accounts.length,
        totalProfiles: profiles.length,
        accountsByType: {
          parent: accounts.filter(a => a.primaryAccountType === 'parent').length,
          player: accounts.filter(a => a.primaryAccountType === 'player').length,
          coach: accounts.filter(a => a.primaryAccountType === 'coach').length,
        },
        profilesByType: {
          parent: profiles.filter(p => p.profileType === 'parent').length,
          player: profiles.filter(p => p.profileType === 'player').length,
          coach: profiles.filter(p => p.profileType === 'coach').length,
        }
      };
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notionAccountSync = new NotionAccountSyncService();