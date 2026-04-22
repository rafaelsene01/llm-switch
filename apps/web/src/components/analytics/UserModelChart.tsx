'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsUserStat } from '@/types';
import { modelColor, modelColorAlpha } from './palette';

interface Props {
  user: AnalyticsUserStat;
}

function shortModel(model: string): string {
  const part = model.includes(':') ? model.split(':').slice(1).join(':') : model;
  return part.length > 22 ? part.slice(0, 20) + '…' : part;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 text-sm shadow-md">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.name === 'Tokens' ? formatTokens(p.value) : p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export function UserModelChart({ user }: Props) {
  const isSingleModel = user.models.length <= 1;

  const chartData = user.models.map((m, i) => ({
    model: shortModel(m.model),
    Tokens: m.totalTokens,
    Requisições: m.requestCount,
    color: modelColor(i),
    colorAlpha: modelColorAlpha(i),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{user.user}</CardTitle>
          <div className="text-right text-sm text-muted-foreground shrink-0">
            <p>{formatTokens(user.totalTokens)} tokens</p>
            <p>{user.requestCount} requisições</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isSingleModel ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-muted-foreground mb-1">Modelo</p>
            <p className="font-mono text-xs truncate">{user.models[0]?.model ?? '—'}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 48)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="model" width={130} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Tokens" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="Requisições" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.colorAlpha} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
