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

export default function Navbar() {
  const { user, logoutMutation } = useAuth();

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
                <NavigationMenuItem>
                  <Link href="/leads">
                    <NavigationMenuLink className="cursor-pointer">
                      Leads
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/marketplace">
                    <NavigationMenuLink className="cursor-pointer">
                      Marketplace
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
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
              <>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-6 w-6" />
                  <span>{user.username}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => logoutMutation.mutate()}
                >
                  Logout
                </Button>
              </>
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