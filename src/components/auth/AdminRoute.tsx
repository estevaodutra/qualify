import { ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Loader2 } from "lucide-react";
import { AdminPIN } from "./AdminPIN";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperadmin, isLoading } = useSuperadmin();
  const [isVerified, setIsVerified] = useState(() => {
    return sessionStorage.getItem("superadmin_verified") === "true";
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isSuperadmin) return <Navigate to="/" replace />;

  if (!isVerified) {
    return <AdminPIN onSuccess={() => setIsVerified(true)} />;
  }

  return <>{children}</>;
}
