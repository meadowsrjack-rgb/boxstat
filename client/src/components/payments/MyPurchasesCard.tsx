import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle } from "lucide-react";
import { PRODUCTS } from "@/pages/payments";

export type PurchaseStatus = {
  productId: string;            // e.g. "skills-academy"
  status: "active" | "pending" | "expired";
  purchasedAt?: string;         // ISO
  expiresAt?: string;           // ISO
};

export default function MyPurchasesCard() {
  const { data, isLoading, error } = useQuery<PurchaseStatus[]>({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/me");
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
  });

  return (
    <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
      <CardHeader>
        <CardTitle className="text-white">My Purchases</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-white/60">Loading...</p>}
        {error && <p className="text-sm text-red-400">Unable to load purchases.</p>}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRODUCTS.map(p => {
              const rec = data?.find(d => d.productId === p.id);
              const status = rec?.status ?? "pending";
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                  <div>
                    <div className="text-sm font-medium text-white">{p.label}</div>
                    <div className="text-xs text-white/60">
                      {rec?.purchasedAt ? new Date(rec.purchasedAt).toLocaleDateString() : "—"}
                      {rec?.expiresAt ? ` • Expires ${new Date(rec.expiresAt).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Badge variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"} className="gap-1">
                    {status === "active" && <Check className="h-3 w-3"/>}
                    {status === "pending" && <Clock className="h-3 w-3"/>}
                    {status === "expired" && <AlertCircle className="h-3 w-3"/>}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}