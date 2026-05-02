import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Loader2 } from "lucide-react";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperadmin, isLoading } = useSuperadmin();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
