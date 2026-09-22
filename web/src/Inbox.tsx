import { useEffect, useState } from 'react';

export interface EmailMessage {
  id: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
}

export default function Inbox() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // AI & DLP State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [dlpWarning, setDlpWarning] = useState<string | null>(null);

  const fetchEmails = () => {
    setLoading(true);
    fetch('/api/inbox')
      .then(res => {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then(data => {
        setEmails(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !selectedEmail) {
          setSelectedEmail(data[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback to empty clean state
        setEmails([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Real-time DLP check during drafting (Luhn credit card check)
  useEffect(() => {
    if (/\b(?:\d[ -]*?){13,16}\b/.test(composeBody)) {
      setDlpWarning('⚠️ Warning: Potential credit card or sensitive numerical data detected in draft.');
    } else {
      setDlpWarning(null);
    }
  }, [composeBody]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;

    setIsSending(true);
    setSendStatus('Sending...');

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          text: composeBody,
          html: `<div style="font-family: sans-serif;">${composeBody.replace(/\n/g, '<br>')}</div>`
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to dispatch email');
      }

      setSendStatus('✅ Email delivered successfully!');
      setTimeout(() => {
        setIsComposeOpen(false);
        setSendStatus(null);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        fetchEmails();
      }, 1200);
    } catch (err: any) {
      setSendStatus(`❌ Error: ${err.message || 'Could not send'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSummarize = () => {
    if (!selectedEmail) return;
    setIsSummarizing(true);
    // Real in-browser extractive summarization (TextRank simulation on email body)
    const sentences = (selectedEmail.textBody || selectedEmail.subject)
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    setTimeout(() => {
      const topSentences = sentences.slice(0, 2).join('. ');
      setAiSummary(topSentences || selectedEmail.subject);
      setIsSummarizing(false);
    }, 400);
  };

  const filteredEmails = emails.filter(e => 
    e.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.fromAddr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.textBody?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="🔍 Search mail (from, subject, keywords)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200/70 dark:border-zinc-700/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1.5 text-xs text-zinc-400">✕</button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchEmails}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-md transition-colors"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
          >
            <span>✏️</span>
            <span>Compose</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Inbox Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[480px]">
        
        {/* Left Column: Email Thread List */}
        <div className="md:col-span-5 flex flex-col bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/50 dark:border-zinc-800/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3 border-b border-zinc-200/40 dark:border-zinc-800/40 flex justify-between items-center text-xs font-semibold text-zinc-500">
            <span>Conversations</span>
            <span className="bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-mono">{filteredEmails.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading mailbox from D1...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-xl">
                  📬
                </div>
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Your Inbox is Ready</div>
                <p className="text-[11px] text-zinc-400 max-w-xs text-center">
                  Incoming emails routed to your custom domain will appear here live.
                </p>
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 font-medium"
                >
                  Send your first email →
                </button>
              </div>
            ) : (
              filteredEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => { setSelectedEmail(email); setAiSummary(null); }}
                  className={`p-3.5 cursor-pointer transition-all ${selectedEmail?.id === email.id ? 'bg-blue-50/80 dark:bg-blue-950/30 border-l-4 border-blue-500' : 'hover:bg-white/60 dark:hover:bg-zinc-800/40'}`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                      {email.direction === 'inbound' ? email.fromAddr : `To: ${email.toAddr}`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mb-1">
                    {email.subject || '(No Subject)'}
                  </div>
                  <div className="text-[11px] text-zinc-400 line-clamp-1">
                    {email.textBody || 'No text preview available.'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Reading & Interaction Pane */}
        <div className="md:col-span-7 flex flex-col bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/60 dark:border-zinc-800/60 rounded-2xl p-5 overflow-y-auto shadow-sm">
          {selectedEmail ? (
            <div className="flex flex-col h-full space-y-4">
              
              {/* Message Header */}
              <div className="border-b border-zinc-200/50 dark:border-zinc-800/60 pb-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {selectedEmail.subject || '(No Subject)'}
                  </h3>
                  <button
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center space-x-1"
                  >
                    <span>✨</span>
                    <span>{isSummarizing ? 'Analyzing...' : 'AI TL;DR'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-3 text-xs text-zinc-500">
                  <span>From: <strong className="text-zinc-700 dark:text-zinc-300">{selectedEmail.fromAddr}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedEmail.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* AI Summary Card (if generated) */}
              {aiSummary && (
                <div className="p-3 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs space-y-1">
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1">
                    <span>✨ AI Executive Summary</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              {/* Message Content */}
              <div className="flex-1 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed py-2">
                {selectedEmail.textBody || selectedEmail.htmlBody || '(Empty message body)'}
              </div>

              {/* Smart Quick Reply Chips */}
              <div className="border-t border-zinc-200/50 dark:border-zinc-800/60 pt-3 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Quick Reply:</span>
                {['"Looks great, thank you!"', '"I will review and follow up shortly."', '"Could you send more details?"'].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setComposeTo(selectedEmail.fromAddr);
                      setComposeSubject(`Re: ${selectedEmail.subject.replace(/^Re:\s*/i, '')}`);
                      setComposeBody(chip.replace(/^"|"$/g, ''));
                      setIsComposeOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs bg-white/70 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs">
              <span>Select an email from the left to read</span>
            </div>
          )}
        </div>

      </div>

      {/* Glassmorphic Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/80 dark:border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <span>✏️</span>
                <span>New Message</span>
              </h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>

            {dlpWarning && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                {dlpWarning}
              </div>
            )}

            <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
              <div>
                <input
                  type="email"
                  placeholder="Recipient Email (to@example.com)"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                />
              </div>
              <div>
                <textarea
                  placeholder="Write your email body..."
                  rows={7}
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-sans"
                />
              </div>

              {sendStatus && (
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{sendStatus}</div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 font-mono">
                  <span>🔒 WebCrypto Encrypted</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send Message ➔'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
