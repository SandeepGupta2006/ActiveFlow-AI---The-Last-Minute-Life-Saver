import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Clock, Brain, User, Check, RefreshCw } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile } from '../lib/firebase';

interface SettingsProps {
  userProfile: UserProfile | null;
  onRefreshProfile: () => void;
}

export default function SettingsView({ userProfile, onRefreshProfile }: SettingsProps) {
  const [focusVibe, setFocusVibe] = useState<'minimal' | 'energetic' | 'calm' | 'emergency'>(
    userProfile?.preferences?.focusVibe || 'calm'
  );
  const [workStart, setWorkStart] = useState(userProfile?.preferences?.workHoursStart || '09:00');
  const [workEnd, setWorkEnd] = useState(userProfile?.preferences?.workHoursEnd || '17:00');
  const [breaks, setBreaks] = useState(userProfile?.preferences?.breaksFrequency || 'every 50 mins');
  const [productiveTime, setProductiveTime] = useState(userProfile?.patterns?.mostProductiveTime || 'Morning (09:00 - 12:00)');
  const [riskTolerance, setRiskTolerance] = useState(userProfile?.patterns?.riskTolerance || 'Medium Procrastinator');
  const [notes, setNotes] = useState(userProfile?.patterns?.notes || 'Tends to rush assignments the day before.');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSaving(true);
    setIsSaved(false);

    try {
      await updateUserProfile(userProfile.userId, {
        preferences: {
          focusVibe,
          workHoursStart: workStart,
          workHoursEnd: workEnd,
          breaksFrequency: breaks
        },
        patterns: {
          mostProductiveTime: productiveTime,
          riskTolerance,
          notes
        }
      });
      setIsSaved(true);
      onRefreshProfile();
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const vibes = [
    { id: 'calm', title: 'Serene Coach', desc: 'Gentle nudges, high encouragement, realistic goals.' },
    { id: 'energetic', title: 'Action Booster', desc: 'High energy instructions, focus highlights, speed prompts.' },
    { id: 'minimal', title: 'Silent Expert', desc: 'Sparsely styled breakdowns, code-first advice, zero distraction.' },
    { id: 'emergency', title: 'Survival Officer', desc: 'Direct checklist items, bold alert highlights, high urgency.' }
  ];

  return (
    <div id="settings-root" className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-8 h-8 text-indigo-500" />
          <span>Productivity & Delay Profile</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Customize your cognitive memory files. These preferences actively customize the tone, schedules, and predictions computed by Gemini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Vibe Selection */}
        <div className="bg-[#151518] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-mono text-slate-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-500" />
            <span>AI Coach Vibe & Tone Selection</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vibes.map((v) => (
              <button
                key={v.id}
                id={`vibe-btn-${v.id}`}
                type="button"
                onClick={() => setFocusVibe(v.id as any)}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  focusVibe === v.id
                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                    : 'bg-[#0F0F11]/60 border border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span className="font-semibold text-sm block">{v.title}</span>
                <span className="text-xs text-slate-500 mt-1 leading-snug">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Focus Hours and Breaks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Standard Focus Hours</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Focus Starts</label>
                <input
                  id="settings-work-start"
                  type="text"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Focus Ends</label>
                <input
                  id="settings-work-end"
                  type="text"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Break Frequency Pattern</label>
              <input
                id="settings-breaks"
                type="text"
                value={breaks}
                onChange={(e) => setBreaks(e.target.value)}
                className="w-full bg-[#0F0F11] border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Delay Profiles */}
          <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span>Delay Profiling</span>
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">When do you peak productively?</label>
              <input
                id="settings-productive-time"
                type="text"
                value={productiveTime}
                onChange={(e) => setProductiveTime(e.target.value)}
                placeholder="Morning (09:00 - 12:00)"
                className="w-full bg-[#0F0F11] border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Delay Risk Profile</label>
              <select
                id="settings-risk-tolerance"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                className="w-full bg-[#0F0F11] border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="Proactive Planner">Proactive Planner (Risk-averse)</option>
                <option value="Medium Procrastinator">Medium Procrastinator (Standard)</option>
                <option value="Extreme Procrastinator">Extreme Procrastinator (Last minute rush)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Notes */}
        <div className="bg-[#151518] border border-white/5 rounded-2xl p-6">
          <label className="block text-sm font-mono text-slate-500 font-bold uppercase tracking-wider mb-2">
            Custom Behavioral / Productivity Notes for AI Engine
          </label>
          <textarea
            id="settings-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tell the AI any patterns (e.g. 'I struggle with getting started', 'I need high pressure to complete modules')"
            rows={3}
            className="w-full bg-[#0F0F11] border border-white/10 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
          />
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            id="save-settings-btn"
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition-all shadow-md shadow-indigo-950/30 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Updating cloud profile...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved Safely</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save delay profile</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
