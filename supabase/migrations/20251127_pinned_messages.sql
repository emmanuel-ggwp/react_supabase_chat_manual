-- Tabla para mensajes anclados (personales)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, message_id) -- Evitar duplicados
);

-- Habilitar RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view their own pinned messages" ON public.pinned_messages;
CREATE POLICY "Users can view their own pinned messages" 
    ON public.pinned_messages FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can pin messages" ON public.pinned_messages;
CREATE POLICY "Users can pin messages" 
    ON public.pinned_messages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unpin their own messages" ON public.pinned_messages;
CREATE POLICY "Users can unpin their own messages" 
    ON public.pinned_messages FOR DELETE 
    USING (auth.uid() = user_id);

-- Índice para búsquedas rápidas por sala y usuario
CREATE INDEX IF NOT EXISTS pinned_messages_room_user_idx ON public.pinned_messages (room_id, user_id);
