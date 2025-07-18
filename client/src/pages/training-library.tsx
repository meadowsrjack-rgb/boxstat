import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen,
  ArrowLeft,
  Trophy
} from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  completed: boolean;
  order: number;
}

interface UserProgram {
  id: number;
  title: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  modules: TrainingModule[];
}

export default function TrainingLibrary() {
  const { user } = useAuth();
  // Temporarily use URL parameter for mode detection  
  const urlParams = new URLSearchParams(window.location.search);
  const currentMode = urlParams.get('mode') === 'player' ? 'player' : 'parent';
  const [, setLocation] = useLocation();
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  const { data: userPrograms } = useQuery({
    queryKey: ["/api/users", user?.id, "training-programs"],
    enabled: !!user?.id,
  });

  const mockPrograms: UserProgram[] = [
    {
      id: 1,
      title: "Elite Ball Handling",
      progress: 65,
      totalModules: 8,
      completedModules: 5,
      modules: [
        {
          id: 1,
          title: "Basic Dribbling Foundation",
          description: "Master the fundamental dribbling techniques",
          videoUrl: "https://player.vimeo.com/video/example1",
          duration: "12:30",
          completed: true,
          order: 1
        },
        {
          id: 2,
          title: "Advanced Crossover Moves",
          description: "Learn professional crossover techniques",
          videoUrl: "https://player.vimeo.com/video/example2",
          duration: "15:45",
          completed: true,
          order: 2
        },
        {
          id: 3,
          title: "Behind-the-Back Dribbling",
          description: "Master behind-the-back moves in game situations",
          videoUrl: "https://player.vimeo.com/video/example3",
          duration: "18:20",
          completed: false,
          order: 3
        }
      ]
    }
  ];

  const programs = userPrograms || mockPrograms;

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
                alt="UYP Basketball Academy" 
                className="h-10 w-10 mr-3 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">My Training Library</h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/training')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {programs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Programs Yet</h3>
            <p className="text-gray-500 mb-4">
              {currentMode === 'player' 
                ? 'Ask your parent to add training programs for you to practice and improve your skills.'
                : 'Subscribe to training programs to access exclusive content and improve your skills.'
              }
            </p>
            {currentMode === 'parent' && (
              <Button onClick={() => setLocation('/training')}>
                Browse Training Programs
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {programs.map((program) => (
              <Card key={program.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{program.title}</CardTitle>
                      <p className="text-gray-600 mt-1">
                        {program.completedModules} of {program.totalModules} modules completed
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center mb-2">
                        <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                        <span className="text-lg font-bold">{program.progress}%</span>
                      </div>
                      <Progress value={program.progress} className="w-32" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-4">
                    {program.modules.map((module) => (
                      <div
                        key={module.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          module.completed
                            ? 'bg-green-50 border-green-200 hover:border-green-300'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedModule(module)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              module.completed ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {module.completed ? (
                                <CheckCircle className="h-4 w-4 text-white" />
                              ) : (
                                <Play className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{module.title}</h4>
                              <p className="text-sm text-gray-500">{module.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {module.duration}
                            </Badge>
                            <Button
                              size="sm"
                              variant={module.completed ? "secondary" : "default"}
                            >
                              {module.completed ? "Rewatch" : "Watch"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Video Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">{selectedModule.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedModule(null)}
              >
                ×
              </Button>
            </div>
            <div className="aspect-video">
              <iframe
                src={selectedModule.videoUrl}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">{selectedModule.description}</p>
              <div className="flex justify-between items-center">
                <Badge variant="secondary" className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedModule.duration}
                </Badge>
                <Button
                  onClick={() => {
                    // Mark as completed logic here
                    setSelectedModule(null);
                  }}
                  disabled={selectedModule.completed}
                >
                  {selectedModule.completed ? "Completed" : "Mark as Complete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}