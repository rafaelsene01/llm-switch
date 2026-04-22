import type { Metadata } from 'next';
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient';

export const metadata: Metadata = {
  title: 'Analytics — LLM Gateway',
};

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Consumo de tokens e uso de modelos por usuário.
        </p>
      </div>
      <AnalyticsClient />
    </div>
  );
}
