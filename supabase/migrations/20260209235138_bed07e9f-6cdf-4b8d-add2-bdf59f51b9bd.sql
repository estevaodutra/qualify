ALTER TABLE public.call_logs
  ADD CONSTRAINT call_logs_operator_id_fkey
  FOREIGN KEY (operator_id)
  REFERENCES public.call_campaign_operators(id);