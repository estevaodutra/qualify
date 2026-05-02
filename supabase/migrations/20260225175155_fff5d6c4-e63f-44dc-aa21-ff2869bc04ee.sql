
-- Backfill: copiar company_id da campanha para os leads que estão NULL
UPDATE call_leads cl
SET company_id = cc.company_id
FROM call_campaigns cc
WHERE cl.campaign_id = cc.id
  AND cl.company_id IS NULL
  AND cc.company_id IS NOT NULL;

-- Trigger function: auto-preencher company_id no insert se não fornecido
CREATE OR REPLACE FUNCTION public.set_call_lead_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.campaign_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM call_campaigns
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: executar antes de cada insert
CREATE TRIGGER trg_set_call_lead_company_id
  BEFORE INSERT ON public.call_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_call_lead_company_id();
