import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface TimeWindow {
  type: "rsvp-open" | "rsvp-close" | "checkin-open" | "checkin-close";
  value: number;
  unit: "hours" | "minutes";
  timing: "before" | "after";
}

interface TimeWindowConfigProps {
  rsvpOpensHoursBefore?: number;
  rsvpClosesHoursBefore?: number;
  checkInOpensHoursBefore?: number;
  checkInClosesMinutesAfter?: number;
  onChange: (values: {
    rsvpOpensHoursBefore: number;
    rsvpClosesHoursBefore: number;
    checkInOpensHoursBefore: number;
    checkInClosesMinutesAfter: number;
  }) => void;
  onSetAsDefault?: (shouldSet: boolean) => void;
  showSetAsDefault?: boolean;
}

export function TimeWindowConfig({
  rsvpOpensHoursBefore = 72,
  rsvpClosesHoursBefore = 24,
  checkInOpensHoursBefore = 3,
  checkInClosesMinutesAfter = 15,
  onChange,
  onSetAsDefault,
  showSetAsDefault = true,
}: TimeWindowConfigProps) {
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Convert backend values to UI format
  const [windows, setWindows] = useState<TimeWindow[]>([
    {
      type: "rsvp-open",
      value: rsvpOpensHoursBefore,
      unit: "hours",
      timing: "before",
    },
    {
      type: "rsvp-close",
      value: rsvpClosesHoursBefore,
      unit: "hours",
      timing: "before",
    },
    {
      type: "checkin-open",
      value: checkInOpensHoursBefore,
      unit: "hours",
      timing: "before",
    },
    {
      type: "checkin-close",
      value: checkInClosesMinutesAfter,
      unit: "minutes",
      timing: "after",
    },
  ]);

  // Sync props to state when they change
  useEffect(() => {
    setWindows([
      {
        type: "rsvp-open",
        value: rsvpOpensHoursBefore,
        unit: "hours",
        timing: "before",
      },
      {
        type: "rsvp-close",
        value: rsvpClosesHoursBefore,
        unit: "hours",
        timing: "before",
      },
      {
        type: "checkin-open",
        value: checkInOpensHoursBefore,
        unit: "hours",
        timing: "before",
      },
      {
        type: "checkin-close",
        value: checkInClosesMinutesAfter,
        unit: "minutes",
        timing: "after",
      },
    ]);
  }, [rsvpOpensHoursBefore, rsvpClosesHoursBefore, checkInOpensHoursBefore, checkInClosesMinutesAfter]);

  const updateWindow = (index: number, updates: Partial<TimeWindow>) => {
    const newWindows = [...windows];
    newWindows[index] = { ...newWindows[index], ...updates };
    setWindows(newWindows);

    // Convert UI format back to backend values
    // Backend expects:
    // - rsvpOpensHoursBefore: hours (decimal allowed)
    // - rsvpClosesHoursBefore: hours (decimal allowed)
    // - checkInOpensHoursBefore: hours (decimal allowed)
    // - checkInClosesMinutesAfter: minutes (always "after")
    const backendValues = {
      rsvpOpensHoursBefore:
        newWindows[0].unit === "hours"
          ? newWindows[0].value
          : newWindows[0].value / 60,
      rsvpClosesHoursBefore:
        newWindows[1].unit === "hours"
          ? newWindows[1].value
          : newWindows[1].value / 60,
      checkInOpensHoursBefore:
        newWindows[2].unit === "hours"
          ? newWindows[2].value
          : newWindows[2].value / 60,
      checkInClosesMinutesAfter:
        newWindows[3].unit === "minutes"
          ? newWindows[3].value
          : newWindows[3].value * 60,
    };

    onChange(backendValues);
  };

  const incrementValue = (index: number) => {
    updateWindow(index, { value: windows[index].value + 1 });
  };

  const decrementValue = (index: number) => {
    if (windows[index].value > 0) {
      updateWindow(index, { value: windows[index].value - 1 });
    }
  };

  const getWindowLabel = (type: TimeWindow["type"]) => {
    switch (type) {
      case "rsvp-open":
        return "RSVP Opens";
      case "rsvp-close":
        return "RSVP Closes";
      case "checkin-open":
        return "Check-in Opens";
      case "checkin-close":
        return "Check-in Closes";
    }
  };

  const handleSetAsDefaultChange = (checked: boolean) => {
    setSetAsDefault(checked);
    onSetAsDefault?.(checked);
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="text-sm font-medium">RSVP & Check-in Windows</h4>
      
      {windows.map((window, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 p-3 rounded-md shadow-sm"
          data-testid={`time-window-${index}`}
        >
          {/* Type Label */}
          <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300">
            {getWindowLabel(window.type)}
          </div>

          {/* Number Input with Spinner */}
          <div className="relative flex items-center">
            <Input
              type="number"
              min="0"
              step="any"
              value={window.value}
              onChange={(e) => updateWindow(index, { value: Number(e.target.value) })}
              className="w-20 pr-8 text-center"
              data-testid={`input-window-value-${index}`}
            />
            <div className="absolute right-1 flex flex-col">
              <button
                type="button"
                onClick={() => incrementValue(index)}
                className="h-4 w-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t"
                data-testid={`button-increment-${index}`}
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => decrementValue(index)}
                className="h-4 w-6 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b"
                data-testid={`button-decrement-${index}`}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Unit Dropdown */}
          <Select
            value={window.unit}
            onValueChange={(value: "hours" | "minutes") => {
              // Convert value when changing units - preserve exact duration
              let newValue = window.value;
              if (value === "minutes" && window.unit === "hours") {
                newValue = window.value * 60;
              } else if (value === "hours" && window.unit === "minutes") {
                newValue = window.value / 60; // Keep as decimal (e.g., 30 mins = 0.5 hours)
              }
              updateWindow(index, { unit: value, value: newValue });
            }}
          >
            <SelectTrigger className="w-28" data-testid={`select-unit-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">minutes</SelectItem>
              <SelectItem value="hours">hours</SelectItem>
            </SelectContent>
          </Select>

          {/* Timing Dropdown - locked to "before" for first 3, "after" for last */}
          <Select
            value={window.timing}
            onValueChange={(value: "before" | "after") =>
              updateWindow(index, { timing: value })
            }
            disabled={true}
          >
            <SelectTrigger className="w-24" data-testid={`select-timing-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before">before</SelectItem>
              <SelectItem value="after">after</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}

      {/* Set as Default Checkbox */}
      {showSetAsDefault && (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="set-as-default"
            checked={setAsDefault}
            onCheckedChange={handleSetAsDefaultChange}
            data-testid="checkbox-set-as-default"
          />
          <Label
            htmlFor="set-as-default"
            className="text-sm font-medium cursor-pointer"
          >
            Set as default
          </Label>
        </div>
      )}
    </div>
  );
}
