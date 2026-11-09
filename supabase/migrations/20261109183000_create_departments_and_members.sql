-- =====================================================
-- MIGRATION: Departamentos & Suporte a Nó de Notificações
-- =====================================================

-- 1. Tabela de departamentos (por empresa)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8A3CFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Membros de cada departamento
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department_id, user_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_department_members_dept_user ON public.department_members(department_id, user_id);
CREATE INDEX IF NOT EXISTS idx_department_members_user ON public.department_members(user_id);

-- RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- Políticas para departments
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view departments of their company" ON public.departments;
  CREATE POLICY "Users can view departments of their company"
    ON public.departments FOR SELECT
    USING (
      company_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = departments.company_id
          AND cm.user_id = auth.uid()
          AND cm.is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    );

  DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
  CREATE POLICY "Admins can manage departments"
    ON public.departments FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = departments.company_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'admin'
          AND cm.is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    );

  DROP POLICY IF EXISTS "Users can view department members" ON public.department_members;
  CREATE POLICY "Users can view department members"
    ON public.department_members FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.departments d
        JOIN public.company_members cm ON cm.company_id = d.company_id
        WHERE d.id = department_members.department_id
          AND cm.user_id = auth.uid()
          AND cm.is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    );

  DROP POLICY IF EXISTS "Admins can manage department members" ON public.department_members;
  CREATE POLICY "Admins can manage department members"
    ON public.department_members FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.departments d
        JOIN public.company_members cm ON cm.company_id = d.company_id
        WHERE d.id = department_members.department_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'admin'
          AND cm.is_active = true
      ) OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
      )
    );
END $$;
