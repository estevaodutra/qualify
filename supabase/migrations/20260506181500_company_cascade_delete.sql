-- 1. Allow superadmins to delete companies
CREATE POLICY "Superadmin can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- 2. Add ON DELETE CASCADE to tables that missed it
-- Wallets
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_company_id_fkey;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Wallet Transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_company_id_fkey;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Wallet Reservations
ALTER TABLE public.wallet_reservations DROP CONSTRAINT IF EXISTS wallet_reservations_company_id_fkey;
ALTER TABLE public.wallet_reservations ADD CONSTRAINT wallet_reservations_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Wallet Payments
ALTER TABLE public.wallet_payments DROP CONSTRAINT IF EXISTS wallet_payments_company_id_fkey;
ALTER TABLE public.wallet_payments ADD CONSTRAINT wallet_payments_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Wallet Alerts
ALTER TABLE public.wallet_alerts DROP CONSTRAINT IF EXISTS wallet_alerts_company_id_fkey;
ALTER TABLE public.wallet_alerts ADD CONSTRAINT wallet_alerts_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Call Operators
ALTER TABLE public.call_operators DROP CONSTRAINT IF EXISTS call_operators_company_id_fkey;
ALTER TABLE public.call_operators ADD CONSTRAINT call_operators_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Call Campaigns
ALTER TABLE public.call_campaigns DROP CONSTRAINT IF EXISTS call_campaigns_company_id_fkey;
ALTER TABLE public.call_campaigns ADD CONSTRAINT call_campaigns_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Call Leads
ALTER TABLE public.call_leads DROP CONSTRAINT IF EXISTS call_leads_company_id_fkey;
ALTER TABLE public.call_leads ADD CONSTRAINT call_leads_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Call Logs
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_company_id_fkey;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Call Queue
ALTER TABLE public.call_queue DROP CONSTRAINT IF EXISTS call_queue_company_id_fkey;
ALTER TABLE public.call_queue ADD CONSTRAINT call_queue_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
