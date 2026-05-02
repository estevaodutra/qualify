import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  role: string;
}

interface CompanyContextType {
  companies: Company[];
  activeCompanyId: string | null;
  activeCompany: Company | null;
  setActiveCompany: (id: string) => void;
  isLoading: boolean;
  isAdmin: boolean;
  refetch: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = "dispatch_active_company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    try {
      // Get all company memberships for the user
      const { data: memberships, error: memError } = await (supabase as any)
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (memError) throw memError;
      if (!memberships || memberships.length === 0) {
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      const companyIds = memberships.map((m: any) => m.company_id);
      const roleMap = new Map(memberships.map((m: any) => [m.company_id, m.role]));

      const { data: companyRows, error: compError } = await (supabase as any)
        .from("companies")
        .select("id, name, owner_id")
        .in("id", companyIds);

      if (compError) throw compError;

      const mapped: Company[] = (companyRows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        ownerId: c.owner_id,
        role: roleMap.get(c.id) || "operator",
      }));

      setCompanies(mapped);

      // Auto-select if current active is not in the list
      if (mapped.length > 0) {
        const current = activeCompanyId;
        if (!current || !mapped.find((c) => c.id === current)) {
          const first = mapped[0].id;
          setActiveCompanyId(first);
          localStorage.setItem(STORAGE_KEY, first);
        }
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCompanyId]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const setActiveCompany = (id: string) => {
    setActiveCompanyId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || null;
  const isAdmin = activeCompany?.role === "admin";

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompanyId,
        activeCompany,
        setActiveCompany,
        isLoading,
        isAdmin,
        refetch: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
