"use client";

import { ExtractionStep } from "../../components/extraction/ExtractionStep";
import { WorkflowRouteGate } from "../../components/workflow/WorkflowRouteGate";
import { WorkflowShell } from "../../components/workflow/WorkflowShell";

export default function ExtractPage() {
  return <WorkflowRouteGate step="extract"><WorkflowShell><ExtractionStep /></WorkflowShell></WorkflowRouteGate>;
}
