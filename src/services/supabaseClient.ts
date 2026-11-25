import { createClient } from '@supabase/supabase-js';

// Safe environment variable loading without breaking if unconfigured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'L1_VIEWER' | 'L2_HP' | 'L3_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  aliasCode: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  slotNo?: number;
  telegramUserId?: number;
}
