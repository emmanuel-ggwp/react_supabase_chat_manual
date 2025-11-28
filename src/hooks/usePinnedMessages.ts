import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function usePinnedMessages(roomId: string | null) {
  const { user } = useAuth();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Cargar pines al entrar a la sala
  useEffect(() => {
    if (!user || !roomId) {
      setPinnedIds(new Set());
      return;
    }

    const fetchPins = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('pinned_messages')
        .select('message_id')
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (data) {
        setPinnedIds(new Set(data.map((p) => p.message_id)));
      }
      setIsLoading(false);
    };

    fetchPins();
  }, [roomId, user?.id]);

  const togglePin = useCallback(async (messageId: string) => {
    if (!user || !roomId) return;

    const isPinned = pinnedIds.has(messageId);

    // Actualización optimista
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (isPinned) next.delete(messageId);
      else next.add(messageId);
      return next;
    });

    try {
      if (isPinned) {
        await supabase
          .from('pinned_messages')
          .delete()
          .eq('user_id', user.id)
          .eq('message_id', messageId);
      } else {
        await supabase
          .from('pinned_messages')
          .insert({ user_id: user.id, message_id: messageId, room_id: roomId });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      // Revertir en caso de error
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (isPinned) next.add(messageId);
        else next.delete(messageId);
        return next;
      });
    }
  }, [pinnedIds, roomId, user]);

  return { pinnedIds, togglePin, isLoading };
}
