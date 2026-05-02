-- Create message_sequences table
CREATE TABLE public.message_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sequence_nodes table
CREATE TABLE public.sequence_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  node_type TEXT NOT NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  node_order INTEGER DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sequence_connections table
CREATE TABLE public.sequence_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_node_id UUID NOT NULL REFERENCES public.sequence_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.sequence_nodes(id) ON DELETE CASCADE,
  condition_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_sequences
CREATE POLICY "Users can view own message_sequences" ON public.message_sequences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own message_sequences" ON public.message_sequences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own message_sequences" ON public.message_sequences FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own message_sequences" ON public.message_sequences FOR DELETE USING (user_id = auth.uid());

-- RLS policies for sequence_nodes
CREATE POLICY "Users can view own sequence_nodes" ON public.sequence_nodes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sequence_nodes" ON public.sequence_nodes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sequence_nodes" ON public.sequence_nodes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sequence_nodes" ON public.sequence_nodes FOR DELETE USING (user_id = auth.uid());

-- RLS policies for sequence_connections
CREATE POLICY "Users can view own sequence_connections" ON public.sequence_connections FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own sequence_connections" ON public.sequence_connections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sequence_connections" ON public.sequence_connections FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sequence_connections" ON public.sequence_connections FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at on message_sequences
CREATE TRIGGER update_message_sequences_updated_at
  BEFORE UPDATE ON public.message_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();