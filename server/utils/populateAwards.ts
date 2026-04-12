import { AWARDS } from "@shared/awards.registry";
import type { InsertAwardDefinition } from "@shared/schema";
import type { IStorage } from "../storage";

/**
 * Populates the award_definitions table with all 99 awards from the registry
 * Maps iconName to image URLs and sets up proper trigger logic
 */
export async function populateAwards(storage: IStorage, organizationId: string) {
  console.log("🏆 Starting award population...");
  
  // Check if awards already exist
  const existingAwards = await storage.getAwardDefinitions(organizationId);

  let created = 0;
  let skipped = 0;

  for (const award of AWARDS) {
    try {
      // Map iconName to image URL (images are in /trophiesbadges/ folder)
      // Remove 'badge-' or 'trophy-' prefix from iconName to get the actual filename
      const fileName = award.iconName.replace(/^(badge|trophy)-/, '');
      const imageUrl = fileName.endsWith('.png') 
        ? `/trophiesbadges/${fileName}` 
        : `/trophiesbadges/${fileName}.png`;

      // Determine triggerCategory based on triggerSources
      const isManual = award.triggerSources?.includes("coachAward") || award.progressKind === "manual";
      const triggerCategory = isManual ? "manual" : undefined;

      // Check if this specific award already exists by name
      const exists = existingAwards.find(a => a.name === award.name);
      if (exists) {
        const updates: Partial<InsertAwardDefinition> = {};
        // Update the image URL if it has changed
        if (exists.imageUrl !== imageUrl) {
          updates.imageUrl = imageUrl;
        }
        // Fix triggerCategory if this is a coachAward and it's not already 'manual'
        if (triggerCategory === "manual" && exists.triggerCategory !== "manual") {
          updates.triggerCategory = "manual";
          console.log(`  📝 Fixed triggerCategory for "${award.name}" to 'manual'`);
        }
        if (Object.keys(updates).length > 0) {
          await storage.updateAwardDefinition(exists.id, updates);
          if (updates.imageUrl) {
            console.log(`  📝 Updated image URL for "${award.name}": ${imageUrl}`);
          }
        }
        skipped++;
        continue;
      }

      // Map award tier to database format
      const tier = award.kind; // "Trophy" or "Badge"
      
      // Map award tier (prestige) - handle naming difference
      let prestige: string = award.tier;
      if (prestige === "HallOfFamer") prestige = "HallOfFame";
      
      // Determine trigger configuration based on progressKind
      let triggerField = null;
      let triggerOperator = ">=";
      let triggerValue = null;
      let triggerType = "manual"; // default to manual

      if (award.progressKind === "counter" && award.counterOf) {
        triggerType = "count";
        triggerField = award.counterOf.stat;
        triggerValue = award.counterOf.target.toString();
      } else if (award.progressKind === "streak" && award.streakOf) {
        triggerType = "streak";
        triggerField = award.streakOf.stat;
        triggerValue = award.streakOf.target.toString();
      } else if (award.progressKind === "completeAll" && award.completeAll) {
        triggerType = "completeAll";
        triggerField = award.completeAll.setId;
      } else if (award.progressKind === "manual") {
        triggerType = "manual";
      }

      // Special handling for location-based awards
      if (award.id === "road-warrior") {
        triggerType = "location_away";
        triggerField = "awayLocationCheckins";
        triggerValue = "1";
      }

      // Special handling for online training awards
      if (award.programTag === "Foundation" || award.tags?.includes("Online")) {
        triggerType = "online_training";
      }

      // Create the award definition
      await storage.createAwardDefinition({
        name: award.name,
        tier: tier,
        class: award.category,
        prestige: prestige,
        triggerCategory: triggerCategory,
        triggerField: triggerField,
        triggerOperator: triggerOperator,
        triggerValue: triggerValue,
        triggerType: triggerType,
        description: award.description,
        imageUrl: imageUrl,
        active: true,
        organizationId: organizationId,
      });

      created++;
      
      if (created % 10 === 0) {
        console.log(`  ... ${created} awards created`);
      }
    } catch (error) {
      console.error(`❌ Error creating award "${award.name}":`, error);
    }
  }

  console.log(`✅ Award population complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${AWARDS.length}`);
}
