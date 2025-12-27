import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Calendar as CalendarIcon, Clock, MapPin, Plus, CheckCircle, XCircle } from "lucide-react";
import { DateScrollPicker } from "react-date-wheel-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const scheduleRequestSchema = z.object({
  teamId: z.string().min(1, "Team is required"),
  requestType: z.enum(["game", "tournament", "camp", "exhibition", "practice", "skills", "workshop", "talk", "combine", "training", "meeting", "course", "tryout", "skills-assessment", "team-building", "parent-meeting", "equipment-pickup", "photo-day", "award-ceremony", "fnh"]),
  requestedDate: z.string().min(1, "Date is required"),
  requestedTime: z.string().min(1, "Time is required"),
  duration: z.number().min(30, "Duration must be at least 30 minutes"),
  location: z.string().optional(),
  opponent: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  notes: z.string().optional(),
});

type ScheduleRequestFormData = z.infer<typeof scheduleRequestSchema>;

interface ScheduleRequest {
  id: string;
  teamId: string;
  requestType: 'game' | 'tournament' | 'camp' | 'exhibition' | 'practice' | 'skills' | 'workshop' | 'talk' | 'combine' | 'training' | 'meeting' | 'course' | 'tryout' | 'skills-assessment' | 'team-building' | 'parent-meeting' | 'equipment-pickup' | 'photo-day' | 'award-ceremony' | 'fnh';
  requestedDate: string;
  requestedTime: string;
  duration: number;
  location?: string;
  opponent?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'denied';
  requestedBy: string;
  requestDate: string;
  approvalDate?: string;
  notes?: string;
}

interface SportsEngineTeam {
  id: string;
  name: string;
  ageGroup: string;
  program?: string;
  season: string;
  division: string;
  coachName: string;
}

export default function ScheduleRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const form = useForm<ScheduleRequestFormData>({
    resolver: zodResolver(scheduleRequestSchema),
    defaultValues: {
      requestType: "practice",
      priority: "medium",
      duration: 90,
    },
  });

  // Fetch my teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<SportsEngineTeam[]>({
    queryKey: ['/api/sportsengine/my-teams'],
  });

  // Fetch schedule requests
  const { data: scheduleRequests = [], isLoading: requestsLoading } = useQuery<ScheduleRequest[]>({
    queryKey: ['/api/sportsengine/schedule-requests'],
  });

  // Create schedule request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: ScheduleRequestFormData) => {
      return apiRequest("POST", "/api/sportsengine/schedule-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sportsengine/schedule-requests'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Request Submitted",
        description: "Your schedule request has been submitted for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Request Failed",
        description: "Failed to submit schedule request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduleRequestFormData) => {
    createRequestMutation.mutate(data);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'game':
        return '🏀';
      case 'practice':
        return '🏃';
      case 'tournament':
        return '🏆';
      default:
        return '📅';
    }
  };

  if (teamsLoading || requestsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <BanterLoader />
          <p className="mt-6 text-gray-600">Loading schedule requests...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = scheduleRequests.filter(req => req.status === 'pending');
  const approvedRequests = scheduleRequests.filter(req => req.status === 'approved');
  const deniedRequests = scheduleRequests.filter(req => req.status === 'denied');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Schedule Requests</h1>
          <p className="text-muted-foreground">Request new games, practices, and tournament slots</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Schedule Request</DialogTitle>
              <DialogDescription>
                Submit a request for a new game, practice, or tournament slot
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams.map(team => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  <span>{team.name}</span>
                                  <span className="text-gray-500">
                                    {team.program === 'Youth-Club' ? 'Youth Club' : team.ageGroup}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="game">Game</SelectItem>
                            <SelectItem value="tournament">Tournament</SelectItem>
                            <SelectItem value="camp">Camp</SelectItem>
                            <SelectItem value="exhibition">Exhibition</SelectItem>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="skills">Skills</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="talk">Talk</SelectItem>
                            <SelectItem value="combine">Combine</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="tryout">Tryout</SelectItem>
                            <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                            <SelectItem value="team-building">Team Building</SelectItem>
                            <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                            <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                            <SelectItem value="photo-day">Photo Day</SelectItem>
                            <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                            <SelectItem value="fnh">FNH</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requestedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Date</FormLabel>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(true)}
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={field.value ? "text-gray-900" : "text-gray-400"}>
                              {field.value ? new Date(field.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date"}
                            </span>
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </button>
                        </FormControl>
                        <FormMessage />
                        
                        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                          <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                            <DialogHeader>
                              <DialogTitle className="text-white text-center">Select Requested Date</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 flex justify-center date-wheel-picker-dark">
                              <DateScrollPicker
                                defaultYear={field.value ? new Date(field.value).getFullYear() : new Date().getFullYear()}
                                defaultMonth={(field.value ? new Date(field.value).getMonth() : new Date().getMonth()) + 1}
                                defaultDay={field.value ? new Date(field.value).getDate() : new Date().getDate()}
                                startYear={new Date().getFullYear()}
                                endYear={new Date().getFullYear() + 2}
                                dateTimeFormatOptions={{ month: 'short' }}
                                highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                                onDateChange={(date: Date) => {
                                  field.onChange(date.toISOString().split('T')[0]);
                                }}
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
                                onClick={() => setShowDatePicker(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => setShowDatePicker(false)}
                              >
                                Confirm
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requestedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">Medium Priority</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Location (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Momentous Sports Center - Court A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("requestType") === "game" && (
                  <FormField
                    control={form.control}
                    name="opponent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Thunder, Eagles" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional details or special requirements..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={createRequestMutation.isPending}
                    className="flex-1"
                  >
                    {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{scheduleRequests.length}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{deniedRequests.length}</div>
            <div className="text-sm text-muted-foreground">Denied</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Requests</h2>
          <div className="grid gap-4">
            {pendingRequests.map(request => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>{getRequestTypeIcon(request.requestType)}</span>
                        {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)} Request
                      </CardTitle>
                      <CardDescription>
                        Submitted on {new Date(request.requestDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{new Date(request.requestedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{request.requestedTime} ({request.duration} min)</span>
                    </div>
                    {request.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{request.location}</span>
                      </div>
                    )}
                    {request.opponent && (
                      <div>
                        <strong>vs</strong> {request.opponent}
                      </div>
                    )}
                  </div>
                  {request.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Requests */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Requests</h2>
        <div className="grid gap-4">
          {scheduleRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No schedule requests yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "New Request" to submit your first schedule request
                </p>
              </CardContent>
            </Card>
          ) : (
            scheduleRequests.map(request => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>{getRequestTypeIcon(request.requestType)}</span>
                        {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)} Request
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span>Submitted: {new Date(request.requestDate).toLocaleDateString()}</span>
                        {request.approvalDate && (
                          <span>Processed: {new Date(request.approvalDate).toLocaleDateString()}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{new Date(request.requestedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{request.requestedTime} ({request.duration} min)</span>
                    </div>
                    {request.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{request.location}</span>
                      </div>
                    )}
                    {request.opponent && (
                      <div>
                        <strong>vs</strong> {request.opponent}
                      </div>
                    )}
                  </div>
                  {request.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}