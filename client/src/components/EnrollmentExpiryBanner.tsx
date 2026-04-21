import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Enrollment {
  id: number;
  programId: string;
  profileId: string | null;
  endDate: string | null;
  gracePeriodEndDate: string | null;
  status: string;
}

interface Program {
  id: string;
  name: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function EnrollmentExpiryBanner() {
  const [, setLocation] = useLocation();

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/account/players"],
  });

  const programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]));
  const playerMap = Object.fromEntries(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]));

  const expiringSoon = enrollments.filter((e) => {
    if (e.status !== "active" || !e.endDate) return false;
    const days = daysUntil(e.endDate);
    return days >= 0 && days <= 7;
  });

  const noExpiryOnFile = enrollments.filter(
    (e) => e.status === "active" && !e.endDate,
  );

  const inGracePeriod = enrollments.filter((e) => e.status === "grace_period");

  if (
    expiringSoon.length === 0 &&
    noExpiryOnFile.length === 0 &&
    inGracePeriod.length === 0
  )
    return null;

  return (
    <div className="space-y-2 mb-4">
      {expiringSoon.map((e) => {
        const days = daysUntil(e.endDate!);
        const programName = programMap[e.programId] || "your program";
        const playerName = e.profileId ? playerMap[e.profileId] : null;
        const subject = playerName ? `${playerName}'s enrollment` : "Your enrollment";
        return (
          <Alert
            key={e.id}
            className="border-l-4 border-l-amber-500 bg-amber-50"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-amber-800 text-sm">
                {days === 0
                  ? `${subject} in ${programName} expires today.`
                  : days === 1
                  ? `${subject} in ${programName} ends tomorrow.`
                  : `${subject} in ${programName} ends in ${days} days.`}{" "}
                Re-enroll through the Payments tab to avoid unenrollment.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500 text-amber-800 hover:bg-amber-100 shrink-0"
                onClick={() => setLocation("/account?tab=payments")}
              >
                Payments
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}

      {noExpiryOnFile.map((e) => {
        const programName = programMap[e.programId] || "your program";
        const playerName = e.profileId ? playerMap[e.profileId] : null;
        const subject = playerName ? `${playerName}'s enrollment` : "Your enrollment";
        return (
          <Alert
            key={`no-expiry-${e.id}`}
            className="border-l-4 border-l-amber-500 bg-amber-50"
            data-testid={`banner-no-expiry-${e.id}`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-amber-800 text-sm">
                {subject} in {programName} has no expiry date on file.{" "}
                Enroll through the Payments tab to keep your access active.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500 text-amber-800 hover:bg-amber-100 shrink-0"
                onClick={() => setLocation("/account?tab=payments")}
              >
                Payments
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}

      {inGracePeriod.map((e) => {
        const programName = programMap[e.programId] || "your program";
        const playerName = e.profileId ? playerMap[e.profileId] : null;
        const subject = playerName ? `${playerName}'s enrollment` : "Your enrollment";
        const daysLeft = e.gracePeriodEndDate ? Math.max(0, daysUntil(e.gracePeriodEndDate)) : 0;
        return (
          <Alert
            key={e.id}
            className="border-l-4 border-l-yellow-500 bg-yellow-50"
          >
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-yellow-800 text-sm">
                <strong>Limited Access:</strong>{" "}
                {subject} in {programName} has expired.{" "}
                {daysLeft > 0
                  ? `You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} of limited access remaining.`
                  : "Your grace period ends today."}{" "}
                You can view your roster and schedule but cannot check in to events or post in team chat.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-800 hover:bg-yellow-100 shrink-0"
                onClick={() => setLocation("/account?tab=payments")}
              >
                Re-enroll
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
