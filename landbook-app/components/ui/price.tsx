"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex h-full flex-col border p-8 transition-colors duration-300 md:p-10",
  {
    variants: {
      variant: {
        default:
          "border-brand-sage/40 bg-brand-cream/40 hover:bg-brand-cream/70",
        popular:
          "border-brand-forest/10 bg-white shadow-[0_32px_64px_-16px_rgba(27,58,47,0.12)] ring-1 ring-brand-forest/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface PricingFeature {
  label: string;
  icon: React.ReactNode;
}

export interface PricingCardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  planName: string;
  description: string;
  price: number;
  billingCycle?: string;
  features: PricingFeature[];
  buttonText: string;
  href?: string;
}

const PricingCard = React.forwardRef<HTMLDivElement, PricingCardProps>(
  (
    {
      className,
      variant,
      planName,
      description,
      price,
      billingCycle,
      features,
      buttonText,
      href,
    },
    ref
  ) => {
    const isPopular = variant === "popular";

    const buttonClasses = cn(
      "mt-auto inline-flex w-full items-center justify-center px-6 py-4 text-sm font-semibold tracking-wide transition-all",
      isPopular
        ? "bg-brand-amber text-brand-charcoal hover:brightness-95"
        : "bg-brand-forest text-brand-cream hover:bg-brand-forest/90"
    );

    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant }), className)}
      >
        {isPopular && (
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 bg-brand-amber px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
            Most Popular
          </div>
        )}

        <div className="mb-12">
          <h3
            className={cn(
              "serif-title text-brand-forest",
              isPopular ? "text-4xl" : "text-3xl"
            )}
          >
            {planName}
          </h3>
          <p
            className={cn(
              "mt-3 font-light text-brand-charcoal/70",
              isPopular ? "text-base" : "text-sm"
            )}
          >
            {description}
          </p>
        </div>

        <div className="mb-12 flex items-baseline gap-1">
          <span
            className={cn(
              "serif-title font-bold text-brand-forest",
              isPopular ? "text-5xl" : "text-4xl"
            )}
          >
            €{price.toLocaleString("en-US")}
          </span>
          {billingCycle && (
            <span
              className={cn(
                "font-light text-brand-charcoal/60",
                isPopular ? "text-xl" : "text-lg"
              )}
            >
              {billingCycle}
            </span>
          )}
        </div>

        <ul className="mb-12 flex-1 space-y-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-4">
              <span
                className={cn(
                  "mt-0.5 flex-shrink-0",
                  isPopular ? "text-brand-forest" : "text-brand-sage"
                )}
              >
                {feature.icon}
              </span>
              <span
                className={cn(
                  "leading-snug",
                  isPopular
                    ? "font-medium text-brand-charcoal"
                    : "text-brand-charcoal/80"
                )}
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        {href ? (
          <a href={href} className={buttonClasses}>
            {buttonText}
          </a>
        ) : (
          <button type="button" className={buttonClasses}>
            {buttonText}
          </button>
        )}
      </motion.div>
    );
  }
);

PricingCard.displayName = "PricingCard";

export { PricingCard };
