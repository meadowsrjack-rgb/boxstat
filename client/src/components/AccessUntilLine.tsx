import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccessReason, AccessStatus } from "@shared/access-status";

interface AccessUntilLineProps {
  status: AccessStatus | null | undefined;
  className?: string;
  showTooltip?: boolean;
  testId?: string;
}

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const buildText = (reason: AccessReason, date: string): string => {
  switch (reason) {
    case "paid":
      return date ? `Active until ${date} — paid subscription` : "Active — paid subscription";
    case "admin_grant":
      return date
        ? `Access until ${date} — pay by this date to keep playing`
        : "Access pending — pay to keep playing";
    case "grace":
      return date ? `In grace period until ${date} — payment overdue` : "In grace period — payment overdue";
    case "expired":
      return date ? `Access ended ${date}` : "Access ended";
    case "none":
    default:
      return "No active enrollment";
  }
};

const colorClassFor = (reason: AccessReason): string => {
  switch (reason) {
    case "paid":
      return "text-green-600 dark:text-green-400";
    case "admin_grant":
      return "text-amber-600 dark:text-amber-400";
    case "grace":
      return "text-yellow-700 dark:text-yellow-400";
    case "expired":
      return "text-red-600 dark:text-red-400";
    case "none":
    default:
      return "text-gray-500 dark:text-gray-400";
  }
};

export function AccessUntilLine({ status, className, showTooltip = true, testId }: AccessUntilLineProps) {
  if (!status) return null;
  const date = formatDate(status.accessUntil);
  const text = buildText(status.reason, date);
  const color = colorClassFor(status.reason);
  const node = (
    <span
      className={`text-sm ${color} ${className || ""}`}
      data-testid={testId || "access-until-line"}
    >
      {text}
    </span>
  );
  if (!showTooltip) return node;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="top">{status.sourceLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
