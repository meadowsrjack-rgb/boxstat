import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, User } from 'lucide-react';
import type { NotionPlayer, NotionTeam } from '@shared/schema';

interface SearchResults {
  players: NotionPlayer[];
  teams: NotionTeam[];
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults } = useQuery<SearchResults>({
    queryKey: ['/api/search', searchQuery],
    enabled: !!searchQuery.trim(),
  });

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">
              Player & Team Search
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Search for players and teams across the BoxStat league
            </p>
          </div>

          {/* Search Input */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search for players or teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg border-red-200 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400"
              data-testid="input-search"
            />
          </div>

          {/* Search Results */}
          {searchQuery.trim() && searchResults && (
            <div className="space-y-8">
              {/* Teams Section */}
              {searchResults.teams.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-red-600" />
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Teams</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.teams.map((team) => (
                      <Link key={team.slug} href={`/teams/${team.slug}`}>
                        <a data-testid={`link-team-${team.slug}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-red-200 dark:border-red-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg text-red-600 dark:text-red-400">
                                {team.name}
                              </CardTitle>
                              {team.coach && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Coach: {team.coach.name}
                                </p>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="flex justify-between items-center">
                                <Badge variant="secondary" className="text-xs">
                                  {team.program}
                                </Badge>
                                <span className="text-sm text-gray-500" data-testid={`text-roster-count-${team.slug}`}>
                                  {team.roster.length} players
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Players Section */}
              {searchResults.players.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-red-600" />
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Players</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.players.map((player) => (
                      <Link key={player.id} href={`/players/${player.id}`}>
                        <a data-testid={`link-player-${player.id}`}>
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-red-200 dark:border-red-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg text-red-600 dark:text-red-400">
                                {player.name}
                              </CardTitle>
                              {player.team && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  Team: {player.team}
                                </p>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {player.currentProgram && (
                                  <Badge variant="outline" className="text-xs">
                                    {player.currentProgram}
                                  </Badge>
                                )}
                                {player.grade && (
                                  <p className="text-sm text-gray-500">
                                    Grade: {player.grade}
                                  </p>
                                )}
                                {player.sessionTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {player.sessionTags.slice(0, 2).map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchResults.teams.length === 0 && searchResults.players.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try searching with different keywords or check your spelling.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Initial State */}
          {!searchQuery.trim() && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Start searching
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Enter a player name, team name, or program to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}