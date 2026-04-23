import { useEffect, useState } from "react";
import { DateScrollPicker } from "react-date-wheel-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: string;
  onChange: (value: string) => void;
  startYear?: number;
  endYear?: number;
  defaultDate?: Date;
  title?: string;
  requireSelection?: boolean;
  selectionHint?: string;
  testId?: string;
}

function clampYear(year: number, min: number, max: number) {
  return Math.min(Math.max(year, min), max);
}

function parseValue(value?: string): Date | null {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  open,
  onOpenChange,
  value,
  onChange,
  startYear = 1920,
  endYear = new Date().getFullYear(),
  defaultDate,
  title = "Select Date",
  requireSelection = false,
  selectionHint = "Scroll to select a date",
  testId = "date-picker",
}: DatePickerProps) {
  const isMobile = useIsMobile();
  const existing = parseValue(value);
  const fallback =
    defaultDate ?? new Date(clampYear(2010, startYear, endYear), 0, 1);
  const initial = existing ?? fallback;

  const [tempDate, setTempDate] = useState<Date | undefined>(
    existing ?? undefined,
  );
  const [userHasSelected, setUserHasSelected] = useState<boolean>(!!existing);
  const [calendarMonth, setCalendarMonth] = useState<Date>(initial);

  useEffect(() => {
    if (open) {
      const e = parseValue(value);
      const start = e ?? fallback;
      setTempDate(e ?? undefined);
      setUserHasSelected(!!e);
      setCalendarMonth(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    if (tempDate && (!requireSelection || userHasSelected)) {
      onChange(formatDate(tempDate));
    }
    onOpenChange(false);
  };

  const handleCancel = () => onOpenChange(false);

  const minDate = new Date(startYear, 0, 1);
  const maxDate = new Date(endYear, 11, 31);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-gray-900 border-gray-700 max-w-sm"
        data-testid={`${testId}-dialog`}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-center">{title}</DialogTitle>
        </DialogHeader>
        {isMobile ? (
          <div className="py-4 flex justify-center date-wheel-picker-dark">
            <DateScrollPicker
              key={open ? "open" : "closed"}
              defaultYear={initial.getFullYear()}
              defaultMonth={initial.getMonth()}
              defaultDay={initial.getDate()}
              startYear={startYear}
              endYear={endYear}
              dateTimeFormatOptions={{ month: "short" }}
              highlightOverlayStyle={{
                backgroundColor: "transparent",
                border: "none",
              }}
              onDateChange={(date: Date) => {
                setTempDate(date);
                setUserHasSelected(true);
              }}
            />
          </div>
        ) : (
          <div
            className="py-2 flex justify-center"
            data-testid={`${testId}-calendar`}
          >
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={(date) => {
                if (date) {
                  setTempDate(date);
                  setUserHasSelected(true);
                  setCalendarMonth(date);
                }
              }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              captionLayout="dropdown-buttons"
              fromYear={startYear}
              toYear={endYear}
              fromDate={minDate}
              toDate={maxDate}
              defaultMonth={initial}
              className="text-white"
              classNames={{
                caption_label: "hidden",
                caption_dropdowns: "flex gap-2",
                dropdown:
                  "bg-gray-800 border border-gray-700 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
                dropdown_month: "bg-gray-800 text-white",
                dropdown_year: "bg-gray-800 text-white",
                vhidden: "hidden",
                nav_button:
                  "h-7 w-7 bg-transparent text-white p-0 opacity-70 hover:opacity-100 hover:bg-gray-800 rounded-md",
                head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                day: "h-9 w-9 p-0 font-normal text-white hover:bg-gray-800 rounded-md aria-selected:opacity-100",
                day_selected:
                  "bg-red-600 text-white hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white",
                day_today: "border border-gray-600 text-white",
                day_outside: "text-gray-600 opacity-50",
                day_disabled: "text-gray-700 opacity-40",
                cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              }}
            />
          </div>
        )}
        {isMobile && requireSelection && !userHasSelected && (
          <p
            className="text-center text-sm text-gray-400 -mt-2"
            data-testid={`${testId}-hint`}
          >
            {selectionHint}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
            onClick={handleCancel}
            data-testid={`button-${testId}-cancel`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            disabled={requireSelection && !userHasSelected}
            onClick={handleConfirm}
            data-testid={`button-${testId}-confirm`}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
