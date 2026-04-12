import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { AwardBadge } from "./AwardBadge";

interface AwardUnlockPopupProps {
  isOpen: boolean;
  awardName: string;
  awardTier: string;
  awardImageUrl?: string;
  xpReward: number;
  onClose: () => void;
}

const TIER_GRADIENT: Record<string, string> = {
  Prospect: "from-amber-900 to-amber-700",
  Starter: "from-amber-900 to-amber-700",
  Bronze: "from-amber-900 to-amber-700",
  AllStar: "from-slate-600 to-slate-400",
  "All-Star": "from-slate-600 to-slate-400",
  Silver: "from-slate-600 to-slate-400",
  Superstar: "from-yellow-700 to-yellow-500",
  Gold: "from-yellow-700 to-yellow-500",
  HallOfFamer: "from-cyan-700 to-cyan-400",
  HOF: "from-cyan-700 to-cyan-400",
  Platinum: "from-cyan-700 to-cyan-400",
  Diamond: "from-blue-700 to-cyan-400",
  Legacy: "from-purple-800 to-pink-500",
  Legend: "from-purple-800 to-pink-500",
  Team: "from-green-700 to-emerald-500",
};

export function AwardUnlockPopup({
  isOpen,
  awardName,
  awardTier,
  awardImageUrl,
  xpReward,
  onClose,
}: AwardUnlockPopupProps) {
  const [phase, setPhase] = useState<"locked" | "unlocking" | "unlocked">("locked");

  const gradient = TIER_GRADIENT[awardTier] || "from-yellow-700 to-yellow-500";

  useEffect(() => {
    if (!isOpen) {
      setPhase("locked");
      return;
    }

    setPhase("locked");

    const t1 = setTimeout(() => setPhase("unlocking"), 600);
    const t2 = setTimeout(() => setPhase("unlocked"), 1400);
    const autoDismiss = setTimeout(() => onClose(), 7000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(autoDismiss);
    };
  }, [isOpen, onClose]);

  const iconId =
    awardImageUrl && !awardImageUrl.startsWith("/") && !awardImageUrl.startsWith("http")
      ? awardImageUrl
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {phase === "unlocked" && (
            <>
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full pointer-events-none"
                  style={{
                    background: ["#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7"][
                      i % 6
                    ],
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: (Math.cos((i / 12) * Math.PI * 2) * (80 + Math.random() * 60)),
                    y: (Math.sin((i / 12) * Math.PI * 2) * (80 + Math.random() * 60)),
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ))}
            </>
          )}

          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-b ${gradient} p-6 pb-8`}>
              <button
                className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
                onClick={onClose}
              >
                <X size={18} />
              </button>

              <motion.div
                className="text-center text-white/80 text-sm font-semibold uppercase tracking-widest mb-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Award Unlocked!
              </motion.div>

              <div className="flex justify-center mb-4 relative">
                <motion.div
                  animate={
                    phase === "unlocking"
                      ? { scale: [1, 1.2, 0.9, 1.1, 1], rotate: [0, -5, 5, -3, 0] }
                      : {}
                  }
                  transition={{ duration: 0.8 }}
                >
                  <AwardBadge
                    tier={awardTier}
                    icon={iconId}
                    size={100}
                    locked={phase === "locked"}
                  />
                </motion.div>

                {phase === "unlocked" && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ opacity: 0.8, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 2 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,215,0,0.5) 0%, transparent 70%)",
                    }}
                  />
                )}
              </div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "unlocked" ? 1 : 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-white font-bold text-xl leading-tight mb-1">
                  {awardName}
                </div>
                <div className="text-white/70 text-sm capitalize">{awardTier}</div>
              </motion.div>
            </div>

            <div className="bg-slate-900 px-6 py-4">
              <AnimatePresence>
                {phase === "unlocked" && (
                  <motion.div
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles className="text-yellow-400" size={18} />
                    <span className="text-yellow-400 font-black text-2xl">
                      +{xpReward} XP
                    </span>
                    <Sparkles className="text-yellow-400" size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                className="mt-3 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
              >
                <button
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Tap to dismiss
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
