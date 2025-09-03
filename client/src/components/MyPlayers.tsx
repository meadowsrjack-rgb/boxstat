import React, { useState } from 'react';
import { Plus, Calendar, Users, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import SearchClaimPlayer from './SearchClaimPlayer';
import { useAuth } from '@/hooks/useAuth';

interface ClaimedPlayer {
  id: string;
  fullName: string;
  teamName?: string;
  jerseyNumber?: string;
  photoUrl?: string;
  teamId?: number;
  status: string;
}

export default function MyPlayers() {
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const { user } = useAuth();

  // Fetch user's claimed players
  const { data: players = [], isLoading } = useQuery({
    queryKey: ['/api/users', user?.id, 'players'],
    enabled: !!user?.id,
  });

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">My Players</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Players</h2>
          <p className="text-gray-600 mt-1">
            {players.length === 0 
              ? "You haven't claimed any players yet" 
              : `Managing ${players.length} player${players.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        
        <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center gap-2"
              data-testid="add-player-button"
            >
              <Plus className="h-4 w-4" />
              Add Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Player to Your Family</DialogTitle>
            </DialogHeader>
            <SearchClaimPlayer />
          </DialogContent>
        </Dialog>
      </div>

      {players.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <User className="h-16 w-16 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Players Added</h3>
                <p className="text-gray-600 mt-2 max-w-sm mx-auto">
                  Search for your child in the UYP roster and claim their profile to get started.
                </p>
              </div>
              <Button 
                onClick={() => setShowClaimDialog(true)}
                className="mt-4"
                data-testid="empty-state-add-player"
              >
                <Plus className="h-4 w-4 mr-2" />
                Find My Player
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Player Header */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={player.photoUrl} 
                        alt={player.fullName}
                      />
                      <AvatarFallback className="bg-red-100 text-red-700 font-semibold">
                        {getPlayerInitials(player.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {player.fullName}
                      </h3>
                      {player.teamName && (
                        <p className="text-gray-600">{player.teamName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {player.jerseyNumber && (
                          <Badge variant="outline">
                            #{player.jerseyNumber}
                          </Badge>
                        )}
                        <Badge 
                          variant={player.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {player.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      data-testid={`view-schedule-${player.id}`}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                    
                    {player.teamId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        data-testid={`view-team-${player.id}`}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Team
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      data-testid={`view-progress-${player.id}`}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      Progress
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}