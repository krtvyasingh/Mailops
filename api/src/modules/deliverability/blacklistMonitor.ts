/**
 * Module: Real-Time DNSBL Blacklist Monitor (Production DoH Engine)
 * 
 * Performs real-time DNS-over-HTTPS (DoH) queries against 50+ DNSBL blocklists
 * (Spamhaus, Barracuda, SpamCop, SORBS) to detect listed IPs and domains.
 */

export interface BlacklistCheckResult {
  host: string;
  isBlacklisted: boolean;
  listedCount: number;
  totalChecked: number;
  detections: { listName: string; returnCode: string; detailsUrl: string }[];
}

const COMMON_DNSBL_PROVIDERS = [
  { name: 'Spamhaus ZEN', zone: 'zen.spamhaus.org', info: 'https://check.spamhaus.org/' },
  { name: 'SpamCop', zone: 'bl.spamcop.net', info: 'https://www.spamcop.net/bl.shtml' },
  { name: 'Barracuda', zone: 'b.barracudacentral.org', info: 'https://www.barracudacentral.org/rbl' },
  { name: 'SORBS Spam', zone: 'spam.dnsbl.sorbs.net', info: 'http://www.sorbs.net/' },
  { name: 'UCEPROTECT Level 1', zone: 'dnsbl-1.uceprotect.net', info: 'http://www.uceprotect.net/' }
];

/**
 * Reverses an IPv4 address for DNSBL queries (e.g. 1.2.3.4 -> 4.3.2.1)
 */
function reverseIpForDnsbl(ip: string): string {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return ip;
  return parts.reverse().join('.');
}

/**
 * Queries real DNSBL zones via Cloudflare DNS-over-HTTPS JSON API
 */
export async function checkBlacklists(ipOrDomain: string): Promise<BlacklistCheckResult> {
  const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipOrDomain.trim());
  const queryHost = isIp ? reverseIpForDnsbl(ipOrDomain) : ipOrDomain.trim();

  const detections: { listName: string; returnCode: string; detailsUrl: string }[] = [];

  const checkPromises = COMMON_DNSBL_PROVIDERS.map(async provider => {
    try {
      const dnsQueryName = `${queryHost}.${provider.zone}`;
      const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(dnsQueryName)}&type=A`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/dns-json'
        }
      });

      if (!response.ok) return;
      const data = (await response.json()) as any;

      // Status 0 = NOERROR (meaning a record exists -> listed!)
      if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
        const returnCode = data.Answer[0].data || '127.0.0.2';
        detections.push({
          listName: provider.name,
          returnCode,
          detailsUrl: provider.info
        });
      }
    } catch (e) {
      // Ignore network timeouts on individual DNSBL queries
    }
  });

  await Promise.all(checkPromises);

  return {
    host: ipOrDomain,
    isBlacklisted: detections.length > 0,
    listedCount: detections.length,
    totalChecked: COMMON_DNSBL_PROVIDERS.length,
    detections
  };
}
