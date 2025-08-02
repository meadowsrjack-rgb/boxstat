import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus, ChevronRight, User, Calendar, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface Task {
  id: number;
  taskType: 'practice' | 'game' | 'skills' | 'video' | 'homework' | 'bio_complete';
  title: string;
  description?: string;
  pointsValue: number;
  isCompleted: boolean;
  completedAt?: string;
  dueDate?: string;
}

interface TodaySectionProps {
  playerId: string;
}

export function TodaySection({ playerId }: TodaySectionProps) {
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState<{ taskId: number; points: number } | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's tasks
  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/players', playerId, 'tasks', { date: today }],
    queryFn: () => apiRequest(`/api/players/${playerId}/tasks?date=${today}`),
    enabled: !!playerId,
    retry: false,
  });

  // Debug logging
  console.log('TodaySection - playerId:', playerId, 'today:', today, 'isLoading:', isLoading, 'error:', error, 'tasks:', tasks);

  // If authentication fails, show the existing hardcoded tasks for demo
  const hardcodedTasks: Task[] = [
    {
      id: 1,
      taskType: 'bio_complete',
      title: 'Complete Bio',
      description: 'Fill out your complete player profile',
      pointsValue: 10,
      isCompleted: false,
      dueDate: today,
    },
    {
      id: 2,
      taskType: 'practice',
      title: 'Practice',
      description: 'Attend Thunder Wolves 12U practice',
      pointsValue: 10,
      isCompleted: false,
      dueDate: today,
    },
    {
      id: 3,
      taskType: 'video',
      title: 'Foundation Program: Week 3',
      description: 'Watch and complete training module',
      pointsValue: 10,
      isCompleted: false,
      dueDate: today,
    },
    {
      id: 4,
      taskType: 'homework',
      title: "Coach's Homework",
      description: 'Make 100 layups',
      pointsValue: 10,
      isCompleted: false,
      dueDate: today,
    },
  ];

  // Use hardcoded tasks if API fails
  const displayTasks = error ? hardcodedTasks : tasks;

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, completionMethod }: { taskId: number; completionMethod: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionMethod }),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Show points animation
      setShowPointsAnimation({ taskId: variables.taskId, points: data.pointsValue || 10 });
      
      // Hide animation after 2 seconds
      setTimeout(() => {
        setShowPointsAnimation(null);
      }, 2000);
      
      // Refresh tasks and points
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players', playerId, 'points'] });
      
      setCompletingTaskId(null);
    },
    onError: () => {
      setCompletingTaskId(null);
    },
  });

  const handleCompleteTask = (taskId: number, completionMethod: string = 'manual') => {
    setCompletingTaskId(taskId);
    
    // If using hardcoded tasks (error fallback), handle completion locally
    if (error) {
      const task = displayTasks.find(t => t.id === taskId);
      if (task) {
        setCompletedTasks(prev => new Set([...prev, taskId]));
        setShowPointsAnimation({ taskId, points: task.pointsValue });
        
        setTimeout(() => {
          setShowPointsAnimation(null);
        }, 2000);
      }
      setCompletingTaskId(null);
    } else {
      // Use API if available
      completeTaskMutation.mutate({ taskId, completionMethod });
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'practice':
        return <Calendar className="h-5 w-5" />;
      case 'game':
        return <Calendar className="h-5 w-5" />;
      case 'skills':
        return <Calendar className="h-5 w-5" />;
      case 'video':
        return <Play className="h-5 w-5" />;
      case 'homework':
        return <BookOpen className="h-5 w-5" />;
      case 'bio_complete':
        return <User className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'practice':
        return 'Practice';
      case 'game':
        return 'Game';
      case 'skills':
        return 'Skills Session';
      case 'video':
        return 'Training Video';
      case 'homework':
        return "Coach's Homework";
      case 'bio_complete':
        return 'Complete Bio';
      default:
        return 'Task';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Today</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Recent activity</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Today</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Recent activity</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {displayTasks.map((task: Task) => {
            const isCompleted = task.isCompleted || completedTasks.has(task.id);
            return (
              <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                backgroundColor: isCompleted ? '#10b981' : '#e5e7eb'
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`relative overflow-hidden rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
              onClick={() => !isCompleted && handleCompleteTask(task.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-current">
                    {getTaskIcon(task.taskType)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{task.title}</h4>
                    <p className="text-xs opacity-75">
                      {task.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    +{task.pointsValue}
                  </span>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : completingTaskId === task.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-current rounded-full flex items-center justify-center">
                      <Plus className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>

              {/* Points animation overlay */}
              <AnimatePresence>
                {showPointsAnimation?.taskId === task.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 1, 1, 0], 
                      y: [0, -20, -30, -40],
                      scale: [0.8, 1.2, 1.0, 0.8]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                      +{showPointsAnimation.points} Points!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {displayTasks.length === 0 && (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <span className="text-2xl block mb-2">🎯</span>
              <p className="text-sm">No tasks for today</p>
              <p className="text-xs text-gray-400 mt-1">
                Check back later for new assignments
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}