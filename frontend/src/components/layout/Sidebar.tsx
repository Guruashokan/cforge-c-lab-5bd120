import type { FC } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Terminal,
  LayoutDashboard,
  Code2,
  Map,
  Building2,
  Award,
  Zap,
  Bookmark,
  CheckCircle2,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Practice Problems', path: '/problems', icon: Code2 },
    { label: 'Topic Roadmap', path: '/roadmap', icon: Map },
    { label: 'Company Prep', path: '/companies', icon: Building2 },
    { label: 'Timed Assessments', path: '/assessments', icon: Award },
    { label: 'Daily Challenge', path: '/problems/lock-free-ring-buffer', icon: Zap, badge: 'XP +250' },
    { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { label: 'Solved Problems', path: '/problems?status=solved', icon: CheckCircle2 },
    { label: 'Progress Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const isCurrentActive = (path: string) => {
    if (path.includes('?')) {
      const [base, query] = path.split('?');
      return location.pathname === base && location.search.includes(query);
    }
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path) && !location.search.includes('status=solved');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <NavLink to="/" className="flex items-center space-x-3 group" onClick={onClose}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center">
                C<span className="text-blue-400">Forge</span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  C17
                </span>
              </span>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Practice Arena
          </div>

          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.path);
            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Track & Progress
          </div>

          {navItems.slice(6).map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.path);
            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* User status card at bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/40">
              CF
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Embedded Engineer</p>
              <p className="text-[10px] text-emerald-400 font-mono">Streak: 8 Days 🔥</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
