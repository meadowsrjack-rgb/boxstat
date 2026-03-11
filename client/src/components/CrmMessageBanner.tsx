import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CrmUnreadInfo {
  unreadCount: number;
  latestSenderName: string | null;
  latestMessage: string | null;
  latestCreatedAt: string | null;
}

export default function CrmMessageBanner({ onNavigateToCrm }: { onNavigateToCrm?: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery<CrmUnreadInfo>({
    queryKey: ['/api/admin/crm-unread'],
    refetchInterval: 60 * 1000,
  });

  if (dismissed || !data || data.unreadCount === 0) return null;

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
          <MessageSquare className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-red-900">
            {data.unreadCount === 1
              ? "You have a new message!"
              : `You have ${data.unreadCount} unread messages!`}
          </p>
          {data.latestSenderName && data.latestMessage && (
            <p className="text-sm text-red-700 mt-0.5 line-clamp-1">
              {data.latestSenderName}: {data.latestMessage}
            </p>
          )}
          {onNavigateToCrm && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-3 text-red-700 hover:text-red-900 hover:bg-red-100 font-medium"
              onClick={onNavigateToCrm}
            >
              View Messages
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
