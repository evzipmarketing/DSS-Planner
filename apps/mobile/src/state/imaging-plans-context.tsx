import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createImagingPlanId,
  type ImagingPlan,
  type ImagingPlanModule,
} from "@dss/core";
import type { SaveImagingPlanInput } from "@/lib/plan-snapshot";
import {
  consumePendingImagingPlan,
  loadImagingPlans,
  saveImagingPlans,
  setPendingImagingPlan,
} from "@/lib/storage";

type ImagingPlansContextValue = {
  plans: ImagingPlan[];
  ready: boolean;
  savePlan: (input: SaveImagingPlanInput) => string;
  deletePlan: (planId: string) => void;
  renamePlan: (planId: string, name: string) => void;
  requestOpenPlan: (planId: string, module: ImagingPlanModule) => Promise<void>;
  consumePendingPlan: (module: ImagingPlanModule) => Promise<ImagingPlan | null>;
};

const ImagingPlansContext = createContext<ImagingPlansContextValue | null>(null);

export function ImagingPlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<ImagingPlan[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadImagingPlans().then((next) => {
      setPlans(next.plans);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveImagingPlans({ plans });
  }, [ready, plans]);

  const savePlan = useCallback((input: SaveImagingPlanInput) => {
    const now = new Date().toISOString();
    const id = input.id ?? createImagingPlanId();
    const plan = { ...input, id, createdAt: now, version: 1 as const } as ImagingPlan;
    setPlans((current) => [plan, ...current.filter((item) => item.id !== id)]);
    return id;
  }, []);

  const deletePlan = useCallback((planId: string) => {
    setPlans((current) => current.filter((item) => item.id !== planId));
  }, []);

  const renamePlan = useCallback((planId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlans((current) =>
      current.map((item) =>
        item.id === planId ? ({ ...item, name: trimmed, updatedAt: new Date().toISOString() } as ImagingPlan) : item,
      ),
    );
  }, []);

  const requestOpenPlan = useCallback(async (planId: string, module: ImagingPlanModule) => {
    await setPendingImagingPlan(planId, module);
  }, []);

  const consumePendingPlan = useCallback(async (module: ImagingPlanModule) => {
    return consumePendingImagingPlan(module);
  }, []);

  const value = useMemo<ImagingPlansContextValue>(
    () => ({
      plans,
      ready,
      savePlan,
      deletePlan,
      renamePlan,
      requestOpenPlan,
      consumePendingPlan,
    }),
    [plans, ready, savePlan, deletePlan, renamePlan, requestOpenPlan, consumePendingPlan],
  );

  return <ImagingPlansContext.Provider value={value}>{children}</ImagingPlansContext.Provider>;
}

export function useImagingPlans(): ImagingPlansContextValue {
  const value = useContext(ImagingPlansContext);
  if (!value) throw new Error("ImagingPlansProvider missing");
  return value;
}
