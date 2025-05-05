import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PlanSelector } from "@/components/billing/plan-selector";
import { PaymentForm } from "@/components/billing/payment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Loader2, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Receipt
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Billing() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Check if there's a success parameter in the URL
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get('success') === 'true';

  // If success parameter is present, show a toast and redirect
  React.useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Payment Successful",
        description: "Your subscription has been activated!",
      });
      setLocation('/billing', { replace: true });
    }
  }, [isSuccess, toast, setLocation]);

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription-plans"],
  });

  // Fetch user's dashboard data to get current subscription
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Cancel subscription mutation
  const handleCancelSubscription = async () => {
    try {
      await apiRequest("POST", "/api/cancel-subscription", {});
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will be cancelled at the end of the current billing period",
      });
      // Refetch dashboard data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
      console.error("Failed to cancel subscription:", error);
    }
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    window.location.reload();
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };

  const isLoading = plansLoading || dashboardLoading;
  const subscription = dashboardData?.subscriptionPlan;
  const currentPlanId = subscription ? plans?.find((p: any) => p.name === subscription.name)?.id : undefined;

  return (
    <MainLayout pageTitle="Billing & Subscription">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : showPaymentForm && selectedPlan ? (
          <PaymentForm
            selectedPlan={selectedPlan}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        ) : (
          <>
            {subscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Receipt className="mr-2 h-5 w-5 text-primary" />
                    Current Subscription
                  </CardTitle>
                  <CardDescription>
                    Details of your active subscription
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Plan</p>
                        <p className="text-2xl font-bold">{subscription.name}</p>
                      </div>
                      <Badge 
                        variant={subscription.status === "active" ? "success" : "warning"}
                        className="px-2 py-1 flex items-center"
                      >
                        {subscription.status === "active" ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>{subscription.status}</span>
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Price</p>
                        <p className="text-xl">{formatCurrency(subscription.pricePerMonth)}/month</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Next Billing Date</p>
                        <p className="text-xl">{formatDate(subscription.currentPeriodEnd)}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Plan Features</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {subscription.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 text-success mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full mt-4">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period, after which it will be cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                          >
                            Yes, Cancel Subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-primary" />
                  Available Plans
                </CardTitle>
                <CardDescription>
                  Choose a subscription plan that fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanSelector
                  plans={plans || []}
                  currentPlanId={currentPlanId}
                  onSelectPlan={handleSelectPlan}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}

// Simple Badge component since it wasn't imported above
function Badge({ children, variant = "default", className = "" }) {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
