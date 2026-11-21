import { createContext, useContext, type ReactNode } from "react";
import { usePlanner, type Planner } from "./use-planner";

const PlannerContext = createContext<Planner | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const planner = usePlanner();
  return <PlannerContext.Provider value={planner}>{children}</PlannerContext.Provider>;
}

export function usePlannerState(): Planner {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("PlannerProvider missing");
  return value;
}
