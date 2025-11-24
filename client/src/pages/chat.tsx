import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle,
  Send,
  ArrowLeft,
  Users,
  Smile
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: userTeam } = useQuery<any>({
    queryKey: ["/api/users", (user as any)?.id, "team"],
    enabled: !!(user as any)?.id,
  });

  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", userTeam?.id, "messages"],
    enabled: !!userTeam?.id,
  });

  const { data: teamPlayers = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", userTeam?.id, "players"],
    enabled: !!userTeam?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam?.id, "messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection
  useEffect(() => {
    if (!user || !userTeam) return;

    let ws: WebSocket | null = null;
    
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to WebSocket");
          if (ws && (user as any)?.id) {
            ws.send(JSON.stringify({ type: "join", userId: (user as any).id }));
            setSocket(ws);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "message" && userTeam?.id) {
              queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam.id, "messages"] });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log("Disconnected from WebSocket", event.code, event.reason);
          setSocket(null);
          
          // Only attempt to reconnect if it wasn't a manual close
          if (event.code !== 1000 && event.code !== 1001) {
            console.log("Attempting to reconnect in 5 seconds...");
            setTimeout(connectWebSocket, 5000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setSocket(null);
        };
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setSocket(null);
      }
    };
    
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [user, userTeam, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !userTeam) return;

    const messageData = {
      content: message,
      teamId: userTeam?.id,
      messageType: "text",
    };

    // Send via WebSocket for real-time updates
    if (socket) {
      socket.send(JSON.stringify({
        type: "message",
        senderId: (user as any)?.id,
        ...messageData,
      }));
    }

    // Also send via API for persistence
    sendMessageMutation.mutate(messageData);
  };

  if (!user || !userTeam) {
    return <div>Loading...</div>;
  }

  const isPlayerInterface = (user as any)?.userType === "player";

  return (
    <div className={`flex-1 safe-bottom ${isPlayerInterface ? 'bg-gradient-to-br from-green-500 to-blue-600' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: userTeam.color }}
                >
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{userTeam.name} Chat</h1>
                  <p className="text-sm text-gray-500">
                    {teamPlayers?.length} members online
                  </p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {teamPlayers?.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Team Members (Desktop) */}
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle className="text-sm">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamPlayers?.map((player: any) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.profileImageUrl} />
                      <AvatarFallback className="text-xs">
                        {player.firstName?.[0]}{player.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {player.userType === "player" ? "Player" : "Coach"}
                      </p>
                    </div>
                    {player.id === (user as any).id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Team Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg: any) => {
                  const isOwnMessage = msg.senderId === (user as any).id;
                  const sender = teamPlayers?.find((p: any) => p.id === msg.senderId);
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex space-x-2 max-w-xs ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={sender?.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {sender?.firstName?.[0]}{sender?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg px-3 py-2 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-primary-foreground/70' : 'text-gray-500'
                          }`}>
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isPlayerInterface ? "Type a message! 😊" : "Type a message..."}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  {isPlayerInterface && (
                    <Button variant="outline" size="icon">
                      <Smile className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className={isPlayerInterface ? "bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700" : ""}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
