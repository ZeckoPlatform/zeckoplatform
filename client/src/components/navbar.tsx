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

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const cart = useCart();
  const cartItemCount = cart.getItemCount();
  const [, setLocation] = useLocation();

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

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex items-center font-bold text-xl">
              <Link href="/">Zecko</Link>
            </div>
            <NavigationMenu className="ml-8">
              <NavigationMenuList>
                {user?.userType !== "vendor" && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className="cursor-pointer"
                      onClick={() => handleNavigation("/leads")}
                    >
                      Leads
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem>
                  <NavigationMenuLink
                    className="cursor-pointer"
                    onClick={() => handleNavigation("/marketplace")}
                  >
                    Marketplace
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {user?.userType === "vendor" && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className="cursor-pointer"
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
                        className="cursor-pointer"
                        onClick={() => handleNavigation("/subscription")}
                      >
                        Subscription
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        className="cursor-pointer"
                        onClick={() => handleNavigation("/analytics")}
                      >
                        Analytics
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </>
                )}
                {user?.superAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className="cursor-pointer"
                      onClick={() => handleNavigation("/admin-management")}
                    >
                      Admin Management
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-4">
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
                          // Handle notification click
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
                    <UserCircle className="h-6 w-6" />
                    <span>{user.username}</span>
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
                  {user.superAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleNavigation("/admin-management")}>
                        Admin Management
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