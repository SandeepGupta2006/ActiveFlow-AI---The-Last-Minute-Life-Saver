import React from 'react';
import { motion } from 'motion/react';
import { Flame, Clock, Sparkles, ShieldAlert, Target, LogIn } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  isLoading: boolean;
}

export default function LandingPage({ onLogin, isLoading }: LandingPageProps) {
  return (
    <div id="landing-page-root" className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative overflow-hidden px-4 py-16">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-4xl text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-8 hover:bg-indigo-500/20 transition-all cursor-default"
        >
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
          <span>EMERGENCY PRODUCTIVITY PROTOCOL</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-6xl font-display font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400"
        >
          Your AI partner that saves you <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            before deadlines do.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          ActiveFlow AI is an active productivity companion. It predicts deadline risks, designs step-by-step recovery roadmaps, and guides you Hour-by-Hour when time is running out.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16"
        >
          <button
            id="google-login-btn"
            onClick={onLogin}
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium shadow-lg shadow-indigo-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span>{isLoading ? "Connecting Securely..." : "Enter ActiveFlow with Google"}</span>
          </button>
        </motion.div>
      </div>

      {/* Feature Bento Grid */}
      <div className="max-w-6xl w-full z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2">AI Task Analyzer</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Enter broad goals in natural language. The AI interprets parameters, estimates effort, and schedules milestones instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2">Deadline Risk Predictor</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Actively calculates completion risks based on due dates, remaining work, and historical delay patterns to warn you early.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-[#151518] border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2">Last Minute Rescue</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Emergency high-intensity mode that strips away perfectionism to draft a bulletproof Hour-by-Hour survival checklist.
          </p>
        </motion.div>
      </div>

      {/* Simple Footer */}
      <div className="mt-20 text-center text-xs text-gray-500 font-mono z-10">
        ActiveFlow AI • Secure Cloud Run Container Environment
      </div>
    </div>
  );
}
