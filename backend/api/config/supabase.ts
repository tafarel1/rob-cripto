import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou Anon Key não configurados. Usando modo offline.');
}

// Cliente para uso geral (com RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para operações administrativas (sem RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Estrutura do banco de dados
export const databaseSchema = {
  tables: {
    users: 'users',
    strategies: 'strategies',
    trades: 'trades',
    market_data: 'market_data',
    signals: 'signals',
    backtests: 'backtests',
    exchange_configs: 'exchange_configs',
    notifications: 'notifications',
    logs: 'logs'
  }
};

// Tipos do banco de dados
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          settings: Record<string, unknown>;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          symbol: string;
          timeframe: string;
          enabled: boolean;
          config: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['strategies']['Insert']>;
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          symbol: string;
          type: 'LONG' | 'SHORT';
          entry_price: number;
          exit_price?: number;
          quantity: number;
          stop_loss: number;
          take_profit: number[];
          realized_pnl?: number;
          fees: number;
          status: 'OPEN' | 'CLOSED' | 'CANCELLED';
          open_time: string;
          close_time?: string;
          exchange: string;
          exchange_order_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trades']['Insert']>;
      };
      signals: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          symbol: string;
          type: 'BUY' | 'SELL';
          entry_price: number;
          stop_loss: number;
          take_profit: number[];
          confidence: number;
          reason: string;
          timeframe: string;
          status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'EXPIRED';
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['signals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['signals']['Insert']>;
      };
      backtests: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string;
          start_date: string;
          end_date: string;
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          win_rate: number;
          total_return: number;
          max_drawdown: number;
          sharpe_ratio: number;
          profit_factor: number;
          average_win: number;
          average_loss: number;
          largest_win: number;
          largest_loss: number;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['backtests']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['backtests']['Insert']>;
      };
      market_data: {
        Row: {
          id: string;
          symbol: string;
          timeframe: string;
          timestamp: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          exchange: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['market_data']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['market_data']['Insert']>;
      };
      exchange_configs: {
        Row: {
          id: string;
          user_id: string;
          exchange_name: string;
          api_key_encrypted: string;
          api_secret_encrypted: string;
          testnet: boolean;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exchange_configs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['exchange_configs']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'TELEGRAM' | 'EMAIL' | 'WEBHOOK';
          config: Record<string, unknown>;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      logs: {
        Row: {
          id: string;
          user_id?: string;
          level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
          message: string;
          metadata?: Record<string, unknown>;
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['logs']['Insert']>;
      };
    };
  };
}
