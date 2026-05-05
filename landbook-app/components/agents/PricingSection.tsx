"use client";

import { motion } from "framer-motion";
import {
  Sprout,
  Bird,
  Cloud,
  TrendingUp,
  BarChart3,
  Zap,
  Headphones,
  Infinity as InfinityIcon,
  Stamp,
  LayoutDashboard,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { PricingCard } from "@/components/ui/price";

const CREATE_URL = "https://www.landlibrary.co/create";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const featureIconClass = "h-5 w-5";

export function PricingSection() {
  return (
    <section className="border-t border-brand-sage/20">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        <motion.div
          className="max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-amber">
            LandBook Agent Pricing
          </p>
          <h2 className="serif-title mt-6 text-5xl leading-[1.1] tracking-tight text-brand-forest md:text-7xl">
            Stop Overlooking Value in Every Deal
          </h2>
          <p className="mt-8 max-w-2xl text-xl font-light leading-relaxed text-brand-charcoal/80 md:text-2xl">
            LandBook reveals an average of €10,000–€100,000 of Natural Capital
            Value in every rural property over 5ha in size.
          </p>
        </motion.div>

        <motion.div
          className="mt-20 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants}>
            <PricingCard
              planName="Natural Capital Report"
              description="One property. Full intelligence. 48-hour turnaround."
              price={1500}
              features={[
                {
                  icon: <Sprout className={featureIconClass} />,
                  label: "Natural capital valuation (soil, water, productivity)",
                },
                {
                  icon: <Bird className={featureIconClass} />,
                  label: "Biodiversity assessment",
                },
                {
                  icon: <Cloud className={featureIconClass} />,
                  label: "Carbon sequestration potential",
                },
                {
                  icon: <TrendingUp className={featureIconClass} />,
                  label: "Future Scenarios",
                },
              ]}
              buttonText="Order Single Report"
              href={CREATE_URL}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              variant="popular"
              planName="Land Steward Partner"
              description="For agents who steward every property fully."
              price={2997}
              billingCycle="/month"
              features={[
                {
                  icon: <BarChart3 className={featureIconClass} />,
                  label: "Up to 5 Natural Capital Reports/month",
                },
                {
                  icon: <Zap className={featureIconClass} />,
                  label: "24-hour priority turnaround",
                },
                {
                  icon: <Headphones className={featureIconClass} />,
                  label: "Direct support line",
                },
              ]}
              buttonText="Partner With Us"
              href={CREATE_URL}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              planName="Agency Natural Capital Engine"
              description="Transform your agency's rural intelligence."
              price={7997}
              billingCycle="/month"
              features={[
                {
                  icon: <InfinityIcon className={featureIconClass} />,
                  label: "Unlimited Natural Capital Reports",
                },
                {
                  icon: <Stamp className={featureIconClass} />,
                  label: "Co-branded Landbook reports",
                },
                {
                  icon: <LayoutDashboard className={featureIconClass} />,
                  label: "Custom agency dashboard",
                },
                {
                  icon: <GraduationCap className={featureIconClass} />,
                  label: "Quarterly team training on natural capital valuation",
                },
              ]}
              buttonText="Contact Enterprise"
              href={CREATE_URL}
            />
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto mt-32 max-w-4xl py-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <hr className="mb-16 border-brand-sage/30" />
          <div className="mx-auto mb-8 inline-flex h-16 w-16 items-center justify-center bg-brand-forest/5">
            <ShieldCheck className="h-8 w-8 text-brand-forest" />
          </div>
          <div className="mx-auto max-w-2xl">
            <h3 className="serif-title text-2xl italic tracking-tight text-brand-forest md:text-3xl">
              The LandBook Guarantee
            </h3>
            <p className="mt-4 text-xl font-light leading-relaxed text-brand-charcoal/80 md:text-2xl">
              &ldquo;If our report doesn&rsquo;t uncover at least €10,000 in
              additional natural capital value, you don&rsquo;t pay.&rdquo;
            </p>
          </div>
          <hr className="mt-16 border-brand-sage/30" />
        </motion.div>
      </div>
    </section>
  );
}
