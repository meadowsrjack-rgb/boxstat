import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Clock, AlertCircle, Package, Users, ShoppingBag, CreditCard, Repeat, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  type?: string;
  billingCycle?: string;
  billingModel?: string;
  accessTag?: string;
  sessionCount?: number;
  productCategory?: string;
  inventorySizes?: string[];
  inventoryCount?: number;
  shippingRequired?: boolean;
  isActive?: boolean;
};

export type PurchaseStatus = {
  productId: string;
  status: "active" | "pending" | "expired";
  purchasedAt?: string;
  expiresAt?: string;
};

// Format price in dollars
const formatPrice = (cents?: number) => {
  if (!cents) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
};

// Get type badge styles
const getTypeBadgeStyle = (type?: string) => {
  switch (type) {
    case "Subscription":
      return "bg-blue-600/20 text-blue-400 border-blue-500/30";
    case "Pack":
      return "bg-purple-600/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-green-600/20 text-green-400 border-green-500/30";
  }
};

// Programs Section Component
function ProgramsSection({ 
  programs, 
  purchases, 
  onPurchase, 
  loadingProductId 
}: { 
  programs: Product[]; 
  purchases: PurchaseStatus[];
  onPurchase: (productId: string, productCategory: string) => void;
  loadingProductId: string | null;
}) {
  if (programs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white">
        <Users className="h-5 w-5" />
        <h3 className="font-semibold">Programs & Memberships</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {programs.map((program) => {
          const rec = purchases?.find(p => p.productId === program.id);
          const status = rec?.status;
          const isLoading = loadingProductId === program.id;
          
          return (
            <div 
              key={program.id} 
              className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors" 
              data-testid={`product-program-${program.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white" data-testid={`text-program-name-${program.id}`}>
                      {program.name}
                    </span>
                    <Badge variant="outline" className={getTypeBadgeStyle(program.type)}>
                      {program.type === "Subscription" && <Repeat className="h-3 w-3 mr-1" />}
                      {program.type || "One-Time"}
                    </Badge>
                  </div>
                  {program.description && (
                    <p className="text-xs text-white/60 mt-1 line-clamp-2">{program.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                <div>
                  <span className="text-lg font-bold text-white" data-testid={`text-program-price-${program.id}`}>
                    {formatPrice(program.price)}
                  </span>
                  {program.billingCycle && program.type === "Subscription" && (
                    <span className="text-xs text-white/50 ml-1">/{program.billingCycle.toLowerCase()}</span>
                  )}
                  {program.sessionCount && (
                    <span className="text-xs text-white/50 ml-1">({program.sessionCount} credits)</span>
                  )}
                </div>
                
                {status ? (
                  <Badge 
                    variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"} 
                    className="gap-1"
                    data-testid={`badge-program-status-${program.id}`}
                  >
                    {status === "active" && <Check className="h-3 w-3"/>}
                    {status === "pending" && <Clock className="h-3 w-3"/>}
                    {status === "expired" && <AlertCircle className="h-3 w-3"/>}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-white border-white/20 hover:bg-white/10"
                    onClick={() => onPurchase(program.id, 'service')}
                    disabled={isLoading}
                    data-testid={`button-enroll-${program.id}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-3 w-3 mr-1" />
                        Enroll
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Store/Merchandise Section Component
function StoreSection({ 
  products, 
  purchases, 
  onPurchase, 
  loadingProductId 
}: { 
  products: Product[]; 
  purchases: PurchaseStatus[];
  onPurchase: (productId: string, productCategory: string) => void;
  loadingProductId: string | null;
}) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white">
        <ShoppingBag className="h-5 w-5" />
        <h3 className="font-semibold">Merchandise & Gear</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product) => {
          const rec = purchases?.find(p => p.productId === product.id);
          const status = rec?.status;
          const inStock = product.inventoryCount === undefined || product.inventoryCount === null || product.inventoryCount > 0;
          const isLoading = loadingProductId === product.id;

          return (
            <div 
              key={product.id} 
              className="flex flex-col rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors" 
              data-testid={`product-store-${product.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <span className="font-medium text-white" data-testid={`text-store-name-${product.id}`}>
                    {product.name}
                  </span>
                  {product.description && (
                    <p className="text-xs text-white/60 mt-1 line-clamp-2">{product.description}</p>
                  )}
                </div>
              </div>

              {/* Sizes */}
              {product.inventorySizes && product.inventorySizes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.inventorySizes.map((size) => (
                    <Badge key={size} variant="outline" className="text-xs bg-white/5 text-white/70">
                      {size}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white" data-testid={`text-store-price-${product.id}`}>
                    {formatPrice(product.price)}
                  </span>
                  {!inStock && (
                    <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                  )}
                </div>
                
                {status ? (
                  <Badge 
                    variant={status === "active" ? "default" : "secondary"} 
                    className="gap-1"
                    data-testid={`badge-store-status-${product.id}`}
                  >
                    <Check className="h-3 w-3"/>
                    Purchased
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-white border-white/20 hover:bg-white/10"
                    disabled={!inStock || isLoading}
                    onClick={() => onPurchase(product.id, 'goods')}
                    data-testid={`button-buy-${product.id}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        {inStock ? "Buy" : "Unavailable"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyPurchasesCard() {
  const { toast } = useToast();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  // Fetch all products from database
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch purchase status
  const { data: purchases = [], isLoading: purchasesLoading, error } = useQuery<PurchaseStatus[]>({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/me");
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
  });

  const isLoading = productsLoading || purchasesLoading;

  // Filter active products by category
  const activeProducts = allProducts.filter(p => p.isActive !== false);
  const programs = activeProducts.filter(p => !p.productCategory || p.productCategory === 'service');
  const storeItems = activeProducts.filter(p => p.productCategory === 'goods');

  // Handle purchase - creates a checkout session for the selected product
  const handlePurchase = async (productId: string, productCategory: string) => {
    try {
      setLoadingProductId(productId);
      
      const response = await fetch('/api/payments/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          productCategory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No session URL returned');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      toast({
        title: "Purchase failed",
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: "destructive",
      });
      setLoadingProductId(null);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]" data-testid="card-my-purchases">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-white" />
          <div>
            <CardTitle className="text-white">Available Products</CardTitle>
            <CardDescription className="text-white/60">
              Browse programs and merchandise available for purchase
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full" />
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-400 text-center py-4" data-testid="text-error">
            Unable to load purchase information.
          </p>
        )}
        
        {!isLoading && !error && (
          <>
            {programs.length === 0 && storeItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/50">No products available at this time.</p>
              </div>
            ) : (
              <>
                <ProgramsSection 
                  programs={programs} 
                  purchases={purchases} 
                  onPurchase={handlePurchase}
                  loadingProductId={loadingProductId}
                />
                <StoreSection 
                  products={storeItems} 
                  purchases={purchases}
                  onPurchase={handlePurchase}
                  loadingProductId={loadingProductId}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Export for backward compatibility
export const PRODUCTS = [] as const;
export type ProductId = string;
