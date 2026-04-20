'use client';

import { Home, Shield, Cpu, Users } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NavItem } from './NavItem';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/rules', label: 'Regras', icon: Shield },
  { href: '/models', label: 'Modelos', icon: Cpu },
  { href: '/users', label: 'Usuários', icon: Users },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-card">
      <div className="p-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="font-semibold text-sm">LLM Gateway</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="flex items-center justify-between border-t p-4">
        <span className="text-xs text-muted-foreground">v2.0</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
