import { useEffect, useState, useRef, useCallback } from "react";
import { useTutorial, TutorialStep } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

interface HighlightedElement {
  selector: string;
  padding?: number;
}

interface StepConfig {
  title: string;
  description: string;
  highlight?: HighlightedElement;
  buttonText?: string;
  allowClick?: boolean;
  position?: "center" | "bottom" | "top";
}

const STEP_CONFIGS: Record<TutorialStep, StepConfig | null> = {
  welcome: {
    title: "Welcome to BoxStat!",
    description: "This is your Profile Gateway. Switch between your parent account and player profiles. Tap any card to enter that dashboard.",
    buttonText: "Got it!",
    position: "center",
  },
  "add-player": {
    title: "Add Your Players",
    description: "Click the button below to create player profiles for your children.",
    highlight: { selector: '[data-testid="button-add-player-icon"]', padding: 8 },
    allowClick: true,
    position: "top",
  },
  "open-parent-dashboard": {
    title: "Open Your Parent Dashboard",
    description: "Great! Now tap your account card to access your Parent Dashboard.",
    highlight: { selector: '[data-testid="card-account-profile"]', padding: 4 },
    allowClick: true,
    position: "bottom",
  },
  "parent-dashboard-intro": {
    title: "Welcome to Your Parent Dashboard!",
    description: "Here you can access Events, Payments & Team Chats. Manage your players and stay connected with coaches.",
    buttonText: "Continue",
    position: "center",
  },
  "click-payments": {
    title: "Register Your Players",
    description: "Click on the Payments tab to assign your players to programs or memberships.",
    highlight: { selector: '[data-tutorial="payments-tab"]', padding: 4 },
    allowClick: true,
    position: "top",
  },
  "payments-finish": {
    title: "Complete Your Registration!",
    description: "Finish your registration here by enrolling your players in programs. You're all set!",
    buttonText: "Finish Tutorial",
    position: "center",
  },
  completed: null,
};

export function TutorialOverlay() {
  const { isActive, currentStep, currentStepIndex, totalSteps, nextStep, skipTutorial, completeTutorial } = useTutorial();
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [elementMissing, setElementMissing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stepConfig = STEP_CONFIGS[currentStep];

  useEffect(() => {
    if (!isActive || !stepConfig?.highlight) {
      setHighlightRect(null);
      setElementMissing(false);
      return;
    }

    let missingCount = 0;

    const updateHighlight = () => {
      const element = document.querySelector(stepConfig.highlight!.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        setElementMissing(false);
        missingCount = 0;
      } else {
        setHighlightRect(null);
        missingCount++;
        if (missingCount > 30) {
          setElementMissing(true);
        }
      }
    };

    updateHighlight();
    const interval = setInterval(updateHighlight, 100);
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [isActive, currentStep, stepConfig]);

  useEffect(() => {
    if (!isActive || !stepConfig?.allowClick || !stepConfig.highlight) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('[data-tutorial-overlay]')) {
        return;
      }

      const highlightedElement = document.querySelector(stepConfig.highlight!.selector);
      
      if (!highlightedElement) {
        return;
      }
      
      if (highlightedElement.contains(target)) {
        setTimeout(() => {
          nextStep();
        }, 300);
        return;
      }

      const hitElement = document.elementFromPoint(e.clientX, e.clientY);
      if (hitElement && (highlightedElement.contains(hitElement) || hitElement === highlightedElement)) {
        setTimeout(() => {
          nextStep();
        }, 300);
        return;
      }

      const rect = highlightedElement.getBoundingClientRect();
      const padding = stepConfig.highlight!.padding || 0;
      const isInHighlight = (
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding
      );

      if (isInHighlight) {
        setTimeout(() => {
          nextStep();
        }, 300);
        return;
      }

      e.stopPropagation();
      e.preventDefault();
    };

    document.addEventListener("click", handleClick, true);
    
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [isActive, stepConfig, nextStep]);

  if (!isActive || !stepConfig) return null;

  const padding = stepConfig.highlight?.padding || 0;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const handleButtonClick = () => {
    if (currentStep === "payments-finish") {
      completeTutorial();
    } else {
      nextStep();
    }
  };

  const getTooltipPosition = () => {
    if (!highlightRect || stepConfig.position === "center") {
      return { 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)" 
      };
    }

    const viewportHeight = window.innerHeight;
    const tooltipHeight = 200;

    if (stepConfig.position === "top" || highlightRect.top > viewportHeight / 2) {
      return {
        top: `${Math.max(100, highlightRect.top - tooltipHeight - 20)}px`,
        left: "50%",
        transform: "translateX(-50%)",
      };
    }

    return {
      top: `${Math.min(viewportHeight - tooltipHeight - 20, highlightRect.bottom + 20)}px`,
      left: "50%",
      transform: "translateX(-50%)",
    };
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[9999] pointer-events-none" data-tutorial-overlay>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 z-[10001] pointer-events-auto" data-tutorial-overlay>
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={skipTutorial}
        className="absolute top-4 right-4 z-[10002] p-2 text-gray-400 hover:text-white transition-colors bg-gray-900/80 rounded-full pointer-events-auto"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        data-tutorial-overlay
      >
        <X className="w-5 h-5" />
      </button>

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tutorial-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - padding}
                y={highlightRect.top - padding}
                width={highlightRect.width + padding * 2}
                height={highlightRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </svg>

      {highlightRect && stepConfig.allowClick && (
        <div
          className="absolute rounded-xl pointer-events-none z-[10000]"
          style={{
            left: highlightRect.left - padding - 4,
            top: highlightRect.top - padding - 4,
            width: highlightRect.width + padding * 2 + 8,
            height: highlightRect.height + padding * 2 + 8,
            boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4)",
            animation: "pulse-ring 2s ease-in-out infinite",
          }}
        />
      )}

      <div
        className="absolute z-[10001] w-[90%] max-w-sm p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-red-500/30 shadow-2xl pointer-events-auto"
        style={getTooltipPosition()}
        data-tutorial-overlay
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-white">{stepConfig.title}</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          {stepConfig.description}
        </p>
        
        {stepConfig.buttonText && (
          <Button
            onClick={handleButtonClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            data-tutorial-overlay
          >
            {stepConfig.buttonText}
          </Button>
        )}
        
        {stepConfig.allowClick && highlightRect && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Tap the highlighted area to continue
          </p>
        )}

        {stepConfig.allowClick && (elementMissing || !highlightRect) && (
          <div className="mt-3">
            <p className="text-xs text-amber-400 text-center mb-2">
              {elementMissing ? "Can't find the button? " : "Loading... "}Skip this step:
            </p>
            <Button
              onClick={nextStep}
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              data-tutorial-overlay
            >
              Skip Step
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentStepIndex ? "bg-red-500" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.6);
          }
        }
      `}</style>
    </div>
  );
}
