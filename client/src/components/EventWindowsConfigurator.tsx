import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { TimeUnit, Direction, offsetFromStart, generateTimelineSentence } from '@/lib/time';
import type { EventWindow } from '@shared/schema';

interface EventWindowsConfiguratorProps {
  eventStartTime?: Date;
  windows: Partial<EventWindow>[];
  onChange: (windows: Partial<EventWindow>[]) => void;
  className?: string;
}

interface Preset {
  name: string;
  description: string;
  windows: Omit<EventWindow, 'id'>[];
}

const PRESETS: Preset[] = [
  {
    name: 'Typical Youth Event',
    description: '',
    windows: [
      { windowType: 'rsvp', openRole: 'open', amount: 3, unit: 'days', direction: 'before', isDefault: true },
      { windowType: 'rsvp', openRole: 'close', amount: 1, unit: 'days', direction: 'before', isDefault: true },
      { windowType: 'checkin', openRole: 'open', amount: 30, unit: 'minutes', direction: 'before', isDefault: true },
      { windowType: 'checkin', openRole: 'close', amount: 0, unit: 'minutes', direction: 'after', isDefault: true },
    ],
  },
];

function getWindowSummary(w: Partial<EventWindow>): string {
  const role = w.openRole === 'open' ? 'Opens' : 'Closes';
  if (w.amount === 0 && w.direction === 'after') return `${role} at event start`;
  if (w.amount === 0 && w.direction === 'before') return `${role} at event start`;
  return `${role} ${w.amount} ${w.unit} ${w.direction} event`;
}

export default function EventWindowsConfigurator({
  eventStartTime,
  windows,
  onChange,
  className = '',
}: EventWindowsConfiguratorProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    validateWindows();
  }, [windows, eventStartTime]);

  const applyPreset = (preset: Preset) => {
    const newWindows: Partial<EventWindow>[] = preset.windows.map(w => ({
      ...w,
    }));
    onChange(newWindows);
    setExpandedIndex(null);
  };

  const addWindow = () => {
    const newWindow: Partial<EventWindow> = {
      windowType: 'rsvp',
      openRole: 'open',
      amount: 1,
      unit: 'days',
      direction: 'before',
      isDefault: false,
    };
    onChange([...windows, newWindow]);
    setExpandedIndex(windows.length);
  };

  const updateWindow = (index: number, updates: Partial<EventWindow>) => {
    onChange(windows.map((w, i) => (i === index ? { ...w, ...updates } : w)));
  };

  const removeWindow = (index: number) => {
    onChange(windows.filter((_, i) => i !== index));
    setExpandedIndex(null);
  };

  const validateWindows = () => {
    const errors: string[] = [];
    if (!eventStartTime) {
      setValidationErrors([]);
      return;
    }

    const rsvpWindows = windows.filter(w => w.windowType === 'rsvp');
    const checkinWindows = windows.filter(w => w.windowType === 'checkin');

    const rsvpOpen = rsvpWindows.find(w => w.openRole === 'open');
    const rsvpClose = rsvpWindows.find(w => w.openRole === 'close');
    const checkinOpen = checkinWindows.find(w => w.openRole === 'open');
    const checkinClose = checkinWindows.find(w => w.openRole === 'close');

    if (rsvpOpen && rsvpClose) {
      const openDate = offsetFromStart(eventStartTime, rsvpOpen.amount, rsvpOpen.unit, rsvpOpen.direction);
      const closeDate = offsetFromStart(eventStartTime, rsvpClose.amount, rsvpClose.unit, rsvpClose.direction);
      if (openDate >= closeDate) {
        errors.push('RSVP: Open must be before close');
      }
    }

    if (checkinOpen && checkinClose) {
      const openDate = offsetFromStart(eventStartTime, checkinOpen.amount, checkinOpen.unit, checkinOpen.direction);
      const closeDate = offsetFromStart(eventStartTime, checkinClose.amount, checkinClose.unit, checkinClose.direction);
      if (openDate >= closeDate) {
        errors.push('Check-In: Open must be before close');
      }
    }

    if (checkinOpen && checkinClose) {
      const checkinOpenDate = offsetFromStart(eventStartTime, checkinOpen.amount, checkinOpen.unit, checkinOpen.direction);
      if (checkinOpenDate < new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000)) {
        errors.push('Check-In should not open more than 24h before event');
      }
    }

    setValidationErrors(errors);
  };

  const getTimelinePreview = () => {
    const rsvpWindows = windows.filter(w => w.windowType === 'rsvp');
    const checkinWindows = windows.filter(w => w.windowType === 'checkin');

    const rsvpOpen = rsvpWindows.find(w => w.openRole === 'open');
    const rsvpClose = rsvpWindows.find(w => w.openRole === 'close');
    const checkinOpen = checkinWindows.find(w => w.openRole === 'open');
    const checkinClose = checkinWindows.find(w => w.openRole === 'close');

    const preview: string[] = [];

    if (rsvpOpen && rsvpClose) {
      preview.push(
        generateTimelineSentence(
          'RSVP',
          rsvpOpen.amount, rsvpOpen.unit, rsvpOpen.direction,
          rsvpClose.amount, rsvpClose.unit, rsvpClose.direction
        )
      );
    }

    if (checkinOpen && checkinClose) {
      preview.push(
        generateTimelineSentence(
          'Check-In',
          checkinOpen.amount, checkinOpen.unit, checkinOpen.direction,
          checkinClose.amount, checkinClose.unit, checkinClose.direction
        )
      );
    }

    return preview;
  };

  const timelinePreview = getTimelinePreview();

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RSVP & Check-In Windows</label>

      <div className="grid grid-cols-1 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => applyPreset(preset)}
            className="w-full text-left px-4 py-2.5 rounded-lg border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
            data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            Apply typical youth event preset
          </button>
        ))}
      </div>

      {windows.length > 0 && (
        <div className="space-y-2">
          {windows.map((window, index) => (
            <div key={index} data-testid={`window-${index}`}>
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${
                  window.windowType === 'rsvp'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-teal-100 text-teal-700 border border-teal-200'
                }`}>
                  {window.windowType === 'rsvp' ? 'RSVP' : 'Check-in'}
                </span>
                <span className="text-sm flex-1">{getWindowSummary(window)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeWindow(index); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`button-remove-${index}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {expandedIndex === index && (
                <div className="mt-1 p-3 rounded-lg border bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select
                      value={window.windowType}
                      onValueChange={(value) => updateWindow(index, { windowType: value as 'rsvp' | 'checkin' })}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`select-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rsvp">RSVP</SelectItem>
                        <SelectItem value="checkin">Check-In</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Role</Label>
                    <Select
                      value={window.openRole}
                      onValueChange={(value) => updateWindow(index, { openRole: value as 'open' | 'close' })}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`select-role-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="close">Close</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Amt</Label>
                      <Input
                        type="number"
                        min="0"
                        value={window.amount}
                        onChange={(e) => updateWindow(index, { amount: parseInt(e.target.value) || 0 })}
                        className="h-8 text-xs"
                        data-testid={`input-amount-${index}`}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Unit</Label>
                      <Select
                        value={window.unit}
                        onValueChange={(value) => updateWindow(index, { unit: value as TimeUnit })}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-unit-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Min</SelectItem>
                          <SelectItem value="hours">Hr</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">When</Label>
                    <Select
                      value={window.direction}
                      onValueChange={(value) => updateWindow(index, { direction: value as Direction })}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`select-direction-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Before</SelectItem>
                        <SelectItem value="after">After</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addWindow}
        className="w-full py-2.5 rounded-lg border border-dashed text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
        data-testid="button-add-window"
      >
        + Add window
      </button>

      {timelinePreview.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {timelinePreview.map((preview, idx) => (
            <p key={idx}>• {preview}</p>
          ))}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="text-xs text-red-600 space-y-0.5" data-testid="alert-validation-errors">
          {validationErrors.map((error, idx) => (
            <p key={idx}>⚠ {error}</p>
          ))}
        </div>
      )}
    </div>
  );
}
