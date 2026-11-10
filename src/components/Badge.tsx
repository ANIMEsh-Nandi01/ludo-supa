import { clsx } from 'clsx';

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeVariant = 'online' | 'ready' | 'away' | 'default';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

// ── Style map ──────────────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  online: 'bg-green-500/20 text-green-400 border-green-500/30',
  ready: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  away: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const dotStyles: Record<BadgeVariant, string> = {
  online: 'bg-green-400',
  ready: 'bg-blue-400',
  away: 'bg-yellow-400',
  default: 'bg-gray-400',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function Badge({
  label,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', dotStyles[variant])}
      />
      {label}
    </span>
  );
}
