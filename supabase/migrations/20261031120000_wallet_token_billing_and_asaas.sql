-- ============================================================
-- Migration: Wallet Token Billing & Asaas Gateway Integration
-- Date: 2026-10-31
-- ============================================================

-- 1. Manual debit RPC (superadmin only)
CREATE OR REPLACE FUNCTION public.wallet_debit_manual(
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

  v_tx_id := public.wallet_debit(
    p_company_id,
    p_amount,
    'adjustment',
    COALESCE(p_description, 'Débito manual: ' || p_reason),
    'admin_adjustment',
    NULL,
    jsonb_build_object('reason', p_reason, 'admin_id', v_admin, 'direction', 'debit')
  );

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, 'wallet_debit_manual', 'company', p_company_id,
    jsonb_build_object('amount', p_amount, 'reason', p_reason, 'description', p_description, 'tx_id', v_tx_id));

  RETURN v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_debit_manual(uuid, numeric, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.wallet_debit_manual(uuid, numeric, text, text) TO authenticated;

-- 2. Platform settings defaults for AI token billing and Asaas
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('ai_token_pricing', jsonb_build_object(
    'usd_to_brl_rate', 6.00,
    'markup_multiplier', 2.0,
    'min_charge_brl', 0.01,
    'billing_enabled', true,
    'models', jsonb_build_object(
      'gpt-4o-mini', jsonb_build_object('input_cost_per_m_usd', 0.15, 'output_cost_per_m_usd', 0.60),
      'gpt-4o', jsonb_build_object('input_cost_per_m_usd', 2.50, 'output_cost_per_m_usd', 10.00),
      'default', jsonb_build_object('input_cost_per_m_usd', 0.15, 'output_cost_per_m_usd', 0.60)
    )
  ), 'Configurações de precificação e tarifação de tokens de IA debitados na carteira'),
  ('asaas_config', jsonb_build_object(
    'environment', 'sandbox',
    'api_key', '',
    'webhook_token', '',
    'enabled', false,
    'pix_expiration_minutes', 60
  ), 'Configurações de integração com o gateway de pagamentos Asaas')
ON CONFLICT (key) DO NOTHING;
