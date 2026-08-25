"use client";

import { UploadStep } from "../../components/upload/UploadStep";
import { WorkflowRouteGate } from "../../components/workflow/WorkflowRouteGate";
import { WorkflowShell } from "../../components/workflow/WorkflowShell";

export default function UploadPage() {
  return <WorkflowRouteGate step="upload"><WorkflowShell><UploadStep /></WorkflowShell></WorkflowRouteGate>;
}
