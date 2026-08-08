-- Trigger para limpar credenciais externas e telefone ao desconectar a instância
CREATE OR REPLACE FUNCTION public.handle_instance_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'disconnected' THEN
    NEW.external_instance_id := NULL;
    NEW.external_instance_token := NULL;
    NEW.phone := '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_instance_status_change ON public.instances;

CREATE TRIGGER trg_instance_status_change
  BEFORE INSERT OR UPDATE ON public.instances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_instance_status_change();
