import { useState, type FC } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Terminal,
  Cloud,
  LogIn,
  LogOut,
  Flame,
  Building2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const Layout: FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, openAuthModal, logout, catalystStatus } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main wrapper shifted on desktop */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-3 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-400">
              <Terminal className="w-4 h-4 text-blue-400 hidden sm:inline" />
              <span className="font-mono text-xs text-slate-300 hidden md:inline">
                gcc 13.2.0 | C17 | -O2 -Wall
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Zoho Catalyst Cloud Status Pill */}
            <Link
              to="/settings"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-400 text-xs font-mono transition-colors"
              title="Zoho Catalyst Cloud Data Store Status"
            >
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline font-sans font-medium text-slate-300">Catalyst:</span>
              <span className="text-[11px] font-semibold text-blue-400">
                {catalystStatus?.is_configured ? 'Cloud Active' : 'Hybrid Sync'}
              </span>
            </Link>

            {/* Sandbox Status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sandbox: Online</span>
            </div>

            {/* User Profile or Sign In Button */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-[11px]">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-medium text-slate-200 truncate max-w-[110px]">
                      {user.display_name || user.username}
                    </span>
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-amber-400" />
                      {user.streak_days}d streak
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-semibold text-white">{user.display_name || user.username}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      {user.target_company && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                          <Building2 className="w-3 h-3" />
                          <span>Target: {user.target_company.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <Link
                      to="/analytics"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      My Progress & Analytics
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Zoho Catalyst & Account Settings
                    </Link>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

