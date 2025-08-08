import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { ParsedEvent } from "@/lib/parseEventMeta";
import { UserPreferences, saveUserPreferences } from "@/lib/userPrefs";

interface FiltersBarProps {
  events: ParsedEvent[];
  filters: UserPreferences;
  onFiltersChange: (filters: UserPreferences) => void;
}

export function FiltersBar({ events, filters, onFiltersChange }: FiltersBarProps) {
  // Extract unique values from events
  const availableEventTypes = Array.from(new Set(events.map(e => e.type)));
  const availableAgeTags = Array.from(new Set(events.flatMap(e => e.ageTags)));
  const availableTeamTags = Array.from(new Set(events.flatMap(e => e.teamTags)));
  const availableCoaches = Array.from(new Set(events.flatMap(e => e.coaches)));

  const updateFilters = (newFilters: UserPreferences) => {
    onFiltersChange(newFilters);
    saveUserPreferences(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: UserPreferences = {
      eventTypes: [],
      ageTags: [],
      teamTags: [],
      coaches: []
    };
    updateFilters(emptyFilters);
  };

  const hasActiveFilters = filters.eventTypes.length > 0 || 
                          filters.ageTags.length > 0 || 
                          filters.teamTags.length > 0 || 
                          filters.coaches.length > 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {/* Event Type Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Event Types {filters.eventTypes.length > 0 && `(${filters.eventTypes.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                {availableEventTypes.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type}`}
                      checked={filters.eventTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        const newTypes = checked 
                          ? [...filters.eventTypes, type]
                          : filters.eventTypes.filter(t => t !== type);
                        updateFilters({ ...filters, eventTypes: newTypes });
                      }}
                    />
                    <label htmlFor={`type-${type}`} className="capitalize">
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Age Tags Filters */}
          {availableAgeTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Age Groups {filters.ageTags.length > 0 && `(${filters.ageTags.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {availableAgeTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`age-${tag}`}
                        checked={filters.ageTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          const newTags = checked 
                            ? [...filters.ageTags, tag]
                            : filters.ageTags.filter(t => t !== tag);
                          updateFilters({ ...filters, ageTags: newTags });
                        }}
                      />
                      <label htmlFor={`age-${tag}`} className="uppercase">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Team Tags Filters */}
          {availableTeamTags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Teams {filters.teamTags.length > 0 && `(${filters.teamTags.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {availableTeamTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`team-${tag}`}
                        checked={filters.teamTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          const newTags = checked 
                            ? [...filters.teamTags, tag]
                            : filters.teamTags.filter(t => t !== tag);
                          updateFilters({ ...filters, teamTags: newTags });
                        }}
                      />
                      <label htmlFor={`team-${tag}`} className="capitalize">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Coaches Filters */}
          {availableCoaches.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Coaches {filters.coaches.length > 0 && `(${filters.coaches.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  {availableCoaches.map(coach => (
                    <div key={coach} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`coach-${coach}`}
                        checked={filters.coaches.includes(coach)}
                        onCheckedChange={(checked) => {
                          const newCoaches = checked 
                            ? [...filters.coaches, coach]
                            : filters.coaches.filter(c => c !== coach);
                          updateFilters({ ...filters, coaches: newCoaches });
                        }}
                      />
                      <label htmlFor={`coach-${coach}`}>
                        {coach}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1">
            {filters.eventTypes.map(type => (
              <Badge key={type} variant="secondary" className="text-xs">
                {type}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilters({
                    ...filters, 
                    eventTypes: filters.eventTypes.filter(t => t !== type)
                  })}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
            {filters.ageTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.toUpperCase()}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilters({
                    ...filters, 
                    ageTags: filters.ageTags.filter(t => t !== tag)
                  })}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
            {filters.teamTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilters({
                    ...filters, 
                    teamTags: filters.teamTags.filter(t => t !== tag)
                  })}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
            {filters.coaches.map(coach => (
              <Badge key={coach} variant="secondary" className="text-xs">
                {coach}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                  onClick={() => updateFilters({
                    ...filters, 
                    coaches: filters.coaches.filter(c => c !== coach)
                  })}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}