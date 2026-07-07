-- Create sequence_versions table for workflow versioning
CREATE TABLE public.sequence_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for fast lookup by sequence_id
CREATE INDEX idx_sequence_versions_sequence_id ON public.sequence_versions (sequence_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.sequence_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequence_versions of their company"
  ON public.sequence_versions
  FOR SELECT TO authenticated
  USING (
    sequence_id IN (
      SELECT ms.id FROM public.message_sequences ms
      WHERE ms.company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create sequence_versions for their company"
  ON public.sequence_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    sequence_id IN (
      SELECT ms.id FROM public.message_sequences ms
      WHERE ms.company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete sequence_versions of their company"
  ON public.sequence_versions
  FOR DELETE TO authenticated
  USING (
    sequence_id IN (
      SELECT ms.id FROM public.message_sequences ms
      WHERE ms.company_id IN (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      )
    )
  );
