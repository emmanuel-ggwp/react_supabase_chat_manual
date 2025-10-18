import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ChannelStatus } from './useRealtime';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

type UseRoomSubscriptionOptions = {
  enabled?: boolean;
  onRoomInsert?: (room: RoomRow) => void;
  onRoomUpdate?: (room: RoomRow) => void;
  onRoomDelete?: (roomId: string) => void;
  onMessageInsert?: (message: MessageRow) => void;
};

export function useRoomSubscription({
  enabled = true,
  onRoomInsert,
  onRoomUpdate,
  onRoomDelete,
  onMessageInsert
}: UseRoomSubscriptionOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channel = supabase
      .channel('rooms-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, (payload: RealtimePostgresChangesPayload<RoomRow>) => {
        const room = payload.new as RoomRow;
        onRoomInsert?.(room);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload: RealtimePostgresChangesPayload<RoomRow>) => {
        const room = payload.new as RoomRow;
        onRoomUpdate?.(room);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, (payload: RealtimePostgresChangesPayload<RoomRow>) => {
        const room = payload.old as RoomRow;
        onRoomDelete?.(room.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        const message = payload.new as MessageRow;
        onMessageInsert?.(message);
      })
      .subscribe((status: ChannelStatus) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error for rooms subscription.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onRoomDelete, onRoomInsert, onRoomUpdate, onMessageInsert]);
}
