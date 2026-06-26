export interface UserPreferences {
  workHoursStart?: string; // e.g. "09:00"
  workHoursEnd?: string; // e.g. "17:00"
  breaksFrequency?: string; // e.g. "every 50 mins"
  focusVibe?: 'minimal' | 'energetic' | 'calm' | 'emergency';
}

export interface UserPatterns {
  mostProductiveTime?: string; // e.g. "Morning (09:00 - 12:00)"
  riskTolerance?: string; // e.g. "Procrastinator" or "Risk-averse"
  notes?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  preferences: UserPreferences;
  patterns: UserPatterns;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SubTask {
  title: string;
  completed?: boolean;
}

export interface BreakdownItem {
  title: string;
  subtasks: string[];
}

export interface TimelineItem {
  timeframe: string;
  focus: string;
}

export interface Task {
  id?: string;
  userId: string;
  goal: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'pending' | 'completed';
  dueDate: string; // YYYY-MM-DD
  estimatedEffort?: string;
  breakdown?: BreakdownItem[];
  subtasksState?: { [key: string]: boolean }; // Track checked subtasks locally/firestore
  timeline?: TimelineItem[];
  recommendedActions?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason?: string;
  riskSuggestions?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PlanTimelineItem {
  time: string;
  task: string;
  reason?: string;
  hour?: string; // support rescue timeline as well
}

export interface Plan {
  id?: string;
  userId: string;
  title: string;
  type: 'daily' | 'rescue';
  focus: string;
  tasks?: string[];
  timeline: PlanTimelineItem[];
  aiExplanations?: string;
  createdAt: any;
  updatedAt: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id?: string;
  userId: string;
  messages: ChatMessage[];
  title?: string;
  createdAt: any;
  updatedAt: any;
}
