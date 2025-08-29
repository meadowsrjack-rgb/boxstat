import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Users, GraduationCap, Calendar, Tag, ExternalLink } from 'lucide-react';
import type { NotionPlayer } from '@shared/schema';

export default function PlayerDetailPage() {
  const { id } = useParams();

  const { data: player, isLoading, error } = useQuery<NotionPlayer>({
    queryKey: [`/api/players/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading player details...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Player Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The player you're looking for doesn't exist or has been removed.
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <Link href="/search">
            <a>
              <Button variant="ghost" className="mb-6 hover:bg-red-100 dark:hover:bg-red-900/20" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
            </a>
          </Link>

          {/* Player Header */}
          <Card className="mb-8 border-red-200 dark:border-red-700">
            <CardHeader className="bg-red-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center mr-4">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-bold mb-2" data-testid="text-player-name">
                      {player.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-red-700 text-white">
                      {player.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Player Information */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card className="border-red-200 dark:border-red-700">
              <CardHeader>
                <CardTitle className="text-xl text-red-600 dark:text-red-400">
                  Player Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {player.team && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">Team:</span>
                    </div>
                    <div className="flex items-center">
                      <Link href={`/teams/${player.teamSlug}`}>
                        <a data-testid="link-team">
                          <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                            {player.team}
                          </Button>
                        </a>
                      </Link>
                    </div>
                  </div>
                )}

                {player.currentProgram && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">Program:</span>
                    </div>
                    <Badge variant="outline" data-testid="text-current-program">
                      {player.currentProgram}
                    </Badge>
                  </div>
                )}

                {player.grade && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <GraduationCap className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">Grade:</span>
                    </div>
                    <span className="font-medium" data-testid="text-grade">{player.grade}</span>
                  </div>
                )}

                {player.hsTeam && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">HS Team:</span>
                    </div>
                    <span className="font-medium" data-testid="text-hs-team">{player.hsTeam}</span>
                  </div>
                )}

                {player.social && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExternalLink className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">Social Media:</span>
                    </div>
                    {player.social.startsWith('http') ? (
                      <a
                        href={player.social}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700 underline"
                        data-testid="link-social"
                      >
                        Visit Profile
                      </a>
                    ) : (
                      <span className="font-medium" data-testid="text-social">{player.social}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sessions & Tags */}
            <Card className="border-red-200 dark:border-red-700">
              <CardHeader>
                <CardTitle className="text-xl text-red-600 dark:text-red-400">
                  Sessions & Programs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {player.sessionTags.length > 0 ? (
                  <div>
                    <div className="flex items-center mb-3">
                      <Tag className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">Active Sessions:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {player.sessionTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" data-testid={`badge-session-${index}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No active sessions assigned
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card className="mt-6 border-red-200 dark:border-red-700">
            <CardContent className="pt-6">
              <div className="flex justify-center space-x-4">
                {player.team && (
                  <Link href={`/teams/${player.teamSlug}`}>
                    <a>
                      <Button className="bg-red-600 hover:bg-red-700" data-testid="button-view-team">
                        <Users className="h-4 w-4 mr-2" />
                        View Team Roster
                      </Button>
                    </a>
                  </Link>
                )}
                <Link href="/search">
                  <a>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" data-testid="button-search-more">
                      Search More Players
                    </Button>
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}