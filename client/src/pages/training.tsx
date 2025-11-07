import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Lock, 
  Star, 
  Clock, 
  Users, 
  CheckCircle,
  DollarSign,
  Trophy,
  Target
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

interface TrainingProgram {
  id: number;
  title: string;
  description: string;
  previewVideoUrl: string;
  monthlyPrice: number;
  annualPrice: number;
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  totalVideos: number;
  category: string;
}

const trainingPrograms: TrainingProgram[] = [
  {
    id: 1,
    title: "Elite Ball Handling",
    description: "Master advanced dribbling techniques and ball control skills used by professional players. Perfect for players looking to improve their handles and court vision.",
    previewVideoUrl: "https://player.vimeo.com/video/example1",
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    duration: "8 weeks",
    difficulty: "Advanced",
    totalVideos: 24,
    category: "Skills Development"
  },
  {
    id: 2,
    title: "Advanced Shooting Techniques",
    description: "Develop consistent shooting form and accuracy from all areas of the court. Includes drills for catch-and-shoot, off-the-dribble, and contested shots.",
    previewVideoUrl: "https://player.vimeo.com/video/example2",
    monthlyPrice: 24.99,
    annualPrice: 249.99,
    duration: "10 weeks",
    difficulty: "Intermediate",
    totalVideos: 30,
    category: "Shooting"
  },
  {
    id: 3,
    title: "Vertical Jump Program",
    description: "Increase your vertical leap and explosiveness with scientifically-proven training methods. Includes strength training and plyometric exercises.",
    previewVideoUrl: "https://player.vimeo.com/video/example3",
    monthlyPrice: 29.99,
    annualPrice: 299.99,
    duration: "12 weeks",
    difficulty: "Advanced",
    totalVideos: 36,
    category: "Athletic Performance"
  },
  {
    id: 4,
    title: "Youth Fundamentals",
    description: "Perfect for young players starting their basketball journey. Covers basic dribbling, shooting, and defensive fundamentals in an age-appropriate way.",
    previewVideoUrl: "https://player.vimeo.com/video/example4",
    monthlyPrice: 14.99,
    annualPrice: 149.99,
    duration: "6 weeks",
    difficulty: "Beginner",
    totalVideos: 18,
    category: "Fundamentals"
  }
];

export default function Training() {
  const { user } = useAuth();
  // Temporarily use URL parameter for mode detection
  const urlParams = new URLSearchParams(window.location.search);
  const currentMode = urlParams.get('mode') === 'player' ? 'player' : 'parent';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'annual'>('monthly');

  const { data: userSubscriptions } = useQuery({
    queryKey: ["/api/users", user?.id, "subscriptions"],
    enabled: !!user?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: { programId: number; type: 'monthly' | 'annual' }) => {
      const program = trainingPrograms.find(p => p.id === data.programId);
      if (!program) throw new Error("Program not found");
      
      const amount = data.type === 'monthly' ? program.monthlyPrice : program.annualPrice;
      
      return await apiRequest("POST", "/api/payments/sportsengine/create", {
        type: "training_subscription",
        amount,
        description: `${program.title} - ${data.type} subscription`,
        metadata: {
          programId: data.programId,
          subscriptionType: data.type
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Initiated",
        description: "Redirecting to SportsEngine payment...",
      });
      // Redirect to SportsEngine payment flow
      window.location.href = `/payment/training/${selectedProgram?.id}?type=${subscriptionType}`;
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubscribed = (programId: number) => {
    return userSubscriptions?.some((sub: any) => 
      sub.programId === programId && sub.status === 'active'
    );
  };

  const handleSubscribe = (program: TrainingProgram, type: 'monthly' | 'annual') => {
    setSelectedProgram(program);
    setSubscriptionType(type);
    subscribeMutation.mutate({ programId: program.id, type });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="BoxStat Academy" 
                className="h-10 w-10 mr-3 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">BoxStat Academy</h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {currentMode === 'player' ? 'Your Training Programs' : 'Premium Training Programs'}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {currentMode === 'player' 
              ? 'Practice and improve your basketball skills with these training videos assigned to you.'
              : 'Take your game to the next level with our professional training programs. Learn from expert coaches and improve your skills with structured, progressive training.'
            }
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {trainingPrograms.map((program) => (
            <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative">
                  <div className="aspect-video bg-gray-900 flex items-center justify-center">
                    <iframe
                      src={program.previewVideoUrl}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant={program.difficulty === 'Beginner' ? 'default' : 
                                   program.difficulty === 'Intermediate' ? 'secondary' : 'destructive'}>
                      {program.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl">{program.title}</CardTitle>
                  {isSubscribed(program.id) && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Subscribed
                    </Badge>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{program.description}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {program.duration}
                  </div>
                  <div className="flex items-center">
                    <Play className="h-4 w-4 mr-1" />
                    {program.totalVideos} videos
                  </div>
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-1" />
                    {program.category}
                  </div>
                </div>

{currentMode === 'player' ? (
                  // Player mode: Only show purchased content, no pricing
                  isSubscribed(program.id) ? (
                    <Button 
                      className="w-full"
                      onClick={() => setLocation(`/training/${program.id}`)}
                    >
                      Continue Training
                    </Button>
                  ) : (
                    <div className="p-3 bg-gray-100 rounded-lg text-center">
                      <Lock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Ask your parent to unlock this training program
                      </p>
                    </div>
                  )
                ) : (
                  // Parent mode: Show full pricing and subscription options
                  isSubscribed(program.id) ? (
                    <Button 
                      className="w-full"
                      onClick={() => setLocation(`/training/${program.id}`)}
                    >
                      Access Training
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Subscription Options:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => handleSubscribe(program, 'monthly')}
                          disabled={subscribeMutation.isPending}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          ${program.monthlyPrice}/month
                        </Button>
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => handleSubscribe(program, 'annual')}
                          disabled={subscribeMutation.isPending}
                        >
                          <Trophy className="h-4 w-4 mr-1" />
                          ${program.annualPrice}/year
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Save ${(program.monthlyPrice * 12 - program.annualPrice).toFixed(2)} with annual plan
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}