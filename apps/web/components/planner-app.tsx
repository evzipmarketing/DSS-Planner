"use client";

import { TonightPage } from "./minimal-layouts";
import { PlannerProvider } from "./planner-context";
import { usePlanner } from "@/lib/use-planner";

export function PlannerApp() {
  const planner = usePlanner();
  return (
    <PlannerProvider value={planner}>
      <TonightPage />
    </PlannerProvider>
  );
}
