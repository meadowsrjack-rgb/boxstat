import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, AlertTriangle, CreditCard, Users, Calendar } from "lucide-react";

interface Account {
  id: string;
  email: string;
  registrationStatus: 'pending' | 'active' | 'payment_required';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  primaryAccountType: string;
}

interface Profile {
  id: string;
  profileType: 'parent' | 'player' | 'coach';
  firstName: string;
  lastName: string;
  teamId?: number;
  jerseyNumber?: number;
}

export default function RegistrationStatus() {
  const { data: account, isLoading: accountLoading } = useQuery<Account>({
    queryKey: ['/api/account/me'],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<Profile[]>({
    queryKey: ['/api/profiles/me'],
  });

  const isLoading = accountLoading || profilesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-bottom flex items-center justify-center" data-testid="loading-registration">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration status...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-bottom flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Account Not Found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find your account information. Please contact support for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRegistrationStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: 'Active',
          variant: 'default' as const,
          description: 'Your registration is complete and active'
        };
      case 'payment_required':
        return {
          icon: <CreditCard className="w-5 h-5 text-orange-600" />,
          label: 'Payment Required',
          variant: 'destructive' as const,
          description: 'Payment is needed to complete registration'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          label: 'Pending',
          variant: 'secondary' as const,
          description: 'Registration is being processed'
        };
    }
  };

  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: 'Paid',
          variant: 'default' as const
        };
      case 'overdue':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          label: 'Overdue',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-yellow-600" />,
          label: 'Pending',
          variant: 'secondary' as const
        };
    }
  };

  const registrationInfo = getRegistrationStatusInfo(account.registrationStatus);
  const paymentInfo = getPaymentStatusInfo(account.paymentStatus);
  const playerProfiles = profiles.filter(p => p.profileType === 'player');

  return (
    <div className="scrollable-page bg-gray-50 safe-bottom p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="title-registration">
            Registration Status
          </h1>
          <p className="text-gray-600">
            View your registration and payment status for BoxStat
          </p>
        </div>

        {/* Alert for payment required */}
        {account.registrationStatus === 'payment_required' && (
          <Alert className="border-orange-200 bg-orange-50" data-testid="alert-payment-required">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>Payment Required:</strong> Your registration is pending payment. 
              You should have received payment instructions via email. Please complete payment to activate your account.
            </AlertDescription>
          </Alert>
        )}

        {account.paymentStatus === 'overdue' && (
          <Alert className="border-red-200 bg-red-50" data-testid="alert-payment-overdue">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Payment Overdue:</strong> Your payment is overdue. 
              Please complete payment immediately to avoid service interruption.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Registration Status Card */}
          <Card data-testid="card-registration-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {registrationInfo.icon}
                Registration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={registrationInfo.variant} data-testid="badge-registration-status">
                  {registrationInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {registrationInfo.description}
              </p>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Account Email:</span>
                  <span className="font-medium" data-testid="text-account-email">{account.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Card */}
          <Card data-testid="card-payment-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {paymentInfo.icon}
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={paymentInfo.variant} data-testid="badge-payment-status">
                  {paymentInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Payments are processed through our registration system. 
                {account.paymentStatus === 'pending' && ' You will receive payment instructions via email.'}
                {account.paymentStatus === 'overdue' && ' Please check your email for payment details.'}
              </p>
              {account.paymentStatus !== 'paid' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-700 text-sm">
                    <strong>Need Help?</strong> If you have questions about payment or haven't received instructions, 
                    please contact our support team.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Players Information */}
        <Card data-testid="card-players-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Registered Players ({playerProfiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerProfiles.length > 0 ? (
              <div className="grid gap-4">
                {playerProfiles.map((player, index) => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    data-testid={`player-card-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`player-name-${index}`}>
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {player.jerseyNumber && `#${player.jerseyNumber} • `}
                          Player Profile
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid={`player-status-${index}`}>
                      Registered
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No player profiles found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Player profiles will appear here once registration is complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        {account.registrationStatus === 'active' && (
          <Card data-testid="card-next-steps">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Check the schedule for upcoming practices and games</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Complete player profiles with emergency contacts</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Download the team communication app if available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}