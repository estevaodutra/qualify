-- ============================================
-- Computed Columns for Leads Metrics
-- ============================================

-- Active Deals Count
CREATE OR REPLACE FUNCTION public.active_deals_count(l public.leads)
RETURNS integer AS $$
  SELECT count(*)::integer 
  FROM public.deals 
  WHERE lead_id = l.id AND status = 'open';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Total Open Value
CREATE OR REPLACE FUNCTION public.total_open_value(l public.leads)
RETURNS numeric AS $$
  SELECT COALESCE(sum(value), 0)::numeric
  FROM public.deals 
  WHERE lead_id = l.id AND status = 'open';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Total Won Value
CREATE OR REPLACE FUNCTION public.total_won_value(l public.leads)
RETURNS numeric AS $$
  SELECT COALESCE(sum(value), 0)::numeric
  FROM public.deals 
  WHERE lead_id = l.id AND status = 'won';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Closed Deals Count (Won)
CREATE OR REPLACE FUNCTION public.won_deals_count(l public.leads)
RETURNS integer AS $$
  SELECT count(*)::integer 
  FROM public.deals 
  WHERE lead_id = l.id AND status = 'won';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Average Ticket
CREATE OR REPLACE FUNCTION public.avg_ticket(l public.leads)
RETURNS numeric AS $$
  SELECT COALESCE(avg(value), 0)::numeric
  FROM public.deals 
  WHERE lead_id = l.id AND status = 'won';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Pending Activities Count
CREATE OR REPLACE FUNCTION public.pending_activities_count(l public.leads)
RETURNS integer AS $$
  SELECT count(*)::integer 
  FROM public.activities 
  WHERE lead_id = l.id AND completed_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
