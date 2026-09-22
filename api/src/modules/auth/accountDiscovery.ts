/**
 * Account Auto-Discovery Engine & Provider Presets (Inspired by Thunderbird ISPDB)
 * Supports Gmail, Outlook, iCloud, Yahoo, Fastmail, Zoho, and custom IMAP/SMTP auto-configuration.
 */

export interface EmailProviderPreset {
  name: string;
  domains: string[];
  imap: {
    host: string;
    port: number;
    secure: boolean;
    socketType: 'SSL' | 'STARTTLS';
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    socketType: 'SSL' | 'STARTTLS';
  };
  authType: 'password' | 'app_password' | 'oauth2';
  instructions?: string;
}

export const KNOWN_PROVIDER_PRESETS: EmailProviderPreset[] = [
  {
    name: 'Google Gmail / Workspace',
    domains: ['gmail.com', 'googlemail.com'],
    imap: { host: 'imap.gmail.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true, socketType: 'SSL' },
    authType: 'app_password',
    instructions: 'Use your standard Google email with a 16-character Google App Password (generated in myaccount.google.com/apppasswords).'
  },
  {
    name: 'Microsoft Outlook / Office 365',
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'office365.com'],
    imap: { host: 'outlook.office365.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.office365.com', port: 587, secure: true, socketType: 'STARTTLS' },
    authType: 'password',
    instructions: 'Use your Microsoft account email and password, or an app-specific password if 2FA is active.'
  },
  {
    name: 'Apple iCloud Mail',
    domains: ['icloud.com', 'me.com', 'mac.com'],
    imap: { host: 'imap.mail.me.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: true, socketType: 'STARTTLS' },
    authType: 'app_password',
    instructions: 'Generate an app-specific password at appleid.apple.com under Sign-In and Security.'
  },
  {
    name: 'Yahoo Mail',
    domains: ['yahoo.com', 'ymail.com', 'rocketmail.com', 'myyahoo.com'],
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true, socketType: 'SSL' },
    authType: 'app_password',
    instructions: 'Generate an app password in Yahoo Account Security settings.'
  },
  {
    name: 'Zoho Mail',
    domains: ['zoho.com', 'zohomail.com'],
    imap: { host: 'imap.zoho.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.zoho.com', port: 465, secure: true, socketType: 'SSL' },
    authType: 'password'
  },
  {
    name: 'Fastmail',
    domains: ['fastmail.com', 'fastmail.fm', 'messagingengine.com'],
    imap: { host: 'imap.fastmail.com', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.fastmail.com', port: 465, secure: true, socketType: 'SSL' },
    authType: 'app_password',
    instructions: 'Use an app password generated in Fastmail Settings > Passwords & Security.'
  },
  {
    name: 'Mailops Native Cloud',
    domains: ['mailops.me', 'mailops.dev', 'is-a.dev'],
    imap: { host: 'imap.mailops.me', port: 993, secure: true, socketType: 'SSL' },
    smtp: { host: 'smtp.mailops.me', port: 465, secure: true, socketType: 'SSL' },
    authType: 'password'
  }
];

/**
 * Discovers the server settings for any email address in the world
 */
export async function discoverServerSettings(email: string): Promise<{
  providerName: string;
  imap: { host: string; port: number; socketType: 'SSL' | 'STARTTLS' };
  smtp: { host: string; port: number; socketType: 'SSL' | 'STARTTLS' };
  authType: string;
  instructions?: string;
  isAutoconfigured: boolean;
}> {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address format');
  }

  const domain = email.split('@')[1].trim().toLowerCase();

  // 1. Check direct known provider presets
  const preset = KNOWN_PROVIDER_PRESETS.find(p => p.domains.includes(domain));
  if (preset) {
    return {
      providerName: preset.name,
      imap: { host: preset.imap.host, port: preset.imap.port, socketType: preset.imap.socketType },
      smtp: { host: preset.smtp.host, port: preset.smtp.port, socketType: preset.smtp.socketType },
      authType: preset.authType,
      instructions: preset.instructions,
      isAutoconfigured: true
    };
  }

  // 2. Custom Domain Default Heuristics (Standard RFC & ISP convention)
  return {
    providerName: `Custom Mail Server (${domain})`,
    imap: { host: `imap.${domain}`, port: 993, socketType: 'SSL' },
    smtp: { host: `smtp.${domain}`, port: 465, socketType: 'SSL' },
    authType: 'password',
    instructions: 'Enter your custom IMAP and SMTP credentials or app password.',
    isAutoconfigured: false
  };
}
