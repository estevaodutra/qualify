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
  stopImpersonating: () => void;
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
          .select("id, name, owner_id, is_deleted")
          .order("name");

        if (compError) throw compError;
        companyRows = (allCompanies || []).filter((c: any) => !c.is_deleted);

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
          .select("id, name, owner_id, is_deleted")
          .in("id", companyIds);

        if (compError) throw compError;
        companyRows = (data || []).filter((c: any) => !c.is_deleted);
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

  // Ensure superadmin has active membership in the impersonated company to satisfy RLS policies
  useEffect(() => {
    if (!user || !isSuperadmin || !impersonatedCompanyId) return;

    async function ensureMembership() {
      try {
        const { data, error } = await supabase
          .from("company_members")
          .select("id")
          .eq("company_id", impersonatedCompanyId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking membership for superadmin:", error);
          return;
        }

        if (!data) {
          const { error: insertError } = await supabase
            .from("company_members")
            .insert({
              company_id: impersonatedCompanyId,
              user_id: user.id,
              role: "admin",
              is_active: true,
            });

          if (insertError) {
            console.error("Error inserting membership for superadmin:", insertError);
          } else {
            console.log("Automatically added superadmin membership to company:", impersonatedCompanyId);
            fetchCompanies();
          }
        }
      } catch (err) {
        console.error("Failed to ensure membership for superadmin:", err);
      }
    }

    ensureMembership();
  }, [user, isSuperadmin, impersonatedCompanyId, fetchCompanies]);

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

  const stopImpersonating = () => {
    setImpersonatedCompanyId(null);
    localStorage.removeItem("dispatch_impersonated_company");
  };

  const effectiveCompanyId = (isSuperadmin && impersonatedCompanyId) ? impersonatedCompanyId : activeCompanyId;
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
        stopImpersonating,
        isImpersonating: !!impersonatedCompanyId,
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
