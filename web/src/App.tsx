import { useState, useEffect } from 'react';
import { AccountProvider } from './context/AccountContext';
import { MailClientWorkstation } from './components/mail/MailClientWorkstation';
import { KeyboardShortcutsModal } from './components/ui/KeyboardShortcutsModal';

export function App() {
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
    <AccountProvider>
      <div className={`w-screen h-screen h-[100dvh] flex flex-col overflow-hidden transition-colors duration-300 font-sans ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50/20 to-sky-50 text-zinc-800'}`}>
        
        {/* Ambient Aura Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-400/20 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl" />
        </div>

        {/* Full-Screen Workstation Container */}
        <div className="flex-1 w-full h-full flex flex-col backdrop-blur-2xl bg-white/75 dark:bg-zinc-900/75 overflow-hidden shadow-none transition-all">
          
          {/* macOS Title Bar Header */}
          <header className="h-12 shrink-0 px-4 sm:px-5 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between backdrop-blur-xl bg-white/40 dark:bg-zinc-900/40 select-none z-20">
            
            {/* Traffic Light Controls & App Identity */}
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 border border-red-500/30 cursor-pointer transition-colors shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 cursor-pointer transition-colors shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 hover:bg-emerald-500 border border-emerald-500/30 cursor-pointer transition-colors shadow-sm" />
              <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-2" />
              <div className="flex items-center space-x-2">
                <span className="text-lg">📬</span>
                <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-50">Mailops Pro</span>
                <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  Universal Workstation
                </span>
              </div>
            </div>

            {/* Quick Title Notice */}
            <div className="hidden sm:flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Account IMAP/SMTP Keyring Active</span>
            </div>

            {/* Utility Controls */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 font-mono transition-colors text-[11px]"
                title="Keyboard Shortcuts (Cmd + /)"
              >
                ⌘ /
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors"
                title="Toggle Light/Dark Theme"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>

          {/* Full Bleed 3-Pane Workstation */}
          <main className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
            <MailClientWorkstation />
          </main>

        </div>

        {/* Global Shortcuts Modal */}
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </div>
    </AccountProvider>
  );
}

export default App;


