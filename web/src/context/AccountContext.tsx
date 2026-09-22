import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ConnectedAccount {
  id: string;
  name: string;
  email: string;
  provider: 'google' | 'microsoft' | 'apple' | 'yahoo' | 'custom' | 'mailops';
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
  setActiveAccountId: (id: string) => void;
  addAccount: (account: Omit<ConnectedAccount, 'id' | 'status' | 'unreadCount'>) => Promise<ConnectedAccount>;
  removeAccount: (id: string) => void;
  syncAccount: (id: string) => Promise<void>;
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

  const [activeAccountId, setActiveAccountId] = useState<string>('unified');

  useEffect(() => {
    try {
      localStorage.setItem('mailops_connected_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to persist accounts:', e);
    }
  }, [accounts]);

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
    await new Promise(res => setTimeout(res, 800));
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'connected' } : a));
  };

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccountId,
        activeAccount,
        setActiveAccountId,
        addAccount,
        removeAccount,
        syncAccount,
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
