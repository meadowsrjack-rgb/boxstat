import { Router } from 'express';
import { MockSportsEngineAPI } from './sportsengine-mock';
import { isAuthenticated } from './replitAuth';

const router = Router();

// Get teams for the organization
router.get('/teams', isAuthenticated, async (req, res) => {
  try {
    const teams = await MockSportsEngineAPI.getTeams('uyp_basketball');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get players for a specific team or all players
router.get('/players', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.query;
    const players = await MockSportsEngineAPI.getPlayers(teamId as string);
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get payments for a specific player or all payments
router.get('/payments', isAuthenticated, async (req, res) => {
  try {
    const { playerId } = req.query;
    const payments = await MockSportsEngineAPI.getPayments(playerId as string);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get events for a specific team or all events
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.query;
    const events = await MockSportsEngineAPI.getEvents(teamId as string);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create payment intent for SportsEngine payment
router.post('/payment-intent', isAuthenticated, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    if (!amount || !description) {
      return res.status(400).json({ error: 'Amount and description are required' });
    }

    const paymentIntent = await MockSportsEngineAPI.createPaymentIntent(amount, description);
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Get player payments by parent email (matches our auth user)
router.get('/my-payments', isAuthenticated, async (req, res) => {
  try {
    const userEmail = (req as any).user?.claims?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Get all players and find ones belonging to this parent
    const allPlayers = await MockSportsEngineAPI.getPlayers();
    const myPlayers = allPlayers.filter(player => player.parentEmail === userEmail);
    
    // Get payments for all my players
    const allPayments = await MockSportsEngineAPI.getPayments();
    const myPayments = allPayments.filter(payment => 
      myPlayers.some(player => player.id === payment.playerId)
    );

    // Enrich payments with player info
    const enrichedPayments = myPayments.map(payment => {
      const player = myPlayers.find(p => p.id === payment.playerId);
      return {
        ...payment,
        playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player'
      };
    });

    res.json(enrichedPayments);
  } catch (error) {
    console.error('Error fetching my payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get my children's teams and events
router.get('/my-teams', isAuthenticated, async (req, res) => {
  try {
    const userEmail = (req as any).user?.claims?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Get all players and find ones belonging to this parent
    const allPlayers = await MockSportsEngineAPI.getPlayers();
    const myPlayers = allPlayers.filter(player => player.parentEmail === userEmail);
    
    // Get teams for my players
    const allTeams = await MockSportsEngineAPI.getTeams('uyp_basketball');
    const myTeams = allTeams.filter(team =>
      myPlayers.some(player => player.teamId === team.id)
    );

    // Enrich teams with player info
    const enrichedTeams = myTeams.map(team => {
      const teamPlayers = myPlayers.filter(player => player.teamId === team.id);
      return {
        ...team,
        myPlayers: teamPlayers
      };
    });

    res.json(enrichedTeams);
  } catch (error) {
    console.error('Error fetching my teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Roster management endpoints
router.get('/roster/:eventId', isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const rosterSpots = await MockSportsEngineAPI.getRosterSpots(eventId);
    
    // Enrich with player details
    const allPlayers = await MockSportsEngineAPI.getPlayers();
    const enrichedRoster = rosterSpots.map(spot => {
      const player = allPlayers.find(p => p.id === spot.playerId);
      return {
        ...spot,
        playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player',
        playerDetails: player
      };
    });
    
    res.json(enrichedRoster);
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

router.put('/roster/:rosterId/status', isAuthenticated, async (req, res) => {
  try {
    const { rosterId } = req.params;
    const { status, notes } = req.body;
    
    if (!['confirmed', 'declined', 'unavailable'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updatedSpot = await MockSportsEngineAPI.updateRosterStatus(rosterId, status, notes);
    res.json(updatedSpot);
  } catch (error) {
    console.error('Error updating roster status:', error);
    res.status(500).json({ error: 'Failed to update roster status' });
  }
});

// Schedule management endpoints
router.get('/schedule-requests', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.query;
    const requests = await MockSportsEngineAPI.getScheduleRequests(teamId as string);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching schedule requests:', error);
    res.status(500).json({ error: 'Failed to fetch schedule requests' });
  }
});

router.post('/schedule-requests', isAuthenticated, async (req, res) => {
  try {
    const userEmail = (req as any).user?.claims?.email;
    const requestData = {
      ...req.body,
      requestedBy: userEmail
    };
    
    const newRequest = await MockSportsEngineAPI.createScheduleRequest(requestData);
    res.json(newRequest);
  } catch (error) {
    console.error('Error creating schedule request:', error);
    res.status(500).json({ error: 'Failed to create schedule request' });
  }
});

router.put('/schedule-requests/:requestId', isAuthenticated, async (req, res) => {
  try {
    const { requestId } = req.params;
    const updates = req.body;
    
    const updatedRequest = await MockSportsEngineAPI.updateScheduleRequest(requestId, updates);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error updating schedule request:', error);
    res.status(500).json({ error: 'Failed to update schedule request' });
  }
});

// Get events with roster management
router.get('/events-with-roster', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.query;
    const events = await MockSportsEngineAPI.getEvents(teamId as string);
    
    // Get roster information for each event
    const eventsWithRoster = await Promise.all(
      events.map(async (event) => {
        const rosterSpots = await MockSportsEngineAPI.getRosterSpots(event.id);
        const allPlayers = await MockSportsEngineAPI.getPlayers();
        
        const roster = rosterSpots.map(spot => {
          const player = allPlayers.find(p => p.id === spot.playerId);
          return {
            ...spot,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player'
          };
        });
        
        return {
          ...event,
          roster,
          rosterStats: {
            total: roster.length,
            confirmed: roster.filter(r => r.status === 'confirmed').length,
            pending: roster.filter(r => r.status === 'pending').length,
            declined: roster.filter(r => r.status === 'declined').length
          }
        };
      })
    );
    
    res.json(eventsWithRoster);
  } catch (error) {
    console.error('Error fetching events with roster:', error);
    res.status(500).json({ error: 'Failed to fetch events with roster' });
  }
});

export default router;