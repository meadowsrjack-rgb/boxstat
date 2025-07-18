import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  Trophy,
  Settings,
  ArrowLeft,
  Users,
  Baby,
  Shield,
  Star,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userPayments } = useQuery({
    queryKey: ["/api/users", user?.id, "payments"],
    enabled: !!user?.id,
  });

  const { data: userSubscriptions } = useQuery({
    queryKey: ["/api/users", user?.id, "subscriptions"],
    enabled: !!user?.id,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["/api/users", user?.id, "badges"],
    enabled: !!user?.id,
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/users", user?.id, "stats"],
    enabled: !!user?.id,
  });

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const isParent = user.role === 'parent';
  const isPlayer = user.role === 'player';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-10 w-10 mr-3 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={user.profileImageUrl} alt={user.firstName} />
                  <AvatarFallback className="text-2xl">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">
                  {user.firstName} {user.lastName}
                </CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center">
                    {isParent && <Baby className="h-3 w-3 mr-1" />}
                    {isPlayer && <User className="h-3 w-3 mr-1" />}
                    {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </Badge>
                  {userTeam && (
                    <Badge variant="default">
                      {userTeam.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Joined {format(new Date(user.createdAt), "MMMM yyyy")}
                  </span>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => window.location.href = '/api/logout'}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parent-specific content */}
            {isParent && (
              <>
                {/* Payment History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userPayments?.length > 0 ? (
                      <div className="space-y-3">
                        {userPayments.slice(0, 5).map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{payment.description}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(payment.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${payment.amount}</p>
                              <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setLocation('/payment')}
                        >
                          View All Payments
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500">No payment history yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Training Subscriptions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="h-5 w-5 mr-2" />
                      Training Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userSubscriptions?.length > 0 ? (
                      <div className="space-y-3">
                        {userSubscriptions.map((subscription: any) => (
                          <div key={subscription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{subscription.programTitle}</p>
                              <p className="text-sm text-gray-500">
                                {subscription.type} subscription
                              </p>
                            </div>
                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                              {subscription.status}
                            </Badge>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setLocation('/training-library')}
                        >
                          Access Training Library
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-3">No active training subscriptions.</p>
                        <Button onClick={() => setLocation('/training')}>
                          Browse Training Programs
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Linked Children */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Linked Children
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Avatar className="w-10 h-10 mr-3">
                          <AvatarFallback>AJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Alex Johnson</p>
                          <p className="text-sm text-gray-500">Lightning Bolts • Age 10</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        Manage Children
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Player-specific content */}
            {isPlayer && (
              <>
                {/* Badges & Achievements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="h-5 w-5 mr-2" />
                      Badges & Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userBadges?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {userBadges.map((badge: any) => (
                          <div key={badge.id} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="w-12 h-12 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <Trophy className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-sm font-medium">{badge.title}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(badge.earnedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No badges earned yet. Keep training!</p>
                    )}
                  </CardContent>
                </Card>

                {/* Player Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="h-5 w-5 mr-2" />
                      Player Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userStats?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {userStats.map((stat: any) => (
                          <div key={stat.id} className="text-center p-4 bg-gray-50 rounded-lg">
                            <p className="text-2xl font-bold text-primary">{stat.value}</p>
                            <p className="text-sm text-gray-600">{stat.statType}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No statistics recorded yet.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}