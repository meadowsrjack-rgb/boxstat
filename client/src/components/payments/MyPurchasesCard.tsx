import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle } from "lucide-react";

export const PRODUCTS = [
  { id: "youth-club",        label: "Youth Club",           url: "https://api.leadconnectorhq.com/widget/form/zw8C9v1BasFRUO65I2ox" },
  { id: "skills-academy",    label: "Skills Academy",       url: "https://api.leadconnectorhq.com/widget/form/lcm8WeBVF7Hqk18Xxmoz" },
  { id: "friday-night-hoops",label: "Friday Night Hoops",   url: "https://api.leadconnectorhq.com/widget/form/NRA6ItmRxchrD9MiNApB" },
  { id: "high-school-club",  label: "High School Club",     url: "https://api.leadconnectorhq.com/widget/form/4cxFXqmuOlJrz1LSms8S" },
  { id: "irvine-flight",     label: "Irvine Flight",        url: "https://api.leadconnectorhq.com/widget/form/N3QlzEbYFqg0EEsYr6Tf" },
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"];

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
    <Card data-testid="card-my-purchases">
      <CardHeader>
        <CardTitle>My Purchases</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground" data-testid="text-loading">Loading...</p>}
        {error && <p className="text-sm text-red-600" data-testid="text-error">Unable to load purchases.</p>}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRODUCTS.map(p => {
              const rec = data?.find(d => d.productId === p.id);
              const status = rec?.status ?? "pending";
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3" data-testid={`product-${p.id}`}>
                  <div>
                    <div className="text-sm font-medium" data-testid={`text-product-name-${p.id}`}>{p.label}</div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-product-dates-${p.id}`}>
                      {rec?.purchasedAt ? new Date(rec.purchasedAt).toLocaleDateString() : "—"}
                      {rec?.expiresAt ? ` • Expires ${new Date(rec.expiresAt).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Badge 
                    variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"} 
                    className="gap-1"
                    data-testid={`badge-status-${p.id}`}
                  >
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