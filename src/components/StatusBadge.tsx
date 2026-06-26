import type { VerdictLevel } from '../weather/types';

const STYLES: Record<VerdictLevel, string> = {
  good: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  caution: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  bad: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const DOT: Record<VerdictLevel, string> = {
  good: 'bg-green-500',
  caution: 'bg-amber-500',
  bad: 'bg-red-500',
};

interface Props {
  level: VerdictLevel;
  label: string;
}

export default function StatusBadge({ level, label }: Props) {
  return (
    <span className={`ww-badge ${STYLES[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[level]}`} aria-hidden />
      {label}
    </span>
  );
}
