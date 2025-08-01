import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus, ChevronRight } from 'lucide-react';
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
  const queryClient = useQueryClient();
  
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/players', playerId, 'tasks', { date: today }],
    queryFn: () => apiRequest(`/api/players/${playerId}/tasks?date=${today}`),
  });

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
    completeTaskMutation.mutate({ taskId, completionMethod });
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'practice':
        return '🏃';
      case 'game':
        return '🏀';
      case 'skills':
        return '⚡';
      case 'video':
        return '📹';
      case 'homework':
        return '📝';
      case 'bio_complete':
        return '👤';
      default:
        return '✨';
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
          {tasks.map((task: Task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                backgroundColor: task.isCompleted ? '#10b981' : '#e5e7eb'
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`relative overflow-hidden rounded-lg p-4 cursor-pointer transition-all duration-300 ${
                task.isCompleted 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
              onClick={() => !task.isCompleted && handleCompleteTask(task.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {getTaskIcon(task.taskType)}
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm">{task.title}</h4>
                    <p className="text-xs opacity-75">
                      {getTaskTypeLabel(task.taskType)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    +{task.pointsValue}
                  </span>
                  {task.isCompleted ? (
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
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
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