import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// 싱글톤 클라이언트 (지연 초기화)
let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// 새 클라이언트 생성 함수 (API 라우트용)
export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// 하위 호환성을 위한 export (빌드 타임에는 사용 불가)
export const supabase = {
  from: () => { throw new Error('Use createClient() instead') }
} as unknown as SupabaseClient

// Database Types (migration 스키마 기준)
export type Database = {
  public: {
    Tables: {
      auction_items: {
        Row: {
          id: string
          case_number: string
          court: string
          property_type: string
          address: string
          sido: string
          sigungu: string
          dong: string | null
          apartment_name: string | null
          dong_ho: string | null
          area_m2: number
          area_py: number
          appraisal_price: number
          minimum_price: number
          deposit: number | null
          fail_count: number
          auction_date: string | null
          discount_rate: number
          is_safe: boolean
          rights_analysis: string | null
          risk_items: string[] | null
          source_url: string | null
          image_urls: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['auction_items']['Row'],
          'id' | 'created_at' | 'updated_at' | 'area_py' | 'discount_rate'>
        Update: Partial<Database['public']['Tables']['auction_items']['Insert']>
      }
      real_prices: {
        Row: {
          id: string
          sido: string
          sigungu: string
          dong: string | null
          apartment_name: string
          deal_year: number
          deal_month: number
          deal_price: number
          area_m2: number
          floor: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['real_prices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['real_prices']['Insert']>
      }
      turnover_rates: {
        Row: {
          id: string
          auction_item_id: string
          turnover_rate: number
          avg_deal_price: number | null
          deal_count: number | null
          calculation_period: string | null
          calculated_at: string
        }
        Insert: Omit<Database['public']['Tables']['turnover_rates']['Row'], 'id' | 'calculated_at'>
        Update: Partial<Database['public']['Tables']['turnover_rates']['Insert']>
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          auction_item_id: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['favorites']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>
      }
      crawl_logs: {
        Row: {
          id: string
          crawl_type: string
          status: string
          items_count: number | null
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['crawl_logs']['Row'], 'id' | 'started_at'>
        Update: Partial<Database['public']['Tables']['crawl_logs']['Insert']>
      }
    }
    Views: {
      filtered_auction_items: {
        Row: Database['public']['Tables']['auction_items']['Row'] & {
          turnover_rate: number | null
          avg_deal_price: number | null
          deal_count: number | null
          required_investment: number
        }
      }
    }
  }
}

// 편의 타입
export type AuctionItem = Database['public']['Tables']['auction_items']['Row']
export type FilteredAuctionItem = Database['public']['Views']['filtered_auction_items']['Row']
export type RealPrice = Database['public']['Tables']['real_prices']['Row']
export type TurnoverRate = Database['public']['Tables']['turnover_rates']['Row']
export type Favorite = Database['public']['Tables']['favorites']['Row']
