import type {
  CustomListRanges,
  ImagingPlan,
  PlanGearRef,
  PlanPickerSource,
  PlanSiteRef,
  Site,
  TargetListFilter,
} from "@dss/core";

type PlannerLike = {
  activeSiteId: string | null;
  site: Site;
  activeRigId: string | null;
  telescope: { id: string } | null;
  camera: { id: string } | null;
  reducer: number;
  focalOverrideMm: number | null;
  filterIds: string[];
  listFilter?: TargetListFilter;
  customListRanges?: CustomListRanges;
};

export function snapshotPlanSite(planner: PlannerLike): PlanSiteRef {
  return {
    locationId: planner.site.id,
    activeSiteId: planner.activeSiteId,
    site: planner.site,
  };
}

export function snapshotPlanGear(planner: PlannerLike): PlanGearRef {
  return {
    activeRigId: planner.activeRigId,
    telescopeId: planner.telescope?.id ?? "",
    cameraId: planner.camera?.id ?? "",
    reducer: planner.reducer,
    focalOverrideMm: planner.focalOverrideMm,
    filterIds: [...planner.filterIds],
  };
}

export function planFilterFields(planner: PlannerLike, source: PlanPickerSource) {
  if (source.kind !== "filtered") return {};
  return {
    listFilter: planner.listFilter,
    customListRanges: planner.customListRanges,
  };
}

export type SaveImagingPlanInput = {
  [M in ImagingPlan["module"]]: Omit<Extract<ImagingPlan, { module: M }>, "id" | "createdAt" | "version"> & {
    id?: string;
  };
}[ImagingPlan["module"]];
