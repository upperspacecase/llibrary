"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex h-full flex-col rounded-2xl border p-8 transition-colors duration-300 md:p-10",
  {
    variants: {
      variant: {
        default: "border-brand-sage/30 bg-white shadow-sm",
        popular:
          "border-brand-charcoal/10 bg-white shadow-lg shadow-brand-charcoal/10 ring-1 ring-brand-charcoal/5",
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
  /** When set, shown struck-through above the price (e.g. the normal price when the first one is free). */
  originalPrice?: number;
  /** Small note under the price, e.g. "First report free, then €1,500 each". */
  priceNote?: string;
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
      originalPrice,
      priceNote,
      features,
      buttonText,
      href,
    },
    ref
  ) => {
    const isPopular = variant === "popular";

    const buttonClasses = cn(
      "mt-auto inline-flex w-full items-center justify-center rounded-full border border-brand-charcoal px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition",
      isPopular
        ? "bg-brand-charcoal text-brand-cream hover:bg-transparent hover:text-brand-charcoal"
        : "text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-cream"
    );

    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant }), className)}
      >
        {isPopular && (
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-charcoal px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-cream">
            Most Popular
          </div>
        )}

        <div className="mb-12">
          <h3
            className={cn(
              "serif-title text-brand-charcoal",
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

        <div className="mb-12">
          {originalPrice != null && (
            <span className="block text-lg font-light text-brand-charcoal/40 line-through">
              €{originalPrice.toLocaleString("en-US")}
            </span>
          )}
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "serif-title font-bold text-brand-charcoal",
                isPopular ? "text-5xl" : "text-4xl"
              )}
            >
              {price === 0 ? "Free" : `€${price.toLocaleString("en-US")}`}
            </span>
            {billingCycle && price !== 0 && (
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
          {priceNote && (
            <p className="mt-2 text-sm font-light text-brand-charcoal/60">
              {priceNote}
            </p>
          )}
        </div>

        <ul className="mb-12 flex-1 space-y-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-4">
              <span
                className={cn(
                  "mt-0.5 flex-shrink-0",
                  isPopular ? "text-brand-charcoal" : "text-brand-sage"
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
