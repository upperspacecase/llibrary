"use client";

import { motion } from "framer-motion";
import { LandPlot, Leaf, Earth } from "lucide-react";
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

export function PricingSection() {
  return (
    <section className="border-t border-brand-sage/20">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
            Pricing
          </p>
          <h2 className="serif-title mt-6 text-3xl leading-[1.1] text-brand-charcoal sm:text-4xl lg:text-5xl">
            The Future of Land Value Isn&rsquo;t Just Location&mdash;It&rsquo;s
            Nature.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-brand-charcoal/80">
            LandBook reveals an average of €10,000–€100,000 of Natural Capital
            Value in every rural property over 5ha in size.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 items-center gap-8 md:grid-cols-2 lg:grid-cols-3"
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
              billingCycle=" one-time"
              features={[
                "Natural capital valuation (soil, water, productivity)",
                "Biodiversity assessment",
                "Carbon sequestration potential",
                "Value uplift estimate",
              ]}
              buttonText="Order Report"
              href={CREATE_URL}
              footnote="Guarantee: No €10K+ value found = free"
              icon={<LandPlot className="h-5 w-5" />}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              variant="popular"
              planName="Land Steward Partner"
              description="For agents who steward every property fully."
              price={2997}
              billingCycle="/mo"
              features={[
                "Up to 5 Natural Capital Reports/month",
                "24-hour priority turnaround",
                "Monthly biodiversity & carbon market brief",
                "Direct support line",
              ]}
              buttonText="Become a Partner"
              href={CREATE_URL}
              footnote="Best for: Active agents with 3–5 rural listings/month"
              icon={<Leaf className="h-5 w-5" />}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              planName="Agency Natural Capital Engine"
              description="Transform your agency's rural intelligence."
              price={7997}
              billingCycle="/mo"
              features={[
                "Unlimited Natural Capital Reports",
                "Co-branded Landbook reports",
                "Custom agency dashboard",
                "Quarterly team training on natural capital valuation",
              ]}
              buttonText="Talk to the Team"
              href={CREATE_URL}
              footnote="Best for: Multi-agent agencies, land stewards, developers"
              icon={<Earth className="h-5 w-5" />}
            />
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-16 rounded-lg border border-brand-sage/40 bg-brand-sage/5 px-8 py-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
            The LandBook Guarantee
          </p>
          <p className="serif-title mt-4 text-xl leading-snug text-brand-charcoal sm:text-2xl">
            If our report doesn&rsquo;t uncover at least €10,000 in additional
            natural capital value, you don&rsquo;t pay.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
