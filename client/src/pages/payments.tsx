import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, CreditCard, Package, DollarSign, AlertCircle, CheckCircle2, 
  XCircle, RefreshCw, Star, Sparkles, ShoppingBag, Crown, 
  Zap, Gift, ArrowRight, Clock, Users, ChevronRight, Trophy
} from "lucide-react";
import type { Payment, Program as ProgramType } from "@/utils/deriveStatus";

type Program = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  pricingModel?: string;
  billingModel?: string;
  type?: string;
  billingCycle?: string;
  category?: string;
  productCategory?: string;
  accessTag?: string;
  sessionCount?: number;
  isActive?: boolean;
};

type Enrollment = {
  id: number;
  programId: string;
  status: string;
  remainingCredits?: number;
  totalCredits?: number;
  autoRenew?: boolean;
  startDate?: string;
};

type ChildPlayer = {
  id: string;
  firstName: string;
  lastName: string;
};

function HeroSection({ enrollments, programs }: { enrollments: Enrollment[], programs: Program[] }) {
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const subscriptions = activeEnrollments.filter(e => {
    const program = programs.find(p => p.id === e.programId);
    return program?.type === 'Subscription';
  });
  const packCredits = activeEnrollments.reduce((sum, e) => {
    const program = programs.find(p => p.id === e.programId);
    if (program?.type === 'Pack' && e.remainingCredits) {
      return sum + e.remainingCredits;
    }
    return sum;
  }, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/20 via-red-900/10 to-black border border-red-500/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent" />
      <div className="relative p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Your Membership</h2>
            <p className="text-white/60">Manage your programs and purchases</p>
          </div>
          <div className="flex items-center gap-2">
            {subscriptions.length > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 px-3 py-1">
                <Crown className="h-3.5 w-3.5 mr-1" />
                Club Member
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-white/60 text-sm">Active Programs</span>
            </div>
            <p className="text-3xl font-bold text-white" data-testid="stat-active-programs">
              {activeEnrollments.length}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-white/60 text-sm">Session Credits</span>
            </div>
            <p className="text-3xl font-bold text-white" data-testid="stat-session-credits">
              {packCredits}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-white/60 text-sm">Subscriptions</span>
            </div>
            <p className="text-3xl font-bold text-white" data-testid="stat-subscriptions">
              {subscriptions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgramCard({ 
  program, 
  onEnroll, 
  isEnrolled 
}: { 
  program: Program; 
  onEnroll: (program: Program) => void;
  isEnrolled: boolean;
}) {
  const getTypeIcon = () => {
    switch (program.type) {
      case 'Subscription': return <Crown className="h-4 w-4" />;
      case 'Pack': return <Package className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeBadge = () => {
    switch (program.type) {
      case 'Subscription': 
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Subscription</Badge>;
      case 'Pack': 
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{program.sessionCount} Sessions</Badge>;
      default: 
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">One-Time</Badge>;
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
            {getTypeIcon()}
          </div>
          {getTypeBadge()}
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-1">{program.name}</h3>
        <p className="text-white/50 text-sm mb-4 line-clamp-2">
          {program.description || "Join this program and elevate your game."}
        </p>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-white">
              ${program.price ? (program.price / 100).toFixed(2) : '0.00'}
            </span>
            {program.type === 'Subscription' && program.billingCycle && (
              <span className="text-white/40 text-sm">/{program.billingCycle.toLowerCase()}</span>
            )}
          </div>
          
          {isEnrolled ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Enrolled
            </Badge>
          ) : (
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => onEnroll(program)}
              data-testid={`button-enroll-${program.id}`}
            >
              Enroll
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StoreItemCard({ 
  item, 
  onPurchase 
}: { 
  item: Program; 
  onPurchase: (item: Program) => void;
}) {
  return (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
            <ShoppingBag className="h-5 w-5 text-purple-400" />
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            In Stock
          </Badge>
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
        <p className="text-white/50 text-sm mb-4 line-clamp-2">
          {item.description || "Premium quality merchandise."}
        </p>

        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold text-white">
            ${item.price ? (item.price / 100).toFixed(2) : '0.00'}
          </span>
          
          <Button 
            size="sm" 
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => onPurchase(item)}
            data-testid={`button-buy-${item.id}`}
          >
            <ShoppingBag className="h-4 w-4 mr-1" />
            Buy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendedAddons({ 
  enrollments, 
  programs, 
  storeItems,
  onPurchase 
}: { 
  enrollments: Enrollment[];
  programs: Program[];
  storeItems: Program[];
  onPurchase: (item: Program) => void;
}) {
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  
  if (activeEnrollments.length === 0 || storeItems.length === 0) {
    return null;
  }

  const recommendedItems = storeItems.slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-purple-950/10 border-purple-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-400" />
          <CardTitle className="text-white">Recommended For You</CardTitle>
        </div>
        <CardDescription className="text-white/60">
          Complete your experience with these popular add-ons
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedItems.map(item => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer group"
              onClick={() => onPurchase(item)}
            >
              <div className="p-2 rounded-lg bg-purple-500/20">
                <ShoppingBag className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-xs text-white/50">${item.price ? (item.price / 100).toFixed(2) : '0'}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-purple-400 transition-colors" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BillingHistorySection({ payments, programs }: { payments: Payment[], programs: Program[] }) {
  const tableData = useMemo(() => {
    return payments.slice(0, 10).map((payment) => {
      const pkg = programs.find((p) => p.id === payment.programId || p.id === payment.packageId);
      const paymentTypeMap: Record<string, string> = {
        'Subscription': 'Subscription',
        'One-Time': 'One-Time',
        'Pack': 'Credit Pack',
        'package': 'One-Time',
        'add_player': 'Registration',
        'stripe_checkout': pkg?.type || 'One-Time',
      };
      const displayType = paymentTypeMap[payment.paymentType] || pkg?.type || payment.paymentType || "One-Time";
      
      return {
        id: payment.id,
        name: pkg?.name || payment.description || "Payment",
        type: displayType,
        status: payment.status || "pending",
        paymentDate: payment.paidAt || payment.createdAt,
        amount: payment.amount || 0,
      };
    });
  }, [payments, programs]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed": case "active": case "paid":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "past_due": case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
  };

  if (tableData.length === 0) {
    return (
      <div className="text-center py-8 text-white/50">
        <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p>No payment history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tableData.map((row, idx) => (
        <div 
          key={row.id}
          className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
          data-testid={`payment-row-${idx}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <DollarSign className="h-4 w-4 text-white/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{row.name}</p>
              <p className="text-xs text-white/50">
                {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '-'} · {row.type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={getStatusColor(row.status)}>
              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
            </Badge>
            <span className="text-white font-semibold">${(row.amount / 100).toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EnrollmentDialog({ 
  program, 
  children, 
  onClose, 
  onConfirm,
  isLoading 
}: { 
  program: Program | null; 
  children: ChildPlayer[];
  onClose: () => void; 
  onConfirm: (playerId: string | null) => void;
  isLoading: boolean;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const isPerFamily = program?.billingModel === 'Per Family';
  
  if (!program) return null;

  return (
    <Dialog open={!!program} onOpenChange={() => onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Enroll in {program.name}</DialogTitle>
          <DialogDesc className="text-white/60">
            {program.type === 'Subscription' 
              ? `Subscribe for $${program.price ? (program.price / 100).toFixed(2) : '0'}/${program.billingCycle?.toLowerCase() || 'month'}`
              : `One-time payment of $${program.price ? (program.price / 100).toFixed(2) : '0'}`
            }
          </DialogDesc>
        </DialogHeader>

        <div className="py-4">
          {isPerFamily ? (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Users className="h-4 w-4" />
                <span className="font-medium">Family Enrollment</span>
              </div>
              <p className="text-sm text-white/70">
                This program covers your entire family. All your players will have access.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm text-white/70">Select Player</label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-player">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => onConfirm(isPerFamily ? null : selectedPlayer)}
            disabled={isLoading || (!isPerFamily && !selectedPlayer)}
            data-testid="button-confirm-enrollment"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Proceed to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedStoreItem, setSelectedStoreItem] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSuccess = urlParams.get('success') === 'true';
  const paymentCanceled = urlParams.get('canceled') === 'true';
  const sessionId = urlParams.get('session_id');

  useEffect(() => {
    if (paymentSuccess && sessionId) {
      fetch('/api/payments/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then(response => response.json())
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/enrollments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
          window.history.replaceState({}, '', '/payments');
        })
        .catch(() => {
          window.history.replaceState({}, '', '/payments');
        });
    }
  }, [paymentSuccess, sessionId]);

  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
    enabled: !!user,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  const { data: children = [] } = useQuery<ChildPlayer[]>({
    queryKey: ["/api/family/children"],
    enabled: !!user,
  });

  const programs = allProducts.filter(p => p.productCategory === 'service' && p.isActive !== false);
  const storeItems = allProducts.filter(p => p.productCategory === 'goods' && p.isActive !== false);
  
  const enrolledProgramIds = new Set(enrollments.filter(e => e.status === 'active').map(e => e.programId));

  const handleEnroll = async (playerId: string | null) => {
    if (!selectedProgram) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedProgram.id,
          playerId: playerId,
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const data = await response.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handlePurchaseItem = async (item: Program) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: item.id,
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const data = await response.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const isLoading = productsLoading || enrollmentsLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen-safe text-white safe-bottom"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Payment Center</h1>
            <p className="text-white/60">Enroll in programs and manage your purchases</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Alerts */}
        {paymentSuccess && (
          <Alert className="bg-green-500/10 border-green-500/20" data-testid="alert-payment-success">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-white/90">
              Payment successful! Your enrollment is now active.
            </AlertDescription>
          </Alert>
        )}

        {paymentCanceled && (
          <Alert className="bg-amber-500/10 border-amber-500/20" data-testid="alert-payment-canceled">
            <XCircle className="h-5 w-5 text-amber-400" />
            <AlertDescription className="text-white/90">
              Payment was canceled. You can try again when ready.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-500/10 border-red-500/20" data-testid="alert-payment-error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-white/90">{error}</AlertDescription>
          </Alert>
        )}

        {/* Hero Section */}
        <HeroSection enrollments={enrollments} programs={programs} />

        {/* Recommended Add-ons */}
        <RecommendedAddons 
          enrollments={enrollments}
          programs={programs}
          storeItems={storeItems}
          onPurchase={handlePurchaseItem}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="programs" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white/5 border border-white/10 p-1">
            <TabsTrigger 
              value="programs" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-programs"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Programs
            </TabsTrigger>
            <TabsTrigger 
              value="store" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-store"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Store
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-history"
            >
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="mt-6">
            {programs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/60">No programs available at this time</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(program => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEnroll={(p) => setSelectedProgram(p)}
                    isEnrolled={enrolledProgramIds.has(program.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="store" className="mt-6">
            {storeItems.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/60">No store items available at this time</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeItems.map(item => (
                  <StoreItemCard
                    key={item.id}
                    item={item}
                    onPurchase={handlePurchaseItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BillingHistorySection payments={payments} programs={allProducts} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enrollment Dialog */}
        <EnrollmentDialog
          program={selectedProgram}
          children={children}
          onClose={() => setSelectedProgram(null)}
          onConfirm={handleEnroll}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
