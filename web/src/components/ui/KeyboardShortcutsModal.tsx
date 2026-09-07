import React from 'react';

export interface ShortcutGroup {
  category: string;
  shortcuts: { key: string; description: string }[];
}

const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { key: 'j / k', description: 'Next / Previous email in list' },
      { key: 'Enter / o', description: 'Open selected email' },
      { key: 'u', description: 'Return to inbox' },
      { key: '/', description: 'Search emails' },
      { key: 'Cmd + K', description: 'Open Command Palette' },
    ]
  },
  {
    category: 'Actions',
    shortcuts: [
      { key: 'c', description: 'Compose new email' },
      { key: 'r', description: 'Reply to sender' },
      { key: 'a', description: 'Reply all' },
      { key: 'f', description: 'Forward email' },
      { key: 'e', description: 'Archive email' },
      { key: '#', description: 'Trash email' },
      { key: 's', description: 'Star / Unstar' },
      { key: 'Cmd + Enter', description: 'Send email in composer' },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">⌨️ Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button>
        </div>

        <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
          {DEFAULT_SHORTCUTS.map(group => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">{group.category}</h3>
              <div className="space-y-2">
                {group.shortcuts.map(sc => (
                  <div key={sc.key} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{sc.description}</span>
                    <kbd className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono rounded text-xs border border-zinc-200 dark:border-zinc-700">{sc.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
