import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, MessageSquare, ArrowRight, User, RefreshCw, 
  Plus, Trash2, Edit2, Check, X, Menu, Loader2, AlertCircle
} from 'lucide-react';
import { ChatMessage, Task, UserProfile, ChatSession } from '../types';
import { createOrUpdateChatSession, fetchUserChatSessions, deleteChatSession } from '../lib/firebase';
import Markdown from 'react-markdown';

interface AIChatProps {
  userId: string;
  tasks: Task[];
  userProfile: UserProfile | null;
  initialChatSessionId?: string;
  onRefreshHistory?: () => void;
}

export default function AIChat({ 
  userId, 
  tasks, 
  userProfile, 
  initialChatSessionId,
  onRefreshHistory 
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: "Hello! I am your ActiveFlow productivity coach. I'm here to help you break down overwhelming goals, design tactical plans, and rescue your deadlines when you're behind. What can we focus on today?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(initialChatSessionId);
  
  // Chat sessions list state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [deleteTargetSession, setDeleteTargetSession] = useState<ChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load saved sessions from Firestore
  const loadSessions = async () => {
    try {
      const chatSessions = await fetchUserChatSessions(userId);
      setSessions(chatSessions);
    } catch (err) {
      console.error("Failed to load saved chat sessions", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [userId]);

  // Load session if initialChatSessionId changes
  useEffect(() => {
    if (initialChatSessionId && sessions.length > 0) {
      const found = sessions.find(s => s.id === initialChatSessionId);
      if (found) {
        setSessionId(initialChatSessionId);
        setMessages(found.messages);
      }
    }
  }, [initialChatSessionId, sessions]);

  const handleSelectSession = (session: ChatSession) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setIsSidebarOpen(false);
  };

  const handleNewSession = () => {
    setMessages([
      {
        role: 'model',
        content: "Chat session refreshed. What productivity bottleneck should we resolve?",
        timestamp: new Date().toISOString()
      }
    ]);
    setSessionId(undefined);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetSession(session);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetSession || !deleteTargetSession.id) return;
    try {
      await deleteChatSession(deleteTargetSession.id);
      if (sessionId === deleteTargetSession.id) {
        handleNewSession();
      }
      loadSessions();
    } catch (err) {
      console.error("Failed to delete chat session", err);
    } finally {
      setDeleteTargetSession(null);
    }
  };

  const handleRenameSession = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTitle.trim()) return;
    try {
      const targetSession = sessions.find(s => s.id === id);
      if (targetSession) {
        await createOrUpdateChatSession(userId, targetSession.messages, id, editingTitle.trim());
        setEditingSessionId(null);
        loadSessions();
      }
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;
    
    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      // Build a local contextual payload
      const chatContext = {
        tasks,
        preferences: userProfile?.preferences || {},
        patterns: userProfile?.patterns || {}
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages, // Send previous dialogue history
          context: chatContext
        })
      });

      if (!response.ok) {
        throw new Error("Chat service failed");
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        role: 'model',
        content: data.reply || "I am processing your request. Please let me know if you want to break this down.",
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...messages, userMsg, modelMsg];
      setMessages(finalMessages);

      // Persist dialogue session to cloud Firestore
      const isNewSession = !sessionId;
      const firstUserMsg = finalMessages.find(m => m.role === 'user')?.content || '';
      const calculatedTitle = firstUserMsg.slice(0, 40) + (firstUserMsg.length > 40 ? '...' : '');

      const savedSessionId = await createOrUpdateChatSession(
        userId, 
        finalMessages, 
        sessionId,
        isNewSession ? calculatedTitle : undefined
      );

      if (isNewSession) {
        setSessionId(savedSessionId);
        if (onRefreshHistory) onRefreshHistory();
      }

      loadSessions();
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        {
          role: 'model',
          content: "❌ Sorry, I encountered an issue connecting with my cognitive center. Please check your network or try sending again.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const suggestPrompts = [
    "Break down dataset collection into 3 tiny steps",
    "I'm feeling overwhelmed. Help me pick a focus",
    "Suggest some emergency tactics for a due-tomorrow project",
    "Analyze the risk levels of my currently saved tasks"
  ];

  return (
    <div id="ai-chat-root" className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 relative overflow-hidden">
      
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* History Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 w-[280px] shrink-0 bg-[#0F0F11] border border-white/5 rounded-r-2xl md:rounded-2xl p-4 flex flex-col h-full transition-transform duration-300 md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-sm text-slate-200">Coach Chat History</span>
          </div>
          <button
            id="sidebar-new-chat-btn"
            onClick={handleNewSession}
            className="p-1.5 rounded-lg border border-white/5 bg-[#151518] hover:bg-white/5 text-slate-300 hover:text-white transition-all flex items-center justify-center"
            title="Start new chat session"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* History Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {loadingSessions ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mb-2 text-indigo-500" />
              <span className="text-xs font-mono">Retrieving chats...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500 font-sans leading-relaxed">
              No saved chats yet.<br />Submit your first message to preserve it here.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === sessionId;
              const isEditing = s.id === editingSessionId;
              
              return (
                <div
                  key={s.id}
                  onClick={() => s.id && !isEditing && handleSelectSession(s)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
                      : 'bg-[#151518]/40 border-white/5 text-slate-400 hover:bg-[#151518] hover:text-slate-200'
                  }`}
                >
                  {isEditing ? (
                    <form 
                      onSubmit={(e) => s.id && handleSaveRename(s.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 w-full"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button type="submit" className="text-emerald-400 hover:text-emerald-300 p-1">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingSessionId(null)} className="text-rose-400 hover:text-rose-300 p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-col pr-12 min-w-0">
                        <span className="text-xs font-medium truncate">
                          {s.title || "New Coaching Session"}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 mt-0.5">
                          {s.updatedAt 
                            ? new Date(s.updatedAt?.seconds ? s.updatedAt.seconds * 1000 : s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'Just now'}
                        </span>
                      </div>
                      
                      {/* Action buttons (shown on hover) */}
                      <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => s.id && handleRenameSession(s.id, s.title || "New Coaching Session", e)}
                          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/5"
                          title="Rename chat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(s, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0F0F11]/40 border border-white/5 rounded-2xl p-4 overflow-hidden">
        
        {/* Workspace Header */}
        <div className="flex-shrink-0 mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white md:hidden flex items-center justify-center shrink-0 border border-white/5"
              title="Toggle chat history"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-display font-extrabold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                <span>AI Coach & Advisor</span>
              </h1>
              <p className="text-slate-500 text-[10px] md:text-xs mt-0.5">
                Real-time personalized strategy calibrated to your saved goals and patterns.
              </p>
            </div>
          </div>
          <button
            id="clear-chat-btn"
            onClick={handleNewSession}
            className="text-xs font-mono font-bold text-slate-400 hover:text-white transition-all bg-[#151518] border border-white/5 px-3 py-1.5 rounded-lg shrink-0"
          >
            New Session
          </button>
        </div>

        {/* Messages Workspace */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 scrollbar-thin">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={index} 
                className={`flex items-start gap-3.5 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Profile icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                  isUser 
                    ? 'bg-indigo-500 border-indigo-400 text-white' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
                </div>

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100' 
                    : 'bg-[#151518] border border-white/5 text-slate-300'
                }`}>
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="markdown-body font-sans">
                      <Markdown
                        components={{
                          h1: ({ node, ...props }: any) => <h1 className="text-base font-bold text-white mt-3 mb-2" {...props} />,
                          h2: ({ node, ...props }: any) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1.5" {...props} />,
                          h3: ({ node, ...props }: any) => <h3 className="text-xs font-bold text-white mt-2 mb-1" {...props} />,
                          p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-300" {...props} />,
                          ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-300" {...props} />,
                          ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-300" {...props} />,
                          li: ({ node, ...props }: any) => <li className="text-slate-300" {...props} />,
                          strong: ({ node, ...props }: any) => <strong className="font-semibold text-white" {...props} />,
                          code: ({ node, ...props }: any) => <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-300 border border-white/5" {...props} />,
                          pre: ({ node, ...props }: any) => <pre className="bg-[#0c0c10] p-3 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto border border-white/5 my-3" {...props} />
                        }}
                      >
                        {msg.content}
                      </Markdown>
                    </div>
                  )}
                  
                  <span className="text-[9px] font-mono text-slate-600 block mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex items-start gap-3.5 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3 text-sm bg-[#151518] border border-white/5 text-slate-400 font-mono italic animate-pulse flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Flow intelligence processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts area */}
        {messages.length === 1 && !isSending && (
          <div className="flex-shrink-0 mb-4">
            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block mb-2">Suggested Starting Prompts</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestPrompts.map((p, idx) => (
                <button
                  key={idx}
                  id={`preset-prompt-btn-${idx}`}
                  onClick={() => handleSend(p)}
                  className="text-left p-3 rounded-xl bg-[#151518]/60 hover:bg-[#151518] border border-white/5 text-xs text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between group"
                >
                  <span>{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat entry field */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex-shrink-0 bg-[#0F0F11] border border-white/10 rounded-2xl p-2 flex items-center gap-2"
        >
          <input
            id="chat-input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI productivity coach... (e.g. 'How should I start dataset collection?')"
            disabled={isSending}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-0"
          />
          <button
            id="send-chat-btn"
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Custom Confirmation Modal for Deleting Chat Session */}
      <AnimatePresence>
        {deleteTargetSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              id="confirm-delete-chat-modal"
              className="bg-[#1c1c24] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Delete chat session?</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Are you sure you want to delete <span className="text-slate-200 font-semibold">"{deleteTargetSession.title || 'New Coaching Session'}"</span>? This will permanently delete this conversation history and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  id="cancel-delete-chat-btn"
                  onClick={() => setDeleteTargetSession(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-[#151518] text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-chat-btn"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition-all text-sm font-semibold shadow-lg shadow-rose-950/40"
                >
                  Yes, Delete Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
