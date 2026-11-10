import { clsx } from 'clsx';
import type { Color } from '@/types/game';

// ── Types ──────────────────────────────────────────────────────────────────────

type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  src?: string | null;
  displayName: string;
  size?: AvatarSize;
  color?: Color;
  isSpeaking?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

const colorBg: Record<Color, string> = {
  red: 'bg-ludo-red',
  green: 'bg-ludo-green',
  yellow: 'bg-ludo-yellow',
  blue: 'bg-ludo-blue',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function Avatar({
  src,
  displayName,
  size = 'md',
  color,
  isSpeaking = false,
}: AvatarProps) {
  const initials = getInitials(displayName);
  const bgColor = color ? colorBg[color] : 'bg-gray-700';

  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizeClasses[size],
        !src && bgColor,
        isSpeaking && 'ring-2 ring-blue-400 animate-ring-pulse',
      )}
      title={displayName}
    >
      {src ? (
        <img
          src={src}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fall back to initials on broken image
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span aria-label={displayName}>{initials}</span>
      )}

      {isSpeaking && (
        <span className="absolute inset-0 rounded-full ring-2 ring-blue-400 opacity-70 animate-ping" />
      )}
    </div>
  );
}
