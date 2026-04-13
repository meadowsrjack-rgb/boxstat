import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ForkInTheRoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForkInTheRoadModal({ open, onOpenChange }: ForkInTheRoadModalProps) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome to BoxStat!</DialogTitle>
        </DialogHeader>
        <p className="text-center text-gray-400 text-sm mb-6">Tell us who you are so we can get you to the right place.</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => { onOpenChange(false); window.location.href = '/signup?plan=growth'; }}
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-600/20 hover:border-red-500/40 p-6 text-left transition-all duration-200"
          >
            <span className="text-3xl">🏢</span>
            <span className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">I manage a club or league</span>
            <span className="text-sm text-gray-400">Sign up for a free trial and manage your organization</span>
          </button>
          <button
            onClick={() => { onOpenChange(false); setLocation('/register'); }}
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 p-6 text-left transition-all duration-200"
          >
            <span className="text-3xl">⚽</span>
            <span className="text-lg font-semibold text-white transition-colors">I'm a player, parent, or coach</span>
            <span className="text-sm text-gray-400">Create an account to view your team, schedule, and more</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
