export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          message_type: string;
          room_id: string;
          user_id: string;
          expires_at: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          message_type?: string;
          room_id: string;
          user_id: string;
          expires_at?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          message_type?: string;
          room_id?: string;
          user_id?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      rooms: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_direct: boolean;
          is_public: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_direct?: boolean;
          is_public?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_direct?: boolean;
          is_public?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      room_members: {
        Row: {
          created_at: string;
          id: string;
          role: 'owner' | 'moderator' | 'member';
          room_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: 'owner' | 'moderator' | 'member';
          room_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: 'owner' | 'moderator' | 'member';
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
