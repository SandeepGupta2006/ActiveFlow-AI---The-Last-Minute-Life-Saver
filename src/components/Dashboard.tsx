import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  Flame, CheckCircle, Clock, ShieldAlert, Sparkles, 
  Trash2, Plus, AlertCircle, RefreshCw, ChevronRight, CheckCircle2,
  Undo2, X
} from 'lucide-react';
import { Task, UserProfile } from '../types';
import { deleteUserTask, updateUserTask, createUserTask } from '../lib/firebase';

interface DashboardProps {
  userProfile: UserProfile | null;
  tasks: Task[];
  onRefreshTasks: () => void;
  onNavigateToPlanner: () => void;
  onNavigateToRescue: () => void;
}

export default function Dashboard({ 
  userProfile, 
  tasks, 
  onRefreshTasks, 
  onNavigateToPlanner,
  onNavigateToRescue 
}: DashboardProps) {
  const [analyzingTaskId, setAnalyzingTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  
  // Undo/Toast State
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTimeoutId, setToastTimeoutId] = useState<number | null>(null);
  const [unmarkTargetTask, setUnmarkTargetTask] = useState<Task | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
      }
    };
  }, [toastTimeoutId]);
  
  // Calculate stats
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTasksCount = tasks.length;
  
  // Calculate a mock "productivity score" based on completion rate & priority weights
  const productivityScore = totalTasksCount > 0 
    ? Math.round((completedTasks.length / totalTasksCount) * 100) 
    : 80; // default initial score

  // Calculate high-risk tasks count
  const highRiskTasks = tasks.filter(t => t.status === 'pending' && t.riskLevel === 'HIGH');
  const mediumRiskTasks = tasks.filter(t => t.status === 'pending' && t.riskLevel === 'MEDIUM');

  // Trigger risk prediction on a task
  const runRiskPrediction = async (task: Task) => {
    if (!task.id) return;
    setAnalyzingTaskId(task.id);
    try {
      const response = await fetch('/api/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: task.goal,
          dueDate: task.dueDate,
          remainingTasksCount: pendingTasks.length,
          userWorkload: userProfile?.patterns?.riskTolerance || 'Normal'
        })
      });

      if (!response.ok) {
        throw new Error("Failed to calculate risk prediction");
      }

      const riskResult = await response.json();
      
      // Update task in Firestore
      await updateUserTask(task.id, {
        riskLevel: riskResult.riskLevel,
        riskReason: riskResult.reason,
        riskSuggestions: riskResult.suggestions
      });
      
      onRefreshTasks();
    } catch (err) {
      console.error("Risk calculation failed", err);
    } finally {
      setAnalyzingTaskId(null);
    }
  };

  // Toggle complete state of task
  const toggleTaskStatus = async (task: Task) => {
    if (!task.id) return;
    if (task.status === 'completed') {
      setUnmarkTargetTask(task);
    } else {
      try {
        await updateUserTask(task.id, { status: 'completed' });
        onRefreshTasks();
      } catch (err) {
        console.error("Failed to update status", err);
      }
    }
  };

  // Confirm unmarking a completed task
  const handleConfirmUnmark = async () => {
    if (!unmarkTargetTask || !unmarkTargetTask.id) return;
    try {
      await updateUserTask(unmarkTargetTask.id, { status: 'pending' });
      onRefreshTasks();
    } catch (err) {
      console.error("Failed to unmark status", err);
    } finally {
      setUnmarkTargetTask(null);
    }
  };

  // Delete a task with instant feedback and undo option (removes broken browser confirm)
  const handleTaskDelete = async (taskToDelete: Task) => {
    if (!taskToDelete.id) return;
    
    try {
      // Keep copy for undo
      setDeletedTask(taskToDelete);
      
      // Delete immediately from DB
      await deleteUserTask(taskToDelete.id);
      onRefreshTasks();
      
      // Setup undo toast
      setToastMessage(`"${taskToDelete.goal}" deleted.`);
      setShowToast(true);
      
      // Clear any previous timeout
      if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
      }
      
      // Auto dismiss after 6 seconds
      const timeoutId = window.setTimeout(() => {
        setShowToast(false);
        setDeletedTask(null);
      }, 6000);
      
      setToastTimeoutId(timeoutId);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Undo task deletion
  const handleUndoDelete = async () => {
    if (!deletedTask) return;
    
    try {
      const { id, createdAt, updatedAt, ...taskData } = deletedTask;
      await createUserTask(taskData);
      onRefreshTasks();
      
      // Show success toast
      setToastMessage(`Restored "${deletedTask.goal}"`);
      setDeletedTask(null);
      
      if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
      }
      
      const timeoutId = window.setTimeout(() => {
        setShowToast(false);
      }, 3000);
      
      setToastTimeoutId(timeoutId);
    } catch (err) {
      console.error("Failed to restore task", err);
    }
  };

  return (
    <div id="dashboard-root" className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome header with dynamic context memory */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">
            Welcome back, {userProfile?.email.split('@')[0] || 'Flow Master'}
          </h1>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5 font-mono">
            <span>Productivity Vibe:</span>
            <span className="text-indigo-400 capitalize bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
              {userProfile?.preferences?.focusVibe || 'Calm'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-dashboard-btn"
            onClick={onRefreshTasks}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-[#151518] text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Data</span>
          </button>
          
          <button
            id="emergency-rescue-tab-btn"
            onClick={onNavigateToRescue}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white transition-all text-sm font-semibold shadow-lg shadow-indigo-950/40"
          >
            <Flame className="w-4 h-4" />
            <span>Rescue Mode</span>
          </button>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Productivity Score Circular/Progress Widget */}
        <div className="md:col-span-2 bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">ActiveFlow Score</span>
            <h3 className="text-lg font-display font-bold text-white mt-1">Your Velocity Index</h3>
          </div>
          <div className="flex items-center gap-6 my-4">
            <div className="relative flex items-center justify-center">
              {/* Outer gauge */}
              <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                <span className="text-2xl font-display font-extrabold text-white">{productivityScore}%</span>
              </div>
              <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium">
                {productivityScore >= 80 ? "Pristine focus flow!" : productivityScore >= 50 ? "Moderate delay risks." : "Critical backup levels."}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Active memory shows you are most productive in the <strong className="text-slate-300">{userProfile?.patterns?.mostProductiveTime || 'Morning'}</strong>.
              </p>
            </div>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500" 
              style={{ width: `${productivityScore}%` }}
            />
          </div>
        </div>

        {/* Total Pending / Complete Tasks */}
        <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">Task Load</span>
            <div className="text-5xl font-display font-extrabold text-white mt-4">
              {pendingTasks.length}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Completed Tasks:</span>
              <span className="text-emerald-400 font-bold">{completedTasks.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>Remaining Goals:</span>
              <span className="text-indigo-400 font-bold">{pendingTasks.length}</span>
            </div>
          </div>
        </div>

        {/* Extreme Alerts / Risk Overview */}
        <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between relative overflow-hidden">
          {highRiskTasks.length > 0 && (
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-rose-500/10 rounded-full blur-xl" />
          )}
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">Risk Predictor</span>
            <div className={`text-5xl font-display font-extrabold mt-4 ${highRiskTasks.length > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {highRiskTasks.length}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              {highRiskTasks.length > 0 
                ? `You have ${highRiskTasks.length} goal(s) at high risk of failure. Consider Rescue Mode immediately.`
                : "All tracked goals are within safe timeframes."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Dashboard Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1 & 2: Active Goals List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <span>Active Goals & Deadlines</span>
              <span className="text-xs font-mono text-slate-500 font-normal">({pendingTasks.length} pending)</span>
            </h2>
            
            <button
              id="new-goal-trigger-btn"
              onClick={onNavigateToPlanner}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Launch AI Analyzer</span>
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="text-center py-16 bg-[#151518]/30 border border-dashed border-white/5 rounded-2xl">
              <Sparkles className="w-8 h-8 text-indigo-500/40 mx-auto mb-3" />
              <h3 className="text-slate-300 font-bold font-display">No active goals yet</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Use the AI Planner to enter goals in natural language and generate structured milestone schedules.
              </p>
              <button
                id="create-first-goal-btn"
                onClick={onNavigateToPlanner}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-md shadow-indigo-950/30"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`bg-[#151518] border rounded-2xl p-5 transition-all hover:bg-[#1C1C21] ${
                    task.riskLevel === 'HIGH' 
                      ? 'border-l-4 border-l-rose-500 border-white/5 shadow-lg shadow-rose-950/10' 
                      : task.riskLevel === 'MEDIUM' 
                      ? 'border-l-4 border-l-amber-500 border-white/5' 
                      : 'border-l-4 border-l-indigo-500/40 border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        id={`complete-task-btn-${task.id}`}
                        onClick={() => toggleTaskStatus(task)}
                        className="mt-1 flex-shrink-0 w-5 h-5 rounded-md border border-white/10 hover:border-indigo-500 flex items-center justify-center text-transparent hover:text-indigo-400/50 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="text-base font-semibold text-white leading-snug">{task.goal}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                          <span className={`px-2 py-0.5 rounded ${
                            task.priority === 'HIGH' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : task.priority === 'MEDIUM' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due: {task.dueDate}</span>
                          </span>
                          {task.estimatedEffort && (
                            <span>Effort: {task.estimatedEffort}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`delete-task-btn-${task.id}`}
                        onClick={() => task.id && handleTaskDelete(task)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Risk analysis results inside task card */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      {task.riskLevel ? (
                        <div className="flex items-start gap-2">
                          <ShieldAlert className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            task.riskLevel === 'HIGH' ? 'text-rose-500 animate-pulse' : 'text-amber-400'
                          }`} />
                          <div>
                            <span className={`text-xs font-bold ${
                              task.riskLevel === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                            }`}>
                              Risk Level: {task.riskLevel}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">{task.riskReason}</p>
                            {task.riskSuggestions && (
                              <p className="text-xs text-indigo-400 italic mt-1">💡 {task.riskSuggestions}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No risk calculation calculated yet.</span>
                      )}
                    </div>
                    
                    <button
                      id={`predict-risk-btn-${task.id}`}
                      onClick={() => runRiskPrediction(task)}
                      disabled={analyzingTaskId === task.id}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {analyzingTaskId === task.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>{task.riskLevel ? "Recalculate Risk" : "Predict Risk"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-mono text-slate-500 uppercase font-bold tracking-wider mb-4">Completed Goals</h3>
              <div className="space-y-2 opacity-60">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-[#151518]/60 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="text-emerald-500 hover:text-emerald-400"
                      >
                        <CheckCircle className="w-5 h-5 fill-emerald-500/10" />
                      </button>
                      <span className="text-sm text-slate-400 line-through font-medium">{task.goal}</span>
                    </div>
                    <button
                      id={`delete-completed-task-btn-${task.id}`}
                      onClick={() => task.id && handleTaskDelete(task)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-all"
                      title="Delete completed goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: AI Insights / Proactive Tips */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1c1c24] to-[#151518] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-2 text-indigo-400 mb-4">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-display font-bold text-white text-base">Active Coach Insights</h3>
            </div>
            
            <div className="text-slate-300 text-sm leading-relaxed mb-4 markdown-body">
              <Markdown
                components={{
                  p: ({ node, ...props }: any) => <p className="text-slate-300 text-sm leading-relaxed" {...props} />,
                  strong: ({ node, ...props }: any) => <strong className="font-semibold text-indigo-400" {...props} />
                }}
              >
                {`"Based on your profile, you tend to reach maximum productivity in high-priority bursts. Ensure you use **Rescue Mode** if your high-risk tasks remain incomplete by Sunday."`}
              </Markdown>
            </div>

            <ul className="space-y-3 border-t border-white/5 pt-4">
              <li className="flex items-start gap-2.5 text-xs text-slate-400">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Complete model training 2 days before final ML presentation.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-slate-400">
                <span className="text-rose-400 font-bold">!</span>
                <span>Workload is exceeding available hours. Consider delegating documentation.</span>
              </li>
            </ul>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-[#151518] border border-white/5 rounded-2xl p-6">
            <h3 className="font-display font-bold text-white text-base mb-4">Active Memory Insights</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2.5">
                <span className="text-slate-500">Risk Tolerance:</span>
                <span className="text-slate-300 font-semibold">{userProfile?.patterns?.riskTolerance || 'Medium'}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono border-b border-white/5 pb-2.5">
                <span className="text-slate-500">Productive Peak:</span>
                <span className="text-slate-300 font-semibold">{userProfile?.patterns?.mostProductiveTime || 'Morning'}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Focus Hours:</span>
                <span className="text-slate-300 font-semibold">
                  {userProfile?.preferences?.workHoursStart || '09:00'} - {userProfile?.preferences?.workHoursEnd || '17:00'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modern Undo Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            id="undo-toast-notification"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 bg-[#18181b] border border-white/10 rounded-xl px-4 py-3.5 shadow-xl shadow-black/80 max-w-sm w-full md:w-auto"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">
                {toastMessage}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {deletedTask && (
                <button
                  id="undo-delete-btn"
                  onClick={handleUndoDelete}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-all"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}
              
              <button
                id="close-toast-btn"
                onClick={() => setShowToast(false)}
                className="p-1.5 text-slate-500 hover:text-slate-300 rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Unmarking Completed Goals */}
      <AnimatePresence>
        {unmarkTargetTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              id="confirm-unmark-modal"
              className="bg-[#1c1c24] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Unmark completed goal?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Are you sure you want to restore <span className="text-slate-200 font-semibold">"{unmarkTargetTask.goal}"</span> back to your pending list? This will move it back to active goals.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  id="cancel-unmark-btn"
                  onClick={() => setUnmarkTargetTask(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-[#151518] text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-unmark-btn"
                  onClick={handleConfirmUnmark}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-all text-sm font-semibold shadow-lg shadow-amber-950/40"
                >
                  Yes, Restore Goal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
