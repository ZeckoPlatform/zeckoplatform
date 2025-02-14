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
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import AdminManagementPage from "@/pages/admin-management";
import SettingsLayout from "@/pages/settings/layout";
import SecuritySettingsPage from "@/pages/settings/security-settings";
import NotificationSettingsPage from "@/pages/settings/notification-settings";
import AnalyticsSettingsPage from "@/pages/settings/analytics-settings";
import BusinessProfilePage from "@/pages/settings/business-profile";
import UserEditPage from "@/pages/admin/user-edit";
import ReviewModerationPage from "@/pages/admin/review-moderation";
import ResetPasswordPage from "@/pages/auth/reset-password";
import ReviewsDashboard from "@/pages/reviews-dashboard";
import NotificationsPage from "@/pages/notifications-page";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        {/* Public Routes */}
        <Route path="/" component={() => <ProtectedRoute component={HomePage} />} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/reset-password/:token" component={ResetPasswordPage} />

        {/* Protected Routes */}
        <Route path="/app" component={() => <ProtectedRoute component={HomePage} />} />
        <Route path="/app/leads" component={() => <ProtectedRoute component={LeadsPage} />} />
        <Route path="/app/marketplace" component={() => <ProtectedRoute component={MarketplacePage} />} />
        <Route path="/app/subscription" component={() => <ProtectedRoute component={SubscriptionPage} />} />
        <Route path="/app/vendor" component={() => <ProtectedRoute component={VendorDashboard} />} />
        <Route path="/app/vendor/dashboard" component={() => <ProtectedRoute component={VendorDashboard} />} />
        <Route path="/app/analytics" component={() => <ProtectedRoute component={AnalyticsDashboard} />} />
        <Route path="/app/admin-management" component={() => <ProtectedRoute component={AdminManagementPage} />} />
        <Route path="/app/reviews" component={() => <ProtectedRoute component={ReviewsDashboard} />} />
        <Route path="/app/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />

        {/* Settings Routes */}
        <Route path="/app/settings/security">
          {() => (
            <ProtectedRoute
              component={() => (
                <SettingsLayout>
                  <SecuritySettingsPage />
                </SettingsLayout>
              )}
            />
          )}
        </Route>
        <Route path="/app/settings/business-profile">
          {() => (
            <ProtectedRoute
              component={() => (
                <SettingsLayout>
                  <BusinessProfilePage />
                </SettingsLayout>
              )}
            />
          )}
        </Route>
        <Route path="/app/settings/notifications">
          {() => (
            <ProtectedRoute
              component={() => (
                <SettingsLayout>
                  <NotificationSettingsPage />
                </SettingsLayout>
              )}
            />
          )}
        </Route>
        <Route path="/app/settings/analytics">
          {() => (
            <ProtectedRoute
              component={() => (
                <SettingsLayout>
                  <AnalyticsSettingsPage />
                </SettingsLayout>
              )}
            />
          )}
        </Route>

        {/* Admin Routes */}
        <Route path="/app/admin/users/edit/:id" component={UserEditPage} />
        <Route path="/app/admin/reviews" component={ReviewModerationPage} />

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