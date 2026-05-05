'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function NavItem({ href, label, icon: Icon, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-3 py-[7px] text-sm transition-colors duration-150',
        isActive
          ? 'bg-zinc-200 text-emerald-700 font-medium dark:bg-zinc-800 dark:text-emerald-400'
          : 'text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-emerald-600 dark:bg-emerald-500" />
      )}
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-medium tabular-nums',
            isActive
              ? 'bg-emerald-600/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
          )}
        >
          {badge > 999 ? '999+' : badge}
        </span>
      )}
    </Link>
  );
}
