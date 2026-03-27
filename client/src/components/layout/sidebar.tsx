import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Calendar,
  Trophy,
  CreditCard,
  Settings,
  HelpCircle,
  Star,
  Bell,
  LogOut,
  ChevronRight,
  Dumbbell,
  Search,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import BoxStatLogo from "@/components/boxstat-logo";
import type { SelectUser } from "@shared/schema";

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string | null;
};

const playerNavItems: NavItem[] = [
  { href: "/player-dashboard", icon: Home, label: "Home" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/trophies-badges", icon: Trophy, label: "Trophies & Badges" },
  { href: "/skills", icon: Star, label: "My Skills" },
  { href: "/training", icon: Dumbbell, label: "Training" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/player-settings", icon: Settings, label: "Settings" },
];

const coachNavItems: NavItem[] = [
  { href: "/coach-dashboard", icon: Home, label: "Dashboard" },
  { href: "/search", icon: Search, label: "Player Search" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/coach-settings", icon: Settings, label: "Settings" },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", icon: Shield, label: "Admin Dashboard" },
  { href: "/search", icon: Search, label: "Player Search" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const parentNavItems: NavItem[] = [
  { href: "/home", icon: Home, label: "Dashboard" },
  { href: "/schedule", icon: Calendar, label: "Schedule" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/payments", icon: CreditCard, label: "Payments" },
  { href: "/parent-settings", icon: Settings, label: "Settings" },
];

function getNavItems(userType: string | null): NavItem[] {
  if (userType === "admin") return adminNavItems;
  if (userType === "coach") return coachNavItems;
  if (userType === "player") return playerNavItems;
  return parentNavItems;
}

function getSettingsHref(userType: string | null): string {
  if (userType === "player") return "/player-settings";
  if (userType === "coach") return "/coach-settings";
  if (userType === "admin") return "/settings";
  return "/parent-settings";
}

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (user) {
      document.body.classList.add("has-sidebar");
    } else {
      document.body.classList.remove("has-sidebar");
    }
    return () => {
      document.body.classList.remove("has-sidebar");
    };
  }, [user]);

  if (!user) {
    return null;
  }

  const typedUser = user as SelectUser;
  const userType = typedUser.userType ?? null;
  const navItems = getNavItems(userType);
  const settingsHref = getSettingsHref(userType);
  const firstName = typedUser.firstName ?? "";
  const lastName = typedUser.lastName ?? "";
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <aside className="hidden md:flex w-56 lg:w-64 h-full flex-col bg-gray-950 border-r border-white/10 fixed left-0 top-0 bottom-0 z-40 overflow-y-auto">
      <div className="p-5 border-b border-white/10 shrink-0">
        <Link href="/home">
          <div className="flex items-center gap-3 cursor-pointer">
            <BoxStatLogo variant="dark" className="h-8 w-auto" />
          </div>
        </Link>
      </div>

      <div className="p-4 border-b border-white/10 shrink-0">
        <Link href={settingsHref}>
          <div className="flex items-center gap-3 cursor-pointer group">
            <Avatar className="h-9 w-9 ring-2 ring-white/20">
              <AvatarImage src={typedUser.profileImageUrl ?? undefined} alt={firstName} />
              <AvatarFallback className="bg-red-600 text-white text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {firstName} {lastName}
              </p>
              <p className="text-xs text-white/50 capitalize">{userType ?? "user"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] text-center">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1 shrink-0">
        <Link href="/support">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Support</span>
          </div>
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => (window.location.href = "/api/logout")}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
