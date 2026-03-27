import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [path] = useLocation();
  console.log('[NotFound] Rendered at path:', path, 'Full URL:', window.location.href);
  return (
    <div className="min-h-screen-safe w-full flex items-center justify-center bg-gray-50 safe-bottom">
      <Card className="w-full max-w-md md:max-w-lg mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Path: {path}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
