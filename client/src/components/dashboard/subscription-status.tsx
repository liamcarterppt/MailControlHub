import React from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SubscriptionStatusProps } from "@/lib/types";

export function SubscriptionStatus({ plan }: SubscriptionStatusProps) {
  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="font-semibold text-foreground">Subscription</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Current Plan</span>
          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
            {plan.name}
          </span>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-semibold text-foreground">
            {formatCurrency(plan.pricePerMonth)}
            <span className="text-sm text-muted-foreground font-normal">/month</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Renews on {formatDate(plan.renewDate)}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-sm text-foreground mb-2">Plan Features:</p>
          <ul className="text-xs text-muted-foreground space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <CheckIcon className="text-success mr-2 h-4 w-4" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6">
          <Button className="w-full bg-primary hover:bg-primary/90 text-white">
            Upgrade Plan
          </Button>
          <Button 
            variant="outline" 
            className="w-full mt-2 border border-border bg-white hover:bg-accent"
          >
            <Link href="/billing">Manage Billing</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
