import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import ThemeManager from "./theme-manager";

export default function AdminManagement() {
  const [location] = useLocation();
  const currentPath = location.split("/").pop() || "dashboard";

  return (
    <div className="container py-8">
      <div className="flex gap-4 mb-8">
        <Link href="/admin/dashboard">
          <Button variant={currentPath === "dashboard" ? "default" : "outline"}>
            Dashboard
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant={currentPath === "users" ? "default" : "outline"}>
            User Management
          </Button>
        </Link>
        <Link href="/admin/themes">
          <Button variant={currentPath === "themes" ? "default" : "outline"}>
            Theme Management
          </Button>
        </Link>
        <Link href="/admin/settings">
          <Button variant={currentPath === "settings" ? "default" : "outline"}>
            Settings
          </Button>
        </Link>
      </div>

      {currentPath === "dashboard" && <div>Admin Dashboard</div>}
      {currentPath === "themes" && <ThemeManager />}
      {/* Other admin sections render here based on currentPath */}
    </div>
  );
}