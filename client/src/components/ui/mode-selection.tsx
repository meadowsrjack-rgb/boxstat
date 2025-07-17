import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppMode } from "@/hooks/useAppMode";
import { User, Lock, Baby, Shield } from "lucide-react";

interface ModeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModeSelection({ isOpen, onClose }: ModeSelectionProps) {
  const [selectedMode, setSelectedMode] = useState<'parent' | 'player' | null>(null);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const { childProfiles, setPlayerMode, setParentMode, isUpdating } = useAppMode();

  const handleModeSelect = (mode: 'parent' | 'player') => {
    setSelectedMode(mode);
    setError('');
    
    if (mode === 'parent') {
      // For parent mode, no additional setup needed
      setStep(3);
    } else {
      // For player mode, need to select child and set PIN
      setStep(2);
    }
  };

  const handleChildSelect = (childId: string) => {
    setSelectedChild(parseInt(childId));
    setStep(3);
  };

  const handlePinSubmit = async () => {
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    try {
      if (selectedMode === 'parent') {
        await setParentMode();
      } else if (selectedMode === 'player' && selectedChild) {
        await setPlayerMode(selectedChild, pin);
      }
      onClose();
    } catch (error) {
      setError('Failed to set device mode');
    }
  };

  const resetForm = () => {
    setSelectedMode(null);
    setSelectedChild(null);
    setPin('');
    setConfirmPin('');
    setStep(1);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "How will this device be used?"}
            {step === 2 && "Select Child Profile"}
            {step === 3 && selectedMode === 'parent' && "Set Parent Mode"}
            {step === 3 && selectedMode === 'player' && "Set Player Mode PIN"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <Card 
              className={`cursor-pointer transition-all ${selectedMode === 'parent' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => handleModeSelect('parent')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Parent Mode</h3>
                    <p className="text-sm text-gray-600">Full access to all features</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${selectedMode === 'player' ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => handleModeSelect('player')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Baby className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Player Mode</h3>
                    <p className="text-sm text-gray-600">Locked for child use</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600">Select which child will use this device:</p>
            
            <Select onValueChange={handleChildSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a child" />
              </SelectTrigger>
              <SelectContent>
                {childProfiles?.map((child: any) => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {childProfiles?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No child profiles found. Create a child profile first.
              </p>
            )}
          </div>
        )}

        {step === 3 && selectedMode === 'parent' && (
          <div className="space-y-4">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Parent Mode Activated</h3>
              <p className="text-gray-600">
                This device will have full access to all parent features and settings.
              </p>
            </div>
            
            <Button 
              onClick={handlePinSubmit} 
              className="w-full"
              disabled={isUpdating}
            >
              {isUpdating ? 'Setting up...' : 'Continue'}
            </Button>
          </div>
        )}

        {step === 3 && selectedMode === 'player' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Security PIN</h3>
              <p className="text-gray-600">
                Create a 4-digit PIN to secure access to parent features.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="pin">Enter 4-digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div>
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <Button 
                onClick={handlePinSubmit} 
                className="w-full"
                disabled={!pin || !confirmPin || isUpdating}
              >
                {isUpdating ? 'Setting up...' : 'Lock Device'}
              </Button>
            </div>
          </div>
        )}

        {step > 1 && (
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}