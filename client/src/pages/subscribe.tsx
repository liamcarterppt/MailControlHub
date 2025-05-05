import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from "../lib/queryClient";
import { toast } from "../hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "An unexpected error occurred");
        toast({
          title: "Subscription Failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An unexpected error occurred");
      toast({
        title: "Subscription Error",
        description: e.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-sm text-red-500 mt-2">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Subscribe"
        )}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [, params] = useRoute('/subscribe/:priceId');
  const priceId = params?.priceId;

  useEffect(() => {
    if (!priceId) {
      setError("Missing price ID. Please select a plan first.");
      setIsLoading(false);
      return;
    }

    // Create subscription as soon as the page loads
    const createSubscription = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/create-subscription", { priceId });
        const data = await response.json();
        
        if (response.ok) {
          setClientSecret(data.clientSecret);
          setPlanDetails(data.planDetails || { name: "Subscription Plan" });
        } else {
          setError(data.message || "Failed to create subscription");
          toast({
            title: "Subscription Setup Failed",
            description: data.message || "Please try again later",
            variant: "destructive",
          });
        }
      } catch (e: any) {
        setError(e.message || "An error occurred");
        toast({
          title: "Subscription Setup Error",
          description: e.message || "Please try again later",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [priceId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Subscription Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/billing'}>
              Return to Billing
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Unable to Setup Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">Subscription configuration is missing or invalid.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/billing'}>
              Return to Billing
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center">Complete Your Subscription</CardTitle>
            <CardDescription className="text-center">
              {planDetails?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm />
            </Elements>
          </CardContent>
          <CardFooter className="text-xs text-center text-gray-500">
            Your payment is processed securely by Stripe. We do not store your card details.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}