import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X, CheckCircle } from "lucide-react";

interface QRReaderProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRReader({ onScan, onClose, isOpen }: QRReaderProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Simulate QR code detection for demo purposes
  const simulateQRScan = (qrData: string) => {
    setLastScan(qrData);
    onScan(qrData);
    stopCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Scan Player QR Code</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isScanning ? (
            <div className="text-center space-y-4">
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Camera className="h-16 w-16 text-gray-400" />
              </div>
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              
              {/* Demo buttons for testing */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm text-gray-600 text-center">Demo QR Codes:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => simulateQRScan("UYP-PLAYER-test-player-001-123456")}
                  >
                    Player #21
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => simulateQRScan("UYP-PLAYER-alex-456-789012")}
                  >
                    Player Alex
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 bg-black rounded-lg"
              />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Point camera at player's QR code
                </p>
                <Button variant="outline" onClick={stopCamera}>
                  Stop Camera
                </Button>
              </div>
            </div>
          )}
          
          {lastScan && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Last Scan: {lastScan}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}