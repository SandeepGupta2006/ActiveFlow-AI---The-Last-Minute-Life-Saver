import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, CalendarRange, Clock, ArrowRight, Check, ListTodo, Send, RefreshCw } from 'lucide-react';
import { Task } from '../types';
import { createUserTask } from '../lib/firebase';

interface PlannerProps {
  userId: string;
  onRefreshTasks: () => void;
}

interface AnalyzedResult {
  goalSummary: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedEffort: string;
  breakdown: { title: string; subtasks: string[] }[];
  timeline: { timeframe: string; focus: string }[];
  recommendedActions: string[];
}

export default function Planner({ userId, onRefreshTasks }: PlannerProps) {
  const [goalText, setGoalText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<AnalyzedResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText || !dueDate) {
      alert("Please provide both a goal description and an target due date.");
      return;
    }

    setIsAnalyzing(true);
    setAnalyzedResult(null);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/analyze-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: `${goalText}. Target Due Date is ${dueDate}` }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze goal");
      }

      const data = await res.json();
      setAnalyzedResult(data);
    } catch (err) {
      console.error(err);
      alert("Unable to analyze. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToDashboard = async () => {
    if (!analyzedResult) return;
    setSaveStatus('saving');
    try {
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        goal: analyzedResult.goalSummary,
        priority: analyzedResult.priority,
        status: 'pending',
        dueDate,
        estimatedEffort: analyzedResult.estimatedEffort,
        breakdown: analyzedResult.breakdown,
        timeline: analyzedResult.timeline,
        recommendedActions: analyzedResult.recommendedActions,
        subtasksState: {}
      };

      await createUserTask(newTask);
      setSaveStatus('saved');
      onRefreshTasks();
    } catch (err) {
      console.error(err);
      alert("Failed to save analyzed task to cloud Firestore.");
      setSaveStatus('idle');
    }
  };

  return (
    <div id="planner-root" className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-500" />
          <span>Active AI Roadmap Planner</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Input your goals in natural language. Our AI will instantly map out chronological milestones, predict workloads, and design a bulletproof development plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Natural Language Input form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <span>Specify Your Goal</span>
            </h2>
            
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  What are you trying to accomplish?
                </label>
                <textarea
                  id="goal-input-textarea"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g. I have a machine learning project due next Monday. It needs model training, data analysis, and a clean streamlit front-end."
                  rows={4}
                  className="w-full bg-[#0F0F11] border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Absolute Target Due Date
                </label>
                <div className="relative">
                  <input
                    id="due-date-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-white/10 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                id="generate-roadmap-btn"
                type="submit"
                disabled={isAnalyzing || !goalText || !dueDate}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium shadow-md shadow-indigo-950/30 transition-all disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Analyzing & Designing Roadmap...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate AI Roadmap</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Prompt presets / Ideas to help the user */}
          <div className="bg-[#151518]/30 border border-white/5 rounded-2xl p-6">
            <h3 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-3">Example Goals to Try</h3>
            <div className="space-y-2.5">
              {[
                { text: "ML Project with model training and streamlit", days: 5 },
                { text: "Launch marketing campaign for our SaaS product", days: 7 },
                { text: "Prepare and study for AWS developer certification exam", days: 10 }
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setGoalText(preset.text);
                    const d = new Date();
                    d.setDate(d.getDate() + preset.days);
                    setDueDate(d.toISOString().split('T')[0]);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-[#151518]/40 hover:bg-[#151518]/80 border border-white/5 text-xs text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-4">{preset.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI generated output results */}
        <div className="lg:col-span-7">
          {isAnalyzing && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#151518]/30 border border-dashed border-white/5 rounded-2xl p-8">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <h3 className="text-white font-display font-bold">Drafting Milestone Flowchart</h3>
              <p className="text-slate-400 text-xs text-center mt-1 max-w-xs leading-relaxed">
                Gemini is breaking down tasks, calculating chronological efforts, and formatting critical path milestones. This takes about 5-10 seconds.
              </p>
            </div>
          )}

          {!isAnalyzing && !analyzedResult && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#151518]/30 border border-dashed border-white/5 rounded-2xl p-8 text-center">
              <ListTodo className="w-12 h-12 text-slate-600/50 mb-3" />
              <h3 className="text-slate-400 font-display font-bold">Ready to Plan</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Submit a goal on the left side to trigger deep Gemini contextual analysis. The resulting plan will appear here.
              </p>
            </div>
          )}

          {analyzedResult && (
            <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-6 relative">
              
              {/* Card Header & Save Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      analyzedResult.priority === 'HIGH' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {analyzedResult.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ESTIMATED EFFORT: {analyzedResult.estimatedEffort}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-white mt-1.5">{analyzedResult.goalSummary}</h3>
                </div>

                <button
                  id="save-task-dashboard-btn"
                  onClick={handleSaveToDashboard}
                  disabled={saveStatus !== 'idle'}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : saveStatus === 'saving'
                      ? 'bg-[#0F0F11] border-white/10 text-slate-400 cursor-wait'
                      : 'bg-indigo-500 hover:bg-indigo-400 border-transparent text-white shadow-md shadow-indigo-950/30'
                  }`}
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved to Dashboard</span>
                    </>
                  ) : saveStatus === 'saving' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Active-Track Goal</span>
                    </>
                  )}
                </button>
              </div>

              {/* Task Breakdown Section */}
              <div>
                <h4 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-3">AI Milestone Breakdown</h4>
                <div className="space-y-4">
                  {analyzedResult.breakdown.map((block, idx) => (
                    <div key={idx} className="bg-[#0F0F11]/50 border border-white/5 rounded-xl p-4">
                      <h5 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                          {idx + 1}
                        </span>
                        <span>{block.title}</span>
                      </h5>
                      {block.subtasks && block.subtasks.length > 0 && (
                        <ul className="mt-3 ml-7 space-y-2">
                          {block.subtasks.map((sub, sIdx) => (
                            <li key={sIdx} className="text-xs text-slate-400 flex items-start gap-2">
                              <span className="text-indigo-500/60 font-bold mt-0.5">•</span>
                              <span>{sub}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Progressor */}
              <div>
                <h4 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-3">Development Schedule</h4>
                <div className="relative border-l-2 border-white/5 ml-3 space-y-5 pb-2">
                  {analyzedResult.timeline.map((timeBlock, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-[#151518]" />
                      <span className="text-xs font-mono font-bold text-indigo-400 uppercase">{timeBlock.timeframe}</span>
                      <p className="text-xs text-slate-300 mt-1">{timeBlock.focus}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action items */}
              {analyzedResult.recommendedActions && analyzedResult.recommendedActions.length > 0 && (
                <div className="border-t border-white/5 pt-5">
                  <h4 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-3">Recommended Actions</h4>
                  <ul className="space-y-2">
                    {analyzedResult.recommendedActions.map((action, idx) => (
                      <li key={idx} className="text-xs text-slate-400 bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">⚡</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
