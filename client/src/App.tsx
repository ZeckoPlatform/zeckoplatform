import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import LeadsPage from "@/pages/leads-page";
import MarketplacePage from "@/pages/marketplace-page";
import SubscriptionPage from "@/pages/subscription-page";
import VendorDashboard from "@/pages/vendor-dashboard";
import CartPage from "@/pages/cart-page";
import Navbar from "@/components/navbar";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/cart" component={CartPage} />
        <ProtectedRoute path="/leads" component={LeadsPage} />
        <ProtectedRoute path="/marketplace" component={MarketplacePage} />
        <ProtectedRoute path="/subscription" component={SubscriptionPage} />
        <ProtectedRoute path="/vendor" component={VendorDashboard} />
        <ProtectedRoute path="/vendor/dashboard" component={VendorDashboard} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;