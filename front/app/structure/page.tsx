"use client";

import { StructureStep } from "../../components/structure/StructureStep";
import { WorkflowRouteGate } from "../../components/workflow/WorkflowRouteGate";
import { WorkflowShell } from "../../components/workflow/WorkflowShell";

export default function StructurePage() {
  return <WorkflowRouteGate step="structure"><WorkflowShell><StructureStep /></WorkflowShell></WorkflowRouteGate>;
}
