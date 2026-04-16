
-- Fix user_roles: Drop dangerous ALL policy and create proper ones
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix profiles: restrict to own profile + admins (for CRM, we need name visibility for assigned leads, so keep select broad but via a view would be better. For now restrict.)
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile or admins read all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
