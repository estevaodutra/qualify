CREATE OR REPLACE FUNCTION public.handle_new_company_create_operator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(NULLIF(p.full_name, ''), split_part(u.email, '@', 1), 'Operador')
    INTO v_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
   WHERE u.id = NEW.owner_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.call_operators
     WHERE user_id = NEW.owner_id AND company_id = NEW.id
  ) THEN
    INSERT INTO public.call_operators (user_id, company_id, operator_name, is_active, status)
    VALUES (NEW.owner_id, NEW.id, COALESCE(v_name, 'Operador'), true, 'available');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_create_owner_operator ON public.companies;
CREATE TRIGGER trg_companies_create_owner_operator
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_company_create_operator();

INSERT INTO public.call_operators (user_id, company_id, operator_name, is_active, status)
SELECT
  c.owner_id,
  c.id,
  COALESCE(NULLIF(p.full_name, ''), split_part(u.email, '@', 1), 'Operador'),
  true,
  'available'
FROM public.companies c
LEFT JOIN auth.users u ON u.id = c.owner_id
LEFT JOIN public.profiles p ON p.id = c.owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.call_operators co
   WHERE co.user_id = c.owner_id AND co.company_id = c.id
);