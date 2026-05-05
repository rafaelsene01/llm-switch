'use client';

import { Home, Cpu, Users, Plug, Activity, BarChart2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NavItem } from './NavItem';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { useProviders } from '@/hooks/useProviders';
import { useActivity } from '@/hooks/useActivity';

export function Sidebar() {
  const { data: users } = useUsers();
  const { data: models } = useModels();
  const { data: providers } = useProviders();
  const { data: activityPage } = useActivity(1, 1);

  const activeUsers = users?.filter((u) => u.active).length;
  const activeModels = models?.filter((m) => m.active).length;
  const configuredProviders = providers?.filter((p) => p.configured).length;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-background border-r border-border">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <span className="text-[10px] font-bold text-foreground leading-none">LS</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">LLM Switch</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </p>
        <NavItem href="/" label="Home" icon={Home} />
        <NavItem href="/models" label="Modelos" icon={Cpu} badge={activeModels} />
        <NavItem href="/users" label="Usuários" icon={Users} badge={activeUsers} />
        <NavItem href="/providers" label="Providers" icon={Plug} badge={configuredProviders} />
        <NavItem href="/activity" label="Atividade" icon={Activity} badge={activityPage?.total} />
        <NavItem href="/analytics" label="Analytics" icon={BarChart2} />
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
