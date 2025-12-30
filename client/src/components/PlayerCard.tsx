import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { AwardsDialog, EvaluationDialog, type PlayerLite, type EvalScores, type Quarter } from "@/components/CoachAwardDialogs";
import UypTrophyRings from "@/components/UypTrophyRings";
import {
  X,
  Shirt,
  Award,
  Trophy,
  Phone,
  AlertCircle,
  Heart
} from "lucide-react";

interface PlayerCardProps {
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
  isCoach?: boolean;
  currentUserId?: string;
}

interface Profile {
  id: string;
  organizationId?: string;
  role?: 'player' | 'parent' | 'coach' | 'admin';
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  address: string | null;
  medicalInfo: string | null;
  allergies: string | null;
  schoolGrade: string | null;
  position: string | null;
  jerseyNumber: number | null;
  teamId: string | null;
  age: string | number | null;
  height: string | null;
  city: string | null;
  coachingExperience?: string | null;
  yearsExperience?: number | null;
  bio?: string | null;
  previousTeams?: string | null;
  playingExperience?: string | null;
  philosophy?: string | null;
  occupation?: string | null;
  workPhone?: string | null;
  relationship?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface TeamInfo {
  id: number;
  name: string;
  ageGroup: string;
  program?: string;
  color: string;
}

interface TierMeter {
  earned: number;
  total: number;
}

interface AwardsSummary {
  tierSummary?: {
    legacy: TierMeter;
    hof: TierMeter;
    superstar: TierMeter;
    allStar: TierMeter;
    starter: TierMeter;
    prospect: TierMeter;
  };
  rookieBadgesCount: number;
  starterBadgesCount: number;
  allStarBadgesCount: number;
  superstarBadgesCount: number;
  hallOfFameBadgesCount: number;
  prospectBadgesCount: number;
  trophiesCount: number;
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
  
  // Shared dialog state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [scores, setScores] = useState<EvalScores>({});
  const [quarter, setQuarter] = useState<Quarter>(() => {
    const m = new Date().getMonth();
    return (m <= 2 ? "Q1" : m <= 5 ? "Q2" : m <= 8 ? "Q3" : "Q4") as Quarter;
  });
  const [year, setYear] = useState<number>(new Date().getFullYear());

  // Helper to make authenticated fetch requests
  const authFetch = async (url: string) => {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return null; // Return null for auth/not found errors instead of throwing
      }
      throw new Error(`Failed to fetch: ${res.status}`);
    }
    return res.json();
  };

  // Get player profile - all user IDs in this app are profile IDs (no 'profile-' prefix needed)
  const { data: profileData, isLoading: loading } = useQuery<Profile | null>({
    queryKey: [`/api/profile/${playerId}`],
    queryFn: () => authFetch(`/api/profile/${playerId}`),
    enabled: isOpen && !!playerId,
  });

  const playerProfile: Profile | undefined = profileData || undefined;

  // Get the account ID for queries - use the playerId directly as it IS the account/profile ID
  const accountIdForQueries = playerProfile?.id || playerId;

  // Get team info
  const { data: teamInfo } = useQuery<TeamInfo | null>({
    queryKey: [`/api/users/${accountIdForQueries}/team`],
    queryFn: () => authFetch(`/api/users/${accountIdForQueries}/team`),
    enabled: isOpen && !!accountIdForQueries,
  });

  // Get player awards summary
  const { data: awardsSummary } = useQuery<AwardsSummary | null>({
    queryKey: [`/api/users/${accountIdForQueries}/awards`],
    queryFn: () => authFetch(`/api/users/${accountIdForQueries}/awards`),
    enabled: isOpen && !!accountIdForQueries,
  });

  // Get player's latest skill evaluation
  const { data: latestEvaluation } = useQuery({
    queryKey: [`/api/players/${playerId}/latest-evaluation`],
    queryFn: () => authFetch(`/api/players/${playerId}/latest-evaluation`),
    enabled: isOpen && !!playerId,
  });

  // Get available awards for coaches to give
  const { data: availableAwards } = useQuery({
    queryKey: ['/api/admin/badges'],
    queryFn: () => authFetch('/api/admin/badges'),
    enabled: isCoach && showAwardDialog,
  });

  // Get all teams for team assignment
  const { data: teamsData } = useQuery<{ id: number; name: string; ageGroup: string }[] | null>({
    queryKey: ['/api/teams'],
    queryFn: () => authFetch('/api/teams'),
    enabled: isCoach && isOpen,
  });
  const allTeams = teamsData || [];

  const getPlayerInitials = (profile: Profile) => {
    return `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getPlayerFullName = (profile: Profile) => {
    if (!profile.firstName && !profile.lastName) {
      return "Player";
    }
    return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  };

  // Award mutation
  const awardMutation = useMutation({
    mutationFn: async ({ awardId, kind }: { awardId: string; kind: "badge" | "trophy" }) => {
      if (!selectedPlayer) throw new Error("No player selected");
      return await apiRequest('/api/coach/award', {
        method: 'POST',
        data: { playerId: selectedPlayer.id, awardId, category: kind },
      });
    },
    onSuccess: () => {
      toast({ title: "Award given successfully!" });
      setShowAwardDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/awards`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/badges`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/trophies`] });
    },
    onError: () => {
      toast({ title: "Failed to give award", variant: "destructive" });
    },
  });

  // Skills evaluation mutation
  const skillsMutation = useMutation({
    mutationFn: async (data: { playerId: string; scores: Record<string, number>; quarter: string; year: number }) => {
      return await apiRequest('/api/coach/evaluate', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast({ title: "Evaluation saved successfully!" });
      setShowSkillEvaluation(false);
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/latest-evaluation`] });
    },
    onError: () => {
      toast({ title: "Failed to save evaluation", variant: "destructive" });
    },
  });

  // Calculate overall skill score from latest evaluation
  // Handles both flat scores {shooting: 4.35} and nested scores {SHOOTING: {LAYUP: 4, 2PT: 3}}
  const calculateOverallScore = (skillsData: any): number => {
    if (!skillsData || typeof skillsData !== 'object') return 0;
    
    const allScores: number[] = [];
    
    Object.values(skillsData).forEach((value: any) => {
      if (typeof value === 'number') {
        // Flat format: {shooting: 4.35}
        allScores.push(value);
      } else if (typeof value === 'object' && value !== null) {
        // Nested format: {SHOOTING: {LAYUP: 4, 2PT: 3}}
        Object.values(value).forEach((subValue: any) => {
          if (typeof subValue === 'number') {
            allScores.push(subValue);
          }
        });
      }
    });
    
    if (allScores.length === 0) return 0;
    
    // Calculate average and convert to 0-100 scale (scores are 1-5, so multiply by 20)
    const average = allScores.reduce((sum, val) => sum + val, 0) / allScores.length;
    return Math.round(average * 20);
  };
  
  const overallSkillScore = calculateOverallScore(latestEvaluation?.skillsData);

  // Prepare rings data for trophy display (each needs earned/total format)
  // Use tierSummary if available (new format), otherwise fall back to legacy counts
  const ringsData = awardsSummary?.tierSummary ? {
    legacy: awardsSummary.tierSummary.legacy,
    hof: awardsSummary.tierSummary.hof,
    superstar: awardsSummary.tierSummary.superstar,
    allStar: awardsSummary.tierSummary.allStar,
    starter: awardsSummary.tierSummary.starter,
    prospect: awardsSummary.tierSummary.prospect,
  } : awardsSummary ? {
    legacy: { earned: awardsSummary.trophiesCount || 0, total: 1 },
    hof: { earned: awardsSummary.hallOfFameBadgesCount || 0, total: 1 },
    superstar: { earned: awardsSummary.superstarBadgesCount || 0, total: 1 },
    allStar: { earned: awardsSummary.allStarBadgesCount || 0, total: 1 },
    starter: { earned: awardsSummary.starterBadgesCount || 0, total: 1 },
    prospect: { earned: awardsSummary.prospectBadgesCount || 0, total: 1 },
  } : {
    legacy: { earned: 0, total: 1 },
    hof: { earned: 0, total: 1 },
    superstar: { earned: 0, total: 1 },
    allStar: { earned: 0, total: 1 },
    starter: { earned: 0, total: 1 },
    prospect: { earned: 0, total: 1 },
  };

  // Show loading spinner only while actually loading
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state when profile is not available (403/404)
  if (!playerProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Player Profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">Player profile is not available</p>
            <p className="text-sm text-gray-500 mt-1">You may not have permission to view this profile.</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden" hideClose>
          <DialogHeader className="sr-only">
            <DialogTitle>{getPlayerFullName(playerProfile)}'s Profile</DialogTitle>
          </DialogHeader>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-2 bg-white/90 hover:bg-white shadow-lg transition-all"
            data-testid="close-player-card"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>

          <div className="bg-gradient-to-b from-gray-50 to-white">
            {/* Profile Section */}
            <div className="relative px-0 pt-6">
              <motion.section
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative rounded-3xl bg-white/70 backdrop-blur-xl overflow-hidden"
              >
                {/* Decorative grid overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)",
                    backgroundSize: "16px 16px",
                  }}
                />

                {/* Header with Profile Picture */}
                <div className="relative px-6 pt-8 pb-5 text-center">
                  {/* Profile Picture */}
                  {playerProfile.profileImageUrl && (
                    <div className="flex justify-center mb-4">
                      <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                        <AvatarImage src={playerProfile.profileImageUrl} alt={getPlayerFullName(playerProfile)} />
                        <AvatarFallback className="bg-red-100 text-red-600 text-2xl">
                          {getPlayerInitials(playerProfile)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  <h1
                    className="mt-3 text-4xl font-black tracking-tight leading-tight"
                    style={{
                      color: "#d82428",
                      textShadow: "0 1px 0 rgba(255,255,255,0.6)",
                    }}
                    data-testid="player-name"
                  >
                    {getPlayerFullName(playerProfile)}
                    {playerProfile.jerseyNumber && (
                      <span className="ml-2 text-gray-600">#{playerProfile.jerseyNumber}</span>
                    )}
                  </h1>

                  <div className="mt-1 text-sm font-medium text-gray-700" data-testid="player-position-jersey">
                    {(playerProfile.height || playerProfile.position) ? (
                      <>
                        {playerProfile.height}{playerProfile.height && playerProfile.position && ' '}{playerProfile.position}
                      </>
                    ) : (
                      <span className="text-gray-400">Height & position not set</span>
                    )}
                    {playerProfile.city && (
                      <div className="text-xs text-gray-600 mt-1">From {playerProfile.city}</div>
                    )}
                  </div>

                </div>

              </motion.section>
            </div>

            {/* Overall Skills Assessment */}
            <div className="px-2 pt-2 pb-4">
              <div className="max-w-[340px] mx-auto">
                <SkillBar 
                  label="OVR"  
                  value={overallSkillScore} 
                />
              </div>
            </div>

            {/* Trophies & Badges */}
            <div className="p-2 pb-6">
              <UypTrophyRings data={ringsData} size={109} stroke={8} />
            </div>

            {/* Emergency Contact & Medical Information - Coach View Only */}
            {isCoach && (playerProfile.emergencyContact || playerProfile.emergencyPhone || playerProfile.medicalInfo || playerProfile.allergies) && (
              <div className="px-6 pb-6 space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Emergency & Medical Information
                  </h3>
                  
                  {/* Emergency Contact */}
                  {(playerProfile.emergencyContact || playerProfile.emergencyPhone) && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-red-900 mb-1">Emergency Contact</p>
                          {playerProfile.emergencyContact && (
                            <p className="text-sm text-gray-900">{playerProfile.emergencyContact}</p>
                          )}
                          {playerProfile.emergencyPhone && (
                            <p className="text-sm text-gray-900 font-medium">
                              <a href={`tel:${playerProfile.emergencyPhone}`} className="hover:underline">
                                {playerProfile.emergencyPhone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Medical Information */}
                  {playerProfile.medicalInfo && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <Heart className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Medical Information</p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{playerProfile.medicalInfo}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {playerProfile.allergies && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-orange-900 mb-1">Allergies</p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{playerProfile.allergies}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coach Actions */}
            {isCoach && (
              <div className="px-6 pb-6 space-y-3">
                <Button
                  onClick={() => {
                    setSelectedPlayer({
                      id: playerId,
                      name: getPlayerFullName(playerProfile),
                    });
                    setShowAwardDialog(true);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg"
                  data-testid="button-give-award"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Give Award
                </Button>

                <Button
                  onClick={() => {
                    setSelectedPlayer({
                      id: playerId,
                      name: getPlayerFullName(playerProfile),
                    });
                    setShowSkillEvaluation(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                  data-testid="button-evaluate-skills"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Evaluate Skills
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Awards Dialog */}
      {showAwardDialog && selectedPlayer && (
        <AwardsDialog
          isOpen={showAwardDialog}
          onClose={() => setShowAwardDialog(false)}
          player={selectedPlayer}
          availableAwards={availableAwards || []}
          onSubmit={({ awardId, kind }) => awardMutation.mutate({ awardId, kind })}
          isSubmitting={awardMutation.isPending}
        />
      )}

      {/* Evaluation Dialog */}
      {showSkillEvaluation && selectedPlayer && (
        <EvaluationDialog
          isOpen={showSkillEvaluation}
          onClose={() => setShowSkillEvaluation(false)}
          player={selectedPlayer}
          scores={scores}
          setScores={setScores}
          quarter={quarter}
          setQuarter={setQuarter}
          year={year}
          setYear={setYear}
          onSubmit={() => {
            skillsMutation.mutate({
              playerId: selectedPlayer.id,
              scores,
              quarter,
              year,
            });
          }}
          isSubmitting={skillsMutation.isPending}
        />
      )}
    </>
  );
}

// SkillBar component
function SkillBar({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="space-y-2 cursor-pointer p-2 rounded-lg"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-red-600 font-semibold">{value}</span>
      </div>

      {/* Wider track to visually line up with trophy rings */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <motion.div
          className="bg-red-600 h-2.5 rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
