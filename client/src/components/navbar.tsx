import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();

  const getDashboardLink = () => {
    switch (user?.userType) {
      case "vendor":
        return "/vendor";
      case "business":
      case "free":
        return "/leads";
      default:
        return "/";
    }
  };

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/">
              <a className="flex items-center font-bold text-xl">
                LeadMarket
              </a>
            </Link>
            <NavigationMenu className="ml-8">
              <NavigationMenuList>
                {user?.userType !== "vendor" && (
                  <NavigationMenuItem>
                    <Link href="/leads">
                      <NavigationMenuLink className="cursor-pointer">
                        Leads
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )}
                <NavigationMenuItem>
                  <Link href="/marketplace">
                    <NavigationMenuLink className="cursor-pointer">
                      Marketplace
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                {user?.userType === "vendor" && (
                  <NavigationMenuItem>
                    <Link href="/vendor">
                      <NavigationMenuLink className="cursor-pointer">
                        Vendor Dashboard
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )}
                {user && user.userType !== "free" && (
                  <NavigationMenuItem>
                    <Link href="/subscription">
                      <NavigationMenuLink className="cursor-pointer">
                        Subscription
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-6 w-6" />
                    <span>{user.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()}>
                      <a className="w-full">Dashboard</a>
                    </Link>
                  </DropdownMenuItem>
                  {user.userType !== "free" && (
                    <DropdownMenuItem asChild>
                      <Link href="/subscription">
                        <a className="w-full">Subscription</a>
                      </Link>
                    </DropdownMenuItem>
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