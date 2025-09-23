import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";

interface PlayerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  team_id?: number;
  team_name?: string;
  age?: number;
  date_of_birth?: string;
  registration_status?: string;
  parent_name?: string;
  parent_email?: string;
  account_email?: string;
  phone_number?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  grade?: string;
  school_grade?: string;
  session?: string;
  position?: string;
  jersey_number?: number;
  address?: string;
  medical_info?: string;
  allergies?: string;
  badges_public: boolean;
  trophies_public: boolean;
  skills_public: boolean;
}

interface PlayerSearchResponse {
  ok: boolean;
  players: PlayerSearchResult[];
}

interface TeamResult {
  id: string;
  name: string;
  roster_count: number;
  roster: any[];
}

interface TeamSearchResponse {
  ok: boolean;
  teams: TeamResult[];
}

interface PlayerSearchProps {
  onPlayerSelect?: (player: PlayerSearchResult) => void;
  teamId?: string | number;
  placeholder?: string;
  showTeamFilter?: boolean;
}

export default function PlayerSearch({ 
  onPlayerSelect, 
  teamId, 
  placeholder = "Search players...",
  showTeamFilter = true 
}: PlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("");
  
  // Debounce search query to reduce API calls
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search players
  const { data: searchResults, isLoading } = useQuery<PlayerSearchResponse | PlayerSearchResult[]>({
    queryKey: [`/api/search/players?q=${encodeURIComponent(debouncedQuery)}`],
    enabled: debouncedQuery.length >= 2,
  });

  // Get teams for filter
  const { data: teamsData } = useQuery<TeamSearchResponse | TeamResult[]>({
    queryKey: ['/api/search/teams'],
    enabled: showTeamFilter,
  });

  // Extract players from API response
  const players = useMemo(() => {
    if (Array.isArray(searchResults)) {
      return searchResults;
    }
    return searchResults?.players ?? [];
  }, [searchResults]);

  // Extract teams from API response
  const teamList = useMemo(() => {
    if (Array.isArray(teamsData)) {
      return teamsData;
    }
    return teamsData?.teams ?? [];
  }, [teamsData]);

  // Filter results by team if teamId is provided or team filter is selected
  const filteredResults = useMemo(() => {
    let results = players;
    
    // Filter by specific team if teamId is provided
    if (teamId) {
      results = results.filter((player: PlayerSearchResult) => 
        player.team_id === parseInt(teamId.toString())
      );
    }
    
    // Filter by selected team filter
    if (selectedTeamFilter) {
      results = results.filter((player: PlayerSearchResult) => 
        player.team_id === parseInt(selectedTeamFilter)
      );
    }
    
    return results;
  }, [searchResults, teamId, selectedTeamFilter]);

  const getPlayerInitials = (player: PlayerSearchResult) => {
    return `${player.first_name?.charAt(0) || ''}${player.last_name?.charAt(0) || ''}`.toUpperCase();
  };

  const getPlayerFullName = (player: PlayerSearchResult) => {
    if (player.first_name === "🔒") {
      return "Private Profile";
    }
    return `${player.first_name || ''} ${player.last_name || ''}`.trim();
  };

  const handlePlayerClick = (player: PlayerSearchResult) => {
    if (onPlayerSelect) {
      onPlayerSelect(player);
    }
  };

  const getTeamName = (teamId: number) => {
    const team = teamList.find(t => Number(t.id) === Number(teamId));
    return team?.name || `Team ${teamId}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-player-search"
        />
      </div>

      {/* Search Results */}
      <div className="space-y-2">
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Searching players...</p>
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && filteredResults.length === 0 && (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No players found</p>
            <p className="text-sm text-gray-400">Try a different search term</p>
          </div>
        )}

        {debouncedQuery.length >= 2 && filteredResults.map((player: PlayerSearchResult) => (
          <Card 
            key={player.id} 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handlePlayerClick(player)}
            data-testid={`card-player-${player.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={player.profile_image_url} alt={getPlayerFullName(player)} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getPlayerInitials(player)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate" data-testid={`text-player-name-${player.id}`}>
                    {getPlayerFullName(player)}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {player.team_id && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        <Users className="h-3 w-3 mr-1" />
                        {getTeamName(player.team_id)}
                      </Badge>
                    )}
                    {player.age && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                        Age {player.age}
                      </Badge>
                    )}
                    {player.grade && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                        Grade {player.grade}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-2">
                    {player.registration_status && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          player.registration_status === 'active' ? 'bg-green-50 text-green-700' :
                          player.registration_status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}
                      >
                        {player.registration_status}
                      </Badge>
                    )}
                    {player.session && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        {player.session}
                      </Badge>
                    )}
                  </div>

                  {/* Contact info for coaches */}
                  {(player.parent_email || player.phone_number) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {player.parent_email && <div>Parent: {player.parent_email}</div>}
                      {player.phone_number && <div>Phone: {player.phone_number}</div>}
                    </div>
                  )}
                </div>

                {/* Action indicator */}
                <div className="flex items-center text-gray-400">
                  <span className="text-sm">View Profile</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search Instructions */}
      {searchQuery.length === 0 && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Start typing to search players</p>
          <p className="text-sm text-gray-400">Enter at least 2 characters</p>
        </div>
      )}
    </div>
  );
}