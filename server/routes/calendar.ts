import { Router } from "express";
import { syncGoogleCalendarEvents, scheduledCalendarSync } from "../google-calendar";
import { storage } from "../storage";

const router = Router();

// Manual calendar sync endpoint
router.post("/sync", async (req, res) => {
  try {
    await syncGoogleCalendarEvents();
    res.json({ 
      success: true, 
      message: "Calendar sync completed successfully" 
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Calendar sync failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get all synced events
router.get("/events", async (req, res) => {
  try {
    // Get events from the last 30 days and next 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    
    const events = await storage.getEventsInDateRange(startDate, endDate);
    
    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        teamId: event.teamId,
        opponentTeam: event.opponentTeam,
        googleEventId: event.googleEventId,
        lastSyncedAt: event.lastSyncedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch events",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get events for a specific team
router.get("/events/team/:teamId", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const events = await storage.getTeamEvents(teamId);
    
    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Error fetching team events:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch team events",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Trigger scheduled sync (for testing/manual triggering)
router.post("/sync/scheduled", async (req, res) => {
  try {
    await scheduledCalendarSync();
    res.json({ 
      success: true, 
      message: "Scheduled calendar sync completed" 
    });
  } catch (error) {
    console.error("Scheduled sync error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Scheduled sync failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;