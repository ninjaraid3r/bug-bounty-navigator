export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_tasks: {
        Row: {
          agent_codename: string
          agent_type: string
          conversation_id: string | null
          created_at: string
          created_count: number
          duration_ms: number | null
          findings_count: number
          fixed_count: number
          found_count: number
          grade: string | null
          grade_reason: string | null
          grade_score: number | null
          id: string
          manual_grade_override: boolean
          message_id: string | null
          metadata: Json | null
          mission_id: string | null
          prompt: string | null
          result: string | null
          session_id: string | null
          specialty_notes: string | null
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_codename: string
          agent_type: string
          conversation_id?: string | null
          created_at?: string
          created_count?: number
          duration_ms?: number | null
          findings_count?: number
          fixed_count?: number
          found_count?: number
          grade?: string | null
          grade_reason?: string | null
          grade_score?: number | null
          id?: string
          manual_grade_override?: boolean
          message_id?: string | null
          metadata?: Json | null
          mission_id?: string | null
          prompt?: string | null
          result?: string | null
          session_id?: string | null
          specialty_notes?: string | null
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_codename?: string
          agent_type?: string
          conversation_id?: string | null
          created_at?: string
          created_count?: number
          duration_ms?: number | null
          findings_count?: number
          fixed_count?: number
          found_count?: number
          grade?: string | null
          grade_reason?: string | null
          grade_score?: number | null
          id?: string
          manual_grade_override?: boolean
          message_id?: string | null
          metadata?: Json | null
          mission_id?: string | null
          prompt?: string | null
          result?: string | null
          session_id?: string | null
          specialty_notes?: string | null
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          codename: string
          config: Json | null
          created_at: string
          id: string
          name: string
          parent_agent_id: string | null
          role_description: string | null
          status: Database["public"]["Enums"]["agent_status"]
          system_prompt: string | null
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          codename: string
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          parent_agent_id?: string | null
          role_description?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt?: string | null
          type: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          codename?: string
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          parent_agent_id?: string | null
          role_description?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt?: string | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          agent_codename: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          last_used_at: string | null
          metadata: Json | null
          name: string
          prompt_template: string
          source: string
          status: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          agent_codename: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          prompt_template: string
          source?: string
          status?: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          agent_codename?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          prompt_template?: string
          source?: string
          status?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          affected_url: string | null
          created_at: string
          description: string | null
          id: string
          mission_id: string
          proof_of_concept: string | null
          reward_amount: number | null
          severity: Database["public"]["Enums"]["finding_severity"]
          status: string
          title: string
          tools_used: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affected_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mission_id: string
          proof_of_concept?: string | null
          reward_amount?: number | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: string
          title: string
          tools_used?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affected_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mission_id?: string
          proof_of_concept?: string | null
          reward_amount?: number | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: string
          title?: string
          tools_used?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          agent_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["message_role"]
          sender_name: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          sender_name: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          sender_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          scope: string | null
          status: Database["public"]["Enums"]["mission_status"]
          target: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          scope?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recon_map_nodes: {
        Row: {
          created_at: string
          id: string
          label: string
          map_id: string
          metadata: Json
          node_key: string
          node_type: string
          parent_key: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          map_id: string
          metadata?: Json
          node_key: string
          node_type?: string
          parent_key?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          map_id?: string
          metadata?: Json
          node_key?: string
          node_type?: string
          parent_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_map_nodes_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "recon_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_maps: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          killchain: Json
          mission_id: string
          node_count: number
          session_id: string | null
          summary: string | null
          target: string
          tips: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          killchain?: Json
          mission_id: string
          node_count?: number
          session_id?: string | null
          summary?: string | null
          target: string
          tips?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          killchain?: Json
          mission_id?: string
          node_count?: number
          session_id?: string | null
          summary?: string | null
          target?: string
          tips?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          agent_insights: Json
          automations_suggested: Json | null
          conversation_id: string | null
          created_at: string
          critical_changes: Json
          ended_at: string | null
          findings_count: number
          grade: string | null
          grade_notes: string | null
          grade_score: number | null
          high_learnings: Json
          id: string
          key_topic: string | null
          lessons_learned: string | null
          low_learnings: Json
          manual_grade_override: boolean
          medium_learnings: Json
          mission_id: string
          next_missions: Json | null
          started_at: string
          status: string
          summary: string | null
          tasks_count: number
          team_improvements: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_insights?: Json
          automations_suggested?: Json | null
          conversation_id?: string | null
          created_at?: string
          critical_changes?: Json
          ended_at?: string | null
          findings_count?: number
          grade?: string | null
          grade_notes?: string | null
          grade_score?: number | null
          high_learnings?: Json
          id?: string
          key_topic?: string | null
          lessons_learned?: string | null
          low_learnings?: Json
          manual_grade_override?: boolean
          medium_learnings?: Json
          mission_id: string
          next_missions?: Json | null
          started_at?: string
          status?: string
          summary?: string | null
          tasks_count?: number
          team_improvements?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_insights?: Json
          automations_suggested?: Json | null
          conversation_id?: string | null
          created_at?: string
          critical_changes?: Json
          ended_at?: string | null
          findings_count?: number
          grade?: string | null
          grade_notes?: string | null
          grade_score?: number | null
          high_learnings?: Json
          id?: string
          key_topic?: string | null
          lessons_learned?: string | null
          low_learnings?: Json
          manual_grade_override?: boolean
          medium_learnings?: Json
          mission_id?: string
          next_missions?: Json | null
          started_at?: string
          status?: string
          summary?: string | null
          tasks_count?: number
          team_improvements?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          bookmarked: boolean
          category: string
          created_at: string
          custom_notes: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_default: boolean
          name: string
          tags: string[] | null
          updated_at: string
          use_case: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          bookmarked?: boolean
          category: string
          created_at?: string
          custom_notes?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_default?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string
          use_case?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          bookmarked?: boolean
          category?: string
          created_at?: string
          custom_notes?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string
          use_case?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_status: "active" | "idle" | "working" | "offline"
      agent_type: "manager" | "lead" | "raider"
      finding_severity: "info" | "low" | "medium" | "high" | "critical"
      message_role: "user" | "manager" | "lead" | "raider"
      mission_status:
        | "planning"
        | "active"
        | "paused"
        | "completed"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["active", "idle", "working", "offline"],
      agent_type: ["manager", "lead", "raider"],
      finding_severity: ["info", "low", "medium", "high", "critical"],
      message_role: ["user", "manager", "lead", "raider"],
      mission_status: ["planning", "active", "paused", "completed", "archived"],
    },
  },
} as const
