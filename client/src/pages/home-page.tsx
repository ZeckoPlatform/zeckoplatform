import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  const showSubscriptionAlert = user && 
    ["business", "vendor"].includes(user.userType) && 
    !user.subscriptionActive;

  const getStartedHref = () => {
    if (!user) return "/auth";
    switch (user.userType) {
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
    <div className="min-h-screen">
      {showSubscriptionAlert && (
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="bg-muted rounded-lg p-4 flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="font-medium">Complete Your Setup</p>
              <p className="text-sm text-muted-foreground">
                Activate your {user.userType} subscription to access all features.
              </p>
            </div>
            <Link href="/subscription">
              <Button className="ml-auto">Setup Subscription</Button>
            </Link>
          </div>
        </div>
      )}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40"
            alt="Business background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50" />
        </div>

        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-primary">Connect. Match. Grow.</span>
            <span className="block text-foreground">Welcome to Zecko</span>
          </h1>
          <p className="mt-6 max-w-lg text-xl text-muted-foreground">
            Find leads, connect with businesses, or sell your products - all in one place.
          </p>
          <div className="mt-10 flex gap-4">
            <Link href={getStartedHref()}>
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg">Browse Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold">Free User Account</h3>
                <p className="mt-2 text-muted-foreground">
                  Post leads and connect with businesses. Pay only when you post.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold">Business Subscription</h3>
                <p className="mt-2 text-muted-foreground">
                  Get matched with relevant leads and grow your business.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold">Vendor Account</h3>
                <p className="mt-2 text-muted-foreground">
                  Set up your store and sell products directly to customers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}