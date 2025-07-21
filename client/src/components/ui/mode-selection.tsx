import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { User, Baby } from "lucide-react";

interface ModeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModeSelection({ isOpen, onClose }: ModeSelectionProps) {
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Get child profiles for player mode selection
  const { data: childProfiles = [] } = useQuery({
    queryKey: ["/api/child-profiles", user?.id],
    enabled: !!user?.id && isOpen,
  });

  const handleModeSelect = (mode: 'parent' | 'player') => {
    setError('');
    
    if (mode === 'parent') {
      // Navigate to parent mode
      window.location.href = '/';
      onClose();
    } else {
      // Navigate to player mode with first child
      const firstChild = Array.isArray(childProfiles) && childProfiles.length > 0 ? childProfiles[0] : null;
      if (firstChild) {
        window.location.href = `/?mode=player&childId=${firstChild.id}`;
        onClose();
      } else {
        setError('No child profiles found');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Choose How You'll Use This Device
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card 
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => handleModeSelect('parent')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Parent Mode</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Full access to all features, team management, payments, and child profiles.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => handleModeSelect('player')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Baby className="h-5 w-5" />
                <span>Player Mode</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Kid-friendly interface with limited features for young players.
              </p>
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive text-center">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}