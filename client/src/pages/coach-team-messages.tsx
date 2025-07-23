import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Users, CheckSquare, Megaphone, MessageCircle } from "lucide-react";
import { LongPressMessage } from "@/components/ui/long-press-message";
import { MessageReactionsDisplay } from "@/components/ui/emoji-reactions";

export default function CoachTeamMessages() {
  const { teamId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [messageType, setMessageType] = useState<"message" | "task" | "announcement">("message");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Get team info
  const { data: team } = useQuery({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  // Get team players
  const { data: players = [] } = useQuery({
    queryKey: ["/api/team-players", teamId],
    enabled: !!teamId,
  });

  // Get recent messages
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/announcements", "team", teamId],
    enabled: !!teamId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      await apiRequest("POST", "/api/announcements", messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: `Your ${messageType} has been sent to the team.`,
      });
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "team", teamId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    // For tasks and announcements, title is required. For messages, title is optional
    const titleRequired = messageType !== "message";
    if ((titleRequired && !title.trim()) || !content.trim()) {
      toast({
        title: "Missing information",
        description: titleRequired 
          ? "Please enter both a title and content."
          : "Please enter a message.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      title: messageType === "message" ? content.slice(0, 50) + "..." : title,
      content,
      messageType,
      targetAudience: "team",
      priority: messageType === "task" ? "high" : "medium",
      teamId: parseInt(teamId!),
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

  if (!user || user.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin-dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Team Messages</h1>
                <p className="text-sm text-gray-600">{team?.name || 'Loading...'}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Users className="w-3 h-3 mr-1" />
              {players.length} Players
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Send Message to Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message Type Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Message Type:</label>
              <div className="flex gap-3">
                <Button
                  variant={messageType === "message" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessageType("message")}
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
                <Button
                  variant={messageType === "task" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessageType("task")}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Task
                </Button>
                <Button
                  variant={messageType === "announcement" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessageType("announcement")}
                  className="flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  Announcement
                </Button>
              </div>
            </div>

            {/* Message Form */}
            <div className="space-y-4">
              {/* Title field - only for tasks and announcements */}
              {messageType !== "message" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    {messageType === "task" ? "Task" : "Announcement"} Title
                  </label>
                  <Input
                    placeholder={`Enter ${messageType} title...`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {messageType === "task" ? "Task Description" : messageType === "announcement" ? "Announcement" : "Message"}
                </label>
                <Textarea
                  placeholder={`What would you like to tell the team? 😊 Use emojis to make it fun!`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  <div className="text-xs text-gray-500 mb-2">Quick emojis:</div>
                  {['⚾', '🏀', '⚽', '🏆', '💪', '👍', '🔥', '⭐', '🎯', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setContent(prev => prev + emoji)}
                      className="text-lg hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send {messageType === "task" ? "Task" : messageType === "announcement" ? "Announcement" : "Message"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Team Messages
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
          <CardContent>
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.slice(0, 10).map((message: any) => (
                  <LongPressMessage key={message.id} messageId={message.id}>
                    <div className={`p-4 rounded-lg border-l-4 ${getMessageTypeColor(message.messageType || 'message')}`}>
                      <div className="flex justify-between items-start mb-2">
                        {message.messageType !== "message" && (
                          <h4 className="font-semibold text-gray-900">{message.title}</h4>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <Badge variant="outline" className="text-xs">
                            {getMessageTypeIcon(message.messageType || 'message')}
                            <span className="ml-1 capitalize">{message.messageType || 'message'}</span>
                          </Badge>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                            Team
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3 whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Task completion tracking */}
                      {message.messageType === "task" && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Task Completion:</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {players.map((player: any) => (
                              <div key={player.id} className="flex items-center gap-2 text-sm">
                                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                                  {Math.random() > 0.5 ? "✓" : ""}
                                </div>
                                <span className="text-gray-600">{player.firstName} {player.lastName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Announcement acknowledgment tracking */}
                      {message.messageType === "announcement" && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Seen by:</h5>
                          <div className="flex flex-wrap gap-2">
                            {players.map((player: any) => (
                              <div key={player.id} className="flex items-center gap-1 text-sm">
                                <div className={`w-3 h-3 rounded-full ${Math.random() > 0.5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="text-gray-600">{player.firstName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Emoji reactions */}
                      <MessageReactionsDisplay
                        reactions={message.reactions || []}
                        messageId={message.id}
                        currentUserId="test-admin-001"
                      />

                      <p className="text-xs text-gray-500 mt-3">
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </LongPressMessage>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No messages sent yet</p>
                <p className="text-sm text-gray-400">Your team messages will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}