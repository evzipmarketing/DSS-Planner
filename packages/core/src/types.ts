export const DEEP_SKY_TYPES = [
  "G",
  "GPair",
  "GTrpl",
  "GGroup",
  "ClG",
  "OCl",
  "GCl",
  "Cl+N",
  "PN",
  "HII",
  "EmN",
  "Neb",
  "RfN",
  "SNR",
  "DrkN",
  "Ast",
  "StCl",
  "*Ass",
  "**",
  "*",
  "NonEx",
  "Nova",
  "Other",
  "Dup",
] as const;

export type DeepSkyType = (typeof DEEP_SKY_TYPES)[number];

export const CATALOGUE_IDS = [
  "messier",
  "ngc",
  "ic",
  "caldwell",
  "sharpless",
  "barnard",
  "ldn",
  "lbn",
  "vdb",
  "abell-pn",
  "abell-gc",
  "collinder",
  "melotte",
  "trumpler",
  "stock",
  "arp",
  "herschel",
  "rcw",
  "cederblad",
  "gum",
  "ugc",
  "pgc",
] as const;

export type CatalogueId = (typeof CATALOGUE_IDS)[number];

export type DeepSkyObject = {
  id: string;
  type: DeepSkyType;
  raDeg: number;
  decDeg: number;
  constellation: string | null;
  majorArcmin: number | null;
  minorArcmin: number | null;
  positionAngleDeg: number | null;
  magnitude: number | null;
  messier: number | null;
  names: string[];
  opacity: number | null;
  aliases: string[];
  catalogues: CatalogueId[];
  note: string | null;
};

export type TargetQuery = {
  types: DeepSkyType[];
  catalogues: CatalogueId[];
  maxMagnitude: number | null;
  minSizeArcmin: number | null;
};

export const EMPTY_TARGET_QUERY: TargetQuery = {
  types: [],
  catalogues: [],
  maxMagnitude: null,
  minSizeArcmin: null,
};

export type SensorKind = "mono" | "colour";

export type Telescope = {
  id: string;
  name: string;
  apertureMm: number;
  focalLengthMm: number;
  custom?: boolean;
};

export type Camera = {
  id: string;
  name: string;
  sensorWidthMm: number;
  sensorHeightMm: number;
  pixelSizeUm: number;
  widthPx: number;
  heightPx: number;
  sensor: SensorKind;
  /** Nominal read noise used by the exposure heuristic, in electrons. */
  readNoiseE: number;
  custom?: boolean;
};

export type FilterKind =
  | "broadband"
  | "uv_ir_cut"
  | "dual_narrowband"
  | "tri_narrowband"
  | "quad_narrowband"
  | "ha"
  | "oiii"
  | "sii"
  | "luminance"
  | "red"
  | "green"
  | "blue";

export type ImagingFilter = {
  id: string;
  name: string;
  kind: FilterKind;
  /** Nominal equivalent width in nanometres. */
  bandpassNm: number;
  /** Peak transmission, 0 to 1. */
  transmission: number;
  custom?: boolean;
};

export type Site = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

/** Target altitude, in degrees, at or above which a dark sample counts as imageable. */
export const IMAGEABLE_MIN_ALTITUDE_DEG = 20;
/** Sample spacing for the imageable window. The list and the altitude chart share it. */
export const IMAGEABLE_SAMPLE_MINUTES = 10;
export const ASTRONOMICAL_SUN_ALTITUDE_DEG = -18;

export const BORTLE_SKY_MAG: Record<number, number> = {
  1: 21.95,
  2: 21.7,
  3: 21.5,
  4: 21.1,
  5: 20.02,
  6: 19.22,
  7: 18.66,
  8: 18.19,
  9: 17.8,
};
