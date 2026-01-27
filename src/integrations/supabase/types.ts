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
          notes: string | null
          phone: string | null
          start_date: string | null
          state: string | null
          status: string | null
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
          notes?: string | null
          phone?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
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
          notes?: string | null
          phone?: string | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      availability_alerts: {
        Row: {
          category: string | null
          created_at: string
          email: string
          id: string
          mode: string | null
          notified_at: string | null
          radius_miles: number | null
          unsubscribed_at: string | null
          zip_code: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          email: string
          id?: string
          mode?: string | null
          notified_at?: string | null
          radius_miles?: number | null
          unsubscribed_at?: string | null
          zip_code: string
        }
        Update: {
          category?: string | null
          created_at?: string
          email?: string
          id?: string
          mode?: string | null
          notified_at?: string | null
          radius_miles?: number | null
          unsubscribed_at?: string | null
          zip_code?: string
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
          id: string
          is_hourly_booking: boolean | null
          is_instant_book: boolean | null
          listing_id: string
          message: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          payout_processed: boolean | null
          payout_processed_at: string | null
          payout_transfer_id: string | null
          responded_at: string | null
          shopper_confirmed_at: string | null
          shopper_id: string
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          access_instructions_snapshot?: string | null
          address_snapshot?: string | null
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
          id?: string
          is_hourly_booking?: boolean | null
          is_instant_book?: boolean | null
          listing_id: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_processed?: boolean | null
          payout_processed_at?: string | null
          payout_transfer_id?: string | null
          responded_at?: string | null
          shopper_confirmed_at?: string | null
          shopper_id: string
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          access_instructions_snapshot?: string | null
          address_snapshot?: string | null
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
          id?: string
          is_hourly_booking?: boolean | null
          is_instant_book?: boolean | null
          listing_id?: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_processed?: boolean | null
          payout_processed_at?: string | null
          payout_transfer_id?: string | null
          responded_at?: string | null
          shopper_confirmed_at?: string | null
          shopper_id?: string
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
          cover_image_url: string | null
          created_at: string
          daily_enabled: boolean | null
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_radius_miles: number | null
          deposit_amount: number | null
          description: string
          freight_category: string | null
          freight_payer: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token: string | null
          height_inches: number | null
          highlights: string[] | null
          host_id: string | null
          hourly_enabled: boolean | null
          hourly_schedule: Json | null
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
          pickup_instructions: string | null
          pickup_location_text: string | null
          price_daily: number | null
          price_hourly: number | null
          price_sale: number | null
          price_weekly: number | null
          proof_notary_enabled: boolean | null
          published_at: string | null
          rental_buffer_days: number | null
          rental_min_days: number | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
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
          cover_image_url?: string | null
          created_at?: string
          daily_enabled?: boolean | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          deposit_amount?: number | null
          description: string
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token?: string | null
          height_inches?: number | null
          highlights?: string[] | null
          host_id?: string | null
          hourly_enabled?: boolean | null
          hourly_schedule?: Json | null
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
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          price_daily?: number | null
          price_hourly?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          proof_notary_enabled?: boolean | null
          published_at?: string | null
          rental_buffer_days?: number | null
          rental_min_days?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
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
          cover_image_url?: string | null
          created_at?: string
          daily_enabled?: boolean | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          deposit_amount?: number | null
          description?: string
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          guest_draft_token?: string | null
          height_inches?: number | null
          highlights?: string[] | null
          host_id?: string | null
          hourly_enabled?: boolean | null
          hourly_schedule?: Json | null
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
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          price_daily?: number | null
          price_hourly?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          proof_notary_enabled?: boolean | null
          published_at?: string | null
          rental_buffer_days?: number | null
          rental_min_days?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          vendibook_freight_enabled?: boolean | null
          video_urls?: string[] | null
          view_count?: number | null
          weight_lbs?: number | null
          width_inches?: number | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          address1: string | null
          address2: string | null
          avatar_url: string | null
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
          public_city: string | null
          public_state: string | null
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
          public_city?: string | null
          public_state?: string | null
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
          public_city?: string | null
          public_state?: string | null
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
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
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
          notes: string | null
          phone: string | null
          start_date: string | null
          state: string | null
          status: string | null
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
      get_host_avg_response_time: {
        Args: { host_user_id: string }
        Returns: unknown
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
          public_city: string
          public_state: string
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
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_fast_responder: { Args: { host_user_id: string }; Returns: boolean }
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
          notes: string | null
          phone: string | null
          start_date: string | null
          state: string | null
          status: string | null
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
      listing_mode: "rent" | "sale"
      listing_status: "draft" | "published" | "paused"
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
      ],
      listing_mode: ["rent", "sale"],
      listing_status: ["draft", "published", "paused"],
    },
  },
} as const
