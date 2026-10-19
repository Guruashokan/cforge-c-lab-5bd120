import { useState, type FC, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const TARGET_COMPANIES = [
  { slug: 'zoho', name: 'Zoho Corporation' },
  { slug: 'tcs-nqt', name: 'TCS (Tata Consultancy Services)' },
  { slug: 'infosys', name: 'Infosys (Power Programmer)' },
  { slug: 'cognizant', name: 'Cognizant (GenC Elevate)' },
  { slug: 'wipro', name: 'Wipro (Elite & Turbo)' },
  { slug: 'accenture', name: 'Accenture' },
  { slug: 'qualcomm', name: 'Qualcomm (Embedded Systems)' },
  { slug: 'intel', name: 'Intel (Systems Software)' },
  { slug: 'cisco', name: 'Cisco Systems (Networking)' },
  { slug: 'nvidia', name: 'Nvidia (CUDA & Driver Engineering)' },
  { slug: 'microsoft', name: 'Microsoft' },
  { slug: 'amazon', name: 'Amazon (AWS Systems)' },
  { slug: 'google', name: 'Google' },
];

export const AuthModal: FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode, login, register, catalystStatus } =
    useAuth();

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetCompany, setTargetCompany] = useState('zoho');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        if (!username || !password) {
          throw new Error('Please enter both username/email and password.');
        }
        await login(username, password);
      } else {
        if (!username || !email || !password) {
          throw new Error('Please complete all required fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await register({
          username,
          email,
          password,
          target_company: targetCompany,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = () => {
    setUsername('developer@cforge.dev');
    setPassword('cforge123');
    setAuthModalMode('login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {authModalMode === 'login' ? 'Sign In to CForge' : 'Create Developer Profile'}
              <Sparkles className="w-4 h-4 text-blue-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Track submissions, test progress & company interview readiness.
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Sign In / Create Account */}
        <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalMode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              authModalMode === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Username / Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {authModalMode === 'login' ? 'Username or Email' : 'Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={authModalMode === 'login' ? 'e.g. developer or dev@cforge.dev' : 'developer_c17'}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Email (Register only) */}
          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@engineering.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Target Placement Company (Register only) */}
          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Target Placement Company</span>
                <span className="text-[10px] text-blue-400 font-mono">Custom Tracks</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {TARGET_COMPANIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Zoho Catalyst Cloud Data Store Badge */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-200">Zoho Catalyst Cloud</p>
                <p className="text-[10px] text-slate-400">Data Store Cloud Sync</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {catalystStatus?.is_configured ? 'Cloud Active' : 'Data Store Ready'}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{authModalMode === 'login' ? 'Sign In' : 'Create Developer Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Demo Account Quick-Fill button */}
          {authModalMode === 'login' && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors underline underline-offset-4"
              >
                Use Demo Account (developer@cforge.dev / cforge123)
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
