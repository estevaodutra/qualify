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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string | null
          description: string | null
          entity: string | null
          id: string
          read: boolean | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          read?: boolean | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity?: string | null
          id?: string
          read?: boolean | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_four: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_four?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_body: Json | null
          response_body: Json | null
          response_time_ms: number | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_body?: Json | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      call_campaigns: {
        Row: {
          api4com_config: Json | null
          company_id: string | null
          created_at: string | null
          description: string | null
          dial_delay_minutes: number | null
          id: string
          is_priority: boolean | null
          name: string
          priority_position: number | null
          queue_execution_enabled: boolean | null
          queue_interval_seconds: number | null
          queue_unavailable_behavior: string | null
          retry_count: number | null
          retry_exceeded_action_id: string | null
          retry_exceeded_behavior: string | null
          retry_interval_minutes: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api4com_config?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          dial_delay_minutes?: number | null
          id?: string
          is_priority?: boolean | null
          name: string
          priority_position?: number | null
          queue_execution_enabled?: boolean | null
          queue_interval_seconds?: number | null
          queue_unavailable_behavior?: string | null
          retry_count?: number | null
          retry_exceeded_action_id?: string | null
          retry_exceeded_behavior?: string | null
          retry_interval_minutes?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api4com_config?: Json | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          dial_delay_minutes?: number | null
          id?: string
          is_priority?: boolean | null
          name?: string
          priority_position?: number | null
          queue_execution_enabled?: boolean | null
          queue_interval_seconds?: number | null
          queue_unavailable_behavior?: string | null
          retry_count?: number | null
          retry_exceeded_action_id?: string | null
          retry_exceeded_behavior?: string | null
          retry_interval_minutes?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      call_leads: {
        Row: {
          assigned_operator_id: string | null
          attempts: number | null
          campaign_id: string
          company_id: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          last_attempt_at: string | null
          name: string | null
          phone: string
          result_action_id: string | null
          result_notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_operator_id?: string | null
          attempts?: number | null
          campaign_id: string
          company_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_attempt_at?: string | null
          name?: string | null
          phone: string
          result_action_id?: string | null
          result_notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_operator_id?: string | null
          attempts?: number | null
          campaign_id?: string
          company_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_attempt_at?: string | null
          name?: string | null
          phone?: string
          result_action_id?: string | null
          result_notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_leads_result_action_id_fkey"
            columns: ["result_action_id"]
            isOneToOne: false
            referencedRelation: "call_script_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          action_id: string | null
          attempt_number: number | null
          audio_url: string | null
          call_status: string | null
          campaign_id: string | null
          company_id: string | null
          created_at: string | null
          custom_message: string | null
          duration_seconds: number | null
          ended_at: string | null
          external_call_id: string | null
          id: string
          lead_id: string | null
          max_attempts: number | null
          next_retry_at: string | null
          notes: string | null
          observations: string | null
          operator_id: string | null
          scheduled_for: string | null
          script_path: Json | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          action_id?: string | null
          attempt_number?: number | null
          audio_url?: string | null
          call_status?: string | null
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          notes?: string | null
          observations?: string | null
          operator_id?: string | null
          scheduled_for?: string | null
          script_path?: Json | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          action_id?: string | null
          attempt_number?: number | null
          audio_url?: string | null
          call_status?: string | null
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          external_call_id?: string | null
          id?: string
          lead_id?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          notes?: string | null
          observations?: string | null
          operator_id?: string | null
          scheduled_for?: string | null
          script_path?: Json | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "call_script_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "call_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "call_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      call_operators: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_call_id: string | null
          current_campaign_id: string | null
          extension: string | null
          id: string
          is_active: boolean | null
          last_call_ended_at: string | null
          operator_name: string
          personal_interval_seconds: number | null
          status: string | null
          total_calls: number | null
          total_calls_answered: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_call_id?: string | null
          current_campaign_id?: string | null
          extension?: string | null
          id?: string
          is_active?: boolean | null
          last_call_ended_at?: string | null
          operator_name: string
          personal_interval_seconds?: number | null
          status?: string | null
          total_calls?: number | null
          total_calls_answered?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_call_id?: string | null
          current_campaign_id?: string | null
          extension?: string | null
          id?: string
          is_active?: boolean | null
          last_call_ended_at?: string | null
          operator_name?: string
          personal_interval_seconds?: number | null
          status?: string | null
          total_calls?: number | null
          total_calls_answered?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_operators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queue: {
        Row: {
          attempt_number: number | null
          call_log_id: string | null
          campaign_id: string
          company_id: string | null
          created_at: string | null
          id: string
          is_priority: boolean | null
          lead_id: string | null
          lead_name: string | null
          max_attempts: number | null
          observations: string | null
          phone: string
          position: number
          scheduled_for: string | null
          source: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          call_log_id?: string | null
          campaign_id: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_priority?: boolean | null
          lead_id?: string | null
          lead_name?: string | null
          max_attempts?: number | null
          observations?: string | null
          phone: string
          position?: number
          scheduled_for?: string | null
          source?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          call_log_id?: string | null
          campaign_id?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_priority?: boolean | null
          lead_id?: string | null
          lead_name?: string | null
          max_attempts?: number | null
          observations?: string | null
          phone?: string
          position?: number
          scheduled_for?: string | null
          source?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "call_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      call_script_actions: {
        Row: {
          action_config: Json | null
          action_type: string
          campaign_id: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          campaign_id: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          campaign_id?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_script_actions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      call_scripts: {
        Row: {
          campaign_id: string
          created_at: string | null
          edges: Json
          id: string
          name: string
          nodes: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_scripts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_groups: {
        Row: {
          added_at: string | null
          campaign_id: string
          group_jid: string
          group_name: string
          id: string
          instance_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          campaign_id: string
          group_jid: string
          group_name: string
          id?: string
          instance_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          campaign_id?: string
          group_jid?: string
          group_name?: string
          id?: string
          instance_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          campaign_type: string
          channel: string
          created_at: string | null
          id: string
          name: string
          sent: number | null
          status: string | null
          success_rate: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          campaign_type?: string
          channel?: string
          created_at?: string | null
          id?: string
          name: string
          sent?: number | null
          status?: string | null
          success_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          campaign_type?: string
          channel?: string
          created_at?: string | null
          id?: string
          name?: string
          sent?: number | null
          status?: string | null
          success_rate?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_campaign_contacts: {
        Row: {
          campaign_id: string
          created_at: string
          current_sequence_id: string | null
          current_step: number
          id: string
          lead_id: string | null
          sequence_completed_at: string | null
          sequence_started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          current_sequence_id?: string | null
          current_step?: number
          id?: string
          lead_id?: string | null
          sequence_completed_at?: string | null
          sequence_started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          current_sequence_id?: string | null
          current_step?: number
          id?: string
          lead_id?: string | null
          sequence_completed_at?: string | null
          sequence_started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "dispatch_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_campaign_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_contacts_sequence_fk"
            columns: ["current_sequence_id"]
            isOneToOne: false
            referencedRelation: "dispatch_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          instance_id: string | null
          name: string
          status: string
          updated_at: string
          use_exclusive_instance: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          instance_id?: string | null
          name: string
          status?: string
          updated_at?: string
          use_exclusive_instance?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          instance_id?: string | null
          name?: string
          status?: string
          updated_at?: string
          use_exclusive_instance?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_logs: {
        Row: {
          campaign_id: string | null
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          instance_id: string | null
          recipient: string
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          recipient: string
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string | null
          recipient?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sequence_logs: {
        Row: {
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          read_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          step_id: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_id?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sequence_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "dispatch_campaign_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_sequence_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "dispatch_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_sequence_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "dispatch_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sequence_steps: {
        Row: {
          condition_config: Json | null
          condition_type: string | null
          created_at: string
          delay_unit: string | null
          delay_value: number | null
          id: string
          message_buttons: Json | null
          message_content: string | null
          message_media_url: string | null
          message_type: string | null
          sequence_id: string
          step_order: number
          step_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_config?: Json | null
          condition_type?: string | null
          created_at?: string
          delay_unit?: string | null
          delay_value?: number | null
          id?: string
          message_buttons?: Json | null
          message_content?: string | null
          message_media_url?: string | null
          message_type?: string | null
          sequence_id: string
          step_order?: number
          step_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_config?: Json | null
          condition_type?: string | null
          created_at?: string
          delay_unit?: string | null
          delay_value?: number | null
          id?: string
          message_buttons?: Json | null
          message_content?: string | null
          message_media_url?: string | null
          message_type?: string | null
          sequence_id?: string
          step_order?: number
          step_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "dispatch_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sequences: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "dispatch_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_campaigns: {
        Row: {
          config: Json | null
          created_at: string | null
          edit_permission: string | null
          group_description: string | null
          group_jid: string | null
          group_name: string | null
          group_photo_url: string | null
          id: string
          instance_id: string | null
          invite_link: string | null
          message_permission: string | null
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          edit_permission?: string | null
          group_description?: string | null
          group_jid?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          message_permission?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          edit_permission?: string | null
          group_description?: string | null
          group_jid?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          invite_link?: string | null
          message_permission?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      group_execution_leads: {
        Row: {
          created_at: string | null
          cycle_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          lid: string | null
          list_id: string
          name: string | null
          origin_detail: string | null
          origin_event: string | null
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lid?: string | null
          list_id: string
          name?: string | null
          origin_detail?: string | null
          origin_event?: string | null
          phone: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lid?: string | null
          list_id?: string
          name?: string | null
          origin_detail?: string | null
          origin_event?: string | null
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_execution_leads_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "group_execution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      group_execution_lists: {
        Row: {
          action_type: string
          call_campaign_id: string | null
          campaign_id: string
          created_at: string | null
          current_cycle_id: string | null
          current_window_end: string | null
          current_window_start: string | null
          execution_days_of_week: number[] | null
          execution_schedule_type: string
          execution_scheduled_time: string | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          message_template: string | null
          monitored_events: string[]
          name: string
          updated_at: string | null
          user_id: string
          webhook_params: Json
          webhook_url: string | null
          window_duration_hours: number | null
          window_end_time: string | null
          window_start_time: string | null
          window_type: string
        }
        Insert: {
          action_type?: string
          call_campaign_id?: string | null
          campaign_id: string
          created_at?: string | null
          current_cycle_id?: string | null
          current_window_end?: string | null
          current_window_start?: string | null
          execution_days_of_week?: number[] | null
          execution_schedule_type?: string
          execution_scheduled_time?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          message_template?: string | null
          monitored_events?: string[]
          name?: string
          updated_at?: string | null
          user_id: string
          webhook_params?: Json
          webhook_url?: string | null
          window_duration_hours?: number | null
          window_end_time?: string | null
          window_start_time?: string | null
          window_type?: string
        }
        Update: {
          action_type?: string
          call_campaign_id?: string | null
          campaign_id?: string
          created_at?: string | null
          current_cycle_id?: string | null
          current_window_end?: string | null
          current_window_start?: string | null
          execution_days_of_week?: number[] | null
          execution_schedule_type?: string
          execution_scheduled_time?: string | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          message_template?: string | null
          monitored_events?: string[]
          name?: string
          updated_at?: string | null
          user_id?: string
          webhook_params?: Json
          webhook_url?: string | null
          window_duration_hours?: number | null
          window_end_time?: string | null
          window_start_time?: string | null
          window_type?: string
        }
        Relationships: []
      }
      group_member_history: {
        Row: {
          action: string
          created_at: string | null
          group_campaign_id: string
          id: string
          member_phone: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          group_campaign_id: string
          id?: string
          member_phone: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          member_phone?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_history_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_campaign_id: string
          id: string
          is_admin: boolean | null
          joined_at: string | null
          last_message_at: string | null
          last_strike_at: string | null
          left_at: string | null
          lid: string | null
          message_count: number | null
          name: string | null
          phone: string | null
          profile_photo: string | null
          status: string | null
          strikes: number | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          group_campaign_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_message_at?: string | null
          last_strike_at?: string | null
          left_at?: string | null
          lid?: string | null
          message_count?: number | null
          name?: string | null
          phone?: string | null
          profile_photo?: string | null
          status?: string | null
          strikes?: number | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          group_campaign_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_message_at?: string | null
          last_strike_at?: string | null
          left_at?: string | null
          lid?: string | null
          message_count?: number | null
          name?: string | null
          phone?: string | null
          profile_photo?: string | null
          status?: string | null
          strikes?: number | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_logs: {
        Row: {
          campaign_name: string | null
          error_message: string | null
          external_message_id: string | null
          group_campaign_id: string
          group_jid: string | null
          group_name: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          message_id: string | null
          node_order: number | null
          node_type: string | null
          payload: Json | null
          provider_response: Json | null
          recipient_phone: string | null
          response_time_ms: number | null
          sent_at: string | null
          sequence_id: string | null
          status: string | null
          user_id: string
          zaap_id: string | null
        }
        Insert: {
          campaign_name?: string | null
          error_message?: string | null
          external_message_id?: string | null
          group_campaign_id: string
          group_jid?: string | null
          group_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_id?: string | null
          node_order?: number | null
          node_type?: string | null
          payload?: Json | null
          provider_response?: Json | null
          recipient_phone?: string | null
          response_time_ms?: number | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          user_id: string
          zaap_id?: string | null
        }
        Update: {
          campaign_name?: string | null
          error_message?: string | null
          external_message_id?: string | null
          group_campaign_id?: string
          group_jid?: string | null
          group_name?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          message_id?: string | null
          node_order?: number | null
          node_type?: string | null
          payload?: Json | null
          provider_response?: Json | null
          recipient_phone?: string | null
          response_time_ms?: number | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string | null
          user_id?: string
          zaap_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_message_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          active: boolean | null
          content: string
          created_at: string | null
          delay_seconds: number | null
          group_campaign_id: string
          id: string
          media_caption: string | null
          media_type: string | null
          media_url: string | null
          mention_member: boolean | null
          schedule: Json | null
          send_private: boolean | null
          sequence_id: string | null
          sequence_order: number | null
          trigger_keyword: string | null
          type: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string | null
          delay_seconds?: number | null
          group_campaign_id: string
          id?: string
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_id?: string | null
          sequence_order?: number | null
          trigger_keyword?: string | null
          type: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string | null
          delay_seconds?: number | null
          group_campaign_id?: string
          id?: string
          media_caption?: string | null
          media_type?: string | null
          media_url?: string | null
          mention_member?: boolean | null
          schedule?: Json | null
          send_private?: boolean | null
          sequence_id?: string | null
          sequence_order?: number | null
          trigger_keyword?: string | null
          type?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      group_moderation_logs: {
        Row: {
          action: string
          created_at: string | null
          group_campaign_id: string
          id: string
          member_id: string | null
          member_phone: string | null
          message_content: string | null
          reason: string | null
          rule_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          group_campaign_id: string
          id?: string
          member_id?: string | null
          member_phone?: string | null
          message_content?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          member_id?: string | null
          member_phone?: string | null
          message_content?: string | null
          reason?: string | null
          rule_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_moderation_logs_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_moderation_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_moderation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "group_moderation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      group_moderation_rules: {
        Row: {
          action: string
          active: boolean | null
          config: Json
          created_at: string | null
          group_campaign_id: string
          id: string
          rule_type: string
          user_id: string
        }
        Insert: {
          action: string
          active?: boolean | null
          config?: Json
          created_at?: string | null
          group_campaign_id: string
          id?: string
          rule_type: string
          user_id: string
        }
        Update: {
          action?: string
          active?: boolean | null
          config?: Json
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          rule_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_moderation_rules_group_campaign_id_fkey"
            columns: ["group_campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          expiration_date: string | null
          external_instance_id: string | null
          external_instance_token: string | null
          id: string
          instance_function: string
          last_message_at: string | null
          messages_count: number | null
          name: string
          payment_status: string | null
          phone: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiration_date?: string | null
          external_instance_id?: string | null
          external_instance_token?: string | null
          id?: string
          instance_function?: string
          last_message_at?: string | null
          messages_count?: number | null
          name: string
          payment_status?: string | null
          phone: string
          provider: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiration_date?: string | null
          external_instance_id?: string | null
          external_instance_token?: string | null
          id?: string
          instance_function?: string
          last_message_at?: string | null
          messages_count?: number | null
          name?: string
          payment_status?: string | null
          phone?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_campaign_history: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          campaign_type: string
          completed_at: string | null
          id: string
          lead_id: string
          notes: string | null
          result_action: string | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          campaign_name?: string | null
          campaign_type: string
          completed_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          result_action?: string | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string | null
          campaign_type?: string
          completed_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          result_action?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_campaign_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          active_campaign_id: string | null
          active_campaign_type: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          id: string
          last_contact_at: string | null
          lid: string | null
          name: string | null
          phone: string | null
          source_campaign_id: string | null
          source_group_id: string | null
          source_group_name: string | null
          source_name: string | null
          source_type: string | null
          status: string | null
          tags: string[] | null
          total_calls: number | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_campaign_id?: string | null
          active_campaign_type?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          lid?: string | null
          name?: string | null
          phone?: string | null
          source_campaign_id?: string | null
          source_group_id?: string | null
          source_group_name?: string | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          tags?: string[] | null
          total_calls?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_campaign_id?: string | null
          active_campaign_type?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          lid?: string | null
          name?: string | null
          phone?: string | null
          source_campaign_id?: string | null
          source_group_id?: string | null
          source_group_name?: string | null
          source_name?: string | null
          source_type?: string | null
          status?: string | null
          tags?: string[] | null
          total_calls?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_export_schedules: {
        Row: {
          created_at: string | null
          group_campaign_id: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          schedule_day_of_week: number | null
          schedule_time: string | null
          schedule_type: string
          status_filter: string[] | null
          user_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          group_campaign_id: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_day_of_week?: number | null
          schedule_time?: string | null
          schedule_type?: string
          status_filter?: string[] | null
          user_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          group_campaign_id?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_day_of_week?: number | null
          schedule_time?: string | null
          schedule_type?: string
          status_filter?: string[] | null
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      message_sequences: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          group_campaign_id: string
          id: string
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_campaign_id: string
          id?: string
          name: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          group_campaign_id?: string
          id?: string
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          connected: boolean
          created_at: string | null
          cycle_total: number
          cycle_used: number
          health: number
          id: string
          instance_id: string | null
          last_used_at: string | null
          number: string
          provider: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string | null
          cycle_total?: number
          cycle_used?: number
          health?: number
          id?: string
          instance_id?: string | null
          last_used_at?: string | null
          number: string
          provider: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string | null
          cycle_total?: number
          cycle_used?: number
          health?: number
          id?: string
          instance_id?: string | null
          last_used_at?: string | null
          number?: string
          provider?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      pirate_campaign_groups: {
        Row: {
          campaign_id: string
          created_at: string | null
          group_jid: string
          group_name: string | null
          id: string
          is_active: boolean | null
          leads_captured: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          group_jid: string
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          leads_captured?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          group_jid?: string
          group_name?: string | null
          id?: string
          is_active?: boolean | null
          leads_captured?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pirate_campaign_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pirate_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pirate_campaigns: {
        Row: {
          auto_create_lead: boolean | null
          capture_link: string | null
          company_id: string
          created_at: string | null
          description: string | null
          destination_campaign_id: string | null
          destination_sequence_id: string | null
          destination_type: string
          id: string
          ignore_duplicates: boolean | null
          instance_id: string | null
          name: string
          offer_text: string | null
          payment_link: string | null
          profile_description: string | null
          profile_name: string | null
          profile_photo_url: string | null
          profile_status: string | null
          status: string | null
          target_campaign_id: string | null
          total_leads_captured: number | null
          updated_at: string | null
          user_id: string
          webhook_headers: Json | null
          webhook_url: string | null
        }
        Insert: {
          auto_create_lead?: boolean | null
          capture_link?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          destination_campaign_id?: string | null
          destination_sequence_id?: string | null
          destination_type?: string
          id?: string
          ignore_duplicates?: boolean | null
          instance_id?: string | null
          name: string
          offer_text?: string | null
          payment_link?: string | null
          profile_description?: string | null
          profile_name?: string | null
          profile_photo_url?: string | null
          profile_status?: string | null
          status?: string | null
          target_campaign_id?: string | null
          total_leads_captured?: number | null
          updated_at?: string | null
          user_id: string
          webhook_headers?: Json | null
          webhook_url?: string | null
        }
        Update: {
          auto_create_lead?: boolean | null
          capture_link?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          destination_campaign_id?: string | null
          destination_sequence_id?: string | null
          destination_type?: string
          id?: string
          ignore_duplicates?: boolean | null
          instance_id?: string | null
          name?: string
          offer_text?: string | null
          payment_link?: string | null
          profile_description?: string | null
          profile_name?: string | null
          profile_photo_url?: string | null
          profile_status?: string | null
          status?: string | null
          target_campaign_id?: string | null
          total_leads_captured?: number | null
          updated_at?: string | null
          user_id?: string
          webhook_headers?: Json | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pirate_campaigns_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "instances"
            referencedColumns: ["id"]
          },
        ]
      }
      pirate_leads: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string | null
          group_jid: string
          id: string
          joined_at: string | null
          lead_id: string | null
          lid: string | null
          phone: string
          user_id: string
          webhook_response_status: number | null
          webhook_sent: boolean | null
          webhook_sent_at: string | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string | null
          group_jid: string
          id?: string
          joined_at?: string | null
          lead_id?: string | null
          lid?: string | null
          phone: string
          user_id: string
          webhook_response_status?: number | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          group_jid?: string
          id?: string
          joined_at?: string | null
          lead_id?: string | null
          lid?: string | null
          phone?: string
          user_id?: string
          webhook_response_status?: number | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pirate_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "pirate_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      poll_messages: {
        Row: {
          campaign_id: string
          expires_at: string | null
          group_jid: string
          id: string
          instance_id: string
          message_id: string
          node_id: string
          option_actions: Json
          options: Json
          question_text: string
          sent_at: string | null
          sequence_id: string
          user_id: string
          zaap_id: string | null
        }
        Insert: {
          campaign_id: string
          expires_at?: string | null
          group_jid: string
          id?: string
          instance_id: string
          message_id: string
          node_id: string
          option_actions?: Json
          options?: Json
          question_text: string
          sent_at?: string | null
          sequence_id: string
          user_id: string
          zaap_id?: string | null
        }
        Update: {
          campaign_id?: string
          expires_at?: string | null
          group_jid?: string
          id?: string
          instance_id?: string
          message_id?: string
          node_id?: string
          option_actions?: Json
          options?: Json
          question_text?: string
          sent_at?: string | null
          sequence_id?: string
          user_id?: string
          zaap_id?: string | null
        }
        Relationships: []
      }
      poll_responses: {
        Row: {
          action_executed: boolean | null
          action_result: Json | null
          action_type: string | null
          executed_at: string | null
          id: string
          option_index: number
          option_text: string
          poll_message_id: string
          responded_at: string | null
          respondent_jid: string | null
          respondent_name: string | null
          respondent_phone: string
          user_id: string
        }
        Insert: {
          action_executed?: boolean | null
          action_result?: Json | null
          action_type?: string | null
          executed_at?: string | null
          id?: string
          option_index: number
          option_text: string
          poll_message_id: string
          responded_at?: string | null
          respondent_jid?: string | null
          respondent_name?: string | null
          respondent_phone: string
          user_id: string
        }
        Update: {
          action_executed?: boolean | null
          action_result?: Json | null
          action_type?: string | null
          executed_at?: string | null
          id?: string
          option_index?: number
          option_text?: string
          poll_message_id?: string
          responded_at?: string | null
          respondent_jid?: string | null
          respondent_name?: string | null
          respondent_phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_responses_poll_message_id_fkey"
            columns: ["poll_message_id"]
            isOneToOne: false
            referencedRelation: "poll_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          action_type: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          price: number
          unit: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          action_type: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          price: number
          unit: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          price?: number
          unit?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          instance_id: string
          payload: Json
          provider: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          instance_id: string
          payload?: Json
          provider: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          instance_id?: string
          payload?: Json
          provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      queue_execution_state: {
        Row: {
          calls_answered: number | null
          calls_made: number | null
          calls_no_answer: number | null
          campaign_id: string | null
          company_id: string | null
          created_at: string | null
          current_operator_index: number
          current_position: number | null
          id: string
          last_dial_at: string | null
          last_normal_campaign_id: string | null
          last_priority_campaign_id: string | null
          priority_counter: number | null
          session_started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calls_answered?: number | null
          calls_made?: number | null
          calls_no_answer?: number | null
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          current_operator_index?: number
          current_position?: number | null
          id?: string
          last_dial_at?: string | null
          last_normal_campaign_id?: string | null
          last_priority_campaign_id?: string | null
          priority_counter?: number | null
          session_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calls_answered?: number | null
          calls_made?: number | null
          calls_no_answer?: number | null
          campaign_id?: string | null
          company_id?: string | null
          created_at?: string | null
          current_operator_index?: number
          current_position?: number | null
          id?: string
          last_dial_at?: string | null
          last_normal_campaign_id?: string | null
          last_priority_campaign_id?: string | null
          priority_counter?: number | null
          session_started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_execution_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_message_executions: {
        Row: {
          executed_at: string | null
          groups_count: number | null
          id: string
          message_id: string
          scheduled_date: string
          scheduled_time: string
          status: string | null
          user_id: string
        }
        Insert: {
          executed_at?: string | null
          groups_count?: number | null
          id?: string
          message_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          user_id: string
        }
        Update: {
          executed_at?: string | null
          groups_count?: number | null
          id?: string
          message_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_message_executions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sequence_executions: {
        Row: {
          campaign_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          scheduled_date: string
          scheduled_time: string
          sequence_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_date: string
          scheduled_time: string
          sequence_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_date?: string
          scheduled_time?: string
          sequence_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sequence_executions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sequence_executions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_appointment_events: {
        Row: {
          appointment_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          appointment_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          appointment_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "scheduling_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_appointments: {
        Row: {
          answers: Json
          attendant_id: string | null
          calendar_id: string
          call_lead_id: string | null
          cancel_comment: string | null
          cancel_reason: string | null
          cancel_token: string
          cancelled_at: string | null
          company_id: string
          confirmation_sent_at: string | null
          created_at: string
          custom_fields: Json
          google_event_id: string | null
          id: string
          internal_notes: string | null
          lead_email: string | null
          lead_id: string | null
          lead_name: string
          lead_phone: string
          location_snapshot: Json | null
          meeting_url: string | null
          reminder_15m_sent_at: string | null
          reminder_1d_sent_at: string | null
          reminder_1h_sent_at: string | null
          rescheduled_from_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          timezone: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          answers?: Json
          attendant_id?: string | null
          calendar_id: string
          call_lead_id?: string | null
          cancel_comment?: string | null
          cancel_reason?: string | null
          cancel_token: string
          cancelled_at?: string | null
          company_id: string
          confirmation_sent_at?: string | null
          created_at?: string
          custom_fields?: Json
          google_event_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_email?: string | null
          lead_id?: string | null
          lead_name: string
          lead_phone: string
          location_snapshot?: Json | null
          meeting_url?: string | null
          reminder_15m_sent_at?: string | null
          reminder_1d_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          rescheduled_from_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          timezone?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          answers?: Json
          attendant_id?: string | null
          calendar_id?: string
          call_lead_id?: string | null
          cancel_comment?: string | null
          cancel_reason?: string | null
          cancel_token?: string
          cancelled_at?: string | null
          company_id?: string
          confirmation_sent_at?: string | null
          created_at?: string
          custom_fields?: Json
          google_event_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string
          location_snapshot?: Json | null
          meeting_url?: string | null
          reminder_15m_sent_at?: string | null
          reminder_1d_sent_at?: string | null
          reminder_1h_sent_at?: string | null
          rescheduled_from_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          timezone?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_appointments_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "scheduling_attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_appointments_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_appointments_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "scheduling_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_attendant_integrations: {
        Row: {
          attendant_id: string
          config: Json
          connected_at: string | null
          created_at: string
          id: string
          is_connected: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          attendant_id: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          attendant_id?: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_attendant_integrations_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "scheduling_attendants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_attendants: {
        Row: {
          bio: string | null
          call_operator_id: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          linked_user_id: string | null
          name: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          call_operator_id?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          name: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          call_operator_id?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          linked_user_id?: string | null
          name?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_attendants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_availability: {
        Row: {
          attendant_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          attendant_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          attendant_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_availability_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "scheduling_attendants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_blocked_dates: {
        Row: {
          attendant_id: string
          blocked_date: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          attendant_id: string
          blocked_date: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          attendant_id?: string
          blocked_date?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_blocked_dates_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "scheduling_attendants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_calendar_attendants: {
        Row: {
          attendant_id: string
          calendar_id: string
          created_at: string
          id: string
        }
        Insert: {
          attendant_id: string
          calendar_id: string
          created_at?: string
          id?: string
        }
        Update: {
          attendant_id?: string
          calendar_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_calendar_attendants_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "scheduling_attendants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_calendar_attendants_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_calendars: {
        Row: {
          advanced: Json
          branding: Json
          color: string
          company_id: string
          created_at: string
          description: string | null
          details_submit_count: number
          distribution: string
          duration_minutes: number
          id: string
          layout: Json
          modality: string
          name: string
          slot_select_count: number
          slug: string
          status: string
          texts: Json
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          advanced?: Json
          branding?: Json
          color?: string
          company_id: string
          created_at?: string
          description?: string | null
          details_submit_count?: number
          distribution?: string
          duration_minutes?: number
          id?: string
          layout?: Json
          modality?: string
          name: string
          slot_select_count?: number
          slug: string
          status?: string
          texts?: Json
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          advanced?: Json
          branding?: Json
          color?: string
          company_id?: string
          created_at?: string
          description?: string | null
          details_submit_count?: number
          distribution?: string
          duration_minutes?: number
          id?: string
          layout?: Json
          modality?: string
          name?: string
          slot_select_count?: number
          slug?: string
          status?: string
          texts?: Json
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_calendars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_global_integrations: {
        Row: {
          access_token: string | null
          account_email: string | null
          company_id: string
          config: Json
          connected_at: string | null
          created_at: string
          external_account_id: string | null
          id: string
          is_connected: boolean
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_email?: string | null
          company_id: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          is_connected?: boolean
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_email?: string | null
          company_id?: string
          config?: Json
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          is_connected?: boolean
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduling_integrations: {
        Row: {
          calendar_id: string
          call_campaign_enabled: boolean
          call_campaign_id: string | null
          call_campaign_timing: string
          created_at: string
          id: string
          in_person_address: string | null
          in_person_maps_url: string | null
          updated_at: string
          video_auto_link: boolean
          video_include_in_confirmation: boolean
          video_provider: string | null
          webhook_cancelled_enabled: boolean
          webhook_cancelled_url: string | null
          webhook_completed_enabled: boolean
          webhook_completed_url: string | null
          webhook_created_enabled: boolean
          webhook_created_url: string | null
          webhook_rescheduled_enabled: boolean
          webhook_rescheduled_url: string | null
        }
        Insert: {
          calendar_id: string
          call_campaign_enabled?: boolean
          call_campaign_id?: string | null
          call_campaign_timing?: string
          created_at?: string
          id?: string
          in_person_address?: string | null
          in_person_maps_url?: string | null
          updated_at?: string
          video_auto_link?: boolean
          video_include_in_confirmation?: boolean
          video_provider?: string | null
          webhook_cancelled_enabled?: boolean
          webhook_cancelled_url?: string | null
          webhook_completed_enabled?: boolean
          webhook_completed_url?: string | null
          webhook_created_enabled?: boolean
          webhook_created_url?: string | null
          webhook_rescheduled_enabled?: boolean
          webhook_rescheduled_url?: string | null
        }
        Update: {
          calendar_id?: string
          call_campaign_enabled?: boolean
          call_campaign_id?: string | null
          call_campaign_timing?: string
          created_at?: string
          id?: string
          in_person_address?: string | null
          in_person_maps_url?: string | null
          updated_at?: string
          video_auto_link?: boolean
          video_include_in_confirmation?: boolean
          video_provider?: string | null
          webhook_cancelled_enabled?: boolean
          webhook_cancelled_url?: string | null
          webhook_completed_enabled?: boolean
          webhook_completed_url?: string | null
          webhook_created_enabled?: boolean
          webhook_created_url?: string | null
          webhook_rescheduled_enabled?: boolean
          webhook_rescheduled_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_integrations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_lead_fields: {
        Row: {
          calendar_id: string
          created_at: string
          field_name: string
          field_type: string
          id: string
          is_default: boolean
          is_required: boolean
          sort_order: number
        }
        Insert: {
          calendar_id: string
          created_at?: string
          field_name: string
          field_type?: string
          id?: string
          is_default?: boolean
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          calendar_id?: string
          created_at?: string
          field_name?: string
          field_type?: string
          id?: string
          is_default?: boolean
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_lead_fields_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_notifications: {
        Row: {
          calendar_id: string
          confirmation_message: string | null
          created_at: string
          id: string
          notify_on_cancel: boolean
          notify_on_reschedule: boolean
          reminder_15min_enabled: boolean
          reminder_15min_message: string | null
          reminder_1day_enabled: boolean
          reminder_1day_message: string | null
          reminder_1hour_enabled: boolean
          reminder_1hour_message: string | null
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_instance_id: string | null
        }
        Insert: {
          calendar_id: string
          confirmation_message?: string | null
          created_at?: string
          id?: string
          notify_on_cancel?: boolean
          notify_on_reschedule?: boolean
          reminder_15min_enabled?: boolean
          reminder_15min_message?: string | null
          reminder_1day_enabled?: boolean
          reminder_1day_message?: string | null
          reminder_1hour_enabled?: boolean
          reminder_1hour_message?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_instance_id?: string | null
        }
        Update: {
          calendar_id?: string
          confirmation_message?: string | null
          created_at?: string
          id?: string
          notify_on_cancel?: boolean
          notify_on_reschedule?: boolean
          reminder_15min_enabled?: boolean
          reminder_15min_message?: string | null
          reminder_1day_enabled?: boolean
          reminder_1day_message?: string | null
          reminder_1hour_enabled?: boolean
          reminder_1hour_message?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_notifications_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_questions: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          is_required: boolean
          options: Json
          question_text: string
          question_type: string
          sort_order: number
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          question_text: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          question_text?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_questions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "scheduling_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_settings: {
        Row: {
          company_id: string
          created_at: string
          custom_domain: string | null
          custom_domain_status: string
          custom_domain_verified_at: string | null
          default_timezone: string
          default_whatsapp_instance_id: string | null
          hide_branding: boolean
          id: string
          send_email_confirmation: boolean
          send_ics_invite: boolean
          updated_at: string
          webhook_global_enabled: boolean
          webhook_global_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          custom_domain_verified_at?: string | null
          default_timezone?: string
          default_whatsapp_instance_id?: string | null
          hide_branding?: boolean
          id?: string
          send_email_confirmation?: boolean
          send_ics_invite?: boolean
          updated_at?: string
          webhook_global_enabled?: boolean
          webhook_global_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_domain?: string | null
          custom_domain_status?: string
          custom_domain_verified_at?: string | null
          default_timezone?: string
          default_whatsapp_instance_id?: string | null
          hide_branding?: boolean
          id?: string
          send_email_confirmation?: boolean
          send_ics_invite?: boolean
          updated_at?: string
          webhook_global_enabled?: boolean
          webhook_global_url?: string | null
        }
        Relationships: []
      }
      sequence_connections: {
        Row: {
          condition_path: string | null
          created_at: string | null
          id: string
          sequence_id: string
          source_node_id: string
          target_node_id: string
          user_id: string
        }
        Insert: {
          condition_path?: string | null
          created_at?: string | null
          id?: string
          sequence_id: string
          source_node_id: string
          target_node_id: string
          user_id: string
        }
        Update: {
          condition_path?: string | null
          created_at?: string | null
          id?: string
          sequence_id?: string
          source_node_id?: string
          target_node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_connections_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_connections_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "sequence_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_connections_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "sequence_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_executions: {
        Row: {
          campaign_id: string
          created_at: string | null
          current_node_index: number | null
          destinations: Json
          error_message: string | null
          id: string
          message_id: string | null
          nodes_data: Json
          nodes_failed: number | null
          nodes_processed: number | null
          resume_at: string | null
          sequence_id: string
          status: string | null
          trigger_context: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          current_node_index?: number | null
          destinations?: Json
          error_message?: string | null
          id?: string
          message_id?: string | null
          nodes_data?: Json
          nodes_failed?: number | null
          nodes_processed?: number | null
          resume_at?: string | null
          sequence_id: string
          status?: string | null
          trigger_context?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          current_node_index?: number | null
          destinations?: Json
          error_message?: string | null
          id?: string
          message_id?: string | null
          nodes_data?: Json
          nodes_failed?: number | null
          nodes_processed?: number | null
          resume_at?: string | null
          sequence_id?: string
          status?: string | null
          trigger_context?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_executions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_executions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_executions_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_nodes: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          node_order: number | null
          node_type: string
          position_x: number | null
          position_y: number | null
          sequence_id: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          node_order?: number | null
          node_type: string
          position_x?: number | null
          position_y?: number | null
          sequence_id: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          node_order?: number | null
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          sequence_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_nodes_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "message_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media_library: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          media_type: string
          mime_type: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          media_type: string
          mime_type?: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          media_type?: string
          mime_type?: string | null
          public_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: string
          wallet_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind: string
          wallet_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallet_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          mp_payment_id: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          paid_at: string | null
          status: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallet_reservations: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          finalized_amount: number | null
          finalized_at: string | null
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          status: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category: string
          company_id: string
          created_at?: string
          finalized_amount?: number | null
          finalized_at?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          finalized_amount?: number | null
          finalized_at?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          alert_email_enabled: boolean | null
          alert_in_app_enabled: boolean | null
          balance: number
          company_id: string
          created_at: string
          daily_limit: number | null
          daily_limit_action: string | null
          daily_spent: number
          daily_spent_date: string
          id: string
          low_balance_alert: number | null
          reserved_balance: number
          updated_at: string
        }
        Insert: {
          alert_email_enabled?: boolean | null
          alert_in_app_enabled?: boolean | null
          balance?: number
          company_id: string
          created_at?: string
          daily_limit?: number | null
          daily_limit_action?: string | null
          daily_spent?: number
          daily_spent_date?: string
          id?: string
          low_balance_alert?: number | null
          reserved_balance?: number
          updated_at?: string
        }
        Update: {
          alert_email_enabled?: boolean | null
          alert_in_app_enabled?: boolean | null
          balance?: number
          company_id?: string
          created_at?: string
          daily_limit?: number | null
          daily_limit_action?: string | null
          daily_spent?: number
          daily_spent_date?: string
          id?: string
          low_balance_alert?: number | null
          reserved_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          chat_jid: string | null
          chat_name: string | null
          chat_type: string | null
          classification: string | null
          confidence: string | null
          direction: string | null
          event_subtype: string | null
          event_timestamp: string | null
          event_type: string
          external_instance_id: string
          id: string
          instance_id: string | null
          matched_rule: string | null
          message_id: string | null
          processed_at: string | null
          processing_error: string | null
          processing_result: Json | null
          processing_status: string | null
          raw_event: Json
          received_at: string | null
          sender_name: string | null
          sender_phone: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          chat_jid?: string | null
          chat_name?: string | null
          chat_type?: string | null
          classification?: string | null
          confidence?: string | null
          direction?: string | null
          event_subtype?: string | null
          event_timestamp?: string | null
          event_type?: string
          external_instance_id: string
          id?: string
          instance_id?: string | null
          matched_rule?: string | null
          message_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_result?: Json | null
          processing_status?: string | null
          raw_event: Json
          received_at?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          chat_jid?: string | null
          chat_name?: string | null
          chat_type?: string | null
          classification?: string | null
          confidence?: string | null
          direction?: string | null
          event_subtype?: string | null
          event_timestamp?: string | null
          event_type?: string
          external_instance_id?: string
          id?: string
          instance_id?: string | null
          matched_rule?: string | null
          message_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_result?: Json | null
          processing_status?: string | null
          raw_event?: Json
          received_at?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_appointment_by_token: {
        Args: { p_comment: string; p_reason: string; p_token: string }
        Returns: Json
      }
      clear_daily_queue: {
        Args: never
        Returns: {
          companies_processed: number
          total_expired: number
        }[]
      }
      create_public_appointment: { Args: { p_payload: Json }; Returns: Json }
      get_appointment_by_token: { Args: { p_token: string }; Returns: Json }
      get_calendar_availability: {
        Args: {
          p_attendant_id: string
          p_calendar_id: string
          p_from_date: string
          p_to_date: string
        }
        Returns: Json
      }
      get_call_leads_counts: {
        Args: { p_campaign_ids: string[] }
        Returns: {
          campaign_id: string
          cnt: number
        }[]
      }
      get_call_logs_counts: {
        Args: { p_campaign_ids: string[] }
        Returns: {
          campaign_id: string
          cnt: number
        }[]
      }
      get_member_movement_stats: {
        Args: { p_campaign_id: string; p_days?: number }
        Returns: {
          daily_stats: Json
          net_change: number
          total_joined: number
          total_left: number
        }[]
      }
      get_poll_analytics: {
        Args: { p_poll_message_id: string; p_total_members?: number }
        Returns: {
          options_stats: Json
          response_rate: number
          total_votes: number
          unique_respondents: number
        }[]
      }
      get_public_calendar: { Args: { p_slug: string }; Returns: Json }
      get_scheduling_attendant_performance: {
        Args: {
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          attendant_id: string
          completed: number
          name: string
          no_shows: number
          photo_url: string
          success_rate: number
          total: number
        }[]
      }
      get_scheduling_by_day: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          day: string
          total: number
        }[]
      }
      get_scheduling_cancel_reasons: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          pct: number
          reason: string
          total: number
        }[]
      }
      get_scheduling_funnel: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: Json
      }
      get_scheduling_heatmap: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          dow: number
          hour: number
          total: number
        }[]
      }
      get_scheduling_overview: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: Json
      }
      get_scheduling_sources: {
        Args: {
          p_attendant_id?: string
          p_calendar_id?: string
          p_company_id: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          pct: number
          source: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heal_stuck_operators: {
        Args: { p_stuck_threshold_minutes?: number }
        Returns: {
          action_taken: string
          healed_operator_id: string
          healed_operator_name: string
          previous_status: string
        }[]
      }
      increment_calendar_details_submit: {
        Args: { p_slug: string }
        Returns: undefined
      }
      increment_calendar_slot_select: {
        Args: { p_slug: string }
        Returns: undefined
      }
      increment_calendar_view: { Args: { p_slug: string }; Returns: undefined }
      increment_pirate_counters: {
        Args: { p_campaign_id: string; p_group_jid: string }
        Returns: undefined
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      queue_clear_all_preview: {
        Args: { p_company_id: string }
        Returns: {
          by_campaign: Json
          normal_count: number
          priority_count: number
          scheduled_count: number
          total_count: number
        }[]
      }
      queue_get_next_v2: {
        Args: { p_company_id: string }
        Returns: {
          out_attempt_number: number
          out_campaign_id: string
          out_campaign_name: string
          out_is_priority: boolean
          out_lead_id: string
          out_lead_name: string
          out_max_attempts: number
          out_observations: string
          out_phone: string
          out_source_type: string
          queue_id: string
        }[]
      }
      queue_remove_bulk: {
        Args: {
          p_attempt_filter?: string
          p_campaign_ids?: string[]
          p_company_id: string
        }
        Returns: {
          removed_count: number
          removed_normal: number
          removed_priority: number
        }[]
      }
      queue_remove_preview: {
        Args: {
          p_attempt_filter?: string
          p_campaign_ids?: string[]
          p_company_id: string
        }
        Returns: {
          by_campaign: Json
          normal_count: number
          priority_count: number
          scheduled_count: number
          total_count: number
        }[]
      }
      release_operator: {
        Args: { p_call_id: string; p_force?: boolean }
        Returns: {
          cooldown_seconds: number
          new_status: string
          released_operator_id: string
          success: boolean
        }[]
      }
      reschedule_appointment_by_token: {
        Args: { p_new_start: string; p_token: string }
        Returns: Json
      }
      reserve_operator_for_call: {
        Args: {
          p_call_id: string
          p_campaign_id: string
          p_preferred_operator_id?: string
        }
        Returns: {
          error_code: string
          operator_extension: string
          operator_id: string
          operator_name: string
          success: boolean
        }[]
      }
      resolve_cooldowns: {
        Args: never
        Returns: {
          resolved_operator_id: string
          resolved_operator_name: string
          was_cooldown_seconds: number
        }[]
      }
      wallet_cancel_reservation: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      wallet_credit: {
        Args: {
          p_amount: number
          p_category: string
          p_company_id: string
          p_description?: string
          p_metadata?: Json
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
        }
        Returns: string
      }
      wallet_credit_manual: {
        Args: {
          p_amount: number
          p_company_id: string
          p_description?: string
          p_reason: string
        }
        Returns: string
      }
      wallet_debit: {
        Args: {
          p_amount: number
          p_category: string
          p_company_id: string
          p_description?: string
          p_metadata?: Json
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
      wallet_finalize_reservation: {
        Args: {
          p_actual_amount: number
          p_description?: string
          p_metadata?: Json
          p_reservation_id: string
        }
        Returns: undefined
      }
      wallet_reserve: {
        Args: {
          p_amount: number
          p_category: string
          p_company_id: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin"
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
      app_role: ["admin", "user", "superadmin"],
    },
  },
} as const
