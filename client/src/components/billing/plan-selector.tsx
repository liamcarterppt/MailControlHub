import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, ArrowRight } from "lucide-react";
import { formatCurrency, formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PlanSelectorProps } from "@/lib/types";

export function PlanSelector({ 
  plans, 
  currentPlanId, 
  onSelectPlan 
}: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlanId === plan.id;
        return (
          <Card 
            key={plan.id}
            className={cn(
              "flex flex-col",
              isCurrentPlan && "border-primary"
            )}
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{plan.name}</span>
                {isCurrentPlan && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Current Plan
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 mt-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Up to {plan.emailAccountLimit} email accounts</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>Up to {plan.domainLimit} domains</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                  <span>{formatBytes(plan.storageLimit)} storage</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className={cn(
                  "w-full",
                  isCurrentPlan ? "bg-accent hover:bg-accent" : ""
                )}
                variant={isCurrentPlan ? "outline" : "default"}
                onClick={() => onSelectPlan(plan)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? "Current Plan" : "Select Plan"}
                {!isCurrentPlan && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
