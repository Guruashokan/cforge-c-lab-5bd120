import type { FC } from 'react';
import type { Difficulty } from '../types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  size?: 'sm' | 'md' | 'lg';
}

export const DifficultyBadge: FC<DifficultyBadgeProps> = ({ difficulty, size = 'sm' }) => {
  const styles: Record<Difficulty, { label: string; bg: string; text: string; border: string }> = {
    medium: {
      label: 'Medium',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    hard: {
      label: 'Hard',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
    },
    very_hard: {
      label: 'Very Hard',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
    },
  };

  const current = styles[difficulty] || styles.medium;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-3.5 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {current.label}
    </span>
  );
};
