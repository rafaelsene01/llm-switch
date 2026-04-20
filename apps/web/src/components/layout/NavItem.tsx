'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <Badge variant="secondary" className="ml-auto h-5 min-w-5 justify-center px-1 text-xs">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
