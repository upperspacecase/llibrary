"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex flex-col p-8 rounded-2xl border shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white border-brand-sage/30",
        popular:
          "bg-white border-brand-charcoal shadow-lg shadow-brand-charcoal/10 -translate-y-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface PricingCardProps extends VariantProps<typeof cardVariants> {
  className?: string;
  planName: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string[];
  buttonText: string;
  href?: string;
  footnote?: string;
  icon?: React.ReactNode;
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
      footnote,
      icon,
    },
    ref
  ) => {
    const buttonClasses = cn(
      "w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition",
      variant === "popular"
        ? "border border-brand-charcoal bg-brand-charcoal text-brand-cream hover:bg-transparent hover:text-brand-charcoal"
        : "border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-cream"
    );

    return (
      <motion.div
        ref={ref}
        className={cn(cardVariants({ variant }), className)}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        {variant === "popular" && (
          <div className="absolute right-8 top-0 -translate-y-1/2 rounded-full bg-brand-charcoal px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-cream">
            Most Popular
          </div>
        )}

        <div className="mb-4 flex items-center gap-4">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-sage/15 text-brand-charcoal">
              {icon}
            </div>
          )}
          <div>
            <h3 className="serif-title text-xl text-brand-charcoal">
              {planName}
            </h3>
            <p className="text-sm text-brand-charcoal/70">{description}</p>
          </div>
        </div>

        <div className="my-6">
          <span className="text-5xl font-semibold text-brand-charcoal">
            €{price.toLocaleString("en-US")}
          </span>
          <span className="text-brand-charcoal/60">{billingCycle}</span>
        </div>

        {href ? (
          <a href={href} className={buttonClasses}>
            {buttonText}
          </a>
        ) : (
          <button type="button" className={buttonClasses}>
            {buttonText}
          </button>
        )}

        <ul className="mt-8 flex-1 space-y-4 text-sm text-brand-charcoal/85">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-sage" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {footnote && (
          <p className="mt-6 text-xs italic text-brand-charcoal/70">
            {footnote}
          </p>
        )}
      </motion.div>
    );
  }
);

PricingCard.displayName = "PricingCard";

export { PricingCard };
