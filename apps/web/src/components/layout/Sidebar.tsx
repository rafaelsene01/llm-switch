'use client';

import { Home, Shield, Cpu, Users, Plug, Activity, BarChart2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NavItem } from './NavItem';
import { Separator } from '@/components/ui/separator';
import { useUsers } from '@/hooks/useUsers';
import { useModels } from '@/hooks/useModels';
import { useRules } from '@/hooks/useRules';
import { useProviders } from '@/hooks/useProviders';
import { useActivity } from '@/hooks/useActivity';

export function Sidebar() {
  const { data: users } = useUsers();
  const { data: models } = useModels();
  const { data: rules } = useRules();
  const { data: providers } = useProviders();
  const { data: activityPage } = useActivity(1, 1);

  const activeUsers = users?.filter((u) => u.active).length;
  const activeModels = models?.filter((m) => m.active).length;
  const activeRules = rules?.filter((r) => r.mode !== 'disabled').length;
  const configuredProviders = providers?.filter((p) => p.configured).length;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-card">
      <div className="p-4">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="font-semibold text-sm">LLM Gateway</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        <NavItem href="/" label="Home" icon={Home} />
        <NavItem href="/rules" label="Regras" icon={Shield} badge={activeRules} />
        <NavItem href="/models" label="Modelos" icon={Cpu} badge={activeModels} />
        <NavItem href="/users" label="Usuários" icon={Users} badge={activeUsers} />
        <NavItem href="/providers" label="Providers" icon={Plug} badge={configuredProviders} />
        <NavItem href="/activity" label="Atividade" icon={Activity} badge={activityPage?.total} />
        <NavItem href="/analytics" label="Analytics" icon={BarChart2} />
      </nav>

      <Separator />
      <div className="flex items-center justify-between p-4">
        <span className="text-xs text-muted-foreground">v2.0</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
