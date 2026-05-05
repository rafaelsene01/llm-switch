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
        'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150',
        isActive
          ? 'bg-secondary text-primary font-medium'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      <span className={cn(
        'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary transition-[opacity,transform] duration-200',
        isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'
      )} />
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-medium tabular-nums',
            isActive
              ? 'bg-primary/15 text-primary'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          {badge > 999 ? '999+' : badge}
        </span>
      )}
    </Link>
  );
}
