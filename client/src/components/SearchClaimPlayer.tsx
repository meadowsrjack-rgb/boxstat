import React, { useState, useCallback } from 'react';
import { Search, UserCheck, Mail, Phone, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
// Simple debounce implementation
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

interface SearchResult {
  id: string;
  fullName: string;
  teamName?: string;
  jerseyNumber?: string;
  photoUrl?: string;
  // New Notion fields
  displayText?: string;
  team?: string;
  currentProgram?: string;
  profileUrl?: string;
}

interface ClaimRequestData {
  playerId: string;
  contact: string;
}

interface VerifyClaimData {
  playerId: string;
  contact: string;
  code: string;
}

export default function SearchClaimPlayer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<SearchResult | null>(null);
  const [contact, setContact] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [claimStep, setClaimStep] = useState<'search' | 'contact' | 'verify' | 'success'>('search');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search players query using Notion data
  const { data: searchResponse, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search/notion-players', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { ok: true, players: [] };
      
      const response = await fetch(`/api/search/notion-players?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  const searchResults = searchResponse?.players || [];

  // Claim request mutation
  const claimRequestMutation = useMutation({
    mutationFn: async (data: ClaimRequestData) => 
      apiRequest('/api/players/claim/request', {
        method: 'POST',
        data: data
      }),
    onSuccess: (response) => {
      if (response.type === 'verification') {
        setClaimStep('verify');
        toast({
          title: "Verification Code Sent",
          description: response.message,
          variant: "default",
        });
      } else if (response.type === 'approval') {
        toast({
          title: "Coach Approval Requested",
          description: response.message,
          variant: "default",
        });
        setIsDialogOpen(false);
        resetClaimFlow();
      }
    },
    onError: (error) => {
      console.error('Claim request error:', error);
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    }
  });

  // Verify claim mutation
  const verifyClaimMutation = useMutation({
    mutationFn: async (data: VerifyClaimData) =>
      apiRequest('/api/players/claim/verify', {
        method: 'POST',
        data: data
      }),
    onSuccess: (response) => {
      setClaimStep('success');
      toast({
        title: "Player Claimed Successfully!",
        description: response.message,
        variant: "default",
      });
      
      // Invalidate user players query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    }
  });

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query !== searchQuery) {
        setSearchQuery(query);
      }
    }, 300),
    [searchQuery]
  );

  const resetClaimFlow = () => {
    setSelectedPlayer(null);
    setContact('');
    setVerificationCode('');
    setClaimStep('search');
  };

  const handlePlayerSelect = (player: SearchResult) => {
    setSelectedPlayer(player);
    setClaimStep('contact');
    setIsDialogOpen(true);
  };

  const handleClaimRequest = () => {
    if (!selectedPlayer || !contact) return;
    
    claimRequestMutation.mutate({
      playerId: selectedPlayer.id,
      contact
    });
  };

  const handleVerifyCode = () => {
    if (!selectedPlayer || !contact || !verificationCode) return;
    
    verifyClaimMutation.mutate({
      playerId: selectedPlayer.id,
      contact,
      code: verificationCode
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetClaimFlow();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Find Your Player</h2>
        <p className="text-gray-600">
          Search for your child in the BoxStat roster and claim their profile
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by player name..."
          className="pl-10"
          onChange={(e) => debouncedSearch(e.target.value)}
          data-testid="search-player-input"
        />
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Search Results {isSearching && <span className="text-sm font-normal text-gray-500">(searching...)</span>}
          </h3>
          
          {searchResults.length === 0 && !isSearching && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  No players found matching "{searchQuery}". Try adjusting your search.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((player: SearchResult) => (
              <Card key={player.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    {player.photoUrl && (
                      <img 
                        src={player.photoUrl} 
                        alt={player.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {player.displayText || player.fullName}
                      </h4>
                      {(player.team || player.currentProgram) && (
                        <p className="text-sm text-gray-600">
                          {player.team && player.currentProgram 
                            ? `${player.team} (${player.currentProgram})`
                            : player.team || player.currentProgram
                          }
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handlePlayerSelect(player)}
                      size="sm"
                      className="flex-shrink-0"
                      data-testid={`claim-player-${player.id}`}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Claim Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {claimStep === 'contact' && 'Verify Your Contact Info'}
              {claimStep === 'verify' && 'Enter Verification Code'}
              {claimStep === 'success' && 'Player Claimed Successfully!'}
            </DialogTitle>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4">
              {/* Player Info */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold text-sm">
                    {selectedPlayer.fullName?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{selectedPlayer.displayText || selectedPlayer.fullName}</p>
                  {(selectedPlayer.team || selectedPlayer.currentProgram) && (
                    <p className="text-sm text-gray-600">
                      {selectedPlayer.team && selectedPlayer.currentProgram 
                        ? `${selectedPlayer.team} (${selectedPlayer.currentProgram})`
                        : selectedPlayer.team || selectedPlayer.currentProgram
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Step */}
              {claimStep === 'contact' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contact">Email or Phone Number</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="contact"
                        placeholder="parent@example.com or (555) 123-4567"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="pl-10"
                        data-testid="contact-input"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send a verification code to confirm you're authorized to claim this player
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleClaimRequest}
                    disabled={!contact || claimRequestMutation.isPending}
                    className="w-full"
                    data-testid="send-code-button"
                  >
                    {claimRequestMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Verification Step */}
              {claimStep === 'verify' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className="text-center text-lg font-mono"
                      data-testid="verification-code-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Code sent to {contact}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length !== 6 || verifyClaimMutation.isPending}
                    className="w-full"
                    data-testid="verify-code-button"
                  >
                    {verifyClaimMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify & Claim Player
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setClaimStep('contact')}
                    className="w-full"
                  >
                    Try Different Contact Info
                  </Button>
                </div>
              )}

              {/* Success Step */}
              {claimStep === 'success' && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Welcome to BoxStat!
                    </h3>
                    <p className="text-gray-600 mt-2">
                      {selectedPlayer.fullName} has been added to your family. You can now view their schedule, progress, and more.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleDialogClose}
                    className="w-full"
                    data-testid="claim-success-done"
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}