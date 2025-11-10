import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message, User } from "@shared/schema";
import {
  Send,
  MessageCircle,
  Users,
  Crown,
  User as UserIcon,
  Clock
} from "lucide-react";

interface TeamChatProps {
  teamId: number;
  teamName?: string;
  className?: string;
  currentProfileId?: string;
}

// Using shared schema types
interface TeamMessageWithSender extends Message {
  sender: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl' | 'userType'>;
}

export default function TeamChat({ teamId, teamName, className, currentProfileId }: TeamChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch team messages
  const { data: messages = [], isLoading } = useQuery<TeamMessageWithSender[]>({
    queryKey: ['/api/teams', teamId, 'messages'],
    enabled: !!teamId,
    refetchInterval: false, // We'll use WebSocket for real-time updates
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; messageType?: string; profileId?: string }) => {
      const result = await apiRequest(`/api/teams/${teamId}/messages`, {
        method: "POST",
        data: messageData
      });
      return result;
    },
    onSuccess: () => {
      setNewMessage("");
      // The WebSocket will handle updating the UI, but we can also refetch for safety
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'messages'] });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // WebSocket setup for real-time messaging
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_team_message' && data.teamId === teamId) {
          // Optimized: append new message directly to cache
          const newMessage = data.message;
          queryClient.setQueryData<TeamMessageWithSender[]>(
            ['/api/teams', teamId, 'messages'], 
            (oldMessages) => {
              if (!oldMessages) return [newMessage];
              // Avoid duplicates by checking if message already exists
              const messageExists = oldMessages.some(msg => msg.id === newMessage.id);
              if (messageExists) return oldMessages;
              return [...oldMessages, newMessage];
            }
          );
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [teamId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      message: trimmedMessage,
      messageType: 'text',
      profileId: currentProfileId
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSenderInitials = (sender: TeamMessageWithSender['sender']) => {
    return `${sender.firstName?.charAt(0) || ''}${sender.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getSenderName = (sender: TeamMessageWithSender['sender']) => {
    const name = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown User';
    const shortId = sender.id.slice(-8); // Last 8 characters of ID for brevity
    return `${name} (${shortId})`;
  };

  const isCoach = (userType: string) => {
    return userType === 'coach' || userType === 'admin';
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isOwnMessage = (senderId: string) => {
    // Message is "own" if it matches either the authenticated user ID or the current profile ID
    return user?.id === senderId || currentProfileId === senderId;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {teamName && (
              <span className="text-sm font-normal text-gray-600">{teamName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Messages Area */}
        <ScrollArea className="h-96 w-full border rounded-lg p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-500">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Be the first to start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwn = isOwnMessage(message.senderId);
                const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId);
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.id}`}
                  >
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender.profileImageUrl} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {getSenderInitials(message.sender)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}
                    
                    <div className={`flex flex-col gap-1 max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isOwn ? 'text-blue-600' : 'text-gray-700'}`}>
                          {getSenderName(message.sender)}
                        </span>
                        {!isOwn && isCoach(message.sender.userType) && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Crown className="h-3 w-3 mr-1" />
                            Coach
                          </Badge>
                        )}
                      </div>
                      
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending || !user}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending || !user}
            size="sm"
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Connection status message */}
        {!isConnected && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
            Real-time messaging is temporarily unavailable. Messages will still be sent.
          </div>
        )}
      </CardContent>
    </Card>
  );
}