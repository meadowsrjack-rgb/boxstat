import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function PhotoUploadPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      // Use fetch directly for multipart/form-data uploads
      // apiRequest doesn't handle FormData properly
      const token = localStorage.getItem('authToken');
      console.log('📷 Photo upload - token:', token ? token.substring(0, 30) + '...' : 'NULL');
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📷 Photo upload - headers:', JSON.stringify(headers));
      
      const response = await fetch('/api/upload-profile-photo', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      
      console.log('📷 Photo upload - response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.log('📷 Photo upload - error:', error);
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile photo updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/player-dashboard");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload photo. Please try again." });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "File size must be less than 5MB" });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please select an image file" });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setIsUploading(true);
      uploadMutation.mutate(selectedFile);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '';

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-gray-900 to-gray-800 safe-bottom p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/player-dashboard")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold text-white">Update Profile Photo</h1>
          <div className="w-10" />
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Choose New Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current/Preview Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage
                    src={previewUrl || user?.profileImageUrl}
                    alt="Profile"
                  />
                  <AvatarFallback className="text-2xl font-bold bg-gray-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {previewUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 border-red-500 text-white hover:bg-red-600"
                    onClick={clearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-14 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-6 w-6 mr-3" />
                Take Selfie
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mr-3" />
                Upload from Gallery
              </Button>

              {selectedFile && (
                <Button
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Save New Photo"}
                </Button>
              )}
            </div>

            {/* File Info */}
            {selectedFile && (
              <div className="text-center text-white/70 text-sm">
                Selected: {selectedFile.name}
                <br />
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}