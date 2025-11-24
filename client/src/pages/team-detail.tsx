import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, Users, User } from 'lucide-react';
import type { NotionTeam } from '@shared/schema';

export default function TeamDetailPage() {
  const { slug } = useParams();

  const { data: team, isLoading, error } = useQuery<NotionTeam>({
    queryKey: [`/api/teams/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 safe-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 safe-bottom flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Team Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The team you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/search">
            <a>
              <Button className="bg-red-600 hover:bg-red-700">
                Back to Search
              </Button>
            </a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 safe-bottom">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Navigation */}
          <Link href="/search">
            <a>
              <Button variant="ghost" className="mb-6 hover:bg-red-100 dark:hover:bg-red-900/20" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </a>
          </Link>

          {/* Team Header */}
          <Card className="mb-8 border-red-200 dark:border-red-700">
            <CardHeader className="bg-red-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold mb-2" data-testid="text-team-name">
                    {team.name}
                  </CardTitle>
                  <Badge variant="secondary" className="bg-red-700 text-white">
                    {team.program}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-red-100 mb-2">
                    <Users className="h-5 w-5 mr-2" />
                    <span data-testid="text-roster-size">{team.roster.length} Players</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Coach Information */}
            {team.coach && (
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Coach Information
                    </h3>
                    <p className="text-lg font-medium text-red-600 dark:text-red-400" data-testid="text-coach-name">
                      {team.coach.name}
                    </p>
                    <div className="space-y-1 mt-2">
                      {team.coach.email && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Mail className="h-4 w-4 mr-2" />
                          <span data-testid="text-coach-email">{team.coach.email}</span>
                        </div>
                      )}
                      {team.coach.phone && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Phone className="h-4 w-4 mr-2" />
                          <span data-testid="text-coach-phone">{team.coach.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Link href={team.coach.profileUrl}>
                    <a>
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" data-testid="button-coach-profile">
                        View Coach Profile
                      </Button>
                    </a>
                  </Link>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Roster */}
          <Card className="border-red-200 dark:border-red-700">
            <CardHeader>
              <CardTitle className="text-2xl text-red-600 dark:text-red-400">
                Team Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              {team.roster.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {team.roster.map((player) => (
                    <Link key={player.id} href={`/players/${player.id}`}>
                      <a data-testid={`link-player-${player.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-100 dark:border-red-800">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1" data-testid={`text-player-name-${player.id}`}>
                                  {player.name}
                                </h4>
                                <div className="space-y-1">
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
                                  {player.hsTeam && (
                                    <p className="text-sm text-gray-500">
                                      HS Team: {player.hsTeam}
                                    </p>
                                  )}
                                  {player.sessionTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {player.sessionTags.slice(0, 2).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <User className="h-5 w-5 text-gray-400 ml-2" />
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    No players currently on roster
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Check back later as the roster may be updated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}