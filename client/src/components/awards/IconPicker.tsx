import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { AWARD_ICONS, AwardIcon } from "./awardIcons";
import { cn } from "@/lib/utils";

type IconCategory = "all" | "achievement" | "sports" | "fitness" | "nature" | "misc";

const CATEGORY_LABELS: Record<IconCategory, string> = {
  all: "All",
  achievement: "Achievement",
  sports: "Sports",
  fitness: "Fitness",
  nature: "Nature",
  misc: "Other",
};

interface IconPickerProps {
  value?: string;
  onChange: (iconId: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IconCategory>("all");

  const filtered = useMemo<AwardIcon[]>(() => {
    return AWARD_ICONS.filter((icon) => {
      const matchesSearch =
        !search || icon.label.toLowerCase().includes(search.toLowerCase()) || icon.id.includes(search.toLowerCase());
      const matchesCategory = category === "all" || icon.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-8"
          data-testid="input-icon-search"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {(Object.keys(CATEGORY_LABELS) as IconCategory[]).map((cat) => (
          <Badge
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setCategory(cat)}
            data-testid={`badge-category-${cat}`}
          >
            {CATEGORY_LABELS[cat]}
          </Badge>
        ))}
      </div>

      <ScrollArea className="h-56 w-full rounded-md border">
        <div className="grid grid-cols-6 gap-1 p-2">
          {filtered.map((icon) => {
            const IconComponent = icon.component;
            const isSelected = value === icon.id;
            return (
              <button
                key={icon.id}
                type="button"
                title={icon.label}
                onClick={() => onChange(icon.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-all duration-150 hover:bg-accent hover:scale-110",
                  isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 scale-110"
                )}
                data-testid={`icon-option-${icon.id}`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-[9px] leading-none text-center truncate w-full">
                  {icon.label}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-6 py-8 text-center text-sm text-muted-foreground">
              No icons found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
