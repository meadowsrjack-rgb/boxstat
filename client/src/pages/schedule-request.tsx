import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Clock, CalendarDays, Check, Loader2, Users } from "lucide-react";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  eventTitle?: string;
  eventId?: number;
  eventType?: string;
}

interface AvailabilityResponse {
  programId: string;
  programName: string;
  sessionLengthMinutes: number;
  date: string;
  slots: TimeSlot[];
  blockedEvents: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
  }>;
  isTryoutMode?: boolean;
  recommendedTeamId?: number;
}

export default function ScheduleRequest() {
  const { programId } = useParams<{ programId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [booked, setBooked] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const playerId = searchParams.get("playerId");

  // Check grace period status
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments"],
    enabled: !!user?.id,
  });
  const isInGracePeriod = enrollments.some(
    (e: any) => e.status === 'grace_period' && (!e.profileId || e.profileId === (playerId || user?.id))
  );

  const dateStr = selectedDate.toISOString().split("T")[0];

  const { data: availability, isLoading: loadingSlots } = useQuery<AvailabilityResponse>({
    queryKey: ["/api/programs", programId, "schedule-availability", dateStr, playerId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: dateStr });
      if (playerId) params.set("playerId", playerId);
      const res = await fetch(`/api/programs/${programId}/schedule-availability?${params.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load availability");
      return res.json();
    },
    enabled: !!programId,
  });

  const isTryoutMode = availability?.isTryoutMode === true;

  const bookSession = useMutation({
    mutationFn: async (slot: TimeSlot) => {
      return await apiRequest("POST", `/api/programs/${programId}/schedule-request`, {
        startTime: slot.startTime,
        playerId: playerId || undefined,
      });
    },
    onSuccess: () => {
      setBooked(true);
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "schedule-availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Session booked!", description: "Your session has been added to the calendar." });
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error?.message || "This time slot may no longer be available. Please try another.",
        variant: "destructive",
      });
    },
  });

  const handleBookSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const confirmBooking = () => {
    if (isInGracePeriod) {
      toast({
        title: "Unavailable during grace period",
        description: "Re-enroll through BoxStat to schedule sessions.",
        variant: "destructive",
      });
      return;
    }
    if (selectedSlot) {
      bookSession.mutate(selectedSlot);
    }
  };

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const availableSlots = availability?.slots?.filter((s) => s.available) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For tryout mode: group all slots by date for display
  const slotsByDate: Record<string, TimeSlot[]> = {};
  if (isTryoutMode) {
    for (const slot of availableSlots) {
      const d = new Date(slot.startTime).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      });
      if (!slotsByDate[d]) slotsByDate[d] = [];
      slotsByDate[d].push(slot);
    }
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 safe-top">
        <Card className="w-full max-w-md md:max-w-lg text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Session Booked!</h2>
            <p className="text-gray-600">
              Your {availability?.programName} session has been scheduled for{" "}
              {selectedSlot && (
                <span className="font-medium">
                  {new Date(selectedSlot.startTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at {formatTime(selectedSlot.startTime)}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500">You'll find it in your events calendar and receive reminders.</p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBooked(false);
                  setSelectedSlot(null);
                }}
              >
                Book Another
              </Button>
              <Button className="flex-1" onClick={() => navigate("/home")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">Schedule a Session</h1>
          {availability && (
            <p className="text-sm text-gray-500">
              {availability.programName} - {availability.sessionLengthMinutes} min
              {isTryoutMode && <span className="ml-1 text-purple-600 font-medium">· Tryout</span>}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {isInGracePeriod && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-yellow-800 font-medium">
                Session scheduling is unavailable during your enrollment grace period.
                Re-enroll through BoxStat to schedule sessions.
              </p>
            </CardContent>
          </Card>
        )}
        {isTryoutMode ? (
          /* Tryout mode: show team practice/skills events as selectable sessions */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Upcoming Team Sessions
              </CardTitle>
              <CardDescription>
                Select a practice or skills session to attend your tryout
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 text-purple-300" />
                  <p className="font-medium text-gray-700">No Times Available</p>
                  <p className="text-sm mt-1">There are no practice or skills sessions scheduled for your assigned team in the next 30 days. Please check back later or contact your coach for more information.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(slotsByDate).map(([dateLabel, dateSlots]) => (
                    <div key={dateLabel}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{dateLabel}</p>
                      <div className="space-y-2">
                        {dateSlots.map((slot, idx) => {
                          const isSelected = selectedSlot?.startTime === slot.startTime;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleBookSlot(slot)}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                isSelected
                                  ? "border-purple-500 bg-purple-50 ring-2 ring-purple-300"
                                  : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{slot.eventTitle || "Team Session"}</p>
                                  <p className="text-sm text-gray-500">
                                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                    {slot.eventType ? slot.eventType.charAt(0).toUpperCase() + slot.eventType.slice(1) : "Session"}
                                  </Badge>
                                  {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Normal mode: calendar date picker + time slots */
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Select a Date
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={(date) => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    return d < today;
                  }}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Available Times
                </CardTitle>
                <CardDescription>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="font-medium">No available times</p>
                    <p className="text-sm mt-1">All slots are booked for this date. Try another day.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <Button
                          key={idx}
                          variant={isSelected ? "default" : "outline"}
                          className={`h-auto py-3 ${isSelected ? "ring-2 ring-red-500" : ""}`}
                          onClick={() => handleBookSlot(slot)}
                        >
                          <div className="text-center">
                            <div className="font-medium">{formatTime(slot.startTime)}</div>
                            <div className="text-xs opacity-70">to {formatTime(slot.endTime)}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {selectedSlot && (
          <Card className={`${isTryoutMode ? "border-purple-200 bg-purple-50" : "border-red-200 bg-red-50"}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {new Date(selectedSlot.startTime).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {isTryoutMode && selectedSlot.eventTitle && (
                    <p className="text-sm font-medium text-purple-700">{selectedSlot.eventTitle}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                  </p>
                </div>
                <Button
                  onClick={confirmBooking}
                  disabled={bookSession.isPending}
                  className={isTryoutMode ? "bg-purple-600 hover:bg-purple-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {bookSession.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirm Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
