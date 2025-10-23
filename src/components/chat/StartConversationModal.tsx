import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/types/database';
import type { UseRoomsReturn } from '@/hooks/useRooms';
import { useChat } from './ChatProvider';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type StartConversationModalProps = {
    open: boolean;
    onClose: () => void;
};

export function StartConversationModal({ open, onClose }: StartConversationModalProps) {
    const { user } = useAuth();
    const {
        startConversation: onStartConversation
    } = useChat();
    const [users, setUsers] = useState<ProfileRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUserId, setPendingUserId] = useState<string | null>(null);



    useEffect(() => {
        if (!open) {
            setUsers([]);
            setError(null);
            setPendingUserId(null);
            setIsLoading(false);
            return;
        }

        if (!user?.id) {
            setUsers([]);
            setError('Debes iniciar sesión para iniciar una conversación.');
            setIsLoading(false);
            return;
        }

        let isActive = true;

        const loadUsers = async () => {
            setIsLoading(true);
            setError(null);

            const { data, error: loadError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, created_at, updated_at')
                .neq('id', user.id)
                .order('username', { ascending: true });

            if (!isActive) {
                return;
            }

            if (loadError) {
                console.error('No se pudieron cargar los usuarios disponibles', loadError);
                setError(loadError.message);
                setUsers([]);
            } else {
                setUsers((data ?? []) as ProfileRow[]);
            }

            setIsLoading(false);
        };

        void loadUsers();

        return () => {
            isActive = false;
        };
    }, [open, user?.id]);

    const handleSelectUser = useCallback(
        async (profile: ProfileRow) => {
            if (pendingUserId || !open) {
                return;
            }

            if (!user?.id) {
                setError('Debes iniciar sesión para iniciar una conversación.');
                return;
            }

            setError(null);
            setPendingUserId(profile.id);

            const { error: conversationError } = await onStartConversation(profile);

            if (conversationError) {
                setError(conversationError);
                setPendingUserId(null);
                return;
            }

            setPendingUserId(null);
            onClose();
        },
        [onClose, onStartConversation, open, pendingUserId, user?.id]
    );

    if (!open) {
        return null;
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <p className="rounded-lg border border-chat-surface/60 bg-chat-surface/80 px-4 py-3 text-sm text-chat-muted">
                    Cargando usuarios...
                </p>
            );
        }

        if (users.length === 0) {
            return (
                <p className="rounded-lg border border-dashed border-chat-surface/60 bg-chat-surface/70 px-4 py-3 text-sm text-chat-muted">
                    No hay usuarios disponibles en este momento.
                </p>
            );
        }

        return (
            <ul className="grid gap-2">
                {users.map((profile) => {
                    const displayName = profile.username ?? 'Usuario sin nombre';
                    const isPending = pendingUserId === profile.id;

                    return (
                        <li key={profile.id}>
                            <button
                                type="button"
                                onClick={() => void handleSelectUser(profile)}
                                disabled={isPending}
                                className="flex w-full items-center justify-between rounded-lg border border-chat-surface/60 bg-chat-surface/90 px-4 py-3 text-left text-sm text-white transition hover:border-chat-primary/60 hover:bg-chat-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <span className="font-semibold">{displayName}</span>
                                <span className="text-xs uppercase tracking-wide text-chat-muted/80">
                                    {isPending ? 'Creando...' : 'Iniciar'}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur">
            <div className="w-full max-w-lg rounded-2xl border border-chat-surface/60 bg-chat-surface/95 p-6 shadow-2xl">
                <header className="space-y-1">
                    <h2 className="text-xl font-semibold text-white">Iniciar conversación</h2>
                    <p className="text-sm text-chat-muted">
                        Selecciona a la persona con la que deseas conversar. Crearemos una sala privada solo para ustedes.
                    </p>
                </header>

                <div className="mt-6 space-y-4">
                    {error ? (
                        <p className="rounded-lg border border-chat-danger/60 bg-chat-danger/15 px-3 py-2 text-sm text-chat-danger">
                            {error}
                        </p>
                    ) : null}

                    {renderContent()}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-chat-surface/60 px-4 py-2 text-sm font-semibold text-chat-muted transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chat-primary/60"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
