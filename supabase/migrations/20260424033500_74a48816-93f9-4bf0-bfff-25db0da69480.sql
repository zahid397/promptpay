
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  circle_wallet_id TEXT NOT NULL,
  balance_usdc NUMERIC(18,6) DEFAULT 10.000000,
  total_spent_usdc NUMERIC(18,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users(api_key);

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  prompt_preview TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_usdc_paid NUMERIC(18,6) DEFAULT 0,
  settlement_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  settlement_number INTEGER NOT NULL,
  tokens INTEGER NOT NULL,
  usdc_amount NUMERIC(18,6) NOT NULL,
  circle_transfer_id TEXT DEFAULT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','complete','failed')),
  gas_cost_arc NUMERIC(18,10) DEFAULT 0.0000000010,
  gas_cost_eth_l1 NUMERIC(18,6) DEFAULT 2.000000,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_session_id ON public.transactions(session_id);

CREATE OR REPLACE VIEW public.global_stats AS
SELECT
  COUNT(*)::bigint as total_transactions,
  COALESCE(SUM(usdc_amount), 0) as total_usdc_settled,
  COALESCE(SUM(tokens), 0)::bigint as total_tokens_processed,
  COUNT(DISTINCT user_id)::bigint as total_users,
  COUNT(DISTINCT session_id)::bigint as total_sessions,
  COALESCE(MAX(settlement_number), 0)::bigint as highest_settlement_number
FROM public.transactions;

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
