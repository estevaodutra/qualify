import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  /** When false, do not require an active company membership (e.g. /aguardando-acesso). */
  requireCompany?: boolean;
}

export function ProtectedRoute({ children, requireCompany = true }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { companies, isLoading: companyLoading } = useCompany();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireCompany) {
    if (companyLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (companies.length === 0) {
      return <Navigate to="/aguardando-acesso" replace />;
    }
  }

  return <>{children}</>;
}
