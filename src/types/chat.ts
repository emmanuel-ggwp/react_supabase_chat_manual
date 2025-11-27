import { z } from 'zod';
import type { Database } from './database';

type MessageRow = Database['public']['Tables']['messages']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type RoomMemberRow = Database['public']['Tables']['room_members']['Row'];

export const profileSchema = z
  .object({
    id: z.string(),
    username: z.string().nullable(),
    avatar_url: z.string().nullable(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
  })
  .nullable();

export const messageRowSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  content: z.string(),
  message_type: z.string(),
  created_at: z.string(),
  expires_at: z.string().nullable().optional()
});

export const messageWithMetaSchema = messageRowSchema.extend({
  profile: profileSchema
});

export type MessageWithMeta = z.infer<typeof messageWithMetaSchema> & {
  status: 'sending' | 'sent' | 'error';
};

export type TypingIndicatorPayload = {
  roomId: string;
  userId: string;
  username: string | null;
  isTyping: boolean;
};

export type RoomMember = {
  user: ProfileRow;
  role: RoomMemberRow['role'];
};
