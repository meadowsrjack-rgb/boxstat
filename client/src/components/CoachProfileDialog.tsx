import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Briefcase, BookOpen, Users, Star, GraduationCap } from "lucide-react";

interface CoachProfileDialogProps {
  coachId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CoachProfileDialog({ coachId, open, onOpenChange }: CoachProfileDialogProps) {
  const { data: coach, isLoading } = useQuery<any>({
    queryKey: ["/api/coach-profile", coachId],
    enabled: open && !!coachId,
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/coach-profile/${coachId}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load coach profile");
      return res.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Coach Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        ) : coach ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={coach.profileImageUrl} />
                <AvatarFallback className="text-lg bg-red-600 text-white">
                  {coach.firstName?.[0]}{coach.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {coach.firstName} {coach.lastName}
                </h3>
                <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded font-medium">
                  {coach.roleLabel || "COACH"}
                </span>
              </div>
            </div>

            {coach.yearsExperience && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Briefcase className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Experience</div>
                  <div className="text-sm text-gray-900">{coach.yearsExperience}</div>
                </div>
              </div>
            )}

            {coach.bio && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <BookOpen className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Coaching Bio</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{coach.bio}</div>
                </div>
              </div>
            )}

            {coach.philosophy && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Star className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Coaching Philosophy</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{coach.philosophy}</div>
                </div>
              </div>
            )}

            {coach.previousTeams && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Previous Teams</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{coach.previousTeams}</div>
                </div>
              </div>
            )}

            {coach.playingExperience && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Award className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Playing Experience</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{coach.playingExperience}</div>
                </div>
              </div>
            )}

            {coach.specialties && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Specialties</div>
                  <div className="text-sm text-gray-700">{coach.specialties}</div>
                </div>
              </div>
            )}

            {coach.coachingStyle && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Star className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-0.5">Coaching Style</div>
                  <div className="text-sm text-gray-700">{coach.coachingStyle}</div>
                </div>
              </div>
            )}

            {!coach.yearsExperience && !coach.bio && !coach.philosophy && !coach.previousTeams && !coach.playingExperience && (
              <div className="text-center py-6 text-gray-500 text-sm">
                This coach hasn't added their profile information yet.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Could not load coach profile.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
