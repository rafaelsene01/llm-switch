import { ActivityDetailClient } from '@/components/activity/ActivityDetailClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id } = await params;
  return <ActivityDetailClient id={Number(id)} />;
}
