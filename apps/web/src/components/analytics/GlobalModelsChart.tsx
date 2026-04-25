'use client';

import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsModelStat } from '@/types';
import { modelColor } from './palette';

interface Props {
  data: AnalyticsModelStat[];
}

function shortModel(model: string): string {
  const part = model.includes(':') ? model.split(':').slice(1).join(':') : model;
  return part.length > 28 ? part.slice(0, 26) + '…' : part;
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function fmtUsd(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function GlobalModelsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modelos mais utilizados</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground text-sm">
          Nenhum modelo utilizado ainda.
        </CardContent>
      </Card>
    );
  }

  const totalTokens = data.reduce((s, d) => s + d.totalTokens, 0);
  const totalRequests = data.reduce((s, d) => s + d.requestCount, 0);
  const totalCostUsd = data.reduce((s, d) => s + d.totalCostUsd, 0);

  const chartData = data.map((d, i) => ({
    model: shortModel(d.model),
    Tokens: d.totalTokens,
    requestCount: d.requestCount,
    costUsd: d.totalCostUsd,
    color: modelColor(i),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>Modelos mais utilizados</CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground shrink-0">
            <span>{fmt(totalTokens)} tokens</span>
            <span>{totalRequests.toLocaleString()} requisições</span>
            <span>{fmtUsd(totalCostUsd)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barCategoryGap="35%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="model" width={170} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
              maxBarSize={18}
              shape={(props: any) => (
                <Rectangle {...props} fill={props.color} radius={[0, 4, 4, 0]} />
              )}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {chartData.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span>{entry.model}</span>
              <span className="text-[10px]">({entry.requestCount} req)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
