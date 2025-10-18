import { useMemo } from 'react';
import type { RealtimeChannel, RealtimeChannelOptions, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useRealtime } from '@/hooks/useRealtime';

export type PostgresSubscription<Row extends Record<string, unknown> = Record<string, unknown>> = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<Row>) => void;
};

type BroadcastSubscription<Payload = unknown> = {
  event: string;
  callback: (payload: Payload) => void;
};

type PresenceSubscription<Payload = unknown> = {
  event: 'sync' | 'join' | 'leave';
  callback: (payload: Payload) => void;
};

type UseSupabaseSubscriptionOptions = {
  channel: string;
  config?: RealtimeChannelOptions;
  enabled?: boolean;
  postgres?: readonly PostgresSubscription[];
  broadcast?: readonly BroadcastSubscription[];
  presence?: readonly PresenceSubscription[];
  onStatusChange?: (status: RealtimeChannel['state']) => void;
  onError?: (error: unknown) => void;
};

export function useSupabaseSubscription({
  channel,
  config,
  enabled = true,
  postgres = [],
  broadcast = [],
  presence = [],
  onStatusChange,
  onError
}: UseSupabaseSubscriptionOptions) {
  const bindings = useMemo(() => {
    const postgresBindings = postgres.map((subscription) => ({
      type: 'postgres_changes' as const,
      event: subscription.event,
      schema: subscription.schema,
      table: subscription.table,
      filter: subscription.filter,
      callback: subscription.callback
    }));

    const broadcastBindings = broadcast.map((subscription) => ({
      type: 'broadcast' as const,
      event: subscription.event,
      callback: (payload: unknown) => subscription.callback(payload)
    }));

    const presenceBindings = presence.map((subscription) => ({
      type: 'presence' as const,
      event: subscription.event,
      callback: (payload: unknown) => subscription.callback(payload)
    }));

    return [...postgresBindings, ...broadcastBindings, ...presenceBindings];
  }, [broadcast, postgres, presence]);

  return useRealtime({
    channel,
    config,
    bindings,
    enabled,
    onStatusChange: onStatusChange
      ? (status) => onStatusChange(status as RealtimeChannel['state'])
      : undefined,
    onError
  });
}
