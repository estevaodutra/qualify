
-- 1. Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Create company_members table
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);

-- 3. Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- 4. RLS for companies
CREATE POLICY "Members can view their companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = companies.id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY "Owner can update company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 5. RLS for company_members
CREATE POLICY "Members can view same company members"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Admins can insert members"
  ON public.company_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));

CREATE POLICY "Admins can update members"
  ON public.company_members FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

CREATE POLICY "Admins can delete members"
  ON public.company_members FOR DELETE
  TO authenticated
  USING (public.is_company_admin(company_id, auth.uid()));

-- 6. Add company_id to call_operators
ALTER TABLE public.call_operators ADD COLUMN company_id UUID REFERENCES public.companies(id);

CREATE INDEX idx_call_operators_company ON public.call_operators(company_id);

-- 7. Update call_operators RLS: drop old, create new
DROP POLICY IF EXISTS "Users can manage own call_operators" ON public.call_operators;

CREATE POLICY "Members can view company operators"
  ON public.call_operators FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid())
    OR company_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "Admins can insert company operators"
  ON public.call_operators FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IS NOT NULL AND public.is_company_admin(company_id, auth.uid())
    OR company_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "Admins can update company operators"
  ON public.call_operators FOR UPDATE
  TO authenticated
  USING (
    company_id IS NOT NULL AND public.is_company_admin(company_id, auth.uid())
    OR company_id IS NULL AND user_id = auth.uid()
  );

CREATE POLICY "Admins can delete company operators"
  ON public.call_operators FOR DELETE
  TO authenticated
  USING (
    company_id IS NOT NULL AND public.is_company_admin(company_id, auth.uid())
    OR company_id IS NULL AND user_id = auth.uid()
  );

-- 8. Update handle_new_user to also create a company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_name TEXT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Create a default company for the new user
  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.companies (name, owner_id)
  VALUES (v_name, NEW.id)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$function$;

-- 9. Migrate existing users: create companies for existing profiles that don't have one
DO $$
DECLARE
  r RECORD;
  v_company_id UUID;
BEGIN
  FOR r IN
    SELECT p.id, COALESCE(NULLIF(p.full_name, ''), p.email) AS name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_members cm WHERE cm.user_id = p.id
    )
  LOOP
    INSERT INTO public.companies (name, owner_id)
    VALUES (r.name, r.id)
    RETURNING id INTO v_company_id;

    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (v_company_id, r.id, 'admin');

    -- Migrate existing call_operators for this user
    UPDATE public.call_operators
    SET company_id = v_company_id
    WHERE user_id = r.id AND company_id IS NULL;
  END LOOP;
END;
$$;
