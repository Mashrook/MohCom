import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireSubscription?: boolean;
}

const ProtectedRoute = ({ children, requireSubscription = false }: ProtectedRouteProps) => {
  const { user, loading, subscription, isAdmin, isLawyer } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-golden" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // المسؤولون والمحامون يتخطون شرط الاشتراك
  const bypassSubscription = isAdmin || isLawyer;
  
  if (requireSubscription && !subscription.subscribed && !bypassSubscription) {
    return <Navigate to="/pricing" state={{ from: location, requireSubscription: true }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
