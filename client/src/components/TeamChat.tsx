import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  MessageCircle,
  Crown,
  Clock,
  ChevronUp
} from "lucide-react";

interface TeamChatProps {
  teamId: number;
  teamName?: string;
  className?: string;
  currentProfileId?: string;
  readOnly?: boolean; // When true, hides message input (for announcements-only mode)
  channel?: 'players' | 'parents'; // Chat channel: 'players' or 'parents'
}

interface TeamMessageWithSender {
  id: number;
  teamId: number;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string | Date;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    userType?: string;
  };
}

const MESSAGES_PER_PAGE = 10;

export default function TeamChat({ teamId, teamName, className, currentProfileId, readOnly = false, channel = 'players' }: TeamChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: allMessages = [], isLoading } = useQuery<TeamMessageWithSender[]>({
    queryKey: ['/api/teams', teamId, 'messages', channel],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/teams/${teamId}/messages?channel=${channel}`, {
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!teamId,
    refetchInterval: false,
  });

  const messages = allMessages.slice(-visibleCount);
  const hasMoreMessages = allMessages.length > visibleCount;

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; messageType?: string; profileId?: string; channel?: string }) => {
      const result = await apiRequest(`/api/teams/${teamId}/messages`, {
        method: "POST",
        data: { ...messageData, channel }
      });
      return result;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId, 'messages', channel] });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Only update if message is for this team AND this channel
        if (data.type === 'new_team_message' && data.teamId === teamId && 
            (data.channel === channel || (!data.channel && channel === 'players'))) {
          const newMsg = data.message;
          queryClient.setQueryData<TeamMessageWithSender[]>(
            ['/api/teams', teamId, 'messages', channel], 
            (oldMessages) => {
              if (!oldMessages) return [newMsg];
              const messageExists = oldMessages.some(msg => msg.id === newMsg.id);
              if (messageExists) return oldMessages;
              return [...oldMessages, newMsg];
            }
          );
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [teamId, channel, queryClient]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + MESSAGES_PER_PAGE);
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
    return `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown User';
  };

  const isCoach = (userType?: string) => {
    return userType === 'coach' || userType === 'admin';
  };

  const formatMessageTime = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isOwnMessage = (senderId: string | unknown) => {
    const senderIdStr = String(senderId);
    return user?.id === senderIdStr || currentProfileId === senderIdStr;
  };

  return (
    <div className={className}>
      <div 
        ref={scrollContainerRef}
        className="h-72 overflow-y-auto bg-gray-50 rounded-xl p-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
            <span className="ml-2 text-sm text-gray-500">Loading messages...</span>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="h-10 w-10 mb-2 text-gray-300" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-gray-400">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hasMoreMessages && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  data-testid="button-load-more"
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Load earlier messages
                </Button>
              </div>
            )}
            
            {messages.map((message, index) => {
              const isOwn = isOwnMessage(message.senderId);
              const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== message.senderId);
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.id}`}
                >
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={message.sender?.profileImageUrl} />
                          <AvatarFallback className="bg-red-100 text-red-600 text-xs">
                            {getSenderInitials(message.sender)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>
                  )}
                  
                  <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {showAvatar && !isOwn && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-medium text-gray-600">
                          {getSenderName(message.sender)}
                        </span>
                        {isCoach(message.sender?.userType) && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />
                            Coach
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-red-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 px-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatMessageTime(message.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input - hidden in readOnly mode (announcements only) */}
      {!readOnly && (
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending || !user}
            className="flex-1 bg-white rounded-full px-4"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending || !user}
            size="icon"
            className="bg-red-600 hover:bg-red-700 rounded-full h-10 w-10"
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      <div className="h-6" />
    </div>
  );
}
