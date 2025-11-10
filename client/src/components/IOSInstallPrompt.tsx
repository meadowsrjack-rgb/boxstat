import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share, Plus, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function IOSInstallPrompt() {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800" data-testid="ios-install-prompt">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Install BoxStat on iPhone
        </CardTitle>
        <CardDescription className="text-blue-900 dark:text-blue-100">
          To enable push notifications on iPhone, you need to install BoxStat to your home screen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-white dark:bg-gray-900">
          <AlertDescription className="space-y-3">
            <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              Follow these steps:
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">1.</span>
                <span className="flex items-center gap-1">
                  Tap the <Share className="h-4 w-4 inline text-blue-600 dark:text-blue-400" /> Share button at the bottom of Safari
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">2.</span>
                <span className="flex items-center gap-1">
                  Scroll down and tap <Plus className="h-4 w-4 inline text-blue-600 dark:text-blue-400" /> "Add to Home Screen"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">3.</span>
                <span>Tap "Add" in the top right corner</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">4.</span>
                <span>Open BoxStat from your home screen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">5.</span>
                <span>Return here to enable notifications</span>
              </li>
            </ol>
          </AlertDescription>
        </Alert>
        
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Note: Push notifications only work when BoxStat is installed as an app on your iPhone's home screen.
        </p>
      </CardContent>
    </Card>
  );
}
