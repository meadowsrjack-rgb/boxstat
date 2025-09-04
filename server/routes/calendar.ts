import { Router } from "express";
import { syncGoogleCalendarEvents } from "../google-calendar";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";

// Minimal calendar router to unblock server start.
// Replace with real Google Calendar sync later.
const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, route: "calendar" });
});

router.post("/sync", async (_req, res) => {
  try {
    await syncGoogleCalendarEvents();
    res.json({ ok: true, message: "Calendar sync completed" });
  } catch (error) {
    console.error('Manual calendar sync failed:', error);
    res.status(500).json({ ok: false, message: "Calendar sync failed" });
  }
});

router.post("/scheduled-sync", (_req, res) => {
  res.json({ ok: true, message: "Scheduled calendar sync (stub)" });
});

// Geocode existing events that don't have coordinates
router.post("/geocode-events", isAuthenticated, async (req, res) => {
  try {
    const { geocodeLocation } = await import('../google-calendar');
    
    // Get all events without coordinates but with location
    const eventsToGeocode = await db.execute(
      `SELECT id, location FROM events WHERE (latitude IS NULL OR longitude IS NULL) AND location IS NOT NULL AND location != '' AND location != 'TBD'`
    );

    let geocodedCount = 0;
    let failedCount = 0;

    for (const event of eventsToGeocode.rows as any[]) {
      try {
        const coordinates = await geocodeLocation(event.location);
        if (coordinates) {
          await db.execute(
            `UPDATE events SET latitude = ${coordinates.lat}, longitude = ${coordinates.lng} WHERE id = ${event.id}`
          );
          geocodedCount++;
          console.log(`Geocoded event ${event.id}: "${event.location}" to ${coordinates.lat}, ${coordinates.lng}`);
        } else {
          failedCount++;
          console.log(`Failed to geocode event ${event.id}: "${event.location}"`);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error geocoding event ${event.id}:`, error);
      }
    }

    res.json({ 
      ok: true, 
      message: `Geocoding completed: ${geocodedCount} events geocoded, ${failedCount} failed`,
      geocodedCount,
      failedCount
    });
  } catch (error) {
    console.error('Geocoding events failed:', error);
    res.status(500).json({ ok: false, message: 'Geocoding failed' });
  }
});

export default router;
