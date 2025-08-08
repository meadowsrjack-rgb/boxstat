
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Filter, Star } from "lucide-react";
import { EventType, ParsedEvent } from "@/lib/parseEventMeta";
import { UserPreferences, getUserPreferences, saveUserPreferences, applyRelevanceProfile } from "@/lib/userPrefs";

interface FiltersBarProps {
  events: ParsedEvent[];
  onFiltersChange: (prefs: UserPreferences) => void;
}

export function FiltersBar({ events, onFiltersChange }: FiltersBarProps) {
  const [filters, setFilters] = useState<UserPreferences>(getUserPreferences());
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique values from events
  const uniqueEventTypes = Array.from(new Set(events.map(e => e.type)));
  const uniqueAgeTags = Array.from(new Set(events.flatMap(e => e.ageTags)));
  const uniqueTeamTags = Array.from(new Set(events.flatMap(e => e.teamTags)));
  const uniqueCoaches = Array.from(new Set(events.flatMap(e => e.coaches)));
  const uniqueLocations = Array.from(new Set(events.map(e => e.location).filter(Boolean)));

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (newFilters: UserPreferences) => {
    setFilters(newFilters);
    saveUserPreferences(newFilters);
  };

  const toggleEventType = (type: EventType) => {
    const newTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter(t => t !== type)
      : [...filters.eventTypes, type];
    updateFilters({ ...filters, eventTypes: newTypes });
  };

  const toggleAgeTag = (tag: string) => {
    const newTags = filters.ageTags.includes(tag)
      ? filters.ageTags.filter(t => t !== tag)
      : [...filters.ageTags, tag];
    updateFilters({ ...filters, ageTags: newTags });
  };

  const toggleTeamTag = (tag: string) => {
    const newTags = filters.teamTags.includes(tag)
      ? filters.teamTags.filter(t => t !== tag)
      : [...filters.teamTags, tag];
    updateFilters({ ...filters, teamTags: newTags });
  };

  const toggleCoach = (coach: string) => {
    const newCoaches = filters.coaches.includes(coach)
      ? filters.coaches.filter(c => c !== coach)
      : [...filters.coaches, coach];
    updateFilters({ ...filters, coaches: newCoaches });
  };

  const clearAllFilters = () => {
    updateFilters({
      eventTypes: [],
      ageTags: [],
      teamTags: [],
      coaches: [],
      locations: [],
      defaultRelevanceProfile: filters.defaultRelevanceProfile
    });
  };

  const applyRelevance = () => {
    updateFilters(applyRelevanceProfile(filters));
  };

  const activeFilterCount = filters.eventTypes.length + filters.ageTags.length + 
                           filters.teamTags.length + filters.coaches.length;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={applyRelevance}
              className="flex items-center space-x-1"
            >
              <Star className="h-3 w-3" />
              <span>Relevance</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>

        {/* Quick filters - always visible */}
        <div className="flex flex-wrap gap-2 mb-3">
          {uniqueEventTypes.slice(0, 4).map(type => (
            <Badge
              key={type}
              variant={filters.eventTypes.includes(type) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10"
              onClick={() => toggleEventType(type)}
            >
              {type}
            </Badge>
          ))}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Event Types */}
            <div>
              <h4 className="text-sm font-medium mb-2">Event Types</h4>
              <div className="flex flex-wrap gap-2">
                {uniqueEventTypes.map(type => (
                  <Badge
                    key={type}
                    variant={filters.eventTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleEventType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Age Groups */}
            {uniqueAgeTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Age Groups</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueAgeTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.ageTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => toggleAgeTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            {uniqueTeamTags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Teams</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueTeamTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.teamTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => toggleTeamTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Coaches */}
            {uniqueCoaches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Coaches</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueCoaches.map(coach => (
                    <Badge
                      key={coach}
                      variant={filters.coaches.includes(coach) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => toggleCoach(coach)}
                    >
                      {coach}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
