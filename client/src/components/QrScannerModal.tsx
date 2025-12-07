'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, RefreshCw } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

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
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const { mutate: checkInWithQr, isPending } = useMutation({
    mutationFn: async (qrPayload: any) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/attendances`, {
        method: 'POST',
        headers,
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
      stopScanning();
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      onCheckedIn?.();
      onOpenChange(false);
      toast({
        title: 'Check-in Successful!',
        description: 'You have been checked in via QR code.',
      });
    },
    onError: (e: any) => {
      toast({
        title: 'Check-in Failed',
        description: e instanceof Error ? e.message : 'Invalid QR code or check-in failed.',
        variant: 'destructive',
      });
      setScanning(true);
    },
  });

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    
    setIsInitializing(true);
    setCameraError(null);
    
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      
      await reader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            console.log('QR Code scanned:', text);
            
            try {
              let payload;
              try {
                const url = new URL(text);
                payload = {
                  event: url.searchParams.get('event'),
                  nonce: url.searchParams.get('nonce'),
                  exp: url.searchParams.get('exp'),
                };
              } catch {
                payload = JSON.parse(text);
              }
              
              if (!payload.event || !payload.nonce || !payload.exp) {
                throw new Error('Invalid QR code format');
              }
              
              setScanning(false);
              checkInWithQr(payload);
            } catch (parseError) {
              toast({
                title: 'Invalid QR Code',
                description: 'This QR code is not valid for event check-in.',
                variant: 'destructive',
              });
            }
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.error('QR scan error:', error);
          }
        }
      );
      
      setScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Could not access camera. Please check permissions.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application.';
      }
      
      setCameraError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [checkInWithQr, toast]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startScanning();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanning();
    }
  }, [open, startScanning, stopScanning]);

  const handleClose = () => {
    stopScanning();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden" data-testid="qr-scanner-modal">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Point your camera at the QR code displayed by your coach to check in.
          </p>
          
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
            {isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 mx-auto text-white animate-spin" />
                  <p className="text-sm text-gray-300">Starting camera...</p>
                </div>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="text-center space-y-4 p-4">
                  <Camera className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Camera Error</p>
                    <p className="text-xs text-gray-500 mt-1">{cameraError}</p>
                  </div>
                  <Button 
                    onClick={startScanning}
                    size="sm"
                    variant="outline"
                    data-testid="button-retry-camera"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 mx-auto text-white animate-spin" />
                  <p className="text-sm text-white">Checking in...</p>
                </div>
              </div>
            )}
            
            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {scanning && !cameraError && !isInitializing && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
                <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleClose} 
            variant="outline" 
            className="w-full"
            data-testid="button-cancel-scan"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
