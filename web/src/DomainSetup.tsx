import React, { useState } from 'react';

export default function DomainSetup() {
  const [domain, setDomain] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any[]>([]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setResults([]);

    try {
      const res = await fetch('http://localhost:8787/api/dns/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain, zoneId, apiToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to setup domain');

      setResults(data.results);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-4 p-6 sm:p-8 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 dark:border-zinc-800">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">Setup Custom Domain Email</h2>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        Enter your Cloudflare details below. We will automatically configure the required MX, SPF, and DMARC records to enable free incoming emails.
      </p>

      <form onSubmit={handleSetup} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Domain Name</label>
          <input
            type="text"
            required
            placeholder="e.g., yourdomain.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Cloudflare Zone ID</label>
          <input
            type="text"
            required
            placeholder="Found in your Cloudflare dashboard overview"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Cloudflare API Token</label>
          <input
            type="password"
            required
            placeholder="Needs 'DNS:Edit' and 'Zone:Read' permissions"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full flex justify-center py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          {status === 'loading' ? 'Provisioning DNS...' : 'Auto-Configure Domain ➔'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">Provisioning Complete</h3>
          <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            <ul className="list-disc pl-5 space-y-1">
              {results.map((r, i) => (
                <li key={i}>
                  {r.record ? `${r.record.type} ${r.record.name}` : r.type}: 
                  <span className="font-mono ml-2 font-bold">{r.status || r.result}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4">
          <h3 className="text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-300">Error Provisioning DNS</h3>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
            Please check your API token permissions and Zone ID.
          </p>
        </div>
      )}
    </div>
  );
}
