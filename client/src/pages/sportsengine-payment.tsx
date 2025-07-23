import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Clock, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SportsEnginePayment {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  description: string;
  type: 'registration' | 'uniform' | 'tournament' | 'equipment' | 'other';
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  dueDate: string;
  paidDate?: string;
  invoiceId: string;
}

interface SportsEngineTeam {
  id: string;
  name: string;
  ageGroup: string;
  season: string;
  division: string;
  coachName: string;
  myPlayers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    position?: string;
  }>;
}

export default function SportsEnginePayment() {
  const { toast } = useToast();
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Fetch my payments from SportsEngine
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<SportsEnginePayment[]>({
    queryKey: ['/api/sportsengine/my-payments'],
  });

  // Fetch my teams and players
  const { data: teams = [], isLoading: teamsLoading } = useQuery<SportsEngineTeam[]>({
    queryKey: ['/api/sportsengine/my-teams'],
  });

  const handlePayment = async (payment: SportsEnginePayment) => {
    setProcessingPayment(payment.id);
    
    try {
      // Create payment intent with SportsEngine
      const response = await fetch('/api/sportsengine/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payment.amount,
          description: payment.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret, paymentId } = await response.json();
      
      // In real implementation, redirect to SportsEngine payment page
      toast({
        title: "Redirecting to Payment",
        description: `Processing $${payment.amount} payment for ${payment.playerName}`,
      });

      // Simulate redirect delay
      setTimeout(() => {
        window.open(`https://sportsengine.com/payment/${paymentId}`, '_blank');
        setProcessingPayment(null);
      }, 1000);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setProcessingPayment(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'registration':
        return 'Season Registration';
      case 'uniform':
        return 'Team Uniform';
      case 'tournament':
        return 'Tournament Entry';
      case 'equipment':
        return 'Equipment';
      default:
        return 'Other';
    }
  };

  if (paymentsLoading || teamsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading SportsEngine data...</p>
        </div>
      </div>
    );
  }

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
  const completedPayments = payments.filter(p => p.status === 'paid' || p.status === 'refunded');

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">SportsEngine Payments</h1>
        <p className="text-muted-foreground">Manage your league payments and registration fees</p>
      </div>

      {/* Team Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {teams.map(team => (
          <Card key={team.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <CardDescription>{team.ageGroup} • {team.division}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">Coach: {team.coachName}</p>
              <div className="space-y-1">
                {team.myPlayers.map(player => (
                  <div key={player.id} className="flex justify-between text-sm">
                    <span>{player.firstName} {player.lastName}</span>
                    <span className="text-muted-foreground">#{player.jerseyNumber || 'TBD'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Outstanding Payments ({pendingPayments.length})
            </CardTitle>
            <CardDescription>
              Payment required for continued participation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium">{payment.description}</h3>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getPaymentTypeLabel(payment.type)} • Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Invoice: {payment.invoiceId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${payment.amount}</p>
                    <Button 
                      onClick={() => handlePayment(payment)}
                      disabled={processingPayment === payment.id}
                      className="mt-2"
                    >
                      {processingPayment === payment.id ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Pay Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All completed and processed payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedPayments.length > 0 ? (
            <div className="space-y-3">
              {completedPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium">{payment.description}</h4>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getPaymentTypeLabel(payment.type)} • 
                      {payment.paidDate && ` Paid: ${new Date(payment.paidDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">${payment.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No payment history available
            </p>
          )}
        </CardContent>
      </Card>

      {/* SportsEngine Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>About SportsEngine Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              • All payments are processed securely through SportsEngine's payment platform
            </p>
            <p>
              • You'll be redirected to SportsEngine to complete your payment
            </p>
            <p>
              • Payment confirmations and receipts are sent via email
            </p>
            <p>
              • Contact your team administrator for payment questions or assistance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}