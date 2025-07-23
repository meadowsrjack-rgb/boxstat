import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmojiReactionProps {
  messageId: number;
  onClose: () => void;
  position: { x: number; y: number };
}

const COMMON_EMOJIS = ["👍", "❤️", "😄", "🎉", "👏", "🔥", "⚡", "💪"];

export function EmojiReactionPicker({ messageId, onClose, position }: EmojiReactionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      return apiRequest(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        body: { emoji },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/team"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to add reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEmojiClick = (emoji: string) => {
    addReactionMutation.mutate(emoji);
  };

  return (
    <div
      className="fixed z-50 bg-white border rounded-lg shadow-lg p-2 flex gap-1"
      style={{
        left: Math.min(position.x, window.innerWidth - 250),
        top: Math.max(position.y - 60, 10),
      }}
    >
      {COMMON_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          className="text-lg p-2 h-10 w-10 hover:bg-gray-100"
          onClick={() => handleEmojiClick(emoji)}
          disabled={addReactionMutation.isPending}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}

interface MessageReactionsDisplayProps {
  reactions: Array<{ emoji: string; userId: string; user?: { firstName: string } }>;
  messageId: number;
  currentUserId?: string;
}

export function MessageReactionsDisplay({ reactions, messageId, currentUserId }: MessageReactionsDisplayProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removeReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      return apiRequest(`/api/messages/${messageId}/reactions`, {
        method: "DELETE",
        body: { emoji },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/team"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  const handleReactionClick = (emoji: string) => {
    const userReacted = groupedReactions[emoji]?.some(r => r.userId === currentUserId);
    if (userReacted) {
      removeReactionMutation.mutate(emoji);
    }
  };

  if (Object.keys(groupedReactions).length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
        const userReacted = reactionList.some(r => r.userId === currentUserId);
        return (
          <Button
            key={emoji}
            variant="outline"
            size="sm"
            className={`text-xs h-6 px-2 ${
              userReacted ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-100'
            }`}
            onClick={() => handleReactionClick(emoji)}
            disabled={removeReactionMutation.isPending}
          >
            {emoji} {reactionList.length}
          </Button>
        );
      })}
    </div>
  );
}