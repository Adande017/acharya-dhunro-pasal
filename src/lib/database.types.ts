export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          display_name: string;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          display_name: string;
          avatar_path?: string | null;
        },
        {
          display_name?: string;
          avatar_path?: string | null;
          updated_at?: string;
        }
      >;
      posts: Table<
        {
          id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        },
        { author_id: string; content: string },
        { content?: string; updated_at?: string }
      >;
      comments: Table<
        {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        },
        { post_id: string; author_id: string; content: string },
        { content?: string; updated_at?: string }
      >;
      post_likes: Table<
        { post_id: string; user_id: string; created_at: string },
        { post_id: string; user_id: string },
        never
      >;
      friendships: Table<
        {
          user_low: string;
          user_high: string;
          requester_id: string;
          status: "pending" | "accepted" | "declined";
          created_at: string;
          updated_at: string;
        },
        never,
        never
      >;
      conversations: Table<
        { id: string; created_at: string },
        Record<string, never>,
        never
      >;
      conversation_members: Table<
        { conversation_id: string; user_id: string; joined_at: string },
        { conversation_id: string; user_id: string },
        never
      >;
      messages: Table<
        {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        },
        { conversation_id: string; sender_id: string; content: string },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      start_conversation: {
        Args: { target_user: string };
        Returns: string;
      };
      request_friend: {
        Args: { target_user: string };
        Returns: string;
      };
      respond_to_friend_request: {
        Args: { requester: string; accept_request: boolean };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
