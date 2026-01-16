import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";
import { useAppMode } from "./useAppMode";

interface Award {
  id: number;
  name: string;
  tier: string;
  description?: string;
  imageUrl?: string;
  earnedAt?: string;
}

export function useAwardToast() {
  const { user } = useAuth();
  const { currentChildProfile } = useAppMode();
  const { toast } = useToast();
  const previousAwardsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  
  // Match profile resolution exactly with player-dashboard pattern
  const [profileId, setProfileId] = useState<string | null>(null);
  
  useEffect(() => {
    // Priority: localStorage > currentChildProfile > activeProfileId > user.id
    const selectedPlayerId = localStorage.getItem("selectedPlayerId");
    const childProfileId = currentChildProfile?.id;
    const activeProfileId = (user as any)?.activeProfileId;
    const userId = (user as any)?.id;
    setProfileId(selectedPlayerId || childProfileId || activeProfileId || userId || null);
  }, [user, currentChildProfile]);
  
  // Use array-style queryKey matching player-dashboard pattern for cache consistency
  const { data: awards = [] } = useQuery<Award[]>({
    queryKey: ["/api/users", profileId, "awards"],
    enabled: !!profileId,
    refetchInterval: 15000,
  });
  
  useEffect(() => {
    if (!awards || awards.length === 0) return;
    
    const currentAwardKeys = new Set(
      awards.map((a) => `${a.id}-${a.earnedAt || a.id}`)
    );
    
    if (!isInitializedRef.current) {
      previousAwardsRef.current = currentAwardKeys;
      isInitializedRef.current = true;
      return;
    }
    
    const newAwards = awards.filter(
      (a) => !previousAwardsRef.current.has(`${a.id}-${a.earnedAt || a.id}`)
    );
    
    newAwards.forEach((award) => {
      toast({
        title: `🏆 ${award.name}`,
        description: `You earned the "${award.name}" (${award.tier}) award!`,
        duration: 6000,
      });
    });
    
    previousAwardsRef.current = currentAwardKeys;
  }, [awards, toast]);
  
  return { awards };
}
