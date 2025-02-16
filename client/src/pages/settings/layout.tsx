import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Bell, 
  BarChart4,
  Building2,
  ChevronLeft,
  User
} from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    {
      name: "Profile",
      href: "/settings/profile",
      icon: User,
      show: user?.userType === "free", // Only show for free users
    },
    {
      name: "Security",
      href: "/settings/security",
      icon: Shield,
      show: true, // Everyone can access security settings
    },
    {
      name: "Business Profile",
      href: "/settings/business-profile",
      icon: Building2,
      show: user?.userType === "business" || user?.userType === "vendor",
    },
    {
      name: "Notifications",
      href: "/settings/notifications",
      icon: Bell,
      show: user?.superAdmin,
    },
    {
      name: "Analytics",
      href: "/settings/analytics",
      icon: BarChart4,
      show: user?.superAdmin,
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => window.history.back()} className="mr-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64">
          <nav className="space-y-2">
            {navigation
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent cursor-pointer",
                        location === item.href ? "bg-accent" : "transparent"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}