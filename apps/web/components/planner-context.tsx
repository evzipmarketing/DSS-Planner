"use client";

import { createContext, useContext } from "react";
import type { Planner } from "@/lib/use-planner";

const PlannerContext = createContext<Planner | null>(null);

export function PlannerProvider({ value, children }: { value: Planner; children: React.ReactNode }) {
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlannerState(): Planner {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("Planner state is unavailable.");
  return value;
}
