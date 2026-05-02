-- ============================================================
-- 1. is_superadmin helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'superadmin'::app_role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon;

-- ============================================================
-- 2. admin_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON public.admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin can select admin_logs" ON public.admin_logs
  FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin can insert admin_logs" ON public.admin_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));

-- ============================================================
-- 3. platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read platform_settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can write platform_settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('min_recharge_amount', '250'::jsonb, 'Valor mínimo de recarga em R$'),
  ('recharge_presets', '[250,500,1000,2000]'::jsonb, 'Valores pré-definidos de recarga'),
  ('low_balance_alert', '50'::jsonb, 'Valor padrão para alerta de saldo baixo'),
  ('maintenance_mode', 'false'::jsonb, 'Modo manutenção ativo'),
  ('maintenance_message', '""'::jsonb, 'Mensagem exibida durante manutenção')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. pricing_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  action_type text NOT NULL CHECK (action_type IN ('call','ura')),
  unit text NOT NULL,
  price numeric(10,4) NOT NULL CHECK (price >= 0),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_lookup
  ON public.pricing_rules(action_type, company_id, valid_from DESC);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pricing_rules" ON public.pricing_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmin can write pricing_rules" ON public.pricing_rules
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Preços globais padrão
INSERT INTO public.pricing_rules (company_id, action_type, unit, price)
VALUES
  (NULL, 'call', 'minute', 0.40),
  (NULL, 'ura', '30s', 0.15);

-- ============================================================
-- 5. companies.is_active
-- ============================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================
-- 6. Superadmin cross-tenant SELECT policies
-- ============================================================
CREATE POLICY "Superadmin can view all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update all companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all wallet_transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all wallet_payments"
  ON public.wallet_payments FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all company_members"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert company_members"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete company_members"
  ON public.company_members FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert user_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete user_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- ============================================================
-- 7. Manual credit RPC (superadmin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_credit_manual(
  p_company_id uuid,
  p_amount numeric,
  p_reason text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_superadmin(v_admin) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  v_tx_id := public.wallet_credit(
    p_company_id,
    p_amount,
    'adjustment',
    'manual',
    COALESCE(p_description, 'Ajuste manual: ' || p_reason),
    'admin_adjustment',
    NULL,
    jsonb_build_object('reason', p_reason, 'admin_id', v_admin)
  );

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, 'wallet_credit_manual', 'company', p_company_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'description', p_description, 'tx_id', v_tx_id));

  RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_credit_manual(uuid, numeric, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.wallet_credit_manual(uuid, numeric, text, text) TO authenticated;