import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, DollarSign, AlertCircle, CheckCircle2, Check,
  XCircle, RefreshCw, ShoppingBag,
  Gift, Clock, Users, ChevronRight, Trophy, ChevronLeft, History
} from "lucide-react";
import type { Payment } from "@/utils/deriveStatus";

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
  displayCategory?: string;
  iconName?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  inventorySizes?: string[];
  sizeStock?: Record<string, number>;
  pricingOptions?: any[];
  durationDays?: number;
  visibility?: string;
  priceHidden?: boolean;
  tryoutEnabled?: boolean;
  tryoutPrice?: number;
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

type SuggestedAddOn = {
  productId: string;
  programId: string;
  displayOrder: number;
  isRequired: boolean;
  product: Program;
};

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

function ProgramCard({ 
  program, 
  onEnroll, 
  onTryout,
  isEnrolled 
}: { 
  program: Program; 
  onEnroll: (program: Program) => void;
  onTryout?: (program: Program) => void;
  isEnrolled: boolean;
}) {
  const isTryoutCategory = (program.displayCategory || '').toLowerCase() === 'tryout' ||
    (program.type || '').toLowerCase() === 'tryout';
  
  const priceHidden = !!program.priceHidden;
  const hasTryout = priceHidden && program.tryoutEnabled && program.tryoutPrice != null;
  
  const categoryLabel = program.displayCategory 
    ? program.displayCategory.charAt(0).toUpperCase() + program.displayCategory.slice(1)
    : 'Program';

  const basePrice = useMemo(() => {
    if (program.pricingOptions && program.pricingOptions.length > 0) {
      const defaultOpt = program.pricingOptions.find((o: any) => o.isDefault) || program.pricingOptions[0];
      return defaultOpt?.price;
    }
    return program.price;
  }, [program]);

  const priceDisplay = useMemo(() => {
    if (priceHidden) return null;
    if (basePrice === undefined || basePrice === null) return null;
    const dollars = (basePrice / 100).toFixed(2);
    return `$${dollars}`;
  }, [basePrice, priceHidden]);

  return (
    <div
      className="bg-white/5 border border-white/10 hover:border-white/20 hover:shadow-lg transition-all rounded-xl p-5 flex flex-col cursor-pointer"
      onClick={() => hasTryout ? (onTryout && onTryout(program)) : (!priceHidden && onEnroll(program))}
      data-testid={`program-card-${program.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
          isTryoutCategory
            ? 'bg-purple-500/20 text-purple-400'
            : 'bg-white/10 text-white/60'
        }`}>
          {categoryLabel}
        </span>
        {priceDisplay && (
          <span className="ml-auto text-sm font-semibold text-red-400">{priceDisplay}</span>
        )}
        {hasTryout && (
          <span className="ml-auto text-sm font-semibold text-purple-400">${(program.tryoutPrice! / 100).toFixed(2)} tryout</span>
        )}
        {priceHidden && !hasTryout && (
          <span className="ml-auto text-xs text-white/30 italic">Members only</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{program.name}</h3>
      <p className="text-white/50 text-sm line-clamp-2 flex-1">
        {program.description || "Join this program and elevate your game."}
      </p>
      {isEnrolled ? (
        <button
          className="mt-4 w-full py-2 text-sm font-semibold rounded-lg bg-green-500/20 text-green-400 cursor-default"
          data-testid={`button-enroll-${program.id}`}
        >
          <span className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Enrolled
          </span>
        </button>
      ) : hasTryout ? (
        <button
          className="mt-4 w-full py-2 text-sm font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); onTryout && onTryout(program); }}
          data-testid={`button-tryout-${program.id}`}
        >
          Try Out
        </button>
      ) : priceHidden ? (
        <button
          className="mt-4 w-full py-2 text-sm font-semibold rounded-lg bg-white/10 text-white/40 cursor-default"
          data-testid={`button-enroll-${program.id}`}
          disabled
        >
          Members Only
        </button>
      ) : (
        <button
          className={`mt-4 w-full py-2 text-sm font-semibold rounded-lg transition-colors ${
            isTryoutCategory
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          onClick={(e) => { e.stopPropagation(); onEnroll(program); }}
          data-testid={`button-enroll-${program.id}`}
        >
          {isTryoutCategory ? "Register" : "Enroll"}
        </button>
      )}
    </div>
  );
}

function StoreItemCard({ 
  item, 
  onClick
}: { 
  item: Program; 
  onClick: (item: Program) => void;
}) {
  const allImages = useMemo(() => {
    const urls: string[] = [];
    if (item.imageUrls && item.imageUrls.length > 0) {
      urls.push(...item.imageUrls);
    } else if (item.coverImageUrl) {
      urls.push(item.coverImageUrl);
    }
    return urls;
  }, [item]);

  const hasImages = allImages.length > 0;

  const categoryLabel = item.displayCategory
    ? item.displayCategory.charAt(0).toUpperCase() + item.displayCategory.slice(1)
    : 'Store';

  const priceDisplay = item.price ? `$${(item.price / 100).toFixed(2)}` : 'Free';

  return (
    <div
      className="bg-white/5 border border-white/10 hover:border-white/20 hover:shadow-lg transition-all rounded-xl overflow-hidden flex flex-col cursor-pointer"
      onClick={() => onClick(item)}
      data-testid={`store-card-${item.id}`}
    >
      {hasImages && (
        <div className="relative aspect-[4/3] bg-black/20">
          <img
            src={allImages[0]}
            alt={item.name}
            className="w-full h-full object-contain"
          />
          {allImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              +{allImages.length - 1} more
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 bg-white/10 px-2 py-0.5 rounded w-fit mb-2">
          {categoryLabel}
        </span>
        <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
        <p className="text-white/50 text-xs line-clamp-2 flex-1">
          {item.description || "Premium quality merchandise."}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-base font-bold text-white">{priceDisplay}</span>
          <span className="text-xs text-white/40">View →</span>
        </div>
      </div>
    </div>
  );
}

function StoreItemDialog({
  item,
  onClose,
  onPurchase,
}: {
  item: Program | null;
  onClose: () => void;
  onPurchase: (item: Program, selectedOption?: any) => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const allImages = useMemo(() => {
    if (!item) return [];
    const urls: string[] = [];
    if (item.imageUrls && item.imageUrls.length > 0) {
      urls.push(...item.imageUrls);
    } else if (item.coverImageUrl) {
      urls.push(item.coverImageUrl);
    }
    return urls;
  }, [item]);

  const hasPricingOptions = !!(item?.pricingOptions && item.pricingOptions.length > 0);

  useEffect(() => {
    setImgIndex(0);
    if (item?.pricingOptions && item.pricingOptions.length > 0) {
      const defaultOpt = item.pricingOptions.find((o: any) => o.isDefault) || item.pricingOptions[0];
      setSelectedOptionId(defaultOpt?.id || null);
    } else {
      setSelectedOptionId(null);
    }
  }, [item?.id]);

  const selectedOption = useMemo(() => {
    if (!item || !hasPricingOptions) return null;
    return item.pricingOptions!.find((o: any) => o.id === selectedOptionId) || item.pricingOptions![0];
  }, [item, hasPricingOptions, selectedOptionId]);

  const displayedPrice = useMemo(() => {
    if (selectedOption) {
      const dollars = (selectedOption.price / 100).toFixed(2);
      const billingCycle = selectedOption.billingCycle && selectedOption.billingCycle !== 'One-Time'
        ? `/${selectedOption.billingCycle.toLowerCase()}`
        : '';
      return `$${dollars}${billingCycle}`;
    }
    return item?.price ? `$${(item.price / 100).toFixed(2)}` : 'Free';
  }, [selectedOption, item?.price]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{item.name}</DialogTitle>
          {item.displayCategory && (
            <DialogDesc className="text-white/50 text-xs uppercase tracking-wider">
              {item.displayCategory.charAt(0).toUpperCase() + item.displayCategory.slice(1)}
            </DialogDesc>
          )}
        </DialogHeader>

        {allImages.length > 0 && (
          <div
            className="relative aspect-[16/9] bg-black/30 rounded-lg overflow-hidden"
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
            onTouchMove={e => { e.preventDefault(); }}
            onTouchEnd={e => {
              if (touchStartX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) < 40) return;
              if (dx < 0) {
                setImgIndex(i => (i + 1) % allImages.length);
              } else {
                setImgIndex(i => (i - 1 + allImages.length) % allImages.length);
              }
            }}
          >
            <img
              src={allImages[imgIndex]}
              alt={`${item.name} image ${imgIndex + 1}`}
              className="w-full h-full object-contain"
            />
            {allImages.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                  onClick={() => setImgIndex(i => (i - 1 + allImages.length) % allImages.length)}
                  data-testid="carousel-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                  onClick={() => setImgIndex(i => (i + 1) % allImages.length)}
                  data-testid="carousel-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-white/70 text-sm leading-relaxed">
          {item.description || "Premium quality merchandise."}
        </p>

        {item.inventorySizes && item.inventorySizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.inventorySizes.map(size => (
              <span key={size} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">{size}</span>
            ))}
          </div>
        )}

        {/* Pricing options */}
        {hasPricingOptions && (
          <div className="space-y-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">Select an option</p>
            <div className="space-y-2">
              {item.pricingOptions!.map((opt: any) => {
                const isSelected = selectedOptionId === opt.id;
                const optPrice = `$${(opt.price / 100).toFixed(2)}`;
                const billingLabel = opt.billingCycle && opt.billingCycle !== 'One-Time'
                  ? `/${opt.billingCycle.toLowerCase()}`
                  : '';
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    data-testid={`pricing-option-${opt.id}`}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-white">{opt.name}</span>
                      {opt.savingsNote && (
                        <span className="ml-2 text-xs text-green-400">{opt.savingsNote}</span>
                      )}
                      {opt.comparePrice && (
                        <span className="ml-2 text-xs text-white/40 line-through">${(opt.comparePrice / 100).toFixed(2)}</span>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${isSelected ? 'text-red-400' : 'text-white'}`}>
                      {optPrice}{billingLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-3 pt-2">
          <span className="text-2xl font-bold text-white">{displayedPrice}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { onClose(); onPurchase(item, selectedOption || undefined); }}
              data-testid={`button-buy-${item.id}`}
            >
              <ShoppingBag className="h-4 w-4 mr-1" />
              Buy Now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TryoutEnrollmentDialog({
  program,
  children,
  onClose,
  onConfirm,
  isLoading,
  error,
  onClearError,
}: {
  program: Program | null;
  children: ChildPlayer[];
  onClose: () => void;
  onConfirm: (programId: string, playerId: string, recommendedTeamId?: number) => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [recommendedTeam, setRecommendedTeam] = useState<any | null>(null);
  const [matchingTeams, setMatchingTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isFallbackMatch, setIsFallbackMatch] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const { data: programTeams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams', { programId: program?.id }],
    queryFn: async () => {
      if (!program?.id) return [];
      const res = await fetch(`/api/teams?programId=${program.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!program?.id,
  });

  const { data: playerProfiles = [] } = useQuery<any[]>({
    queryKey: ['/api/account/players'],
    enabled: !!program,
  });

  useEffect(() => {
    if (!selectedPlayer || !program) {
      setRecommendedTeam(null);
      setMatchingTeams([]);
      setSelectedTeamId("");
      setIsFallbackMatch(false);
      return;
    }
    setLoadingTeam(true);
    const player = playerProfiles.find((p: any) => p.id === selectedPlayer);
    if (!player || programTeams.length === 0) {
      setRecommendedTeam(null);
      setMatchingTeams([]);
      setSelectedTeamId("");
      setIsFallbackMatch(false);
      setLoadingTeam(false);
      return;
    }

    // Calculate player age
    let playerAge: number | null = null;
    if (player.dateOfBirth) {
      const dob = new Date(player.dateOfBirth);
      const today = new Date();
      playerAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) playerAge--;
    }

    const skillLevel = player.skillLevel;

    // Per-team: use explicit minAge/maxAge if set, otherwise fall back to division-string parsing
    const currentYear = new Date().getFullYear();

    const getAgeInRangeFromString = (team: any): boolean => {
      if (playerAge === null) return true;
      const divisionStr = (team.division || team.name || '');
      const uMatch = divisionStr.match(/U(\d+)/i);
      if (uMatch) {
        const maxAge = parseInt(uMatch[1]);
        return playerAge <= maxAge;
      }
      const rangeMatch = divisionStr.match(/^(\d{1,2})[^\d]+(\d{1,2})$/);
      if (rangeMatch) {
        return playerAge >= parseInt(rangeMatch[1]) && playerAge <= parseInt(rangeMatch[2]);
      }
      const birthYearMatch = divisionStr.match(/(\d{4})[^\d]+(\d{4})/);
      if (birthYearMatch) {
        const playerBirthYear = currentYear - playerAge;
        const minYear = Math.min(parseInt(birthYearMatch[1]), parseInt(birthYearMatch[2]));
        const maxYear = Math.max(parseInt(birthYearMatch[1]), parseInt(birthYearMatch[2]));
        return playerBirthYear >= minYear && playerBirthYear <= maxYear;
      }
      return true; // No parseable range — treat as in-range (no constraint)
    };

    const getAgeInRange = (team: any): boolean => {
      const hasExplicitRange = team.minAge != null || team.maxAge != null;
      if (hasExplicitRange) {
        if (playerAge === null) return true;
        return (team.minAge == null || playerAge >= team.minAge) &&
               (team.maxAge == null || playerAge <= team.maxAge);
      }
      return getAgeInRangeFromString(team);
    };

    const getLevelMatch = (team: any): boolean => {
      return !skillLevel || !team.level || team.level.toLowerCase() === skillLevel.toLowerCase();
    };

    const ageAndLevelMatches: any[] = [];
    const ageOnlyMatches: any[] = [];

    programTeams.forEach((team: any) => {
      const ageOk = getAgeInRange(team);
      const levelOk = getLevelMatch(team);
      if (ageOk && levelOk) ageAndLevelMatches.push(team);
      else if (ageOk) ageOnlyMatches.push(team);
    });

    // Determine result: age+level > age-only > all teams (fallback)
    let finalMatches = ageAndLevelMatches.length > 0 ? ageAndLevelMatches : ageOnlyMatches;
    const usedFallback = finalMatches.length === 0;
    if (usedFallback) finalMatches = programTeams;

    const effectiveMatches = finalMatches.length > 0 ? finalMatches : programTeams;
    setMatchingTeams(effectiveMatches);
    setIsFallbackMatch(usedFallback);
    if (effectiveMatches.length === 1) {
      setRecommendedTeam(effectiveMatches[0]);
      setSelectedTeamId(String(effectiveMatches[0].id));
    } else {
      setRecommendedTeam(null);
      setSelectedTeamId("");
    }
    setLoadingTeam(false);
  }, [selectedPlayer, playerProfiles, programTeams, program]);

  useEffect(() => {
    if (program) {
      setSelectedPlayer("");
      setRecommendedTeam(null);
      onClearError();
    }
  }, [program]);

  if (!program) return null;

  const tryoutPriceDisplay = program.tryoutPrice != null
    ? `$${(program.tryoutPrice / 100).toFixed(2)}`
    : 'Free';

  return (
    <Dialog open={!!program} onOpenChange={() => onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Try Out for {program.name}</DialogTitle>
          <DialogDesc className="text-white/60">
            Try out fee: {tryoutPriceDisplay} · 1 credit included
          </DialogDesc>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/70">Select Player</label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-tryout-player">
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

          {selectedPlayer && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">
                {matchingTeams.length > 1 ? 'Select Team' : 'Recommended Team'}
              </div>
              {loadingTeam ? (
                <div className="flex items-center gap-2 text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Finding best team...</span>
                </div>
              ) : matchingTeams.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-xs text-white/60">
                    {isFallbackMatch
                      ? 'No exact match found — please select a team:'
                      : 'Multiple teams match your player. Please select one:'}
                  </p>
                  {isFallbackMatch && (
                    <div className="text-xs text-yellow-400/70">No teams matched your player's age or skill level exactly.</div>
                  )}
                  <Select
                    value={selectedTeamId}
                    onValueChange={val => {
                      setSelectedTeamId(val);
                      setRecommendedTeam(matchingTeams.find((t: any) => String(t.id) === val) || null);
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingTeams.map((team: any) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          {team.name}{team.division ? ` (${team.division})` : ''}{team.level ? ` · ${team.level.charAt(0).toUpperCase() + team.level.slice(1)}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : recommendedTeam ? (
                <div>
                  <div className="font-semibold text-white">{recommendedTeam.name}</div>
                  {recommendedTeam.division && (
                    <div className="text-xs text-white/50 mt-0.5">Division: {recommendedTeam.division}</div>
                  )}
                  {recommendedTeam.level && (
                    <div className="text-xs text-white/50">Level: {recommendedTeam.level.charAt(0).toUpperCase() + recommendedTeam.level.slice(1)}</div>
                  )}
                  {isFallbackMatch && (
                    <div className="text-xs text-yellow-400/70 mt-1">No exact match found — showing all teams.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/50">No specific team recommended. A coach will contact you.</div>
              )}
            </div>
          )}
        </div>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/20" data-testid="alert-tryout-error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-white/90">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => {
              if (selectedPlayer) {
                onConfirm(program.id, selectedPlayer, recommendedTeam?.id);
              }
            }}
            disabled={isLoading || !selectedPlayer || (matchingTeams.length > 1 && !recommendedTeam)}
            data-testid="button-confirm-tryout"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Pay {tryoutPriceDisplay} to Try Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentDialog({ 
  program, 
  children, 
  storeItems,
  onClose, 
  onConfirm,
  onConfirmWithAddOns,
  isLoading,
  onCouponApplied,
  appliedCoupon,
  error,
  onClearError,
}: { 
  program: Program | null; 
  children: ChildPlayer[];
  storeItems: Program[];
  onClose: () => void; 
  onConfirm: (playerId: string | null) => void;
  onConfirmWithAddOns: (playerId: string | null, addOnIds: string[]) => void;
  isLoading: boolean;
  onCouponApplied: (coupon: { id: number; code: string; discountType: string; discountValue: number } | null) => void;
  appliedCoupon: { id: number; code: string; discountType: string; discountValue: number } | null;
  error: string | null;
  onClearError: () => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [suggestedAddOnIds, setSuggestedAddOnIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const isPerFamily = program?.billingModel === 'Per Family';
  
  const { data: suggestedAddOns = [] } = useQuery<SuggestedAddOn[]>({
    queryKey: ["/api/programs", program?.id, "suggested-add-ons"],
    queryFn: async () => {
      if (!program?.id) return [];
      const res = await fetch(`/api/programs/${program.id}/suggested-add-ons`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!program?.id,
  });
  
  useEffect(() => {
    setSuggestedAddOnIds(suggestedAddOns.map(s => s.productId));
  }, [suggestedAddOns]);
  
  useEffect(() => {
    if (program) {
      setCurrentStep(1);
      setSelectedAddOns([]);
      setSelectedPlayer("");
      setCouponCode("");
      setCouponError("");
      onCouponApplied(null);
    }
  }, [program]);
  
  if (!program) return null;
  
  const hasSuggestedAddOns = suggestedAddOnIds.length > 0;
  
  const sortedStoreItems = useMemo(() => {
    if (!hasSuggestedAddOns) return storeItems;
    
    const suggested: Program[] = [];
    const others: Program[] = [];
    
    for (const item of storeItems) {
      if (suggestedAddOnIds.includes(item.id)) {
        suggested.push(item);
      } else {
        others.push(item);
      }
    }
    
    const addOnOrderMap = new Map(suggestedAddOns.map(s => [s.productId, s.displayOrder]));
    suggested.sort((a, b) => (addOnOrderMap.get(a.id) || 0) - (addOnOrderMap.get(b.id) || 0));
    
    return [...suggested, ...others];
  }, [storeItems, suggestedAddOnIds, suggestedAddOns, hasSuggestedAddOns]);
  
  const handleNext = () => {
    onClearError();
    if (hasSuggestedAddOns && storeItems.length > 0) {
      setCurrentStep(2);
    } else {
      onConfirm(isPerFamily ? null : selectedPlayer);
    }
  };
  
  const handleConfirmWithAddOns = () => {
    onClearError();
    onConfirmWithAddOns(isPerFamily ? null : selectedPlayer, selectedAddOns);
  };
  
  const toggleAddOn = (productId: string) => {
    setSelectedAddOns(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };
  
  const calculateTotal = () => {
    let total = program.price || 0;
    for (const addOnId of selectedAddOns) {
      const addOn = sortedStoreItems.find(s => s.id === addOnId);
      if (addOn?.price) total += addOn.price;
    }
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        total = total - Math.round(total * appliedCoupon.discountValue / 100);
      } else {
        total = total - appliedCoupon.discountValue;
      }
      if (total < 0) total = 0;
    }
    return total;
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), programId: program.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon');
        onCouponApplied(null);
      } else {
        onCouponApplied(data.coupon);
        setCouponError("");
      }
    } catch {
      setCouponError("Failed to validate coupon");
      onCouponApplied(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <Dialog open={!!program} onOpenChange={() => onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === 1 ? `Enroll in ${program.name}` : "Complete Your Order"}
          </DialogTitle>
          <DialogDesc className="text-white/60">
            {currentStep === 1 ? (
              program.type === 'Subscription' && program.billingCycle && program.billingCycle !== 'One-Time' && program.billingCycle !== 'One-time'
                ? `Subscribe for $${program.price ? (program.price / 100).toFixed(2) : '0'}/${program.billingCycle.toLowerCase()} · Cancel anytime`
                : (program.type === 'Subscription' || program.pricingOptions?.some((o: any) => o.optionType === 'subscription' || (o.billingCycle && o.billingCycle !== 'One-Time' && o.billingCycle !== 'One-time')))
                  ? `Subscription · Multiple payment options available`
                  : program.durationDays
                    ? `Prepaid access · $${program.price ? (program.price / 100).toFixed(2) : '0'}`
                    : `One-time purchase · $${program.price ? (program.price / 100).toFixed(2) : '0'}`
            ) : (
              "Add gear and equipment to your order"
            )}
          </DialogDesc>
        </DialogHeader>

        {currentStep === 1 && (
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
        )}
        
        {currentStep === 2 && (
          <div className="py-4 space-y-4 max-h-80 overflow-y-auto">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="font-medium">{program.name}</span>
                </div>
                <span className="font-semibold">${(program.price || 0) / 100}</span>
              </div>
            </div>
            
            {suggestedAddOnIds.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Recommended for You</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {sortedStoreItems.map((item) => {
                const isSuggested = suggestedAddOnIds.includes(item.id);
                const isSelected = selectedAddOns.includes(item.id);
                
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-red-500/20 border-red-500/50" 
                        : isSuggested 
                          ? "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => toggleAddOn(item.id)}
                    data-testid={`addon-${item.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? "bg-red-500 border-red-500" 
                            : "border-white/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            {isSuggested && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                Suggested
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold">${(item.price || 0) / 100}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {selectedAddOns.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">${(calculateTotal() / 100).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          <label className="text-xs text-white/50">Have a coupon code?</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              placeholder="Enter code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
              disabled={!!appliedCoupon}
            />
            {appliedCoupon ? (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  onCouponApplied(null);
                  setCouponCode("");
                  setCouponError("");
                }}
              >
                Remove
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
              </Button>
            )}
          </div>
          {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
          {appliedCoupon && (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">
                {appliedCoupon.discountType === 'percentage'
                  ? `${appliedCoupon.discountValue}% discount applied`
                  : `$${(appliedCoupon.discountValue / 100).toFixed(2)} discount applied`}
              </span>
            </div>
          )}
        </div>

        {error && (
          <Alert className="bg-red-500/10 border-red-500/20" data-testid="alert-payment-error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-white/90">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          {currentStep === 2 && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(1)} 
              className="border-white/20 text-white hover:bg-white/10"
            >
              Back
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          
          {currentStep === 1 && (
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleNext}
              disabled={isLoading || (!isPerFamily && !selectedPlayer)}
              data-testid="button-next-enrollment"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {hasSuggestedAddOns && storeItems.length > 0 ? "Next" : "Proceed to Payment"}
              {hasSuggestedAddOns && storeItems.length > 0 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmWithAddOns}
              disabled={isLoading}
              data-testid="button-confirm-enrollment"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedAddOns.length > 0 
                ? `Pay $${(calculateTotal() / 100).toFixed(2)}`
                : "Skip Add-ons"
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedTryoutProgram, setSelectedTryoutProgram] = useState<Program | null>(null);
  const [selectedStoreItem, setSelectedStoreItem] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'programs' | 'store'>('programs');
  const hasUserSelectedTab = useRef(false);
  const [progFilter, setProgFilter] = useState<string>("All");
  const [storeFilter, setStoreFilter] = useState<string>("All");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: number; code: string; discountType: string; discountValue: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
          queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
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

  const programs = allProducts.filter(p => (!p.productCategory || p.productCategory === 'service') && p.isActive !== false);
  const storeItems = allProducts.filter(p => p.productCategory === 'goods' && p.isActive !== false);
  
  const enrolledProgramIds = new Set(enrollments.filter(e => e.status === 'active').map(e => e.programId));
  const hasActiveEnrollments = enrolledProgramIds.size > 0;

  // Smart default tab: Store if already enrolled, Programs otherwise
  // Only runs once on initial data load; user tab selection takes priority afterward
  useEffect(() => {
    if (!enrollmentsLoading && !productsLoading && !hasUserSelectedTab.current) {
      setActiveTab(hasActiveEnrollments ? 'store' : 'programs');
    }
  }, [enrollmentsLoading, productsLoading]);

  // Category filter helpers
  const programCategories = useMemo(() => {
    const cats = [...new Set(programs.map(p => p.displayCategory || 'general'))].filter(c => c !== 'general');
    return ['All', ...cats];
  }, [programs]);

  const storeCategories = useMemo(() => {
    const cats = [...new Set(storeItems.map(p => p.displayCategory || 'general'))].filter(c => c !== 'general');
    return ['All', ...cats];
  }, [storeItems]);

  const filteredPrograms = useMemo(() => {
    if (progFilter === 'All') return programs;
    return programs.filter(p => (p.displayCategory || 'general') === progFilter);
  }, [programs, progFilter]);

  const filteredStore = useMemo(() => {
    if (storeFilter === 'All') return storeItems;
    return storeItems.filter(p => (p.displayCategory || 'general') === storeFilter);
  }, [storeItems, storeFilter]);

  const getCatCount = (items: Program[], cat: string) => {
    if (cat === 'All') return items.length;
    return items.filter(p => (p.displayCategory || 'general') === cat).length;
  };

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
          couponCode: appliedCoupon?.code || undefined,
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }
      const data = await response.json();
      if (data.sessionUrl) window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };
  
  const handleEnrollWithAddOns = async (playerId: string | null, addOnIds: string[]) => {
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
          addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
          couponCode: appliedCoupon?.code || undefined,
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }
      const data = await response.json();
      if (data.sessionUrl) window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handlePurchaseItem = async (item: Program, selectedOption?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: item.id,
          ...(selectedOption ? { selectedPricingOptionId: selectedOption.id } : {}),
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }
      const data = await response.json();
      if (data.sessionUrl) window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleTryoutCheckout = async (programId: string, playerId: string, recommendedTeamId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/payments/create-tryout-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          playerId,
          recommendedTeamId,
          successUrl: `${window.location.origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/payments?canceled=true`,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tryout checkout');
      }
      const data = await response.json();
      if (data.sessionUrl) window.location.href = data.sessionUrl;
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
      {/* Header + Tabs */}
      <div className="bg-black/50 border-b border-white/10 px-4 md:px-8 pt-6 pb-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Programs & Store</h1>
              <p className="text-white/50 text-sm mt-0.5">Browse programs, tryouts, and gear for your player.</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.reload()}
              className="text-white/40 hover:text-white hover:bg-white/10 mt-1"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 mt-4">
            {[
              { key: 'programs' as const, label: 'Programs', count: programs.length },
              { key: 'store' as const, label: 'Store', count: storeItems.length },
            ].map(t => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { hasUserSelectedTab.current = true; setActiveTab(t.key); }}
                  data-testid={`tab-${t.key}`}
                  className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                    active
                      ? 'text-red-400 border-red-500'
                      : 'text-white/50 border-transparent hover:text-white/80'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full align-middle ${
                    active ? 'bg-red-600 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
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
        {error && !selectedProgram && (
          <Alert className="bg-red-500/10 border-red-500/20" data-testid="alert-payment-error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-white/90">{error}</AlertDescription>
          </Alert>
        )}

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            {/* Category filter pills */}
            {programCategories.length > 1 && (
              <div className="flex flex-wrap gap-2" data-testid="programs-category-filter">
                {programCategories.map(cat => {
                  const count = getCatCount(programs, cat);
                  const active = progFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setProgFilter(cat)}
                      data-testid={`filter-prog-${cat}`}
                      className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-all ${
                        active
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {cat}
                      <span className="ml-1.5 opacity-60 text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredPrograms.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No programs in this category</p>
                <button onClick={() => setProgFilter('All')} className="mt-3 text-sm text-red-400 hover:underline">Show all</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrograms.map(program => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onEnroll={(p) => setSelectedProgram(p)}
                    onTryout={(p) => setSelectedTryoutProgram(p)}
                    isEnrolled={enrolledProgramIds.has(program.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Store Tab */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            {/* Category filter pills */}
            {storeCategories.length > 1 && (
              <div className="flex flex-wrap gap-2" data-testid="store-category-filter">
                {storeCategories.map(cat => {
                  const count = getCatCount(storeItems, cat);
                  const active = storeFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setStoreFilter(cat)}
                      data-testid={`filter-store-${cat}`}
                      className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-all ${
                        active
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {cat}
                      <span className="ml-1.5 opacity-60 text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {storeItems.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No store items available at this time</p>
              </div>
            ) : filteredStore.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <ShoppingBag className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No items in this category</p>
                <button onClick={() => setStoreFilter('All')} className="mt-3 text-sm text-red-400 hover:underline">Show all</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredStore.map(item => (
                  <StoreItemCard
                    key={item.id}
                    item={item}
                    onClick={(i) => setSelectedStoreItem(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment History – secondary section always visible at bottom */}
        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            data-testid="toggle-history"
          >
            <History className="h-4 w-4" />
            Payment History
            <ChevronRight className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>

          {showHistory && (
            <div className="mt-4">
              <BillingHistorySection payments={payments} programs={allProducts} />
            </div>
          )}
        </div>
      </div>

      {/* Store Item Carousel Dialog */}
      <StoreItemDialog
        item={selectedStoreItem}
        onClose={() => setSelectedStoreItem(null)}
        onPurchase={handlePurchaseItem}
      />

      {/* Tryout Enrollment Dialog */}
      <TryoutEnrollmentDialog
        program={selectedTryoutProgram}
        children={children}
        onClose={() => { setSelectedTryoutProgram(null); setError(null); }}
        onConfirm={handleTryoutCheckout}
        isLoading={loading}
        error={error}
        onClearError={() => setError(null)}
      />

      {/* Enrollment Dialog */}
      <EnrollmentDialog
        program={selectedProgram}
        children={children}
        storeItems={storeItems}
        onClose={() => { setSelectedProgram(null); setAppliedCoupon(null); setError(null); }}
        onConfirm={handleEnroll}
        onConfirmWithAddOns={handleEnrollWithAddOns}
        isLoading={loading}
        onCouponApplied={setAppliedCoupon}
        appliedCoupon={appliedCoupon}
        error={error}
        onClearError={() => setError(null)}
      />
    </div>
  );
}
