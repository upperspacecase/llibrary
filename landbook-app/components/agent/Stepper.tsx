import { cn } from "@/lib/utils";
import { Icon } from "./primitives";

export type Step = {
  n: string;
  label: string;
  state: "active" | "done" | "todo";
};

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em]">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                step.state === "active"
                  ? "bg-brand-charcoal text-brand-cream"
                  : step.state === "done"
                  ? "bg-brand-forest text-brand-cream"
                  : "bg-brand-charcoal/10 text-brand-charcoal/40"
              )}
            >
              {step.state === "done" ? <Icon.Check /> : step.n}
            </span>
            <span
              className={cn(
                step.state === "active"
                  ? "text-brand-charcoal"
                  : step.state === "done"
                  ? "text-brand-charcoal/70"
                  : "text-brand-charcoal/40"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-px w-10 bg-brand-sage/40" />
          )}
        </div>
      ))}
    </div>
  );
}
