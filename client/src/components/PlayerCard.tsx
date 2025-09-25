import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User,
  Users,
  Trophy,
  Award,
  Star,
  Calendar,
  MapPin,
  Hash,
  Ruler,
  Weight,
  Target,
  TrendingUp,
  MessageCircle,
  X
} from "lucide-react";

interface PlayerCardProps {
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
  isCoach?: boolean;
  currentUserId?: string;
}

interface PlayerProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  team_id?: number;
  jerseyNumber?: number;
  position?: string;
  dateOfBirth?: string;
  height?: string;
  age?: string;
  city?: string;
  schoolGrade?: string;
}

interface PlayerStats {
  totalBadges: number;
  totalTrophies: number;
  skillRatings: Record<string, number>;
  recentAchievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earnedAt: string;
  type: 'badge' | 'trophy';
  icon?: string;
  color?: string;
}

export default function PlayerCard({ 
  playerId, 
  isOpen, 
  onClose, 
  isCoach = false,
  currentUserId 
}: PlayerCardProps) {
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [showSkillEvaluation, setShowSkillEvaluation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get player profile details
  const { data: playerProfile, isLoading: profileLoading } = useQuery<PlayerProfile>({
    queryKey: [`/api/players/${playerId}/profile`],
    enabled: isOpen && !!playerId,
  });

  // Get player badges
  const { data: badges = [] } = useQuery({
    queryKey: [`/api/users/${playerId}/badges`],
    enabled: isOpen && !!playerId,
  });

  // Get player trophies
  const { data: trophies = [] } = useQuery({
    queryKey: [`/api/users/${playerId}/trophies`],
    enabled: isOpen && !!playerId,
  });

  // Get available awards for coaches to give
  const { data: availableAwards } = useQuery({
    queryKey: ['/api/admin/badges'],
    enabled: isCoach && showAwardDialog,
  });

  const getPlayerInitials = (profile: PlayerProfile) => {
    return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase();
  };

  const getPlayerFullName = (profile: PlayerProfile) => {
    if (profile.first_name === "🔒") {
      return "Private Profile";
    }
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  };

  const getPlayerHeaderTitle = (profile: PlayerProfile) => {
    const fullName = getPlayerFullName(profile);
    const position = profile.position ? ` | ${profile.position}` : '';
    const jerseyNumber = profile.jerseyNumber ? ` #${profile.jerseyNumber}` : '';
    return `${fullName}${position}${jerseyNumber}`;
  };

  const computeAge = (profile: PlayerProfile) => {
    if (profile.age) return profile.age;
    if (!profile.dateOfBirth) return null;
    const birthDate = new Date(profile.dateOfBirth);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    return diffYears > 0 ? diffYears : null;
  };

  const awardMutation = useMutation({
    mutationFn: async ({ awardId, type }: { awardId: string; type: 'badge' | 'trophy' }) => {
      const result = await apiRequest("/api/coach/award", {
        method: "POST",
        data: {
          playerId,
          awardId,
          category: type
        }
      });
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Award given successfully!",
        description: "The award has been added to the player's profile.",
      });
      setShowAwardDialog(false);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/badges`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/trophies`] });
    },
    onError: () => {
      toast({
        title: "Failed to give award",
        description: "There was an error giving the award. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAwardPlayer = (awardId: string, type: 'badge' | 'trophy') => {
    awardMutation.mutate({ awardId, type });
  };

  if (!isOpen || !playerId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="player-profile-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900" data-testid="text-player-header">
                {playerProfile ? getPlayerHeaderTitle(playerProfile) : 'Player Profile'}
              </DialogTitle>
              <div id="player-profile-description" className="sr-only">
                Player profile information including stats, achievements, and contact details
              </div>
              {playerProfile && (() => {
                const playerAge = computeAge(playerProfile);
                return (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground" data-testid="text-player-meta">
                    {playerAge && (
                      <span className="flex items-center gap-1">
                        🎂 {playerAge} yrs
                      </span>
                    )}
                    {playerProfile.height && (
                      <span className="flex items-center gap-1">
                        📏 {playerProfile.height}
                      </span>
                    )}
                    {playerProfile.city && (
                      <span className="flex items-center gap-1">
                        📍 {playerProfile.city}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-player-card"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {profileLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : playerProfile ? (
          <div className="space-y-6">
            {/* Player Header */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={playerProfile.profile_image_url} 
                  alt={getPlayerFullName(playerProfile)} 
                />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                  {getPlayerInitials(playerProfile)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                {playerProfile.team_id && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 mb-2">
                    <Users className="h-3 w-3 mr-1" />
                    Team {playerProfile.team_id}
                  </Badge>
                )}
              </div>

              {/* Coach Actions */}
              {isCoach && (
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => setShowAwardDialog(true)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    data-testid="button-award-player"
                  >
                    <Trophy className="h-4 w-4 mr-1" />
                    Award
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSkillEvaluation(true)}
                    data-testid="button-evaluate-skills"
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Evaluate
                  </Button>
                </div>
              )}
            </div>

            {/* Player Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {playerProfile.age && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-sm text-gray-600">Age</p>
                    <p className="font-semibold">{playerProfile.age}</p>
                  </CardContent>
                </Card>
              )}
              
              {playerProfile.height && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <Ruler className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-sm text-gray-600">Height</p>
                    <p className="font-semibold">{playerProfile.height}</p>
                  </CardContent>
                </Card>
              )}
              
              {playerProfile.city && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <MapPin className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">{playerProfile.city}</p>
                  </CardContent>
                </Card>
              )}
              
              {playerProfile.schoolGrade && (
                <Card>
                  <CardContent className="p-3 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                    <p className="text-sm text-gray-600">Grade</p>
                    <p className="font-semibold">{playerProfile.schoolGrade}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Achievements Section */}
            <div className="space-y-4">
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Badges */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-500" />
                      Badges ({Array.isArray(badges) ? badges.length : 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(badges) && badges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {badges.slice(0, 4).map((badge: any) => (
                          <div key={badge.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <Award className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-xs font-medium truncate">{badge.name}</span>
                          </div>
                        ))}
                        {badges.length > 4 && (
                          <div className="text-xs text-gray-500 p-2">
                            +{badges.length - 4} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No badges earned yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Trophies */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Trophies ({Array.isArray(trophies) ? trophies.length : 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(trophies) && trophies.length > 0 ? (
                      <div className="space-y-2">
                        {trophies.slice(0, 3).map((trophy: any) => (
                          <div key={trophy.id} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <div>
                              <p className="text-xs font-medium">{trophy.trophyName}</p>
                              {trophy.earnedAt && (
                                <p className="text-xs text-gray-500">
                                  {new Date(trophy.earnedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {trophies.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{trophies.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No trophies earned yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Awards Dialog for Coaches */}
            {isCoach && showAwardDialog && (
              <Dialog open={showAwardDialog} onOpenChange={setShowAwardDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Award Player</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Available Badges</h4>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {Array.isArray(availableAwards) && availableAwards.filter((award: any) => award.type !== 'trophy').map((award: any) => (
                          <Button
                            key={award.id}
                            variant="outline"
                            onClick={() => handleAwardPlayer(award.id, 'badge')}
                            disabled={awardMutation.isPending}
                            className="justify-start h-auto p-3"
                            data-testid={`button-award-badge-${award.id}`}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            <div className="text-left">
                              <p className="font-medium">{award.name}</p>
                              {award.description && (
                                <p className="text-xs text-gray-500">{award.description}</p>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Available Trophies</h4>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {Array.isArray(availableAwards) && availableAwards.filter((award: any) => award.type === 'trophy').map((award: any) => (
                          <Button
                            key={award.id}
                            variant="outline"
                            onClick={() => handleAwardPlayer(award.id, 'trophy')}
                            disabled={awardMutation.isPending}
                            className="justify-start h-auto p-3"
                            data-testid={`button-award-trophy-${award.id}`}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            <div className="text-left">
                              <p className="font-medium">{award.name}</p>
                              {award.description && (
                                <p className="text-xs text-gray-500">{award.description}</p>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Skill Evaluation Dialog for Coaches */}
            {isCoach && showSkillEvaluation && (
              <Dialog open={showSkillEvaluation} onOpenChange={setShowSkillEvaluation}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Evaluate Player Skills</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Skill evaluation feature coming soon. This will allow coaches to rate players 
                      on various skills and track their development over time.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {['Ball Handling', 'Shooting', 'Defense', 'Teamwork', 'Hustle', 'Leadership'].map(skill => (
                        <div key={skill} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">{skill}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className="h-4 w-4 text-gray-300" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Player profile not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}