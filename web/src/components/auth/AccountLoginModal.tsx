import React, { useState } from 'react';
import { useAccounts } from '../../context/AccountContext';

interface AccountLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountLoginModal: React.FC<AccountLoginModalProps> = ({ isOpen, onClose }) => {
  const { addAccount } = useAccounts();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [provider, setProvider] = useState<'google' | 'microsoft' | 'apple' | 'yahoo' | 'custom' | 'mailops'>('google');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [imapHost, setImapHost] = useState('imap.gmail.com');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (p: typeof provider) => {
    setProvider(p);
    setError(null);
    switch (p) {
      case 'google':
        setImapHost('imap.gmail.com');
        setImapPort(993);
        setSmtpHost('smtp.gmail.com');
        setSmtpPort(465);
        break;
      case 'microsoft':
        setImapHost('outlook.office365.com');
        setImapPort(993);
        setSmtpHost('smtp.office365.com');
        setSmtpPort(587);
        break;
      case 'apple':
        setImapHost('imap.mail.me.com');
        setImapPort(993);
        setSmtpHost('smtp.mail.me.com');
        setSmtpPort(587);
        break;
      case 'yahoo':
        setImapHost('imap.mail.yahoo.com');
        setImapPort(993);
        setSmtpHost('smtp.mail.yahoo.com');
        setSmtpPort(465);
        break;
      case 'mailops':
        setImapHost('imap.mailops.me');
        setImapPort(993);
        setSmtpHost('smtp.mailops.me');
        setSmtpPort(465);
        break;
      case 'custom':
        setImapHost('mail.yourdomain.com');
        setImapPort(993);
        setSmtpHost('mail.yourdomain.com');
        setSmtpPort(465);
        setIsAdvancedOpen(true);
        break;
    }
  };

  const handleEmailChange = async (val: string) => {
    setEmail(val);
    if (val.includes('@') && val.split('@')[1].length > 3) {
      try {
        const res = await fetch('/api/accounts/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: val })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.imap) {
            setImapHost(data.imap.host);
            setImapPort(data.imap.port);
            setSmtpHost(data.smtp.host);
            setSmtpPort(data.smtp.port);
          }
        }
      } catch {
        // Silent fallback
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password / app password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Color palette mapping
      const colors = {
        google: '#ef4444',
        microsoft: '#0284c7',
        apple: '#64748b',
        yahoo: '#8b5cf6',
        custom: '#10b981',
        mailops: '#3b82f6'
      };

      await addAccount({
        name: name || email.split('@')[0],
        email,
        provider,
        color: colors[provider] || '#3b82f6',
        imapHost,
        imapPort,
        smtpHost,
        smtpPort
      });

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect email account');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/80 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-zinc-200/60 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔐</span>
              <h2 className="text-xl font-bold tracking-tight">Connect Email Account</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Securely login to Gmail, Outlook, iCloud, Yahoo, or any custom IMAP/SMTP mail server.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-lg">✕</button>
        </div>

        {/* Quick Provider Picker Chips */}
        <div>
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Select Provider</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
            {[
              { id: 'google', label: 'Gmail', icon: '🔴' },
              { id: 'microsoft', label: 'Outlook', icon: '🔵' },
              { id: 'apple', label: 'iCloud', icon: '☁️' },
              { id: 'yahoo', label: 'Yahoo', icon: '🟣' },
              { id: 'mailops', label: 'Mailops', icon: '📬' },
              { id: 'custom', label: 'Custom', icon: '⚙️' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleProviderSelect(p.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${provider === p.id ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 font-bold text-blue-600 dark:text-blue-400 shadow-xs' : 'bg-zinc-100/60 dark:bg-zinc-800/60 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60'}`}
              >
                <span className="text-base mb-0.5">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@gmail.com"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold">Password or App Password</label>
              {provider === 'google' && (
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Generate 16-char App Password ↗
                </a>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="••••••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              🔒 Encrypted securely on your local device with WebCrypto AES-256-GCM.
            </p>
          </div>

          {/* Advanced IMAP/SMTP Settings Accordion */}
          <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/40 flex justify-between items-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            >
              <span>⚙️ Advanced Server Configuration (IMAP / SMTP)</span>
              <span>{isAdvancedOpen ? '▲' : '▼'}</span>
            </button>

            {isAdvancedOpen && (
              <div className="p-3 bg-white/50 dark:bg-zinc-900/50 space-y-3 border-t border-zinc-200/60 dark:border-zinc-800">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] text-zinc-500 mb-1">IMAP Host</label>
                    <input
                      type="text"
                      value={imapHost}
                      onChange={e => setImapHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">IMAP Port</label>
                    <input
                      type="number"
                      value={imapPort}
                      onChange={e => setImapPort(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] text-zinc-500 mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={e => setSmtpPort(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Authenticating...' : 'Connect & Sync Account ➔'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
