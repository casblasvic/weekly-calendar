"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const stepperVariants = cva(
  "flex items-center justify-between w-full",
  {
    variants: {
      orientation: {
        horizontal: "flex-row",
        vertical: "flex-col",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

interface StepperProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stepperVariants> {
  initialStep: number;
  activeStep: number;
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ className, children, initialStep, activeStep, orientation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(stepperVariants({ orientation }), className)}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement<StepProps>(child)) {
            return child;
          }
          return React.cloneElement(child, {
            isActive: index === activeStep,
            isCompleted: index < activeStep,
            isLastStep: index === React.Children.count(children) - 1,
            index: index,
            orientation: orientation,
          });
        })}
      </div>
    );
  }
);
Stepper.displayName = "Stepper";

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isLastStep?: boolean;
  index?: number;
  orientation?: "horizontal" | "vertical";
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  ({ className, label, isActive, isCompleted, isLastStep, index, orientation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center", {
          "flex-col": orientation === "vertical",
          "flex-1": orientation === "horizontal" && !isLastStep,
        }, className)}
        {...props}
      >
        <div className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              {
                "bg-primary text-primary-foreground": isActive || isCompleted,
                "bg-muted border-2": !isActive && !isCompleted,
              }
            )}
          >
            {isCompleted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <span>{index !== undefined ? index + 1 : ""}</span>
            )}
          </div>
          <div className="ml-4 text-sm font-medium">{label}</div>
        </div>
        {!isLastStep && (
          <div
            className={cn("transition-all", {
              "flex-1 h-px bg-border mx-4": orientation === "horizontal",
              "w-px h-8 bg-border my-4": orientation === "vertical",
            })}
          />
        )}
      </div>
    );
  }
);
Step.displayName = "Step";

export { Stepper, Step }; 