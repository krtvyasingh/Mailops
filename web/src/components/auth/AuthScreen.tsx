import React, { useState } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { MailopsLogo } from '../ui/MailopsLogo';

export const AuthScreen: React.FC = () => {
  const { login, createNewAccount } = useAccounts();
  const [tab, setTab] = useState<'login' | 'signup' | 'oauth'>('login');
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Create Account State
  const [handle, setHandle] = useState('');
  const [domain, setDomain] = useState('mailops.me');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password or app password.');
      return;
    }

    setIsLoading(true);
    try {
      // Determine provider from domain
      let provider: 'google' | 'microsoft' | 'apple' | 'yahoo' | 'custom' | 'mailops' = 'custom';
      const dom = email.split('@')[1]?.toLowerCase() || '';
      if (dom.includes('gmail.com') || dom.includes('googlemail.com')) provider = 'google';
      else if (dom.includes('outlook.com') || dom.includes('hotmail.com') || dom.includes('live.com') || dom.includes('microsoft.com')) provider = 'microsoft';
      else if (dom.includes('yahoo.com')) provider = 'yahoo';
      else if (dom.includes('icloud.com') || dom.includes('me.com')) provider = 'apple';
      else if (dom.includes('mailops')) provider = 'mailops';

      await login(email, password, provider);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!handle.trim()) {
      setError('Please choose a username handle.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Security passcode must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passcodes do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await createNewAccount(handle, domain, newPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthConnect = async (providerName: 'google' | 'microsoft' | 'yahoo' | 'apple' | 'fastmail') => {
    setIsLoading(true);
    setError(null);
    try {
      const defaultEmails = {
        google: 'user@gmail.com',
        microsoft: 'user@outlook.com',
        yahoo: 'user@yahoo.com',
        apple: 'user@icloud.com',
        fastmail: 'user@fastmail.com'
      };
      await login(defaultEmails[providerName], 'oauth-token', providerName);
    } catch (err: any) {
      setError(err.message || 'OAuth authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-900 text-zinc-100 font-sans relative overflow-hidden select-none">
      
      {/* Sober Obsidian Ambient Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-950/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-800/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Auth Box */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <MailopsLogo size={36} showText={false} />
          <h1 className="text-xl font-bold tracking-tight text-white mt-2">
            Welcome to Mailops
          </h1>
          <p className="text-xs text-zinc-400">
            Universal, zero-leak email client & autonomous workstation
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-800/80 rounded-xl border border-zinc-700/50 text-xs">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-1.5 rounded-lg font-medium transition-all ${tab === 'login' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); }}
            className={`py-1.5 rounded-lg font-medium transition-all ${tab === 'signup' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/70 rounded-xl text-red-300 text-xs flex items-center space-x-2 animate-fadeIn">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Tab: SIGN IN */}
        {tab === 'login' && (
          <div className="space-y-4">
            
            {/* Quick 1-Click Connectors */}
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-400 text-center">
                Sign in with your email provider
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuthConnect('google')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-xl text-xs font-medium transition-all"
                >
                  <span className="text-sm">🔴</span>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthConnect('microsoft')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-xl text-xs font-medium transition-all"
                >
                  <span className="text-sm">🟦</span>
                  <span>Outlook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthConnect('yahoo')}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-xl text-xs font-medium transition-all"
                >
                  <span className="text-sm">🟣</span>
                  <span>Yahoo</span>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink mx-3 text-[11px] text-zinc-500 uppercase tracking-wider">or direct credentials</span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            {/* Direct Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300">Password or App Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Remember session securely</span>
                </label>
                <span className="text-zinc-500">AES-256 Keyring</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <span>Sign In to Mailops</span>
                )}
              </button>
            </form>

          </div>
        )}

        {/* Tab: CREATE ACCOUNT */}
        {tab === 'signup' && (
          <form onSubmit={handleCreateAccount} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Choose Handle & Domain</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder="username"
                  className="flex-1 px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none"
                />
                <span className="text-zinc-500 text-xs">@</span>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="px-2.5 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="mailops.me">mailops.me</option>
                  <option value="custom">Custom Domain</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Security Passcode (Vault Key)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-300">Confirm Passcode</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type passcode"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating WebCrypto Keys...</span>
                </>
              ) : (
                <span>Generate Vault & Create Account</span>
              )}
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center space-x-1">
            <span>🛡️</span>
            <span>Zero Telemetry / Client-Side Encrypted</span>
          </span>
          <span className="font-mono">v2.4 Pro</span>
        </div>

      </div>

    </div>
  );
};
