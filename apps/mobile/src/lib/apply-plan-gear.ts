import type { ImagingPlan } from "@dss/core";

type PlannerGearApi = {
  selectRig: (id: string) => void;
  clearActiveRig: () => void;
  setTelescopeId: (id: string) => void;
  setCameraId: (id: string) => void;
  setReducer: (value: number) => void;
  setFocalOverrideMm: (value: number | null) => void;
  setDate: (iso: string) => void;
  setListFilter?: (filter: NonNullable<ImagingPlan["listFilter"]>) => void;
  setCustomListRanges?: (ranges: NonNullable<ImagingPlan["customListRanges"]>) => void;
};

export function applySavedPlanGear(planner: PlannerGearApi, plan: ImagingPlan) {
  if (plan.gear.activeRigId) {
    planner.selectRig(plan.gear.activeRigId);
  } else {
    planner.clearActiveRig();
    if (plan.gear.telescopeId) planner.setTelescopeId(plan.gear.telescopeId);
    if (plan.gear.cameraId) planner.setCameraId(plan.gear.cameraId);
    planner.setReducer(plan.gear.reducer);
    planner.setFocalOverrideMm(plan.gear.focalOverrideMm);
  }
  if (plan.module === "multi-target" || plan.module === "multi-rigs") {
    planner.setDate(plan.dateIso);
  } else if (plan.module === "single-target") {
    planner.setDate(plan.startDateIso);
  }
  if (plan.pickerSource.kind === "filtered" && plan.listFilter && planner.setListFilter) {
    planner.setListFilter(plan.listFilter);
  }
  if (plan.pickerSource.kind === "filtered" && plan.customListRanges && planner.setCustomListRanges) {
    planner.setCustomListRanges(plan.customListRanges);
  }
}
