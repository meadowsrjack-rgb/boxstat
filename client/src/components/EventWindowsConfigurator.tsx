import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, ChevronUp, ChevronDown, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { offsetFromStart, formatDateTime, pluralize } from "@/lib/time";

type WindowType = "RSVP" | "Check-in";
type WindowRole = "open" | "close";
type TimeUnit = "minutes" | "hours" | "days";
type Direction = "before" | "after";

export interface WindowRule {
  id: string;
  type: WindowType;
  role: WindowRole;
  amount: number;
  unit: TimeUnit;
  direction: Direction;
  isDefault: boolean;
}

interface EventWindowsConfiguratorProps {
  initialRules?: WindowRule[];
  eventStart?: Date;
  onChange?: (rules: WindowRule[]) => void;
  onSave?: (rules: WindowRule[]) => void;
}

const PRESETS = {
  "Typical Youth Event": [
    { type: "RSVP" as WindowType, role: "open" as WindowRole, amount: 7, unit: "days" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "RSVP" as WindowType, role: "close" as WindowRole, amount: 1, unit: "days" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "Check-in" as WindowType, role: "open" as WindowRole, amount: 30, unit: "minutes" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "Check-in" as WindowType, role: "close" as WindowRole, amount: 15, unit: "minutes" as TimeUnit, direction: "after" as Direction, isDefault: false },
  ],
  "One-Day Camp": [
    { type: "RSVP" as WindowType, role: "open" as WindowRole, amount: 14, unit: "days" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "RSVP" as WindowType, role: "close" as WindowRole, amount: 1, unit: "days" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "Check-in" as WindowType, role: "open" as WindowRole, amount: 1, unit: "hours" as TimeUnit, direction: "before" as Direction, isDefault: false },
    { type: "Check-in" as WindowType, role: "close" as WindowRole, amount: 15, unit: "minutes" as TimeUnit, direction: "after" as Direction, isDefault: false },
  ],
};

export default function EventWindowsConfigurator({
  initialRules = [],
  eventStart = new Date("2025-11-01T18:00:00"),
  onChange,
  onSave,
}: EventWindowsConfiguratorProps) {
  const [rules, setRules] = useState<WindowRule[]>(initialRules);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    onChange?.(rules);
  }, [rules, onChange]);

  const addRule = () => {
    const newRule: WindowRule = {
      id: nanoid(),
      type: "RSVP",
      role: "open",
      amount: 7,
      unit: "days",
      direction: "before",
      isDefault: false,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<WindowRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const moveRule = (id: string, direction: "up" | "down") => {
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === rules.length - 1) return;

    const newRules = [...rules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    setRules(newRules);
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName as keyof typeof PRESETS];
    if (preset) {
      setRules(preset.map(p => ({ ...p, id: nanoid() })));
    }
  };

  const addClosingWindow = (type: WindowType) => {
    const defaultClose: WindowRule = {
      id: nanoid(),
      type,
      role: "close",
      amount: type === "RSVP" ? 1 : 15,
      unit: type === "RSVP" ? "days" : "minutes",
      direction: type === "RSVP" ? "before" : "after",
      isDefault: false,
    };
    setRules([...rules, defaultClose]);
  };

  const getSentence = (rule: WindowRule): string => {
    const typeLabel = rule.type;
    const roleLabel = rule.role === "open" ? "opens" : "closes";
    const timeStr = pluralize(rule.amount, rule.unit);
    const directionStr = rule.direction;
    return `${typeLabel} ${roleLabel} ${timeStr} ${directionStr} event start.`;
  };

  const getComputedTime = (rule: WindowRule): Date => {
    return offsetFromStart(eventStart, rule.amount, rule.unit, rule.direction);
  };

  // Validation
  const errors: string[] = [];
  const warnings: string[] = [];

  const rsvpRules = rules.filter(r => r.type === "RSVP");
  const checkinRules = rules.filter(r => r.type === "Check-in");

  const validateType = (typeRules: WindowRule[], typeName: string) => {
    const openRule = typeRules.find(r => r.role === "open");
    const closeRule = typeRules.find(r => r.role === "close");

    if (openRule && closeRule) {
      const openTime = getComputedTime(openRule);
      const closeTime = getComputedTime(closeRule);
      if (openTime >= closeTime) {
        errors.push(`${typeName} close must be after ${typeName} open.`);
      }
    }
  };

  validateType(rsvpRules, "RSVP");
  validateType(checkinRules, "Check-in");

  // Check for check-in open too early
  const checkinOpen = checkinRules.find(r => r.role === "open");
  if (checkinOpen && checkinOpen.direction === "before") {
    if (
      (checkinOpen.unit === "hours" && checkinOpen.amount > 12) ||
      (checkinOpen.unit === "days" && checkinOpen.amount >= 1)
    ) {
      warnings.push("Check-in opens more than 12 hours before event start.");
    }
  }

  // Check for duplicates
  const seen = new Set<string>();
  for (const rule of rules) {
    const key = `${rule.type}-${rule.role}-${rule.amount}-${rule.unit}-${rule.direction}`;
    if (seen.has(key)) {
      errors.push("Duplicate window rules detected.");
      break;
    }
    seen.add(key);
  }

  const hasErrors = errors.length > 0;

  const handleSave = () => {
    if (hasErrors) return;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onSave?.(rules);
  };

  const handleReset = () => {
    setRules(initialRules);
    setSaveSuccess(false);
  };

  // Timeline preview
  const getTypeTimeline = (type: WindowType) => {
    const typeRules = rules.filter(r => r.type === type);
    const open = typeRules.find(r => r.role === "open");
    const close = typeRules.find(r => r.role === "close");

    return {
      open: open ? formatDateTime(getComputedTime(open)) : "—",
      close: close ? formatDateTime(getComputedTime(close)) : "—",
    };
  };

  const rsvpTimeline = getTypeTimeline("RSVP");
  const checkinTimeline = getTypeTimeline("Check-in");

  // Check if closing window exists
  const hasClosingWindow = (type: WindowType) => {
    return rules.some(r => r.type === type && r.role === "close");
  };

  const hasOpenWindow = (type: WindowType) => {
    return rules.some(r => r.type === type && r.role === "open");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP & Check-In Windows</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rules List */}
        <div className="space-y-4">
          {rules.map((rule, index) => (
            <div key={rule.id} className="space-y-2">
              <Card className="border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-[140px,120px,150px,140px,140px,160px,80px] items-center gap-3">
                    {/* Type Select */}
                    <div>
                      <label htmlFor={`type-${rule.id}`} className="sr-only">Type</label>
                      <Select
                        value={rule.type}
                        onValueChange={(value) => updateRule(rule.id, { type: value as WindowType })}
                      >
                        <SelectTrigger id={`type-${rule.id}`} data-testid={`select-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RSVP">RSVP</SelectItem>
                          <SelectItem value="Check-in">Check-in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Role Select */}
                    <div>
                      <label htmlFor={`role-${rule.id}`} className="sr-only">Role</label>
                      <Select
                        value={rule.role}
                        onValueChange={(value) => updateRule(rule.id, { role: value as WindowRole })}
                      >
                        <SelectTrigger id={`role-${rule.id}`} data-testid={`select-role-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Opens</SelectItem>
                          <SelectItem value="close">Closes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-2">
                      <label htmlFor={`amount-${rule.id}`} className="sr-only">Amount</label>
                      <Input
                        id={`amount-${rule.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={rule.amount}
                        onChange={(e) => updateRule(rule.id, { amount: parseInt(e.target.value) || 0 })}
                        data-testid={`input-amount-${index}`}
                      />
                    </div>

                    {/* Unit Select */}
                    <div>
                      <label htmlFor={`unit-${rule.id}`} className="sr-only">Unit</label>
                      <Select
                        value={rule.unit}
                        onValueChange={(value) => updateRule(rule.id, { unit: value as TimeUnit })}
                      >
                        <SelectTrigger id={`unit-${rule.id}`} data-testid={`select-unit-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="hours">hours</SelectItem>
                          <SelectItem value="days">days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Direction Select */}
                    <div>
                      <label htmlFor={`direction-${rule.id}`} className="sr-only">Direction</label>
                      <Select
                        value={rule.direction}
                        onValueChange={(value) => updateRule(rule.id, { direction: value as Direction })}
                      >
                        <SelectTrigger id={`direction-${rule.id}`} data-testid={`select-direction-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">before</SelectItem>
                          <SelectItem value="after">after</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Default Checkbox */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`default-${rule.id}`}
                        checked={rule.isDefault}
                        onCheckedChange={(checked) => updateRule(rule.id, { isDefault: !!checked })}
                        data-testid={`checkbox-default-${index}`}
                      />
                      <label htmlFor={`default-${rule.id}`} className="text-sm">
                        Set as default
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveRule(rule.id, "up")}
                        disabled={index === 0}
                        aria-label="Move up"
                        data-testid={`button-move-up-${index}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveRule(rule.id, "down")}
                        disabled={index === rules.length - 1}
                        aria-label="Move down"
                        data-testid={`button-move-down-${index}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        aria-label="Delete rule"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline sentence preview */}
                  <div className="mt-3 text-sm text-muted-foreground" data-testid={`sentence-${index}`}>
                    {getSentence(rule)}
                  </div>
                </CardContent>
              </Card>

              {/* Add closing window link */}
              {rule.role === "open" && !hasClosingWindow(rule.type) && (
                <button
                  onClick={() => addClosingWindow(rule.type)}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  data-testid={`link-add-closing-${index}`}
                >
                  + Add closing window for this {rule.type}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Rule Button */}
        <Button
          variant="link"
          onClick={addRule}
          className="text-blue-600 p-0 h-auto"
          data-testid="button-add-rule"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add RSVP/Check-in Window
        </Button>

        {/* Apply Preset */}
        <div className="flex items-center gap-3">
          <label htmlFor="preset-select" className="text-sm font-medium">
            Apply preset:
          </label>
          <Select onValueChange={applyPreset}>
            <SelectTrigger id="preset-select" className="w-[200px]" data-testid="select-preset">
              <SelectValue placeholder="Choose preset..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Typical Youth Event">Typical Youth Event</SelectItem>
              <SelectItem value="One-Day Camp">One-Day Camp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline Preview */}
        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <div className="font-semibold">Timeline Preview</div>
              <div className="text-muted-foreground">
                <strong>Event Start:</strong> {formatDateTime(eventStart)}
              </div>
              <div className="text-muted-foreground">
                <strong>RSVP:</strong> Opens {rsvpTimeline.open} | Closes {rsvpTimeline.close}
              </div>
              <div className="text-muted-foreground">
                <strong>Check-in:</strong> Opens {checkinTimeline.open} | Closes {checkinTimeline.close}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Alerts */}
        {errors.map((error, i) => (
          <Alert key={i} variant="destructive" data-testid={`error-${i}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ))}

        {warnings.map((warning, i) => (
          <Alert key={i} className="border-yellow-500 text-yellow-800 dark:text-yellow-200" data-testid={`warning-${i}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        ))}

        {saveSuccess && (
          <Alert className="border-green-500 text-green-800 dark:text-green-200" data-testid="alert-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Configuration saved successfully!</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={hasErrors}
            data-testid="button-save"
          >
            Save
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            data-testid="button-reset"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
