import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  Megaphone,
  Send,
  Clock,
  Check
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { LongPressMessage } from "@/components/ui/long-press-message";
import { MessageReactionsDisplay } from "@/components/ui/emoji-reactions";

export default function PlayerTeamChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  // Get user's team info
  const { data: userTeam } = useQuery<any>({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
  });

  // Get team players
  const { data: players = [] } = useQuery<any[]>({
    queryKey: ["/api/team-players", userTeam?.id],
    enabled: !!userTeam?.id,
  });

  // Get team messages/announcements
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements", "team", userTeam?.id],
    enabled: !!userTeam?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/announcements", messageData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "Your message has been sent to the team.",
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "team", userTeam?.id] });
      queryClient.refetchQueries({ queryKey: ["/api/announcements", "team", userTeam?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Task completion mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ announcementId, notes = "" }: { announcementId: number; notes?: string }) => {
      return await apiRequest("POST", `/api/tasks/${announcementId}/complete`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Task completed!",
        description: "You've marked this task as complete.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "team", userTeam?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Acknowledge announcement mutation
  const acknowledgeAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: number) => {
      return await apiRequest("POST", `/api/announcements/${announcementId}/acknowledge`, {});
    },
    onSuccess: () => {
      toast({
        title: "Acknowledged!",
        description: "You've acknowledged this announcement.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "team", userTeam?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Message reactions mutation
  const reactToMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: number; emoji: string }) => {
      return await apiRequest("POST", `/api/messages/${messageId}/reactions`, { emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "team", userTeam?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add reaction.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      title: message.slice(0, 50) + "...",
      content: message,
      priority: "medium",
      teamId: userTeam?.id,
    });
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "task": return "border-orange-500 bg-orange-50";
      case "announcement": return "border-green-500 bg-green-50";
      default: return "border-blue-500 bg-blue-50";
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckSquare className="w-4 h-4" />;
      case "announcement": return <Megaphone className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  if (!userTeam) {
    return (
      <div className="min-h-full bg-gradient-to-br from-green-500 to-blue-600 safe-bottom flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-bold mb-4">No Team Found</h2>
            <p className="text-gray-600 mb-4">You need to be assigned to a team to access team chat.</p>
            <Link href="/player-dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-green-500 to-blue-600 safe-bottom">
      {/* Header */}
      <header className="bg-white shadow-sm border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/player-dashboard">
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-blue-500"
                >
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{userTeam.name} Team Chat</h1>
                  <p className="text-sm text-gray-500">
                    {players?.length} team members
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center bg-blue-50">
              <Users className="h-3 w-3 mr-1" />
              {players?.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Team Members Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player: any) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={player.profileImageUrl} />
                      <AvatarFallback className="text-xs">
                        {player.firstName?.[0]}{player.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">
                      {player.firstName} {player.lastName}
                      {player.id === user?.id && <span className="text-blue-500"> (You)</span>}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Messages */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  Team Messages
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Messages
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-orange-50">
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Tasks
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-green-50">
                      <Megaphone className="w-3 h-3 mr-1" />
                      Announcements
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              
              {/* Messages Area */}
              <CardContent className="min-h-full flex flex-col p-0">
                <div className="min-h-full p-4 space-y-4">
                  {messages && messages.length > 0 ? (
                    messages.map((msg: any) => {
                      // Determine message type from priority or other fields
                      const messageType = msg.priority === "high" ? "task" : 
                                        msg.title && msg.title !== `${msg.content.slice(0, 50)}...` ? "announcement" : 
                                        "message";
                      
                      return (
                        <LongPressMessage key={msg.id} messageId={msg.id}>
                          <div className={`p-4 rounded-lg border-l-4 ${getMessageTypeColor(messageType)}`}>
                            <div className="flex justify-between items-start mb-2">
                              {messageType !== "message" && (
                                <h4 className="font-semibold text-gray-900">{msg.title}</h4>
                              )}
                              <div className="flex items-center gap-2 ml-auto">
                                <Badge variant="outline" className="text-xs">
                                  {getMessageTypeIcon(messageType)}
                                  <span className="ml-1 capitalize">{messageType}</span>
                                </Badge>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                                  Team
                                </Badge>
                              </div>
                            </div>
                            <p className="text-gray-600 mb-3 whitespace-pre-wrap">{msg.content}</p>
                            
                            {/* Interactive Features */}
                            <div className="mt-4 flex flex-wrap gap-2">
                              {/* Task completion button for tasks */}
                              {messageType === "task" && (
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => completeTaskMutation.mutate({ announcementId: msg.id })}
                                  disabled={completeTaskMutation.isPending}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  {completeTaskMutation.isPending ? "Completing..." : "Mark Complete"}
                                </Button>
                              )}
                              
                              {/* Acknowledge button for announcements */}
                              {messageType === "announcement" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => acknowledgeAnnouncementMutation.mutate(msg.id)}
                                  disabled={acknowledgeAnnouncementMutation.isPending}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  {acknowledgeAnnouncementMutation.isPending ? "Acknowledging..." : "Acknowledge"}
                                </Button>
                              )}
                              
                              {/* Quick reaction buttons */}
                              <div className="flex gap-1">
                                {["👍", "❤️", "😊", "🔥"].map((emoji) => (
                                  <Button
                                    key={emoji}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                                    disabled={reactToMessageMutation.isPending}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Announcement acknowledgment status */}
                            {messageType === "announcement" && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-medium text-gray-700">Acknowledgment:</h5>
                                  <Badge variant={Math.random() > 0.5 ? "default" : "outline"} className="text-xs">
                                    {Math.random() > 0.5 ? (
                                      <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Seen
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 mr-1" />
                                        Not Seen
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            {/* Emoji reactions */}
                            <MessageReactionsDisplay
                              reactions={msg.reactions || []}
                              messageId={msg.id}
                              currentUserId={user?.id}
                            />

                            <p className="text-xs text-gray-500 mt-3">
                              {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </LongPressMessage>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400">Team messages will appear here</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4 flex-shrink-0">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your message to the team..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Share updates with your team
                      </p>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}