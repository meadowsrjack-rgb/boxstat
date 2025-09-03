'use client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
// import { QrReader } from 'react-qr-reader'; // Disabled due to React 18 compatibility issues
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

type QrScannerModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string | number;
  userId: string;
  onCheckedIn?: () => void;
};

export default function QrScannerModal({ 
  open, 
  onOpenChange, 
  eventId, 
  userId, 
  onCheckedIn 
}: QrScannerModalProps) {
  const [scanning, setScanning] = useState(true);
  const { toast } = useToast();

  const { mutate: checkInWithQr, isPending } = useMutation({
    mutationFn: async (qrPayload: any) => {
      const res = await fetch(`/api/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          method: 'qr', 
          userId, 
          eventId, 
          qr: qrPayload,
          type: 'onsite'
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'QR check-in failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      onCheckedIn?.();
      onOpenChange(false);
      toast({
        title: 'QR Check-in Successful',
        description: 'You have been checked in via QR code!',
      });
    },
    onError: (e: any) => {
      toast({
        title: 'QR Check-in Failed',
        description: e instanceof Error ? e.message : 'Invalid QR code or check-in failed.',
        variant: 'destructive',
      });
    },
  });

  const handleScanResult = (result: any, error: any) => {
    if (error) {
      // Don't show errors for normal scanning process
      return;
    }
    
    if (result && scanning) {
      setScanning(false);
      try {
        const text = result.getText();
        console.log('QR Code scanned:', text);
        
        // Try to parse as URL with query parameters
        try {
          const url = new URL(text);
          const payload = {
            event: url.searchParams.get('event'),
            nonce: url.searchParams.get('nonce'),
            exp: url.searchParams.get('exp'),
          };
          
          // Validate required fields
          if (!payload.event || !payload.nonce || !payload.exp) {
            throw new Error('Invalid QR code format');
          }
          
          checkInWithQr(payload);
        } catch (urlError) {
          // Try to parse as JSON
          try {
            const payload = JSON.parse(text);
            if (!payload.event || !payload.nonce || !payload.exp) {
              throw new Error('Invalid QR code format');
            }
            checkInWithQr(payload);
          } catch (jsonError) {
            throw new Error('Invalid QR code format');
          }
        }
      } catch (parseError) {
        toast({
          title: 'Invalid QR Code',
          description: 'This QR code is not valid for event check-in.',
          variant: 'destructive',
        });
        setScanning(true); // Allow scanning again
      }
    }
  };

  const handleClose = () => {
    setScanning(true);
    onOpenChange(false);
  };

  const resetScanning = () => {
    setScanning(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="qr-scanner-modal">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Event QR Code
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid="button-close-qr-scanner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Point your camera at the QR code displayed by your coach to check in.
          </p>
          
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-4">
                  <Camera className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">QR Scanner</p>
                    <p className="text-xs text-gray-500">Camera scanning would appear here</p>
                  </div>
                  <Button 
                    onClick={() => {
                      // Simulate QR scan for demo
                      const mockQrData = {
                        event: eventId,
                        nonce: Math.random().toString(36),
                        exp: (Date.now() + 60000).toString()
                      };
                      setScanning(false);
                      checkInWithQr(mockQrData);
                    }}
                    size="sm"
                    data-testid="button-simulate-qr"
                  >
                    Simulate QR Scan
                  </Button>
                </div>
              </div>
            )}
            
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center space-y-2">
                  <div className="text-lg">📷</div>
                  <p className="text-sm text-gray-600">
                    {isPending ? 'Processing...' : 'QR Code Detected'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {!scanning && !isPending && (
            <Button 
              onClick={resetScanning} 
              variant="outline" 
              className="w-full"
              data-testid="button-scan-again"
            >
              Scan Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
