
-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Link users (api-key/wallet) table to auth
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- 3. Enable RLS on the existing tables (service role bypasses these)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- users: each auth user can read & manage their own wallet rows
DROP POLICY IF EXISTS "users select own" ON public.users;
CREATE POLICY "users select own"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "users update own" ON public.users;
CREATE POLICY "users update own"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_user_id);

-- sessions: visible to the auth user that owns the wallet
DROP POLICY IF EXISTS "sessions select own" ON public.sessions;
CREATE POLICY "sessions select own"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = sessions.user_id AND u.auth_user_id = auth.uid()
    )
  );

-- transactions: visible to owner + readable publicly for the global feed/leaderboard
DROP POLICY IF EXISTS "transactions public read" ON public.transactions;
CREATE POLICY "transactions public read"
  ON public.transactions FOR SELECT
  USING (true);

-- 4. Leaderboard view: top spenders
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.user_id        AS auth_user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(SUM(t.usdc_amount), 0)::numeric(18,6) AS total_usdc_spent,
  COALESCE(SUM(t.tokens), 0)::bigint             AS total_tokens,
  COUNT(t.id)::bigint                            AS total_settlements
FROM public.profiles p
LEFT JOIN public.users u  ON u.auth_user_id = p.user_id
LEFT JOIN public.transactions t ON t.user_id = u.id
GROUP BY p.user_id, p.display_name, p.avatar_url
ORDER BY total_usdc_spent DESC NULLS LAST
LIMIT 10;
