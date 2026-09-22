import { useState, useEffect } from 'react';
import DomainSetup from './DomainSetup';
import Inbox from './Inbox';
import ClientIntegration from './ClientIntegration';
import { CollaborationProvider } from './context/CollaborationContext';
import { CollaborationDashboard } from './components/collaboration/CollaborationDashboard';
import { KeyboardShortcutsModal } from './components/ui/KeyboardShortcutsModal';

export function App() {
  const [tab, setTab] = useState<'inbox' | 'collaboration' | 'setup' | 'clients'>('inbox');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CollaborationProvider>
      <div className={`min-h-screen transition-colors duration-300 font-sans ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50/20 to-sky-50 text-zinc-800'}`}>
        
        {/* Background Ambient Aura */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-400/20 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl" />
        </div>

        {/* macOS Style Floating Window Container */}
        <div className="max-w-6xl mx-auto min-h-screen flex flex-col p-2 sm:p-6 lg:p-8">
          
          {/* Main Glassmorphism Window */}
          <div className="flex-1 flex flex-col backdrop-blur-2xl bg-white/70 dark:bg-zinc-900/70 border border-white/60 dark:border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all">
            
            {/* macOS Title Bar Header */}
            <header className="h-14 px-4 sm:px-6 border-b border-zinc-200/50 dark:border-zinc-800/60 flex items-center justify-between backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 select-none">
              
              {/* Traffic Light Window Controls */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 border border-red-500/30 cursor-pointer transition-colors shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 cursor-pointer transition-colors shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-500 border border-emerald-500/30 cursor-pointer transition-colors shadow-sm" />
                <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-2" />
                <div className="flex items-center space-x-2">
                  <span className="text-xl">📬</span>
                  <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">Mailops</span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">Edge 2.0</span>
                </div>
              </div>

              {/* Central Segmented Glass Nav */}
              <nav className="hidden md:flex items-center p-1 bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-md rounded-xl border border-zinc-300/40 dark:border-zinc-700/40 text-xs font-medium">
                <button
                  onClick={() => setTab('inbox')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${tab === 'inbox' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                >
                  📥 Inbox
                </button>
                <button
                  onClick={() => setTab('collaboration')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${tab === 'collaboration' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                >
                  👥 Team
                </button>
                <button
                  onClick={() => setTab('setup')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${tab === 'setup' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                >
                  ⚡ Domain Setup
                </button>
                <button
                  onClick={() => setTab('clients')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${tab === 'clients' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                >
                  🔄 Gmail / Client Sync
                </button>
              </nav>

              {/* Utility Icons (Shortcuts, Dark Mode Toggle) */}
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setIsShortcutsOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 font-mono transition-colors"
                  title="Keyboard Shortcuts (Cmd + /)"
                >
                  ⌘ /
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors"
                  title="Toggle Light/Dark Theme"
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </header>

            {/* Window Main Body */}
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {tab === 'inbox' && <Inbox />}
              {tab === 'collaboration' && <CollaborationDashboard />}
              {tab === 'setup' && <DomainSetup />}
              {tab === 'clients' && <ClientIntegration />}
            </main>

            {/* Mobile Bottom Tab Bar (iPhone / iPad Bottom Navigation) */}
            <div className="md:hidden border-t border-zinc-200/50 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg px-2 py-2 flex justify-around">
              <button
                onClick={() => setTab('inbox')}
                className={`flex flex-col items-center text-[10px] ${tab === 'inbox' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}`}
              >
                <span className="text-base">📥</span>
                <span>Inbox</span>
              </button>
              <button
                onClick={() => setTab('collaboration')}
                className={`flex flex-col items-center text-[10px] ${tab === 'collaboration' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}`}
              >
                <span className="text-base">👥</span>
                <span>Team</span>
              </button>
              <button
                onClick={() => setTab('setup')}
                className={`flex flex-col items-center text-[10px] ${tab === 'setup' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}`}
              >
                <span className="text-base">⚡</span>
                <span>Domain</span>
              </button>
              <button
                onClick={() => setTab('clients')}
                className={`flex flex-col items-center text-[10px] ${tab === 'clients' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500'}`}
              >
                <span className="text-base">🔄</span>
                <span>Sync</span>
              </button>
            </div>

          </div>
        </div>

        {/* Global Shortcuts Modal */}
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    </CollaborationProvider>
  );
}

export default App;
