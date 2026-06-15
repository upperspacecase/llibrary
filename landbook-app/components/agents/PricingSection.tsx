"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Sprout,
  Bird,
  ShieldAlert,
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
import type { AgentsCopy } from "./copy";

const CONTACT_URL = "mailto:hi@landlibrary.co?subject=LandBook%20Agent%20Plans";
// The free first LandBook is self-serve — send agents into sign-up, not email.
const START_FREE_URL = "/agent/signin";

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

const REPORT_ICONS: ReactNode[] = [
  <Sprout key="sprout" className={featureIconClass} />,
  <Bird key="bird" className={featureIconClass} />,
  <ShieldAlert key="risk" className={featureIconClass} />,
  <TrendingUp key="future" className={featureIconClass} />,
];

const STEWARD_ICONS: ReactNode[] = [
  <BarChart3 key="reports" className={featureIconClass} />,
  <Zap key="turnaround" className={featureIconClass} />,
  <Headphones key="support" className={featureIconClass} />,
];

const ENGINE_ICONS: ReactNode[] = [
  <InfinityIcon key="unlimited" className={featureIconClass} />,
  <Stamp key="cobrand" className={featureIconClass} />,
  <LayoutDashboard key="dashboard" className={featureIconClass} />,
  <GraduationCap key="training" className={featureIconClass} />,
];

function zip(labels: string[], icons: ReactNode[]) {
  return labels.map((label, i) => ({ label, icon: icons[i] }));
}

export function PricingSection({ copy }: { copy: AgentsCopy["pricing"] }) {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-brand-sage/20">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
            {copy.eyebrow}
          </p>
          <h2 className="serif-title mt-6 text-3xl leading-[1.1] text-brand-charcoal sm:text-4xl lg:text-5xl">
            {copy.title}
          </h2>
          <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 text-left">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-brand-charcoal" />
            <p className="text-base leading-relaxed text-brand-charcoal/80">
              <strong className="font-semibold text-brand-charcoal">
                {copy.guaranteeLabel}:
              </strong>{" "}
              {copy.guarantee}
            </p>
          </div>
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
              planName={copy.report.name}
              description={copy.report.description}
              price={0}
              originalPrice={1500}
              priceNote={copy.report.priceNote}
              freeLabel={copy.freeLabel}
              features={zip(copy.report.features, REPORT_ICONS)}
              buttonText={copy.report.button}
              href={START_FREE_URL}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              variant="popular"
              planName={copy.steward.name}
              description={copy.steward.description}
              price={2997}
              billingCycle={copy.steward.billingCycle}
              features={zip(copy.steward.features, STEWARD_ICONS)}
              buttonText={copy.steward.button}
              href={CONTACT_URL}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PricingCard
              planName={copy.engine.name}
              description={copy.engine.description}
              price={7997}
              billingCycle={copy.engine.billingCycle}
              features={zip(copy.engine.features, ENGINE_ICONS)}
              buttonText={copy.engine.button}
              href={CONTACT_URL}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
