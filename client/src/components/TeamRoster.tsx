import React from 'react';
import { Users, User, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';

interface TeamData {
  id: number;
  name: string;
  ageGroup: string;
  division?: string;
  coachNames?: string;
  players: Array<{
    id: string;
    fullName: string;
    jerseyNumber?: string;
    photoUrl?: string;
  }>;
}

interface TeamRosterProps {
  teamId: number;
}

export default function TeamRoster({ teamId }: TeamRosterProps) {
  const { data: team, isLoading, error } = useQuery<TeamData>({
    queryKey: ['/api/teams', teamId],
  });

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Users className="h-16 w-16 text-gray-400 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">Team Not Found</h3>
            <p className="text-gray-600">
              Unable to load team information at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-red-600" />
            {team.name}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{team.ageGroup}</Badge>
            {team.division && (
              <Badge variant="outline">{team.division}</Badge>
            )}
            {team.coachNames && (
              <Badge variant="secondary">Coach: {team.coachNames}</Badge>
            )}
            <Badge className="bg-red-50 text-red-700 border-red-200">
              {team.players.length} Players
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Roster Grid */}
      {team.players.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <User className="h-16 w-16 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">No Players</h3>
              <p className="text-gray-600">
                This team doesn't have any players yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Roster ({team.players.length} players)
          </h3>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.players.map((player) => (
              <Card key={player.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={player.photoUrl} 
                        alt={player.fullName}
                      />
                      <AvatarFallback className="bg-red-100 text-red-700 font-semibold">
                        {getPlayerInitials(player.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {player.fullName}
                      </h4>
                      {player.jerseyNumber && (
                        <Badge variant="outline" className="mt-1">
                          #{player.jerseyNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Team Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Team Details</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Age Group:</dt>
                  <dd className="font-medium">{team.ageGroup}</dd>
                </div>
                {team.division && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Division:</dt>
                    <dd className="font-medium">{team.division}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Players:</dt>
                  <dd className="font-medium">{team.players.length}</dd>
                </div>
              </dl>
            </div>
            
            {team.coachNames && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Coaching Staff</h4>
                <p className="text-sm text-gray-600">{team.coachNames}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}