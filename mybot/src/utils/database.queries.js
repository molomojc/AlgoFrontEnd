import { supabase } from '../lib/supabase'

// SQL to run in Supabase SQL editor
export const databaseSetupSQL = `
-- Add missing columns to trade_requests
ALTER TABLE public.trade_requests 
ADD COLUMN IF NOT EXISTS time_to_place INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES public.bots(id);

-- Create bot_commands table if not exists
CREATE TABLE IF NOT EXISTS public.bot_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id),
  command text NOT NULL CHECK (command = ANY (ARRAY['start'::text, 'stop'::text])),
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'executed'::text, 'failed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  executed_at timestamp with time zone,
  CONSTRAINT bot_commands_pkey PRIMARY KEY (id)
);

-- Create bot_status table for monitoring
CREATE TABLE IF NOT EXISTS public.bot_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id),
  status text NOT NULL,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_trade_id uuid REFERENCES public.trade_requests(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT bot_status_pkey PRIMARY KEY (id)
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  default_lot_size DECIMAL(10,2) DEFAULT 0.01,
  default_num_trades INTEGER DEFAULT 1,
  default_time_to_place INTEGER DEFAULT 60,
  risk_percentage DECIMAL(5,2) DEFAULT 2.0,
  notification_email BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own trade requests" 
  ON public.trade_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade requests" 
  ON public.trade_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade requests" 
  ON public.trade_requests FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own user settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user settings" 
  ON public.user_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, first_name, last_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'first_name', 
          new.raw_user_meta_data->>'last_name');
  
  INSERT INTO public.user_settings (user_id, default_lot_size, default_num_trades)
  VALUES (new.id, 0.01, 1);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

// Database query functions
export const db = {
  // User Profiles
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // User Settings
  async getUserSettings(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateUserSettings(userId, updates) {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Trade Requests
  async getTradeRequests(userId) {
    const { data, error } = await supabase
      .from('trade_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async createTradeRequest(userId, tradeData) {
    const { data, error } = await supabase
      .from('trade_requests')
      .insert([{ ...tradeData, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateTradeRequest(tradeId, updates) {
    const { data, error } = await supabase
      .from('trade_requests')
      .update(updates)
      .eq('id', tradeId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteTradeRequest(tradeId) {
    const { error } = await supabase
      .from('trade_requests')
      .delete()
      .eq('id', tradeId)
    if (error) throw error
    return true
  },

  // Bot Status
  async getBotStatus(userId) {
    const { data, error } = await supabase
      .from('bots')
      .select(`
        *,
        bot_status(*)
      `)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data
  },

  async updateBotStatus(botId, status) {
    const { data, error } = await supabase
      .from('bots')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', botId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async sendBotCommand(botId, command, payload = {}) {
    const { data, error } = await supabase
      .from('bot_commands')
      .insert([{
        bot_id: botId,
        command,
        payload,
        status: 'pending'
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // News Events
  async getTodaysNews() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('news_events')
      .select('*')
      .eq('event_date', today)
      .order('event_time')
    if (error) throw error
    return data
  },

  async getAllNews() {
    const { data, error } = await supabase
      .from('news_events')
      .select('*')
      .order('event_date', { ascending: false })
      .order('event_time')
    if (error) throw error
    return data
  },

  async createNewsEvent(newsData) {
    const { data, error } = await supabase
      .from('news_events')
      .insert([newsData])
      .select()
      .single()
    if (error) throw error
    return data
  }
}