-- ============================================================
-- WALLETS
-- ============================================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reserved_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  low_balance_alert NUMERIC(12,2) DEFAULT 50.00,
  alert_email_enabled BOOLEAN DEFAULT true,
  alert_in_app_enabled BOOLEAN DEFAULT true,
  daily_limit NUMERIC(12,2),
  daily_limit_action TEXT DEFAULT 'block', -- 'block' | 'alert'
  daily_spent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  daily_spent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallets_balance_nonneg CHECK (balance >= 0),
  CONSTRAINT wallets_reserved_nonneg CHECK (reserved_balance >= 0)
);

CREATE INDEX idx_wallets_company ON public.wallets(company_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company wallet"
  ON public.wallets FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Admins can update wallet config"
  ON public.wallets FOR UPDATE TO authenticated
  USING (is_company_admin(company_id, auth.uid()));

-- INSERT only via trigger (no policy = blocked for direct user writes)

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WALLET TRANSACTIONS (immutable ledger)
-- ============================================================
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  type TEXT NOT NULL, -- deposit | consumption | adjustment | refund
  category TEXT, -- pix | call | ura | manual | support
  amount NUMERIC(12,2) NOT NULL, -- + credit / - debit
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_type TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_company ON public.wallet_transactions(company_id, created_at DESC);
CREATE INDEX idx_wallet_tx_type ON public.wallet_transactions(type);
CREATE INDEX idx_wallet_tx_reference ON public.wallet_transactions(reference_type, reference_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

-- INSERT/UPDATE only via SECURITY DEFINER functions (no user policies)

-- ============================================================
-- WALLET RESERVATIONS
-- ============================================================
CREATE TABLE public.wallet_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL, -- call | ura
  reference_type TEXT,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'active', -- active | finalized | cancelled
  finalized_amount NUMERIC(12,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

CREATE INDEX idx_wallet_reservations_company ON public.wallet_reservations(company_id);
CREATE INDEX idx_wallet_reservations_status ON public.wallet_reservations(status);
CREATE INDEX idx_wallet_reservations_ref ON public.wallet_reservations(reference_type, reference_id);

ALTER TABLE public.wallet_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company reservations"
  ON public.wallet_reservations FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

-- ============================================================
-- WALLET PAYMENTS (PIX)
-- ============================================================
CREATE TABLE public.wallet_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  mp_payment_id TEXT,
  mp_qr_code TEXT,
  mp_qr_code_base64 TEXT,
  mp_ticket_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | expired | failed
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_payments_company ON public.wallet_payments(company_id, created_at DESC);
CREATE INDEX idx_wallet_payments_status ON public.wallet_payments(status);
CREATE INDEX idx_wallet_payments_mp ON public.wallet_payments(mp_payment_id);

ALTER TABLE public.wallet_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company payments"
  ON public.wallet_payments FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can create company payments"
  ON public.wallet_payments FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE TRIGGER trg_wallet_payments_updated_at
  BEFORE UPDATE ON public.wallet_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WALLET ALERTS (dedupe storage for low-balance notifications)
-- ============================================================
CREATE TABLE public.wallet_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL,
  company_id UUID NOT NULL,
  kind TEXT NOT NULL, -- low_balance | daily_limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_alerts_wallet_kind ON public.wallet_alerts(wallet_id, kind, created_at DESC);
ALTER TABLE public.wallet_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view wallet alerts"
  ON public.wallet_alerts FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

-- ============================================================
-- TRIGGER: auto-create wallet on new company
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_company_create_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_create_wallet
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_create_wallet();

-- Backfill wallets for existing companies
INSERT INTO public.wallets (company_id)
SELECT c.id FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.company_id = c.id);

-- ============================================================
-- ATOMIC FINANCIAL FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Reserve balance (returns reservation_id or raises INSUFFICIENT_BALANCE)
CREATE OR REPLACE FUNCTION public.wallet_reserve(
  p_company_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_available NUMERIC;
  v_reservation_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT id, balance, reserved_balance INTO v_wallet
  FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create wallet if missing (defensive)
    INSERT INTO public.wallets (company_id) VALUES (p_company_id)
    ON CONFLICT (company_id) DO NOTHING;
    SELECT id, balance, reserved_balance INTO v_wallet
    FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;
  END IF;

  v_available := v_wallet.balance - v_wallet.reserved_balance;

  IF v_available < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001',
      DETAIL = json_build_object('available', v_available, 'required', p_amount)::text;
  END IF;

  INSERT INTO public.wallet_reservations (
    company_id, wallet_id, amount, category, reference_type, reference_id, status
  ) VALUES (
    p_company_id, v_wallet.id, p_amount, p_category, p_reference_type, p_reference_id, 'active'
  ) RETURNING id INTO v_reservation_id;

  UPDATE public.wallets
  SET reserved_balance = reserved_balance + p_amount,
      updated_at = now()
  WHERE id = v_wallet.id;

  RETURN v_reservation_id;
END;
$$;

-- Cancel reservation (no debit)
CREATE OR REPLACE FUNCTION public.wallet_cancel_reservation(p_reservation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res FROM public.wallet_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.status <> 'active' THEN RETURN; END IF;

  UPDATE public.wallets
  SET reserved_balance = GREATEST(0, reserved_balance - v_res.amount),
      updated_at = now()
  WHERE id = v_res.wallet_id;

  UPDATE public.wallet_reservations
  SET status = 'cancelled', finalized_at = now(), finalized_amount = 0
  WHERE id = p_reservation_id;
END;
$$;

-- Finalize reservation: debit actual amount, release reservation, create transaction
CREATE OR REPLACE FUNCTION public.wallet_finalize_reservation(
  p_reservation_id UUID,
  p_actual_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_res RECORD;
  v_wallet RECORD;
  v_charge NUMERIC;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
BEGIN
  SELECT * INTO v_res FROM public.wallet_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND OR v_res.status <> 'active' THEN RETURN; END IF;

  v_charge := GREATEST(0, COALESCE(p_actual_amount, 0));

  SELECT * INTO v_wallet FROM public.wallets WHERE id = v_res.wallet_id FOR UPDATE;
  v_balance_before := v_wallet.balance;
  v_balance_after := GREATEST(0, v_balance_before - v_charge);

  UPDATE public.wallets
  SET balance = v_balance_after,
      reserved_balance = GREATEST(0, reserved_balance - v_res.amount),
      daily_spent = CASE
        WHEN daily_spent_date = CURRENT_DATE THEN daily_spent + v_charge
        ELSE v_charge
      END,
      daily_spent_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_wallet.id;

  UPDATE public.wallet_reservations
  SET status = 'finalized', finalized_at = now(), finalized_amount = v_charge
  WHERE id = p_reservation_id;

  IF v_charge > 0 THEN
    INSERT INTO public.wallet_transactions (
      company_id, wallet_id, type, category, amount,
      balance_before, balance_after, description, metadata,
      reference_type, reference_id, status
    ) VALUES (
      v_res.company_id, v_res.wallet_id, 'consumption', v_res.category, -v_charge,
      v_balance_before, v_balance_after,
      COALESCE(p_description, v_res.category || ' consumption'),
      p_metadata,
      v_res.reference_type, v_res.reference_id, 'completed'
    );
  END IF;
END;
$$;

-- Direct debit (for URA)
CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_company_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_tx_id UUID;
  v_daily_spent_today NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (company_id) VALUES (p_company_id) ON CONFLICT (company_id) DO NOTHING;
    SELECT * INTO v_wallet FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;
  END IF;

  IF (v_wallet.balance - v_wallet.reserved_balance) < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_daily_spent_today := CASE WHEN v_wallet.daily_spent_date = CURRENT_DATE THEN v_wallet.daily_spent ELSE 0 END;

  IF v_wallet.daily_limit IS NOT NULL
     AND v_wallet.daily_limit_action = 'block'
     AND (v_daily_spent_today + p_amount) > v_wallet.daily_limit THEN
    RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED';
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_balance_before - p_amount;

  UPDATE public.wallets
  SET balance = v_balance_after,
      daily_spent = v_daily_spent_today + p_amount,
      daily_spent_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    company_id, wallet_id, type, category, amount,
    balance_before, balance_after, description, metadata,
    reference_type, reference_id, status
  ) VALUES (
    p_company_id, v_wallet.id, 'consumption', p_category, -p_amount,
    v_balance_before, v_balance_after,
    COALESCE(p_description, p_category || ' consumption'), p_metadata,
    p_reference_type, p_reference_id, 'completed'
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Credit (deposits, refunds, manual adjustments)
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_company_id UUID,
  p_amount NUMERIC,
  p_type TEXT, -- deposit | refund | adjustment
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (company_id) VALUES (p_company_id) ON CONFLICT (company_id) DO NOTHING;
    SELECT * INTO v_wallet FROM public.wallets WHERE company_id = p_company_id FOR UPDATE;
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_balance_before + p_amount;

  UPDATE public.wallets
  SET balance = v_balance_after, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    company_id, wallet_id, type, category, amount,
    balance_before, balance_after, description, metadata,
    reference_type, reference_id, status
  ) VALUES (
    p_company_id, v_wallet.id, p_type, p_category, p_amount,
    v_balance_before, v_balance_after,
    COALESCE(p_description, p_type), p_metadata,
    p_reference_type, p_reference_id, 'completed'
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Enable realtime for wallets so frontend updates instantly when PIX confirmed
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_payments;