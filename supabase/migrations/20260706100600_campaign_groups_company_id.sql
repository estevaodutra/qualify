-- =====================================================
-- campaign_groups was missed by 20260706100100_backfill_company_id_dispatch_group.sql
-- (which fixed group_campaigns/message_sequences/sequence_nodes/
-- sequence_connections). Bring it up to the same dual-mode pattern:
-- additive company_id column + backfill + RLS that falls back to
-- user_id for legacy rows. Nothing is deleted, nothing old stops
-- working.
-- =====================================================

ALTER TABLE public.campaign_groups ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.campaign_groups cg SET company_id = (
  SELECT gc.company_id FROM public.group_campaigns gc WHERE gc.id = cg.campaign_id
) WHERE cg.company_id IS NULL;

UPDATE public.campaign_groups cg SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = cg.user_id ORDER BY cm.joined_at ASC LIMIT 1
) WHERE cg.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view own campaign_groups" ON public.campaign_groups;
DROP POLICY IF EXISTS "Users can create own campaign_groups" ON public.campaign_groups;
DROP POLICY IF EXISTS "Users can delete own campaign_groups" ON public.campaign_groups;

CREATE POLICY "Company members can select campaign_groups" ON public.campaign_groups FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert campaign_groups" ON public.campaign_groups FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company admins can delete campaign_groups" ON public.campaign_groups FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
-- Note: campaign_groups never had an UPDATE policy or mutation either — none is added here.

CREATE INDEX IF NOT EXISTS idx_campaign_groups_company ON public.campaign_groups(company_id);
