'use client';

import { Home, Cpu, Users, Plug, Activity, BarChart2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NavItem } from './NavItem';
import { Separator } from '@/components/ui/separator';
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
    <aside
      className="flex h-screen w-56 shrink-0 flex-col border-r border-border/60"
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
    >
      {/* Brand */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">LS</span>
          </div>
          <span className="font-bold text-sm tracking-tight">LLM Switch</span>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        <NavItem href="/" label="Home" icon={Home} />
        <NavItem href="/models" label="Modelos" icon={Cpu} badge={activeModels} />
        <NavItem href="/users" label="Usuários" icon={Users} badge={activeUsers} />
        <NavItem href="/providers" label="Providers" icon={Plug} badge={configuredProviders} />
        <NavItem href="/activity" label="Atividade" icon={Activity} badge={activityPage?.total} />
        <NavItem href="/analytics" label="Analytics" icon={BarChart2} />
      </nav>

      <Separator className="opacity-50" />

      <div className="px-4 py-3">
        <ThemeToggle />
      </div>
    </aside>
  );
}
