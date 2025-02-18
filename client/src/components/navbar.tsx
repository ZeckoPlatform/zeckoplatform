import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, ShoppingCart, Shield, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const cart = useCart();
  const cartItemCount = cart.getItemCount();
  const [location, setLocation] = useLocation();

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const getDashboardLink = () => {
    if (!user) return "/";

    switch (user.userType) {
      case "vendor":
        return "/vendor/dashboard";
      case "business":
        return "/leads";
      case "admin":
        return user.superAdmin ? "/admin-management" : "/leads";
      case "free":
        return "/leads";
      default:
        return "/";
    }
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  const isCurrentPath = (path: string) => location === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
                Zecko
              </Link>
            </div>
            <NavigationMenu className="ml-8 hidden md:flex">
              <NavigationMenuList className="gap-2">
                <NavigationMenuItem>
                  <NavigationMenuLink
                    className={cn(
                      "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                      isCurrentPath("/social") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                    )}
                    onClick={() => handleNavigation("/social")}
                  >
                    Social Feed
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {user?.userType !== "vendor" && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={cn(
                        "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                        isCurrentPath("/leads") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                      )}
                      onClick={() => handleNavigation("/leads")}
                    >
                      Leads
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    className={cn(
                      "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                      isCurrentPath("/marketplace") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                    )}
                    onClick={() => handleNavigation("/marketplace")}
                  >
                    Marketplace
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {user?.userType === "vendor" && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={cn(
                        "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                        isCurrentPath("/vendor/dashboard") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                      )}
                      onClick={() => handleNavigation("/vendor/dashboard")}
                    >
                      Vendor Dashboard
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                {user && user.userType !== "free" && (
                  <>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        className={cn(
                          "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                          isCurrentPath("/subscription") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                        )}
                        onClick={() => handleNavigation("/subscription")}
                      >
                        Subscription
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        className={cn(
                          "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                          isCurrentPath("/analytics") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                        )}
                        onClick={() => handleNavigation("/analytics")}
                      >
                        Analytics
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </>
                )}
                {user?.superAdmin && (
                  <>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        className={cn(
                          "px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                          isCurrentPath("/admin-management") ? "bg-accent text-accent-foreground font-medium" : "text-foreground/70"
                        )}
                        onClick={() => handleNavigation("/admin-management")}
                      >
                        Admin
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification: any) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="p-4 cursor-pointer"
                        onClick={() => {
                          if (notification.link) {
                            handleNavigation(notification.link);
                          }
                        }}
                      >
                        <div className="space-y-1">
                          <p className={notification.read ? "text-muted-foreground" : "font-medium"}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-center"
                    onClick={() => handleNavigation("/notifications")}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    <span className="hidden md:inline">{user.email}</span>
                    {user.superAdmin && (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation(getDashboardLink())}>
                    Dashboard
                  </DropdownMenuItem>
                  {user.userType === "free" && (
                    <DropdownMenuItem onClick={() => handleNavigation("/settings/profile")}>
                      Profile Settings
                    </DropdownMenuItem>
                  )}
                  {(user.userType === "business" || user.userType === "vendor") && (
                    <DropdownMenuItem onClick={() => handleNavigation("/settings/business-profile")}>
                      Business Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleNavigation("/settings/security")}>
                    Security Settings
                  </DropdownMenuItem>
                  {user.userType !== "free" && (
                    <>
                      <DropdownMenuItem onClick={() => handleNavigation("/subscription")}>
                        Subscription
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation("/analytics")}>
                        Analytics
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => logoutMutation.mutate()}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <Button>Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}