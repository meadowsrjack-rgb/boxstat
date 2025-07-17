import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppMode } from "@/hooks/useAppMode";
import { Lock, Shield } from "lucide-react";

interface PinEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinEntry({ isOpen, onClose, onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { unlockDevice, isVerifying } = useAppMode();

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    try {
      await unlockDevice(pin);
      setPin('');
      setError('');
      onSuccess();
      onClose();
    } catch (error) {
      setError('Invalid PIN. Please try again.');
      setPin('');
    }
  };

  const handleKeyPress = (e: React.KeyEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Enter Parent PIN</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-gray-600">
              Enter your 4-digit PIN to access parent features
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="••••"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={pin.length !== 4 || isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Unlock'}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Forgot your PIN? Contact support for assistance.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}