import { useState, type FC } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Check,
  RotateCcw,
  User,
  Terminal,
  Code,
} from 'lucide-react';

interface StoredSettings {
  displayName?: string;
  theme?: string;
  fontSize?: string;
  cStandard?: string;
  tabSize?: string;
  strictWarnings?: boolean;
}

function loadInitialSettings(): StoredSettings {
  try {
    const saved = localStorage.getItem('cforge_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return {};
}

export const Settings: FC = () => {
  const initial = loadInitialSettings();

  const [displayName, setDisplayName] = useState(initial.displayName || 'Embedded Engineer');
  const [theme, setTheme] = useState(initial.theme || 'vs-dark');
  const [fontSize, setFontSize] = useState(initial.fontSize || '14');
  const [cStandard, setCStandard] = useState(initial.cStandard || 'c17');
  const [tabSize, setTabSize] = useState(initial.tabSize || '4');
  const [strictWarnings, setStrictWarnings] = useState(initial.strictWarnings !== undefined ? initial.strictWarnings : true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const settings = {
      displayName,
      theme,
      fontSize,
      cStandard,
      tabSize,
      strictWarnings,
    };
    localStorage.setItem('cforge_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    setDisplayName('Embedded Engineer');
    setTheme('vs-dark');
    setFontSize('14');
    setCStandard('c17');
    setTabSize('4');
    setStrictWarnings(true);
    localStorage.removeItem('cforge_settings');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <SettingsIcon className="w-3.5 h-3.5" /> Workspace Configuration
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Platform & Compiler Settings
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mt-1">
          Customize your coding environment, Monaco editor configurations, and default GCC compiler flags.
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" /> User Profile
          </h2>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Editor Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" /> Monaco Editor Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Editor Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="vs-dark">Visual Studio Dark (Default)</option>
                <option value="hc-black">High Contrast Dark</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Font Size
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="12">12px (Compact)</option>
                <option value="14">14px (Recommended)</option>
                <option value="16">16px (Comfortable)</option>
                <option value="18">18px (Large)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Tab Indentation
              </label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces (Standard C)</option>
                <option value="8">8 Spaces (Linux Kernel Style)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compiler Standards & Flags */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" /> GCC Toolchain & Standards
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Default C Language Standard
              </label>
              <select
                value={cStandard}
                onChange={(e) => setCStandard(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="c17">ISO C17 (-std=c17) [Standard]</option>
                <option value="c11">ISO C11 (-std=c11)</option>
                <option value="c99">ISO C99 (-std=c99)</option>
                <option value="gnu17">GNU17 with POSIX Extensions (-std=gnu17)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Optimization Level
              </label>
              <input
                type="text"
                disabled
                value="-O2 -march=native"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={strictWarnings}
                onChange={(e) => setStrictWarnings(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span className="text-xs text-slate-300 font-mono">
                Enable strict compiler diagnostics (-Wall -Wextra -Werror)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 ml-7 mt-0.5">
              Treats all compiler warnings as fatal errors to enforce production quality systems C.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
