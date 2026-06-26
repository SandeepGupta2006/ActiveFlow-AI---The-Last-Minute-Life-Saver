import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Clock, Play, CheckCircle, RefreshCw, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';
import { Plan } from '../types';
import { createUserPlan } from '../lib/firebase';

interface RescueModeProps {
  userId: string;
  onRefreshPlans: () => void;
}

interface RescueResult {
  focus: string;
  timeline: { hour: string; task: string }[];
  recommendations: string[];
}

export default function RescueMode({ userId, onRefreshPlans }: RescueModeProps) {
  const [emergencyGoal, setEmergencyGoal] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('8 Hours');
  const [isGenerating, setIsGenerating] = useState(false);
  const [rescueResult, setRescueResult] = useState<RescueResult | null>(null);
  
  // Local active checklist tracker
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  
  // Timer for crisis focus
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  // Parse timeRemaining string to seconds
  useEffect(() => {
    if (rescueResult && !timeLeftSeconds) {
      const match = timeRemaining.match(/(\d+)/);
      const hours = match ? parseInt(match[1]) : 8;
      setTimeLeftSeconds(hours * 3600);
    }
  }, [rescueResult]);

  // Handle countdown ticking
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timeLeftSeconds !== null && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeftSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeftSeconds]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRescueTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyGoal) return;

    setIsGenerating(true);
    setRescueResult(null);
    setTimerActive(false);
    setTimeLeftSeconds(null);
    setCheckedItems({});

    try {
      const res = await fetch('/api/generate-rescue-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyGoal, timeRemaining })
      });

      if (!res.ok) {
        throw new Error("Rescue generation failed");
      }

      const data = await res.json();
      setRescueResult(data);
      setTimerActive(true);

      // Save plan to database
      const newPlan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        title: `Emergency Rescue: ${emergencyGoal.slice(0, 30)}...`,
        type: 'rescue',
        focus: data.focus,
        timeline: data.timeline.map((t: any) => ({ time: t.hour, task: t.task })),
        aiExplanations: data.recommendations.join("\n")
      };
      await createUserPlan(newPlan);
      onRefreshPlans();
    } catch (err) {
      console.error(err);
      alert("Emergency call failed. Grab a coffee and try once more.");
    } finally {
      setIsGenerating(false);
    }
  };

  const timeOptions = [
    "3 Hours",
    "5 Hours",
    "8 Hours",
    "12 Hours",
    "24 Hours (Due Tomorrow)"
  ];

  return (
    <div id="rescue-root" className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Page Header */}
      <div className="mb-8 relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-8 h-8 text-rose-500 animate-pulse" />
            <span>Crisis Rescue Mode</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Running dangerously close to a deadline with zero work done? Trigger Last-Minute Rescue Mode to strip perfectionism and secure a passing submission.
          </p>
        </div>
        
        {rescueResult && timeLeftSeconds !== null && (
          <div className="flex-shrink-0 flex items-center gap-4 bg-rose-600/10 border border-rose-500/20 px-6 py-3 rounded-2xl">
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block">Crisis Clock</span>
              <span className="text-2xl font-mono font-extrabold text-white leading-none">
                {formatTimer(timeLeftSeconds)}
              </span>
            </div>
            <button
              id="timer-control-btn"
              onClick={() => setTimerActive(!timerActive)}
              className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-md shadow-rose-950/40"
            >
              {timerActive ? (
                <span className="text-xs font-bold px-1 font-mono">PAUSE</span>
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Emergency Task Input */}
        <div className="lg:col-span-4">
          <div className="bg-gradient-to-b from-rose-950/20 to-[#151518]/60 border border-rose-500/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 text-rose-400">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <h2 className="text-lg font-display font-bold text-white">Emergency Dispatch</h2>
            </div>

            <form onSubmit={handleRescueTrigger} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  What is due? (Be brutally honest)
                </label>
                <textarea
                  id="rescue-goal-textarea"
                  value={emergencyGoal}
                  onChange={(e) => setEmergencyGoal(e.target.value)}
                  placeholder="e.g. My full backend express server is due in 8 hours and I haven't written a single endpoint."
                  rows={4}
                  className="w-full bg-[#0F0F11] border border-white/5 focus:border-rose-500 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Time Remaining until Deadline
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt}
                      id={`time-option-btn-${opt.replace(' ', '-')}`}
                      type="button"
                      onClick={() => setTimeRemaining(opt)}
                      className={`p-3 rounded-xl border text-xs font-mono transition-all text-center ${
                        timeRemaining === opt
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-[#0F0F11] border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="generate-survival-plan-btn"
                type="submit"
                disabled={isGenerating || !emergencyGoal}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-950/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Structuring Survival Plan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-white" />
                    <span>Generate Survival Plan</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Form: Survival Timeline & Checklist */}
        <div className="lg:col-span-8">
          {isGenerating && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#151518]/30 border border-dashed border-white/5 rounded-2xl p-8 text-center">
              <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mb-4" />
              <h3 className="text-white font-display font-bold">Initiating Crisis Assessment</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                Gemini is stripping optional tasks, designing a minimal viable output blueprint, and establishing chronological checkpoints.
              </p>
            </div>
          )}

          {!isGenerating && !rescueResult && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-[#151518]/30 border border-dashed border-white/5 rounded-2xl p-8 text-center">
              <ShieldAlert className="w-12 h-12 text-slate-600/50 mb-3" />
              <h3 className="text-slate-400 font-display font-bold">No active emergency</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Enter your emergency task and remaining timeframe on the left to receive a custom hour-by-hour panic mitigation roadmap.
              </p>
            </div>
          )}

          {rescueResult && (
            <div className="space-y-6">
              
              {/* Tactical Overview */}
              <div className="bg-gradient-to-r from-rose-950/20 to-[#151518] border border-white/5 rounded-2xl p-6">
                <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  CRISIS POSTURE
                </span>
                <p className="text-base font-semibold text-slate-200 mt-3 leading-relaxed">
                  "{rescueResult.focus}"
                </p>
              </div>

              {/* Hour by Hour Roadmap Checklist */}
              <div className="bg-[#151518] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-5 flex items-center justify-between">
                  <span>Chronological Checklist</span>
                  <span className="text-rose-400">Total Checkpoints: {rescueResult.timeline.length}</span>
                </h3>

                <div className="space-y-4">
                  {rescueResult.timeline.map((item, idx) => {
                    const itemKey = `checkpoint-${idx}`;
                    const isChecked = checkedItems[itemKey] || false;
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                          isChecked 
                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' 
                            : 'bg-[#0F0F11]/60 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        <button
                          id={`check-rescue-item-${idx}`}
                          onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !isChecked }))}
                          className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-emerald-500 border-emerald-400 text-white' 
                              : 'border-slate-700 hover:border-rose-500 text-transparent'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        
                        <div>
                          <span className={`text-xs font-mono font-bold uppercase ${
                            isChecked ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {item.hour}
                          </span>
                          <p className={`text-sm mt-1 leading-snug font-medium ${
                            isChecked ? 'text-slate-500 line-through' : 'text-slate-200'
                          }`}>
                            {item.task}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Survival tips */}
              {rescueResult.recommendations && rescueResult.recommendations.length > 0 && (
                <div className="bg-[#151518]/30 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider mb-3">Panic Mitigation Directives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rescueResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-[#0F0F11]/50 border border-white/5 rounded-xl p-4 flex items-start gap-2.5">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-400 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
