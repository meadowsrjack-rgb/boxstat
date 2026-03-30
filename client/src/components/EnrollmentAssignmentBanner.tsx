import { useQuery } from "@tanstack/react-query";
import { Users, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PendingAssignmentsInfo {
  pendingCount: number;
  latestPlayerName: string | null;
  latestProgramName: string | null;
  latestStartDate: string | null;
}

export default function EnrollmentAssignmentBanner({ onNavigateToUsers }: { onNavigateToUsers?: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery<PendingAssignmentsInfo>({
    queryKey: ['/api/admin/pending-assignments'],
  });

  if (dismissed || !data || data.pendingCount === 0) return null;

  return (
    <div className="relative bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-4 shadow-sm">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-red-900">
            {data.pendingCount === 1
              ? "1 player needs team assignment!"
              : `${data.pendingCount} players need team assignment!`}
          </p>
          {data.latestPlayerName && data.latestProgramName && (
            <p className="text-sm text-red-700 mt-0.5 line-clamp-1">
              {data.latestPlayerName} enrolled in {data.latestProgramName}
            </p>
          )}
          {onNavigateToUsers && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-3 text-red-700 hover:text-red-900 hover:bg-red-100 font-medium"
              onClick={onNavigateToUsers}
            >
              Assign Teams
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
