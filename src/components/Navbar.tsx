import React from 'react';
import { Flame, LogOut, LayoutDashboard, Calendar, MessageSquare, ShieldAlert, Settings, User } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  user: FirebaseUser | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'AI Planner', icon: Calendar },
    { id: 'chat', label: 'AI Coach', icon: MessageSquare },
    { id: 'rescue', label: 'Rescue Mode', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header id="app-header" className="sticky top-0 z-50 bg-[#0F0F11]/95 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>
        <div>
          <span className="font-display font-extrabold tracking-tight text-white text-lg">ActiveFlow</span>
          <span className="font-mono text-[10px] text-indigo-400 font-bold block -mt-1 tracking-wider uppercase">AI ASSISTANT</span>
        </div>
      </div>

      {user && (
        <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#151518] pl-2 pr-3 py-1.5 rounded-xl border border-white/5">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'US'}
                </div>
              )}
              <span className="text-xs font-medium text-slate-300 max-w-[100px] truncate hidden sm:inline">
                {user.displayName || 'User'}
              </span>
            </div>
            
            <button
              id="logout-btn"
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl border border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500">
            Guest Session
          </div>
        )}
      </div>
    </header>
  );
}
