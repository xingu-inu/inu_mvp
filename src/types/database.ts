export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          related_goal_id: string | null
          related_task_id: string | null
          title: string
          type: Database['public']['Enums']['message_type']
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_goal_id?: string | null
          related_task_id?: string | null
          title: string
          type: Database['public']['Enums']['message_type']
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          related_goal_id?: string | null
          related_task_id?: string | null
          title?: string
          type?: Database['public']['Enums']['message_type']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_messages_related_goal_id_fkey'
            columns: ['related_goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_messages_related_task_id_fkey'
            columns: ['related_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      ai_observations: {
        Row: {
          created_at: string
          data_hash: string | null
          generated_at: string
          id: string
          nodes: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          data_hash?: string | null
          generated_at?: string
          id?: string
          nodes?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          data_hash?: string | null
          generated_at?: string
          id?: string
          nodes?: Json
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'announcements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      areas: {
        Row: {
          color: string
          created_at: string | null
          direction_id: string
          emoji: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: string | null
          type: Database['public']['Enums']['area_type']
          updated_at: string | null
          user_id: string
          why: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          direction_id: string
          emoji?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: string | null
          type?: Database['public']['Enums']['area_type']
          updated_at?: string | null
          user_id: string
          why?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          direction_id?: string
          emoji?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: string | null
          type?: Database['public']['Enums']['area_type']
          updated_at?: string | null
          user_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'areas_direction_id_fkey'
            columns: ['direction_id']
            isOneToOne: false
            referencedRelation: 'directions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'areas_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          related_goal_id: string | null
          related_task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          related_goal_id?: string | null
          related_task_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          related_goal_id?: string | null
          related_task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_conversations_related_goal_id_fkey'
            columns: ['related_goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_conversations_related_task_id_fkey'
            columns: ['related_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'chat_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      check_ins: {
        Row: {
          created_at: string | null
          date: string
          id: string
          note: string | null
          status: Database['public']['Enums']['checkin_status']
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          note?: string | null
          status: Database['public']['Enums']['checkin_status']
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          status?: Database['public']['Enums']['checkin_status']
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'check_ins_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'check_ins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_reflections: {
        Row: {
          created_at: string | null
          date: string
          id: string
          mood: Database['public']['Enums']['mood_level'] | null
          summary: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          mood?: Database['public']['Enums']['mood_level'] | null
          summary?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          mood?: Database['public']['Enums']['mood_level'] | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_reflections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      direction_history: {
        Row: {
          change_type: string
          created_at: string
          direction_id: string
          field_changed: string | null
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          direction_id: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          direction_id?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'direction_history_direction_id_fkey'
            columns: ['direction_id']
            isOneToOne: false
            referencedRelation: 'directions'
            referencedColumns: ['id']
          },
        ]
      }
      directions: {
        Row: {
          archived_at: string | null
          created_at: string | null
          id: string
          name: string | null
          statement: string
          status: Database['public']['Enums']['direction_status']
          updated_at: string | null
          user_id: string
          version: number
          why: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          statement: string
          status?: Database['public']['Enums']['direction_status']
          updated_at?: string | null
          user_id: string
          version?: number
          why?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          statement?: string
          status?: Database['public']['Enums']['direction_status']
          updated_at?: string | null
          user_id?: string
          version?: number
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'directions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      feedbacks: {
        Row: {
          admin_note: string | null
          category: string
          content: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedbacks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      goal_reflections: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          next_focus: string | null
          period_end: string
          period_start: string
          progress_feeling: string | null
          summary: string | null
          updated_at: string
          user_id: string
          why_temperature: number | null
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          next_focus?: string | null
          period_end: string
          period_start: string
          progress_feeling?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
          why_temperature?: number | null
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          next_focus?: string | null
          period_end?: string
          period_start?: string
          progress_feeling?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          why_temperature?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'goal_reflections_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
        ]
      }
      goal_status_history: {
        Row: {
          created_at: string
          from_status: Database['public']['Enums']['goal_status']
          goal_id: string
          id: string
          note: string | null
          reason: string | null
          to_status: Database['public']['Enums']['goal_status']
          user_id: string
        }
        Insert: {
          created_at?: string
          from_status: Database['public']['Enums']['goal_status']
          goal_id: string
          id?: string
          note?: string | null
          reason?: string | null
          to_status: Database['public']['Enums']['goal_status']
          user_id: string
        }
        Update: {
          created_at?: string
          from_status?: Database['public']['Enums']['goal_status']
          goal_id?: string
          id?: string
          note?: string | null
          reason?: string | null
          to_status?: Database['public']['Enums']['goal_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'goal_status_history_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
        ]
      }
      goals: {
        Row: {
          area_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          impact_area_ids: string[] | null
          name: string
          sort_order: string | null
          start_date: string | null
          status: Database['public']['Enums']['goal_status']
          status_change_note: string | null
          status_change_reason: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string
          vision: string | null
          why: string | null
        }
        Insert: {
          area_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          impact_area_ids?: string[] | null
          name: string
          sort_order?: string | null
          start_date?: string | null
          status?: Database['public']['Enums']['goal_status']
          status_change_note?: string | null
          status_change_reason?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id: string
          vision?: string | null
          why?: string | null
        }
        Update: {
          area_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          impact_area_ids?: string[] | null
          name?: string
          sort_order?: string | null
          start_date?: string | null
          status?: Database['public']['Enums']['goal_status']
          status_change_note?: string | null
          status_change_reason?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
          vision?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'goals_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'goals_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          access_token: string
          auto_sync: boolean
          calendar_id: string
          created_at: string
          id: string
          refresh_token: string | null
          sync_enabled: boolean
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          auto_sync?: boolean
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          auto_sync?: boolean
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string | null
          sync_enabled?: boolean
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          goal_id: string
          id: string
          is_completed: boolean
          name: string
          sort_order: string | null
          updated_at: string | null
          why: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id: string
          id?: string
          is_completed?: boolean
          name: string
          sort_order?: string | null
          updated_at?: string | null
          why?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          goal_id?: string
          id?: string
          is_completed?: boolean
          name?: string
          sort_order?: string | null
          updated_at?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'phases_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
        ]
      }
      monthly_reflections: {
        Row: {
          challenge: string | null
          created_at: string
          highlight: string | null
          id: string
          month_start: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge?: string | null
          created_at?: string
          highlight?: string | null
          id?: string
          month_start: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge?: string | null
          created_at?: string
          highlight?: string | null
          id?: string
          month_start?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_traits: {
        Row: {
          category: string
          created_at: string
          history: Json
          id: string
          label: string
          sort_order: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          history?: Json
          id?: string
          label: string
          sort_order: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          history?: Json
          id?: string
          label?: string
          sort_order?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profile_traits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          ai_model: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_admin: boolean
          name: string | null
          onboarding_completed: boolean | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_admin?: boolean
          name?: string | null
          onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean
          name?: string | null
          onboarding_completed?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_date_sort_orders: {
        Row: {
          created_at: string | null
          date: string
          id: string
          sort_order: string
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          sort_order: string
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          sort_order?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_date_sort_orders_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      task_status_history: {
        Row: {
          created_at: string
          from_status: Database['public']['Enums']['task_status']
          id: string
          note: string | null
          reason: string | null
          task_id: string
          to_status: Database['public']['Enums']['task_status']
          user_id: string
        }
        Insert: {
          created_at?: string
          from_status: Database['public']['Enums']['task_status']
          id?: string
          note?: string | null
          reason?: string | null
          task_id: string
          to_status: Database['public']['Enums']['task_status']
          user_id: string
        }
        Update: {
          created_at?: string
          from_status?: Database['public']['Enums']['task_status']
          id?: string
          note?: string | null
          reason?: string | null
          task_id?: string
          to_status?: Database['public']['Enums']['task_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_status_history_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          area_id: string | null
          best_streak: number | null
          completed_at: string | null
          created_at: string | null
          cross_link_group_map: Json | null
          duration_minutes: number | null
          end_date: string | null
          goal_id: string | null
          google_event_id: string | null
          group_id: string | null
          id: string
          is_active: boolean | null
          last_check_in_date: string | null
          name: string
          paused_at: string | null
          related_area_ids: string[] | null
          related_goal_ids: string[] | null
          repeat_days: number[] | null
          repeat_type: Database['public']['Enums']['repeat_type']
          scheduled_date: string | null
          sort_order: string | null
          specific_time: string | null
          start_date: string | null
          status: Database['public']['Enums']['task_status']
          status_change_note: string | null
          status_change_reason: string | null
          streak_count: number | null
          time_slot: Database['public']['Enums']['time_slot']
          updated_at: string | null
          user_id: string
          why: string | null
        }
        Insert: {
          area_id?: string | null
          best_streak?: number | null
          completed_at?: string | null
          created_at?: string | null
          cross_link_group_map?: Json | null
          duration_minutes?: number | null
          end_date?: string | null
          goal_id?: string | null
          google_event_id?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          last_check_in_date?: string | null
          name: string
          paused_at?: string | null
          related_area_ids?: string[] | null
          related_goal_ids?: string[] | null
          repeat_days?: number[] | null
          repeat_type?: Database['public']['Enums']['repeat_type']
          scheduled_date?: string | null
          sort_order?: string | null
          specific_time?: string | null
          start_date?: string | null
          status?: Database['public']['Enums']['task_status']
          status_change_note?: string | null
          status_change_reason?: string | null
          streak_count?: number | null
          time_slot?: Database['public']['Enums']['time_slot']
          updated_at?: string | null
          user_id: string
          why?: string | null
        }
        Update: {
          area_id?: string | null
          best_streak?: number | null
          completed_at?: string | null
          created_at?: string | null
          cross_link_group_map?: Json | null
          duration_minutes?: number | null
          end_date?: string | null
          goal_id?: string | null
          google_event_id?: string | null
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          last_check_in_date?: string | null
          name?: string
          paused_at?: string | null
          related_area_ids?: string[] | null
          related_goal_ids?: string[] | null
          repeat_days?: number[] | null
          repeat_type?: Database['public']['Enums']['repeat_type']
          scheduled_date?: string | null
          sort_order?: string | null
          specific_time?: string | null
          start_date?: string | null
          status?: Database['public']['Enums']['task_status']
          status_change_note?: string | null
          status_change_reason?: string | null
          streak_count?: number | null
          time_slot?: Database['public']['Enums']['time_slot']
          updated_at?: string | null
          user_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_goal_id_fkey'
            columns: ['goal_id']
            isOneToOne: false
            referencedRelation: 'goals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_phase_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      timeline_notes: {
        Row: {
          content: string
          created_at: string
          event_context: Json | null
          id: string
          observation_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_context?: Json | null
          id?: string
          observation_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_context?: Json | null
          id?: string
          observation_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reflections: {
        Row: {
          challenge: string | null
          created_at: string
          highlight: string | null
          id: string
          next_focus: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          challenge?: string | null
          created_at?: string
          highlight?: string | null
          id?: string
          next_focus?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          challenge?: string | null
          created_at?: string
          highlight?: string | null
          id?: string
          next_focus?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_update_sort_order: {
        Args: { p_table_name: string; p_updates: Json }
        Returns: undefined
      }
      complete_onboarding:
        | {
            Args: {
              p_areas: Json
              p_direction: Json
              p_first_goal?: Json
              p_first_task?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_areas: Json
              p_direction: Json
              p_first_goal?: Json
              p_user_id: string
            }
            Returns: Json
          }
      create_checkin_with_streak:
        | {
            Args: {
              p_date?: string
              p_note?: string
              p_status: Database['public']['Enums']['checkin_status']
              p_task_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_note?: string
              p_status: Database['public']['Enums']['checkin_status']
              p_task_id: string
              p_user_id: string
            }
            Returns: Json
          }
      create_new_roadmap_version: {
        Args: {
          p_carry_over_goal_ids?: string[]
          p_name?: string
          p_statement: string
          p_why?: string
        }
        Returns: Json
      }
      delete_archived_roadmap: {
        Args: { p_direction_id: string }
        Returns: Json
      }
      get_admin_engagement_stats: { Args: { p_days?: number }; Returns: Json }
      get_admin_feature_adoption: { Args: never; Returns: Json }
      get_admin_onboarding_funnel: { Args: never; Returns: Json }
      get_admin_retention_cohorts: {
        Args: { p_cohort_count?: number }
        Returns: {
          cohort_size: number
          cohort_week: string
          week_0: number
          week_1: number
          week_2: number
          week_3: number
          week_4: number
          week_5: number
          week_6: number
          week_7: number
          week_8: number
        }[]
      }
      get_admin_signup_chart: {
        Args: { p_days?: number }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_streak_distribution: {
        Args: never
        Returns: {
          bucket: string
          count: number
        }[]
      }
      get_archived_roadmap: { Args: { p_direction_id: string }; Returns: Json }
      get_direction_history: { Args: never; Returns: Json }
      get_reason_counts: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          entity_count: number
          entity_type: string
          reason: string
        }[]
      }
      get_roadmap_data: { Args: never; Returns: Json }
      get_today_dashboard: { Args: never; Returns: Json }
      get_today_tasks: {
        Args: { p_date?: string; p_direction_id?: string }
        Returns: Json
      }
      get_week_tasks: {
        Args: {
          p_direction_id?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      get_weekly_stats: { Args: { p_week_start: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      reset_missed_streaks: { Args: never; Returns: undefined }
      resolve_direction_for_date: { Args: { p_date: string }; Returns: string }
      resolve_directions_for_date: {
        Args: { p_date: string }
        Returns: string[]
      }
      undo_checkin_with_streak: {
        Args: { p_checkin_id: string }
        Returns: Json
      }
      upsert_task_date_sort_order: {
        Args: { p_date: string; p_sort_order: string; p_task_id: string }
        Returns: undefined
      }
    }
    Enums: {
      area_type:
        | 'health'
        | 'career'
        | 'finance'
        | 'relationships'
        | 'hobbies'
        | 'mental'
        | 'learning'
        | 'daily'
        | 'custom'
      checkin_status: 'done' | 'skip' | 'miss'
      direction_status: 'active' | 'archived'
      goal_status: 'active' | 'backlog' | 'completed' | 'maintenance' | 'paused' | 'archived'
      message_type: 'celebration' | 'encouragement' | 'insight' | 'suggestion' | 'reminder'
      mood_level: 'terrible' | 'bad' | 'neutral' | 'good' | 'great'
      repeat_type: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom' | 'once'
      task_status: 'active' | 'completed' | 'paused'
      time_slot: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'anytime'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      area_type: [
        'health',
        'career',
        'finance',
        'relationships',
        'hobbies',
        'mental',
        'learning',
        'daily',
        'custom',
      ],
      checkin_status: ['done', 'skip', 'miss'],
      direction_status: ['active', 'archived'],
      goal_status: ['active', 'backlog', 'completed', 'maintenance', 'paused', 'archived'],
      message_type: ['celebration', 'encouragement', 'insight', 'suggestion', 'reminder'],
      mood_level: ['terrible', 'bad', 'neutral', 'good', 'great'],
      repeat_type: ['daily', 'weekdays', 'weekends', 'weekly', 'custom', 'once'],
      task_status: ['active', 'completed', 'paused'],
      time_slot: ['dawn', 'morning', 'afternoon', 'evening', 'anytime'],
    },
  },
} as const
