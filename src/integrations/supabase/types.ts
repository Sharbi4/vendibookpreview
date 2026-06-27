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
      admin_action_idempotency: {
        Row: {
          action: string
          created_at: string
          idempotency_key: string
          response: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          idempotency_key: string
          response: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          idempotency_key?: string
          response?: Json
          user_id?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          city: string | null
          created_at: string
          event_category: string | null
          event_name: string
          id: string
          listing_id: string | null
          metadata: Json | null
          route: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          event_category?: string | null
          event_name: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          event_category?: string | null
          event_name?: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      asset_requests: {
        Row: {
          admin_notes: string | null
          asset_type: string
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          city: string
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          intent: string | null
          is_public: boolean
          listing_id: string | null
          matched_listing_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          source_page: string | null
          start_date: string | null
          state: string | null
          status: string | null
          timeline: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          asset_type: string
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city: string
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          intent?: string | null
          is_public?: boolean
          listing_id?: string | null
          matched_listing_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source_page?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          asset_type?: string
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string
          created_at?: string
          email?: string | null
          end_date?: string | null
          id?: string
          intent?: string | null
          is_public?: boolean
          listing_id?: string | null
          matched_listing_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source_page?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          timeline?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_matched_listing_id_fkey"
            columns: ["matched_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_alerts: {
        Row: {
          category: string | null
          created_at: string
          email: string
          id: string
          last_geocoded_at: string | null
          latitude: number | null
          longitude: number | null
          mode: string | null
          name: string | null
          notified_at: string | null
          phone: string | null
          radius_miles: number | null
          unsubscribed_at: string | null
          zip_code: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          email: string
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mode?: string | null
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          radius_miles?: number | null
          unsubscribed_at?: string | null
          zip_code: string
        }
        Update: {
          category?: string | null
          created_at?: string
          email?: string
          id?: string
          last_geocoded_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mode?: string | null
          name?: string | null
          notified_at?: string | null
          phone?: string | null
          radius_miles?: number | null
          unsubscribed_at?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      blog_campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error_message: string | null
          id: string
          is_test: boolean
          resend_message_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          is_test?: boolean
          resend_message_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          is_test?: boolean
          resend_message_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blog_share_clicks: {
        Row: {
          article_slug: string
          campaign: string | null
          created_at: string
          cta_label: string | null
          destination_url: string | null
          id: string
          referrer: string | null
          source: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          article_slug: string
          campaign?: string | null
          created_at?: string
          cta_label?: string | null
          destination_url?: string | null
          id?: string
          referrer?: string | null
          source: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          article_slug?: string
          campaign?: string | null
          created_at?: string
          cta_label?: string | null
          destination_url?: string | null
          id?: string
          referrer?: string | null
          source?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      blog_subscribers: {
        Row: {
          confirmed: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      booking_documents: {
        Row: {
          booking_id: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          uploaded_at: string
        }
        Insert: {
          booking_id: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string
        }
        Update: {
          booking_id?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_drafts: {
        Row: {
          abandoned_at: string | null
          completed_at: string | null
          created_at: string
          email: string
          email_24h_sent_at: string | null
          email_2h_sent_at: string | null
          end_date: string | null
          id: string
          listing_id: string
          recovery_token: string
          start_date: string | null
          total_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_at?: string | null
          completed_at?: string | null
          created_at?: string
          email: string
          email_24h_sent_at?: string | null
          email_2h_sent_at?: string | null
          end_date?: string | null
          id?: string
          listing_id: string
          recovery_token?: string
          start_date?: string | null
          total_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_at?: string | null
          completed_at?: string | null
          created_at?: string
          email?: string
          email_24h_sent_at?: string | null
          email_2h_sent_at?: string | null
          end_date?: string | null
          id?: string
          listing_id?: string
          recovery_token?: string
          start_date?: string | null
          total_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          booking_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          booking_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          access_instructions_snapshot: string | null
          address_snapshot: string | null
          booking_end_timestamp: string | null
          business_info: Json | null
          checkout_session_id: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee_snapshot: number | null
          delivery_instructions: string | null
          deposit_amount: number | null
          deposit_charge_id: string | null
          deposit_refund_notes: string | null
          deposit_refunded_at: string | null
          deposit_status: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_status: string | null
          document_rejection_reason: string | null
          document_reminder_sent_at: string | null
          document_review_status: string | null
          documents_approved_at: string | null
          documents_approved_by: string | null
          duration_hours: number | null
          end_date: string
          end_time: string | null
          first_response_at: string | null
          fulfillment_selected: string | null
          hold_expires_at: string | null
          hold_status: string | null
          host_confirmed_at: string | null
          host_id: string
          host_nudge_sent_at: string | null
          host_response: string | null
          hourly_slots: Json | null
          id: string
          is_hourly_booking: boolean | null
          is_instant_book: boolean | null
          listing_id: string
          message: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          payout_hold_reason: string | null
          payout_hold_set_by: string | null
          payout_hold_until: string | null
          payout_processed: boolean | null
          payout_processed_at: string | null
          payout_transfer_id: string | null
          referral_code: string | null
          responded_at: string | null
          shopper_confirmed_at: string | null
          shopper_id: string
          slot_name: string | null
          slot_number: number | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          access_instructions_snapshot?: string | null
          address_snapshot?: string | null
          booking_end_timestamp?: string | null
          business_info?: Json | null
          checkout_session_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee_snapshot?: number | null
          delivery_instructions?: string | null
          deposit_amount?: number | null
          deposit_charge_id?: string | null
          deposit_refund_notes?: string | null
          deposit_refunded_at?: string | null
          deposit_status?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          document_rejection_reason?: string | null
          document_reminder_sent_at?: string | null
          document_review_status?: string | null
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          duration_hours?: number | null
          end_date: string
          end_time?: string | null
          first_response_at?: string | null
          fulfillment_selected?: string | null
          hold_expires_at?: string | null
          hold_status?: string | null
          host_confirmed_at?: string | null
          host_id: string
          host_nudge_sent_at?: string | null
          host_response?: string | null
          hourly_slots?: Json | null
          id?: string
          is_hourly_booking?: boolean | null
          is_instant_book?: boolean | null
          listing_id: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_hold_reason?: string | null
          payout_hold_set_by?: string | null
          payout_hold_until?: string | null
          payout_processed?: boolean | null
          payout_processed_at?: string | null
          payout_transfer_id?: string | null
          referral_code?: string | null
          responded_at?: string | null
          shopper_confirmed_at?: string | null
          shopper_id: string
          slot_name?: string | null
          slot_number?: number | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          access_instructions_snapshot?: string | null
          address_snapshot?: string | null
          booking_end_timestamp?: string | null
          business_info?: Json | null
          checkout_session_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee_snapshot?: number | null
          delivery_instructions?: string | null
          deposit_amount?: number | null
          deposit_charge_id?: string | null
          deposit_refund_notes?: string | null
          deposit_refunded_at?: string | null
          deposit_status?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          document_rejection_reason?: string | null
          document_reminder_sent_at?: string | null
          document_review_status?: string | null
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          duration_hours?: number | null
          end_date?: string
          end_time?: string | null
          first_response_at?: string | null
          fulfillment_selected?: string | null
          hold_expires_at?: string | null
          hold_status?: string | null
          host_confirmed_at?: string | null
          host_id?: string
          host_nudge_sent_at?: string | null
          host_response?: string | null
          hourly_slots?: Json | null
          id?: string
          is_hourly_booking?: boolean | null
          is_instant_book?: boolean | null
          listing_id?: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_hold_reason?: string | null
          payout_hold_set_by?: string | null
          payout_hold_until?: string | null
          payout_processed?: boolean | null
          payout_processed_at?: string | null
          payout_transfer_id?: string | null
          referral_code?: string | null
          responded_at?: string | null
          shopper_confirmed_at?: string | null
          shopper_id?: string
          slot_name?: string | null
          slot_number?: number | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_payout_hold_set_by_fkey"
            columns: ["payout_hold_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_events: {
        Row: {
          created_at: string
          entity_id: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      concierge_messages: {
        Row: {
          actions: Json | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          sender_role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          actions?: Json | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_role: string
          thread_id: string
          user_id: string
        }
        Update: {
          actions?: Json | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concierge_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "concierge_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      concierge_threads: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          last_message_at: string | null
          priority: string
          status: string
          topic: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          priority?: string
          status?: string
          topic: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          priority?: string
          status?: string
          topic?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contest_entries: {
        Row: {
          created_at: string
          facebook_post_url: string
          id: string
          listing_id: string
          notes: string | null
          promotion_id: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          facebook_post_url: string
          id?: string
          listing_id: string
          notes?: string | null
          promotion_id: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          facebook_post_url?: string
          id?: string
          listing_id?: string
          notes?: string | null
          promotion_id?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_winners: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          payout_completed_at: string | null
          payout_initiated_at: string | null
          payout_status: string
          promotion_id: string
          selected_at: string
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          payout_status?: string
          promotion_id: string
          selected_at?: string
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          payout_status?: string
          promotion_id?: string
          selected_at?: string
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_winners_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_winners_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          message: string
          pii_blocked: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          pii_blocked?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          pii_blocked?: boolean | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          host_id: string
          id: string
          last_message_at: string | null
          listing_id: string | null
          shopper_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          shopper_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          shopper_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_shopper_id_fkey"
            columns: ["shopper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          event_type: Database["public"]["Enums"]["marketing_event_type"]
          id: string
          metadata: Json
          occurred_at: string
          recipient_email: string | null
          send_id: string | null
          user_id: string | null
        }
        Insert: {
          event_type: Database["public"]["Enums"]["marketing_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          recipient_email?: string | null
          send_id?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: Database["public"]["Enums"]["marketing_event_type"]
          id?: string
          metadata?: Json
          occurred_at?: string
          recipient_email?: string | null
          send_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_feedback: {
        Row: {
          clicked_at: string
          id: string
          rating: Database["public"]["Enums"]["marketing_feedback_rating"]
          recipient_email: string | null
          send_id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          rating: Database["public"]["Enums"]["marketing_feedback_rating"]
          recipient_email?: string | null
          send_id: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          rating?: Database["public"]["Enums"]["marketing_feedback_rating"]
          recipient_email?: string | null
          send_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_feedback_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          automation_source: string | null
          composed_payload: Json
          created_at: string
          created_by: string | null
          featured_rental_id: string | null
          hero_headline: string
          id: string
          issue_number: number
          listings_section_replaced: boolean
          recipient_count: number | null
          referral_rotation: string
          rental_section_replaced: boolean
          resend_broadcast_id: string | null
          sale_listing_ids: string[] | null
          scheduled_for: string | null
          section_label_rental: string | null
          section_label_sale: string | null
          send_day: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["marketing_send_status"]
          subject_line: string
          test_message_id: string | null
          updated_at: string
          used_fallback_listings: boolean
          used_fallback_rental: boolean
        }
        Insert: {
          automation_source?: string | null
          composed_payload?: Json
          created_at?: string
          created_by?: string | null
          featured_rental_id?: string | null
          hero_headline: string
          id?: string
          issue_number?: number
          listings_section_replaced?: boolean
          recipient_count?: number | null
          referral_rotation?: string
          rental_section_replaced?: boolean
          resend_broadcast_id?: string | null
          sale_listing_ids?: string[] | null
          scheduled_for?: string | null
          section_label_rental?: string | null
          section_label_sale?: string | null
          send_day?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          subject_line: string
          test_message_id?: string | null
          updated_at?: string
          used_fallback_listings?: boolean
          used_fallback_rental?: boolean
        }
        Update: {
          automation_source?: string | null
          composed_payload?: Json
          created_at?: string
          created_by?: string | null
          featured_rental_id?: string | null
          hero_headline?: string
          id?: string
          issue_number?: number
          listings_section_replaced?: boolean
          recipient_count?: number | null
          referral_rotation?: string
          rental_section_replaced?: boolean
          resend_broadcast_id?: string | null
          sale_listing_ids?: string[] | null
          scheduled_for?: string | null
          section_label_rental?: string | null
          section_label_sale?: string | null
          send_day?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["marketing_send_status"]
          subject_line?: string
          test_message_id?: string | null
          updated_at?: string
          used_fallback_listings?: boolean
          used_fallback_rental?: boolean
        }
        Relationships: []
      }
      email_test_sends: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          id: string
          recipient_email: string
          send_id: string
          sent_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          recipient_email: string
          send_id: string
          sent_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          recipient_email?: string
          send_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_test_sends_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      error_events: {
        Row: {
          action: string | null
          alert_count: number
          alert_sent_at: string | null
          boost_id: string | null
          created_at: string
          endpoint: string | null
          error_message: string | null
          error_type: string | null
          fingerprint: string
          id: string
          internal_notes: string | null
          listing_id: string | null
          metadata: Json
          method: string | null
          occurred_at: string
          page_url: string | null
          payment_id: string | null
          priority: string
          reference_code: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          source: string
          stack: string | null
          status_code: number | null
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          alert_count?: number
          alert_sent_at?: string | null
          boost_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          error_type?: string | null
          fingerprint: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          metadata?: Json
          method?: string | null
          occurred_at?: string
          page_url?: string | null
          payment_id?: string | null
          priority?: string
          reference_code: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          alert_count?: number
          alert_sent_at?: string | null
          boost_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          error_type?: string | null
          fingerprint?: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          metadata?: Json
          method?: string | null
          occurred_at?: string
          page_url?: string | null
          payment_id?: string | null
          priority?: string
          reference_code?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          source?: string
          stack?: string | null
          status_code?: number | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_email_sent: {
        Row: {
          context_id: string
          context_type: string
          id: string
          recipient_email: string
          sent_at: string
        }
        Insert: {
          context_id: string
          context_type: string
          id?: string
          recipient_email: string
          sent_at?: string
        }
        Update: {
          context_id?: string
          context_type?: string
          id?: string
          recipient_email?: string
          sent_at?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          nps: number | null
          rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          nps?: number | null
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          nps?: number | null
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      listing_ai_insights: {
        Row: {
          competitor_summary: Json | null
          created_at: string
          expires_at: string
          generated_at: string
          health_score: number
          host_id: string
          id: string
          listing_id: string
          model_used: string
          recommendations: Json
        }
        Insert: {
          competitor_summary?: Json | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          health_score: number
          host_id: string
          id?: string
          listing_id: string
          model_used?: string
          recommendations?: Json
        }
        Update: {
          competitor_summary?: Json | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          health_score?: number
          host_id?: string
          id?: string
          listing_id?: string
          model_used?: string
          recommendations?: Json
        }
        Relationships: []
      }
      listing_ai_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          listing_id: string
          media_type: string
          source_hash: string | null
          url: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          listing_id: string
          media_type: string
          source_hash?: string | null
          url: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          listing_id?: string
          media_type?: string
          source_hash?: string | null
          url?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_ai_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_analytics_daily: {
        Row: {
          bookings: number
          created_at: string
          date: string
          host_id: string
          id: string
          inquiries: number
          listing_id: string
          revenue: number
          source_breakdown: Json
          unique_viewers: number
          updated_at: string
          views: number
        }
        Insert: {
          bookings?: number
          created_at?: string
          date: string
          host_id: string
          id?: string
          inquiries?: number
          listing_id: string
          revenue?: number
          source_breakdown?: Json
          unique_viewers?: number
          updated_at?: string
          views?: number
        }
        Update: {
          bookings?: number
          created_at?: string
          date?: string
          host_id?: string
          id?: string
          inquiries?: number
          listing_id?: string
          revenue?: number
          source_breakdown?: Json
          unique_viewers?: number
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      listing_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          host_id: string
          id: string
          listing_id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          host_id: string
          id?: string
          listing_id: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          host_id?: string
          id?: string
          listing_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_blocked_dates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_blocked_times: {
        Row: {
          blocked_date: string
          created_at: string
          end_time: string
          host_id: string
          id: string
          listing_id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          end_time: string
          host_id: string
          id?: string
          listing_id: string
          reason?: string | null
          start_time: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          end_time?: string
          host_id?: string
          id?: string
          listing_id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_blocked_times_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string | null
          event_type: string
          host_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          is_recurring: boolean | null
          listing_id: string
          recurrence_pattern: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string
          host_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_recurring?: boolean | null
          listing_id: string
          recurrence_pattern?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string
          host_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_recurring?: boolean | null
          listing_id?: string
          recurrence_pattern?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_leads: {
        Row: {
          created_at: string
          email: string
          host_id: string
          id: string
          listing_id: string
          message: string | null
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          host_id: string
          id?: string
          listing_id: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          host_id?: string
          id?: string
          listing_id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_required_documents: {
        Row: {
          created_at: string
          deadline_offset_hours: number | null
          deadline_type: Database["public"]["Enums"]["document_deadline_type"]
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          id: string
          is_required: boolean
          listing_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline_offset_hours?: number | null
          deadline_type?: Database["public"]["Enums"]["document_deadline_type"]
          description?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          id?: string
          is_required?: boolean
          listing_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline_offset_hours?: number | null
          deadline_type?: Database["public"]["Enums"]["document_deadline_type"]
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          is_required?: boolean
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_required_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_rewards: {
        Row: {
          active_days_count: number
          admin_override: boolean | null
          created_at: string
          disqualified_at: string | null
          disqualified_reason: string | null
          eligible_at: string | null
          id: string
          last_checked_at: string | null
          listing_id: string
          payout_completed_at: string | null
          payout_initiated_at: string | null
          payout_status: string
          promotion_id: string
          published_at: string
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_days_count?: number
          admin_override?: boolean | null
          created_at?: string
          disqualified_at?: string | null
          disqualified_reason?: string | null
          eligible_at?: string | null
          id?: string
          last_checked_at?: string | null
          listing_id: string
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          payout_status?: string
          promotion_id: string
          published_at: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_days_count?: number
          admin_override?: boolean | null
          created_at?: string
          disqualified_at?: string | null
          disqualified_reason?: string | null
          eligible_at?: string | null
          id?: string
          last_checked_at?: string | null
          listing_id?: string
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          payout_status?: string
          promotion_id?: string
          published_at?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_rewards_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_rewards_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          id: string
          listing_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          accept_card_payment: boolean | null
          accept_cash_payment: boolean | null
          access_instructions: string | null
          address: string | null
          amenities: string[] | null
          available_from: string | null
          available_to: string | null
          buffer_time_mins: number | null
          category: Database["public"]["Enums"]["listing_category"]
          city: string | null
          cover_image_url: string | null
          created_at: string
          daily_enabled: boolean | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_radius_miles: number | null
          deposit_amount: number | null
          description: string
          featured_at: string | null
          featured_enabled: boolean | null
          featured_expires_at: string | null
          featured_source: string | null
          freight_category: string | null
          freight_payer: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token: string | null
          height_inches: number | null
          highlights: string[] | null
          host_id: string | null
          hourly_enabled: boolean | null
          hourly_schedule: Json | null
          hourly_special_pricing: Json | null
          hours_of_access: string | null
          id: string
          image_urls: string[] | null
          instant_book: boolean | null
          latitude: number | null
          length_inches: number | null
          location_notes: string | null
          longitude: number | null
          max_hours: number | null
          min_hours: number | null
          min_notice_hours: number | null
          mode: Database["public"]["Enums"]["listing_mode"]
          operating_hours_end: string | null
          operating_hours_start: string | null
          pending_featured_payment: Json | null
          pickup_instructions: string | null
          pickup_location_text: string | null
          postal_code: string | null
          price_daily: number | null
          price_hourly: number | null
          price_monthly: number | null
          price_sale: number | null
          price_weekly: number | null
          proof_notary_enabled: boolean | null
          published_at: string | null
          rental_buffer_days: number | null
          rental_min_days: number | null
          slot_names: string[] | null
          state: string | null
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          title: string
          total_slots: number | null
          updated_at: string
          vendibook_freight_enabled: boolean | null
          video_urls: string[] | null
          view_count: number | null
          weight_lbs: number | null
          width_inches: number | null
        }
        Insert: {
          accept_card_payment?: boolean | null
          accept_cash_payment?: boolean | null
          access_instructions?: string | null
          address?: string | null
          amenities?: string[] | null
          available_from?: string | null
          available_to?: string | null
          buffer_time_mins?: number | null
          category: Database["public"]["Enums"]["listing_category"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          daily_enabled?: boolean | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          deposit_amount?: number | null
          description: string
          featured_at?: string | null
          featured_enabled?: boolean | null
          featured_expires_at?: string | null
          featured_source?: string | null
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token?: string | null
          height_inches?: number | null
          highlights?: string[] | null
          host_id?: string | null
          hourly_enabled?: boolean | null
          hourly_schedule?: Json | null
          hourly_special_pricing?: Json | null
          hours_of_access?: string | null
          id?: string
          image_urls?: string[] | null
          instant_book?: boolean | null
          latitude?: number | null
          length_inches?: number | null
          location_notes?: string | null
          longitude?: number | null
          max_hours?: number | null
          min_hours?: number | null
          min_notice_hours?: number | null
          mode: Database["public"]["Enums"]["listing_mode"]
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          pending_featured_payment?: Json | null
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          postal_code?: string | null
          price_daily?: number | null
          price_hourly?: number | null
          price_monthly?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          proof_notary_enabled?: boolean | null
          published_at?: string | null
          rental_buffer_days?: number | null
          rental_min_days?: number | null
          slot_names?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title: string
          total_slots?: number | null
          updated_at?: string
          vendibook_freight_enabled?: boolean | null
          video_urls?: string[] | null
          view_count?: number | null
          weight_lbs?: number | null
          width_inches?: number | null
        }
        Update: {
          accept_card_payment?: boolean | null
          accept_cash_payment?: boolean | null
          access_instructions?: string | null
          address?: string | null
          amenities?: string[] | null
          available_from?: string | null
          available_to?: string | null
          buffer_time_mins?: number | null
          category?: Database["public"]["Enums"]["listing_category"]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          daily_enabled?: boolean | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          deposit_amount?: number | null
          description?: string
          featured_at?: string | null
          featured_enabled?: boolean | null
          featured_expires_at?: string | null
          featured_source?: string | null
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token?: string | null
          height_inches?: number | null
          highlights?: string[] | null
          host_id?: string | null
          hourly_enabled?: boolean | null
          hourly_schedule?: Json | null
          hourly_special_pricing?: Json | null
          hours_of_access?: string | null
          id?: string
          image_urls?: string[] | null
          instant_book?: boolean | null
          latitude?: number | null
          length_inches?: number | null
          location_notes?: string | null
          longitude?: number | null
          max_hours?: number | null
          min_hours?: number | null
          min_notice_hours?: number | null
          mode?: Database["public"]["Enums"]["listing_mode"]
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          pending_featured_payment?: Json | null
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          postal_code?: string | null
          price_daily?: number | null
          price_hourly?: number | null
          price_monthly?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          proof_notary_enabled?: boolean | null
          published_at?: string | null
          rental_buffer_days?: number | null
          rental_min_days?: number | null
          slot_names?: string[] | null
          state?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          subcategory?: string | null
          title?: string
          total_slots?: number | null
          updated_at?: string
          vendibook_freight_enabled?: boolean | null
          video_urls?: string[] | null
          view_count?: number | null
          weight_lbs?: number | null
          width_inches?: number | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          booking_email: boolean
          booking_inapp: boolean
          booking_request_email: boolean
          booking_request_inapp: boolean
          booking_response_email: boolean
          booking_response_inapp: boolean
          created_at: string
          dispute_email: boolean
          dispute_inapp: boolean
          document_email: boolean
          document_inapp: boolean
          id: string
          message_email: boolean
          message_inapp: boolean
          push_enabled: boolean
          sale_email: boolean
          sale_inapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_email?: boolean
          booking_inapp?: boolean
          booking_request_email?: boolean
          booking_request_inapp?: boolean
          booking_response_email?: boolean
          booking_response_inapp?: boolean
          created_at?: string
          dispute_email?: boolean
          dispute_inapp?: boolean
          document_email?: boolean
          document_inapp?: boolean
          id?: string
          message_email?: boolean
          message_inapp?: boolean
          push_enabled?: boolean
          sale_email?: boolean
          sale_inapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_email?: boolean
          booking_inapp?: boolean
          booking_request_email?: boolean
          booking_request_inapp?: boolean
          booking_response_email?: boolean
          booking_response_inapp?: boolean
          created_at?: string
          dispute_email?: boolean
          dispute_inapp?: boolean
          document_email?: boolean
          document_inapp?: boolean
          id?: string
          message_email?: boolean
          message_inapp?: boolean
          push_enabled?: boolean
          sale_email?: boolean
          sale_inapp?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          buyer_id: string
          counter_amount: number | null
          counter_expires_at: string | null
          counter_message: string | null
          created_at: string
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          offer_amount: number
          responded_at: string | null
          seller_id: string
          seller_response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          counter_amount?: number | null
          counter_expires_at?: string | null
          counter_message?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          offer_amount: number
          responded_at?: string | null
          seller_id: string
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          counter_amount?: number | null
          counter_expires_at?: string | null
          counter_message?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          offer_amount?: number
          responded_at?: string | null
          seller_id?: string
          seller_response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      orchestration_decisions: {
        Row: {
          chosen_channel: string | null
          created_at: string
          entity_id: string | null
          event_type: string
          id: string
          outcome: Json
          payload: Json
          priority: string | null
          rationale: string | null
          suppressed: boolean
          suppression_reason: string | null
          user_id: string
        }
        Insert: {
          chosen_channel?: string | null
          created_at?: string
          entity_id?: string | null
          event_type: string
          id?: string
          outcome?: Json
          payload?: Json
          priority?: string | null
          rationale?: string | null
          suppressed?: boolean
          suppression_reason?: string | null
          user_id: string
        }
        Update: {
          chosen_channel?: string | null
          created_at?: string
          entity_id?: string | null
          event_type?: string
          id?: string
          outcome?: Json
          payload?: Json
          priority?: string | null
          rationale?: string | null
          suppressed?: boolean
          suppression_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      orchestration_rules: {
        Row: {
          audience_filter: Json
          cooldown_minutes: number
          created_at: string
          default_channel: string
          enabled: boolean
          event_type: string
          id: string
          priority: string
          respect_quiet_hours: boolean
          template_hint: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          cooldown_minutes?: number
          created_at?: string
          default_channel?: string
          enabled?: boolean
          event_type: string
          id?: string
          priority?: string
          respect_quiet_hours?: boolean
          template_hint?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          cooldown_minutes?: number
          created_at?: string
          default_channel?: string
          enabled?: boolean
          event_type?: string
          id?: string
          priority?: string
          respect_quiet_hours?: boolean
          template_hint?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permit_documents: {
        Row: {
          deleted_at: string | null
          file_name: string
          id: string
          item_key: string
          mime_type: string | null
          roadmap_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          deleted_at?: string | null
          file_name: string
          id?: string
          item_key: string
          mime_type?: string | null
          roadmap_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          deleted_at?: string | null
          file_name?: string
          id?: string
          item_key?: string
          mime_type?: string | null
          roadmap_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_documents_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "saved_permit_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_items: {
        Row: {
          archived: boolean
          archived_at: string | null
          archived_reason: string | null
          created_at: string
          expires_on: string | null
          field_updated_at: Json
          id: string
          issue_date: string | null
          issuing_agency: string | null
          item_key: string
          notes: string | null
          permit_number: string | null
          roadmap_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
          created_at?: string
          expires_on?: string | null
          field_updated_at?: Json
          id?: string
          issue_date?: string | null
          issuing_agency?: string | null
          item_key: string
          notes?: string | null
          permit_number?: string | null
          roadmap_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
          created_at?: string
          expires_on?: string | null
          field_updated_at?: Json
          id?: string
          issue_date?: string | null
          issuing_agency?: string | null
          item_key?: string
          notes?: string | null
          permit_number?: string | null
          roadmap_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_items_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "saved_permit_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_progress: {
        Row: {
          business_type: string | null
          city: string | null
          completed: Json
          created_at: string
          id: string
          owned: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          city?: string | null
          completed?: Json
          created_at?: string
          id?: string
          owned?: Json
          roadmap_key: string
          state_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          city?: string | null
          completed?: Json
          created_at?: string
          id?: string
          owned?: Json
          roadmap_key?: string
          state_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address1: string | null
          address2: string | null
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          city: string | null
          created_at: string
          display_name: string | null
          draft_nudge_sent_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          header_image_url: string | null
          id: string
          identity_verified: boolean | null
          identity_verified_at: string | null
          last_active_at: string | null
          last_name: string | null
          phone_number: string | null
          pinned_listing_id: string | null
          public_city: string | null
          public_state: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          referral_suspended: boolean
          referral_terms_version_accepted: string | null
          referral_w9_collected: boolean
          referral_ytd_earnings: number
          shop_policies: Json | null
          state: string | null
          stripe_account_id: string | null
          stripe_identity_session_id: string | null
          stripe_nudge_sent_at: string | null
          stripe_onboarding_complete: boolean | null
          stripe_onboarding_started_at: string | null
          updated_at: string
          username: string | null
          zip_code: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          draft_nudge_sent_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          header_image_url?: string | null
          id: string
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          last_active_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          pinned_listing_id?: string | null
          public_city?: string | null
          public_state?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          referral_suspended?: boolean
          referral_terms_version_accepted?: string | null
          referral_w9_collected?: boolean
          referral_ytd_earnings?: number
          shop_policies?: Json | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_identity_session_id?: string | null
          stripe_nudge_sent_at?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_onboarding_started_at?: string | null
          updated_at?: string
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          draft_nudge_sent_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          header_image_url?: string | null
          id?: string
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          last_active_at?: string | null
          last_name?: string | null
          phone_number?: string | null
          pinned_listing_id?: string | null
          public_city?: string | null
          public_state?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          referral_suspended?: boolean
          referral_terms_version_accepted?: string | null
          referral_w9_collected?: boolean
          referral_ytd_earnings?: number
          shop_policies?: Json | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_identity_session_id?: string | null
          stripe_nudge_sent_at?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_onboarding_started_at?: string | null
          updated_at?: string
          username?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pinned_listing_id_fkey"
            columns: ["pinned_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          discount_applied: number
          id: string
          promo_code_id: string
          transaction_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          discount_applied: number
          id?: string
          promo_code_id: string
          transaction_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          discount_applied?: number
          id?: string
          promo_code_id?: string
          transaction_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase_amount: number | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_assets: {
        Row: {
          asset_type: string
          channel: string
          content: Json
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          listing_id: string
          performance_metrics: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          channel: string
          content?: Json
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          listing_id: string
          performance_metrics?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          channel?: string
          content?: Json
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          listing_id?: string
          performance_metrics?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          draw_at_et: string | null
          end_at_et: string
          entry_deadline_et: string | null
          id: string
          name: string
          rules_json: Json | null
          start_at_et: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          draw_at_et?: string | null
          end_at_et: string
          entry_deadline_et?: string | null
          id?: string
          name: string
          rules_json?: Json | null
          start_at_et: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          draw_at_et?: string | null
          end_at_et?: string
          entry_deadline_et?: string | null
          id?: string
          name?: string
          rules_json?: Json | null
          start_at_et?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          code: string
          converted_to_signup: boolean
          cookie_set: boolean
          country: string | null
          created_at: string
          destination_path: string | null
          device_type: string | null
          hashed_ip: string | null
          id: string
          program_type: string | null
          region: string | null
          signup_user_id: string | null
          source_header: string | null
          user_agent: string | null
        }
        Insert: {
          code: string
          converted_to_signup?: boolean
          cookie_set?: boolean
          country?: string | null
          created_at?: string
          destination_path?: string | null
          device_type?: string | null
          hashed_ip?: string | null
          id?: string
          program_type?: string | null
          region?: string | null
          signup_user_id?: string | null
          source_header?: string | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          converted_to_signup?: boolean
          cookie_set?: boolean
          country?: string | null
          created_at?: string
          destination_path?: string | null
          device_type?: string | null
          hashed_ip?: string | null
          id?: string
          program_type?: string | null
          region?: string | null
          signup_user_id?: string | null
          source_header?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          get_amount: number
          give_amount: number
          id: string
          is_active: boolean
          total_earned: number
          total_qualified: number
          total_referred: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          get_amount?: number
          give_amount?: number
          id?: string
          is_active?: boolean
          total_earned?: number
          total_qualified?: number
          total_referred?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          get_amount?: number
          give_amount?: number
          id?: string
          is_active?: boolean
          total_earned?: number
          total_qualified?: number
          total_referred?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_fraud_flags: {
        Row: {
          action_type: string | null
          created_at: string
          details: Json
          flag_type: string
          id: string
          idempotency_key: string | null
          referral_id: string | null
          referrer_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          idempotency_key?: string | null
          referral_id?: string | null
          referrer_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          idempotency_key?: string | null
          referral_id?: string | null
          referrer_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_fraud_flags_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          amount_gross: number
          amount_net: number
          attempted_at: string
          completed_at: string | null
          created_at: string
          failure_reason: string | null
          id: string
          referral_ids: string[]
          referrer_id: string
          status: string
          stripe_fee: number
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_gross: number
          amount_net: number
          attempted_at?: string
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          referral_ids?: string[]
          referrer_id: string
          status?: string
          stripe_fee?: number
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_gross?: number
          amount_net?: number
          attempted_at?: string
          completed_at?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          referral_ids?: string[]
          referrer_id?: string
          status?: string
          stripe_fee?: number
          stripe_transfer_id?: string | null
        }
        Relationships: []
      }
      referral_program_config: {
        Row: {
          hold_days: number
          is_active: boolean
          min_transaction_value: number
          monthly_cap: number | null
          program_type: string
          reward_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          hold_days?: number
          is_active?: boolean
          min_transaction_value?: number
          monthly_cap?: number | null
          program_type: string
          reward_amount: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          hold_days?: number
          is_active?: boolean
          min_transaction_value?: number
          monthly_cap?: number | null
          program_type?: string
          reward_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referral_status_log: {
        Row: {
          action_type: string | null
          changed_by_source: string
          changed_by_user_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          new_status: string
          note: string | null
          old_status: string | null
          referral_id: string
        }
        Insert: {
          action_type?: string | null
          changed_by_source?: string
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          new_status: string
          note?: string | null
          old_status?: string | null
          referral_id: string
        }
        Update: {
          action_type?: string | null
          changed_by_source?: string
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          new_status?: string
          note?: string | null
          old_status?: string | null
          referral_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_status_log_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_w9_records: {
        Row: {
          address_city: string | null
          address_line: string | null
          address_state: string | null
          address_zip: string | null
          collected_at: string
          id: string
          storage_path: string | null
          tax_id_last4: string
          taxpayer_name: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_line?: string | null
          address_state?: string | null
          address_zip?: string | null
          collected_at?: string
          id?: string
          storage_path?: string | null
          tax_id_last4: string
          taxpayer_name: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_line?: string | null
          address_state?: string | null
          address_zip?: string | null
          collected_at?: string
          id?: string
          storage_path?: string | null
          tax_id_last4?: string
          taxpayer_name?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          attribution_source: string | null
          code: string
          cookie_attribution_code: string | null
          created_at: string
          id: string
          listing_id: string | null
          listing_published_at: string | null
          manual_attribution_code: string | null
          on_hold_until: string | null
          payout_date: string | null
          pending_review_at: string | null
          program_type: string | null
          qualified_at: string | null
          qualifying_entity_id: string | null
          qualifying_event: string | null
          referred_reward_amount: number | null
          referred_reward_payout_id: string | null
          referred_reward_status: string | null
          referred_user_id: string
          referrer_id: string
          referrer_reward_amount: number | null
          referrer_reward_payout_id: string | null
          referrer_reward_status: string | null
          reward_amount: number | null
          status: string
          supply_first_txn_at: string | null
          transaction_id: string | null
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attribution_source?: string | null
          code: string
          cookie_attribution_code?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_published_at?: string | null
          manual_attribution_code?: string | null
          on_hold_until?: string | null
          payout_date?: string | null
          pending_review_at?: string | null
          program_type?: string | null
          qualified_at?: string | null
          qualifying_entity_id?: string | null
          qualifying_event?: string | null
          referred_reward_amount?: number | null
          referred_reward_payout_id?: string | null
          referred_reward_status?: string | null
          referred_user_id: string
          referrer_id: string
          referrer_reward_amount?: number | null
          referrer_reward_payout_id?: string | null
          referrer_reward_status?: string | null
          reward_amount?: number | null
          status?: string
          supply_first_txn_at?: string | null
          transaction_id?: string | null
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attribution_source?: string | null
          code?: string
          cookie_attribution_code?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          listing_published_at?: string | null
          manual_attribution_code?: string | null
          on_hold_until?: string | null
          payout_date?: string | null
          pending_review_at?: string | null
          program_type?: string | null
          qualified_at?: string | null
          qualifying_entity_id?: string | null
          qualifying_event?: string | null
          referred_reward_amount?: number | null
          referred_reward_payout_id?: string | null
          referred_reward_status?: string | null
          referred_user_id?: string
          referrer_id?: string
          referrer_reward_amount?: number | null
          referrer_reward_payout_id?: string | null
          referrer_reward_status?: string | null
          reward_amount?: number | null
          status?: string
          supply_first_txn_at?: string | null
          transaction_id?: string | null
          updated_at?: string
          void_reason?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string
          host_id: string
          id: string
          listing_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          host_id: string
          id?: string
          listing_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          host_id?: string
          id?: string
          listing_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_type: string
          id: string
          listing_id: string | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_type: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_type?: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_transactions: {
        Row: {
          amount: number
          buyer_confirmed_at: string | null
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          carrier: string | null
          checkout_session_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          estimated_delivery_date: string | null
          freight_checkout_session_id: string | null
          freight_cost: number | null
          freight_paid_at: string | null
          freight_payment_intent_id: string | null
          freight_payment_status: string | null
          fulfillment_type: string | null
          id: string
          listing_id: string
          message: string | null
          payment_intent_id: string | null
          payout_completed_at: string | null
          platform_fee: number
          promo_code_id: string | null
          promo_discount: number | null
          referral_code: string | null
          seller_confirmed_at: string | null
          seller_id: string
          seller_payout: number
          shipped_at: string | null
          shipping_notes: string | null
          shipping_status: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          carrier?: string | null
          checkout_session_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          freight_checkout_session_id?: string | null
          freight_cost?: number | null
          freight_paid_at?: string | null
          freight_payment_intent_id?: string | null
          freight_payment_status?: string | null
          fulfillment_type?: string | null
          id?: string
          listing_id: string
          message?: string | null
          payment_intent_id?: string | null
          payout_completed_at?: string | null
          platform_fee: number
          promo_code_id?: string | null
          promo_discount?: number | null
          referral_code?: string | null
          seller_confirmed_at?: string | null
          seller_id: string
          seller_payout: number
          shipped_at?: string | null
          shipping_notes?: string | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          carrier?: string | null
          checkout_session_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          freight_checkout_session_id?: string | null
          freight_cost?: number | null
          freight_paid_at?: string | null
          freight_payment_intent_id?: string | null
          freight_payment_status?: string | null
          fulfillment_type?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          payment_intent_id?: string | null
          payout_completed_at?: string | null
          platform_fee?: number
          promo_code_id?: string | null
          promo_discount?: number | null
          referral_code?: string | null
          seller_confirmed_at?: string | null
          seller_id?: string
          seller_payout?: number
          shipped_at?: string | null
          shipping_notes?: string | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_transactions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          full_address: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          full_address: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      saved_permit_roadmaps: {
        Row: {
          business_type: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          refreshed_at: string | null
          result_payload: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          refreshed_at?: string | null
          result_payload?: Json
          roadmap_key: string
          state_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string | null
          refreshed_at?: string | null
          result_payload?: Json
          roadmap_key?: string
          state_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          amenities: string[] | null
          category: string | null
          created_at: string
          frequency: string | null
          id: string
          instant_book_only: boolean | null
          last_notified_at: string | null
          latitude: number | null
          location_text: string | null
          longitude: number | null
          max_price: number | null
          min_price: number | null
          mode: string | null
          name: string | null
          radius_miles: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amenities?: string[] | null
          category?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          instant_book_only?: boolean | null
          last_notified_at?: string | null
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          max_price?: number | null
          min_price?: number | null
          mode?: string | null
          name?: string | null
          radius_miles?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amenities?: string[] | null
          category?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          instant_book_only?: boolean | null
          last_notified_at?: string | null
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          max_price?: number | null
          min_price?: number | null
          mode?: string | null
          name?: string | null
          radius_miles?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          caption: string | null
          channel: string
          content_type: string
          created_at: string
          entity_id: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          share_url: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          caption?: string | null
          channel: string
          content_type: string
          created_at?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          share_url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          caption?: string | null
          channel?: string
          content_type?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          share_url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      share_templates: {
        Row: {
          caption: string
          channel: string
          created_at: string
          cta_text: string | null
          generated_by_model: string | null
          hashtags: string[] | null
          id: string
          listing_id: string | null
          performance_score: number | null
          updated_at: string
          use_count: number
          variant: string
        }
        Insert: {
          caption: string
          channel: string
          created_at?: string
          cta_text?: string | null
          generated_by_model?: string | null
          hashtags?: string[] | null
          id?: string
          listing_id?: string | null
          performance_score?: number | null
          updated_at?: string
          use_count?: number
          variant?: string
        }
        Update: {
          caption?: string
          channel?: string
          created_at?: string
          cta_text?: string | null
          generated_by_model?: string | null
          hashtags?: string[] | null
          id?: string
          listing_id?: string | null
          performance_score?: number | null
          updated_at?: string
          use_count?: number
          variant?: string
        }
        Relationships: []
      }
      sms_inbound_messages: {
        Row: {
          action_taken: string | null
          body: string
          created_at: string
          from_phone: string
          id: string
          matched_user_id: string | null
          raw_payload: Json | null
          to_phone: string
          twilio_message_sid: string | null
        }
        Insert: {
          action_taken?: string | null
          body: string
          created_at?: string
          from_phone: string
          id?: string
          matched_user_id?: string | null
          raw_payload?: Json | null
          to_phone: string
          twilio_message_sid?: string | null
        }
        Update: {
          action_taken?: string | null
          body?: string
          created_at?: string
          from_phone?: string
          id?: string
          matched_user_id?: string | null
          raw_payload?: Json | null
          to_phone?: string
          twilio_message_sid?: string | null
        }
        Relationships: []
      }
      sms_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_body: string
          metadata: Json | null
          recipient_phone: string
          status: string
          template_name: string
          twilio_message_sid: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_body: string
          metadata?: Json | null
          recipient_phone: string
          status: string
          template_name: string
          twilio_message_sid?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_body?: string
          metadata?: Json | null
          recipient_phone?: string
          status?: string
          template_name?: string
          twilio_message_sid?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_subscriptions: {
        Row: {
          accepts_alerts: boolean
          accepts_marketing: boolean
          accepts_transactional: boolean
          created_at: string
          id: string
          opted_in: boolean
          opted_out_at: string | null
          phone_number: string
          updated_at: string
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          accepts_alerts?: boolean
          accepts_marketing?: boolean
          accepts_transactional?: boolean
          created_at?: string
          id?: string
          opted_in?: boolean
          opted_out_at?: string | null
          phone_number: string
          updated_at?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          accepts_alerts?: boolean
          accepts_marketing?: boolean
          accepts_transactional?: boolean
          created_at?: string
          id?: string
          opted_in?: boolean
          opted_out_at?: string | null
          phone_number?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      sms_verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_journey_state: {
        Row: {
          bookings_as_guest: number
          bookings_as_host: number
          created_at: string
          last_login_at: string | null
          last_touched_at: string
          listings_count: number
          published_count: number
          segment_tags: string[]
          signals: Json
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bookings_as_guest?: number
          bookings_as_host?: number
          created_at?: string
          last_login_at?: string | null
          last_touched_at?: string
          listings_count?: number
          published_count?: number
          segment_tags?: string[]
          signals?: Json
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bookings_as_guest?: number
          bookings_as_host?: number
          created_at?: string
          last_login_at?: string | null
          last_touched_at?: string
          listings_count?: number
          published_count?: number
          segment_tags?: string[]
          signals?: Json
          stage?: string
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
      voice_agent_leads: {
        Row: {
          budget: string | null
          category: string | null
          created_at: string
          dates: string | null
          id: string
          intent_type: string | null
          listing_mode: string | null
          location: string | null
          metadata: Json | null
          raw_transcript: string | null
          session_id: string | null
          summary: string
          user_id: string | null
        }
        Insert: {
          budget?: string | null
          category?: string | null
          created_at?: string
          dates?: string | null
          id?: string
          intent_type?: string | null
          listing_mode?: string | null
          location?: string | null
          metadata?: Json | null
          raw_transcript?: string | null
          session_id?: string | null
          summary: string
          user_id?: string | null
        }
        Update: {
          budget?: string | null
          category?: string | null
          created_at?: string
          dates?: string | null
          id?: string
          intent_type?: string | null
          listing_mode?: string | null
          location?: string | null
          metadata?: Json | null
          raw_transcript?: string | null
          session_id?: string | null
          summary?: string
          user_id?: string | null
        }
        Relationships: []
      }
      zendesk_ticket_comments: {
        Row: {
          author_email: string | null
          author_name: string | null
          author_role: string | null
          body: string
          created_at: string
          id: string
          is_public: boolean | null
          transaction_id: string | null
          zendesk_comment_id: string
          zendesk_created_at: string | null
          zendesk_ticket_id: string
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          author_role?: string | null
          body: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          transaction_id?: string | null
          zendesk_comment_id: string
          zendesk_created_at?: string | null
          zendesk_ticket_id: string
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          author_role?: string | null
          body?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          transaction_id?: string | null
          zendesk_comment_id?: string
          zendesk_created_at?: string | null
          zendesk_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zendesk_ticket_comments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "sale_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      asset_requests_public: {
        Row: {
          asset_type: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          is_public: boolean | null
          notes: string | null
          start_date: string | null
          state: string | null
          title: string | null
        }
        Insert: {
          asset_type?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          is_public?: boolean | null
          notes?: string | null
          start_date?: string | null
          state?: string | null
          title?: string | null
        }
        Update: {
          asset_type?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          is_public?: boolean | null
          notes?: string | null
          start_date?: string | null
          state?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_grant_complimentary_featured: {
        Args: { p_days?: number; p_listing_id: string }
        Returns: {
          accept_card_payment: boolean | null
          accept_cash_payment: boolean | null
          access_instructions: string | null
          address: string | null
          amenities: string[] | null
          available_from: string | null
          available_to: string | null
          buffer_time_mins: number | null
          category: Database["public"]["Enums"]["listing_category"]
          city: string | null
          cover_image_url: string | null
          created_at: string
          daily_enabled: boolean | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_radius_miles: number | null
          deposit_amount: number | null
          description: string
          featured_at: string | null
          featured_enabled: boolean | null
          featured_expires_at: string | null
          featured_source: string | null
          freight_category: string | null
          freight_payer: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token: string | null
          height_inches: number | null
          highlights: string[] | null
          host_id: string | null
          hourly_enabled: boolean | null
          hourly_schedule: Json | null
          hourly_special_pricing: Json | null
          hours_of_access: string | null
          id: string
          image_urls: string[] | null
          instant_book: boolean | null
          latitude: number | null
          length_inches: number | null
          location_notes: string | null
          longitude: number | null
          max_hours: number | null
          min_hours: number | null
          min_notice_hours: number | null
          mode: Database["public"]["Enums"]["listing_mode"]
          operating_hours_end: string | null
          operating_hours_start: string | null
          pending_featured_payment: Json | null
          pickup_instructions: string | null
          pickup_location_text: string | null
          postal_code: string | null
          price_daily: number | null
          price_hourly: number | null
          price_monthly: number | null
          price_sale: number | null
          price_weekly: number | null
          proof_notary_enabled: boolean | null
          published_at: string | null
          rental_buffer_days: number | null
          rental_min_days: number | null
          slot_names: string[] | null
          state: string | null
          status: Database["public"]["Enums"]["listing_status"]
          subcategory: string | null
          title: string
          total_slots: number | null
          updated_at: string
          vendibook_freight_enabled: boolean | null
          video_urls: string[] | null
          view_count: number | null
          weight_lbs: number | null
          width_inches: number | null
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_referral_config: {
        Args: {
          p_hold_days: number
          p_is_active: boolean
          p_min_transaction_value: number
          p_monthly_cap: number
          p_program_type: string
          p_reward_amount: number
        }
        Returns: {
          hold_days: number
          is_active: boolean
          min_transaction_value: number
          monthly_cap: number | null
          program_type: string
          reward_amount: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "referral_program_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_booking_end_timestamp: {
        Args: { p_end_date: string; p_hourly_slots: Json }
        Returns: string
      }
      check_booking_availability: {
        Args: {
          p_end_date: string
          p_exclude_booking_id?: string
          p_hourly_slots?: Json
          p_is_hourly_booking?: boolean
          p_listing_id: string
          p_slot_number?: number
          p_start_date: string
        }
        Returns: Json
      }
      count_purchase_referrals_this_month: {
        Args: { p_referrer_id: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_all_asset_requests: {
        Args: never
        Returns: {
          admin_notes: string | null
          asset_type: string
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          city: string
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          intent: string | null
          is_public: boolean
          listing_id: string | null
          matched_listing_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          source_page: string | null
          start_date: string | null
          state: string | null
          status: string | null
          timeline: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "asset_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_feedback_by_token: {
        Args: { _token: string }
        Returns: {
          context_id: string
          context_type: string
          created_at: string
          email: string
          id: string
          message: string
          metadata: Json
          nps: number
          rating: number
        }[]
      }
      get_host_avg_response_time: {
        Args: { host_user_id: string }
        Returns: string
      }
      get_host_verification_status: {
        Args: { host_ids: string[] }
        Returns: {
          id: string
          identity_verified: boolean
        }[]
      }
      get_listing_favorite_count: {
        Args: { listing_uuid: string }
        Returns: number
      }
      get_listing_reviews_safe: {
        Args: { p_listing_id: string }
        Returns: {
          booking_id: string
          created_at: string
          host_id: string
          id: string
          listing_id: string
          rating: number
          review_text: string
          reviewer_avatar_url: string
          reviewer_display_name: string
          updated_at: string
        }[]
      }
      get_safe_host_profile: {
        Args: { host_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          business_name: string
          created_at: string
          display_name: string
          first_name: string
          full_name: string
          header_image_url: string
          id: string
          identity_verified: boolean
          last_active_at: string
          last_name: string
          pinned_listing_id: string
          public_city: string
          public_state: string
          shop_policies: Json
          username: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_counter: {
        Args: { p_owner_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_fast_responder: { Args: { host_user_id: string }; Returns: boolean }
      list_payable_referrers: {
        Args: { p_min_payout?: number }
        Returns: {
          referral_ids: string[]
          referrer_id: string
          total_owed: number
        }[]
      }
      log_referral_status_change:
        | {
            Args: {
              p_new_status: string
              p_note?: string
              p_referral_id: string
              p_source?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action_type?: string
              p_idempotency_key?: string
              p_new_status: string
              p_note?: string
              p_referral_id: string
              p_source?: string
            }
            Returns: undefined
          }
      lookup_referral_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          get_amount: number
          give_amount: number
          owner_id: string
        }[]
      }
      merge_permit_item: {
        Args: {
          p_field_ts: Json
          p_item_key: string
          p_patch: Json
          p_roadmap_id: string
        }
        Returns: {
          archived: boolean
          archived_at: string | null
          archived_reason: string | null
          created_at: string
          expires_on: string | null
          field_updated_at: Json
          id: string
          issue_date: string | null
          issuing_agency: string | null
          item_key: string
          notes: string | null
          permit_number: string | null
          roadmap_id: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "permit_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_permit_roadmap: {
        Args: {
          p_new_item_keys: string[]
          p_new_payload: Json
          p_roadmap_id: string
        }
        Returns: {
          business_type: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          refreshed_at: string | null
          result_payload: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "saved_permit_roadmaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rename_permit_document: {
        Args: { p_document_id: string; p_file_name: string }
        Returns: {
          deleted_at: string | null
          file_name: string
          id: string
          item_key: string
          mime_type: string | null
          roadmap_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "permit_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rename_permit_roadmap: {
        Args: { p_label: string; p_roadmap_id: string }
        Returns: {
          business_type: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          refreshed_at: string | null
          result_payload: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "saved_permit_roadmaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_permit_document: {
        Args: { p_document_id: string }
        Returns: {
          deleted_at: string | null
          file_name: string
          id: string
          item_key: string
          mime_type: string | null
          roadmap_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "permit_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_permit_roadmap: {
        Args: { p_roadmap_id: string }
        Returns: {
          business_type: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          refreshed_at: string | null
          result_payload: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "saved_permit_roadmaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_permit_document: {
        Args: { p_document_id: string }
        Returns: {
          deleted_at: string | null
          file_name: string
          id: string
          item_key: string
          mime_type: string | null
          roadmap_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "permit_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      soft_delete_permit_roadmap: {
        Args: { p_roadmap_id: string }
        Returns: {
          business_type: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          id: string
          label: string | null
          refreshed_at: string | null
          result_payload: Json
          roadmap_key: string
          state_code: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "saved_permit_roadmaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_feedback_by_token: {
        Args: {
          _business_type: string
          _can_share: boolean
          _message: string
          _nps: number
          _rating: number
          _token: string
        }
        Returns: string
      }
      update_asset_request_status: {
        Args: {
          new_admin_notes?: string
          new_assigned_to?: string
          new_status: string
          request_id: string
        }
        Returns: {
          admin_notes: string | null
          asset_type: string
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          city: string
          created_at: string
          email: string | null
          end_date: string | null
          id: string
          intent: string | null
          is_public: boolean
          listing_id: string | null
          matched_listing_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          source_page: string | null
          start_date: string | null
          state: string | null
          status: string | null
          timeline: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "asset_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "host" | "shopper" | "admin"
      booking_status:
        | "pending"
        | "approved"
        | "declined"
        | "cancelled"
        | "completed"
      document_deadline_type:
        | "before_booking_request"
        | "before_approval"
        | "after_approval_deadline"
      document_status: "pending" | "approved" | "rejected"
      document_type:
        | "drivers_license"
        | "business_license"
        | "food_handler_certificate"
        | "safeserve_certification"
        | "health_department_permit"
        | "commercial_liability_insurance"
        | "vehicle_insurance"
        | "certificate_of_insurance"
        | "work_history_proof"
        | "prior_experience_proof"
      fulfillment_type: "pickup" | "delivery" | "both" | "on_site"
      listing_category:
        | "food_truck"
        | "food_trailer"
        | "ghost_kitchen"
        | "vendor_lot"
        | "vendor_space"
      listing_mode: "rent" | "sale"
      listing_status: "draft" | "published" | "paused" | "archived"
      marketing_event_type:
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "complained"
        | "unsubscribed"
        | "sent"
        | "deferred"
      marketing_feedback_rating: "helpful" | "okay" | "not_for_me"
      marketing_send_status:
        | "draft"
        | "test_sent"
        | "test_approved"
        | "sending"
        | "sent"
        | "failed"
        | "canceled"
        | "broadcast_failed"
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
      app_role: ["host", "shopper", "admin"],
      booking_status: [
        "pending",
        "approved",
        "declined",
        "cancelled",
        "completed",
      ],
      document_deadline_type: [
        "before_booking_request",
        "before_approval",
        "after_approval_deadline",
      ],
      document_status: ["pending", "approved", "rejected"],
      document_type: [
        "drivers_license",
        "business_license",
        "food_handler_certificate",
        "safeserve_certification",
        "health_department_permit",
        "commercial_liability_insurance",
        "vehicle_insurance",
        "certificate_of_insurance",
        "work_history_proof",
        "prior_experience_proof",
      ],
      fulfillment_type: ["pickup", "delivery", "both", "on_site"],
      listing_category: [
        "food_truck",
        "food_trailer",
        "ghost_kitchen",
        "vendor_lot",
        "vendor_space",
      ],
      listing_mode: ["rent", "sale"],
      listing_status: ["draft", "published", "paused", "archived"],
      marketing_event_type: [
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "unsubscribed",
        "sent",
        "deferred",
      ],
      marketing_feedback_rating: ["helpful", "okay", "not_for_me"],
      marketing_send_status: [
        "draft",
        "test_sent",
        "test_approved",
        "sending",
        "sent",
        "failed",
        "canceled",
        "broadcast_failed",
      ],
    },
  },
} as const
