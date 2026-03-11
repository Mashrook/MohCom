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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_locks: {
        Row: {
          auto_unlock: boolean | null
          created_at: string | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_reason: string | null
          unlock_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_unlock?: boolean | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_reason?: string | null
          unlock_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_unlock?: boolean | null
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_reason?: string | null
          unlock_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_allowed_ips: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
        }
        Relationships: []
      }
      admin_api_keys: {
        Row: {
          description: string | null
          display_name: string
          id: string
          is_configured: boolean | null
          key_category: string
          key_name: string
          last_updated: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          display_name: string
          id?: string
          is_configured?: boolean | null
          key_category: string
          key_name: string
          last_updated?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          display_name?: string
          id?: string
          is_configured?: boolean | null
          key_category?: string
          key_name?: string
          last_updated?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action_description: string | null
          action_type: string
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_description?: string | null
          action_type: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_description?: string | null
          action_type?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_security_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: boolean
          setting_value_int: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: boolean
          setting_value_int?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: boolean
          setting_value_int?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_id: string
          created_at: string
          device_info: Json | null
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          device_info?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          device_info?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_download_links: {
        Row: {
          id: string
          is_active: boolean
          platform: string
          store_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          platform: string
          store_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          platform?: string
          store_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_by: string | null
          error_message: string | null
          file_path: string | null
          file_size: number | null
          id: string
          records_count: Json | null
          started_at: string
          status: string
          tables_included: string[] | null
        }
        Insert: {
          backup_type: string
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          records_count?: Json | null
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          records_count?: Json | null
          started_at?: string
          status?: string
          tables_included?: string[] | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          attempt_count: number | null
          auto_blocked: boolean
          blocked_at: string
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: string
          is_permanent: boolean
          reason: string
          unblocked_at: string | null
          unblocked_by: string | null
        }
        Insert: {
          attempt_count?: number | null
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_permanent?: boolean
          reason: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Update: {
          attempt_count?: number | null
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_permanent?: boolean
          reason?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
        }
        Relationships: []
      }
      blocked_login_attempts: {
        Row: {
          blocked_reason: string | null
          city: string | null
          country: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_payment_users: {
        Row: {
          blocked_at: string
          blocked_by: string
          id: string
          reason: string | null
          unblocked_at: string | null
          unblocked_by: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          id?: string
          reason?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          id?: string
          reason?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_type: string
          caller_id: string
          caller_ip: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          receiver_id: string
          receiver_ip: string | null
          room_name: string
          started_at: string
          status: string
        }
        Insert: {
          call_type?: string
          caller_id: string
          caller_ip?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id: string
          receiver_ip?: string | null
          room_name: string
          started_at?: string
          status?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          caller_ip?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id?: string
          receiver_ip?: string | null
          room_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      call_notifications: {
        Row: {
          call_type: string
          caller_id: string
          created_at: string
          id: string
          receiver_id: string
          room_name: string
          status: string
          updated_at: string
        }
        Insert: {
          call_type: string
          caller_id: string
          created_at?: string
          id?: string
          receiver_id: string
          room_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          created_at?: string
          id?: string
          receiver_id?: string
          room_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_analyses: {
        Row: {
          analysis_type: string
          contract_text_encrypted: string | null
          created_at: string
          id: string
          legal_references: string[] | null
          overall_rating: number | null
          risks: string[] | null
          suggestions: string[] | null
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          contract_text_encrypted?: string | null
          created_at?: string
          id?: string
          legal_references?: string[] | null
          overall_rating?: number | null
          risks?: string[] | null
          suggestions?: string[] | null
          summary: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          contract_text_encrypted?: string | null
          created_at?: string
          id?: string
          legal_references?: string[] | null
          overall_rating?: number | null
          risks?: string[] | null
          suggestions?: string[] | null
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_downloads: {
        Row: {
          downloaded_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_downloads_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "public_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rating: number
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "public_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          average_rating: number | null
          category: string
          content: string
          created_at: string
          description: string | null
          downloads_count: number | null
          file_url: string | null
          id: string
          is_premium: boolean | null
          ratings_count: number | null
          sector: string | null
          title: string
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          category: string
          content: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          ratings_count?: number | null
          sector?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          file_url?: string | null
          id?: string
          is_premium?: boolean | null
          ratings_count?: number | null
          sector?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      file_shares: {
        Row: {
          created_at: string
          file_id: string
          id: string
          shared_by_user_id: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          shared_by_user_id: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          name: string
          shared_with: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          shared_with?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          shared_with?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string
          is_active: boolean
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
        }
        Relationships: []
      }
      lawyer_ai_chats: {
        Row: {
          created_at: string
          id: string
          lawyer_id: string
          messages_encrypted: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lawyer_id: string
          messages_encrypted?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lawyer_id?: string
          messages_encrypted?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lawyer_applications: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          email_encrypted: string | null
          experience_years: number
          full_name: string
          id: string
          id_file_url: string | null
          license_file_url: string | null
          license_number: string
          location: string
          phone: string
          phone_encrypted: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          email_encrypted?: string | null
          experience_years?: number
          full_name: string
          id?: string
          id_file_url?: string | null
          license_file_url?: string | null
          license_number: string
          location?: string
          phone: string
          phone_encrypted?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          email_encrypted?: string | null
          experience_years?: number
          full_name?: string
          id?: string
          id_file_url?: string | null
          license_file_url?: string | null
          license_number?: string
          location?: string
          phone?: string
          phone_encrypted?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lawyer_profiles: {
        Row: {
          badges: string[] | null
          bio: string | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          location: string | null
          rating: number | null
          reviews_count: number | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          location?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[] | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          location?: string | null
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_location_alerts: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_read: boolean | null
          is_suspicious: boolean | null
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean | null
          is_suspicious?: boolean | null
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean | null
          is_suspicious?: boolean | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content_encrypted: string | null
          created_at: string
          file_id: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content_encrypted?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content_encrypted?: string | null
          created_at?: string
          file_id?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      password_security_logs: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          rejection_reason: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          rejection_reason: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          rejection_reason?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_errors: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          error_code: string | null
          error_message: string
          id: string
          ip_address: string | null
          payment_method: string | null
          request_payload: Json | null
          response_payload: Json | null
          tap_charge_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message: string
          id?: string
          ip_address?: string | null
          payment_method?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          tap_charge_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_code?: string | null
          error_message?: string
          id?: string
          ip_address?: string | null
          payment_method?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          tap_charge_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          payment_method: string | null
          plan_type: string | null
          status: string
          tap_charge_id_encrypted: string | null
          tap_receipt_id_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string | null
          status?: string
          tap_charge_id_encrypted?: string | null
          tap_receipt_id_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string | null
          status?: string
          tap_charge_id_encrypted?: string | null
          tap_receipt_id_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_halala: number
          created_at: string | null
          currency: string
          id: string
          metadata: Json
          method: string | null
          plan_id: string
          provider: string
          provider_payment_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_halala: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json
          method?: string | null
          plan_id: string
          provider?: string
          provider_payment_id?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_halala?: number
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json
          method?: string | null
          plan_id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_violation_logs: {
        Row: {
          attempted_action: string
          attempted_table: string
          blocked: boolean | null
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
          violation_type: string
        }
        Insert: {
          attempted_action?: string
          attempted_table: string
          blocked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          violation_type: string
        }
        Update: {
          attempted_action?: string
          attempted_table?: string
          blocked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          ai_analysis: string | null
          ai_confidence: number | null
          case_description: string | null
          case_title: string
          category: string
          created_at: string
          id: string
          jurisdiction: string
          level: string
          recommendations: Json
          risk_flags: Json
          score: number
          signals: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_confidence?: number | null
          case_description?: string | null
          case_title: string
          category?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          level?: string
          recommendations?: Json
          risk_flags?: Json
          score?: number
          signals?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_confidence?: number | null
          case_description?: string | null
          case_title?: string
          category?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          level?: string
          recommendations?: Json
          risk_flags?: Json
          score?: number
          signals?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_configurations: {
        Row: {
          config_key: string
          config_name: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_name: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_name?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      saved_contracts: {
        Row: {
          created_at: string
          field_values: Json
          filled_content_encrypted: string | null
          id: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_values?: Json
          filled_content_encrypted?: string | null
          id?: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_values?: Json
          filled_content_encrypted?: string | null
          id?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "public_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          citations: Json | null
          created_at: string
          id: string
          query: string
          result_content: string
          search_type: string
          user_id: string
        }
        Insert: {
          citations?: Json | null
          created_at?: string
          id?: string
          query: string
          result_content: string
          search_type?: string
          user_id: string
        }
        Update: {
          citations?: Json | null
          created_at?: string
          id?: string
          query?: string
          result_content?: string
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_signatures: {
        Row: {
          created_at: string
          font_family: string | null
          id: string
          is_default: boolean | null
          name: string
          signature_data: string
          signature_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          font_family?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          signature_data: string
          signature_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          font_family?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          signature_data?: string
          signature_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      section_settings: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_enabled: boolean
          section_key: string
          section_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          section_key: string
          section_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          section_key?: string
          section_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_incidents: {
        Row: {
          blocked: boolean | null
          created_at: string
          description: string | null
          id: string
          incident_type: string
          ip_address: string | null
          request_method: string | null
          request_path: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_trials: {
        Row: {
          id: string
          service_key: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          service_key: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          service_key?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_contracts: {
        Row: {
          content: string
          contract_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          share_token: string
          title: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          content: string
          contract_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token: string
          title: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          content?: string
          contract_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token?: string
          title?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "saved_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          page_key: string
          subtitle: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          page_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          page_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string | null
          currency: string
          duration_days: number
          id: string
          ios_product_id: string | null
          is_active: boolean
          name: string
          period: string
          price_halala: number
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string
          duration_days: number
          id?: string
          ios_product_id?: string | null
          is_active?: boolean
          name: string
          period: string
          price_halala: number
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string
          duration_days?: number
          id?: string
          ios_product_id?: string | null
          is_active?: boolean
          name?: string
          period?: string
          price_halala?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          ends_at: string | null
          id: string
          plan_id: string | null
          plan_type: string
          source: string
          source_ref: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ends_at?: string | null
          id?: string
          plan_id?: string | null
          plan_type?: string
          source?: string
          source_ref?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          ends_at?: string | null
          id?: string
          plan_id?: string | null
          plan_type?: string
          source?: string
          source_ref?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terms_consent_log: {
        Row: {
          consent_type: string
          consented_at: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type?: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          privacy_version: string
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      terms_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string
          effective_date: string
          id: string
          summary_ar: string | null
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: string
          effective_date?: string
          id?: string
          summary_ar?: string | null
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string
          effective_date?: string
          id?: string
          summary_ar?: string | null
          version?: string
        }
        Relationships: []
      }
      user_contract_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          sector: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          sector?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          sector?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_known_locations: {
        Row: {
          city: string | null
          country: string
          country_code: string | null
          first_seen_at: string
          id: string
          ip_address: string | null
          is_approved: boolean | null
          is_trusted: boolean | null
          last_seen_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country: string
          country_code?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          is_approved?: boolean | null
          is_trusted?: boolean | null
          last_seen_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string
          country_code?: string | null
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          is_approved?: boolean | null
          is_trusted?: boolean | null
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          is_online: boolean | null
          last_seen: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_settings: {
        Row: {
          created_at: string
          email_alerts_enabled: boolean | null
          geo_blocking_enabled: boolean | null
          id: string
          require_approval_for_new_locations: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_alerts_enabled?: boolean | null
          geo_blocking_enabled?: boolean | null
          id?: string
          require_approval_for_new_locations?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_alerts_enabled?: boolean | null
          geo_blocking_enabled?: boolean | null
          id?: string
          require_approval_for_new_locations?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          end_reason: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      lawyer_applications_admin: {
        Row: {
          bio: string | null
          created_at: string | null
          email_encrypted: string | null
          email_masked: string | null
          experience_years: number | null
          full_name: string | null
          has_id_file: boolean | null
          has_license_file: boolean | null
          id: string | null
          id_file_url: string | null
          license_file_url: string | null
          license_number: string | null
          location: string | null
          phone_encrypted: string | null
          phone_masked: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: never
          created_at?: string | null
          email_encrypted?: string | null
          email_masked?: never
          experience_years?: number | null
          full_name?: never
          has_id_file?: never
          has_license_file?: never
          id?: string | null
          id_file_url?: string | null
          license_file_url?: string | null
          license_number?: never
          location?: string | null
          phone_encrypted?: string | null
          phone_masked?: never
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: never
          created_at?: string | null
          email_encrypted?: string | null
          email_masked?: never
          experience_years?: number | null
          full_name?: never
          has_id_file?: never
          has_license_file?: never
          id?: string | null
          id_file_url?: string | null
          license_file_url?: string | null
          license_number?: never
          location?: string | null
          phone_encrypted?: string | null
          phone_masked?: never
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lawyer_public_info: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          experience_years: number | null
          full_name: string | null
          hourly_rate: number | null
          id: string | null
          is_available: boolean | null
          location: string | null
          rating: number | null
          reviews_count: number | null
          specialty: string | null
        }
        Relationships: []
      }
      public_contract_templates: {
        Row: {
          average_rating: number | null
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          downloads_count: number | null
          id: string | null
          ratings_count: number | null
          sector: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string | null
          ratings_count?: number | null
          sector?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string | null
          ratings_count?: number | null
          sector?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      public_section_settings: {
        Row: {
          display_order: number | null
          id: string | null
          section_key: string | null
          section_name: string | null
        }
        Insert: {
          display_order?: number | null
          id?: string | null
          section_key?: string | null
          section_name?: string | null
        }
        Update: {
          display_order?: number | null
          id?: string | null
          section_key?: string | null
          section_name?: string | null
        }
        Relationships: []
      }
      public_site_content: {
        Row: {
          content: Json | null
          description: string | null
          id: string | null
          images: Json | null
          page_key: string | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          description?: string | null
          id?: string | null
          images?: Json | null
          page_key?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          description?: string | null
          id?: string | null
          images?: Json | null
          page_key?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_terms_versions: {
        Row: {
          created_at: string | null
          document_type: string | null
          effective_date: string | null
          id: string | null
          summary_ar: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          document_type?: string | null
          effective_date?: string | null
          id?: string | null
          summary_ar?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string | null
          effective_date?: string | null
          id?: string | null
          summary_ar?: string | null
          version?: string | null
        }
        Relationships: []
      }
      template_ratings_summary: {
        Row: {
          average_rating: number | null
          template_id: string | null
          total_ratings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "public_contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscription_status: {
        Row: {
          current_period_end: string | null
          plan_type: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          current_period_end?: string | null
          plan_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          current_period_end?: string | null
          plan_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit_lawyer_app_view_access: { Args: never; Returns: undefined }
      auto_block_ip: {
        Args: {
          p_attempt_count?: number
          p_block_hours?: number
          p_ip_address: string
          p_reason: string
        }
        Returns: string
      }
      check_lawyer_application_rate_limit: {
        Args: { p_email: string }
        Returns: boolean
      }
      check_shared_contract_access: {
        Args: { p_token: string }
        Returns: boolean
      }
      cleanup_inactive_admin_sessions: { Args: never; Returns: number }
      clear_failed_login_attempts: {
        Args: { p_email: string }
        Returns: undefined
      }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_sensitive_data: { Args: { plain_text: string }; Returns: string }
      end_admin_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: boolean
      }
      end_all_other_sessions: {
        Args: { p_current_session_token: string }
        Returns: number
      }
      end_user_session: { Args: { p_session_id: string }; Returns: boolean }
      get_admin_subscription_view: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string
          current_period_start: string
          email: string
          full_name: string
          id: string
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_lockout_remaining_seconds: {
        Args: {
          p_email: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: number
      }
      get_my_lawyer_application_status: {
        Args: never
        Returns: {
          created_at: string
          id: string
          rejection_reason: string
          reviewed_at: string
          status: string
        }[]
      }
      get_shared_contract_by_token: {
        Args: { p_token: string }
        Returns: {
          content: string
          created_at: string
          expires_at: string
          id: string
          title: string
          view_count: number
        }[]
      }
      get_user_email_for_admin: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_shared_contract_view: {
        Args: { p_token: string }
        Returns: undefined
      }
      insert_encrypted_analysis: {
        Args: {
          p_analysis_type: string
          p_contract_text: string
          p_legal_references?: string[]
          p_overall_rating?: number
          p_risks?: string[]
          p_suggestions?: string[]
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      insert_encrypted_message: {
        Args: {
          p_content: string
          p_file_id?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: string
      }
      insert_encrypted_saved_contract: {
        Args: {
          p_field_values?: Json
          p_filled_content?: string
          p_template_id?: string
          p_title: string
        }
        Returns: string
      }
      is_account_locked: { Args: { p_user_id: string }; Returns: boolean }
      is_active_subscriber: { Args: { _user_id: string }; Returns: boolean }
      is_admin_ip_allowed: { Args: { check_ip: string }; Returns: boolean }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      is_ip_whitelisted: { Args: { check_ip: string }; Returns: boolean }
      is_lawyer_listing_enabled: { Args: never; Returns: boolean }
      is_login_rate_limited: {
        Args: {
          p_email: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      is_public_content_allowed: { Args: never; Returns: boolean }
      is_user_payment_blocked: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      lock_user_account: {
        Args: { p_duration_hours?: number; p_reason?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_description?: string
          p_new_values?: Json
          p_old_values?: Json
          p_target_id?: string
          p_target_table: string
          p_target_user_id?: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_policy_violation: {
        Args: {
          p_attempted_action?: string
          p_attempted_table: string
          p_blocked?: boolean
          p_description?: string
          p_ip_address?: string
          p_severity?: string
          p_user_agent?: string
          p_violation_type?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          p_action: string
          p_error_message?: string
          p_resource_id?: string
          p_resource_type: string
          p_success?: boolean
        }
        Returns: undefined
      }
      log_security_incident: {
        Args: {
          p_blocked?: boolean
          p_description?: string
          p_incident_type: string
          p_ip_address?: string
          p_request_path?: string
          p_severity?: string
          p_user_agent?: string
        }
        Returns: string
      }
      make_ip_block_permanent: {
        Args: { p_ip_address: string }
        Returns: boolean
      }
      parse_device_info: { Args: { user_agent_str: string }; Returns: Json }
      record_failed_login: {
        Args: { p_email: string; p_ip_address?: string; p_user_agent?: string }
        Returns: undefined
      }
      register_admin_session: {
        Args: {
          p_ip_address?: string
          p_session_token: string
          p_user_agent?: string
        }
        Returns: string
      }
      register_user_session: {
        Args: {
          p_ip_address?: string
          p_session_token: string
          p_user_agent?: string
        }
        Returns: string
      }
      unblock_ip: { Args: { p_ip_address: string }; Returns: boolean }
      unlock_user_account: { Args: never; Returns: boolean }
      update_admin_session_activity: {
        Args: { p_session_token: string }
        Returns: undefined
      }
      update_user_session_activity: {
        Args: { p_session_token: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "lawyer" | "client"
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
      app_role: ["admin", "lawyer", "client"],
    },
  },
} as const
