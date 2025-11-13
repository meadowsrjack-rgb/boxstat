import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function NoProfiles() {
  const handleRetrySync = async () => {
    try {
      // Get user's email from auth context or API
      const userResponse = await fetch('/api/auth/user');
      if (!userResponse.ok) {
        console.error('Failed to get user info');
        return;
      }
      const user = await userResponse.json();
      
      // Call the on-demand sync endpoint with user's email
      const response = await fetch('/api/ghl/sync?email=' + encodeURIComponent(user.email));
      if (response.ok) {
        // Refresh the page to check for profiles again
        window.location.reload();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="min-h-screen-safe bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle>No Profiles Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            We couldn't find your family profiles. This usually means your data is still being processed from GoHighLevel.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={handleRetrySync} 
              className="w-full gap-2"
              data-testid="button-retry-sync"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Sync
            </Button>
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}