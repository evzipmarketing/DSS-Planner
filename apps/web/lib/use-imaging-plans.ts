"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createImagingPlanId,
  type ImagingPlan,
  type ImagingPlanModule,
} from "@dss/core";
import type { SaveImagingPlanInput } from "@/lib/plan-snapshot";

const KEY = "dss-planner.imaging-plans.v1";
const PENDING_KEY = "dss-planner.open-plan.v1";

type PlansState = {
  plans: ImagingPlan[];
};

const EMPTY: PlansState = { plans: [] };

export function useImagingPlans() {
  const [state, setState] = useState<PlansState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadPlans());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [ready, state]);

  const savePlan = useCallback((input: SaveImagingPlanInput) => {
    const now = new Date().toISOString();
    const id = input.id ?? createImagingPlanId();
    const plan = { ...input, id, createdAt: now, version: 1 as const } as ImagingPlan;
    setState((current) => ({
      plans: [plan, ...current.plans.filter((item) => item.id !== id)],
    }));
    return id;
  }, []);

  const deletePlan = useCallback((planId: string) => {
    setState((current) => ({
      plans: current.plans.filter((item) => item.id !== planId),
    }));
  }, []);

  const renamePlan = useCallback((planId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((current) => ({
      plans: current.plans.map((item) =>
        item.id === planId ? ({ ...item, name: trimmed, updatedAt: new Date().toISOString() } as ImagingPlan) : item,
      ),
    }));
  }, []);

  const getPlan = useCallback(
    (planId: string) => state.plans.find((item) => item.id === planId) ?? null,
    [state.plans],
  );

  const requestOpenPlan = useCallback((planId: string, module: ImagingPlanModule) => {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ planId, module }));
    window.dispatchEvent(new CustomEvent("dss-open-imaging-plan", { detail: { planId, module } }));
  }, []);

  const consumePendingPlan = useCallback((module: ImagingPlanModule): ImagingPlan | null => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { planId?: string; module?: ImagingPlanModule };
      if (parsed.module !== module || typeof parsed.planId !== "string") return null;
      const plan = loadPlans().plans.find((item) => item.id === parsed.planId) ?? null;
      if (plan) window.sessionStorage.removeItem(PENDING_KEY);
      return plan;
    } catch {
      return null;
    }
  }, []);

  return {
    plans: state.plans,
    ready,
    savePlan,
    deletePlan,
    renamePlan,
    getPlan,
    requestOpenPlan,
    consumePendingPlan,
  };
}

function loadPlans(): PlansState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PlansState>;
    return {
      plans: Array.isArray(parsed.plans)
        ? parsed.plans.filter((plan): plan is ImagingPlan => isImagingPlan(plan))
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function isImagingPlan(value: unknown): value is ImagingPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<ImagingPlan>;
  return (
    plan.version === 1 &&
    typeof plan.id === "string" &&
    typeof plan.name === "string" &&
    typeof plan.module === "string" &&
    typeof plan.createdAt === "string" &&
    !!plan.gear &&
    !!plan.siteRef &&
    !!plan.pickerSource
  );
}
