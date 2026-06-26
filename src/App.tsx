import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  getOrCreateUserProfile, 
  fetchUserTasks, 
  fetchUserPlans 
} from './lib/firebase';
import { Task, UserProfile, Plan } from './types';
import LandingPage from './components/LandingPage';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import AIChat from './components/AIChat';
import RescueMode from './components/RescueMode';
import SettingsView from './components/Settings';
import { RefreshCw, Flame } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch or initialize user profile
          const profile = await getOrCreateUserProfile(firebaseUser);
          setUserProfile(profile);
          
          // Load database tasks & plans
          const userTasks = await fetchUserTasks(firebaseUser.uid);
          setTasks(userTasks);

          const userPlans = await fetchUserPlans(firebaseUser.uid);
          setPlans(userPlans);
        } catch (err) {
          console.error("Failed to load user profile or data", err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setTasks([]);
        setPlans([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login failed", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const refreshTasks = async () => {
    if (!user) return;
    const refreshed = await fetchUserTasks(user.uid);
    setTasks(refreshed);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const refreshed = await getOrCreateUserProfile(user);
    setUserProfile(refreshed);
  };

  const refreshPlans = async () => {
    if (!user) return;
    const refreshed = await fetchUserPlans(user.uid);
    setPlans(refreshed);
  };

  // Rendering loading state
  if (loading) {
    return (
      <div id="loading-container" className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-[#151518] border-t-indigo-500 animate-spin" />
          <Flame className="w-6 h-6 text-indigo-500 absolute animate-pulse" />
        </div>
        <span className="mt-4 text-xs font-mono text-slate-500 font-bold uppercase tracking-widest animate-pulse">
          Synchronizing Cognitive Nodes
        </span>
      </div>
    );
  }

  // Render Guest Landing Page
  if (!user) {
    return (
      <LandingPage onLogin={handleLogin} isLoading={authLoading} />
    );
  }

  // Active workspace selector
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            userProfile={userProfile} 
            tasks={tasks} 
            onRefreshTasks={refreshTasks} 
            onNavigateToPlanner={() => setActiveTab('planner')}
            onNavigateToRescue={() => setActiveTab('rescue')}
          />
        );
      case 'planner':
        return (
          <Planner 
            userId={user.uid} 
            onRefreshTasks={refreshTasks} 
          />
        );
      case 'chat':
        return (
          <AIChat 
            userId={user.uid} 
            tasks={tasks} 
            userProfile={userProfile} 
            onRefreshHistory={refreshPlans}
          />
        );
      case 'rescue':
        return (
          <RescueMode 
            userId={user.uid} 
            onRefreshPlans={refreshPlans} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            userProfile={userProfile} 
            onRefreshProfile={refreshProfile} 
          />
        );
      default:
        return (
          <div className="p-8 text-center text-gray-400 text-sm">
            Tab not configured.
          </div>
        );
    }
  };

  return (
    <div id="activeflow-app-container" className="min-h-screen flex flex-col bg-[#0A0A0B] text-slate-200 selection:bg-indigo-500/20 selection:text-indigo-300">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main id="main-content-panel" className="flex-1">
        {renderTabContent()}
      </main>
    </div>
  );
}
