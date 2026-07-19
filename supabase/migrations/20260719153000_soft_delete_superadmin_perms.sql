-- 1. Alter profiles table to support soft delete
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Alter companies table to support soft delete
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admin_audit_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_audit_logs' AND policyname = 'Superadmin can view all admin_audit_logs'
    ) THEN
        CREATE POLICY "Superadmin can view all admin_audit_logs"
        ON public.admin_audit_logs FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_audit_logs' AND policyname = 'Superadmin can insert admin_audit_logs'
    ) THEN
        CREATE POLICY "Superadmin can insert admin_audit_logs"
        ON public.admin_audit_logs FOR INSERT TO authenticated
        WITH CHECK (public.is_superadmin(auth.uid()));
    END IF;
END $$;

-- 4. Update SELECT policies for profiles and companies to respect is_deleted
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND (is_deleted IS NOT TRUE));

DROP POLICY IF EXISTS "Members can view their companies" ON public.companies;
CREATE POLICY "Members can view their companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = companies.id
          AND cm.user_id = auth.uid()
          AND cm.is_active = true
      )
      AND (companies.is_deleted IS NOT TRUE)
    )
    OR public.is_superadmin(auth.uid())
  );

-- 5. Secure RPC for soft deleting users
CREATE OR REPLACE FUNCTION public.admin_soft_delete_user(
  target_user_id UUID,
  actor_user_id UUID,
  actor_email TEXT,
  confirmation_email TEXT,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email TEXT;
  superadmin_count INT;
BEGIN
  -- Validate caller is superadmin or service role
  IF NOT (public.is_superadmin(auth.uid()) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Apenas superadmins podem excluir usuários e empresas.';
  END IF;

  -- Get target user's email
  SELECT email INTO target_email FROM public.profiles WHERE id = target_user_id AND (is_deleted IS NOT TRUE);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Validate confirmation
  IF lower(target_email) != lower(confirmation_email) THEN
    RAISE EXCEPTION 'Confirmação incorreta. O e-mail digitado não corresponde ao e-mail do usuário.';
  END IF;

  -- Prevent self deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir seu próprio usuário.';
  END IF;

  -- Prevent deleting the last superadmin
  IF public.is_superadmin(target_user_id) THEN
    SELECT COUNT(*) INTO superadmin_count
    FROM public.user_roles r
    JOIN public.profiles p ON r.user_id = p.id
    WHERE r.role = 'superadmin'::app_role
      AND p.is_deleted IS NOT TRUE;
      
    IF superadmin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível excluir o último superadmin da plataforma.';
    END IF;
  END IF;

  -- Perform soft delete on profiles
  UPDATE public.profiles
  SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = actor_user_id,
    updated_at = now()
  WHERE id = target_user_id;

  -- Deactivate memberships
  UPDATE public.company_members
  SET is_active = false
  WHERE user_id = target_user_id;

  -- Remove role permissions
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id;

  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    target_type,
    target_id,
    target_label,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    actor_user_id,
    actor_email,
    'admin.user_deleted',
    'user',
    target_user_id,
    target_email,
    jsonb_build_object('deleted_at', now(), 'deleted_by', actor_user_id),
    ip_address,
    user_agent
  );
END;
$$;

-- 6. Secure RPC for soft deleting companies
CREATE OR REPLACE FUNCTION public.admin_soft_delete_company(
  target_company_id UUID,
  actor_user_id UUID,
  actor_email TEXT,
  confirmation_name TEXT,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  comp_name TEXT;
BEGIN
  -- Validate caller is superadmin or service role
  IF NOT (public.is_superadmin(auth.uid()) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Apenas superadmins podem excluir usuários e empresas.';
  END IF;

  -- Get target company's name
  SELECT name INTO comp_name FROM public.companies WHERE id = target_company_id AND (is_deleted IS NOT TRUE);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada.';
  END IF;

  -- Validate confirmation
  IF trim(lower(comp_name)) != trim(lower(confirmation_name)) THEN
    RAISE EXCEPTION 'Confirmação incorreta. O nome digitado não corresponde ao nome da empresa.';
  END IF;

  -- Perform soft delete on companies
  UPDATE public.companies
  SET 
    is_deleted = true,
    status = 'deleted',
    deleted_at = now(),
    deleted_by = actor_user_id,
    updated_at = now()
  WHERE id = target_company_id;

  -- Deactivate memberships
  UPDATE public.company_members
  SET is_active = false
  WHERE company_id = target_company_id;

  -- Disconnect active instances
  UPDATE public.instances
  SET status = 'disconnected'
  WHERE company_id = target_company_id;

  -- Pause active workflows
  UPDATE public.workflow_definitions
  SET status = 'paused'
  WHERE company_id = target_company_id;

  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    target_type,
    target_id,
    target_label,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    actor_user_id,
    actor_email,
    'admin.company_deleted',
    'company',
    target_company_id,
    comp_name,
    jsonb_build_object('deleted_at', now(), 'deleted_by', actor_user_id),
    ip_address,
    user_agent
  );
END;
$$;
