import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateTimeRangePickerProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
}

function parseDatetimeLocal(val: string): { date: Date | undefined; hour: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!val) return { date: undefined, hour: 5, minute: 0, ampm: 'PM' };
  const d = new Date(val);
  if (isNaN(d.getTime())) return { date: undefined, hour: 5, minute: 0, ampm: 'PM' };
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { date: d, hour: h, minute: m, ampm };
}

function toDatetimeLocal(date: Date, hour: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour;
  if (ampm === 'AM' && hour === 12) h24 = 0;
  else if (ampm === 'PM' && hour !== 12) h24 = hour + 12;
  const d = new Date(date);
  d.setHours(h24, minute, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(h24).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(hour: number, minute: number, ampm: 'AM' | 'PM'): string {
  return `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function DateTimeRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className = '',
}: DateTimeRangePickerProps) {
  const startParsed = parseDatetimeLocal(startValue);
  const endParsed = parseDatetimeLocal(endValue);

  const [startDate, setStartDate] = useState<Date | undefined>(startParsed.date);
  const [endDate, setEndDate] = useState<Date | undefined>(endParsed.date);
  const [startHour, setStartHour] = useState(startParsed.hour);
  const [startMinute, setStartMinute] = useState(startParsed.minute);
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>(startParsed.ampm);
  const [endHour, setEndHour] = useState(endParsed.hour);
  const [endMinute, setEndMinute] = useState(endParsed.minute);
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>(endParsed.ampm);
  const [selectionPhase, setSelectionPhase] = useState<'start' | 'end'>('start');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sp = parseDatetimeLocal(startValue);
    const ep = parseDatetimeLocal(endValue);
    setStartDate(sp.date);
    setEndDate(ep.date);
    setStartHour(sp.hour);
    setStartMinute(sp.minute);
    setStartAmpm(sp.ampm);
    setEndHour(ep.hour);
    setEndMinute(ep.minute);
    setEndAmpm(ep.ampm);
  }, [startValue, endValue]);

  const handleDayClick = useCallback((day: Date) => {
    const dayMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    if (selectionPhase === 'start') {
      setStartDate(dayMidnight);
      setEndDate(undefined);
      setSelectionPhase('end');
    } else {
      const startMidnight = startDate
        ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        : null;
      if (startMidnight && dayMidnight.getTime() < startMidnight.getTime()) {
        setStartDate(dayMidnight);
        setEndDate(undefined);
        setSelectionPhase('end');
      } else {
        setEndDate(dayMidnight);
        setSelectionPhase('start');
      }
    }
  }, [selectionPhase, startDate]);

  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStartHour(5);
    setStartMinute(0);
    setStartAmpm('PM');
    setEndHour(7);
    setEndMinute(0);
    setEndAmpm('PM');
    setSelectionPhase('start');
    onStartChange('');
    onEndChange('');
  };

  const handleApply = () => {
    if (startDate) {
      onStartChange(toDatetimeLocal(startDate, startHour, startMinute, startAmpm));
    }
    if (endDate) {
      onEndChange(toDatetimeLocal(endDate, endHour, endMinute, endAmpm));
    } else if (startDate) {
      onEndChange(toDatetimeLocal(startDate, endHour, endMinute, endAmpm));
    }
    setOpen(false);
  };

  const dateRange: DateRange | undefined = startDate
    ? { from: startDate, to: endDate || undefined }
    : undefined;

  const summaryText = startDate && endDate
    ? `${formatDate(startDate)} ${formatTime(startHour, startMinute, startAmpm)} — ${formatDate(endDate)} ${formatTime(endHour, endMinute, endAmpm)}`
    : startDate
      ? `${formatDate(startDate)} ${formatTime(startHour, startMinute, startAmpm)} — pick end date`
      : 'Pick a date & time range';

  const footerText = startDate && endDate
    ? `${formatDate(startDate)} → ${formatDate(endDate)}`
    : startDate
      ? `Start: ${formatDate(startDate)} — click end date`
      : 'No dates selected';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !startDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate text-sm">{summaryText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <div className="bg-background rounded-lg border shadow-lg">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h4 className="text-sm font-semibold">Select date & time range</h4>
            <p className="text-xs text-muted-foreground">Click start, then end date</p>
          </div>

          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setSelectionPhase('start')}
              className={cn(
                'flex-1 px-4 py-2.5 text-left text-sm transition-colors',
                selectionPhase === 'start'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider block opacity-80">Start</span>
              <span className="block">{startDate ? formatDate(startDate) : 'Pick a date'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectionPhase('end')}
              className={cn(
                'flex-1 px-4 py-2.5 text-left text-sm border-l transition-colors',
                selectionPhase === 'end'
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <span className="text-[10px] uppercase font-semibold tracking-wider block opacity-80">End</span>
              <span className="block">{endDate ? formatDate(endDate) : 'Pick a date'}</span>
            </button>
          </div>

          <div className="flex">
            <div className="border-r">
              <Calendar
                mode="range"
                selected={dateRange}
                onDayClick={handleDayClick}
                numberOfMonths={1}
                className="p-3"
              />
            </div>

            <div className="p-4 w-48 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Start Time</label>
                <div className="flex items-center gap-1">
                  <Select value={String(startHour)} onValueChange={(v) => setStartHour(parseInt(v))}>
                    <SelectTrigger className="w-16 h-9 text-center font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => (
                        <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-medium">:</span>
                  <Select value={String(startMinute)} onValueChange={(v) => setStartMinute(parseInt(v))}>
                    <SelectTrigger className="w-16 h-9 text-center font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map(m => (
                        <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex rounded-md overflow-hidden border">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium transition-colors',
                      startAmpm === 'AM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    )}
                    onClick={() => setStartAmpm('AM')}
                  >AM</button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium transition-colors border-l',
                      startAmpm === 'PM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    )}
                    onClick={() => setStartAmpm('PM')}
                  >PM</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">End Time</label>
                <div className="flex items-center gap-1">
                  <Select value={String(endHour)} onValueChange={(v) => setEndHour(parseInt(v))}>
                    <SelectTrigger className="w-16 h-9 text-center font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(h => (
                        <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-lg font-medium">:</span>
                  <Select value={String(endMinute)} onValueChange={(v) => setEndMinute(parseInt(v))}>
                    <SelectTrigger className="w-16 h-9 text-center font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map(m => (
                        <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex rounded-md overflow-hidden border">
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium transition-colors',
                      endAmpm === 'AM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    )}
                    onClick={() => setEndAmpm('AM')}
                  >AM</button>
                  <button
                    type="button"
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium transition-colors border-l',
                      endAmpm === 'PM' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
                    )}
                    onClick={() => setEndAmpm('PM')}
                  >PM</button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{footerText}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>Clear</Button>
              <Button type="button" size="sm" onClick={handleApply} disabled={!startDate}>Apply</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
