
ALTER VIEW public.global_stats  SET (security_invoker = on);
ALTER VIEW public.leaderboard   SET (security_invoker = on);

-- Allow anonymous reads of leaderboard so the homepage can show it pre-login
GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT SELECT ON public.global_stats TO anon, authenticated;
