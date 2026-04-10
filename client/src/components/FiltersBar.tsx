import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ParsedEvent, getEventTypeHexColor } from "@/lib/parseEventMeta";
import { UserPreferences, saveUserPreferences, ALL_EVENT_TYPES, EventType, EVENT_TYPE_PRESET_COLORS } from "@/lib/userPrefs";

const PRESET_COLORS = [
  ...EVENT_TYPE_PRESET_COLORS,
  '#f97316', '#14b8a6', '#06b6d4', '#eab308', '#ef4444',
  '#84cc16', '#10b981', '#8b5cf6', '#d946ef', '#f43f5e',
];

interface EventTypeFilterRowProps {
  type: EventType;
  label: string;
  color: string;
  visible: boolean;
  onToggle: () => void;
  onColorChange: (color: string) => void;
}

function EventTypeFilterRow({ type, label, color, visible, onToggle, onColorChange }: EventTypeFilterRowProps) {
  const [customColor, setCustomColor] = useState(color);
  const [open, setOpen] = useState(false);

  const handleCustomColorChange = (val: string) => {
    setCustomColor(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onColorChange(val);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-4 h-4 rounded-sm flex-shrink-0 border border-black/10 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            style={{ backgroundColor: visible ? color : 'transparent', borderColor: color }}
            aria-label={`Change color for ${label}`}
            title="Click to change color"
          />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" side="right" align="start">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-600 capitalize">{label} color</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform focus:outline-none"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#111' : 'transparent',
                  }}
                  onClick={() => {
                    onColorChange(c);
                    setCustomColor(c);
                    setOpen(false);
                  }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: customColor }}
              />
              <Input
                value={customColor}
                onChange={e => handleCustomColorChange(e.target.value)}
                className="h-7 text-xs font-mono px-2"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 text-left group"
      >
        <span
          className={`text-sm capitalize transition-opacity ${visible ? 'text-gray-900 opacity-100' : 'text-gray-400 opacity-60 line-through'}`}
        >
          {label.replace(/-/g, ' ')}
        </span>
      </button>
    </div>
  );
}

interface FiltersBarProps {
  events: ParsedEvent[];
  filters: UserPreferences;
  onFiltersChange: (filters: UserPreferences) => void;
  horizontal?: boolean;
}

export function FiltersBar({ events, filters, onFiltersChange, horizontal }: FiltersBarProps) {
  const usedTypes = Array.from(new Set(events.map(e => e.type))) as EventType[];
  const typesToShow = usedTypes.length > 0 ? usedTypes : ALL_EVENT_TYPES;

  const updateFilters = (newFilters: UserPreferences) => {
    onFiltersChange(newFilters);
    saveUserPreferences(newFilters);
  };

  const handleToggle = (type: string) => {
    const hidden = filters.hiddenEventTypes || [];
    const newHidden = hidden.includes(type)
      ? hidden.filter(t => t !== type)
      : [...hidden, type];
    updateFilters({ ...filters, hiddenEventTypes: newHidden });
  };

  const handleColorChange = (type: string, color: string) => {
    const newColors = { ...(filters.eventTypeColors || {}), [type]: color };
    updateFilters({ ...filters, eventTypeColors: newColors });
  };

  if (horizontal) {
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 items-center">
        {typesToShow.map(type => {
          const color = getEventTypeHexColor(type, filters.eventTypeColors);
          const visible = !(filters.hiddenEventTypes || []).includes(type);
          return (
            <EventTypeFilterRow
              key={type}
              type={type}
              label={type}
              color={color}
              visible={visible}
              onToggle={() => handleToggle(type)}
              onColorChange={color => handleColorChange(type, color)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Event Types</p>
      {typesToShow.map(type => {
        const color = getEventTypeHexColor(type, filters.eventTypeColors);
        const visible = !(filters.hiddenEventTypes || []).includes(type);
        return (
          <EventTypeFilterRow
            key={type}
            type={type}
            label={type}
            color={color}
            visible={visible}
            onToggle={() => handleToggle(type)}
            onColorChange={color => handleColorChange(type, color)}
          />
        );
      })}
    </div>
  );
}
