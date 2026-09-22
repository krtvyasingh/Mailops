import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ConnectedAccount {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'microsoft' | 'apple' | 'yahoo' | 'custom' | 'mailops' | 'fastmail';
  color: string; // Hex or Tailwind color token for badge
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  status: 'connected' | 'syncing' | 'error';
  unreadCount: number;
  isPrimary?: boolean;
}

interface AccountContextType {
  accounts: ConnectedAccount[];
  activeAccountId: string; // 'unified' or specific account id
  activeAccount: ConnectedAccount | null;
  isAuthenticated: boolean;
  setActiveAccountId: (id: string) => void;
  addAccount: (account: Omit<ConnectedAccount, 'id' | 'status' | 'unreadCount'>) => Promise<ConnectedAccount>;
  removeAccount: (id: string) => void;
  syncAccount: (id: string) => Promise<void>;
  login: (email: string, passwordOrToken: string, provider?: ConnectedAccount['provider']) => Promise<boolean>;
  createNewAccount: (handle: string, domain: string, passphrase: string) => Promise<ConnectedAccount>;
  logout: () => void;
  isUnified: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const INITIAL_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'acc-mailops-primary',
    name: 'Personal Mailops',
    email: 'krtvyasingh@mailops.me',
    provider: 'mailops',
    color: '#3b82f6', // Blue
    imapHost: 'imap.mailops.me',
    imapPort: 993,
    smtpHost: 'smtp.mailops.me',
    smtpPort: 465,
    status: 'connected',
    unreadCount: 2,
    isPrimary: true
  }
];

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(() => {
    try {
      const saved = localStorage.getItem('mailops_connected_accounts');
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('mailops_is_authenticated');
      return auth !== null ? JSON.parse(auth) : true; // default true for seamless existing sessions
    } catch {
      return true;
    }
  });

  const [activeAccountId, setActiveAccountId] = useState<string>('unified');

  useEffect(() => {
    try {
      localStorage.setItem('mailops_connected_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to persist accounts:', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('mailops_is_authenticated', JSON.stringify(isAuthenticated));
    } catch (e) {
      console.error('Failed to persist auth status:', e);
    }
  }, [isAuthenticated]);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || null;
  const isUnified = activeAccountId === 'unified';

  const addAccount = async (data: Omit<ConnectedAccount, 'id' | 'status' | 'unreadCount'>): Promise<ConnectedAccount> => {
    const newAccount: ConnectedAccount = {
      ...data,
      id: `acc-${Date.now()}`,
      status: 'connected',
      unreadCount: 0
    };

    setAccounts(prev => [...prev, newAccount]);
    setActiveAccountId(newAccount.id);
    return newAccount;
  };

  const removeAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) {
      setActiveAccountId('unified');
    }
  };

  const syncAccount = async (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'syncing' } : a));
    await new Promise(res => setTimeout(res, 600));
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'connected' } : a));
  };

  const login = async (email: string, _passwordOrToken: string, provider: ConnectedAccount['provider'] = 'mailops'): Promise<boolean> => {
    // Perform simulated real verification & establish session
    await new Promise(res => setTimeout(res, 500));
    
    // Check if account already exists
    const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      const name = email.split('@')[0];
      const newAcc: ConnectedAccount = {
        id: `acc-${Date.now()}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        provider,
        color: provider === 'google' ? '#ea4335' : provider === 'microsoft' ? '#0078d4' : provider === 'yahoo' ? '#6001d2' : '#3b82f6',
        imapHost: provider === 'google' ? 'imap.gmail.com' : provider === 'microsoft' ? 'outlook.office365.com' : provider === 'yahoo' ? 'imap.mail.yahoo.com' : `imap.${email.split('@')[1]}`,
        imapPort: 993,
        smtpHost: provider === 'google' ? 'smtp.gmail.com' : provider === 'microsoft' ? 'smtp.office365.com' : provider === 'yahoo' ? 'smtp.mail.yahoo.com' : `smtp.${email.split('@')[1]}`,
        smtpPort: 465,
        status: 'connected',
        unreadCount: 0
      };
      setAccounts(prev => [...prev, newAcc]);
      setActiveAccountId(newAcc.id);
    }

    setIsAuthenticated(true);
    return true;
  };

  const createNewAccount = async (handle: string, domain: string, _passphrase: string): Promise<ConnectedAccount> => {
    const email = `${handle.toLowerCase().trim()}@${domain.trim()}`;
    const newAcc: ConnectedAccount = {
      id: `acc-${Date.now()}`,
      name: handle.charAt(0).toUpperCase() + handle.slice(1),
      email,
      provider: 'mailops',
      color: '#3b82f6',
      imapHost: `imap.${domain}`,
      imapPort: 993,
      smtpHost: `smtp.${domain}`,
      smtpPort: 465,
      status: 'connected',
      unreadCount: 0,
      isPrimary: accounts.length === 0
    };

    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
    setIsAuthenticated(true);
    return newAcc;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        activeAccount,
        isAuthenticated,
        setActiveAccountId,
        addAccount,
        removeAccount,
        syncAccount,
        login,
        createNewAccount,
        logout,
        isUnified
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountProvider');
  }
  return context;
};
