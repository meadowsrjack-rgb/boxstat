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

export default router;