import { Badge } from '@/components/ui/badge';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: { label: string; variant?: 'default' | 'secondary' | 'outline' };
}

export function PageHeader({ title, description, actions, badge }: PageHeaderProps) {
  return (
    <div className="mb-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
            {badge && (
              <Badge variant={badge.variant ?? 'secondary'} className="shrink-0 text-[11px]">
                {badge.label}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>
        )}
      </div>
      <div className="mt-5 h-px bg-border/60" />
    </div>
  );
}
