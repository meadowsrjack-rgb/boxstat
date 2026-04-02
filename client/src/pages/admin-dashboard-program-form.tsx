import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface OptionItem<T = string> {
  value: T;
  label: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export const CATEGORY_OPTIONS: OptionItem[] = [
  { value: "basketball", label: "Basketball" },
  { value: "soccer", label: "Soccer" },
  { value: "volleyball", label: "Volleyball" },
  { value: "baseball", label: "Baseball" },
  { value: "softball", label: "Softball" },
  { value: "football", label: "Football" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "tennis", label: "Tennis" },
  { value: "swimming", label: "Swimming" },
  { value: "track", label: "Track" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "cheerleading", label: "Cheerleading" },
  { value: "wrestling", label: "Wrestling" },
  { value: "golf", label: "Golf" },
  { value: "hockey", label: "Hockey" },
  { value: "other", label: "Other" },
];

export const ICON_OPTIONS: OptionItem[] = [
  { value: "🏀", label: "🏀" },
  { value: "⚽", label: "⚽" },
  { value: "🏈", label: "🏈" },
  { value: "⚾", label: "⚾" },
  { value: "🎾", label: "🎾" },
  { value: "🏐", label: "🏐" },
  { value: "🏒", label: "🏒" },
  { value: "🏊", label: "🏊" },
  { value: "🏋️", label: "🏋️" },
  { value: "🤸", label: "🤸" },
  { value: "⛳", label: "⛳" },
  { value: "🎽", label: "🎽" },
  { value: "🏆", label: "🏆" },
  { value: "⭐", label: "⭐" },
  { value: "🔥", label: "🔥" },
];

export const BILLING_MODEL_OPTIONS: OptionItem[] = [
  { value: "recurring", label: "Recurring" },
  { value: "one_time", label: "One-Time" },
  { value: "usage", label: "Usage-Based" },
];

export const ACCESS_TYPE_OPTIONS: OptionItem[] = [
  { value: "open", label: "Open" },
  { value: "invite_only", label: "Invite Only" },
  { value: "approval", label: "Approval Req." },
];

export const PRODUCT_TYPE_OPTIONS: OptionItem[] = [
  { value: "Subscription", label: "Subscription" },
  { value: "One-Time", label: "One-Time" },
  { value: "Pack", label: "Credit Pack" },
];

export const ROSTER_VISIBILITY_OPTIONS: OptionItem[] = [
  { value: "public", label: "Public" },
  { value: "members", label: "Members Only" },
  { value: "hidden", label: "Hidden" },
];

export const CHAT_MODE_OPTIONS: OptionItem[] = [
  { value: "two_way", label: "Two-Way" },
  { value: "announcements", label: "Announce Only" },
  { value: "disabled", label: "Disabled" },
];

export const SUBGROUP_LABEL_OPTIONS: OptionItem[] = [
  { value: "Team", label: "Team" },
  { value: "Level", label: "Level" },
  { value: "Group", label: "Group" },
];

export const SESSION_LENGTH_OPTIONS: OptionItem<number>[] = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function Section({ icon, title, badge, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-5 py-4 space-y-5">{children}</div>}
    </div>
  );
}

interface FieldWrapProps {
  label: string;
  children: React.ReactNode;
}

export function FieldWrap({ label, children }: FieldWrapProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

interface ChipSelProps<T extends string | number> {
  options: OptionItem<T>[];
  value: T | undefined;
  onChange: (val: T) => void;
  testIdPrefix?: string;
}

export function ChipSel<T extends string | number>({ options, value, onChange, testIdPrefix }: ChipSelProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${
              on
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {o.Icon && <o.Icon size={13} className={on ? "text-red-500" : "text-gray-400"} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface SegControlProps<T extends string | number> {
  options: OptionItem<T>[];
  value: T | undefined;
  onChange: (val: T) => void;
  testIdPrefix?: string;
}

export function SegControl<T extends string | number>({ options, value, onChange, testIdPrefix }: SegControlProps<T>) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          data-testid={testIdPrefix ? `${testIdPrefix}-${o.value}` : undefined}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            value === o.value ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          {o.Icon && <o.Icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface TogRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
  accentColor?: "red" | "green";
}

export function TogRow({ label, description, value, onChange, testId, accentColor = "red" }: TogRowProps) {
  const activeClass = accentColor === "green" ? "bg-green-500" : "bg-red-600";
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        data-testid={testId}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? activeClass : "bg-gray-300"}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

interface ChkItemProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId?: string;
  sublabel?: string;
}

export function ChkItem({ label, checked, onCheckedChange, testId, sublabel }: ChkItemProps) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        checked ? "bg-red-50/60" : "hover:bg-gray-50"
      }`}
    >
      <div
        onClick={() => onCheckedChange(!checked)}
        data-testid={testId}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
          checked ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <span className="text-sm text-gray-700">{label}</span>
        {sublabel && <div className="text-xs text-gray-400">{sublabel}</div>}
      </div>
    </label>
  );
}
