// Mock SportsEngine data for development
// This simulates real SportsEngine API responses for testing

export interface SportsEngineTeam {
  id: string;
  name: string;
  ageGroup: string;
  season: string;
  division: string;
  coachId: string;
  coachName: string;
  playerCount: number;
}

export interface SportsEnginePlayer {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  jerseyNumber?: number;
  position?: string;
  parentEmail: string;
  parentPhone: string;
  teamId: string;
  registrationStatus: 'active' | 'pending' | 'inactive';
  registrationDate: string;
}

export interface SportsEnginePayment {
  id: string;
  playerId: string;
  amount: number;
  description: string;
  type: 'registration' | 'uniform' | 'tournament' | 'equipment' | 'other';
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  dueDate: string;
  paidDate?: string;
  invoiceId: string;
}

export interface SportsEngineEvent {
  id: string;
  title: string;
  type: 'game' | 'practice' | 'tournament' | 'team_event';
  startTime: string;
  endTime: string;
  location: string;
  teamId: string;
  opponent?: string;
  isHome: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
}

// Mock data that represents UYP Basketball League
export const mockSportsEngineData = {
  teams: [
    {
      id: "se_team_001",
      name: "Thunder",
      ageGroup: "U10",
      season: "2024-25",
      division: "Recreational",
      coachId: "coach_001",
      coachName: "Coach Martinez",
      playerCount: 8
    },
    {
      id: "se_team_002", 
      name: "Lightning",
      ageGroup: "U12",
      season: "2024-25", 
      division: "Competitive",
      coachId: "coach_002",
      coachName: "Coach Johnson",
      playerCount: 10
    },
    {
      id: "se_team_003",
      name: "Storm",
      ageGroup: "U8", 
      season: "2024-25",
      division: "Recreational",
      coachId: "coach_003",
      coachName: "Coach Davis",
      playerCount: 6
    }
  ] as SportsEngineTeam[],

  players: [
    {
      id: "se_player_001",
      firstName: "Bob",
      lastName: "Chen", 
      dateOfBirth: "2016-03-15",
      jerseyNumber: 23,
      position: "Guard",
      parentEmail: "meadowsrjack@gmail.com",
      parentPhone: "(714) 555-0123",
      teamId: "se_team_002",
      registrationStatus: "active",
      registrationDate: "2024-08-15"
    },
    {
      id: "se_player_002", 
      firstName: "Dora",
      lastName: "Chen",
      dateOfBirth: "2018-07-22",
      jerseyNumber: 15,
      position: "Forward", 
      parentEmail: "meadowsrjack@gmail.com",
      parentPhone: "(714) 555-0123",
      teamId: "se_team_003",
      registrationStatus: "active", 
      registrationDate: "2024-08-15"
    },
    {
      id: "se_player_003",
      firstName: "Marcus",
      lastName: "Johnson",
      dateOfBirth: "2015-11-08", 
      jerseyNumber: 7,
      position: "Center",
      parentEmail: "mjohnson@email.com",
      parentPhone: "(714) 555-0456",
      teamId: "se_team_002",
      registrationStatus: "active",
      registrationDate: "2024-08-20"
    }
  ] as SportsEnginePlayer[],

  payments: [
    {
      id: "se_pay_001",
      playerId: "se_player_001", 
      amount: 250.00,
      description: "Fall Season Registration - Bob Chen",
      type: "registration",
      status: "paid",
      dueDate: "2024-09-01",
      paidDate: "2024-08-20",
      invoiceId: "INV-2024-001"
    },
    {
      id: "se_pay_002",
      playerId: "se_player_002",
      amount: 250.00, 
      description: "Fall Season Registration - Dora Chen", 
      type: "registration",
      status: "paid",
      dueDate: "2024-09-01",
      paidDate: "2024-08-20", 
      invoiceId: "INV-2024-002"
    },
    {
      id: "se_pay_003",
      playerId: "se_player_001",
      amount: 45.00,
      description: "Team Uniform - Bob Chen",
      type: "uniform", 
      status: "pending",
      dueDate: "2024-10-15",
      invoiceId: "INV-2024-015"
    },
    {
      id: "se_pay_004",
      playerId: "se_player_002", 
      amount: 45.00,
      description: "Team Uniform - Dora Chen",
      type: "uniform",
      status: "overdue",
      dueDate: "2024-10-15", 
      invoiceId: "INV-2024-016"
    },
    {
      id: "se_pay_005",
      playerId: "se_player_001",
      amount: 75.00,
      description: "Winter Tournament Entry",
      type: "tournament",
      status: "pending", 
      dueDate: "2024-11-30",
      invoiceId: "INV-2024-035"
    }
  ] as SportsEnginePayment[],

  events: [
    {
      id: "se_event_001",
      title: "Practice - Lightning vs Skills Training",
      type: "practice", 
      startTime: "2024-11-20T18:00:00",
      endTime: "2024-11-20T19:30:00",
      location: "Momentous Sports Center - Court A",
      teamId: "se_team_002",
      isHome: true,
      status: "scheduled"
    },
    {
      id: "se_event_002", 
      title: "Lightning vs Thunder",
      type: "game",
      startTime: "2024-11-23T10:00:00", 
      endTime: "2024-11-23T11:30:00",
      location: "Momentous Sports Center - Court B",
      teamId: "se_team_002",
      opponent: "Thunder", 
      isHome: true,
      status: "scheduled"
    },
    {
      id: "se_event_003",
      title: "Storm Team Practice",
      type: "practice",
      startTime: "2024-11-21T17:00:00",
      endTime: "2024-11-21T18:00:00", 
      location: "Momentous Sports Center - Court A",
      teamId: "se_team_003",
      isHome: true,
      status: "scheduled"
    },
    {
      id: "se_event_004",
      title: "Winter Tournament - Round 1", 
      type: "tournament",
      startTime: "2024-12-07T09:00:00",
      endTime: "2024-12-07T17:00:00",
      location: "Orange County Sports Complex",
      teamId: "se_team_002",
      isHome: false,
      status: "scheduled"
    }
  ] as SportsEngineEvent[]
};

// Mock API functions that simulate SportsEngine API calls
export class MockSportsEngineAPI {
  static async getTeams(orgId: string): Promise<SportsEngineTeam[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockSportsEngineData.teams;
  }

  static async getPlayers(teamId?: string): Promise<SportsEnginePlayer[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (teamId) {
      return mockSportsEngineData.players.filter(p => p.teamId === teamId);
    }
    return mockSportsEngineData.players;
  }

  static async getPayments(playerId?: string): Promise<SportsEnginePayment[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (playerId) {
      return mockSportsEngineData.payments.filter(p => p.playerId === playerId);
    }
    return mockSportsEngineData.payments;
  }

  static async getEvents(teamId?: string): Promise<SportsEngineEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 100)); 
    if (teamId) {
      return mockSportsEngineData.events.filter(e => e.teamId === teamId);
    }
    return mockSportsEngineData.events;
  }

  static async createPaymentIntent(amount: number, description: string): Promise<{clientSecret: string, paymentId: string}> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      clientSecret: `pi_mock_${Date.now()}_secret`,
      paymentId: `pay_mock_${Date.now()}`
    };
  }
}