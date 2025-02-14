import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  component: () => React.JSX.Element;
  adminRequired?: boolean;
};

export function ProtectedRoute({
  component: Component,
  adminRequired = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (adminRequired && !user.superAdmin) {
    window.location.href = "/";
    return null;
  }

  return <Component />;
}