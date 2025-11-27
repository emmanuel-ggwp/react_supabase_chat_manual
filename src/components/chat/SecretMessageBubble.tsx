import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Eye, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type SecretMessageBubbleProps = {
  messageId: string;
  isSender: boolean;
  isRead: boolean;
};

export function SecretMessageBubble({ messageId, isSender, isRead }: SecretMessageBubbleProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState<string[]>([]);

  useEffect(() => {
    if (isRead) {
      const fetchViewers = async () => {
        const { data } = await supabase
          .from('secret_views')
          .select('profiles(id, username)')
          .eq('message_id', messageId);
        
        if (data) {
          const names = data
          .sort((a, b) => {
            if (a.profiles?.id === user?.id) return -1;
            if (b.profiles?.id === user?.id) return 1;
            return 0;
          })
            .map((item: any) => {
              if (item.profiles?.id === user?.id) return 'Ti';
              return item.profiles?.username;
            })
            .filter(Boolean);
          setViewers(names);
        }
      };
      fetchViewers();
    }
  }, [isRead, messageId, user]);

  const handleReveal = async () => {
    if (isRevealed || isLoading) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('read_secret_message', {
        p_message_id: messageId
      });

      if (error) throw error;

      if (!data) {
        setError('Este mensaje ya ha sido leído o expiró.');
      } else {
        setContent(data);
        setIsRevealed(true);
      }
    } catch (err) {
      console.error(err);
      setError('Error al desencriptar el mensaje.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 italic">
        <Flame className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (isRevealed && content) {
    return (
      <div className="animate-in fade-in zoom-in duration-300">
        <div className="rounded-lg bg-gray-800 p-3 text-white shadow-inner">
          <p>{content}</p>
        </div>
        <p className="mt-1 text-[10px] text-chat-muted flex items-center gap-1">
          <Flame className="h-3 w-3" /> Mensaje autodestruido del servidor
        </p>
      </div>
    );
  }

  if (isRead) {
    return (
      <div className="flex w-full max-w-[250px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-gray-700 bg-gray-800/30 p-6 opacity-70 cursor-not-allowed">
        <div className="flex flex-col items-center gap-2 text-sm font-medium text-gray-400">
          <div className="rounded-full bg-gray-700/50 p-2">
            <Eye className="h-5 w-5" />
          </div>
          <span>{viewers.length > 0 ? `Visto por ${viewers.join(', ')}` : 'Ya visto'}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleReveal}
      disabled={isLoading}
      className={`group relative flex w-full max-w-[250px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border p-6 transition-all
        ${isSender 
          ? 'border-chat-primary/50 bg-chat-primary/10 hover:bg-chat-primary/20' 
          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
        }`}
    >
      {/* Efecto de difuminado (Blur) */}
      <div className="absolute inset-0 backdrop-blur-md bg-white/5" />
      
      <div className="relative z-10 flex flex-col items-center gap-2 text-sm font-medium">
        {isLoading ? (
          <span className="animate-pulse">Desencriptando...</span>
        ) : (
          <>
            <div className="rounded-full bg-white/10 p-2 group-hover:bg-white/20 transition-colors">
              {isSender ? <Lock className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </div>
            <span>{isSender ? 'Mensaje oculto enviado' : 'Toca para ver (Vista única)'}</span>
          </>
        )}
      </div>
    </button>
  );
}
