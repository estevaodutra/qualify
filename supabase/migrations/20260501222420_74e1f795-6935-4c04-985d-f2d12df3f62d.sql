REVOKE EXECUTE ON FUNCTION public.wallet_reserve(UUID, NUMERIC, TEXT, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_cancel_reservation(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_finalize_reservation(UUID, NUMERIC, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_debit(UUID, NUMERIC, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_company_create_wallet() FROM anon, authenticated;