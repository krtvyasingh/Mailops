export default function ClientIntegration() {
  return (
    <div className="max-w-3xl mx-auto my-4 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">Integrate with Gmail, Outlook, or Apple Mail</h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          You don't have to use this web dashboard! You can connect your custom domain email directly to your favorite mail client for a seamless native experience.
        </p>
      </div>

      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-800/40">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <span>📥</span>
            <span>1. Receiving Emails (Forwarding)</span>
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-3">
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            To receive emails in your personal Gmail or Outlook inbox, navigate to your <b>Cloudflare Dashboard &gt; Email &gt; Email Routing</b> and create a custom address:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 space-y-1.5">
            <li><b>Custom address:</b> <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">hello@yourdomain.com</code></li>
            <li><b>Action:</b> Send to <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">your.personal.email@gmail.com</code></li>
          </ul>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            💡 <i>Note: You can add multiple actions! You can forward to your Gmail AND send to the Mailops Worker to keep a permanent searchable backup in this dashboard.</i>
          </p>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200/60 dark:border-zinc-800 bg-white/40 dark:bg-zinc-800/40">
          <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
            <span>📤</span>
            <span>2. Sending Emails (SMTP Setup)</span>
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            To reply to emails from your custom domain inside Gmail (using "Send mail as") or Outlook, use the free Resend SMTP server:
          </p>
          
          <div className="bg-zinc-950/90 dark:bg-black/90 border border-zinc-800 rounded-xl p-4 font-mono text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-zinc-400">SMTP Server</div>
              <div className="col-span-2 text-emerald-400">smtp.resend.com</div>
              
              <div className="text-zinc-400">Port</div>
              <div className="col-span-2 text-emerald-400">465 (SSL) or 587 (TLS)</div>
              
              <div className="text-zinc-400">Username</div>
              <div className="col-span-2 text-emerald-400">resend</div>
              
              <div className="text-zinc-400">Password</div>
              <div className="col-span-2 text-emerald-400">Your Resend API Key (re_...)</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800">
            <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Gmail "Send Mail As" Configuration Steps:</h4>
            <ol className="list-decimal pl-5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
              <li>Open Gmail Settings (Gear icon) &gt; See all settings &gt; <b>Accounts and Import</b>.</li>
              <li>Under "Send mail as", click <b>Add another email address</b>.</li>
              <li>Enter your name and your custom domain email (e.g., <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">hello@yourdomain.com</code>). Uncheck "Treat as an alias".</li>
              <li>Enter the SMTP details from above using your Resend API key as the password.</li>
              <li>Verify the confirmation code sent to your email.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
