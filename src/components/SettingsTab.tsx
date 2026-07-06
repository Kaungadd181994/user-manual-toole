import React, { useState } from 'react';
import { Key, Trash2, Eye, EyeOff, FileText, Check, AlertTriangle, Lightbulb } from 'lucide-react';

interface SettingsTabProps {
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  instructions: string;
  onChangeInstructions: (inst: string) => void;
  onClearAll: () => void;
}

export default function SettingsTab({
  apiKey,
  onChangeApiKey,
  instructions,
  onChangeInstructions,
  onClearAll,
}: SettingsTabProps) {
  const [showKey, setShowKey] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveConfig = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            API & Prompt Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Configure system parameters and direct custom directives for your Gemini workspace. All configurations are persisted securely in local storage.
          </p>
        </div>

        <div className="space-y-5">
          {/* API Key field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Google Gemini API Key (Optional)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onChangeApiKey(e.target.value)}
                placeholder="Paste custom API key (AIzaSy...)"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-600"
              />
              <Key className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-3.5 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pt-1 select-none">
              🔑 Don't have an API key? Get one instantly from the{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                Google AI Studio Console
              </a>.
            </p>
          </div>

          {/* Prompt Directives field */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-5 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-blue-500" />
              Custom Instructions for Gemini Analysis
            </label>
            <textarea
              value={instructions}
              onChange={(e) => onChangeInstructions(e.target.value)}
              placeholder="e.g. 'Keep explanations brief', 'Focus on specific clicks', 'Highlight the left sidebar options', etc."
              rows={3}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all duration-200 resize-none placeholder-slate-400 dark:placeholder-slate-600"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pt-0.5 select-none">
              Providing specific instructions updates the internal context prompt, modifying how the model structures titles and steps.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-850 dark:hover:bg-white text-white dark:text-slate-950 font-bold text-xs transition shadow-md focus:outline-none"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500 font-extrabold" />
                  Preferences Saved Successfully!
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Guide manual */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-5 md:p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 select-none">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          📖 Quick Guide: Generating Flawless Guides
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 shadow-sm space-y-1">
            <span className="font-extrabold text-blue-600 dark:text-blue-400 block uppercase tracking-wide text-[10px]">1. Record Action demonstration</span>
            <p className="text-slate-500 dark:text-slate-300">Demonstrate your application flow cleanly. Try to click slowly and avoid excessive scrolling or idle time.</p>
          </div>
          
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 shadow-sm space-y-1">
            <span className="font-extrabold text-blue-600 dark:text-blue-400 block uppercase tracking-wide text-[10px]">2. Auto-Timeline Analysis</span>
            <p className="text-slate-500 dark:text-slate-300">Upload the video to prompt Gemini to scan each frame, pinpointing key screen changes, clicks, and precise timestamps.</p>
          </div>

          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 shadow-sm space-y-1">
            <span className="font-extrabold text-blue-600 dark:text-blue-400 block uppercase tracking-wide text-[10px]">3. Canvas Screen Slicing</span>
            <p className="text-slate-500 dark:text-slate-300">The browser uses its local HTML5 video decoder context to seek and slice pixel-perfect JPG snapshots, completely offline.</p>
          </div>

          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 shadow-sm space-y-1">
            <span className="font-extrabold text-blue-600 dark:text-blue-400 block uppercase tracking-wide text-[10px]">4. Edit & Export HTML</span>
            <p className="text-slate-500 dark:text-slate-300">Tune instructions, change titles, or drag and drop to re-order. When satisfied, export a polished stand-alone manual.</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/60 dark:border-red-900/30 rounded-2xl p-5 md:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Danger Zone
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Resetting will wipe out all local data stored, custom prompt instructions, custom API keys, and your currently drafted guides.
          </p>
        </div>
        
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-md shadow-red-500/10 focus:outline-none"
        >
          <Trash2 className="w-4 h-4" />
          Reset All Saved Data
        </button>
      </div>
    </div>
  );
}
