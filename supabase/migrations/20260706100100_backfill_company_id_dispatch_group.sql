-- =====================================================
-- Backfill company_id onto the legacy dispatch/group engine
-- tables (today user_id-only), using the exact dual-mode
-- transition pattern already proven on call_campaigns
-- (20260224131514_...sql): additive column + RLS that falls
-- back to user_id for rows that still have no company_id.
-- Nothing is deleted, nothing old stops working.
-- =====================================================

-- ---------- dispatch_campaigns ----------
ALTER TABLE public.dispatch_campaigns ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.dispatch_campaigns dc SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = dc.user_id ORDER BY cm.created_at ASC LIMIT 1
) WHERE dc.company_id IS NULL;

DROP POLICY IF EXISTS "Users can manage own dispatch_campaigns" ON public.dispatch_campaigns;

CREATE POLICY "Company members can select dispatch_campaigns" ON public.dispatch_campaigns FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert dispatch_campaigns" ON public.dispatch_campaigns FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update dispatch_campaigns" ON public.dispatch_campaigns FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete dispatch_campaigns" ON public.dispatch_campaigns FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- dispatch_sequences (inherits via dispatch_campaigns) ----------
ALTER TABLE public.dispatch_sequences ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.dispatch_sequences ds SET company_id = (
  SELECT dc.company_id FROM public.dispatch_campaigns dc WHERE dc.id = ds.campaign_id
) WHERE ds.company_id IS NULL;

DROP POLICY IF EXISTS "Users can manage own dispatch_sequences" ON public.dispatch_sequences;

CREATE POLICY "Company members can select dispatch_sequences" ON public.dispatch_sequences FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert dispatch_sequences" ON public.dispatch_sequences FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update dispatch_sequences" ON public.dispatch_sequences FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete dispatch_sequences" ON public.dispatch_sequences FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- dispatch_sequence_steps (inherits via dispatch_sequences) ----------
ALTER TABLE public.dispatch_sequence_steps ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.dispatch_sequence_steps dss SET company_id = (
  SELECT ds.company_id FROM public.dispatch_sequences ds WHERE ds.id = dss.sequence_id
) WHERE dss.company_id IS NULL;

DROP POLICY IF EXISTS "Users can manage own dispatch_sequence_steps" ON public.dispatch_sequence_steps;

CREATE POLICY "Company members can select dispatch_sequence_steps" ON public.dispatch_sequence_steps FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert dispatch_sequence_steps" ON public.dispatch_sequence_steps FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update dispatch_sequence_steps" ON public.dispatch_sequence_steps FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete dispatch_sequence_steps" ON public.dispatch_sequence_steps FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- dispatch_campaign_contacts (inherits via dispatch_campaigns) ----------
ALTER TABLE public.dispatch_campaign_contacts ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.dispatch_campaign_contacts dcc SET company_id = (
  SELECT dc.company_id FROM public.dispatch_campaigns dc WHERE dc.id = dcc.campaign_id
) WHERE dcc.company_id IS NULL;

DROP POLICY IF EXISTS "Users can manage own dispatch_campaign_contacts" ON public.dispatch_campaign_contacts;

CREATE POLICY "Company members can select dispatch_campaign_contacts" ON public.dispatch_campaign_contacts FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert dispatch_campaign_contacts" ON public.dispatch_campaign_contacts FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update dispatch_campaign_contacts" ON public.dispatch_campaign_contacts FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete dispatch_campaign_contacts" ON public.dispatch_campaign_contacts FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- group_campaigns ----------
ALTER TABLE public.group_campaigns ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.group_campaigns gc SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = gc.user_id ORDER BY cm.created_at ASC LIMIT 1
) WHERE gc.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can create own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can update own group_campaigns" ON public.group_campaigns;
DROP POLICY IF EXISTS "Users can delete own group_campaigns" ON public.group_campaigns;

CREATE POLICY "Company members can select group_campaigns" ON public.group_campaigns FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert group_campaigns" ON public.group_campaigns FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update group_campaigns" ON public.group_campaigns FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete group_campaigns" ON public.group_campaigns FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- message_sequences ----------
ALTER TABLE public.message_sequences ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.message_sequences ms SET company_id = (
  SELECT gc.company_id FROM public.group_campaigns gc WHERE gc.id = ms.group_campaign_id
) WHERE ms.company_id IS NULL;

UPDATE public.message_sequences ms SET company_id = (
  SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = ms.user_id ORDER BY cm.created_at ASC LIMIT 1
) WHERE ms.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view own message_sequences" ON public.message_sequences;
DROP POLICY IF EXISTS "Users can create own message_sequences" ON public.message_sequences;
DROP POLICY IF EXISTS "Users can update own message_sequences" ON public.message_sequences;
DROP POLICY IF EXISTS "Users can delete own message_sequences" ON public.message_sequences;

CREATE POLICY "Company members can select message_sequences" ON public.message_sequences FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert message_sequences" ON public.message_sequences FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update message_sequences" ON public.message_sequences FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete message_sequences" ON public.message_sequences FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- sequence_nodes (inherits via message_sequences) ----------
ALTER TABLE public.sequence_nodes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.sequence_nodes sn SET company_id = (
  SELECT ms.company_id FROM public.message_sequences ms WHERE ms.id = sn.sequence_id
) WHERE sn.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view own sequence_nodes" ON public.sequence_nodes;
DROP POLICY IF EXISTS "Users can create own sequence_nodes" ON public.sequence_nodes;
DROP POLICY IF EXISTS "Users can update own sequence_nodes" ON public.sequence_nodes;
DROP POLICY IF EXISTS "Users can delete own sequence_nodes" ON public.sequence_nodes;

CREATE POLICY "Company members can select sequence_nodes" ON public.sequence_nodes FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert sequence_nodes" ON public.sequence_nodes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update sequence_nodes" ON public.sequence_nodes FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete sequence_nodes" ON public.sequence_nodes FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- ---------- sequence_connections (inherits via message_sequences) ----------
ALTER TABLE public.sequence_connections ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

UPDATE public.sequence_connections sc SET company_id = (
  SELECT ms.company_id FROM public.message_sequences ms WHERE ms.id = sc.sequence_id
) WHERE sc.company_id IS NULL;

DROP POLICY IF EXISTS "Users can view own sequence_connections" ON public.sequence_connections;
DROP POLICY IF EXISTS "Users can create own sequence_connections" ON public.sequence_connections;
DROP POLICY IF EXISTS "Users can update own sequence_connections" ON public.sequence_connections;
DROP POLICY IF EXISTS "Users can delete own sequence_connections" ON public.sequence_connections;

CREATE POLICY "Company members can select sequence_connections" ON public.sequence_connections FOR SELECT TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert sequence_connections" ON public.sequence_connections FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (company_id IS NULL OR is_company_member(company_id, auth.uid()))
);
CREATE POLICY "Company members can update sequence_connections" ON public.sequence_connections FOR UPDATE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete sequence_connections" ON public.sequence_connections FOR DELETE TO authenticated USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
