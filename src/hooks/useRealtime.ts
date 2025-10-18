import { useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel, RealtimeChannelOptions, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type PostgresBinding = {
  type: 'postgres_changes';
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
};

type BroadcastBinding = {
  type: 'broadcast';
  event: string;
  callback: (payload: unknown) => void;
};

type PresenceBinding = {
  type: 'presence';
  event: string;
  callback: (payload: unknown) => void;
};

type Binding = PostgresBinding | BroadcastBinding | PresenceBinding;

type ChannelOn = RealtimeChannel['on'];
type ChannelOnParams = Parameters<ChannelOn>;
export type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type UseRealtimeOptions = {
  channel: string;
  config?: RealtimeChannelOptions;
  bindings: Binding[];
  enabled?: boolean;
  onStatusChange?: (status: ChannelStatus) => void;
  onError?: (error: unknown) => void;
};

export function useRealtime({ channel, config, bindings, enabled = true, onStatusChange, onError }: UseRealtimeOptions) {
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const memoizedBindings = useMemo(() => bindings, [bindings]);

  useEffect(() => {
    if (!enabled) {
      setRealtimeChannel(null);
      return;
    }

    const clientChannel = config ? supabase.channel(channel, config) : supabase.channel(channel);
    const channelOn = clientChannel.on.bind(clientChannel) as ChannelOn;

    memoizedBindings.forEach((binding: Binding) => {
      switch (binding.type) {
        case 'postgres_changes':
          channelOn(
            'postgres_changes' as ChannelOnParams[0],
            {
              event: binding.event,
              schema: binding.schema ?? 'public',
              table: binding.table,
              filter: binding.filter
            } as ChannelOnParams[1],
            binding.callback as ChannelOnParams[2]
          );
          break;
        case 'broadcast':
          channelOn(
            'broadcast' as ChannelOnParams[0],
            { event: binding.event } as ChannelOnParams[1],
            ((payload) => binding.callback((payload as { payload: unknown }).payload)) as ChannelOnParams[2]
          );
          break;
        case 'presence':
          channelOn(
            'presence' as ChannelOnParams[0],
            { event: binding.event } as ChannelOnParams[1],
            binding.callback as ChannelOnParams[2]
          );
          break;
        default:
          break;
      }
    });

    clientChannel.subscribe((status: ChannelStatus, error?: unknown) => {
      if (status === 'CHANNEL_ERROR') {
        onError?.(error ?? new Error(`Error en el canal ${channel}`));
      }

      onStatusChange?.(status);
    });

    setRealtimeChannel(clientChannel);

    return () => {
      supabase.removeChannel(clientChannel);
      setRealtimeChannel(null);
    };
  }, [channel, config, enabled, memoizedBindings, onError, onStatusChange]);

  return realtimeChannel;
}
