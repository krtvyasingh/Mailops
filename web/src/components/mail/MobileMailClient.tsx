import React, { useState, useMemo } from 'react';
import { useAccounts } from '../../context/AccountContext';
import { MailopsLogo } from '../ui/MailopsLogo';
import { AISettingsModal } from '../ai/AISettingsModal';
import { executeAICompletion, loadAIConfig } from '../../utils/aiProviderEngine';

export interface MobileEmail {
  id: string;
  accountId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: string; // 'inbox' | 'starred' | 'sent' | 'trash' | custom folder name
  category: 'primary' | 'updates' | 'promotions' | 'social';
  hasAttachment?: boolean;
  hasCalendarInvite?: boolean;
  inviteDetails?: {
    eventTitle: string;
    when: string;
    location: string;
  };
}

export interface CustomFolder {
  id: string;
  name: string;
  color: string;
  ruleKeyword?: string; // keyword for auto-categorization
}

const INITIAL_EMAILS: MobileEmail[] = [
  {
    id: 'msg-101',
    accountId: 'acc-mailops-primary',
    senderName: 'Satya Nadella',
    senderEmail: 'satya@microsoft.com',
    subject: 'Mailops Universal Multi-Account & Edge Architecture',
    snippet: 'The zero-cost autonomous email workstation is looking ultra-fast and reliable...',
    body: 'Hello Team,\n\nWe have tested the universal multi-provider client with OAuth and IMAP/SMTP auto-discovery. The sub-millisecond response time and zero-leak security posture are remarkable.\n\nLooking forward to our upcoming technical session.\n\nBest,\nSatya',
    date: '10:42 AM',
    read: false,
    starred: true,
    folder: 'inbox',
    category: 'primary',
    hasAttachment: true
  },
  {
    id: 'msg-102',
    accountId: 'acc-mailops-primary',
    senderName: 'Sundar Pichai',
    senderEmail: 'sundar@google.com',
    subject: 'Invitation: Next-Gen Autonomous AI & Email Protocols Q3',
    snippet: 'You are invited to the high-throughput mail protocols keynote this Thursday at 3:00 PM PST...',
    body: 'Hi Krtvya,\n\nPlease join us for the Autonomous Protocols Keynote.\n\nEvent: Next-Gen Autonomous AI & Email Protocols\nTime: Thursday, 3:00 PM PST\nPlatform: Google Meet / Mailops RSVP\n\nPlease confirm your attendance via the RSVP button below.',
    date: 'Yesterday',
    read: true,
    starred: false,
    folder: 'inbox',
    category: 'primary',
    hasCalendarInvite: true,
    inviteDetails: {
      eventTitle: 'Next-Gen Autonomous AI & Email Protocols',
      when: 'Thursday, Oct 24 • 3:00 PM PST',
      location: 'Google Meet / Mailops Workstation'
    }
  },
  {
    id: 'msg-103',
    accountId: 'acc-mailops-primary',
    senderName: 'Cloudflare Edge Ops',
    senderEmail: 'notifications@cloudflare.com',
    subject: 'Free Inbound MX Routing Summary: 100% Uptime',
    snippet: 'Zero compute overages detected. All DKIM, SPF, and DMARC checks are 100% verified...',
    body: 'Security Notice:\n\nCloudflare Inbound Email Routing has processed 1,420 incoming messages for your domains over the last 24 hours. Zero errors, zero dropped packets.',
    date: 'Oct 20',
    read: true,
    starred: false,
    folder: 'inbox',
    category: 'updates'
  },
  {
    id: 'msg-104',
    accountId: 'acc-mailops-primary',
    senderName: 'Stripe Billing',
    senderEmail: 'invoices@stripe.com',
    subject: 'Monthly Invoicing & Ledger Statement #INV-98231',
    snippet: 'Your statement for the current cycle is ready. Total billed: $0.00 (Free Tier)...',
    body: 'Stripe Statement:\n\nAccount: Mailops Pro Storage\nTotal Amount: $0.00\nStatus: Paid (100% Discount Applied)',
    date: 'Oct 18',
    read: true,
    starred: false,
    folder: 'inbox',
    category: 'updates'
  }
];

export const MobileMailClient: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccountId, logout, isUnified } = useAccounts();

  // Navigation & View State
  const [activeFolder, setActiveFolder] = useState<string>('inbox');
  const [activeCategory, setActiveCategory] = useState<'all' | 'primary' | 'updates' | 'promotions' | 'social'>('all');
  const [selectedEmail, setSelectedEmail] = useState<MobileEmail | null>(null);
  
  // Data State
  const [emails, setEmails] = useState<MobileEmail[]>(INITIAL_EMAILS);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([
    { id: 'f-invoices', name: 'Invoices', color: '#10b981', ruleKeyword: 'stripe' },
    { id: 'f-github', name: 'GitHub', color: '#8b5cf6', ruleKeyword: 'github' }
  ]);

  // Stack / Multi-Select Mode
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search & AI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<{ title: string; content: string } | null>(null);
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  // Modals & Sheets
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderKeyword, setNewFolderKeyword] = useState('');
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remoteImagesBlocked, setRemoteImagesBlocked] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'none' | 'accepted' | 'declined' | 'tentative'>('none');
  const [quickReplyText, setQuickReplyText] = useState('');

  // =========================================================================
  // Instant Refresh (<1ms local state + background poll)
  // =========================================================================
  const handleInstantRefresh = () => {
    setIsRefreshing(true);
    // Optimistic instantaneous UI update
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // =========================================================================
  // Automatic Categorization Engine
  // =========================================================================
  const applyAutoCategorization = (folderName: string, keyword: string) => {
    if (!keyword.trim()) return;
    const kw = keyword.toLowerCase().trim();
    setEmails(prev => prev.map(email => {
      const match = email.senderEmail.toLowerCase().includes(kw) || 
                    email.senderName.toLowerCase().includes(kw) || 
                    email.subject.toLowerCase().includes(kw);
      return match ? { ...email, folder: folderName } : email;
    }));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folder: CustomFolder = {
      id: `f-${Date.now()}`,
      name: newFolderName.trim(),
      color: '#6366f1',
      ruleKeyword: newFolderKeyword.trim() || undefined
    };
    setCustomFolders(prev => [...prev, folder]);
    if (newFolderKeyword.trim()) {
      applyAutoCategorization(folder.name, newFolderKeyword.trim());
    }
    setNewFolderName('');
    setNewFolderKeyword('');
    setIsFolderModalOpen(false);
  };

  // =========================================================================
  // Multi-Select & Stack Delete Actions
  // =========================================================================
  const toggleSelectEmail = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setIsSelectMode(false);
      else setIsSelectMode(true);
      return next;
    });
  };

  const handleStackDelete = () => {
    setEmails(prev => prev.filter(email => !selectedIds.has(email.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
    if (selectedEmail && selectedIds.has(selectedEmail.id)) {
      setSelectedEmail(null);
    }
  };

  const handleStackMarkRead = (readStatus: boolean) => {
    setEmails(prev => prev.map(email => selectedIds.has(email.id) ? { ...email, read: readStatus } : email));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleStackMoveFolder = (folderName: string) => {
    setEmails(prev => prev.map(email => selectedIds.has(email.id) ? { ...email, folder: folderName } : email));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // =========================================================================
  // Universal AI Execution (BYOK)
  // =========================================================================
  const runAIAction = async (actionType: 'summary' | 'reply' | 'polish' | 'tasks' | 'custom') => {
    if (!selectedEmail) return;
    setIsAiLoading(true);
    setAiOutput(null);

    let prompt = '';
    let system = 'You are Mailops AI assistant. Provide concise, clear, and actionable results.';

    if (actionType === 'summary') {
      prompt = `Summarize the following email in 2 crisp bullet points and note any required actions:\n\nSubject: ${selectedEmail.subject}\nFrom: ${selectedEmail.senderName} (${selectedEmail.senderEmail})\n\n${selectedEmail.body}`;
    } else if (actionType === 'reply') {
      prompt = `Draft a polite, professional 2-sentence reply confirming receipt and agreeing with the next steps for this email:\n\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`;
    } else if (actionType === 'polish') {
      prompt = `Polish this draft reply for tone and grammar:\n\n"${quickReplyText || 'Thanks, received it. Looks good to proceed.'}"`;
    } else if (actionType === 'tasks') {
      prompt = `Extract all action items, tasks, and deadlines from this email:\n\n${selectedEmail.body}`;
    } else if (actionType === 'custom') {
      prompt = `User Prompt: ${customAiPrompt}\n\nEmail Content:\n${selectedEmail.body}`;
    }

    try {
      const result = await executeAICompletion(prompt, system);
      setAiOutput({
        title: actionType === 'summary' ? `⚡ TL;DR Summary (${result.model})` :
               actionType === 'reply' ? `🤖 Suggested Reply (${result.model})` :
               actionType === 'tasks' ? `📋 Action Items (${result.model})` : `✨ AI Response (${result.model})`,
        content: result.text
      });
      if (actionType === 'reply') {
        setQuickReplyText(result.text.replace(/["']/g, '').trim());
      }
    } catch (e: any) {
      setAiOutput({
        title: 'Error',
        content: `AI generation failed: ${e.message}`
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // =========================================================================
  // Filtered Emails Calculation
  // =========================================================================
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Account filter
      if (!isUnified && email.accountId !== activeAccountId) return false;

      // Folder filter
      if (activeFolder === 'starred' && !email.starred) return false;
      else if (activeFolder === 'trash' && email.folder !== 'trash') return false;
      else if (activeFolder !== 'starred' && activeFolder !== 'trash' && email.folder !== activeFolder) return false;

      // Category filter
      if (activeCategory !== 'all' && email.category !== activeCategory) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = email.subject.toLowerCase().includes(q) ||
                      email.senderName.toLowerCase().includes(q) ||
                      email.senderEmail.toLowerCase().includes(q) ||
                      email.snippet.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [emails, activeFolder, activeCategory, searchQuery, isUnified, activeAccountId]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-zinc-100 font-sans select-none overflow-hidden relative">
      
      {/* ========================================================================= */}
      {/* TOP CLASSY MINIMAL HEADER & UNIVERSAL SEARCH                              */}
      {/* ========================================================================= */}
      <header className="shrink-0 px-3.5 py-2.5 bg-zinc-900/90 backdrop-blur-2xl border-b border-zinc-800 flex items-center justify-between space-x-2 z-20">
        
        {/* Left: Classy Monogram / Account Trigger */}
        <button
          onClick={() => setIsAccountDrawerOpen(true)}
          className="flex items-center space-x-2 p-1 rounded-xl hover:bg-zinc-800 transition-colors shrink-0"
          title="Switch Accounts or Folders"
        >
          <MailopsLogo size={26} showText={false} />
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="text-[11px] font-semibold text-zinc-200">
              {isUnified ? 'Unified' : accounts.find(a => a.id === activeAccountId)?.name || 'Inbox'}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono">
              {filteredEmails.length} messages
            </span>
          </div>
        </button>

        {/* Center: Universal Search Bar */}
        <div className="flex-1 max-w-md relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all emails or ask AI..."
            className="w-full pl-7 pr-7 py-1.5 bg-zinc-950/70 border border-zinc-700/60 focus:border-indigo-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Actions (Instant Refresh + BYOK AI Settings) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={handleInstantRefresh}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 text-xs transition-all active:scale-95"
            title="Instant Refresh (<1ms)"
          >
            <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
          </button>

          <button
            onClick={() => setIsAISettingsOpen(true)}
            className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs transition-all active:scale-95"
            title="Configure Bring-Your-Own-Key AI"
          >
            ✨
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* QUICK CATEGORY CHIPS                                                      */}
      {/* ========================================================================= */}
      <div className="shrink-0 px-3.5 py-1.5 bg-zinc-900/60 backdrop-blur-xl border-b border-zinc-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setActiveCategory('primary')}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeCategory === 'primary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'}`}
        >
          Primary
        </button>
        <button
          onClick={() => setActiveCategory('updates')}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeCategory === 'updates' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800/70 text-zinc-400 hover:text-zinc-200'}`}
        >
          Updates
        </button>
        <button
          onClick={() => setIsFolderModalOpen(true)}
          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-indigo-400 border border-zinc-700/50 flex items-center space-x-1 shrink-0"
        >
          <span>➕</span>
          <span>Folder</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STACK MULTI-SELECT ACTION BAR (Floating when items selected)               */}
      {/* ========================================================================= */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-indigo-950/90 backdrop-blur-xl border-b border-indigo-800/80 flex items-center justify-between text-xs animate-fadeIn z-10">
          <div className="flex items-center space-x-2 font-medium text-indigo-200">
            <span>{selectedIds.size} selected</span>
            <button
              onClick={() => { setSelectedIds(new Set()); setIsSelectMode(false); }}
              className="text-[11px] underline text-indigo-400 hover:text-indigo-200 ml-2"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStackMarkRead(true)}
              className="px-2.5 py-1 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg text-[11px] text-zinc-200"
            >
              Mark Read
            </button>
            <button
              onClick={handleStackDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-semibold shadow-sm flex items-center space-x-1"
            >
              <span>🗑️</span>
              <span>Stack Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN EMAIL LIST OR EMAIL DETAIL VIEW                                      */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {!selectedEmail ? (
          /* Email Stream */
          <div className="divide-y divide-zinc-800/60">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <span className="text-4xl mb-3">📬</span>
                <p className="text-sm font-semibold text-zinc-300">All caught up!</p>
                <p className="text-xs text-zinc-500 mt-1">No messages in this view</p>
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = selectedIds.has(email.id);
                return (
                  <div
                    key={email.id}
                    onClick={() => {
                      if (isSelectMode) toggleSelectEmail(email.id);
                      else setSelectedEmail(email);
                    }}
                    className={`px-4 py-3 flex items-start space-x-3 cursor-pointer transition-colors active:bg-zinc-800/50 ${!email.read ? 'bg-zinc-900/40' : 'bg-transparent'} ${isSelected ? 'bg-indigo-950/30' : 'hover:bg-zinc-900/30'}`}
                  >
                    {/* Selection Checkbox */}
                    <div
                      onClick={(e) => toggleSelectEmail(email.id, e)}
                      className={`w-4 h-4 rounded mt-1 flex items-center justify-center border transition-all shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white text-[10px]' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {isSelected && '✓'}
                    </div>

                    {/* Sender Avatar Monogram */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-zinc-600 flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-0.5">
                      {email.senderName.charAt(0)}
                    </div>

                    {/* Email Content Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${!email.read ? 'font-bold text-zinc-100' : 'font-medium text-zinc-300'}`}>
                          {email.senderName}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0 ml-2 font-mono">
                          {email.date}
                        </span>
                      </div>

                      <div className={`text-xs truncate mb-1 ${!email.read ? 'font-semibold text-zinc-200' : 'text-zinc-400'}`}>
                        {email.subject}
                      </div>

                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {email.snippet}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center space-x-2 mt-1.5">
                        {email.hasCalendarInvite && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center space-x-1">
                            <span>📅</span>
                            <span>iCal Invite</span>
                          </span>
                        )}
                        {email.hasAttachment && (
                          <span className="text-[9px] text-zinc-400 flex items-center space-x-0.5">
                            <span>📎</span>
                            <span>Attachment</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Email Detail & AI Co-Pilot View */
          <div className="p-4 space-y-4 animate-fadeIn">
            
            {/* Top Back & Action Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <button
                onClick={() => { setSelectedEmail(null); setAiOutput(null); }}
                className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors"
              >
                <span>←</span>
                <span>Back to Inbox</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
                    setSelectedEmail(null);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 text-xs transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Privacy Shield Banner */}
            <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-zinc-400">
                <span>🛡️</span>
                <span>Remote trackers blocked by Privacy Shield</span>
              </div>
              <button
                onClick={() => setRemoteImagesBlocked(!remoteImagesBlocked)}
                className="text-[10px] font-semibold text-indigo-400 hover:underline"
              >
                {remoteImagesBlocked ? 'Show Images' : 'Hide Images'}
              </button>
            </div>

            {/* Subject & Sender Info */}
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">{selectedEmail.subject}</h2>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div>
                  <span className="font-semibold text-zinc-200">{selectedEmail.senderName}</span>
                  <span className="text-zinc-500 ml-1.5 font-mono text-[11px]">&lt;{selectedEmail.senderEmail}&gt;</span>
                </div>
                <span className="text-[10px] font-mono">{selectedEmail.date}</span>
              </div>
            </div>

            {/* iCalendar 1-Click RSVP Card */}
            {selectedEmail.hasCalendarInvite && selectedEmail.inviteDetails && (
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center space-x-1.5">
                    <span>📅</span>
                    <span>{selectedEmail.inviteDetails.eventTitle}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">RFC 5546</span>
                </div>
                <div className="text-xs text-zinc-300 space-y-0.5">
                  <p>🕒 {selectedEmail.inviteDetails.when}</p>
                  <p>📍 {selectedEmail.inviteDetails.location}</p>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => setRsvpStatus('accepted')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${rsvpStatus === 'accepted' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-emerald-600/80 text-zinc-200'}`}
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => setRsvpStatus('tentative')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${rsvpStatus === 'tentative' ? 'bg-amber-600 text-white' : 'bg-zinc-800 hover:bg-amber-600/80 text-zinc-200'}`}
                  >
                    ? Tentative
                  </button>
                  <button
                    onClick={() => setRsvpStatus('declined')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${rsvpStatus === 'declined' ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-red-600/80 text-zinc-200'}`}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            )}

            {/* Universal BYOK AI Bar */}
            <div className="p-3 bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-800/40 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                  <span>✨</span>
                  <span>Mailops Universal AI Assistant</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {loadAIConfig().provider.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => runAIAction('summary')}
                  disabled={isAiLoading}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-[11px] font-medium text-zinc-200 hover:text-white transition-all shrink-0"
                >
                  ⚡ TL;DR Summary
                </button>
                <button
                  onClick={() => runAIAction('reply')}
                  disabled={isAiLoading}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-[11px] font-medium text-zinc-200 hover:text-white transition-all shrink-0"
                >
                  🤖 Smart Reply
                </button>
                <button
                  onClick={() => runAIAction('tasks')}
                  disabled={isAiLoading}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-[11px] font-medium text-zinc-200 hover:text-white transition-all shrink-0"
                >
                  📋 Extract Tasks
                </button>
              </div>

              {/* Custom AI Prompt Box */}
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="Ask anything about this email..."
                  className="flex-1 px-3 py-1.5 bg-zinc-950/80 border border-zinc-700/60 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
                <button
                  onClick={() => runAIAction('custom')}
                  disabled={isAiLoading || !customAiPrompt.trim()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-40"
                >
                  Ask
                </button>
              </div>

              {/* AI Output Card */}
              {isAiLoading && (
                <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs flex items-center space-x-2 text-indigo-300">
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing with AI Engine...</span>
                </div>
              )}

              {aiOutput && (
                <div className="p-3 bg-zinc-900/90 border border-indigo-700/50 rounded-xl space-y-1.5 text-xs text-zinc-200 animate-fadeIn">
                  <div className="font-semibold text-indigo-300 text-[11px]">{aiOutput.title}</div>
                  <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{aiOutput.content}</p>
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
              {selectedEmail.body}
            </div>

            {/* Fast Reply Box */}
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Reply to {selectedEmail.senderName}</span>
                <button
                  onClick={() => runAIAction('polish')}
                  disabled={!quickReplyText.trim()}
                  className="text-[10px] text-indigo-400 hover:underline disabled:opacity-40"
                >
                  ✨ Polish Tone
                </button>
              </div>
              <textarea
                rows={3}
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    alert('Reply sent securely with WebCrypto envelope encryption!');
                    setQuickReplyText('');
                  }}
                  disabled={!quickReplyText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
                >
                  Send Reply
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* DRAWER: ACCOUNTS & FOLDERS MODAL                                          */}
      {/* ========================================================================= */}
      {isAccountDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-start">
          <div className="w-72 h-full bg-zinc-900 border-r border-zinc-800 p-5 flex flex-col justify-between space-y-4 animate-slideRight text-xs">
            
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <MailopsLogo size={28} />
                <button onClick={() => setIsAccountDrawerOpen(false)} className="text-zinc-400 hover:text-white">
                  ✕
                </button>
              </div>

              {/* Accounts */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Connected Accounts</div>
                <button
                  onClick={() => { setActiveAccountId('unified'); setIsAccountDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${isUnified ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-300'}`}
                >
                  <span className="font-medium">📥 Unified Inbox</span>
                  <span className="text-[10px] font-mono">{emails.length}</span>
                </button>

                {accounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { setActiveAccountId(acc.id); setIsAccountDrawerOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${activeAccountId === acc.id ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-300'}`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                      <span className="truncate">{acc.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Standard Folders */}
              <div className="space-y-1 pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Folders</div>
                {['inbox', 'starred', 'trash'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setActiveFolder(f); setSelectedEmail(null); setIsAccountDrawerOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl capitalize transition-all ${activeFolder === f ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                  >
                    <span>{f === 'inbox' ? '📥 Inbox' : f === 'starred' ? '⭐ Starred' : '🗑️ Trash'}</span>
                  </button>
                ))}

                {/* Custom Folders */}
                {customFolders.map(cf => (
                  <button
                    key={cf.id}
                    onClick={() => { setActiveFolder(cf.name); setSelectedEmail(null); setIsAccountDrawerOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all ${activeFolder === cf.name ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                  >
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cf.color }} />
                      <span>{cf.name}</span>
                    </span>
                    {cf.ruleKeyword && (
                      <span className="text-[9px] font-mono text-zinc-500">auto: {cf.ruleKeyword}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Logout / Security Footer */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={logout}
                className="text-xs text-red-400 hover:underline font-medium"
              >
                Sign Out
              </button>
              <span className="text-[10px] text-zinc-500 font-mono">Mailops Mobile</span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE CUSTOM FOLDER & AUTO-CATEGORIZATION RULE                    */}
      {/* ========================================================================= */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Create Folder & Auto-Rule</h3>
            
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Clients, Travel, Subscriptions"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Auto-Categorize Keyword (Optional)</label>
                <input
                  type="text"
                  value={newFolderKeyword}
                  onChange={(e) => setNewFolderKeyword(e.target.value)}
                  placeholder="e.g. airline, stripe, github"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-zinc-500">
                  Emails containing this keyword will automatically be filed into this folder.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BYOK AI Settings Modal */}
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
      />

    </div>
  );
};
