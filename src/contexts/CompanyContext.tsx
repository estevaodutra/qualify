import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperadmin } from "@/hooks/useSuperadmin";

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
  impersonateCompany: (id: string | null) => void;
  isImpersonating: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = "dispatch_active_company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isSuperadmin } = useSuperadmin();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(
    () => localStorage.getItem("dispatch_impersonated_company")
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    try {
      let companyRows: any[] = [];
      let roleMap = new Map<string, string>();

      if (isSuperadmin) {
        // Superadmin fetches ALL companies
        const { data: allCompanies, error: compError } = await (supabase as any)
          .from("companies")
          .select("id, name, owner_id")
          .order("name");

        if (compError) throw compError;
        companyRows = allCompanies || [];

        // Also fetch their own memberships to know their roles in specific companies
        const { data: memberships } = await (supabase as any)
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .eq("is_active", true);

        roleMap = new Map((memberships || []).map((m: any) => [m.company_id, m.role]));
      } else {
        // Regular user fetches only memberships
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
        roleMap = new Map(memberships.map((m: any) => [m.company_id, m.role]));

        const { data, error: compError } = await (supabase as any)
          .from("companies")
          .select("id, name, owner_id")
          .in("id", companyIds);

        if (compError) throw compError;
        companyRows = data || [];
      }

      const mapped: Company[] = companyRows.map((c: any) => ({
        id: c.id,
        name: c.name,
        ownerId: c.owner_id,
        role: roleMap.get(c.id) || (isSuperadmin ? "admin" : "operator"),
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
  }, [user, activeCompanyId, isSuperadmin, impersonatedCompanyId]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const setActiveCompany = (id: string) => {
    if (isSuperadmin) {
      // For superadmin, switching through the dropdown also triggers impersonation
      impersonateCompany(id);
    } else {
      setActiveCompanyId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const impersonateCompany = (id: string | null) => {
    if (!isSuperadmin && id !== null) return;
    setImpersonatedCompanyId(id);
    if (id) {
      localStorage.setItem("dispatch_impersonated_company", id);
    } else {
      localStorage.removeItem("dispatch_impersonated_company");
    }
  };

  const effectiveCompanyId = (isSuperadmin && impersonatedCompanyId) || activeCompanyId;
  const activeCompany = companies.find((c) => c.id === effectiveCompanyId) || null;
  const isAdmin = activeCompany?.role === "admin" || isSuperadmin;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompanyId: effectiveCompanyId,
        activeCompany,
        setActiveCompany,
        isLoading,
        isAdmin,
        refetch: fetchCompanies,
        impersonateCompany,
        isImpersonating: !!(isSuperadmin && impersonatedCompanyId),
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
