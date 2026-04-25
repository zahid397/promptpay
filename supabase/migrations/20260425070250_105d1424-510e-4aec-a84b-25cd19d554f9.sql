CREATE TABLE public.random_challenges (
  payment_id TEXT PRIMARY KEY,
  amount NUMERIC NOT NULL,
  recipient TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
ALTER TABLE public.random_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_random_challenges_expires ON public.random_challenges(expires_at);