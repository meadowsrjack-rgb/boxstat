import { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CreditCard, ExternalLink, UserPlus } from "lucide-react";
import MyPurchasesCard from "@/components/payments/MyPurchasesCard";

// ---- Configure your products here ---- //
export const PRODUCTS = [
  { id: "youth-club",        label: "Youth Club",           url: "https://api.leadconnectorhq.com/widget/form/zw8C9v1BasFRUO65I2ox" },
  { id: "skills-academy",    label: "Skills Academy",       url: "https://api.leadconnectorhq.com/widget/form/lcm8WeBVF7Hqk18Xxmoz" },
  { id: "friday-night-hoops",label: "Friday Night Hoops",   url: "https://api.leadconnectorhq.com/widget/form/NRA6ItmRxchrD9MiNApB" },
  { id: "high-school-club",  label: "High School Club",     url: "https://api.leadconnectorhq.com/widget/form/4cxFXqmuOlJrz1LSms8S" },
  { id: "irvine-flight",     label: "Irvine Flight",        url: "https://api.leadconnectorhq.com/widget/form/N3QlzEbYFqg0EEsYr6Tf" },
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"]; 

function useLastTab(defaultId: ProductId) {
  const key = "uyp:last-payments-tab";
  const [value, setValue] = useState<ProductId>(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(key) as ProductId | null) : null;
    return saved ?? defaultId;
  });
  useEffect(() => { localStorage.setItem(key, value); }, [value]);
  return [value, setValue] as const;
}

function buildSrc(baseUrl: string, prefill: Record<string, string | undefined>) {
  const u = new URL(baseUrl);
  Object.entries(prefill).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
  return u.toString();
}

function LeadConnectorFrame({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [height, setHeight] = useState<number>(1200);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const originOk = typeof e.origin === "string" && e.origin.includes("leadconnectorhq.com");
      if (!originOk) return;
      try {
        const data: any = e.data;
        const h = (typeof data === "number" && data) || data?.height || data?.h || data?.frameHeight || data?.payload?.height;
        if (typeof h === "number" && h > 400 && h < 4000) setHeight(h + 24);
      } catch {}
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="relative w-full">
      {!loaded && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      <iframe
        ref={frameRef}
        title="UYP Payment Form"
        src={src}
        className={`w-full transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: height, border: 0 }}
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        allow="payment *; clipboard-write; autoplay"
        onLoad={() => setLoaded(true)}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Badge variant="secondary" className="hidden md:inline-flex">Secure checkout</Badge>
        <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm hover:underline">
          Open in new tab <ExternalLink className="ml-1 h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function PaymentsTab() {
  const { user } = useAuth();
  const [tab, setTab] = useLastTab(PRODUCTS[0].id);

  // Let parent choose which player they're registering, then pass to LC form via query params
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(undefined);
  const players = (user as any)?.players ?? []; // assume user.players is array from backend
  const selectedPlayer = players.find((p:any) => p.id === selectedPlayerId) ?? players[0];

  const basePrefill = useMemo(() => ({
    email: (user as any)?.email ?? undefined,
    first_name: (user as any)?.firstName ?? undefined,
    last_name: (user as any)?.lastName ?? undefined,
    phone: (user as any)?.phoneNumber ?? undefined,
  }), [user]);

  const playerPrefill = useMemo(() => ({
    // Replace cf_* with your actual LC custom field keys
    cf_player_first: selectedPlayer?.firstName,
    cf_player_last: selectedPlayer?.lastName,
    cf_player_grade: selectedPlayer?.grade,
    cf_player_team: selectedPlayer?.teamName,
    cf_player_dob: selectedPlayer?.dob,
  }), [selectedPlayer]);

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Payments</h1>
            <p className="text-white/70">Register or purchase packages directly inside the app.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/family-onboarding") } className="gap-2 border-white/20 text-white hover:bg-white/10">
              <UserPlus className="h-4 w-4"/> Add/Update Players
            </Button>
            <Button variant="default" className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <CreditCard className="h-4 w-4" /> Checkout
            </Button>
          </div>
        </div>

        <MyPurchasesCard />

        {players.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>Registering player:</span>
            <select
              className="border rounded-md px-2 py-1 bg-white/10 border-white/20 text-white"
              value={selectedPlayerId ?? players[0]?.id}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              {players.map((p:any) => (
                <option key={p.id} value={p.id} className="bg-black text-white">{p.firstName} {p.lastName}{p.teamName ? ` — ${p.teamName}`: ""}</option>
              ))}
            </select>
          </div>
        )}

        <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as ProductId)}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white/10">
                {PRODUCTS.map((p) => (
                  <TabsTrigger key={p.id} value={p.id} className="text-xs md:text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    {p.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {PRODUCTS.map((p) => {
                const src = buildSrc(p.url, { ...basePrefill, ...playerPrefill });
                return (
                  <TabsContent key={p.id} value={p.id} className="mt-4">
                    <LeadConnectorFrame src={src} />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-sm text-white/60">
          <p className="mb-1 font-medium">Tips</p>
          <ul className="list-inside list-disc space-y-1">
            <li>If the form fails to load due to content blockers, use <span className="font-medium">Open in new tab</span> above.</li>
            <li>Add tracking params (e.g., <code>playerId</code>, <code>team</code>) in <code>buildSrc()</code> for analytics.</li>
            <li>Set up the webhook to instantly unlock entitlements after purchase.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}