ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sessions' AND policyname = 'sessions insert own'
  ) THEN
    CREATE POLICY "sessions insert own"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = sessions.user_id
          AND u.auth_user_id = auth.uid()
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sessions' AND policyname = 'sessions update own'
  ) THEN
    CREATE POLICY "sessions update own"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = sessions.user_id
          AND u.auth_user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = sessions.user_id
          AND u.auth_user_id = auth.uid()
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END
$$;