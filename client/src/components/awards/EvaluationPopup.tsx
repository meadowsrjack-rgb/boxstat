import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EvaluationPopupProps {
  isOpen: boolean;
  oldOvr: number;
  newOvr: number;
  onClose: () => void;
}

export function EvaluationPopup({ isOpen, oldOvr, newOvr, onClose }: EvaluationPopupProps) {
  const [animatedOvr, setAnimatedOvr] = useState(oldOvr);
  const [barProgress, setBarProgress] = useState((oldOvr / 100) * 100);
  const [hasAnimated, setHasAnimated] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const diff = newOvr - oldOvr;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  useEffect(() => {
    if (!isOpen) {
      setAnimatedOvr(oldOvr);
      setBarProgress((oldOvr / 100) * 100);
      setHasAnimated(false);
      return;
    }

    setAnimatedOvr(oldOvr);
    setBarProgress((oldOvr / 100) * 100);
    setHasAnimated(false);

    const delay = setTimeout(() => {
      setHasAnimated(true);

      const duration = 1200;
      const startTime = Date.now();
      const startOvr = oldOvr;
      const endOvr = newOvr;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startOvr + (endOvr - startOvr) * eased);
        setAnimatedOvr(current);
        setBarProgress((current / 100) * 100);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, 600);

    const autoDismiss = setTimeout(() => {
      onCloseRef.current();
    }, 6000);

    return () => {
      clearTimeout(delay);
      clearTimeout(autoDismiss);
    };
  }, [isOpen, oldOvr, newOvr]);

  const TrendIcon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;
  const trendColor = isIncrease
    ? "text-green-400"
    : isDecrease
    ? "text-red-400"
    : "text-gray-400";

  const barColor = isIncrease
    ? "from-blue-500 to-green-400"
    : isDecrease
    ? "from-blue-500 to-red-400"
    : "from-blue-500 to-blue-400";

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors z-10"
              onClick={onClose}
            >
              <X size={18} />
            </button>

            <div className="px-6 pt-6 pb-2 text-center">
              <motion.div
                className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Skills Evaluation
              </motion.div>
              <motion.div
                className="text-white text-base font-medium mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Your rating has been updated
              </motion.div>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">Previous</div>
                  <div className="text-3xl font-bold text-slate-300">{oldOvr}</div>
                  <div className="text-xs text-slate-500">OVR</div>
                </div>

                <motion.div
                  className={`flex flex-col items-center ${trendColor}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: hasAnimated ? 1 : 0 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 400 }}
                >
                  <TrendIcon size={24} />
                  {diff !== 0 && (
                    <span className="text-sm font-bold">
                      {isIncrease ? "+" : ""}{diff}
                    </span>
                  )}
                </motion.div>

                <div className="text-center">
                  <div className="text-xs text-slate-400 mb-1">New</div>
                  <motion.div
                    className={`text-5xl font-black ${isIncrease ? "text-green-400" : isDecrease ? "text-red-400" : "text-white"}`}
                    animate={{ scale: hasAnimated ? [1, 1.15, 1] : 1 }}
                    transition={{ delay: 1.8, duration: 0.3 }}
                  >
                    {animatedOvr}
                  </motion.div>
                  <div className="text-xs text-slate-500">OVR</div>
                </div>
              </div>

              <div className="relative h-3 rounded-full bg-slate-700 overflow-hidden mt-4">
                <motion.div
                  className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${barColor}`}
                  initial={{ width: `${(oldOvr / 100) * 100}%` }}
                  animate={{ width: `${barProgress}%` }}
                  transition={{ delay: 0.6, duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>

              <motion.div
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
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
