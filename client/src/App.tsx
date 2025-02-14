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
import AdminManagement from "@/pages/admin/admin-management";
import ThemeManager from "@/pages/admin/theme-manager";
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
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/reset-password/:token" component={ResetPasswordPage} />
        <Route path="/cart" component={CartPage} />

        {/* Protected Routes */}
        <Route path="/leads" component={() => <ProtectedRoute component={LeadsPage} />} />
        <Route path="/marketplace" component={() => <ProtectedRoute component={MarketplacePage} />} />
        <Route path="/subscription" component={() => <ProtectedRoute component={SubscriptionPage} />} />
        <Route path="/vendor" component={() => <ProtectedRoute component={VendorDashboard} />} />
        <Route path="/vendor/dashboard" component={() => <ProtectedRoute component={VendorDashboard} />} />
        <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsDashboard} />} />
        <Route path="/reviews" component={() => <ProtectedRoute component={ReviewsDashboard} />} />
        <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />

        {/* Admin Routes */}
        <Route path="/admin">
          {() => <ProtectedRoute component={AdminManagement} adminRequired />}
        </Route>
        <Route path="/admin/dashboard">
          {() => <ProtectedRoute component={AdminManagement} adminRequired />}
        </Route>
        <Route path="/admin/themes">
          {() => <ProtectedRoute component={ThemeManager} adminRequired />}
        </Route>
        <Route path="/admin/users">
          {() => <ProtectedRoute component={AdminManagement} adminRequired />}
        </Route>
        <Route path="/admin/settings">
          {() => <ProtectedRoute component={AdminManagement} adminRequired />}
        </Route>
        <Route path="/admin/users/edit/:id">
          {() => <ProtectedRoute component={UserEditPage} adminRequired />}
        </Route>
        <Route path="/admin/reviews">
          {() => <ProtectedRoute component={ReviewModerationPage} adminRequired />}
        </Route>

        {/* Settings Routes */}
        <Route path="/settings/security">
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
        <Route path="/settings/business-profile">
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
        <Route path="/settings/notifications">
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
        <Route path="/settings/analytics">
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