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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          id: string
          name: string
          neighborhood: string | null
          number: string | null
          phone: string
          restaurant_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          id?: string
          name: string
          neighborhood?: string | null
          number?: string | null
          phone: string
          restaurant_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          id?: string
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string
          restaurant_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_drivers: {
        Row: {
          created_at: string
          id: string
          license_plate: string | null
          name: string
          phone: string | null
          restaurant_id: string
          status: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          license_plate?: string | null
          name: string
          phone?: string | null
          restaurant_id: string
          status?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          license_plate?: string | null
          name?: string
          phone?: string | null
          restaurant_id?: string
          status?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_fees: {
        Row: {
          city: string | null
          created_at: string
          estimated_time: string | null
          fee: number
          id: string
          is_active: boolean | null
          min_order_value: number | null
          neighborhood: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          estimated_time?: string | null
          fee?: number
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          neighborhood: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          estimated_time?: string | null
          fee?: number
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          neighborhood?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          product_size: string | null
          quantity: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          product_size?: string | null
          quantity?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          product_size?: string | null
          quantity?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_received: number | null
          change_given: number | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_phone: string | null
          driver_id: string | null
          id: string
          notes: string | null
          order_number: number | null
          order_type: string | null
          payment_method: string | null
          print_count: number | null
          print_status: string | null
          printed_at: string | null
          ready_at: string | null
          restaurant_id: string
          split_mode: string | null
          split_people: number | null
          status: string | null
          tab_id: string | null
          table_id: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          cash_received?: number | null
          change_given?: number | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_phone?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number | null
          order_type?: string | null
          payment_method?: string | null
          print_count?: number | null
          print_status?: string | null
          printed_at?: string | null
          ready_at?: string | null
          restaurant_id: string
          split_mode?: string | null
          split_people?: number | null
          status?: string | null
          tab_id?: string | null
          table_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          cash_received?: number | null
          change_given?: number | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_phone?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number | null
          order_type?: string | null
          payment_method?: string | null
          print_count?: number | null
          print_status?: string | null
          printed_at?: string | null
          ready_at?: string | null
          restaurant_id?: string
          split_mode?: string | null
          split_people?: number | null
          status?: string | null
          tab_id?: string | null
          table_id?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      print_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          items_count: number | null
          order_id: string | null
          order_number: string | null
          printer_name: string | null
          restaurant_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          items_count?: number | null
          order_id?: string | null
          order_number?: string | null
          printer_name?: string | null
          restaurant_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          items_count?: number | null
          order_id?: string | null
          order_number?: string | null
          printer_name?: string | null
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          linked_order_types: string[] | null
          model: string | null
          name: string
          paper_width: number | null
          printer_name: string | null
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          linked_order_types?: string[] | null
          model?: string | null
          name: string
          paper_width?: number | null
          printer_name?: string | null
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          linked_order_types?: string[] | null
          model?: string | null
          name?: string
          paper_width?: number | null
          printer_name?: string | null
          restaurant_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          has_sizes: boolean | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          price_large: number | null
          price_medium: number | null
          price_small: number | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number
          price_large?: number | null
          price_medium?: number | null
          price_small?: number | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          price_large?: number | null
          price_medium?: number | null
          price_small?: number | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      salon_areas: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      salon_settings: {
        Row: {
          auto_print_counter: boolean | null
          auto_print_delivery: boolean | null
          auto_print_table: boolean | null
          counter_prep_max: number | null
          counter_prep_min: number | null
          created_at: string
          daily_order_counter: number | null
          delivery_prep_max: number | null
          delivery_prep_min: number | null
          has_dining_room: boolean | null
          has_waiters: boolean | null
          id: string
          is_open: boolean | null
          last_opened_at: string | null
          operation_type: string | null
          order_tab_count: number | null
          restaurant_id: string
          service_counter: boolean | null
          service_individual: boolean | null
          service_self: boolean | null
          service_table: boolean | null
          table_count: number | null
          updated_at: string
        }
        Insert: {
          auto_print_counter?: boolean | null
          auto_print_delivery?: boolean | null
          auto_print_table?: boolean | null
          counter_prep_max?: number | null
          counter_prep_min?: number | null
          created_at?: string
          daily_order_counter?: number | null
          delivery_prep_max?: number | null
          delivery_prep_min?: number | null
          has_dining_room?: boolean | null
          has_waiters?: boolean | null
          id?: string
          is_open?: boolean | null
          last_opened_at?: string | null
          operation_type?: string | null
          order_tab_count?: number | null
          restaurant_id: string
          service_counter?: boolean | null
          service_individual?: boolean | null
          service_self?: boolean | null
          service_table?: boolean | null
          table_count?: number | null
          updated_at?: string
        }
        Update: {
          auto_print_counter?: boolean | null
          auto_print_delivery?: boolean | null
          auto_print_table?: boolean | null
          counter_prep_max?: number | null
          counter_prep_min?: number | null
          created_at?: string
          daily_order_counter?: number | null
          delivery_prep_max?: number | null
          delivery_prep_min?: number | null
          has_dining_room?: boolean | null
          has_waiters?: boolean | null
          id?: string
          is_open?: boolean | null
          last_opened_at?: string | null
          operation_type?: string | null
          order_tab_count?: number | null
          restaurant_id?: string
          service_counter?: boolean | null
          service_individual?: boolean | null
          service_self?: boolean | null
          service_table?: boolean | null
          table_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          number: number
          restaurant_id: string
          sort_order: number | null
          status: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          number: number
          restaurant_id: string
          sort_order?: number | null
          status?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          number?: number
          restaurant_id?: string
          sort_order?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tabs: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          number: number
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          number: number
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          number?: number
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      waiter_calls: {
        Row: {
          attended_at: string | null
          attended_by: string | null
          created_at: string
          id: string
          reason: string | null
          restaurant_id: string
          status: string
          table_id: string | null
          table_number: number
        }
        Insert: {
          attended_at?: string | null
          attended_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id: string
          status?: string
          table_id?: string | null
          table_number: number
        }
        Update: {
          attended_at?: string | null
          attended_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          restaurant_id?: string
          status?: string
          table_id?: string | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_attended_by_fkey"
            columns: ["attended_by"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          restaurant_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          restaurant_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          restaurant_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_restaurant_with_profile: {
        Args: {
          _cnpj: string
          _full_name: string
          _restaurant_name: string
          _restaurant_slug: string
          _user_id: string
        }
        Returns: string
      }
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "waiter" | "cashier"
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
      app_role: ["admin", "manager", "waiter", "cashier"],
    },
  },
} as const
