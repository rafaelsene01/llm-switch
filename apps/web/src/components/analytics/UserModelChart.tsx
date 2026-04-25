'use client';

import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsUserStat } from '@/types';
import { modelColor } from './palette';
import { formatCost } from '@/lib/utils';

interface Props {
  user: AnalyticsUserStat;
}

function shortModel(model: string): string {
  const part = model.includes(':') ? model.split(':').slice(1).join(':') : model;
  return part.length > 22 ? part.slice(0, 20) + '…' : part;
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function fmtUsd(value: number): string {
  return value === 0 ? '$0' : `$${value}`;
}

export function UserModelChart({ user }: Props) {
  const isSingleModel = user.models.length <= 1;
  const singleModel = user.models[0];
  const singleColor = modelColor(0);

  const chartData = user.models.map((m, i) => ({
    model: shortModel(m.model),
    Tokens: m.totalTokens,
    requestCount: m.requestCount,
    costUsd: m.totalCostUsd,
    color: modelColor(i),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{user.user}</CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
            <span>{fmt(user.totalTokens)} tokens</span>
            <span>{user.requestCount} req</span>
            <span>{formatCost(user.totalCostUsd)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isSingleModel ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Modelo</p>
              <p className="font-mono text-xs truncate">{singleModel?.model ?? '—'}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Tokens</p>
                <p className="text-sm font-semibold" style={{ color: singleColor }}>
                  {fmt(singleModel?.totalTokens ?? 0)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Requisições</p>
                <p className="text-sm font-semibold" style={{ color: singleColor }}>
                  {(singleModel?.requestCount ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Custo</p>
                <p className="text-sm font-semibold" style={{ color: singleColor }}>
                  {formatCost(singleModel?.totalCostUsd ?? 0)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 44)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="model" width={130} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const entry = chartData.find((d) => d.model === label);
                    return (
                      <div className="rounded-lg border bg-popover p-3 text-sm shadow-md">
                        <p className="mb-1.5 font-medium">{label}</p>
                        <p style={{ color: payload[0].fill as string }}>Tokens: {fmt(payload[0].value as number)}</p>
                        <p className="text-muted-foreground">Requisições: {entry?.requestCount.toLocaleString()}</p>
                        <p className="text-muted-foreground">Custo: {fmtUsd(entry?.costUsd ?? 0)}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="Tokens"
                  maxBarSize={14}
                  shape={(props: any) => (
                    <Rectangle {...props} fill={props.color} radius={[0, 4, 4, 0]} />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {chartData.map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span>{entry.model}</span>
                  <span className="text-[10px]">({entry.requestCount} req)</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
