import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Info, ArrowLeft } from "lucide-react";

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] animate-pulse delay-500" />
      </div>

      <nav className="fixed z-50 w-full border-b border-white/10 backdrop-blur-xl bg-black/50 top-0 left-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => setLocation("/login")}
          >
            Sign In
          </Button>
        </div>
      </nav>

      <section className="relative z-10 pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Simple, Transparent Pricing
              </span>
            </h2>
            <p className="text-gray-400 text-lg">
              Choose the plan that fits your organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-500 text-sm mb-6">For small trainers, clubs & single programs</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Up to 100 families", "Registration", "Payments", "Schedules", "Messaging", "Basic reporting"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-gray-500">Standard platform & merchant rates apply.</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-gray-900 border border-gray-700">
                      <div className="text-xs space-y-1 text-white">
                        <p className="font-semibold text-white">Transaction Summary</p>
                        <p className="text-gray-200">Merchant Processing: 2.9% + 30¢</p>
                        <p className="text-gray-200">BoxStat Platform Fee: 1.0%</p>
                        <p className="text-gray-400 pt-1">Fees are calculated on the gross transaction total. By default, these are added to the registrant's total at checkout so your organization receives your full list price.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={() => { window.location.href = '/signup?plan=starter'; }}
              >
                Get Started
              </Button>
            </div>

            {/* Growth - Featured */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-500/5 border border-red-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2">Growth</h3>
              <p className="text-gray-500 text-sm mb-6">For clubs, academies, leagues & camps</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$249</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Up to 500 families", "All core features", "Admin dashboard", "Team management", "Payment tracking", "Communication tools", "Analytics", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-gray-400">Standard platform & merchant rates apply.</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-gray-900 border border-gray-700">
                      <div className="text-xs space-y-1 text-white">
                        <p className="font-semibold text-white">Transaction Summary</p>
                        <p className="text-gray-200">Merchant Processing: 2.9% + 30¢</p>
                        <p className="text-gray-200">BoxStat Platform Fee: 1.0%</p>
                        <p className="text-gray-400 pt-1">Fees are calculated on the gross transaction total. By default, these are added to the registrant's total at checkout so your organization receives your full list price.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0"
                onClick={() => { window.location.href = '/signup?plan=growth'; }}
              >
                Get Started
              </Button>
            </div>

            {/* Pro */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-gray-500 text-sm mb-6">For big clubs, multi-team orgs & facilities</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited families", "Advanced analytics", "Multiple admins", "Multi-location", "Automation", "Custom reports", "Priority onboarding"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-gray-500">Standard platform & merchant rates apply.</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-gray-900 border border-gray-700">
                      <div className="text-xs space-y-1 text-white">
                        <p className="font-semibold text-white">Transaction Summary</p>
                        <p className="text-gray-200">Merchant Processing: 2.9% + 30¢</p>
                        <p className="text-gray-200">BoxStat Platform Fee: 0.75%</p>
                        <p className="text-gray-400 pt-1">Fees are calculated on the gross transaction total. By default, these are added to the registrant's total at checkout so your organization receives your full list price.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={() => { window.location.href = '/signup?plan=pro'; }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
