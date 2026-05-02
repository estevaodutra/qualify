
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles (users can only see their own roles)
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id column to all existing tables
ALTER TABLE public.instances ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.api_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.dispatch_logs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.api_keys ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.provider_events ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing public policies for instances
DROP POLICY IF EXISTS "Allow public read of instances" ON public.instances;
DROP POLICY IF EXISTS "Allow public insert of instances" ON public.instances;
DROP POLICY IF EXISTS "Allow public update of instances" ON public.instances;
DROP POLICY IF EXISTS "Allow public delete of instances" ON public.instances;

-- Create user-scoped policies for instances
CREATE POLICY "Users can view own instances"
  ON public.instances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own instances"
  ON public.instances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own instances"
  ON public.instances FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own instances"
  ON public.instances FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Drop existing public policies for campaigns
DROP POLICY IF EXISTS "Allow public read of campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public insert of campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public update of campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow public delete of campaigns" ON public.campaigns;

-- Create user-scoped policies for campaigns
CREATE POLICY "Users can view own campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Drop existing public policies for alerts
DROP POLICY IF EXISTS "Allow public read of alerts" ON public.alerts;
DROP POLICY IF EXISTS "Allow public insert of alerts" ON public.alerts;
DROP POLICY IF EXISTS "Allow public update of alerts" ON public.alerts;
DROP POLICY IF EXISTS "Allow public delete of alerts" ON public.alerts;

-- Create user-scoped policies for alerts
CREATE POLICY "Users can view own alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts"
  ON public.alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Drop existing public policies for api_logs
DROP POLICY IF EXISTS "Allow public read of api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Allow public insert of api_logs" ON public.api_logs;

-- Create user-scoped policies for api_logs
CREATE POLICY "Users can view own api_logs"
  ON public.api_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own api_logs"
  ON public.api_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop existing public policies for dispatch_logs
DROP POLICY IF EXISTS "Allow public read of dispatch_logs" ON public.dispatch_logs;
DROP POLICY IF EXISTS "Allow public insert of dispatch_logs" ON public.dispatch_logs;

-- Create user-scoped policies for dispatch_logs
CREATE POLICY "Users can view own dispatch_logs"
  ON public.dispatch_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own dispatch_logs"
  ON public.dispatch_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop existing public policies for api_keys
DROP POLICY IF EXISTS "Allow public read of api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow public insert of api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow public update of api_keys" ON public.api_keys;

-- Create user-scoped policies for api_keys
CREATE POLICY "Users can view own api_keys"
  ON public.api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own api_keys"
  ON public.api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Drop existing public policies for provider_events
DROP POLICY IF EXISTS "Allow public read of provider events" ON public.provider_events;
DROP POLICY IF EXISTS "Allow public insert of provider events" ON public.provider_events;
DROP POLICY IF EXISTS "Allow public delete of provider events" ON public.provider_events;

-- Create user-scoped policies for provider_events
CREATE POLICY "Users can view own provider_events"
  ON public.provider_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own provider_events"
  ON public.provider_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own provider_events"
  ON public.provider_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
