import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  user_id: string;
  name?: string;
  ts: number;
}

interface Options {
  channelKey: string; // e.g. `chat:${userA}:${userB}` or `chat:group:${groupId}`
  userId: string | null;
  displayName?: string;
}

/**
 * Realtime presence-based typing indicator.
 * Returns a list of other users currently typing in the channel and a function
 * to broadcast that the local user is typing.
 */
export function useTypingIndicator({ channelKey, userId, displayName }: Options) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !channelKey) return;

    const channel = supabase.channel(`typing:${channelKey}`, {
      config: { presence: { key: userId } },
    });

    const refresh = () => {
      const state = channel.presenceState() as Record<string, Array<{ typing?: boolean; name?: string; ts?: number }>>;
      const now = Date.now();
      const others: TypingUser[] = [];
      for (const [uid, metas] of Object.entries(state)) {
        if (uid === userId) continue;
        const meta = metas[metas.length - 1];
        if (meta?.typing && meta.ts && now - meta.ts < 5000) {
          others.push({ user_id: uid, name: meta.name, ts: meta.ts });
        }
      }
      setTypingUsers(others);
    };

    channel
      .on('presence', { event: 'sync' }, refresh)
      .on('presence', { event: 'join' }, refresh)
      .on('presence', { event: 'leave' }, refresh)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false, name: displayName, ts: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelKey, userId, displayName]);

  const notifyTyping = useCallback(() => {
    const ch = channelRef.current;
    if (!ch || !userId) return;
    ch.track({ typing: true, name: displayName, ts: Date.now() });
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      ch.track({ typing: false, name: displayName, ts: Date.now() });
    }, 3000);
  }, [userId, displayName]);

  return { typingUsers, notifyTyping };
}
