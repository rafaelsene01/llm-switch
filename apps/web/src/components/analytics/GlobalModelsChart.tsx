'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsModelStat } from '@/types';

interface Props {
  data: AnalyticsModelStat[];
}

function shortModel(model: string): string {
  const part = model.includes(':') ? model.split(':').slice(1).join(':') : model;
  return part.length > 28 ? part.slice(0, 26) + '…' : part;
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

  const chartData = data.map((d) => ({
    model: shortModel(d.model),
    fullModel: d.model,
    Tokens: d.totalTokens,
    Requisições: d.requestCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modelos mais utilizados</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 52)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="model"
              width={160}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Tokens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Requisições" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
