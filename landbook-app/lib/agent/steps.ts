import type { Step } from "@/components/agent/Stepper";

type Stage = "property" | "plan" | "payment" | "submitted";

function build(
  steps: { n: string; label: string; stage: Stage }[],
  current: Stage
): Step[] {
  const currentIdx = steps.findIndex((s) => s.stage === current);
  return steps.map((s, i) => ({
    n: s.n,
    label: s.label,
    state: i < currentIdx ? "done" : i === currentIdx ? "active" : "todo",
  }));
}

/**
 * Free / subscription path: no Plan, no Payment. Reads as a two-dot
 * Property -> Submitted confirmation rather than a four-step purchase.
 */
export function directSteps(current: "property" | "submitted"): Step[] {
  return build(
    [
      { n: "1", label: "Property", stage: "property" },
      { n: "2", label: "Submitted", stage: "submitted" },
    ],
    current
  );
}

/** Paid one-off path: the full Property -> Plan -> Payment -> Submitted flow. */
export function oneOffSteps(
  current: "property" | "plan" | "payment" | "submitted"
): Step[] {
  return build(
    [
      { n: "1", label: "Property", stage: "property" },
      { n: "2", label: "Plan", stage: "plan" },
      { n: "3", label: "Payment", stage: "payment" },
      { n: "4", label: "Submitted", stage: "submitted" },
    ],
    current
  );
}
