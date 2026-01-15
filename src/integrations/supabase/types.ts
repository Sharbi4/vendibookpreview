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
          end_date: string
          fulfillment_selected: string | null
          host_id: string
          host_response: string | null
          id: string
          listing_id: string
          message: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          responded_at: string | null
          shopper_id: string
          start_date: string
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
          end_date: string
          fulfillment_selected?: string | null
          host_id: string
          host_response?: string | null
          id?: string
          listing_id: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          responded_at?: string | null
          shopper_id: string
          start_date: string
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
          end_date?: string
          fulfillment_selected?: string | null
          host_id?: string
          host_response?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          responded_at?: string | null
          shopper_id?: string
          start_date?: string
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
          conversation_id: string
          created_at: string
          id: string
          message: string
          pii_blocked: boolean | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          pii_blocked?: boolean | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
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
      listings: {
        Row: {
          access_instructions: string | null
          address: string | null
          amenities: string[] | null
          available_from: string | null
          available_to: string | null
          category: Database["public"]["Enums"]["listing_category"]
          cover_image_url: string | null
          created_at: string
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_radius_miles: number | null
          description: string
          freight_category: string | null
          freight_payer: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          height_inches: number | null
          highlights: string[] | null
          host_id: string
          hours_of_access: string | null
          id: string
          image_urls: string[] | null
          latitude: number | null
          length_inches: number | null
          location_notes: string | null
          longitude: number | null
          mode: Database["public"]["Enums"]["listing_mode"]
          pickup_instructions: string | null
          pickup_location_text: string | null
          price_daily: number | null
          price_sale: number | null
          price_weekly: number | null
          published_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          vendibook_freight_enabled: boolean | null
          weight_lbs: number | null
          width_inches: number | null
        }
        Insert: {
          access_instructions?: string | null
          address?: string | null
          amenities?: string[] | null
          available_from?: string | null
          available_to?: string | null
          category: Database["public"]["Enums"]["listing_category"]
          cover_image_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          description: string
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          height_inches?: number | null
          highlights?: string[] | null
          host_id: string
          hours_of_access?: string | null
          id?: string
          image_urls?: string[] | null
          latitude?: number | null
          length_inches?: number | null
          location_notes?: string | null
          longitude?: number | null
          mode: Database["public"]["Enums"]["listing_mode"]
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          price_daily?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          vendibook_freight_enabled?: boolean | null
          weight_lbs?: number | null
          width_inches?: number | null
        }
        Update: {
          access_instructions?: string | null
          address?: string | null
          amenities?: string[] | null
          available_from?: string | null
          available_to?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          cover_image_url?: string | null
          created_at?: string
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_radius_miles?: number | null
          description?: string
          freight_category?: string | null
          freight_payer?: string | null
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          height_inches?: number | null
          highlights?: string[] | null
          host_id?: string
          hours_of_access?: string | null
          id?: string
          image_urls?: string[] | null
          latitude?: number | null
          length_inches?: number | null
          location_notes?: string | null
          longitude?: number | null
          mode?: Database["public"]["Enums"]["listing_mode"]
          pickup_instructions?: string | null
          pickup_location_text?: string | null
          price_daily?: number | null
          price_sale?: number | null
          price_weekly?: number | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          vendibook_freight_enabled?: boolean | null
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
          sale_email: boolean
          sale_inapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
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
          sale_email?: boolean
          sale_inapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
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
      profiles: {
        Row: {
          address1: string | null
          address2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          identity_verified: boolean | null
          identity_verified_at: string | null
          phone_number: string | null
          state: string | null
          stripe_account_id: string | null
          stripe_identity_session_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_onboarding_started_at: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          phone_number?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_identity_session_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_onboarding_started_at?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          identity_verified?: boolean | null
          identity_verified_at?: string | null
          phone_number?: string | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_identity_session_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_onboarding_started_at?: string | null
          updated_at?: string
          zip_code?: string | null
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
      sale_transactions: {
        Row: {
          amount: number
          buyer_confirmed_at: string | null
          buyer_email: string | null
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          checkout_session_id: string | null
          created_at: string
          delivery_address: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          freight_cost: number | null
          fulfillment_type: string | null
          id: string
          listing_id: string
          message: string | null
          payment_intent_id: string | null
          payout_completed_at: string | null
          platform_fee: number
          seller_confirmed_at: string | null
          seller_id: string
          seller_payout: number
          status: string
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
          checkout_session_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          freight_cost?: number | null
          fulfillment_type?: string | null
          id?: string
          listing_id: string
          message?: string | null
          payment_intent_id?: string | null
          payout_completed_at?: string | null
          platform_fee: number
          seller_confirmed_at?: string | null
          seller_id: string
          seller_payout: number
          status?: string
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
          checkout_session_id?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          freight_cost?: number | null
          fulfillment_type?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          payment_intent_id?: string | null
          payout_completed_at?: string | null
          platform_fee?: number
          seller_confirmed_at?: string | null
          seller_id?: string
          seller_payout?: number
          status?: string
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_safe_host_profile: {
        Args: { host_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          identity_verified: boolean
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
