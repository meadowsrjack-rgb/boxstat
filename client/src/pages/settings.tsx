import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ChevronRight,
  User,
  Shield,
  Lock,
  Users,
  Key,
  Settings,
  MessageCircle,
  HelpCircle
} from "lucide-react";

export default function SettingsPage() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleSignOut = async () => {
    await logout();
    setLocation("/");
  };

  const handleDeleteAccount = () => {
    // In a real app, this would show a confirmation dialog
    alert("Delete account functionality would be implemented here with proper confirmation dialogs.");
  };

  const navigateToSection = (section: string) => {
    // In a real app, these would navigate to specific settings pages
    alert(`Navigate to ${section} settings - this would be implemented as separate pages.`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/")}
              className="mr-3 h-10 w-10"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-1">
          {/* Account Section */}
          <button
            onClick={() => navigateToSection("Account")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Account</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Privacy Section */}
          <button
            onClick={() => navigateToSection("Privacy")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Privacy</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Subscription Section */}
          <button
            onClick={() => navigateToSection("Subscription")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Lock className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Subscription</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Teams Section */}
          <button
            onClick={() => navigateToSection("Teams")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-gray-400" />
              <span className="text-lg text-gray-400">Teams</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-2 bg-gray-200 mx-4"></div>

        <div className="px-4 py-6 space-y-1">
          {/* Permissions Section */}
          <button
            onClick={() => navigateToSection("Permissions")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Key className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Permissions</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Advanced Section */}
          <button
            onClick={() => navigateToSection("Advanced")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Advanced</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Feedback Section */}
          <button
            onClick={() => navigateToSection("Feedback")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Feedback</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Help Section */}
          <button
            onClick={() => navigateToSection("Help")}
            className="w-full flex items-center justify-between py-4 px-4 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-6 w-6 text-gray-600" />
              <span className="text-lg text-gray-900">Help</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-2 bg-gray-200 mx-4"></div>

        {/* Action Buttons */}
        <div className="px-4 py-6 space-y-4">
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full py-4 text-center text-blue-500 font-medium bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>

          {/* Delete Account Button */}
          <button
            onClick={handleDeleteAccount}
            className="w-full py-4 text-center text-red-500 font-medium bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            Delete Account
          </button>
        </div>

        {/* Footer Links */}
        <div className="px-4 pb-8">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <button
              onClick={() => navigateToSection("Terms of Use")}
              className="hover:text-gray-700 transition-colors"
            >
              Terms of Use
            </button>
            <span>•</span>
            <button
              onClick={() => navigateToSection("Privacy Policy")}
              className="hover:text-gray-700 transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}