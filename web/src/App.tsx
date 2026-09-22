import { useState, useEffect } from 'react';
import { AccountProvider, useAccounts } from './context/AccountContext';
import { MailClientWorkstation } from './components/mail/MailClientWorkstation';
import { MobileMailClient } from './components/mail/MobileMailClient';
import { AuthScreen } from './components/auth/AuthScreen';
import { KeyboardShortcutsModal } from './components/ui/KeyboardShortcutsModal';
import { MailopsLogo } from './components/ui/MailopsLogo';

function AppContent() {
  const { isAuthenticated } = useAccounts();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'responsive' | 'desktop' | 'mobile'>('responsive');

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

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className={`w-screen h-screen h-[100dvh] flex flex-col overflow-hidden transition-colors duration-300 font-sans ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 text-zinc-100'}`}>
      
      {/* Ambient Sober Aura Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-slate-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-900/10 rounded-full blur-3xl" />
      </div>

      {/* Full-Screen Workstation Container */}
      <div className="flex-1 w-full h-full flex flex-col backdrop-blur-2xl bg-zinc-950/80 overflow-hidden shadow-none transition-all">
        
        {/* macOS Title Bar Header */}
        <header className="h-11 shrink-0 px-3.5 sm:px-5 border-b border-zinc-800/80 flex items-center justify-between backdrop-blur-xl bg-zinc-900/60 select-none z-20">
          
          {/* Traffic Light Controls & App Identity */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-red-500 border border-zinc-600/30 cursor-pointer transition-colors shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-amber-500 border border-zinc-600/30 cursor-pointer transition-colors shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 hover:bg-emerald-500 border border-zinc-600/30 cursor-pointer transition-colors shadow-sm" />
              <div className="h-3.5 w-[1px] bg-zinc-800 mx-2" />
            </div>
            <MailopsLogo size={22} showText={true} />
          </div>

          {/* Quick Status Notice */}
          <div className="hidden md:flex items-center space-x-2 text-[11px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Universal Encrypted Keyring Active</span>
          </div>

          {/* Layout Mode Switcher & Utility Controls */}
          <div className="flex items-center space-x-1.5 text-xs">
            {/* Mobile / Desktop Layout Toggle */}
            <div className="flex items-center p-0.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-[10px]">
              <button
                onClick={() => setViewMode('mobile')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="Mobile Client View"
              >
                📱 Mobile
              </button>
              <button
                onClick={() => setViewMode('desktop')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                title="Desktop 3-Pane Workstation View"
              >
                💻 Desktop
              </button>
            </div>

            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="px-2 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/60 font-mono transition-colors text-[10px]"
              title="Keyboard Shortcuts (Cmd + /)"
            >
              ⌘/
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1 rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/60 transition-colors text-xs"
              title="Toggle Theme"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Viewport Rendering */}
        <main className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
          {viewMode === 'mobile' ? (
            <div className="w-full h-full flex justify-center bg-black/40">
              <div className="w-full max-w-md md:max-w-lg h-full border-x border-zinc-800/60 shadow-2xl overflow-hidden flex flex-col">
                <MobileMailClient />
              </div>
            </div>
          ) : viewMode === 'desktop' ? (
            <MailClientWorkstation />
          ) : (
            <>
              {/* Responsive Layout */}
              <div className="block lg:hidden w-full h-full">
                <MobileMailClient />
              </div>
              <div className="hidden lg:block w-full h-full">
                <MailClientWorkstation />
              </div>
            </>
          )}
        </main>

      </div>

      {/* Global Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <AccountProvider>
      <AppContent />
    </AccountProvider>
  );
}

export default App;
