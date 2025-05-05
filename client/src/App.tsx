import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/users" component={Users} />
      <Route path="/domains" component={Domains} />
      <Route path="/mail-queue" component={MailQueue} />
      <Route path="/server-config" component={ServerConfig} />
      <Route path="/security-settings" component={SecuritySettings} />
      <Route path="/billing" component={Billing} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/settings" component={Settings} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/subscribe/:priceId" component={Subscribe} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
