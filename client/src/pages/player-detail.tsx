import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, User, Users, GraduationCap, Calendar, Tag, ExternalLink, Trophy, Award, Target } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { NotionPlayer } from '@shared/schema';

// Form schemas
const awardFormSchema = z.object({
  category: z.enum(['trophy', 'badge']),
  awardName: z.string().min(1, 'Award name is required'),
  awardDescription: z.string().optional(),
  badgeId: z.number().optional(),
});

const skillEvaluationSchema = z.object({
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  shooting: z.number().min(1).max(5),
  dribbling: z.number().min(1).max(5),
  passing: z.number().min(1).max(5),
  defense: z.number().min(1).max(5),
  rebounding: z.number().min(1).max(5),
  athleticAbility: z.number().min(1).max(5),
  coachability: z.number().min(1).max(5),
  notes: z.string().optional(),
});

type AwardFormValues = z.infer<typeof awardFormSchema>;
type SkillEvaluationValues = z.infer<typeof skillEvaluationSchema>;

export default function PlayerDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);

  const { data: player, isLoading, error } = useQuery<NotionPlayer>({
    queryKey: [`/api/players/${id}`],
    enabled: !!id,
  });

  // Get current user to check if they're a coach
  const { data: currentUser } = useQuery<{ id: string; userType: string }>({
    queryKey: ['/api/auth/user'],
  });

  // Award player mutation
  const awardPlayerMutation = useMutation({
    mutationFn: async (data: AwardFormValues & { playerId: string }) => {
      const response = await fetch('/api/coach/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to award player');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Award granted!",
        description: "The player has been awarded successfully.",
      });
      setShowAwardModal(false);
      awardForm.reset();
      // Invalidate queries to update player card and profile
      if (player) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${player.id}/badges`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${player.id}/trophies`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${player.id}/awards`] });
        queryClient.invalidateQueries({ queryKey: [`/api/players/${player.id}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to award player",
        variant: "destructive",
      });
    },
  });

  // Skill evaluation mutation
  const skillEvaluationMutation = useMutation({
    mutationFn: async (data: SkillEvaluationValues & { playerId: number }) => {
      const response = await fetch('/api/coach/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerId: data.playerId,
          quarter: data.quarter,
          year: new Date().getFullYear(),
          scores: {
            shooting: data.shooting,
            dribbling: data.dribbling,
            passing: data.passing,
            defense: data.defense,
            rebounding: data.rebounding,
            athleticAbility: data.athleticAbility,
            coachability: data.coachability,
          },
          notes: data.notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to save evaluation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evaluation saved!",
        description: "Player skills evaluation has been saved successfully.",
      });
      setShowEvaluationModal(false);
      evaluationForm.reset();
      // Invalidate queries to update player card with new evaluation
      if (player) {
        queryClient.invalidateQueries({ queryKey: [`/api/players/${player.id}/latest-evaluation`] });
        queryClient.invalidateQueries({ queryKey: [`/api/players/${player.id}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save evaluation",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const awardForm = useForm<AwardFormValues>({
    resolver: zodResolver(awardFormSchema),
    defaultValues: {
      category: 'trophy',
      awardName: '',
      awardDescription: '',
    },
  });

  const evaluationForm = useForm<SkillEvaluationValues>({
    resolver: zodResolver(skillEvaluationSchema),
    defaultValues: {
      quarter: 'Q1',
      shooting: 3,
      dribbling: 3,
      passing: 3,
      defense: 3,
      rebounding: 3,
      athleticAbility: 3,
      coachability: 3,
      notes: '',
    },
  });

  // Submit handlers
  const onAwardSubmit = (data: AwardFormValues) => {
    if (!player) return;
    awardPlayerMutation.mutate({ ...data, playerId: player.id.toString() });
  };

  const onEvaluationSubmit = (data: SkillEvaluationValues) => {
    if (!player) return;
    const playerId = typeof player.id === 'string' ? parseInt(player.id, 10) : player.id;
    skillEvaluationMutation.mutate({ ...data, playerId });
  };

  const isCoach = currentUser?.userType === 'coach' || currentUser?.userType === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading player details...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
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
    <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
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
              <div className="flex justify-center space-x-4 mb-4">
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
              
              {/* Coach Actions */}
              {isCoach && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 text-center">Coach Actions</h3>
                  <div className="flex justify-center space-x-4">
                    {/* Award Player Modal */}
                    <Dialog open={showAwardModal} onOpenChange={setShowAwardModal}>
                      <DialogTrigger asChild>
                        <Button className="bg-yellow-600 hover:bg-yellow-700" data-testid="button-award-player">
                          <Trophy className="h-4 w-4 mr-2" />
                          Award Player
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Award Player: {player.name}</DialogTitle>
                        </DialogHeader>
                        <Form {...awardForm}>
                          <form onSubmit={awardForm.handleSubmit(onAwardSubmit)} className="space-y-4">
                            <FormField
                              control={awardForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Award Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-award-type">
                                        <SelectValue placeholder="Select award type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="trophy">Trophy</SelectItem>
                                      <SelectItem value="badge">Badge</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={awardForm.control}
                              name="awardName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Award Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., MVP, Best Effort, Team Spirit" {...field} data-testid="input-award-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={awardForm.control}
                              name="awardDescription"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Why is this player receiving this award?" {...field} data-testid="textarea-award-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowAwardModal(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={awardPlayerMutation.isPending} data-testid="button-submit-award">
                                {awardPlayerMutation.isPending ? 'Awarding...' : 'Award Player'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    {/* Skill Evaluation Modal */}
                    <Dialog open={showEvaluationModal} onOpenChange={setShowEvaluationModal}>
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-evaluate-skills">
                          <Target className="h-4 w-4 mr-2" />
                          Evaluate Skills
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Skill Evaluation: {player.name}</DialogTitle>
                        </DialogHeader>
                        <Form {...evaluationForm}>
                          <form onSubmit={evaluationForm.handleSubmit(onEvaluationSubmit)} className="space-y-4">
                            <FormField
                              control={evaluationForm.control}
                              name="quarter"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quarter</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-quarter">
                                        <SelectValue placeholder="Select quarter" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="Q1">Q1</SelectItem>
                                      <SelectItem value="Q2">Q2</SelectItem>
                                      <SelectItem value="Q3">Q3</SelectItem>
                                      <SelectItem value="Q4">Q4</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                { name: 'shooting', label: 'Shooting' },
                                { name: 'dribbling', label: 'Dribbling' },
                                { name: 'passing', label: 'Passing' },
                                { name: 'defense', label: 'Defense' },
                                { name: 'rebounding', label: 'Rebounding' },
                                { name: 'athleticAbility', label: 'Athletic Ability' },
                                { name: 'coachability', label: 'Coachability' },
                              ].map((skill) => (
                                <FormField
                                  key={skill.name}
                                  control={evaluationForm.control}
                                  name={skill.name as keyof SkillEvaluationValues}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="flex justify-between">
                                        <span>{skill.label}</span>
                                        <span className="text-sm font-normal">{field.value}/5</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Slider
                                          min={1}
                                          max={5}
                                          step={1}
                                          value={[typeof field.value === 'number' ? field.value : 3]}
                                          onValueChange={(value) => field.onChange(value[0])}
                                          className="w-full"
                                          data-testid={`slider-${skill.name}`}
                                        />
                                      </FormControl>
                                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Developing</span>
                                        <span>Excellent</span>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            
                            <FormField
                              control={evaluationForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Additional observations, areas for improvement, or specific feedback..."
                                      className="min-h-[100px]"
                                      {...field} 
                                      data-testid="textarea-evaluation-notes" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowEvaluationModal(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={skillEvaluationMutation.isPending} data-testid="button-submit-evaluation">
                                {skillEvaluationMutation.isPending ? 'Saving...' : 'Save Evaluation'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}