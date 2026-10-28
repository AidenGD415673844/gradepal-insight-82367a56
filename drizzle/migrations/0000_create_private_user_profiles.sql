CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 avatar_url text NOT NULL DEFAULT '',
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE FUNCTION public.create_signup_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles (id, display_name, avatar_url) VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 80), coalesce(NEW.raw_user_meta_data->>'avatar_url', '')) ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_signup_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_gradecalc_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_signup_profile();
INSERT INTO public.profiles (id, display_name, avatar_url) SELECT id, left(coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), 80), coalesce(raw_user_meta_data->>'avatar_url', '') FROM auth.users ON CONFLICT (id) DO NOTHING;