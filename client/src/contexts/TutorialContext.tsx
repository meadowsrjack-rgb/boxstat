import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type TutorialStep = 
  | "welcome"
  | "add-player"
  | "open-parent-dashboard"
  | "parent-dashboard-intro"
  | "click-payments"
  | "payments-finish"
  | "completed";

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep;
  totalSteps: number;
  currentStepIndex: number;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  setStep: (step: TutorialStep) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

const TUTORIAL_STEPS: TutorialStep[] = [
  "welcome",
  "add-player",
  "open-parent-dashboard",
  "parent-dashboard-intro",
  "click-payments",
  "payments-finish",
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>("welcome");

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem("boxstat_tutorial_completed");
    const savedStep = localStorage.getItem("boxstat_tutorial_step") as TutorialStep | null;
    
    if (!hasCompletedTutorial) {
      setIsActive(true);
      if (savedStep && TUTORIAL_STEPS.includes(savedStep)) {
        setCurrentStep(savedStep);
      }
    }
  }, []);

  useEffect(() => {
    if (isActive && currentStep !== "completed") {
      localStorage.setItem("boxstat_tutorial_step", currentStep);
    }
  }, [currentStep, isActive]);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep("welcome");
    localStorage.removeItem("boxstat_tutorial_completed");
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = TUTORIAL_STEPS.indexOf(currentStep);
    if (currentIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(TUTORIAL_STEPS[currentIndex + 1]);
    } else {
      completeTutorial();
    }
  }, [currentStep]);

  const setStep = useCallback((step: TutorialStep) => {
    setCurrentStep(step);
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem("boxstat_tutorial_completed", "true");
    localStorage.removeItem("boxstat_tutorial_step");
  }, []);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep("completed");
    localStorage.setItem("boxstat_tutorial_completed", "true");
    localStorage.removeItem("boxstat_tutorial_step");
  }, []);

  const currentStepIndex = TUTORIAL_STEPS.indexOf(currentStep);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TUTORIAL_STEPS.length,
        currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
        startTutorial,
        nextStep,
        skipTutorial,
        completeTutorial,
        setStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
