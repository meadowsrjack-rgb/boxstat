import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertCircle } from "lucide-react";

interface PINDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "set" | "verify";
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
}

export function PINDialog({
  open,
  onOpenChange,
  mode,
  onSuccess,
  title,
  description,
}: PINDialogProps) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (open) {
      setPin(["", "", "", ""]);
      setError("");
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError("");

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (newPin.every((digit) => digit !== "")) {
      const pinString = newPin.join("");
      handleSubmit(pinString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleSubmit = (pinString: string) => {
    if (mode === "set") {
      onSuccess(pinString);
      onOpenChange(false);
    } else {
      const savedPin = localStorage.getItem("deviceLockPIN");
      if (pinString === savedPin) {
        onSuccess(pinString);
        onOpenChange(false);
      } else {
        setError("Incorrect PIN. Please try again.");
        setPin(["", "", "", ""]);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {title || (mode === "set" ? "Set Lock PIN" : "Enter PIN to Unlock")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description ||
              (mode === "set"
                ? "Create a 4-digit PIN to secure this device lock"
                : "Enter your 4-digit PIN to unlock the device")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center gap-3">
            {pin.map((digit, index) => (
              <Input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-bold"
                data-testid={`input-pin-${index}`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm justify-center">
              <AlertCircle className="h-4 w-4" />
              <span data-testid="text-pin-error">{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-pin"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
