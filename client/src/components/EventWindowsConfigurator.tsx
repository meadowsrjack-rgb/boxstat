import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Info, Trash2, Plus } from 'lucide-react';
import { TimeUnit, Direction, offsetFromStart, generateTimelineSentence, formatDateTime } from '@/lib/time';

export interface EventWindow {
  id: string;
  windowType: 'rsvp' | 'checkin';
  openRole: 'open' | 'close';
  amount: number;
  unit: TimeUnit;
  direction: Direction;
  isDefault?: boolean;
}

interface EventWindowsConfiguratorProps {
  eventStartTime: Date;
  windows: EventWindow[];
  onChange: (windows: EventWindow[]) => void;
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
    description: 'RSVP 3 days before to 1 day before, Check-In 30 min before to event start',
    windows: [
      { windowType: 'rsvp', openRole: 'open', amount: 3, unit: 'days', direction: 'before', isDefault: true },
      { windowType: 'rsvp', openRole: 'close', amount: 1, unit: 'days', direction: 'before', isDefault: true },
      { windowType: 'checkin', openRole: 'open', amount: 30, unit: 'minutes', direction: 'before', isDefault: true },
      { windowType: 'checkin', openRole: 'close', amount: 0, unit: 'minutes', direction: 'after', isDefault: true },
    ],
  },
  {
    name: 'One-Day Camp',
    description: 'RSVP 1 week before to 2 days before, Check-In 1 hour before to 15 min after',
    windows: [
      { windowType: 'rsvp', openRole: 'open', amount: 7, unit: 'days', direction: 'before', isDefault: false },
      { windowType: 'rsvp', openRole: 'close', amount: 2, unit: 'days', direction: 'before', isDefault: false },
      { windowType: 'checkin', openRole: 'open', amount: 1, unit: 'hours', direction: 'before', isDefault: false },
      { windowType: 'checkin', openRole: 'close', amount: 15, unit: 'minutes', direction: 'after', isDefault: false },
    ],
  },
];

export default function EventWindowsConfigurator({
  eventStartTime,
  windows,
  onChange,
  className = '',
}: EventWindowsConfiguratorProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    validateWindows();
  }, [windows, eventStartTime]);

  const generateId = () => `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const applyPreset = (preset: Preset) => {
    const newWindows: EventWindow[] = preset.windows.map(w => ({
      ...w,
      id: generateId(),
    }));
    onChange(newWindows);
  };

  const addWindow = () => {
    const newWindow: EventWindow = {
      id: generateId(),
      windowType: 'rsvp',
      openRole: 'open',
      amount: 1,
      unit: 'days',
      direction: 'before',
      isDefault: false,
    };
    onChange([...windows, newWindow]);
  };

  const updateWindow = (id: string, updates: Partial<EventWindow>) => {
    onChange(windows.map(w => (w.id === id ? { ...w, ...updates } : w)));
  };

  const removeWindow = (id: string) => {
    onChange(windows.filter(w => w.id !== id));
  };

  const validateWindows = () => {
    const errors: string[] = [];

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
        errors.push('RSVP window: Open time must be before close time');
      }
    }

    if (checkinOpen && checkinClose) {
      const openDate = offsetFromStart(eventStartTime, checkinOpen.amount, checkinOpen.unit, checkinOpen.direction);
      const closeDate = offsetFromStart(eventStartTime, checkinClose.amount, checkinClose.unit, checkinClose.direction);
      if (openDate >= closeDate) {
        errors.push('Check-In window: Open time must be before close time');
      }
    }

    if (checkinOpen && checkinClose) {
      const checkinOpenDate = offsetFromStart(eventStartTime, checkinOpen.amount, checkinOpen.unit, checkinOpen.direction);
      if (checkinOpenDate < new Date(eventStartTime.getTime() - 24 * 60 * 60 * 1000)) {
        errors.push('Check-In should not open more than 24 hours before the event');
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
          rsvpOpen.amount,
          rsvpOpen.unit,
          rsvpOpen.direction,
          rsvpClose.amount,
          rsvpClose.unit,
          rsvpClose.direction
        )
      );
    }

    if (checkinOpen && checkinClose) {
      preview.push(
        generateTimelineSentence(
          'Check-In',
          checkinOpen.amount,
          checkinOpen.unit,
          checkinOpen.direction,
          checkinClose.amount,
          checkinClose.unit,
          checkinClose.direction
        )
      );
    }

    return preview;
  };

  const timelinePreview = getTimelinePreview();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">RSVP & Check-In Windows</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addWindow}
          data-testid="button-add-window"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Window
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
            className="text-left flex-col items-start h-auto py-2"
            data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="font-medium text-sm">{preset.name}</span>
            <span className="text-xs text-muted-foreground">{preset.description}</span>
          </Button>
        ))}
      </div>

      {windows.length === 0 && (
        <Alert data-testid="alert-no-windows">
          <Info className="h-4 w-4" />
          <AlertDescription>
            No windows configured. Use a preset or add custom windows.
          </AlertDescription>
        </Alert>
      )}

      {windows.length > 0 && (
        <div className="space-y-3">
          {windows.map((window) => (
            <Card key={window.id} className="p-4" data-testid={`window-${window.id}`}>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={window.windowType}
                    onValueChange={(value) => updateWindow(window.id, { windowType: value as 'rsvp' | 'checkin' })}
                  >
                    <SelectTrigger data-testid={`select-type-${window.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rsvp">RSVP</SelectItem>
                      <SelectItem value="checkin">Check-In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={window.openRole}
                    onValueChange={(value) => updateWindow(window.id, { openRole: value as 'open' | 'close' })}
                  >
                    <SelectTrigger data-testid={`select-role-${window.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="close">Close</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    value={window.amount}
                    onChange={(e) => updateWindow(window.id, { amount: parseInt(e.target.value) || 0 })}
                    data-testid={`input-amount-${window.id}`}
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <Select
                    value={window.unit}
                    onValueChange={(value) => updateWindow(window.id, { unit: value as TimeUnit })}
                  >
                    <SelectTrigger data-testid={`select-unit-${window.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Direction</Label>
                  <Select
                    value={window.direction}
                    onValueChange={(value) => updateWindow(window.id, { direction: value as Direction })}
                  >
                    <SelectTrigger data-testid={`select-direction-${window.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Before</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWindow(window.id)}
                    data-testid={`button-remove-${window.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {timelinePreview.length > 0 && (
        <Alert data-testid="alert-timeline-preview">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium text-sm">Timeline Preview:</p>
              {timelinePreview.map((preview, idx) => (
                <p key={idx} className="text-sm text-muted-foreground">
                  • {preview}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert variant="destructive" data-testid="alert-validation-errors">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, idx) => (
                <p key={idx} className="text-sm">
                  • {error}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
