import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-xl text-center">
        <p className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-4">Coming soon</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">{title}</h1>
        <p className="text-gray-400 text-lg mb-10">
          {description ?? "We're putting the finishing touches on this page. Check back shortly."}
        </p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </Button>
      </div>
    </div>
  );
}
