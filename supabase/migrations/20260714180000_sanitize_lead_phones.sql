-- Criação da função para limpar a formatação do telefone
CREATE OR REPLACE FUNCTION public.sanitize_lead_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Mantém apenas números na coluna phone
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '\D', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criação do trigger na tabela leads
DROP TRIGGER IF EXISTS tr_sanitize_lead_phone ON public.leads;
CREATE TRIGGER tr_sanitize_lead_phone
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_lead_phone();

-- Sanitizar todos os leads existentes que possuem formatação
UPDATE public.leads 
SET phone = regexp_replace(phone, '\D', '', 'g') 
WHERE phone ~ '\D';
