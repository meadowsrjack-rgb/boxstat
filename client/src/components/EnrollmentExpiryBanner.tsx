import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Enrollment {
  id: number;
  programId: string;
  endDate: string | null;
  status: string;
}

interface Program {
  id: string;
  name: string;
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

  const programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]));

  const expiringSoon = enrollments.filter((e) => {
    if (e.status !== "active" || !e.endDate) return false;
    const days = daysUntil(e.endDate);
    return days >= 0 && days <= 7;
  });

  if (expiringSoon.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {expiringSoon.map((e) => {
        const days = daysUntil(e.endDate!);
        const programName = programMap[e.programId] || "your program";
        return (
          <Alert
            key={e.id}
            className="border-l-4 border-l-amber-500 bg-amber-50"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="text-amber-800 text-sm">
                {days === 0
                  ? `Your enrollment in ${programName} expires today.`
                  : days === 1
                  ? `Your enrollment in ${programName} ends tomorrow.`
                  : `Your enrollment in ${programName} ends in ${days} day${days !== 1 ? "s" : ""}.`}{" "}
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
    </div>
  );
}
