import React, { useState, useEffect } from 'react';
import { useAccounts, ConnectedAccount } from '../../context/AccountContext';
import { AccountLoginModal } from '../auth/AccountLoginModal';
import DomainSetup from '../../DomainSetup';
import ClientIntegration from '../../ClientIntegration';

export interface EmailItem {
  id: string;
  accountId: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  read: boolean;
  starred?: boolean;
  hasAttachment?: boolean;
  attachments?: Array<{ name: string; size: string; type: string }>;
  sentiment?: 'positive' | 'neutral' | 'urgent' | 'action_required';
  isEncrypted?: boolean;
  isMeetingInvite?: boolean;
  meetingDetails?: { title: string; time: string; location: string };
  authPass?: boolean;
}

const SAMPLE_EMAILS: EmailItem[] = [
  {
    id: 'msg-1',
    accountId: 'acc-mailops-primary',
    fromAddr: 'sarah.connor@acme.corp',
    toAddr: 'krtvyasingh@mailops.me',
    subject: 'Q3 Product Architecture & Sprint Plan Review 🚀',
    textBody: 'Hi team,\n\nPlease find the agenda for our upcoming quarterly sprint planning. We need to finalize the roadmap milestones and sign off on the security review.\n\nAction items for this week:\n1. Review the architecture specification document\n2. Prepare benchmarks on database throughput\n3. Confirm attendance for Friday sync',
    direction: 'inbound',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    read: false,
    starred: true,
    hasAttachment: true,
    attachments: [
      { name: 'Q3_Architecture_Spec.pdf', size: '2.4 MB', type: 'application/pdf' },
      { name: 'Benchmark_Results.xlsx', size: '480 KB', type: 'application/vnd.ms-excel' }
    ],
    sentiment: 'action_required',
    isEncrypted: true,
    isMeetingInvite: true,
    meetingDetails: {
      title: 'Q3 Architecture & Security Sync',
      time: 'Friday, 2:00 PM - 3:00 PM UTC',
      location: 'Google Meet (meet.google.com/xyz-mail)'
    },
    authPass: true
  },
  {
    id: 'msg-2',
    accountId: 'acc-mailops-primary',
    fromAddr: 'security-alerts@github.com',
    toAddr: 'krtvyasingh@mailops.me',
    subject: '[GitHub] Dependabot alert resolved on Mailops repository',
    textBody: 'Good news! All dependencies have passed the latest security scan with zero vulnerabilities and 0 misconfigurations reported by Semgrep & Trivy.',
    direction: 'inbound',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    read: false,
    starred: false,
    sentiment: 'positive',
    isEncrypted: false,
    authPass: true
  },
  {
    id: 'msg-3',
    accountId: 'acc-mailops-primary',
    fromAddr: 'billing@cloudflare.com',
    toAddr: 'krtvyasingh@mailops.me',
    subject: 'Your Cloudflare Zero-Cost Inbound Routing Summary',
    textBody: 'Your domains are currently routing 100% free inbound traffic via Cloudflare Workers without incurring any compute overages. MX, SPF, and DMARC checks are active.',
    direction: 'inbound',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    read: true,
    starred: false,
    sentiment: 'neutral',
    isEncrypted: false,
    authPass: true
  }
];

export const MailClientWorkstation: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccountId, isUnified, removeAccount } = useAccounts();
  const [activeSpace, setActiveSpace] = useState<'mail' | 'calendar' | 'contacts' | 'tasks' | 'domains' | 'settings'>('mail');
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash' | 'unread' | 'attachments'>('inbox');
  
  const [emails, setEmails] = useState<EmailItem[]>(SAMPLE_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(SAMPLE_EMAILS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [remoteImagesAllowed, setRemoteImagesAllowed] = useState(false);
  
  // AI Co-Pilot State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [rsvpState, setRsvpState] = useState<'NONE' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'>('NONE');

  // Composer State
  const [composeFrom, setComposeFrom] = useState(accounts[0]?.email || 'krtvyasingh@mailops.me');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dlpWarning, setDlpWarning] = useState<string | null>(null);
  const [encryptDraft, setEncryptDraft] = useState(true);

  // Real-time DLP check
  useEffect(() => {
    if (/\b(?:\d[ -]*?){13,16}\b/.test(composeBody)) {
      setDlpWarning('⚠️ DLP Shield: Potential Credit Card / Financial PII detected in draft.');
    } else {
      setDlpWarning(null);
    }
  }, [composeBody]);

  // Filter emails by account & folder
  const filteredEmails = emails.filter(e => {
    if (!isUnified && e.accountId !== activeAccountId) return false;
    
    if (activeFolder === 'inbox') { /* show standard inbox */ }
    else if (activeFolder === 'starred') { if (!e.starred) return false; }
    else if (activeFolder === 'unread') { if (e.read) return false; }
    else if (activeFolder === 'attachments') { if (!e.hasAttachment) return false; }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) ||
             e.fromAddr.toLowerCase().includes(q) ||
             e.textBody.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSelectEmail = (email: EmailItem) => {
    setSelectedEmail(email);
    setAiSummary(null);
    setExtractedTasks([]);
    setRsvpState('NONE');
    setRemoteImagesAllowed(false);
    
    // Mark as read
    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, read: true } : m));
  };

  const handleToggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  };

  const handleSummarize = () => {
    if (!selectedEmail) return;
    setIsSummarizing(true);
    setTimeout(() => {
      setAiSummary('The sender requests sign-off on Q3 architecture specifications and sprint roadmap. Key deliverables include DB throughput benchmarks and Friday security sync.');
      setExtractedTasks([
        'Review architecture specification document',
        'Prepare benchmarks on database throughput',
        'Confirm attendance for Friday sync'
      ]);
      setIsSummarizing(false);
    }, 450);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;

    setIsSending(true);
    await new Promise(r => setTimeout(r, 600));

    const newSentEmail: EmailItem = {
      id: `msg-${Date.now()}`,
      accountId: activeAccountId === 'unified' ? accounts[0]?.id : activeAccountId,
      fromAddr: composeFrom,
      toAddr: composeTo,
      subject: composeSubject,
      textBody: composeBody,
      direction: 'outbound',
      createdAt: new Date().toISOString(),
      read: true,
      isEncrypted: encryptDraft,
      authPass: true
    };

    setEmails(prev => [newSentEmail, ...prev]);
    setIsSending(false);
    setIsComposeOpen(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  return (
    <div className="flex w-full h-full min-h-0 overflow-hidden text-zinc-800 dark:text-zinc-100 select-none font-sans">
      
      {/* ========================================================================= */}
      {/* 1. WORKSTATION SPACES RAIL (Far Left Slim Navigation Bar)                 */}
      {/* ========================================================================= */}
      <aside className="w-14 shrink-0 bg-zinc-900/90 dark:bg-black/90 backdrop-blur-2xl border-r border-zinc-800 flex flex-col items-center py-3 justify-between z-30">
        
        {/* Top Space Buttons */}
        <div className="flex flex-col items-center space-y-2.5 w-full">
          {/* Brand Icon */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30 mb-2 cursor-pointer">
            📬
          </div>

          <button
            onClick={() => setActiveSpace('mail')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all relative ${activeSpace === 'mail' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Mail Workstation"
          >
            ✉️
            {emails.filter(e => !e.read).length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-zinc-900" />
            )}
          </button>

          <button
            onClick={() => setActiveSpace('calendar')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeSpace === 'calendar' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Calendar & Agenda (iCal / CalDAV)"
          >
            📅
          </button>

          <button
            onClick={() => setActiveSpace('contacts')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeSpace === 'contacts' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Address Book (CardDAV)"
          >
            📇
          </button>

          <button
            onClick={() => setActiveSpace('tasks')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeSpace === 'tasks' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Extracted Tasks & To-Dos"
          >
            ⚡
          </button>

          <div className="w-6 h-[1px] bg-zinc-800 my-1" />

          {/* Domain & Cloud Infrastructure (The Extras) */}
          <button
            onClick={() => setActiveSpace('domains')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeSpace === 'domains' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Domain & Infrastructure Hub (Extras)"
          >
            🌐
          </button>
        </div>

        {/* Bottom Settings & Connect Account */}
        <div className="flex flex-col items-center space-y-2 w-full">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white flex items-center justify-center text-base transition-all"
            title="Connect Another Email Account (Gmail, Outlook, iCloud, IMAP)"
          >
            ➕
          </button>
          <button
            onClick={() => setActiveSpace('settings')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${activeSpace === 'settings' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            title="Settings & Accounts"
          >
            ⚙️
          </button>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE VIEW ROUTER                                             */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full min-h-0 flex overflow-hidden">
        
        {/* VIEW A: 3-PANE MAIL CLIENT */}
        {activeSpace === 'mail' && (
          <div className="flex-1 w-full h-full min-h-0 grid grid-cols-12 gap-0 overflow-hidden">
            
            {/* PANE 1: FOLDER & ACCOUNT TREE (Width: 3 cols on lg, 4 on md) */}
            <div className="col-span-12 md:col-span-3 lg:col-span-2.5 h-full min-h-0 bg-white/40 dark:bg-zinc-900/60 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between overflow-hidden">
              
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                
                {/* Compose Action Button */}
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>✏️</span>
                  <span>New Message</span>
                </button>

                {/* Connected Accounts Picker */}
                <div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-2 mb-1.5">
                    <span>Accounts</span>
                    <button onClick={() => setIsLoginModalOpen(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
                      + Add
                    </button>
                  </div>
                  
                  <div className="space-y-0.5 text-xs">
                    <button
                      onClick={() => setActiveAccountId('unified')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${isUnified ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span>🌟</span>
                        <span className="truncate">Unified Mailbox</span>
                      </div>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                        {emails.filter(e => !e.read).length}
                      </span>
                    </button>

                    {accounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => setActiveAccountId(acc.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${activeAccountId === acc.id ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                          <span className="truncate">{acc.name}</span>
                        </div>
                        {acc.provider === 'google' && <span className="text-[10px]">🔴</span>}
                        {acc.provider === 'microsoft' && <span className="text-[10px]">🔵</span>}
                        {acc.provider === 'apple' && <span className="text-[10px]">☁️</span>}
                        {acc.provider === 'mailops' && <span className="text-[10px]">📬</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Standard Mail Folders */}
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-2 mb-1.5">
                    Folders
                  </div>
                  <div className="space-y-0.5 text-xs">
                    {[
                      { id: 'inbox', label: 'Inbox', icon: '📥', count: emails.filter(e => !e.read).length },
                      { id: 'starred', label: 'Starred', icon: '⭐️', count: emails.filter(e => e.starred).length },
                      { id: 'sent', label: 'Sent', icon: '📤', count: 0 },
                      { id: 'drafts', label: 'Drafts', icon: '📝', count: 0 },
                      { id: 'archive', label: 'Archive', icon: '🗄️', count: 0 },
                      { id: 'trash', label: 'Trash', icon: '🗑️', count: 0 }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFolder(f.id as any)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${activeFolder === f.id ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{f.icon}</span>
                          <span>{f.label}</span>
                        </div>
                        {f.count > 0 && (
                          <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.2 rounded-full font-mono">
                            {f.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Quick Filters */}
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-2 mb-1.5">
                    Smart Views
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <button
                      onClick={() => setActiveFolder('unread')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-all ${activeFolder === 'unread' ? 'bg-zinc-200/70 dark:bg-zinc-800 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60'}`}
                    >
                      <span>🔵</span>
                      <span>Unread Messages</span>
                    </button>
                    <button
                      onClick={() => setActiveFolder('attachments')}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg transition-all ${activeFolder === 'attachments' ? 'bg-zinc-200/70 dark:bg-zinc-800 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60'}`}
                    >
                      <span>📎</span>
                      <span>Has Attachments</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Storage Indicator */}
              <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] text-zinc-400 space-y-1 bg-white/20 dark:bg-zinc-900/40">
                <div className="flex justify-between items-center">
                  <span>D1 SQLite Storage</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Free</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="w-[12%] h-full bg-blue-500 rounded-full" />
                </div>
              </div>

            </div>

            {/* PANE 2: THREAD & MESSAGE LIST (Width: 4 cols on lg, 4 on md) */}
            <div className="col-span-12 md:col-span-4 lg:col-span-3.5 h-full min-h-0 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl border-r border-zinc-200/60 dark:border-zinc-800 flex flex-col overflow-hidden">
              
              {/* Search & Quick Filter Toolbar */}
              <div className="p-2.5 border-b border-zinc-200/60 dark:border-zinc-800 space-y-2 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search mail, from, subject..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1.5 text-xs text-zinc-400">✕</button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-semibold capitalize">{activeFolder} ({filteredEmails.length})</span>
                  <span className="text-[10px] font-mono text-zinc-400">Sorted by Date ▼</span>
                </div>
              </div>

              {/* Message Cards List */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
                {filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                    <span className="text-2xl">📭</span>
                    <p>No messages found in this folder.</p>
                  </div>
                ) : (
                  filteredEmails.map(email => (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`p-3.5 cursor-pointer transition-all ${selectedEmail?.id === email.id ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600' : 'hover:bg-white/60 dark:hover:bg-zinc-800/40'} ${!email.read ? 'font-semibold' : ''}`}
                    >
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center space-x-1.5 truncate max-w-[170px]">
                          {!email.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span className="text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {email.fromAddr.split('@')[0]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={(e) => handleToggleStar(e, email.id)}
                            className="text-xs text-zinc-400 hover:text-amber-400"
                          >
                            {email.starred ? '⭐️' : '☆'}
                          </button>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-800 dark:text-zinc-200 truncate mb-1">
                        {email.subject}
                      </div>

                      <div className="text-[11px] text-zinc-500 line-clamp-1 mb-2 font-normal">
                        {email.textBody}
                      </div>

                      {/* Badges Bar */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {email.isEncrypted && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono">
                            🔒 PGP
                          </span>
                        )}
                        {email.isMeetingInvite && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                            📅 Invite
                          </span>
                        )}
                        {email.hasAttachment && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            📎 {email.attachments?.length || 1}
                          </span>
                        )}
                        {email.sentiment === 'action_required' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                            ⚡ Urgent
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* PANE 3: RICH MESSAGE READER & AI CO-PILOT (Flex-1) */}
            <div className="col-span-12 md:col-span-5 lg:col-span-6 h-full min-h-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl flex flex-col overflow-hidden">
              {selectedEmail ? (
                <div className="flex-1 flex flex-col h-full min-h-0 p-5 space-y-4 overflow-y-auto">
                  
                  {/* Header Bar */}
                  <div className="border-b border-zinc-200/60 dark:border-zinc-800 pb-4 space-y-3 shrink-0">
                    <div className="flex justify-between items-start gap-3">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                        {selectedEmail.subject}
                      </h2>
                      
                      {/* Action Toolbar */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={handleSummarize}
                          disabled={isSummarizing}
                          className="px-3 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 rounded-xl hover:bg-indigo-100 transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <span>✨</span>
                          <span>{isSummarizing ? 'Analyzing...' : 'AI TL;DR'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setComposeTo(selectedEmail.fromAddr);
                            setComposeSubject(`Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`);
                            setIsComposeOpen(true);
                          }}
                          className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                        >
                          ↩️ Reply
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                          {selectedEmail.fromAddr[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedEmail.fromAddr}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            to {selectedEmail.toAddr}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px]">
                        {new Date(selectedEmail.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Security & Authenticity Banner */}
                  <div className="flex flex-wrap items-center justify-between p-2.5 bg-zinc-100/60 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 SPF / DKIM / DMARC Pass</span>
                      <span>•</span>
                      <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">WebCrypto AES-256 Validated</span>
                    </div>
                    {!remoteImagesAllowed ? (
                      <button
                        onClick={() => setRemoteImagesAllowed(true)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        🛡️ Privacy Shield Active (Load Remote Images)
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-semibold">Images Loaded</span>
                    )}
                  </div>

                  {/* Meeting Invite / RSVP Bar */}
                  {selectedEmail.isMeetingInvite && selectedEmail.meetingDetails && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1.5">
                          <span>📅 Meeting Invitation:</span>
                          <span>{selectedEmail.meetingDetails.title}</span>
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {selectedEmail.meetingDetails.time}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300">
                        📍 {selectedEmail.meetingDetails.location}
                      </div>
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[11px] font-semibold text-zinc-500">RSVP:</span>
                        <button
                          onClick={() => setRsvpState('ACCEPTED')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${rsvpState === 'ACCEPTED' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                        >
                          Accept ✅
                        </button>
                        <button
                          onClick={() => setRsvpState('TENTATIVE')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${rsvpState === 'TENTATIVE' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                        >
                          Tentative ⏳
                        </button>
                        <button
                          onClick={() => setRsvpState('DECLINED')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${rsvpState === 'DECLINED' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}
                        >
                          Decline ❌
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI Executive Summary & Extracted Action Items Deck */}
                  {aiSummary && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/70 rounded-2xl space-y-3">
                      <div>
                        <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5 mb-1">
                          <span>✨ AI Executive Summary</span>
                        </div>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {aiSummary}
                        </p>
                      </div>

                      {extractedTasks.length > 0 && (
                        <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                          <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
                            🎯 Extracted Action Items:
                          </div>
                          <div className="space-y-1">
                            {extractedTasks.map((t, idx) => (
                              <label key={idx} className="flex items-center space-x-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                <input type="checkbox" className="rounded text-blue-600" />
                                <span>{t}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed py-2 font-sans">
                    {selectedEmail.textBody}
                  </div>

                  {/* Attachments Deck */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="border-t border-zinc-200/60 dark:border-zinc-800 pt-3 space-y-2">
                      <span className="text-xs font-bold text-zinc-500">
                        Attachments ({selectedEmail.attachments.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedEmail.attachments.map((att, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs">
                            <div className="truncate pr-2">
                              <div className="font-semibold truncate">{att.name}</div>
                              <div className="text-[10px] text-zinc-400">{att.size}</div>
                            </div>
                            <button
                              onClick={() => alert(`Downloading ${att.name}...`)}
                              className="px-2.5 py-1 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-blue-50 font-semibold"
                            >
                              Download ⬇️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contextual Smart Reply Chips */}
                  <div className="border-t border-zinc-200/60 dark:border-zinc-800 pt-3 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quick Reply:</span>
                    {[
                      '"Signed off! Looks good to proceed."',
                      '"I have completed the benchmark tests."',
                      '"Let us sync on Friday at 2 PM."'
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setComposeTo(selectedEmail.fromAddr);
                          setComposeSubject(`Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`);
                          setComposeBody(chip.replace(/^"|"$/g, ''));
                          setIsComposeOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs bg-white/70 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs space-y-2">
                  <span className="text-3xl">📬</span>
                  <span>Select an email from the conversation list</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW B: CALENDAR & AGENDA */}
        {activeSpace === 'calendar' && (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold">📅 Calendar & iCal Schedule</h2>
                <p className="text-xs text-zinc-500">RFC 5545 iCalendar Synchronization & RSVP Manager</p>
              </div>
              <button
                onClick={() => alert('New Event modal')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
              >
                + Schedule Event
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/70 dark:bg-zinc-900/70 border border-white/80 dark:border-zinc-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-blue-600">FRIDAY, SEPT 25</span>
                <h4 className="font-bold text-sm">Q3 Architecture & Security Sync</h4>
                <p className="text-xs text-zinc-500">2:00 PM - 3:00 PM UTC • Google Meet</p>
                <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Accepted</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW C: ADDRESS BOOK (CARDDAV) */}
        {activeSpace === 'contacts' && (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold">📇 Address Book & Contacts</h2>
                <p className="text-xs text-zinc-500">RFC 6352 CardDAV & vCard 4.0 Directory</p>
              </div>
              <button
                onClick={() => alert('Add Contact modal')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
              >
                + New Contact
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {[
                { name: 'Sarah Connor', email: 'sarah.connor@acme.corp', org: 'Acme Corp', role: 'VP Engineering' },
                { name: 'Alex Johnson', email: 'alex@enterprise.com', org: 'Enterprise Inc', role: 'Security Architect' },
                { name: 'Cloudflare Support', email: 'support@cloudflare.com', org: 'Cloudflare Inc', role: 'Edge Infrastructure' }
              ].map((c, i) => (
                <div key={i} className="p-4 bg-white/70 dark:bg-zinc-900/70 border border-white/80 dark:border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                      {c.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{c.name}</div>
                      <div className="text-zinc-500">{c.role} • {c.org}</div>
                    </div>
                  </div>
                  <div className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">{c.email}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW D: EXTRACTED TASKS */}
        {activeSpace === 'tasks' && (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto space-y-4">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xl font-bold">⚡ AI Extracted Tasks & Action Items</h2>
              <p className="text-xs text-zinc-500">Autonomous NLP action item tracker parsed from inbound email threads</p>
            </div>

            <div className="max-w-2xl space-y-2 text-xs">
              {[
                { task: 'Review architecture specification document', from: 'sarah.connor@acme.corp', due: 'Tomorrow' },
                { task: 'Prepare benchmarks on database throughput', from: 'sarah.connor@acme.corp', due: 'Thursday' },
                { task: 'Confirm attendance for Friday sync', from: 'sarah.connor@acme.corp', due: 'Friday' }
              ].map((t, idx) => (
                <div key={idx} className="p-3 bg-white/70 dark:bg-zinc-900/70 border border-white/80 dark:border-zinc-800 rounded-xl flex justify-between items-center">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="rounded text-blue-600" />
                    <span className="font-semibold">{t.task}</span>
                  </label>
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500">
                    Due {t.due}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW E: DOMAIN & INFRASTRUCTURE HUB (THE EXTRAS) */}
        {activeSpace === 'domains' && (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto space-y-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                Advanced Power Tools (Extras)
              </span>
              <h2 className="text-2xl font-bold mt-1">Domain & Cloudflare Infrastructure Hub</h2>
              <p className="text-xs text-zinc-500">
                Manage custom domains, claim free handles, and configure automated email routing without server costs.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DomainSetup />
              <ClientIntegration />
            </div>
          </div>
        )}

        {/* VIEW F: SETTINGS & ACCOUNT MANAGEMENT */}
        {activeSpace === 'settings' && (
          <div className="flex-1 w-full h-full p-6 overflow-y-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold">⚙️ Accounts & Security Settings</h2>
              <p className="text-xs text-zinc-500">Manage connected mail providers, encryption keyrings, and signatures</p>
            </div>

            <div className="max-w-2xl space-y-4 text-xs">
              <div className="p-4 bg-white/70 dark:bg-zinc-900/70 border border-white/80 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">Connected Email Accounts</span>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                  >
                    + Connect Account
                  </button>
                </div>

                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {accounts.map(acc => (
                    <div key={acc.id} className="py-3 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">{acc.name}</div>
                        <div className="text-zinc-500 font-mono text-[11px]">{acc.email} ({acc.imapHost}:{acc.imapPort})</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                          Connected
                        </span>
                        {accounts.length > 1 && (
                          <button
                            onClick={() => removeAccount(acc.id)}
                            className="text-rose-600 hover:underline text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS (ACCOUNT LOGIN & RICH COMPOSER)                                 */}
      {/* ========================================================================= */}
      <AccountLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Rich Composer Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/80 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs">
            
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✏️</span>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Mailops Pro Composer</h3>
              </div>
              <button onClick={() => setIsComposeOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-base">✕</button>
            </div>

            {dlpWarning && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
                {dlpWarning}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3">
              {/* Identity Selector */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">From (Identity):</label>
                  <select
                    value={composeFrom}
                    onChange={e => setComposeFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-[11px]"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.email}>{a.name} &lt;{a.email}&gt;</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-zinc-400 mb-1">To:</label>
                  <input
                    type="email"
                    required
                    placeholder="recipient@example.com"
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>

              <div>
                <textarea
                  rows={8}
                  required
                  placeholder="Write your email body..."
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-sans"
                />
              </div>

              {/* Bottom Security Options & Action Buttons */}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                <label className="flex items-center space-x-2 text-[11px] text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encryptDraft}
                    onChange={e => setEncryptDraft(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>🔒 Autocrypt PGP Encryption</span>
                </label>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSending ? 'Dispatching...' : 'Send Message ➔'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
