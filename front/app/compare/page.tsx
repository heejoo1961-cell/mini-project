"use client";

import { ComparisonStep } from "../../components/comparison/ComparisonStep";
import { WorkflowRouteGate } from "../../components/workflow/WorkflowRouteGate";
import { WorkflowShell } from "../../components/workflow/WorkflowShell";

export default function ComparePage() {
  return <WorkflowRouteGate step="compare"><WorkflowShell><ComparisonStep /></WorkflowShell></WorkflowRouteGate>;
}
