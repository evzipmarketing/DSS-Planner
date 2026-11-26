import type { MosaicRaDec } from "./mosaic";
import type { MultiTargetStrategy } from "./multi-target";
import type { BandAdvice, CustomListRanges, TargetListFilter } from "./planning";
import type { Site } from "./types";

export type ImagingPlanModule =
  | "multi-target"
  | "single-target"
  | "mosaic"
  | "multi-rigs"
  | "collage"
  | "asterisms";

export type PlanPickerSource =
  | { kind: "filtered" }
  | { kind: "favorites" }
  | { kind: "list"; listId: string; listName: string };

export type PlanGearRef = {
  activeRigId: string | null;
  telescopeId: string;
  cameraId: string;
  reducer: number;
  focalOverrideMm: number | null;
  filterIds: string[];
};

export type PlanSiteRef = {
  locationId: string;
  activeSiteId: string | null;
  site?: Site;
};

type ImagingPlanBase = {
  version: 1;
  id: string;
  name: string;
  module: ImagingPlanModule;
  createdAt: string;
  updatedAt?: string;
  siteRef: PlanSiteRef;
  pickerSource: PlanPickerSource;
  listFilter?: TargetListFilter;
  customListRanges?: CustomListRanges;
  gear: PlanGearRef;
};

export type MultiTargetImagingPlan = ImagingPlanBase & {
  module: "multi-target";
  dateIso: string;
  selectedObjectIds: string[];
  requestedHoursById: Record<string, number>;
  strategy: MultiTargetStrategy;
};

export type SingleTargetImagingPlan = ImagingPlanBase & {
  module: "single-target";
  startDateIso: string;
  objectId: string;
  goalHours: number;
  bandOverride: BandAdvice | null;
};

export type MosaicImagingPlan = ImagingPlanBase & {
  module: "mosaic";
  objectId: string;
  center: MosaicRaDec;
  rows: number;
  cols: number;
  overlapPercent: number;
  rotationDeg: number;
  zoom?: number;
};

export type MultiRigsImagingPlan = ImagingPlanBase & {
  module: "multi-rigs";
  dateIso: string;
  enabledRigIds: string[];
  rigs: Record<string, { objectIds: string[]; filterIds: string[]; plannedHours: Record<string, number> }>;
};

export type CollageImagingPlan = ImagingPlanBase & {
  module: "collage";
  selectedObjectIds: string[];
  paddingPercent: number;
  rotationDeg: number | null;
  /** When true, suggestions ignore altitude/moon for the chosen night but still apply list filters. */
  ignoreDate?: boolean;
  dateIso?: string;
};

export type AsterismsImagingPlan = ImagingPlanBase & {
  module: "asterisms";
  asterismId: string;
  paddingPercent: number;
};

export type ImagingPlan =
  | MultiTargetImagingPlan
  | SingleTargetImagingPlan
  | MosaicImagingPlan
  | MultiRigsImagingPlan
  | CollageImagingPlan
  | AsterismsImagingPlan;

export function imagingPlanModuleLabel(module: ImagingPlanModule): string {
  switch (module) {
    case "multi-target":
      return "Multi-target";
    case "single-target":
      return "Single-target";
    case "mosaic":
      return "Mosaic";
    case "multi-rigs":
      return "Multi-rigs";
    case "collage":
      return "Collage";
    case "asterisms":
      return "Asterisms";
    default: {
      const unexpected: never = module;
      return unexpected;
    }
  }
}

export function imagingPlanSummary(plan: ImagingPlan): string {
  switch (plan.module) {
    case "multi-target":
      return `${plan.selectedObjectIds.length} targets · ${plan.dateIso}`;
    case "single-target":
      return `${plan.goalHours}h goal · from ${plan.startDateIso}`;
    case "mosaic":
      return `${plan.rows}×${plan.cols} · ${plan.overlapPercent}% overlap`;
    case "multi-rigs":
      return `${plan.enabledRigIds.length} rigs · ${plan.dateIso}`;
    case "collage":
      return `${plan.selectedObjectIds.length} targets · ${plan.paddingPercent}% pad`;
    case "asterisms":
      return `${plan.asterismId} · ${plan.paddingPercent}% pad`;
    default: {
      const unexpected: never = plan;
      return unexpected;
    }
  }
}

export function createImagingPlanId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
