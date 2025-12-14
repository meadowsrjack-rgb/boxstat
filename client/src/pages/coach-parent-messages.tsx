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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Users, CheckSquare, Megaphone, MessageCircle, Mail } from "lucide-react";

export default function CoachParentMessages() {
  const { teamId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [messageType, setMessageType] = useState<"message" | "task" | "announcement">("message");
  const [recipientType, setRecipientType] = useState<"all" | "individual">("all");
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Get team info
  const { data: team } = useQuery({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  // Get team players to get their parents
  const { data: players = [] } = useQuery({
    queryKey: ["/api/team-players", teamId],
    enabled: !!teamId,
  });

  // Mock parent data based on players
  const parents = players.map((player: any) => ({
    id: `parent-${player.id}`,
    name: `${player.firstName}'s Parent`,
    email: `parent.${player.firstName.toLowerCase()}@example.com`,
    playerName: `${player.firstName} ${player.lastName}`,
    playerId: player.id,
  }));

  // Get recent parent messages
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/announcements", "parents", teamId],
    enabled: !!teamId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/announcements", messageData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: `Your ${messageType} has been sent to ${recipientType === "all" ? "all parents" : "the selected parent"}.`,
      });
      setTitle("");
      setContent("");
      setSelectedParent("");
      setMessageType("message");
      setRecipientType("all");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements", "parents", teamId] });
      queryClient.refetchQueries({ queryKey: ["/api/announcements", "parents", teamId] });
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

    if (recipientType === "individual" && !selectedParent) {
      toast({
        title: "Select recipient",
        description: "Please select a parent to send the message to.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      title: messageType === "message" ? content.slice(0, 50) + "..." : title,
      content,
      recipientId: recipientType === "individual" ? selectedParent : null,
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
      <div className="min-h-screen-safe bg-gray-50 safe-bottom flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scrollable-page bg-gray-50 safe-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/admin-dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Parent Messages</h1>
                <p className="text-sm text-gray-600">{team?.name || 'Loading...'}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Users className="w-3 h-3 mr-1" />
              {parents.length} Parents
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-500" />
              Send Message to Parents
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

            {/* Recipient Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Send To:</label>
              <div className="flex gap-3 mb-3">
                <Button
                  variant={recipientType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setRecipientType("all");
                    setSelectedParent("");
                  }}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  All Parents
                </Button>
                <Button
                  variant={recipientType === "individual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecipientType("individual")}
                  className="flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Individual Parent
                </Button>
              </div>

              {recipientType === "individual" && (
                <Select value={selectedParent} onValueChange={setSelectedParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name} ({parent.playerName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
                  placeholder={`What would you like to tell the ${recipientType === "all" ? "parents" : "parent"}?`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send {messageType === "task" ? "Task" : messageType === "announcement" ? "Announcement" : "Message"} to {recipientType === "all" ? "All Parents" : "Selected Parent"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Parent Directory */}
        <Card>
          <CardHeader>
            <CardTitle>Team Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parents.map((parent) => (
                <div key={parent.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{parent.name}</h4>
                      <p className="text-sm text-gray-600">Parent of {parent.playerName}</p>
                      <p className="text-xs text-gray-500">{parent.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecipientType("individual");
                        setSelectedParent(parent.id);
                      }}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Parent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.slice(0, 10).map((message: any) => (
                  <div key={message.id} className={`p-4 rounded-lg border-l-4 ${getMessageTypeColor(message.messageType || 'message')}`}>
                    <div className="flex justify-between items-start mb-2">
                      {message.messageType !== "message" && (
                        <h4 className="font-semibold text-gray-900">{message.title}</h4>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        <Badge variant="outline" className="text-xs">
                          {getMessageTypeIcon(message.messageType || 'message')}
                          <span className="ml-1 capitalize">{message.messageType || 'message'}</span>
                        </Badge>
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                          Parents
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3 whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No parent messages sent yet</p>
                <p className="text-sm text-gray-400">Your parent messages will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}