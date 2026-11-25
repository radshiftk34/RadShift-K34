import { createClient } from '@supabase/supabase-js';

// Safe environment variable loading without breaking if unconfigured
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
// Normalize URL by removing /rest/v1 trailing paths or trailing slashes if accidentally pasted from Supabase settings
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'L1_VIEWER' | 'L2_HP' | 'L2_BANGAN' | 'L3_ADMIN';

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
