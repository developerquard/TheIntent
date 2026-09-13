export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          created_at: string;
          decision: string;
          entry_hash: string;
          event_type: string;
          flags: Json;
          id: number;
          intent_hash: string | null;
          payload: Json;
          policy_version: string;
          prev_hash: string;
          room_id: string | null;
        };
        Insert: {
          created_at?: string;
          decision: string;
          entry_hash: string;
          event_type: string;
          flags?: Json;
          id?: number;
          intent_hash?: string | null;
          payload?: Json;
          policy_version?: string;
          prev_hash?: string;
          room_id?: string | null;
        };
        Update: {
          created_at?: string;
          decision?: string;
          entry_hash?: string;
          event_type?: string;
          flags?: Json;
          id?: number;
          intent_hash?: string | null;
          payload?: Json;
          policy_version?: string;
          prev_hash?: string;
          room_id?: string | null;
        };
        Relationships: [];
      };
      intents: {
        Row: {
          actor_id: string;
          actor_label: string;
          created_at: string;
          decision: string;
          expires_at: string;
          flags: Json;
          id: string;
          intent_hash: string;
          intent_text: string;
          match_similarity: number | null;
          policy_version: string;
          room_id: string | null;
          status: string;
        };
        Insert: {
          actor_id: string;
          actor_label: string;
          created_at?: string;
          decision?: string;
          expires_at?: string;
          flags?: Json;
          id?: string;
          intent_hash: string;
          intent_text: string;
          match_similarity?: number | null;
          policy_version?: string;
          room_id?: string | null;
          status?: string;
        };
        Update: {
          actor_id?: string;
          actor_label?: string;
          created_at?: string;
          decision?: string;
          expires_at?: string;
          flags?: Json;
          id?: string;
          intent_hash?: string;
          intent_text?: string;
          match_similarity?: number | null;
          policy_version?: string;
          room_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      room_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          room_id: string;
          sender_id: string;
          sender_label: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role?: string;
          room_id: string;
          sender_id: string;
          sender_label: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          room_id?: string;
          sender_id?: string;
          sender_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          closed_at: string | null;
          created_at: string;
          decision: string;
          id: string;
          intent_hash: string;
          match_similarity: number | null;
          member_ids: string[];
          member_labels: string[];
          policy_version: string;
          status: string;
          tags: string[];
          topic: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          intent_hash: string;
          match_similarity?: number | null;
          member_ids?: string[];
          member_labels?: string[];
          policy_version?: string;
          status?: string;
          tags?: string[];
          topic: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          decision?: string;
          id?: string;
          intent_hash?: string;
          match_similarity?: number | null;
          member_ids?: string[];
          member_labels?: string[];
          policy_version?: string;
          status?: string;
          tags?: string[];
          topic?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          kind: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          kind?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          kind?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_intent_match: {
        Args: {
          p_actor_id: string;
          p_actor_label: string;
          p_candidate_id: string;
          p_intent_hash: string;
          p_intent_text: string;
          p_similarity: number;
          p_tags: string[];
          p_topic: string;
        };
        Returns: { room_id: string }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
