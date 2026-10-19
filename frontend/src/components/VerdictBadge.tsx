import type { FC, ReactNode } from 'react';
import type { Verdict } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, AlertOctagon, Clock, HardDrive, AlertCircle } from 'lucide-react';

interface VerdictBadgeProps {
  verdict: Verdict;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: FC<VerdictBadgeProps> = ({ verdict, showIcon = true, size = 'sm' }) => {
  const verdictConfig: Record<Verdict, { label: string; bg: string; text: string; border: string; icon: ReactNode }> = {
    accepted: {
      label: 'Accepted',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    wrong_answer: {
      label: 'Wrong Answer',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    compilation_error: {
      label: 'Compilation Error',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    runtime_error: {
      label: 'Runtime Error',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
    },
    time_limit_exceeded: {
      label: 'Time Limit Exceeded',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    memory_limit_exceeded: {
      label: 'Memory Limit Exceeded',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      icon: <HardDrive className="w-3.5 h-3.5" />,
    },
    internal_error: {
      label: 'Internal Error',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = verdictConfig[verdict] || verdictConfig.internal_error;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-4 py-1.5 gap-2.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};
