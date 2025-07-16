import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "@/components/ui/qr-code";
import BadgeDisplay from "@/components/ui/badge-display";
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  Trophy, 
  Star,
  Dumbbell,
  ChevronRight,
  Volleyball
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
  });

  const { data: userEvents } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["/api/users", user?.id, "badges"],
    enabled: !!user?.id,
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const nextEvent = userEvents?.[0];
  const qrData = `UYP-PLAYER-${user.id}-${userTeam?.id}-${Date.now()}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Hey {user.firstName}! 🏀
                </h1>
                <p className="text-sm text-gray-600">{userTeam?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {userBadges?.length || 0}
                </span>
              </div>
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6">
        {/* QR Code Check-in */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-white text-2xl">🎫</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Check-In Pass</h3>
            <p className="text-gray-600 text-sm mb-4">Tap to show your QR code at the gym</p>
            <Button
              onClick={() => setShowQR(true)}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-4 px-6 rounded-xl text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Show My Pass 🎫
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">12</div>
              <div className="text-sm text-gray-600">Practices</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-1">8</div>
              <div className="text-sm text-gray-600">Games</div>
            </CardContent>
          </Card>
        </div>

        {/* Next Event */}
        {nextEvent && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Next Up! 🗓️</h3>
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-4 text-white">
                <h4 className="font-bold text-lg mb-2">{nextEvent.title}</h4>
                <p className="text-sm opacity-90 mb-1">
                  {format(new Date(nextEvent.startTime), "EEEE 'at' h:mm a")}
                </p>
                <p className="text-sm opacity-90">{nextEvent.location}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badges & Achievements */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">My Badges 🏆</h3>
            <div className="grid grid-cols-3 gap-4">
              <BadgeDisplay 
                icon={<Star className="h-5 w-5 text-white" />}
                title="Perfect Attendance"
                earned={true}
                color="from-yellow-500 to-orange-400"
              />
              <BadgeDisplay 
                icon={<Users className="h-5 w-5 text-white" />}
                title="Team Player"
                earned={true}
                color="from-green-500 to-blue-400"
              />
              <BadgeDisplay 
                icon={<Trophy className="h-5 w-5 text-gray-400" />}
                title="MVP"
                earned={false}
                color="from-gray-200 to-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4 mb-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">My Team</h4>
                  <p className="text-sm text-gray-600">See teammates & coach</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Practice Drills</h4>
                  <p className="text-sm text-gray-600">Fun exercises to try</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Team Chat</h4>
                  <p className="text-sm text-gray-600">Talk with teammates</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">My Check-In Pass</h3>
            <p className="text-gray-600 mb-6">Show this to staff at the gym entrance</p>
            <div className="flex justify-center mb-6">
              <QRCode value={qrData} size={200} />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {user.firstName} {user.lastName} - {userTeam?.name}
            </p>
            <Button
              onClick={() => setShowQR(false)}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
