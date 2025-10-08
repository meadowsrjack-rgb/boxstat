import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { AwardsDialog, EvaluationDialog, type PlayerLite, type EvalScores, type Quarter } from "@/components/CoachAwardDialogs";
import UypTrophyRings from "@/components/UypTrophyRings";
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
  X,
  Shirt,
  Gauge
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
  full_name?: string;
  profile_image_url?: string;
  team?: string;
  team_id?: number;
  team_name?: string;
  jerseyNumber?: number;
  position?: string;
  dateOfBirth?: string;
  height?: string;
  age?: string;
  city?: string;
  schoolGrade?: string;
  parent_name?: string;
  parent_email?: string;
  account_email?: string;
  phone_number?: string;
  registration_status?: string;
  session?: string;
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
  
  // Shared dialog state (matching roster behavior)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [scores, setScores] = useState<EvalScores>({});
  const [quarter, setQuarter] = useState<Quarter>(() => {
    const m = new Date().getMonth();
    return (m <= 2 ? "Q1" : m <= 5 ? "Q2" : m <= 8 ? "Q3" : "Q4") as Quarter;
  });
  const [year, setYear] = useState<number>(new Date().getFullYear());

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

  // Get all teams for team assignment
  const { data: allTeams = [] } = useQuery<{ id: number; name: string; ageGroup: string }[]>({
    queryKey: ['/api/teams'],
    enabled: isCoach && isOpen,
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

  // Award mutation (matching roster behavior)
  const awardMutation = useMutation({
    mutationFn: async ({ awardId, kind }: { awardId: string; kind: "badge" | "trophy" }) => {
      if (!selectedPlayer) throw new Error("No player selected");
      return await apiRequest('/api/coach/award-manual', {
        method: 'POST',
        data: { playerId: selectedPlayer.id, awardId, category: kind },
      });
    },
    onSuccess: () => {
      toast({ title: "Award granted!", description: "The player has been awarded successfully." });
      setShowAwardDialog(false);
      // Use selectedPlayer.id for cache invalidation, not playerId
      queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer?.id}/badges`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer?.id}/trophies`] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to award player", variant: "destructive" });
    },
  });

  // Skill evaluation mutation (matching roster behavior)  
  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayer) throw new Error("No player selected");
      return await apiRequest('/api/coach/evaluations', {
        method: 'POST',
        data: { playerId: parseInt(selectedPlayer.id), quarter, year, scores },
      });
    },
    onSuccess: () => {
      toast({ title: "Evaluation saved!", description: "Player skills evaluation has been saved successfully." });
      setShowSkillEvaluation(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save evaluation", variant: "destructive" });
    },
  });

  // Team assignment mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (teamName: string) => {
      if (!playerId) throw new Error("No player selected");
      return await apiRequest(`/api/users/${playerId}/profile`, {
        method: 'PUT',
        data: { teamId: teamName }, // API expects teamId as team name
      });
    },
    onSuccess: () => {
      toast({ title: "Team updated!", description: "Player's team has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: [`/api/players/${playerId}/profile`] });
      // Invalidate all team queries so rosters update automatically
      queryClient.invalidateQueries({ queryKey: ['/api/teams'], exact: false });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update team", variant: "destructive" });
    },
  });

  // Convert PlayerProfile to PlayerLite for dialogs
  const convertToPlayerLite = (profile: PlayerProfile): PlayerLite => ({
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    teamName: profile.team_name,
    profileImageUrl: profile.profile_image_url,
  });

  // Handler functions (matching roster behavior)
  const handleAwardPlayer = () => {
    if (!playerProfile) return;
    setSelectedPlayer(convertToPlayerLite(playerProfile));
    setShowAwardDialog(true);
  };

  const handleEvaluatePlayer = () => {
    if (!playerProfile) return;
    setSelectedPlayer(convertToPlayerLite(playerProfile));
    // Load existing evaluation
    fetch(`/api/coach/evaluations?playerId=${playerProfile.id}&quarter=${quarter}&year=${year}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setScores((data as EvalScores) || {}));
    setShowSkillEvaluation(true);
  };

  // Helper components
  const ProfileAvatarRing = ({ src, initials, size = 80 }: { src?: string; initials: string; size?: number }) => (
    <motion.div
      className="inline-block rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#fecaca,#fde8e8,#fecaca)] shadow-sm"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      whileHover={{ scale: 1.03 }}
      style={{ width: size + 6, height: size + 6 }}
    >
      <div className="rounded-full overflow-hidden bg-white ring-4 ring-white shadow-md" style={{ width: size, height: size }}>
        <Avatar className="w-full h-full">
          <AvatarImage src={src} alt="Player Avatar" />
          <AvatarFallback className="text-lg font-bold bg-gray-200">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
  );

  const SkillBar = ({ label, value }: { label: string; value: number }) => (
    <motion.div className="space-y-2 cursor-pointer p-2 rounded-lg" whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-red-600 font-semibold">{value}%</span>
      </div>
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

  const ringsData = {
    trophies:   { earned: Array.isArray(trophies) ? trophies.length : 0, total: 10 },
    hallOfFame: { earned: 0, total: 8  },
    superstar:  { earned: 0, total: 12 },
    allStar:    { earned: 0, total: 20 },
    starter:    { earned: Array.isArray(badges) ? badges.length : 0, total: 18 },
    prospect:   { earned: 0, total: 24 },
  };

  if (!isOpen || !playerId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" aria-describedby="player-profile-description">
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          
          {/* Close button */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white"
              data-testid="button-close-player-card"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {profileLoading ? (
            <div className="space-y-4 animate-pulse p-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : playerProfile ? (
            <div className="min-h-screen">
              {/* Futuristic Bio Section */}
              <div className="relative px-6 pt-6">
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

                  {/* Header */}
                  <div className="relative px-6 pt-8 pb-5 text-center">
                    <div id="player-profile-description" className="sr-only">
                      Player profile information including stats, achievements, and contact details
                    </div>
                    
                    <h1
                      className="mt-3 text-4xl font-black tracking-tight leading-tight"
                      style={{
                        color: "#d82428",
                        textShadow: "0 1px 0 rgba(255,255,255,0.6)",
                      }}
                      data-testid="text-player-header"
                    >
                      {getPlayerFullName(playerProfile)}
                    </h1>

                    <div className="mt-1 text-sm font-medium text-gray-700">
                      {(playerProfile.position || "Player").toUpperCase()} {playerProfile.jerseyNumber && `#${playerProfile.jerseyNumber}`}
                    </div>

                    {(playerProfile.team || playerProfile.team_name) && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-50 text-[13px] font-semibold text-[#d82428] px-3 py-1.5 ring-1 ring-[rgba(216,36,40,0.18)]">
                        <Shirt className="h-4 w-4 text-[#d82428]" />
                        {playerProfile.team || playerProfile.team_name}
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="relative px-6 pb-8">
                    <div className="grid grid-cols-3 gap-3">
                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0, duration: 0.35 }}
                        className="group rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
                          <span className="grid place-items-center h-6 w-6 rounded-lg bg-red-50 ring-1 ring-[rgba(216,36,40,0.20)]" style={{ color: "#d82428" }}>
                            <Ruler className="h-4 w-4" />
                          </span>
                          <span>HEIGHT</span>
                        </div>
                        <div className="mt-1.5 text-[15px] font-bold text-gray-900 tracking-tight">
                          {playerProfile.height || "N/A"}
                        </div>
                        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
                      </motion.div>

                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.05, duration: 0.35 }}
                        className="group rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
                          <span className="grid place-items-center h-6 w-6 rounded-lg bg-red-50 ring-1 ring-[rgba(216,36,40,0.20)]" style={{ color: "#d82428" }}>
                            <Gauge className="h-4 w-4" />
                          </span>
                          <span>AGE</span>
                        </div>
                        <div className="mt-1.5 text-[15px] font-bold text-gray-900 tracking-tight">
                          {playerProfile.age || computeAge(playerProfile) || "N/A"}
                        </div>
                        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
                      </motion.div>

                      <motion.div
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.10, duration: 0.35 }}
                        className="group rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
                          <span className="grid place-items-center h-6 w-6 rounded-lg bg-red-50 ring-1 ring-[rgba(216,36,40,0.20)]" style={{ color: "#d82428" }}>
                            <MapPin className="h-4 w-4" />
                          </span>
                          <span>FROM</span>
                        </div>
                        <div className="mt-1.5 text-[15px] font-bold text-gray-900 tracking-tight">
                          {(playerProfile.city || "N/A").replace(", CA", "").replace(",CA", "")}
                        </div>
                        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
                      </motion.div>
                    </div>
                  </div>
                </motion.section>
              </div>

              {/* Contact & Registration Info */}
              {(playerProfile.parent_name || playerProfile.parent_email || playerProfile.phone_number || playerProfile.registration_status) && (
                <div className="px-6 mt-4">
                  <motion.section
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="relative rounded-2xl bg-white/70 backdrop-blur-xl overflow-hidden p-6"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Contact & Registration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {playerProfile.parent_name && (
                        <div>
                          <span className="text-gray-600">Parent:</span>
                          <p className="font-medium">{playerProfile.parent_name}</p>
                        </div>
                      )}
                      {playerProfile.parent_email && (
                        <div>
                          <span className="text-gray-600">Parent Email:</span>
                          <p className="font-medium">{playerProfile.parent_email}</p>
                        </div>
                      )}
                      {playerProfile.phone_number && (
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <p className="font-medium">{playerProfile.phone_number}</p>
                        </div>
                      )}
                      {playerProfile.registration_status && (
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${
                              playerProfile.registration_status === 'active' ? 'bg-green-50 text-green-700' :
                              playerProfile.registration_status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}
                          >
                            {playerProfile.registration_status}
                          </Badge>
                        </div>
                      )}
                      {playerProfile.session && (
                        <div>
                          <span className="text-gray-600">Program:</span>
                          <p className="font-medium">{playerProfile.session}</p>
                        </div>
                      )}
                      {playerProfile.schoolGrade && (
                        <div>
                          <span className="text-gray-600">Grade:</span>
                          <p className="font-medium">{playerProfile.schoolGrade}</p>
                        </div>
                      )}
                    </div>
                  </motion.section>
                </div>
              )}

              {/* Coach Actions */}
              {isCoach && (
                <div className="px-6 mt-4">
                  <motion.section
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="relative rounded-2xl bg-white/70 backdrop-blur-xl overflow-hidden p-6"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Coach Actions</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <Button
                          onClick={handleAwardPlayer}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                          data-testid="button-award-player"
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          Award Player
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleEvaluatePlayer}
                          data-testid="button-evaluate-skills"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Evaluate Skills
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Change Team
                          </label>
                          <Select
                            value={playerProfile?.team_name || playerProfile?.team || ""}
                            onValueChange={(value) => updateTeamMutation.mutate(value)}
                            disabled={updateTeamMutation.isPending}
                          >
                            <SelectTrigger className="w-full" data-testid="select-player-team">
                              <SelectValue placeholder="Select team..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allTeams.map((team) => (
                                <SelectItem key={team.id} value={team.name} data-testid={`team-option-${team.id}`}>
                                  {team.name} ({team.ageGroup})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                </div>
              )}

              {/* Trophies & Badges */}
              <div className="px-6 mt-4">
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="cursor-pointer"
                >
                  <UypTrophyRings data={ringsData} size={109} stroke={8} />
                </motion.div>
              </div>

              {/* Skills Progress */}
              <div className="px-6 mt-4 pb-8">
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="max-w-[340px] mx-auto space-y-4"
                >
                  <SkillBar label="SHOOTING" value={0} />
                  <SkillBar label="DRIBBLING" value={0} />
                  <SkillBar label="PASSING" value={0} />
                </motion.div>
              </div>

              {/* Shared Awards Dialog (same as roster) */}
              <AwardsDialog
                open={showAwardDialog}
                onOpenChange={setShowAwardDialog}
                player={selectedPlayer}
                onGive={(awardId, kind) => awardMutation.mutate({ awardId, kind })}
                giving={awardMutation.isPending}
              />

              {/* Shared Evaluation Dialog (same as roster) */}
              <EvaluationDialog
                open={showSkillEvaluation}
                onOpenChange={setShowSkillEvaluation}
                player={selectedPlayer}
                scores={scores}
                setScores={setScores}
                quarter={quarter}
                setQuarter={setQuarter}
                year={year}
                setYear={setYear}
                onSave={() => saveEvaluation.mutate()}
                saving={saveEvaluation.isPending}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Player profile not found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}