import React, { useState, useEffect } from 'react';
import {
  loadAIConfig,
  saveAIConfig,
  detectAIProvider,
  executeAICompletion,
  AIProviderConfig,
  AIProviderId
} from '../../utils/aiProviderEngine';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIProviderConfig>(loadAIConfig);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [detectedProvider, setDetectedProvider] = useState<AIProviderId>(config.provider);
  const [model, setModel] = useState(config.model || 'gpt-4o-mini');
  const [endpoint, setEndpoint] = useState(config.endpoint || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string; latency?: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = loadAIConfig();
      setConfig(current);
      setApiKeyInput(current.apiKey);
      setDetectedProvider(current.provider);
      setModel(current.model);
      setEndpoint(current.endpoint || '');
      setTestResult(null);
    }
  }, [isOpen]);

  const handleKeyChange = (val: string) => {
    setApiKeyInput(val);
    const provider = detectAIProvider(val);
    setDetectedProvider(provider);
    
    // Auto assign default model
    if (provider === 'gemini') setModel('gemini-1.5-flash');
    else if (provider === 'anthropic') setModel('claude-3-5-haiku-20241022');
    else if (provider === 'groq') setModel('llama-3.3-70b-versatile');
    else if (provider === 'openai') setModel('gpt-4o-mini');
    else if (provider === 'deepseek') setModel('deepseek-chat');
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const testConfig: AIProviderConfig = {
        provider: detectedProvider,
        name: detectedProvider.toUpperCase(),
        apiKey: apiKeyInput,
        endpoint: endpoint.trim() || undefined,
        model
      };

      const result = await executeAICompletion(
        'Ping test. Reply with exactly "OK".',
        'You are a testing probe.',
        testConfig
      );

      setTestResult({
        status: 'success',
        message: `Verified! Response: "${result.text.slice(0, 40)}"`,
        latency: result.latencyMs
      });
    } catch (e: any) {
      setTestResult({
        status: 'error',
        message: `Connection test failed: ${e.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const updated: AIProviderConfig = {
      provider: apiKeyInput.trim() ? detectedProvider : 'builtin',
      name: detectedProvider.toUpperCase(),
      apiKey: apiKeyInput.trim(),
      endpoint: endpoint.trim() || undefined,
      model: model.trim()
    };
    saveAIConfig(updated);
    setConfig(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-zinc-800 dark:text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-base shadow-sm">
              ✨
            </div>
            <div>
              <h3 className="font-semibold text-sm">Universal Bring-Your-Own-Key AI</h3>
              <p className="text-[11px] text-zinc-400">Plug in any AI API key with automatic provider detection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm">
            ✕
          </button>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              API Key or Endpoint
            </label>
            {detectedProvider !== 'builtin' && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                Detected: {detectedProvider}
              </span>
            )}
          </div>
          
          <div className="relative">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="Paste sk-..., AIzaSy..., gsk_..., or http://localhost:11434"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Supports OpenAI, Anthropic Claude, Google Gemini, Groq, DeepSeek, Mistral, and local Ollama. Keys remain encrypted locally in your browser.
          </p>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Model Name</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini, gemini-1.5-flash"
              className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Custom Base URL (Optional)</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${testResult.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
            <span>{testResult.message}</span>
            {testResult.latency !== undefined && (
              <span className="font-mono text-[10px] font-bold">{testResult.latency}ms</span>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || !apiKeyInput.trim()}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            {isTesting ? 'Testing Latency...' : '⚡ Test Connection'}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              Save AI Configuration
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
