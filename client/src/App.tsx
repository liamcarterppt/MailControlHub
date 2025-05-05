import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Domains from "@/pages/domains";
import MailQueue from "@/pages/mail-queue";
import ServerConfig from "@/pages/server-config";
import SecuritySettings from "@/pages/security-settings";
import Billing from "@/pages/billing";
import Referrals from "@/pages/referrals";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Register from "./pages/register";
import Checkout from "./pages/checkout";
import Subscribe from "./pages/subscribe";
import ResellerDashboard from "./pages/reseller-dashboard";
import EmailSettings from "./pages/email-settings";
import EmailTemplates from "./pages/email-templates";
import MailServers from "./pages/mail-servers";
import MailServer from "./pages/mail-server";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/domains" component={Domains} />
      <ProtectedRoute path="/mail-queue" component={MailQueue} />
      <ProtectedRoute path="/server-config" component={ServerConfig} />
      <ProtectedRoute path="/security-settings" component={SecuritySettings} />
      <ProtectedRoute path="/billing" component={Billing} />
      <ProtectedRoute path="/referrals" component={Referrals} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/checkout" component={Checkout} />
      <ProtectedRoute path="/subscribe/:priceId" component={Subscribe} />
      <ProtectedRoute path="/reseller" component={ResellerDashboard} />
      <ProtectedRoute path="/reseller/dashboard" component={ResellerDashboard} />
      <ProtectedRoute path="/email-settings" component={EmailSettings} />
      <ProtectedRoute path="/email-templates" component={EmailTemplates} />
      <ProtectedRoute path="/mail-servers" component={MailServers} />
      <ProtectedRoute path="/mail-server/:id" component={MailServer} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={NotFound} />
    </Switch>
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
